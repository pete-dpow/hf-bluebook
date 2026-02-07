import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // Get invite email (using service role)
    const { data: invite, error } = await supabase
      .from("organization_invites")
      .select("email, expires_at")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (error || !invite) {
      return NextResponse.json(
        { error: "Invalid or expired invitation link" },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: invite.email,
    });

  } catch (error: any) {
    console.error("Invite info error:", error);
    return NextResponse.json(
      { error: "Failed to get invite info" },
      { status: 500 }
    );
  }
}
