import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

async function refreshTokenIfNeeded(userId: string, accessToken: string, refreshToken: string, expiresAt: string) {
  const now = new Date();
  const expiry = new Date(expiresAt);
  
  if (now >= expiry) {
    const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) throw new Error("Failed to refresh token");

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabaseAdmin
      .from("users")
      .update({
        microsoft_access_token: tokens.access_token,
        microsoft_refresh_token: tokens.refresh_token,
        microsoft_token_expires_at: newExpiresAt.toISOString(),
      })
      .eq("id", userId);

    return tokens.access_token;
  }
  
  return accessToken;
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const folderId = request.nextUrl.searchParams.get('folderId'); // New parameter for folder navigation
  
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("microsoft_access_token, microsoft_refresh_token, microsoft_token_expires_at")
    .eq("id", userId)
    .single();

  if (!userData?.microsoft_access_token) {
    return NextResponse.json({ error: "Microsoft 365 not connected" }, { status: 400 });
  }

  try {
    const accessToken = await refreshTokenIfNeeded(
      userId,
      userData.microsoft_access_token,
      userData.microsoft_refresh_token,
      userData.microsoft_token_expires_at
    );

    // Build the API URL based on whether we're fetching root or a specific folder
    let apiUrl;
    if (folderId) {
      // Fetch children of a specific folder
      apiUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file`;
    } else {
      // Fetch root folder children
      apiUrl = "https://graph.microsoft.com/v1.0/me/drive/root/children?$select=id,name,size,lastModifiedDateTime,webUrl,folder,file";
    }

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Microsoft Graph API error:", response.status, errorText);
      throw new Error(`Microsoft API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Separate folders and files, and filter files to only Excel
    const items = data.value || [];
    
    const folders = items
      .filter((item: any) => item.folder)
      .map((folder: any) => ({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        childCount: folder.folder?.childCount || 0,
      }));

    const files = items
      .filter((item: any) => item.file && item.name.match(/\.(xlsx|xls|csv)$/i))
      .map((file: any) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        lastModifiedDateTime: file.lastModifiedDateTime,
        webUrl: file.webUrl,
        type: 'file',
      }));

    return NextResponse.json({ 
      folders,
      files,
      totalItems: folders.length + files.length
    });
  } catch (error: any) {
    console.error("Error fetching files:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
