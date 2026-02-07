import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
  try {
    const { email, role, organizationId, token } = await req.json();

    if (!email || !role || !organizationId || !token) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin of the organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can invite members" },
        { status: 403 }
      );
    }

    // Check if invitee already has an account
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users.find(u => u.email === email);

    // If user exists, check if already a member
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member" },
          { status: 400 }
        );
      }
    }

    // Check if there's already a pending invite
    const { data: existingInvite } = await supabase
      .from("organization_invites")
      .select("id, expires_at")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .is("accepted_at", null)
      .single();

    if (existingInvite) {
      // Check if invite is still valid
      if (new Date(existingInvite.expires_at) > new Date()) {
        return NextResponse.json(
          { error: "Invite already sent and still valid" },
          { status: 400 }
        );
      }
      
      // Delete expired invite
      await supabase
        .from("organization_invites")
        .delete()
        .eq("id", existingInvite.id);
    }

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invite
    const { data: invite, error: inviteError } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: organizationId,
        email,
        role,
        invited_by: user.id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      throw new Error(inviteError.message);
    }

    // Get organization name for email
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    // Generate invite link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://dpow-chat.vercel.app"}/invite/${inviteToken}`;

    // Send invite email via Resend
    try {
      await resend.emails.send({
        from: "dpow.chat <noreply@dpow.co.uk>",
        to: email,
        subject: `You've been invited to join ${org?.name || "an organization"} on dpow.chat`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #2A2A2A; margin: 0; padding: 40px 20px; background: #FCFCFA;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #E5E7EB;">
                
                <!-- Header -->
                <div style="padding: 40px 40px 32px 40px; border-bottom: 1px solid #E5E7EB;">
                  <h1 style="margin: 0 0 8px 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 42px; font-weight: 500; letter-spacing: 0.01em; color: #2A2A2A;">
                    dpow.chat
                  </h1>
                  <p style="margin: 0; font-size: 14px; color: #4B4B4B; letter-spacing: -0.01em;">
                    Structured Intelligence for Project Delivery
                  </p>
                </div>
                
                <!-- Body -->
                <div style="padding: 40px;">
                  <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 500; color: #2A2A2A;">
                    You've been invited to join ${org?.name || "an organization"}
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #2A2A2A;">
                    You've been invited to join as a <strong>${role}</strong>.
                  </p>
                  
                  <div style="margin: 32px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background: #2563EB; color: white; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 15px; transition: opacity 0.2s;">
                      Accept Invitation
                    </a>
                  </div>
                  
                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0 0 8px 0; font-size: 13px; color: #6B7280;">
                      Or copy this link:
                    </p>
                    <p style="margin: 0; font-size: 13px; color: #2563EB; word-break: break-all; background: #FCFCFA; padding: 12px; border-radius: 6px; border: 1px solid #E5E7EB;">
                      ${inviteUrl}
                    </p>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="padding: 24px 40px; background: #FCFCFA; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0; font-size: 13px; color: #6B7280;">
                    This invitation expires in 7 days.
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (emailError: any) {
      console.error("Email send error:", emailError);
      // Don't fail the whole request if email fails
    }

    return NextResponse.json({
      ok: true,
      message: "Invite sent successfully",
      inviteUrl,
      expiresAt,
    });

  } catch (error: any) {
    console.error("Invite error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send invite" },
      { status: 500 }
    );
  }
}
