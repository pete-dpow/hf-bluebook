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
 * POST /api/compliance/embed
 * Generate embeddings for regulation sections that don't have them yet.
 * Admin only. Processes up to 100 sections per call.
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Fetch regulation sections without embeddings, scoped to org
  const { data: sections, error } = await supabaseAdmin
    .from("regulation_sections")
    .select("id, section_ref, section_title, section_text, regulation_id, regulations!inner(organization_id)")
    .is("embedding", null)
    .eq("regulations.organization_id", auth.organizationId)
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sections || sections.length === 0) {
    return NextResponse.json({ embedded: 0, remaining: 0, message: "All regulation sections already have embeddings" });
  }

  // Build text representations
  const texts = sections.map((s) =>
    [s.section_ref, s.section_title, s.section_text].filter(Boolean).join(". ")
  );

  // Generate embeddings in batches
  const embeddings = await generateEmbeddingsBatch(texts);

  // Update sections with embeddings
  let embedded = 0;
  for (let i = 0; i < embeddings.length; i++) {
    const { error: updateError } = await supabaseAdmin
      .from("regulation_sections")
      .update({ embedding: embeddings[i].embedding })
      .eq("id", sections[i].id);

    if (!updateError) embedded++;
  }

  // Count remaining
  const { count } = await supabaseAdmin
    .from("regulation_sections")
    .select("id, regulations!inner(organization_id)", { count: "exact", head: true })
    .is("embedding", null)
    .eq("regulations.organization_id", auth.organizationId);

  return NextResponse.json({ embedded, remaining: count || 0 });
}
