// PATCH /api/cde/documents/[id]/status — Update document ISO status

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["S0", "S1", "S3", "S4", "A", "B", "C", "CR"];

// ISO 19650 status transitions: key = current status, value = allowed next statuses
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  S0: ["S1", "S3", "S4", "CR"],          // WIP → any shared/review state or CR
  S1: ["S0", "S3", "S4", "A", "CR"],     // Shared → back to WIP, forward, or approve
  S3: ["S0", "S1", "S4", "A", "CR"],     // Review → back or forward
  S4: ["S0", "S1", "S3", "A", "B", "CR"], // Auth/Verify → approve or back
  A:  ["B", "C", "CR"],                   // Approved → published, archived, or CR
  B:  ["A", "C", "CR"],                   // Published → back to approved, archive, or CR
  C:  ["CR"],                             // Archived → only CR
  CR: ["S0"],                             // Client Review → back to WIP
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await req.json();

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Get current document
  const { data: doc } = await supabase
    .from("cde_documents")
    .select("id, doc_number, status")
    .eq("id", params.id)
    .single();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const oldStatus = doc.status;

  // Validate status transition
  const allowed = ALLOWED_TRANSITIONS[oldStatus];
  if (allowed && !allowed.includes(status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${oldStatus} to ${status}. Allowed: ${allowed.join(", ")}` },
      { status: 422 }
    );
  }

  // Update status
  const { error } = await supabase
    .from("cde_documents")
    .update({ status })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "STATUS",
    entity_type: "document",
    entity_id: doc.id,
    entity_ref: doc.doc_number,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Status: ${oldStatus} → ${status}`,
  });

  return NextResponse.json({ success: true, oldStatus, newStatus: status });
}
