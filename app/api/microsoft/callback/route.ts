import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "https://dpow-chat.vercel.app"}/?error=microsoft_auth_failed`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "https://dpow-chat.vercel.app"}/?error=missing_code`);
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());

    const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://dpow-chat.vercel.app"}/api/microsoft/callback`;

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

    // CRITICAL FIX: Upsert instead of update - creates row if it doesn't exist
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

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "https://dpow-chat.vercel.app"}/?m365_connected=true`);
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || "https://dpow-chat.vercel.app"}/?error=auth_failed`);
  }
}
