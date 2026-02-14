import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/autoplan/floors/[id] — single floor with building info */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data: floor, error } = await supabaseAdmin
    .from("autoplan_floors")
    .select("*, autoplan_buildings(*)")
    .eq("id", params.id)
    .single();

  if (error || !floor) return NextResponse.json({ error: "Floor not found" }, { status: 404 });

  // Verify org membership via building
  if (floor.autoplan_buildings?.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ floor });
}

/** DELETE /api/autoplan/floors/[id] — delete floor and storage files */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Fetch floor with building to verify org
  const { data: floor } = await supabaseAdmin
    .from("autoplan_floors")
    .select("storage_path, preview_storage_path, building_id, autoplan_buildings(organization_id)")
    .eq("id", params.id)
    .single();

  if (!floor) return NextResponse.json({ error: "Floor not found" }, { status: 404 });

  const bldg = floor.autoplan_buildings as any;
  if (bldg?.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Remove storage files
  const paths = [floor.storage_path, floor.preview_storage_path].filter(Boolean) as string[];
  if (paths.length > 0) {
    await supabaseAdmin.storage.from("autoplan").remove(paths);
  }

  // Delete record (cascades to plans via DB FK)
  const { error } = await supabaseAdmin
    .from("autoplan_floors")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
