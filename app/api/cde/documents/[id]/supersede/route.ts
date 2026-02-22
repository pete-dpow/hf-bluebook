// POST /api/cde/documents/[id]/supersede — Create new version, supersede current

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { nextRevision, buildFileName, getFileExtension } from "@/lib/cde/doc-number";
import { isCDEConfigured } from "@/lib/cde/graph-client";
import { uploadFile, findDriveByName } from "@/lib/cde/sharepoint";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Get current document
  const { data: doc } = await supabase
    .from("cde_documents")
    .select("*, cde_projects(project_code, client_id, cde_clients(short_code, sharepoint_library_name))")
    .eq("id", params.id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  const newRevision = nextRevision(doc.revision || "A");
  const newVersion = (doc.version || 1) + 1;

  // Create version record for current state (superseded)
  const { error: versionError } = await supabase.from("cde_document_versions").insert({
    document_id: doc.id,
    version_number: doc.version || 1,
    revision: doc.revision || "A",
    file_name: doc.file_name,
    sharepoint_item_id: doc.sharepoint_item_id,
    uploaded_by: doc.author_id,
    superseded_at: new Date().toISOString(),
  });

  if (versionError) {
    return NextResponse.json({ error: "Failed to create version record: " + versionError.message }, { status: 500 });
  }

  // Upload new file to SharePoint if provided
  let spItemId = doc.sharepoint_item_id;
  let spUrl = doc.sharepoint_url;
  let fileName = doc.file_name;
  let fileSize = doc.file_size;

  if (file) {
    const ext = getFileExtension(file.name) || getFileExtension(doc.file_name || "") || "pdf";
    fileName = buildFileName(doc.doc_number, newRevision, ext);
    fileSize = file.size;

    if (isCDEConfigured()) {
      const project = doc.cde_projects as any;
      const client = project?.cde_clients;
      if (client?.sharepoint_library_name) {
        const drive = await findDriveByName(client.sharepoint_library_name);
        if (drive) {
          const content = Buffer.from(await file.arrayBuffer());
          const folderPath = `${client.short_code}/${project.project_code}/${doc.doc_type}`;
          const result = await uploadFile(drive.id, folderPath, fileName, content, file.type);
          if (result) {
            spItemId = result.id;
            spUrl = result.webUrl;
          }
        }
      }
    }
  }

  // Update document to new revision
  const { error } = await supabase
    .from("cde_documents")
    .update({
      revision: newRevision,
      version: newVersion,
      file_name: fileName,
      file_size: fileSize,
      sharepoint_item_id: spItemId,
      sharepoint_url: spUrl,
      author_id: auth.user.id,
      uploaded_at: new Date().toISOString(),
      status: "S0", // Reset to WIP on supersede
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "SUPERSEDE",
    entity_type: "document",
    entity_id: doc.id,
    entity_ref: doc.doc_number,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Superseded V${doc.version} (Rev ${doc.revision}) → V${newVersion} (Rev ${newRevision})`,
  });

  return NextResponse.json({
    success: true,
    docNumber: doc.doc_number,
    oldVersion: doc.version,
    newVersion,
    oldRevision: doc.revision,
    newRevision,
  });
}
