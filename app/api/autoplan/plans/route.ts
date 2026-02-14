import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** POST /api/autoplan/plans — create a plan from a floor */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  if (!body.floor_id) {
    return NextResponse.json({ error: "floor_id is required" }, { status: 400 });
  }

  // Fetch floor with building to verify org membership
  const { data: floor, error: floorError } = await supabaseAdmin
    .from("autoplan_floors")
    .select("*, autoplan_buildings(organization_id)")
    .eq("id", body.floor_id)
    .single();

  if (floorError || !floor) {
    return NextResponse.json({ error: "Floor not found" }, { status: 404 });
  }

  if (floor.autoplan_buildings?.organization_id !== auth.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Generate plan reference from count
  const { count } = await supabaseAdmin
    .from("autoplan_plans")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", auth.organizationId);

  const planNumber = (count || 0) + 1;
  const planReference = `HF-AP-${String(planNumber).padStart(4, "0")}`;

  // Build initial symbol_data from AI analysis suggested_symbols
  const suggestedSymbols = floor.ai_analysis_result?.suggested_symbols || [];
  const symbolData = suggestedSymbols.map((sym: { symbolId: string; x: number; y: number; rotation: number; label?: string }) => ({
    instanceId: crypto.randomUUID(),
    symbolId: sym.symbolId,
    x: sym.x,
    y: sym.y,
    rotation: sym.rotation || 0,
    scale: 1.0,
    label: sym.label || undefined,
  }));

  const { data: plan, error } = await supabaseAdmin
    .from("autoplan_plans")
    .insert({
      floor_id: body.floor_id,
      building_id: floor.building_id,
      organization_id: auth.organizationId,
      created_by: auth.user.id,
      plan_reference: planReference,
      version: 1,
      status: "draft",
      symbol_data: symbolData,
      annotations: [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan }, { status: 201 });
}
