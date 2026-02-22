// GET + POST /api/cde/mail — List and create mail items

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generateMailNumber, getDefaultDueDays } from "@/lib/cde/mail-utils";

const ALLOWED_SORT = ["mail_number", "subject", "mail_type", "status", "priority", "due_date", "sent_at"];

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const mailType = url.searchParams.get("mailType");
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const search = url.searchParams.get("search");
  const rawPage = parseInt(url.searchParams.get("page") || "1");
  const rawLimit = parseInt(url.searchParams.get("limit") || "50");
  const sortByParam = url.searchParams.get("sortBy") || "sent_at";
  const sortDir = url.searchParams.get("sortDir") || "desc";

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 200);
  const sortBy = ALLOWED_SORT.includes(sortByParam) ? sortByParam : "sent_at";

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("cde_mail")
    .select("*", { count: "exact" })
    .eq("project_id", projectId);

  if (mailType) query = query.eq("mail_type", mailType);
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (search) {
    const s = search.replace(/[%_\\]/g, "\\$&");
    query = query.or(`mail_number.ilike.%${s}%,subject.ilike.%${s}%`);
  }

  query = query.order(sortBy, { ascending: sortDir === "asc" });
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    mail: data || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { projectId, mailType, subject, body: mailBody, toUserId, priority } = body;

  if (!projectId || !mailType || !subject) {
    return NextResponse.json({ error: "projectId, mailType, and subject are required" }, { status: 400 });
  }

  if (!["RFI", "SI", "QRY"].includes(mailType)) {
    return NextResponse.json({ error: "mailType must be RFI, SI, or QRY" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get next sequence number for this mail type
  const { count } = await supabase
    .from("cde_mail")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("mail_type", mailType);

  const sequence = (count || 0) + 1;
  const mailNumber = generateMailNumber(mailType, sequence);

  // Calculate due date
  const dueDays = getDefaultDueDays(mailType);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const { data, error } = await supabase
    .from("cde_mail")
    .insert({
      project_id: projectId,
      mail_number: mailNumber,
      mail_type: mailType,
      subject,
      body: mailBody || null,
      from_user_id: auth.user.id,
      to_user_id: toUserId || null,
      status: "OPEN",
      priority: priority || "MEDIUM",
      due_date: dueDate.toISOString(),
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "MAIL_CREATED",
    entity_type: "mail",
    entity_id: data.id,
    entity_ref: mailNumber,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Created ${mailType}: ${subject}`,
  });

  return NextResponse.json({ mail: data, mailNumber });
}
