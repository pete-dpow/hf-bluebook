import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Verify quote belongs to org and has a client email
  const { data: quote, error: qError } = await supabaseAdmin
    .from("quotes")
    .select("id, client_email, status")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (qError || !quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!quote.client_email) return NextResponse.json({ error: "Quote has no client email" }, { status: 400 });

  // Send Inngest event
  await inngest.send({
    name: "quote/send.requested",
    data: {
      quote_id: params.id,
      user_id: auth.user.id,
    },
  });

  return NextResponse.json({ message: "Quote sending" }, { status: 202 });
}
