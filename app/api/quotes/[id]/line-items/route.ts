import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { recalculateQuoteTotals } from "@/lib/quoteCalculations";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Verify quote belongs to org
  const { data: quote, error: qError } = await supabaseAdmin
    .from("quotes")
    .select("id")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (qError || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const body = await req.json();
  const quantity = parseFloat(body.quantity) || 0;
  const unitPrice = parseFloat(body.unit_price) || 0;
  const lineTotal = quantity * unitPrice;

  const { data, error } = await supabaseAdmin
    .from("quote_line_items")
    .insert({
      quote_id: params.id,
      product_id: body.product_id || null,
      description: body.description || "",
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      unit: body.unit || "each",
      manufacturer_name: body.manufacturer_name || null,
      product_code: body.product_code || null,
      notes: body.notes || null,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate quote totals
  await recalculateQuoteTotals(params.id);

  return NextResponse.json({ line_item: data }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("item_id");

  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  // Verify quote belongs to org
  const { data: quote, error: qError } = await supabaseAdmin
    .from("quotes")
    .select("id")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (qError || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("quote_line_items")
    .delete()
    .eq("id", itemId)
    .eq("quote_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recalculate quote totals
  await recalculateQuoteTotals(params.id);

  return NextResponse.json({ success: true });
}
