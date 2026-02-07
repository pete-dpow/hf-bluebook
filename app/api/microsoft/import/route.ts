import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";

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

export async function POST(request: NextRequest) {
  // Get user from request authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { fileId, fileName } = await request.json();

  if (!fileId || !fileName) {
    return NextResponse.json({ error: "Missing fileId or fileName" }, { status: 400 });
  }

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("microsoft_access_token, microsoft_refresh_token, microsoft_token_expires_at, active_organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.microsoft_access_token) {
    return NextResponse.json({ error: "Microsoft 365 not connected" }, { status: 400 });
  }

  try {
    const accessToken = await refreshTokenIfNeeded(
      user.id,
      userData.microsoft_access_token,
      userData.microsoft_refresh_token,
      userData.microsoft_token_expires_at
    );

    // Download file from OneDrive
    const fileResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!fileResponse.ok) {
      throw new Error("Failed to download file");
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Parse as rows (same format as local upload)
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (!rows || rows.length === 0) {
      throw new Error("Empty file");
    }

    // Structure data same way as local upload
    const structured = {
      totalRows: rows.length,
      totalColumns: rows[0]?.length || 0,
      rows,
      fileName,
    };

    const projectName = fileName.replace(/\.(xlsx|xls|csv)$/i, "");

    // Save to database
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .insert({
        user_id: user.id,
        organization_id: userData.active_organization_id,
        name: projectName,
        dataset: structured,
      })
      .select()
      .single();

    if (projectError) {
      throw projectError;
    }

    // Return structured data for localStorage
    return NextResponse.json({ 
      success: true,
      data: structured,
      project: {
        id: project.id,
        name: project.name,
      }
    });
  } catch (error: any) {
    console.error("Error importing file:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
