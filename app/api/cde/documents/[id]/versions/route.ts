// GET /api/cde/documents/[id]/versions — List version history

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
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
    .select("id, doc_number, revision, version, file_name, file_size, uploaded_at, author_id, status")
    .eq("id", params.id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Get version history
  const { data: versions } = await supabase
    .from("cde_document_versions")
    .select("*")
    .eq("document_id", params.id)
    .order("version_number", { ascending: false });

  return NextResponse.json({
    current: {
      version: doc.version,
      revision: doc.revision,
      fileName: doc.file_name,
      fileSize: doc.file_size,
      uploadedAt: doc.uploaded_at,
      authorId: doc.author_id,
      status: doc.status,
    },
    versions: versions || [],
  });
}
