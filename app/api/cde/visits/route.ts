// GET + POST /api/cde/visits — List and create visits

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  const clientId = req.nextUrl.searchParams.get("clientId");

  const supabase = getSupabaseAdmin();
  let query = supabase.from("cde_visits").select("*").order("visit_date", { ascending: true });

  if (projectId) query = query.eq("project_id", projectId);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ visits: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { projectId, clientId, visitDate, startTime, endTime, visitType, leadSurveyor, buildings, flatAccessRequired, notesForResidents } = body;

  if (!projectId || !clientId || !visitDate || !visitType) {
    return NextResponse.json({ error: "projectId, clientId, visitDate, and visitType are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("cde_visits")
    .insert({
      project_id: projectId,
      client_id: clientId || null,
      visit_date: visitDate,
      start_time: startTime || null,
      end_time: endTime || null,
      visit_type: visitType,
      lead_surveyor: leadSurveyor || null,
      buildings: buildings || [],
      flat_access_required: flatAccessRequired ?? false,
      notes_for_residents: notesForResidents || null,
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit
  await supabase.from("cde_audit_log").insert({
    event_type: "VISIT_SCHEDULED",
    entity_type: "visit",
    entity_id: data.id,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Scheduled ${visitType} visit on ${visitDate}`,
  });

  return NextResponse.json({ visit: data });
}
