import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/bluebook/embeddings";

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
  const { query, pillar, limit = 5, threshold = 0.7 } = body;

  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  const embedding = await generateEmbedding(query);

  const { data, error } = await supabaseAdmin.rpc("match_bluebook_chunks", {
    query_embedding: embedding,
    match_org_id: auth.organizationId,
    match_count: limit,
    match_pillar: pillar || null,
    match_threshold: threshold,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ chunks: data || [] });
}
