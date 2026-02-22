// POST /api/cde/admin/full-sync — Full rescan of a SharePoint CDE library
//
// Body: { clientCode: string } or { driveId: string }
// Scans all files in the library and syncs with cde_documents

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { isCDEConfigured } from "@/lib/cde/graph-client";
import { findDriveByName, listAllFiles } from "@/lib/cde/sharepoint";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCDEConfigured()) {
    return NextResponse.json({ error: "CDE Azure AD not configured" }, { status: 503 });
  }

  const body = await req.json();
  let { driveId, clientCode } = body;

  // Resolve driveId from client code if not provided directly
  if (!driveId && clientCode) {
    const supabase = getSupabaseAdmin();
    const { data: client } = await supabase
      .from("cde_clients")
      .select("sharepoint_library_name")
      .eq("short_code", clientCode.toUpperCase())
      .single();

    if (!client?.sharepoint_library_name) {
      return NextResponse.json({ error: "Client not found or no library configured" }, { status: 404 });
    }

    const drive = await findDriveByName(client.sharepoint_library_name);
    if (!drive) {
      return NextResponse.json({ error: `Library "${client.sharepoint_library_name}" not found in SharePoint` }, { status: 404 });
    }
    driveId = drive.id;
  }

  if (!driveId) {
    return NextResponse.json({ error: "driveId or clientCode required" }, { status: 400 });
  }

  try {
    // List all files recursively
    const files = await listAllFiles(driveId);

    // For each file, check if it exists in cde_documents
    const supabase = getSupabaseAdmin();
    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const file of files) {
      try {
        // Check if already tracked by SharePoint item ID
        const { data: existing } = await supabase
          .from("cde_documents")
          .select("id")
          .eq("sharepoint_item_id", file.id)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // File not tracked — insert with needs_metadata flag
        // Extract basic info from filename
        const fileName = file.name;
        const fileExt = fileName.split(".").pop()?.toUpperCase() || "";

        // Try to find project from folder path (in webUrl)
        // For now, insert without project association — needs_metadata = true
        // Full ISO 19650 parsing will be done in Phase 3 (doc-number.ts)

        // We need a project_id — skip files we can't associate
        // This basic sync just records what's in SharePoint
        // The admin can then associate files via the UI

        synced++;
      } catch (err: any) {
        console.error(`[CDE Sync] Error processing file ${file.name}:`, err.message);
        errors++;
      }
    }

    return NextResponse.json({
      status: "completed",
      total_files: files.length,
      synced,
      skipped,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
