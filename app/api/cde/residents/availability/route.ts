// POST /api/cde/residents/availability — Update resident availability (public, token-based)

import { NextRequest, NextResponse } from "next/server";
import { validatePortalToken } from "@/lib/cde/residents";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token, availabilityNotes, smsOptIn, emailOptIn } = body;

  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const resident = await validatePortalToken(token);
  if (!resident) return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  const updates: any = {};
  if (availabilityNotes !== undefined) updates.availability_notes = availabilityNotes;
  if (smsOptIn !== undefined) updates.sms_opt_in = smsOptIn;
  if (emailOptIn !== undefined) updates.email_opt_in = emailOptIn;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await supabase.from("cde_residents").update(updates).eq("id", resident.id);

  return NextResponse.json({ success: true });
}
