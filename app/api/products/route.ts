import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const pillar = searchParams.get("pillar");
  const status = searchParams.get("status");
  const manufacturer = searchParams.get("manufacturer_id");
  const needsReview = searchParams.get("needs_review");
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("products")
    .select("*, manufacturers(name)", { count: "exact" })
    .eq("organization_id", auth.organizationId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (pillar) query = query.eq("pillar", pillar);
  if (status) query = query.eq("status", status);
  if (manufacturer) query = query.eq("manufacturer_id", manufacturer);
  if (needsReview === "true") query = query.eq("needs_review", true);
  if (search) query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%`);

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data, total: count, page, limit });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  const { data, error } = await supabaseAdmin.from("products").insert({
    manufacturer_id: body.manufacturer_id,
    organization_id: auth.organizationId,
    pillar: body.pillar,
    product_code: body.product_code || null,
    product_name: body.product_name,
    description: body.description || null,
    specifications: body.specifications || {},
    list_price: body.list_price || null,
    trade_price: body.trade_price || null,
    sell_price: body.sell_price || null,
    currency: body.currency || "GBP",
    unit: body.unit || "each",
    lead_time_days: body.lead_time_days || null,
    minimum_order_quantity: body.minimum_order_quantity || 1,
    certifications: body.certifications || [],
    status: body.status || "draft",
    needs_review: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ product: data }, { status: 201 });
}
