// GET /api/cde/test-graph — Health check for CDE Graph API connection

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { isCDEConfigured, graphGet, getSiteId } from "@/lib/cde/graph-client";
import { getSiteDrives } from "@/lib/cde/sharepoint";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCDEConfigured()) {
    return NextResponse.json({
      status: "not_configured",
      message: "CDE Azure AD env vars are not set. Required: AZURE_CDE_TENANT_ID, AZURE_CDE_CLIENT_ID, AZURE_CDE_CLIENT_SECRET, SHAREPOINT_SITE_ID",
    }, { status: 200 });
  }

  try {
    const siteId = getSiteId();

    // Fetch site info
    const site = await graphGet(`/sites/${siteId}`);

    // List drives
    const drives = await getSiteDrives();

    return NextResponse.json({
      status: "connected",
      site: {
        id: site.id,
        displayName: site.displayName,
        webUrl: site.webUrl,
      },
      drives: drives.map((d: any) => ({
        id: d.id,
        name: d.name,
        webUrl: d.webUrl,
        driveType: d.driveType,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      message: err.message,
    }, { status: 500 });
  }
}
