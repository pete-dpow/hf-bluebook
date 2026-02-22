// POST /api/cde/mail/[id]/respond — Add a response to a mail item

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { responseBody } = await req.json();
  if (!responseBody) return NextResponse.json({ error: "responseBody is required" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  // Get the mail item
  const { data: mail } = await supabase
    .from("cde_mail")
    .select("id, mail_number, status")
    .eq("id", params.id)
    .single();

  if (!mail) return NextResponse.json({ error: "Mail not found" }, { status: 404 });
  if (mail.status === "CLOSED") return NextResponse.json({ error: "Mail is closed" }, { status: 422 });

  // Insert response
  const { data: response, error: respError } = await supabase
    .from("cde_mail_responses")
    .insert({
      mail_id: params.id,
      response_body: responseBody,
      from_user_id: auth.user.id,
    })
    .select()
    .single();

  if (respError) return NextResponse.json({ error: respError.message }, { status: 500 });

  // Update mail status to RESPONDED
  await supabase
    .from("cde_mail")
    .update({ status: "RESPONDED" })
    .eq("id", params.id);

  // Audit log
  await supabase.from("cde_audit_log").insert({
    event_type: "MAIL_RESPONDED",
    entity_type: "mail",
    entity_id: params.id,
    entity_ref: mail.mail_number,
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Responded to ${mail.mail_number}`,
  });

  return NextResponse.json({ response });
}
