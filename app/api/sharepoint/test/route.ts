import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { isSharePointAvailable, ensureFolderStructure } from "@/lib/sharepoint/client";

/** POST — test SharePoint connection + create folder structure */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { available, driveId } = await isSharePointAvailable(auth.user.id, auth.organizationId);

  if (!available || !driveId) {
    return NextResponse.json({
      ok: false,
      error: "SharePoint not configured or token expired",
    });
  }

  const foldersCreated = await ensureFolderStructure(auth.user.id, driveId);

  return NextResponse.json({
    ok: foldersCreated,
    message: foldersCreated
      ? "Connected — folder structure created"
      : "Connection works but folder creation failed",
  });
}
