import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://dpow-chat.vercel.app"}/api/microsoft/callback`;

  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", "openid profile email Files.Read Files.Read.All Files.ReadWrite Files.ReadWrite.All Mail.Read Mail.ReadWrite MailboxSettings.Read User.Read offline_access");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
