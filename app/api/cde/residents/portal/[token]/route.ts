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

  // Get upcoming visits for this resident's building/project
  const { data: visits } = await supabase
    .from("cde_visits")
    .select("*")
    .gte("visit_date", new Date().toISOString().split("T")[0])
    .order("visit_date", { ascending: true })
    .limit(10);

  // Filter to visits that include this resident's building
  const relevantVisits = (visits || []).filter((v: any) =>
    !v.buildings || v.buildings.length === 0 || v.buildings.includes(resident.building)
  );

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
  });
}
