import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Get chunk counts by pillar
  const { data: chunks, error: chunksError } = await supabaseAdmin
    .from("bluebook_chunks")
    .select("pillar", { count: "exact" })
    .eq("org_id", auth.organizationId);

  if (chunksError) return NextResponse.json({ error: chunksError.message }, { status: 500 });

  // Count by pillar
  const pillarCounts: Record<string, number> = {};
  for (const chunk of chunks || []) {
    const p = chunk.pillar || "unclassified";
    pillarCounts[p] = (pillarCounts[p] || 0) + 1;
  }

  const totalChunks = chunks?.length || 0;

  // Get recent ingestion logs
  const { data: logs, error: logsError } = await supabaseAdmin
    .from("bluebook_ingestion_log")
    .select("*")
    .eq("org_id", auth.organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (logsError) return NextResponse.json({ error: logsError.message }, { status: 500 });

  // Get unique source files count
  const { data: sources } = await supabaseAdmin
    .from("bluebook_chunks")
    .select("source_file")
    .eq("org_id", auth.organizationId);

  const uniqueFiles = new Set((sources || []).map((s) => s.source_file)).size;

  return NextResponse.json({
    total_chunks: totalChunks,
    total_files: uniqueFiles,
    pillar_counts: pillarCounts,
    ingestion_logs: logs || [],
  });
}
