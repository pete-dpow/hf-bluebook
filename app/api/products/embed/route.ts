import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { generateEmbeddingsBatch } from "@/lib/embeddingService";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const maxDuration = 60;

/**
 * POST /api/products/embed
 * Generate embeddings for products that don't have them yet.
 * Admin only. Processes up to 100 products per call.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Fetch products without embeddings
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, product_name, description, pillar, specifications")
    .eq("organization_id", auth.organizationId)
    .is("embedding", null)
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!products || products.length === 0) {
    return NextResponse.json({ embedded: 0, remaining: 0, message: "All products already have embeddings" });
  }

  // Build text representations
  const texts = products.map((p) =>
    [p.product_name, p.description, p.pillar, p.specifications ? JSON.stringify(p.specifications) : ""]
      .filter(Boolean).join(" — ")
  );

  // Generate embeddings in batches
  const embeddings = await generateEmbeddingsBatch(texts);

  // Update products with embeddings
  let embedded = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ embedding: embeddings[i].embedding })
      .eq("id", products[i].id);

    if (!updateError) embedded++;
  }

  // Count remaining
  const { count } = await supabaseAdmin
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", auth.organizationId)
    .is("embedding", null);

  return NextResponse.json({ embedded, remaining: count || 0 });
}
