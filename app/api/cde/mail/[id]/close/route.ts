// PATCH /api/cde/mail/[id]/close — Close a mail item

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();

  const { data: mail } = await supabase
    .from("cde_mail")
    .select("id, mail_number, status")
    .eq("id", params.id)
    .single();

  if (!mail) return NextResponse.json({ error: "Mail not found" }, { status: 404 });
  if (mail.status === "CLOSED") return NextResponse.json({ error: "Already closed" }, { status: 422 });

  const { error } = await supabase
    .from("cde_mail")
    .update({ status: "CLOSED", closed_at: new Date().toISOString() })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "MAIL_CLOSED",
    entity_type: "mail",
    entity_id: params.id,
    entity_ref: mail.mail_number,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Closed ${mail.mail_number}`,
  });

  return NextResponse.json({ success: true });
}
