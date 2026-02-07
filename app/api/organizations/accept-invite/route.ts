import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  console.log("=== ACCEPT INVITE API CALLED ===");
  
  try {
    const body = await req.json();
    console.log("Request body received");
    
    const { token, userToken } = body;

    if (!token || !userToken) {
      console.error("Missing fields:", { hasToken: !!token, hasUserToken: !!userToken });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log("Verifying user authentication...");
    const { data: { user }, error: authError } = await clientSupabase.auth.getUser(userToken);
    
    console.log("Auth result:", { userEmail: user?.email, hasError: !!authError });
    
    if (authError || !user) {
      console.error("Auth failed:", authError?.message);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Fetching invite details...");
    // Get invite details (using service role to bypass RLS)
    const { data: invite, error: inviteError } = await supabase
      .from("organization_invites")
      .select("*, organizations(name)")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    console.log("Invite fetch result:", { found: !!invite, error: inviteError?.message });

    if (inviteError || !invite) {
      console.error("Invite not found or error:", inviteError?.message);
      return NextResponse.json(
        { error: "Invalid or expired invitation link" },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      console.error("Invite expired");
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if user's email matches invite
    if (user.email !== invite.email) {
      console.error("Email mismatch:", { userEmail: user.email, inviteEmail: invite.email });
      return NextResponse.json(
        { error: `This invitation was sent to ${invite.email}` },
        { status: 400 }
      );
    }

    console.log("Checking if already a member...");
    // Check if already a member (using service role)
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", invite.organization_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      console.log("User already a member, marking invite as accepted");
      // Already a member - just mark invite as accepted
      await supabase
        .from("organization_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      return NextResponse.json({
        success: true,
        message: `You're already in ${invite.organizations?.name || "this organization"}!`,
        organizationName: invite.organizations?.name,
      });
    }

    console.log("Adding user to organization...");
    // Add user to organization (using service role)
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role,
      });

    if (memberError) {
      console.error("Member insert error:", memberError.message);
      return NextResponse.json(
        { error: "Failed to accept invitation" },
        { status: 500 }
      );
    }

    console.log("Marking invite as accepted...");
    // Mark invite as accepted
    await supabase
      .from("organization_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    console.log("Setting active org (optional)...");
    // Try to set active org (optional, ignore errors)
    try {
      await supabase
        .from("users")
        .update({ active_organization_id: invite.organization_id })
        .eq("id", user.id);
    } catch (e) {
      console.log("Could not set active org (non-critical)");
    }

    console.log("✅ SUCCESS - User added to organization");
    return NextResponse.json({
      success: true,
      message: `Welcome to ${invite.organizations?.name || "the organization"}!`,
      organizationName: invite.organizations?.name,
    });

  } catch (error: any) {
    console.error("!!! ACCEPT INVITE ERROR !!!");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Failed to accept invite" },
      { status: 500 }
    );
  }
}
