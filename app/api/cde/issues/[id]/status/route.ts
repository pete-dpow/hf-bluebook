// PATCH /api/cde/issues/[id]/status — Update issue status

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["OPEN", "WORK_DONE", "INSPECT", "CLOSED"];
const TRANSITIONS: Record<string, string[]> = {
  OPEN: ["WORK_DONE", "CLOSED"],
  WORK_DONE: ["INSPECT", "OPEN"],
  INSPECT: ["CLOSED", "OPEN"],
  CLOSED: ["OPEN"],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: issue } = await supabase
    .from("cde_issues")
    .select("id, issue_number, status")
    .eq("id", params.id)
    .single();

  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  const allowed = TRANSITIONS[issue.status];
  if (allowed && !allowed.includes(status)) {
    return NextResponse.json({ error: `Cannot transition from ${issue.status} to ${status}` }, { status: 422 });
  }

  const updates: any = { status };
  if (status === "CLOSED") updates.closed_at = new Date().toISOString();
  if (status === "OPEN") updates.closed_at = null;

  const { error } = await supabase.from("cde_issues").update(updates).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("cde_audit_log").insert({
    event_type: "ISSUE_STATUS",
    entity_type: "issue",
    entity_id: issue.id,
    entity_ref: issue.issue_number,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Status: ${issue.status} → ${status}`,
  });

  return NextResponse.json({ success: true, oldStatus: issue.status, newStatus: status });
}
