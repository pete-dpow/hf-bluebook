// lib/cde/notifications.ts — Resend email + Twilio SMS dispatch

// Send email via Resend
export async function sendResidentEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "residents@harmonyfire.co.uk";

  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Harmony Fire <${fromEmail}>`,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, id: data.id };
    }
    const err = await res.text();
    return { success: false, error: err };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Send SMS via Twilio
export async function sendResidentSMS(params: {
  to: string;
  body: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: params.to,
      From: fromNumber,
      Body: params.body,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, sid: data.sid };
    }
    const err = await res.text();
    return { success: false, error: err };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
