import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** PATCH /api/surveying/floors/[id]/confirm — confirm, rename, or adjust floor z_height */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { floor_label, z_height_m, is_confirmed } = body;

  // Verify floor exists and user has access
  const { data: floor } = await supabaseAdmin
    .from("survey_floors")
    .select("id, scan_id")
    .eq("id", params.id)
    .single();

  if (!floor) return NextResponse.json({ error: "Floor not found" }, { status: 404 });

  const { data: scan } = await supabaseAdmin
    .from("survey_scans")
    .select("organization_id")
    .eq("id", floor.scan_id)
    .single();

  if (!scan || scan.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build update
  const updates: Record<string, unknown> = {};
  if (floor_label !== undefined) updates.floor_label = floor_label;
  if (z_height_m !== undefined) {
    updates.z_height_m = z_height_m;
    updates.z_range_min = z_height_m - 0.2;
    updates.z_range_max = z_height_m + 0.2;
  }
  if (is_confirmed !== undefined) updates.is_confirmed = is_confirmed;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("survey_floors")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
