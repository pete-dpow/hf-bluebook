import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const { query, pillar, limit = 10 } = body;

  if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

  // Generate embedding for query
  const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: query,
    }),
  });

  const embResult = await embResponse.json();
  const embedding = embResult.data?.[0]?.embedding;

  if (!embedding) {
    return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 });
  }

  // Vector search via RPC
  const { data, error } = await supabaseAdmin.rpc("match_products", {
    query_embedding: embedding,
    match_org_id: auth.organizationId,
    match_count: limit,
    match_pillar: pillar || null,
    match_threshold: 0.5,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also do keyword search for non-embedded products
  let keywordQuery = supabaseAdmin
    .from("products")
    .select("id, product_name, product_code, pillar, description, list_price, sell_price, manufacturers(name)")
    .eq("organization_id", auth.organizationId)
    .eq("status", "active")
    .or(`product_name.ilike.%${query}%,product_code.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);

  if (pillar) keywordQuery = keywordQuery.eq("pillar", pillar);

  const { data: keywordResults } = await keywordQuery;

  // Merge and dedupe
  const vectorIds = new Set((data || []).map((r: any) => r.id));
  const merged = [
    ...(data || []),
    ...(keywordResults || []).filter((r: any) => !vectorIds.has(r.id)),
  ];

  return NextResponse.json({ products: merged });
}
