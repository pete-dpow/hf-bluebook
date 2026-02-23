// GET + POST /api/cde/issues — List and create field issues

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_SORT = ["issue_number", "title", "issue_type", "priority", "status", "raised_at", "due_date", "building"];
const VALID_TYPES = ["FD-DEF", "FS-DEF", "CM-BRE", "DM-DEF", "AOV-DEF", "SNG", "NCN", "GEN"];

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const projectId = url.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const issueType = url.searchParams.get("issueType");
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const building = url.searchParams.get("building");
  const search = url.searchParams.get("search");
  const rawPage = parseInt(url.searchParams.get("page") || "1");
  const rawLimit = parseInt(url.searchParams.get("limit") || "50");
  const sortByParam = url.searchParams.get("sortBy") || "raised_at";
  const sortDir = url.searchParams.get("sortDir") || "desc";

  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 200);
  const sortBy = ALLOWED_SORT.includes(sortByParam) ? sortByParam : "raised_at";

  const supabase = getSupabaseAdmin();
  let query = supabase.from("cde_issues").select("*", { count: "exact" }).eq("project_id", projectId);

  if (issueType) query = query.eq("issue_type", issueType);
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (building) query = query.eq("building", building);
  if (search) {
    const s = search.replace(/[%_\\]/g, "\\$&");
    query = query.or(`issue_number.ilike.%${s}%,title.ilike.%${s}%`);
  }

  query = query.order(sortBy, { ascending: sortDir === "asc" });
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ issues: data || [], total: count || 0, page, totalPages: Math.ceil((count || 0) / limit) });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { projectId, issueType, title, description, building, level, locationDetail, assignedTo, priority, dueDate } = body;

  if (!projectId || !issueType || !title) {
    return NextResponse.json({ error: "projectId, issueType, and title are required" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(issueType)) {
    return NextResponse.json({ error: `Invalid issueType. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get next sequence number (MAX-based to avoid race conditions and deletion reuse)
  const { data: lastIssue } = await supabase
    .from("cde_issues")
    .select("issue_number")
    .eq("project_id", projectId)
    .eq("issue_type", issueType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastSeq = lastIssue?.issue_number ? parseInt(lastIssue.issue_number.split("-").pop() || "0", 10) : 0;
  const seq = (lastSeq || 0) + 1;
  const issueNumber = `${issueType}-${String(seq).padStart(3, "0")}`;

  const { data, error } = await supabase
    .from("cde_issues")
    .insert({
      project_id: projectId,
      issue_number: issueNumber,
      issue_type: issueType,
      title,
      description: description || null,
      building: building || null,
      level: level || null,
      location_detail: locationDetail || null,
      assigned_to: assignedTo || null,
      priority: priority || "MEDIUM",
      status: "OPEN",
      raised_by: auth.user.id,
      raised_at: new Date().toISOString(),
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("cde_audit_log").insert({
    event_type: "ISSUE_RAISED",
    entity_type: "issue",
    entity_id: data.id,
    entity_ref: issueNumber,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Raised ${issueType}: ${title}`,
  });

  return NextResponse.json({ issue: data, issueNumber });
}
