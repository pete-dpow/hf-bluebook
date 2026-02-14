import { supabaseAdmin } from "@/lib/supabase";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

interface SharePointConfig {
  siteId: string;
  driveId: string;
}

interface UploadResult {
  id: string;
  name: string;
  webUrl: string;
  size: number;
}

interface FolderResult {
  id: string;
  name: string;
  webUrl: string;
}

interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  lastModifiedDateTime: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
}

// ─── Token Management ──────────────────────────────────────────

async function getValidToken(userId: string): Promise<string | null> {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("microsoft_access_token, microsoft_refresh_token, microsoft_token_expires_at")
    .eq("id", userId)
    .single();

  if (!user?.microsoft_access_token) return null;

  const now = new Date();
  const expiry = new Date(user.microsoft_token_expires_at);

  // Refresh if expired or expiring within 5 minutes
  if (now >= new Date(expiry.getTime() - 5 * 60 * 1000)) {
    if (!user.microsoft_refresh_token) return null;
    return await refreshToken(userId, user.microsoft_refresh_token);
  }

  return user.microsoft_access_token;
}

async function refreshToken(userId: string, refreshTokenValue: string): Promise<string | null> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshTokenValue,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) return null;

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await supabaseAdmin
      .from("users")
      .update({
        microsoft_access_token: tokens.access_token,
        microsoft_refresh_token: tokens.refresh_token || refreshTokenValue,
        microsoft_token_expires_at: newExpiresAt.toISOString(),
      })
      .eq("id", userId);

    return tokens.access_token;
  } catch {
    return null;
  }
}

// ─── Org Config ────────────────────────────────────────────────

export async function getSharePointConfig(organizationId: string): Promise<SharePointConfig | null> {
  const { data } = await supabaseAdmin
    .from("organizations")
    .select("sharepoint_site_id, sharepoint_drive_id")
    .eq("id", organizationId)
    .single();

  if (!data?.sharepoint_site_id || !data?.sharepoint_drive_id) return null;

  return { siteId: data.sharepoint_site_id, driveId: data.sharepoint_drive_id };
}

// ─── Core Operations ───────────────────────────────────────────

export async function createFolder(
  userId: string,
  driveId: string,
  parentPath: string,
  folderName: string
): Promise<FolderResult | null> {
  const token = await getValidToken(userId);
  if (!token) return null;

  // Try to get existing folder first
  const checkUrl = `${GRAPH_BASE}/drives/${driveId}/root:/${parentPath}/${folderName}`;
  const checkRes = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (checkRes.ok) {
    const existing = await checkRes.json();
    return { id: existing.id, name: existing.name, webUrl: existing.webUrl };
  }

  // Create folder
  const parentUrl = parentPath
    ? `${GRAPH_BASE}/drives/${driveId}/root:/${parentPath}:/children`
    : `${GRAPH_BASE}/drives/${driveId}/root/children`;

  const res = await fetch(parentUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "useExisting",
    }),
  });

  if (!res.ok) {
    console.error("SharePoint createFolder failed:", await res.text());
    return null;
  }

  const folder = await res.json();
  return { id: folder.id, name: folder.name, webUrl: folder.webUrl };
}

export async function uploadFile(
  userId: string,
  driveId: string,
  folderPath: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string = "application/octet-stream"
): Promise<UploadResult | null> {
  const token = await getValidToken(userId);
  if (!token) return null;

  const filePath = `${folderPath}/${fileName}`;
  const fileSize = content.length;

  // Files <= 4MB: simple upload
  if (fileSize <= 4 * 1024 * 1024) {
    return await simpleUpload(token, driveId, filePath, content, contentType);
  }

  // Files > 4MB: upload session (chunked)
  return await chunkedUpload(token, driveId, filePath, content);
}

async function simpleUpload(
  token: string,
  driveId: string,
  filePath: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult | null> {
  const url = `${GRAPH_BASE}/drives/${driveId}/root:/${filePath}:/content`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: content,
  });

  if (!res.ok) {
    console.error("SharePoint simpleUpload failed:", await res.text());
    return null;
  }

  const item = await res.json();
  return { id: item.id, name: item.name, webUrl: item.webUrl, size: item.size };
}

async function chunkedUpload(
  token: string,
  driveId: string,
  filePath: string,
  content: Buffer | Uint8Array
): Promise<UploadResult | null> {
  // Create upload session
  const sessionUrl = `${GRAPH_BASE}/drives/${driveId}/root:/${filePath}:/createUploadSession`;
  const sessionRes = await fetch(sessionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      item: { "@microsoft.graph.conflictBehavior": "replace" },
    }),
  });

  if (!sessionRes.ok) {
    console.error("SharePoint createUploadSession failed:", await sessionRes.text());
    return null;
  }

  const session = await sessionRes.json();
  const uploadUrl = session.uploadUrl;

  // Upload in 10MB chunks
  const chunkSize = 10 * 1024 * 1024;
  const totalSize = content.length;
  let offset = 0;
  let lastResponse: any = null;

  while (offset < totalSize) {
    const end = Math.min(offset + chunkSize, totalSize);
    const chunk = content.slice(offset, end);

    const chunkRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${offset}-${end - 1}/${totalSize}`,
      },
      body: chunk,
    });

    if (!chunkRes.ok && chunkRes.status !== 202) {
      console.error("SharePoint chunk upload failed:", await chunkRes.text());
      return null;
    }

    lastResponse = await chunkRes.json();
    offset = end;
  }

  if (!lastResponse?.id) return null;

  return {
    id: lastResponse.id,
    name: lastResponse.name,
    webUrl: lastResponse.webUrl,
    size: lastResponse.size,
  };
}

export async function listFiles(
  userId: string,
  driveId: string,
  folderPath: string
): Promise<DriveItem[]> {
  const token = await getValidToken(userId);
  if (!token) return [];

  const url = folderPath
    ? `${GRAPH_BASE}/drives/${driveId}/root:/${folderPath}:/children`
    : `${GRAPH_BASE}/drives/${driveId}/root/children`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return data.value || [];
}

// ─── Folder Structure ──────────────────────────────────────────

const HF_FOLDERS = ["Quotes", "Products", "Compliance", "GoldenThread", "Projects"];

export async function ensureFolderStructure(
  userId: string,
  driveId: string
): Promise<boolean> {
  // Create root /hf.bluebook folder
  const root = await createFolder(userId, driveId, "", "hf.bluebook");
  if (!root) return false;

  // Create subfolders in parallel
  const results = await Promise.all(
    HF_FOLDERS.map((name) => createFolder(userId, driveId, "hf.bluebook", name))
  );

  return results.every((r) => r !== null);
}

// ─── High-Level Upload Helpers ─────────────────────────────────

export async function uploadQuoteFile(
  userId: string,
  driveId: string,
  quoteNumber: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult | null> {
  return uploadFile(userId, driveId, `hf.bluebook/Quotes`, `${quoteNumber}-${fileName}`, content, contentType);
}

export async function uploadProductFile(
  userId: string,
  driveId: string,
  manufacturerName: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult | null> {
  // Ensure manufacturer subfolder exists
  await createFolder(userId, driveId, "hf.bluebook/Products", manufacturerName);
  return uploadFile(userId, driveId, `hf.bluebook/Products/${manufacturerName}`, fileName, content, contentType);
}

export async function uploadGoldenThreadFile(
  userId: string,
  driveId: string,
  packageRef: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult | null> {
  // Ensure package subfolder exists
  await createFolder(userId, driveId, "hf.bluebook/GoldenThread", packageRef);
  return uploadFile(userId, driveId, `hf.bluebook/GoldenThread/${packageRef}`, fileName, content, contentType);
}

// ─── Helper: Check if SharePoint is Available ──────────────────

export async function isSharePointAvailable(
  userId: string,
  organizationId: string
): Promise<{ available: boolean; driveId?: string }> {
  const config = await getSharePointConfig(organizationId);
  if (!config) return { available: false };

  const token = await getValidToken(userId);
  if (!token) return { available: false };

  return { available: true, driveId: config.driveId };
}
