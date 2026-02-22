// POST /api/cde/admin/create-library — Create a CDE document library in SharePoint
//
// Body: { clientCode: string, sharepoint_library_name?: string }
// Creates a library named CDE-{CODE} (e.g. CDE-LBHF)

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { isCDEConfigured } from "@/lib/cde/graph-client";
import { createDocumentLibrary, findDriveByName } from "@/lib/cde/sharepoint";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCDEConfigured()) {
    return NextResponse.json({ error: "CDE Azure AD not configured" }, { status: 503 });
  }

  const body = await req.json();
  const { clientCode, sharepoint_library_name } = body;

  if (!clientCode) {
    return NextResponse.json({ error: "clientCode is required" }, { status: 400 });
  }

  const libraryName = sharepoint_library_name || `CDE-${clientCode.toUpperCase()}`;

  try {
    // Check if library already exists
    const existing = await findDriveByName(libraryName);
    if (existing) {
      return NextResponse.json({
        status: "exists",
        library: { name: libraryName, driveId: existing.id, webUrl: existing.webUrl },
      });
    }

    // Create new document library
    const lib = await createDocumentLibrary(libraryName);

    // Update cde_clients record with library name if client exists
    const supabase = getSupabaseAdmin();
    await supabase
      .from("cde_clients")
      .update({ sharepoint_library_name: libraryName })
      .eq("short_code", clientCode.toUpperCase());

    return NextResponse.json({
      status: "created",
      library: {
        name: lib.displayName,
        listId: lib.id,
        driveId: lib.driveId,
        webUrl: lib.webUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
