// lib/cde/graph-client.ts — Azure AD client_credentials flow for CDE
//
// Unlike the existing SharePoint client (delegated per-user OAuth),
// this uses application-level auth for server-side sync operations.

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

function getConfig() {
  const tenantId = process.env.AZURE_CDE_TENANT_ID;
  const clientId = process.env.AZURE_CDE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CDE_CLIENT_SECRET;
  const siteId = process.env.SHAREPOINT_SITE_ID;

  return { tenantId, clientId, clientSecret, siteId };
}

export function isCDEConfigured(): boolean {
  const { tenantId, clientId, clientSecret, siteId } = getConfig();
  return !!(tenantId && clientId && clientSecret && siteId);
}

export async function getAppToken(): Promise<string> {
  // Return cached token if still valid (with 5-min buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  const { tenantId, clientId, clientSecret } = getConfig();

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("CDE Azure AD env vars not configured (AZURE_CDE_TENANT_ID, AZURE_CDE_CLIENT_ID, AZURE_CDE_CLIENT_SECRET)");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Azure AD token request failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

export function getSiteId(): string {
  const { siteId } = getConfig();
  if (!siteId) {
    throw new Error("SHAREPOINT_SITE_ID env var not configured");
  }
  return siteId;
}

// Generic Graph API caller with automatic token management
export async function graphFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAppToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  return fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers,
  });
}

// Convenience: GET + parse JSON
export async function graphGet<T = any>(path: string): Promise<T> {
  const res = await graphFetch(path);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Graph GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

// Convenience: POST + parse JSON
export async function graphPost<T = any>(path: string, body: any): Promise<T> {
  const res = await graphFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}
