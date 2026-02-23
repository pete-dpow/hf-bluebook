// POST /api/cde/sync — Incremental sync triggered by Graph webhook or manual trigger
//
// Body: { driveId: string, projectId?: string, source?: "webhook" | "manual" | "cron" }
// Diffs SharePoint files against cde_documents and updates accordingly.
// New files get ISO 19650 parsing; unrecognized filenames get needs_metadata = true.
// Changed files trigger version detection.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getAuthUser } from "@/lib/authHelper";
import { isCDEConfigured } from "@/lib/cde/graph-client";
import { listAllFiles, SPDriveItem } from "@/lib/cde/sharepoint";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseDocNumber, guessDocType, compareRevisions } from "@/lib/cde/doc-number";

/** Timing-safe string comparison (returns false if lengths differ) */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: NextRequest) {
  // Auth check — require either a valid user session or the webhook secret
  const webhookSecret = process.env.SYNC_WEBHOOK_SECRET;
  const internalSecret = req.headers.get("x-sync-secret");

  if (internalSecret && webhookSecret && safeEqual(internalSecret, webhookSecret)) {
    // Called internally from webhook handler — allowed
  } else {
    // Require user auth for manual/cron calls
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!isCDEConfigured()) {
    return NextResponse.json({ error: "CDE Azure AD not configured" }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { driveId, projectId, source = "manual" } = body;

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
      .select("id, sharepoint_item_id, doc_number, file_name, file_size, revision, version, project_id")
      .not("sharepoint_item_id", "is", null);

    const trackedByItemId = new Map(
      (trackedDocs || []).map((d: any) => [d.sharepoint_item_id, d])
    );

    // Also index by doc_number for conflict detection
    const trackedByDocNumber = new Map(
      (trackedDocs || []).map((d: any) => [d.doc_number, d])
    );

    let newFiles = 0;
    let updatedFiles = 0;
    let versionedFiles = 0;
    let conflictFiles = 0;
    let unchangedFiles = 0;
    let needsMetadata = 0;
    let skippedFiles = 0;

    for (const file of spFiles) {
      // Skip folders
      if (file.folder) continue;

      const tracked = trackedByItemId.get(file.id);

      if (!tracked) {
        // ── New file — try ISO 19650 parsing ──
        const result = await processNewFile(supabase, file, projectId, trackedByDocNumber);
        if (result === "new") newFiles++;
        else if (result === "version") versionedFiles++;
        else if (result === "conflict") conflictFiles++;
        else if (result === "needs_metadata") needsMetadata++;
        else if (result === "skipped") skippedFiles++;
      } else if (tracked.file_size !== file.size) {
        // ── File changed — create new version ──
        await processUpdatedFile(supabase, file, tracked);
        updatedFiles++;
      } else {
        unchangedFiles++;
      }
    }

    // Log sync event
    await supabase.from("cde_audit_log").insert({
      event_type: "SYNC",
      entity_type: "system",
      detail: JSON.stringify({
        source,
        scanned: spFiles.length,
        new: newFiles,
        updated: updatedFiles,
        versioned: versionedFiles,
        conflicts: conflictFiles,
        needs_metadata: needsMetadata,
        skipped: skippedFiles,
        unchanged: unchangedFiles,
      }),
    });

    return NextResponse.json({
      status: "completed",
      source,
      scanned: spFiles.length,
      new: newFiles,
      updated: updatedFiles,
      versioned: versionedFiles,
      conflicts: conflictFiles,
      needs_metadata: needsMetadata,
      skipped: skippedFiles,
      unchanged: unchangedFiles,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── Process a new SharePoint file ───────────────────────────────

async function processNewFile(
  supabase: any,
  file: SPDriveItem,
  projectId: string | undefined,
  trackedByDocNumber: Map<string, any>
): Promise<"new" | "version" | "conflict" | "needs_metadata" | "skipped"> {
  const parsed = parseDocNumber(file.name);

  if (!parsed.isValid) {
    // Can't parse ISO number — insert with needs_metadata flag
    if (!projectId) return "needs_metadata"; // Can't insert without project

    const docType = guessDocType(file.name) || "GEN";

    const { error } = await supabase.from("cde_documents").insert({
      project_id: projectId,
      doc_number: file.name.replace(/\.[^.]+$/, ""), // Use filename as fallback
      title: file.name,
      doc_type: docType,
      file_name: file.name,
      file_size: file.size || 0,
      sharepoint_item_id: file.id,
      sharepoint_url: file.webUrl,
      needs_metadata: true,
      status: "S0",
    });

    if (error) {
      console.error("[CDE Sync] Failed to insert new file:", file.name, error.message);
    }

    return "needs_metadata";
  }

  // Valid ISO number — check for existing doc with same number (conflict/version)
  const docNumber = `${parsed.projectCode}-${parsed.originator}-${parsed.functional}-${parsed.spatial}-${parsed.docType}-${parsed.role}-${parsed.sequence}`;
  const existing = trackedByDocNumber.get(docNumber);

  if (existing) {
    // Same doc number exists — is this a newer revision?
    const fileRevision = parsed.revision || "A";
    const existingRevision = existing.revision || "A";

    if (compareRevisions(fileRevision, existingRevision) > 0) {
      // Newer revision — create version record and update current doc
      await createVersionRecord(supabase, existing, file, fileRevision);
      return "version";
    } else if (compareRevisions(fileRevision, existingRevision) === 0) {
      // Same revision, different SharePoint item — conflict
      await supabase.from("cde_audit_log").insert({
        event_type: "SYNC_CONFLICT",
        entity_type: "document",
        entity_id: existing.id,
        entity_ref: docNumber,
        detail: `Conflict: SharePoint file "${file.name}" matches existing doc ${docNumber} at same revision ${existingRevision}`,
      });
      return "conflict";
    }

    // Older revision — skip (not "new")
    return "skipped";
  }

  // Completely new document
  if (!projectId) return "needs_metadata";

  const { error } = await supabase.from("cde_documents").insert({
    project_id: projectId,
    doc_number: docNumber,
    title: file.name.replace(/\.[^.]+$/, ""),
    doc_type: parsed.docType,
    functional: parsed.functional,
    spatial: parsed.spatial,
    role: parsed.role,
    revision: parsed.revision || "A",
    version: 1,
    file_name: file.name,
    file_size: file.size || 0,
    sharepoint_item_id: file.id,
    sharepoint_url: file.webUrl,
    needs_metadata: false,
    status: "S0",
  });

  if (error) {
    console.error("[CDE Sync] Failed to insert new document:", docNumber, error.message);
  }

  return "new";
}

// ── Process an updated (changed) file ───────────────────────────

async function processUpdatedFile(
  supabase: any,
  file: SPDriveItem,
  tracked: any
) {
  const newVersion = (tracked.version || 1) + 1;

  // Create version record for the previous state
  const { error: versionError } = await supabase.from("cde_document_versions").insert({
    document_id: tracked.id,
    version_number: tracked.version || 1,
    revision: tracked.revision || "A",
    file_name: tracked.file_name,
    sharepoint_item_id: tracked.sharepoint_item_id,
    superseded_at: new Date().toISOString(),
  });

  if (versionError) {
    console.error("[CDE Sync] Failed to create version record:", tracked.doc_number, versionError.message);
    return;
  }

  // Update the current document
  const { error: updateError } = await supabase
    .from("cde_documents")
    .update({
      version: newVersion,
      file_size: file.size,
      file_name: file.name,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", tracked.id);

  if (updateError) {
    console.error("[CDE Sync] Failed to update document:", tracked.doc_number, updateError.message);
    return;
  }

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "DOC_VERSION_CREATED",
    entity_type: "document",
    entity_id: tracked.id,
    entity_ref: tracked.doc_number,
    detail: `Auto-versioned from sync: v${tracked.version} → v${newVersion}`,
  });
}

// ── Create version record for revision upgrade ──────────────────

async function createVersionRecord(
  supabase: any,
  existing: any,
  newFile: SPDriveItem,
  newRevision: string
) {
  const newVersion = (existing.version || 1) + 1;

  // Archive current state as a version
  const { error: versionError } = await supabase.from("cde_document_versions").insert({
    document_id: existing.id,
    version_number: existing.version || 1,
    revision: existing.revision || "A",
    file_name: existing.file_name,
    sharepoint_item_id: existing.sharepoint_item_id,
    superseded_at: new Date().toISOString(),
  });

  if (versionError) {
    console.error("[CDE Sync] Failed to create version record:", existing.doc_number, versionError.message);
    return;
  }

  // Update current document to new revision
  const { error: updateError } = await supabase
    .from("cde_documents")
    .update({
      revision: newRevision,
      version: newVersion,
      file_name: newFile.name,
      file_size: newFile.size,
      sharepoint_item_id: newFile.id,
      sharepoint_url: newFile.webUrl,
      uploaded_at: new Date().toISOString(),
    })
    .eq("id", existing.id);

  if (updateError) {
    console.error("[CDE Sync] Failed to update document revision:", existing.doc_number, updateError.message);
    return;
  }

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "DOC_REVISION_UPGRADED",
    entity_type: "document",
    entity_id: existing.id,
    entity_ref: existing.doc_number,
    detail: `Revision upgraded via sync: Rev${existing.revision} → Rev${newRevision} (v${newVersion})`,
  });
}
