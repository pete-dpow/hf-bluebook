// POST /api/cde/residents/notify — Batch notify residents via email/SMS

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendResidentEmail, sendResidentSMS } from "@/lib/cde/notifications";
import { visitNotificationEmail } from "@/lib/cde/email-templates";
import { buildPortalUrl } from "@/lib/cde/residents";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { visitId, residentIds, channel, subject, messageBody } = body;

  if (!residentIds || residentIds.length === 0) {
    return NextResponse.json({ error: "residentIds required" }, { status: 400 });
  }
  if (!channel || !["EMAIL", "SMS", "BOTH"].includes(channel)) {
    return NextResponse.json({ error: "channel must be EMAIL, SMS, or BOTH" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Get residents
  const { data: residents } = await supabase
    .from("cde_residents")
    .select("*")
    .in("id", residentIds);

  if (!residents || residents.length === 0) {
    return NextResponse.json({ error: "No residents found" }, { status: 404 });
  }

  // Get visit info if provided
  let visit: any = null;
  if (visitId) {
    const { data } = await supabase.from("cde_visits").select("*").eq("id", visitId).single();
    visit = data;
  }

  const baseUrl = req.nextUrl.origin;
  let emailsSent = 0;
  let smsSent = 0;
  let resendBatchId: string | undefined;
  let twilioBatchId: string | undefined;

  for (const resident of residents) {
    const portalUrl = resident.portal_token ? buildPortalUrl(baseUrl, resident.portal_token) : baseUrl;

    // Send email
    if ((channel === "EMAIL" || channel === "BOTH") && resident.email && resident.email_opt_in) {
      const html = visit
        ? visitNotificationEmail({
            residentName: `${resident.first_name} ${resident.last_name}`,
            visitDate: visit.visit_date,
            startTime: visit.start_time || "TBC",
            endTime: visit.end_time || "TBC",
            visitType: visit.visit_type || "Survey",
            buildings: visit.buildings || [],
            notesForResidents: visit.notes_for_residents || messageBody || "",
            portalUrl,
          })
        : `<p>${messageBody || subject || "Notification from Harmony Fire"}</p><p><a href="${portalUrl}">View Portal</a></p>`;

      const result = await sendResidentEmail({
        to: resident.email,
        subject: subject || "Building Safety Notification — Harmony Fire",
        html,
      });
      if (result.success) {
        emailsSent++;
        if (!resendBatchId) resendBatchId = result.id;
      }
    }

    // Send SMS
    if ((channel === "SMS" || channel === "BOTH") && resident.mobile && resident.sms_opt_in) {
      const smsBody = messageBody || `Harmony Fire: You have a building safety notification. View details: ${portalUrl}`;
      const result = await sendResidentSMS({ to: resident.mobile, body: smsBody });
      if (result.success) {
        smsSent++;
        if (!twilioBatchId) twilioBatchId = result.sid;
      }
    }
  }

  // Log notification
  await supabase.from("cde_notifications_log").insert({
    visit_id: visitId || null,
    resident_ids: residentIds,
    channel,
    subject: subject || "Building Safety Notification",
    body: messageBody || null,
    sent_at: new Date().toISOString(),
    sent_by: auth.user.id,
    resend_batch_id: resendBatchId || null,
    twilio_batch_id: twilioBatchId || null,
    recipient_count: residents.length,
  });

  // Audit
  await supabase.from("cde_audit_log").insert({
    event_type: "NOTIFY",
    entity_type: "resident",
    user_id: auth.user.id,
    user_name: auth.user.email,
    detail: `Notified ${residents.length} residents via ${channel}: ${emailsSent} emails, ${smsSent} SMS`,
  });

  return NextResponse.json({ sent: { emails: emailsSent, sms: smsSent }, recipientCount: residents.length });
}
