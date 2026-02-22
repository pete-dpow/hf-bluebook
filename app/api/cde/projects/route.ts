// GET + POST /api/cde/projects — List and create projects

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  const status = req.nextUrl.searchParams.get("status");

  const supabase = getSupabaseAdmin();
  let query = supabase.from("cde_projects").select("*, cde_clients(id, name, short_code)").order("created_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projects: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { clientId, name, projectCode, status, startDate } = body;

  if (!clientId || !name || !projectCode) {
    return NextResponse.json({ error: "clientId, name, and projectCode are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cde_projects")
    .insert({
      client_id: clientId,
      name,
      project_code: projectCode,
      status: status || "active",
      start_date: startDate || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await supabase.from("cde_audit_log").insert({
    event_type: "PROJECT_CREATED",
    entity_type: "project",
    entity_id: data.id,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Created project: ${name} (${projectCode})`,
  });

  return NextResponse.json({ project: data });
}
