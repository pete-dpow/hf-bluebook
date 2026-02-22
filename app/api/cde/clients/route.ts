// GET + POST /api/cde/clients — List and create clients

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cde_clients")
    .select("*, cde_projects(id, name, project_code, status)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ clients: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, shortCode, sharepointLibraryName } = body;

  if (!name || !shortCode) {
    return NextResponse.json({ error: "name and shortCode are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cde_clients")
    .insert({
      name,
      short_code: shortCode,
      sharepoint_library_name: sharepointLibraryName || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await supabase.from("cde_audit_log").insert({
    event_type: "CLIENT_CREATED",
    entity_type: "client",
    entity_id: data.id,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Created client: ${name} (${shortCode})`,
  });

  return NextResponse.json({ client: data });
}
