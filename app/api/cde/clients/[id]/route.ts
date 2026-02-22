// GET + PATCH /api/cde/clients/[id] — Client detail and update

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const [clientRes, projectsRes, residentsRes, visitsRes] = await Promise.all([
    supabase.from("cde_clients").select("*").eq("id", params.id).single(),
    supabase.from("cde_projects").select("*").eq("client_id", params.id).order("created_at", { ascending: false }),
    supabase.from("cde_residents").select("id, building, flat_ref, first_name, last_name").eq("client_id", params.id),
    supabase.from("cde_visits").select("*").eq("client_id", params.id).order("visit_date", { ascending: false }).limit(10),
  ]);

  if (clientRes.error) return NextResponse.json({ error: clientRes.error.message }, { status: 500 });
  if (!clientRes.data) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Get document/issue counts per project
  const projectIds = (projectsRes.data || []).map((p: any) => p.id);
  let docCount = 0;
  let issueCount = 0;
  if (projectIds.length > 0) {
    const [dRes, iRes] = await Promise.all([
      supabase.from("cde_documents").select("id", { count: "exact", head: true }).in("project_id", projectIds),
      supabase.from("cde_issues").select("id", { count: "exact", head: true }).in("project_id", projectIds).in("status", ["open", "work_done", "ready_to_inspect"]),
    ]);
    docCount = dRes.count || 0;
    issueCount = iRes.count || 0;
  }

  return NextResponse.json({
    client: clientRes.data,
    projects: projectsRes.data || [],
    residents: residentsRes.data || [],
    visits: visitsRes.data || [],
    stats: { documents: docCount, openIssues: issueCount, residents: (residentsRes.data || []).length, projects: (projectsRes.data || []).length },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["name", "short_code", "sharepoint_library_name"];
  const updates: any = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("cde_clients").update(updates).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ client: data });
}
