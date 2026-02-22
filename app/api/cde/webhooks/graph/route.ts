// POST /api/cde/webhooks/graph — Microsoft Graph webhook handler
//
// Handles two scenarios:
// 1. Subscription validation (Graph sends validationToken query param)
// 2. Change notifications (Graph POST with notification payload)

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // ── Subscription validation ─────────────────────────────────
  const validationToken = req.nextUrl.searchParams.get("validationToken");
  if (validationToken) {
    // Graph expects plain text response with the token
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // ── Change notification ─────────────────────────────────────
  const webhookSecret = process.env.SYNC_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[CDE Webhook] SYNC_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notifications = body?.value;
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return NextResponse.json({ status: "no_notifications" }, { status: 202 });
  }

  // Validate clientState matches our secret
  const validNotifications = notifications.filter(
    (n: any) => n.clientState === webhookSecret
  );

  if (validNotifications.length === 0) {
    console.warn("[CDE Webhook] All notifications failed clientState validation");
    return NextResponse.json({ error: "Invalid clientState" }, { status: 403 });
  }

  // Queue a sync for each affected resource
  const driveIds = new Set<string>();
  for (const notification of validNotifications) {
    // resource looks like: "drives/{driveId}/root"
    const match = notification.resource?.match(/drives\/([^/]+)/);
    if (match) {
      driveIds.add(match[1]);
    }
  }

  // Fire-and-forget sync call to our own sync endpoint with internal auth
  const baseUrl = req.nextUrl.origin;
  const driveIdList = Array.from(driveIds);
  for (const driveId of driveIdList) {
    fetch(`${baseUrl}/api/cde/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": webhookSecret,
      },
      body: JSON.stringify({ driveId, source: "webhook" }),
    }).catch((err) => {
      console.error("[CDE Webhook] Failed to trigger sync:", err.message);
    });
  }

  // Graph requires 202 response within 3 seconds
  return NextResponse.json({ status: "accepted", queued: driveIdList.length }, { status: 202 });
}
