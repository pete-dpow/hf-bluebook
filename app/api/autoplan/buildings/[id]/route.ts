import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/autoplan/buildings/[id] — single building with floors and plans */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data: building, error } = await supabaseAdmin
    .from("autoplan_buildings")
    .select("*")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (error || !building) return NextResponse.json({ error: "Building not found" }, { status: 404 });

  // Fetch floors ordered by floor_number
  const { data: floors } = await supabaseAdmin
    .from("autoplan_floors")
    .select("*")
    .eq("building_id", params.id)
    .order("floor_number", { ascending: true });

  // Fetch plans ordered by created_at desc
  const { data: plans } = await supabaseAdmin
    .from("autoplan_plans")
    .select("*")
    .eq("building_id", params.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ building, floors: floors || [], plans: plans || [] });
}

/** PATCH /api/autoplan/buildings/[id] — update building fields */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("autoplan_buildings")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ building: data });
}

/** DELETE /api/autoplan/buildings/[id] — delete building (cascade via DB FK) */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("autoplan_buildings")
    .delete()
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
