// POST /api/cde/documents/upload — Upload document to SharePoint + insert + audit

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isCDEConfigured } from "@/lib/cde/graph-client";
import { uploadFile, ensureCDEFolderStructure, findDriveByName } from "@/lib/cde/sharepoint";
import { generateDocNumber } from "@/lib/cde/doc-number";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const docType = formData.get("docType") as string;
  const functional = formData.get("functional") as string | null;
  const spatial = formData.get("spatial") as string | null;
  const role = formData.get("role") as string | null;
  const status = (formData.get("status") as string) || "S0";
  const discipline = formData.get("discipline") as string | null;
  const building = formData.get("building") as string | null;
  const revision = (formData.get("revision") as string) || "A";

  if (!projectId || !title || !docType) {
    return NextResponse.json({ error: "projectId, title, and docType are required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get project + client info for doc numbering and SharePoint path
  const { data: project } = await supabase
    .from("cde_projects")
    .select("id, project_code, client_id, cde_clients(short_code, sharepoint_library_name)")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Get next sequence number for this doc type in project
  const { count: existingCount } = await supabase
    .from("cde_documents")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("doc_type", docType);

  const sequence = (existingCount || 0) + 1;

  const docNumber = generateDocNumber({
    projectCode: project.project_code,
    functional: functional || "GN",
    spatial: spatial || "ZZ",
    docType,
    role: role || "S",
    sequence,
  });

  // Upload to SharePoint if configured
  let spItemId: string | null = null;
  let spUrl: string | null = null;
  let fileName = `${docNumber}_Rev${revision}`;
  let fileSize = 0;

  if (file) {
    const ext = file.name.split(".").pop() || "pdf";
    fileName = `${docNumber}_Rev${revision}.${ext}`;
    fileSize = file.size;

    if (isCDEConfigured()) {
      const client = project.cde_clients as any;
      if (client?.sharepoint_library_name) {
        const drive = await findDriveByName(client.sharepoint_library_name);
        if (drive) {
          await ensureCDEFolderStructure(drive.id, client.short_code, project.project_code, docType);
          const content = Buffer.from(await file.arrayBuffer());
          const folderPath = `${client.short_code}/${project.project_code}/${docType}`;
          const result = await uploadFile(drive.id, folderPath, fileName, content, file.type);
          if (result) {
            spItemId = result.id;
            spUrl = result.webUrl;
          }
        }
      }
    }
  }

  // Insert document record
  const { data: doc, error } = await supabase
    .from("cde_documents")
    .insert({
      project_id: projectId,
      doc_number: docNumber,
      title,
      doc_type: docType,
      functional: functional || null,
      spatial: spatial || null,
      role: role || null,
      revision,
      version: 1,
      status,
      discipline: discipline || null,
      building: building || null,
      file_name: fileName,
      file_size: fileSize,
      sharepoint_item_id: spItemId,
      sharepoint_url: spUrl,
      author_id: auth.user.id,
      needs_metadata: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "UPLOAD",
    entity_type: "document",
    entity_id: doc.id,
    entity_ref: docNumber,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Uploaded ${fileName} (${status})`,
  });

  return NextResponse.json({ document: doc, docNumber });
}
