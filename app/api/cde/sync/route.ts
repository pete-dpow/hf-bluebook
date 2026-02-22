// POST /api/cde/sync — Incremental sync triggered by Graph webhook or manual trigger
//
// Body: { driveId: string, source?: "webhook" | "manual" | "cron" }
// Diffs SharePoint files against cde_documents and updates accordingly

import { NextRequest, NextResponse } from "next/server";
import { isCDEConfigured } from "@/lib/cde/graph-client";
import { listAllFiles } from "@/lib/cde/sharepoint";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  if (!isCDEConfigured()) {
    return NextResponse.json({ error: "CDE Azure AD not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { driveId, source = "manual" } = body;

  if (!driveId) {
    return NextResponse.json({ error: "driveId is required" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Get all files from SharePoint
    const spFiles = await listAllFiles(driveId);

    // Get all tracked documents with SharePoint item IDs
    const { data: trackedDocs } = await supabase
      .from("cde_documents")
      .select("id, sharepoint_item_id, file_name, file_size")
      .not("sharepoint_item_id", "is", null);

    const trackedMap = new Map(
      (trackedDocs || []).map((d) => [d.sharepoint_item_id, d])
    );

    let newFiles = 0;
    let updatedFiles = 0;
    let unchangedFiles = 0;

    for (const file of spFiles) {
      const tracked = trackedMap.get(file.id);

      if (!tracked) {
        // New file — not yet in our DB
        // Will be fully processed in Phase 3 with ISO 19650 parsing
        newFiles++;
      } else if (tracked.file_size !== file.size) {
        // File changed — may be a new version
        updatedFiles++;
      } else {
        unchangedFiles++;
      }
    }

    // Log sync event
    await supabase.from("cde_audit_log").insert({
      event_type: "SYNC",
      entity_type: "system",
      detail: `Sync from ${source}: ${spFiles.length} files scanned, ${newFiles} new, ${updatedFiles} updated, ${unchangedFiles} unchanged`,
    });

    return NextResponse.json({
      status: "completed",
      source,
      scanned: spFiles.length,
      new: newFiles,
      updated: updatedFiles,
      unchanged: unchangedFiles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
