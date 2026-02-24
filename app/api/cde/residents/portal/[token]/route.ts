// GET /api/cde/residents/portal/[token] — Public portal data (no auth required)

import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/cde/residents";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const resident = await validatePortalToken(params.token);
  if (!resident) {
    return NextResponse.json({ error: "Invalid or expired portal link" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  // Get upcoming visits scoped to this resident's project/client
  const visitQuery = supabase
    .from("cde_visits")
    .select("id, visit_date, start_time, end_time, visit_type, buildings, flat_access_required, notes_for_residents")
    .gte("visit_date", new Date().toISOString().split("T")[0])
    .order("visit_date", { ascending: true })
    .limit(10);

  // Scope to resident's project or client
  if (resident.project_id) {
    visitQuery.eq("project_id", resident.project_id);
  } else if (resident.client_id) {
    visitQuery.eq("client_id", resident.client_id);
  }

  const { data: visits } = await visitQuery;

  // Filter to visits that include this resident's building
  const relevantVisits = (visits || []).filter((v: any) =>
    !v.buildings || v.buildings.length === 0 || v.buildings.includes(resident.building)
  );

  // Get recent notifications sent to this resident
  const { data: notifications } = await supabase
    .from("cde_notifications_log")
    .select("subject, sent_at, channel")
    .contains("resident_ids", [resident.id])
    .order("sent_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    resident: {
      first_name: resident.first_name,
      last_name: resident.last_name,
      building: resident.building,
      flat_ref: resident.flat_ref,
      email_opt_in: resident.email_opt_in,
      sms_opt_in: resident.sms_opt_in,
      availability_notes: resident.availability_notes,
    },
    visits: relevantVisits,
    notifications: notifications || [],
  });
}
