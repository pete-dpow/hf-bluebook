import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET — Returns compliance info for all products in a quote.
 * Groups by regulation showing which products satisfy each one.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Get quote line items with product_id
  const { data: lineItems, error: liError } = await supabaseAdmin
    .from("quote_line_items")
    .select("id, product_id, description")
    .eq("quote_id", params.id)
    .not("product_id", "is", null);

  if (liError) return NextResponse.json({ error: liError.message }, { status: 500 });
  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json({ regulations: [], products_checked: 0 });
  }

  const productIds = Array.from(new Set(lineItems.map((li) => li.product_id).filter(Boolean)));

  // Get product_regulations for all quoted products
  const { data: links, error: prError } = await supabaseAdmin
    .from("product_regulations")
    .select("product_id, regulation_id, compliance_notes, test_evidence_ref, regulations(id, name, reference, category, status)")
    .in("product_id", productIds);

  if (prError) return NextResponse.json({ error: prError.message }, { status: 500 });

  // Get product names for display
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, product_name, product_code")
    .in("id", productIds);

  const productMap = new Map((products || []).map((p) => [p.id, p]));

  // Group by regulation
  const regulationMap = new Map<string, {
    regulation: any;
    products: { id: string; product_name: string; product_code: string; compliance_notes: string | null; test_evidence_ref: string | null }[];
  }>();

  for (const link of links || []) {
    const reg = (link as any).regulations;
    if (!reg) continue;

    if (!regulationMap.has(reg.id)) {
      regulationMap.set(reg.id, { regulation: reg, products: [] });
    }

    const product = productMap.get(link.product_id);
    if (product) {
      regulationMap.get(reg.id)!.products.push({
        id: product.id,
        product_name: product.product_name,
        product_code: product.product_code,
        compliance_notes: link.compliance_notes,
        test_evidence_ref: link.test_evidence_ref,
      });
    }
  }

  return NextResponse.json({
    regulations: Array.from(regulationMap.values()),
    products_checked: productIds.length,
  });
}
