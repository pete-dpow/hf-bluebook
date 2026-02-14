import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/surveying/scans/[id] — scan detail with floors and walls */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: scan, error } = await supabaseAdmin
    .from("survey_scans")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

  // Verify org membership
  if (scan.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch floors with walls
  const { data: floors } = await supabaseAdmin
    .from("survey_floors")
    .select("*, survey_walls(*)")
    .eq("scan_id", params.id)
    .order("sort_order");

  // Fetch plans
  const { data: plans } = await supabaseAdmin
    .from("survey_plans")
    .select("*")
    .in("floor_id", (floors || []).map(f => f.id));

  return NextResponse.json({ ...scan, floors: floors || [], plans: plans || [] });
}

/** DELETE /api/surveying/scans/[id] — delete scan + storage files */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const { data: scan } = await supabaseAdmin
    .from("survey_scans")
    .select("storage_path, converted_storage_path, decimated_storage_path, organization_id")
    .eq("id", params.id)
    .single();

  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scan.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete storage files
  const paths = [scan.storage_path, scan.converted_storage_path, scan.decimated_storage_path]
    .filter(Boolean) as string[];

  if (paths.length > 0) {
    await supabaseAdmin.storage.from("survey-scans").remove(paths);
  }

  // Delete scan (cascades to floors → walls)
  const { error } = await supabaseAdmin
    .from("survey_scans")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
