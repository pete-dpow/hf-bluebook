// lib/cde/sharepoint.ts — CDE SharePoint operations
//
// Uses client_credentials Graph API (lib/cde/graph-client.ts).
// Folder structure: CDE-{CODE}/{CLIENT}/{PROJECT}/{DOCTYPE}/

import { graphFetch, graphGet, graphPost, getSiteId } from "./graph-client";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// ─── Types ──────────────────────────────────────────────────────

export interface SPDriveItem {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  lastModifiedDateTime: string;
  createdDateTime?: string;
  file?: { mimeType: string };
  folder?: { childCount: number };
}

export interface SPUploadResult {
  id: string;
  name: string;
  webUrl: string;
  size: number;
}

export interface SPFolderResult {
  id: string;
  name: string;
  webUrl: string;
}

export interface SPListInfo {
  id: string;
  displayName: string;
  webUrl: string;
  driveId: string;
}

// ─── Drive Discovery ────────────────────────────────────────────

export async function getSiteDrives(): Promise<any[]> {
  const siteId = getSiteId();
  const data = await graphGet(`/sites/${siteId}/drives`);
  return data.value || [];
}

export async function findDriveByName(libraryName: string): Promise<{ id: string; webUrl: string } | null> {
  const drives = await getSiteDrives();
  const drive = drives.find((d: any) => d.name === libraryName);
  if (!drive) return null;
  return { id: drive.id, webUrl: drive.webUrl };
}

// ─── Library (Document Library) Creation ────────────────────────

export async function createDocumentLibrary(displayName: string): Promise<SPListInfo> {
  const siteId = getSiteId();

  // Create list with documentLibrary template
  const list = await graphPost(`/sites/${siteId}/lists`, {
    displayName,
    list: { template: "documentLibrary" },
  });

  // Get the drive associated with the new list
  const driveData = await graphGet(`/sites/${siteId}/lists/${list.id}/drive`);

  return {
    id: list.id,
    displayName: list.displayName,
    webUrl: list.webUrl,
    driveId: driveData.id,
  };
}

// ─── Folder Operations ──────────────────────────────────────────

export async function createFolder(
  driveId: string,
  parentPath: string,
  folderName: string
): Promise<SPFolderResult | null> {
  // Check if folder already exists
  const checkPath = parentPath
    ? `/drives/${driveId}/root:/${parentPath}/${folderName}`
    : `/drives/${driveId}/root:/${folderName}`;

  const checkRes = await graphFetch(checkPath);
  if (checkRes.ok) {
    const existing = await checkRes.json();
    return { id: existing.id, name: existing.name, webUrl: existing.webUrl };
  }

  // Create folder
  const parentUrl = parentPath
    ? `/drives/${driveId}/root:/${parentPath}:/children`
    : `/drives/${driveId}/root/children`;

  const res = await graphFetch(parentUrl, {
    method: "POST",
    body: JSON.stringify({
      name: folderName,
      folder: {},
      "@microsoft.graph.conflictBehavior": "useExisting",
    }),
  });

  if (!res.ok) {
    console.error("[CDE SharePoint] createFolder failed:", await res.text());
    return null;
  }

  const folder = await res.json();
  return { id: folder.id, name: folder.name, webUrl: folder.webUrl };
}

// Ensure full CDE folder hierarchy: /{CLIENT}/{PROJECT}/{DOCTYPE}/
export async function ensureCDEFolderStructure(
  driveId: string,
  clientCode: string,
  projectCode: string,
  docType?: string
): Promise<boolean> {
  const clientFolder = await createFolder(driveId, "", clientCode);
  if (!clientFolder) return false;

  const projectFolder = await createFolder(driveId, clientCode, projectCode);
  if (!projectFolder) return false;

  if (docType) {
    const typeFolder = await createFolder(driveId, `${clientCode}/${projectCode}`, docType);
    if (!typeFolder) return false;
  }

  return true;
}

// ─── File Operations ────────────────────────────────────────────

export async function uploadFile(
  driveId: string,
  folderPath: string,
  fileName: string,
  content: Buffer | Uint8Array,
  contentType: string = "application/octet-stream"
): Promise<SPUploadResult | null> {
  const filePath = `${folderPath}/${fileName}`;
  const fileSize = content.length;

  // Files <= 4MB: simple upload
  if (fileSize <= 4 * 1024 * 1024) {
    return simpleUpload(driveId, filePath, content, contentType);
  }

  // Files > 4MB: chunked upload session
  return chunkedUpload(driveId, filePath, content);
}

async function simpleUpload(
  driveId: string,
  filePath: string,
  content: Buffer | Uint8Array,
  contentType: string
): Promise<SPUploadResult | null> {
  const token = (await import("./graph-client")).getAppToken();
  const t = await token;

  const url = `${GRAPH_BASE}/drives/${driveId}/root:/${filePath}:/content`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": contentType,
    },
    body: content,
  });

  if (!res.ok) {
    console.error("[CDE SharePoint] simpleUpload failed:", await res.text());
    return null;
  }

  const item = await res.json();
  return { id: item.id, name: item.name, webUrl: item.webUrl, size: item.size };
}

async function chunkedUpload(
  driveId: string,
  filePath: string,
  content: Buffer | Uint8Array
): Promise<SPUploadResult | null> {
  const token = (await import("./graph-client")).getAppToken();
  const t = await token;

  // Create upload session
  const sessionUrl = `${GRAPH_BASE}/drives/${driveId}/root:/${filePath}:/createUploadSession`;
  const sessionRes = await fetch(sessionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      item: { "@microsoft.graph.conflictBehavior": "replace" },
    }),
  });

  if (!sessionRes.ok) {
    console.error("[CDE SharePoint] createUploadSession failed:", await sessionRes.text());
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
      console.error("[CDE SharePoint] chunk upload failed:", await chunkRes.text());
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

// ─── List Files ─────────────────────────────────────────────────

export async function listFiles(
  driveId: string,
  folderPath?: string
): Promise<SPDriveItem[]> {
  const path = folderPath
    ? `/drives/${driveId}/root:/${folderPath}:/children`
    : `/drives/${driveId}/root/children`;

  const res = await graphFetch(path);
  if (!res.ok) return [];

  const data = await res.json();
  return data.value || [];
}

// List all files recursively using delta query
export async function listAllFiles(driveId: string): Promise<SPDriveItem[]> {
  const items: SPDriveItem[] = [];
  let nextLink: string | null = `/drives/${driveId}/root/delta`;

  while (nextLink) {
    const res = await graphFetch(nextLink);
    if (!res.ok) break;

    const data = await res.json();
    const fileItems = (data.value || []).filter((item: any) => item.file);
    items.push(...fileItems);

    nextLink = data["@odata.nextLink"]
      ? data["@odata.nextLink"].replace(GRAPH_BASE, "")
      : null;
  }

  return items;
}

// ─── Get File URL ───────────────────────────────────────────────

export async function getFileUrl(driveId: string, itemId: string): Promise<string | null> {
  try {
    const item = await graphGet(`/drives/${driveId}/items/${itemId}`);
    return item.webUrl || null;
  } catch {
    return null;
  }
}

// ─── Get File Content ───────────────────────────────────────────

export async function getFileContent(driveId: string, itemId: string): Promise<ArrayBuffer | null> {
  const res = await graphFetch(`/drives/${driveId}/items/${itemId}/content`);
  if (!res.ok) return null;
  return res.arrayBuffer();
}

// ─── Webhook Subscription ───────────────────────────────────────

export async function createWebhookSubscription(
  driveId: string,
  notificationUrl: string,
  expirationMinutes: number = 43200 // 30 days max
): Promise<any> {
  const expiration = new Date(Date.now() + expirationMinutes * 60 * 1000);

  return graphPost("/subscriptions", {
    changeType: "updated",
    notificationUrl,
    resource: `/drives/${driveId}/root`,
    expirationDateTime: expiration.toISOString(),
    clientState: (() => {
      const secret = process.env.SYNC_WEBHOOK_SECRET;
      if (!secret) throw new Error("SYNC_WEBHOOK_SECRET environment variable is not set");
      return secret;
    })(),
  });
}

export async function renewWebhookSubscription(subscriptionId: string, expirationMinutes: number = 43200): Promise<any> {
  const expiration = new Date(Date.now() + expirationMinutes * 60 * 1000);

  const res = await graphFetch(`/subscriptions/${subscriptionId}`, {
    method: "PATCH",
    body: JSON.stringify({
      expirationDateTime: expiration.toISOString(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Renew subscription failed (${res.status}): ${body}`);
  }

  return res.json();
}
