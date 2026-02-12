import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hf-bluebook.vercel.app";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?error=microsoft_auth_failed`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/?error=missing_code`);
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const redirectUri = `${baseUrl}/api/microsoft/callback`;

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange code for token");
    }

    const tokens = await tokenResponse.json();
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // --- Fresh login flow (userId === "new") ---
    if (userId === "new") {
      // Get user profile from Microsoft Graph
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!graphResponse.ok) {
        console.error("Microsoft Graph /me failed:", await graphResponse.text());
        throw new Error("Failed to get Microsoft profile");
      }

      const msProfile = await graphResponse.json();
      const email = msProfile.mail || msProfile.userPrincipalName;
      const displayName = msProfile.displayName || email;

      if (!email) {
        throw new Error("No email found in Microsoft profile");
      }

      // Try to create a Supabase user (ignores error if user already exists)
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: displayName, microsoft_id: msProfile.id },
      });

      // Generate a magic link — this works whether user was just created or already existed
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${baseUrl}/auth/callback`,
        },
      });

      if (linkError || !linkData) {
        console.error("generateLink error:", linkError);
        throw new Error("Failed to generate auth link");
      }

      const supabaseUserId = linkData.user.id;

      // Store Microsoft tokens against the real Supabase user ID
      const { error: dbError } = await supabaseAdmin
        .from("users")
        .upsert({
          id: supabaseUserId,
          microsoft_access_token: tokens.access_token,
          microsoft_refresh_token: tokens.refresh_token,
          microsoft_token_expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'id'
        });

      if (dbError) {
        console.error("Failed to save MS tokens:", dbError);
        // Don't throw — user can still log in, just won't have SharePoint access yet
      }

      // Redirect to the Supabase action_link which will verify the token
      // and redirect to /auth/callback with access_token + refresh_token
      const actionLink = linkData.properties.action_link;
      return NextResponse.redirect(actionLink);
    }

    // --- Existing user flow (connecting Microsoft to existing account) ---
    const { error: dbError } = await supabaseAdmin
      .from("users")
      .upsert({
        id: userId,
        microsoft_access_token: tokens.access_token,
        microsoft_refresh_token: tokens.refresh_token,
        microsoft_token_expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'id'
      });

    if (dbError) {
      console.error("Failed to save tokens:", dbError);
      throw new Error("Failed to save tokens");
    }

    return NextResponse.redirect(`${baseUrl}/?m365_connected=true`);
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/?error=auth_failed`);
  }
}
