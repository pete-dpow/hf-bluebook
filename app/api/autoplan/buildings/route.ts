import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET /api/autoplan/buildings — list buildings for org */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("autoplan_buildings")
    .select("*, autoplan_floors(count), autoplan_plans(count)")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ buildings: data });
}

/** POST /api/autoplan/buildings — create a building */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  // Validate required fields
  const required = ["name", "address_line_1", "city", "postcode", "jurisdiction", "number_of_storeys", "building_use", "evacuation_strategy"];
  for (const field of required) {
    if (!body[field] && body[field] !== 0) {
      return NextResponse.json({ error: `${field} is required` }, { status: 400 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from("autoplan_buildings")
    .insert({
      organization_id: auth.organizationId,
      created_by: auth.user.id,
      name: body.name,
      address_line_1: body.address_line_1,
      address_line_2: body.address_line_2 || null,
      city: body.city,
      postcode: body.postcode,
      jurisdiction: body.jurisdiction,
      height_metres: body.height_metres || null,
      number_of_storeys: body.number_of_storeys,
      building_use: body.building_use,
      evacuation_strategy: body.evacuation_strategy,
      has_sprinklers: body.has_sprinklers ?? false,
      has_dry_riser: body.has_dry_riser ?? false,
      has_wet_riser: body.has_wet_riser ?? false,
      number_of_firefighting_lifts: body.number_of_firefighting_lifts ?? 0,
      responsible_person: body.responsible_person || null,
      rp_contact_email: body.rp_contact_email || null,
      notes: body.notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ building: data }, { status: 201 });
}
