// lib/cde/residents.ts — Portal token generation + validation

import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Generate a portal token for a resident (valid for 90 days)
export async function generatePortalToken(residentId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { error } = await supabase.from("cde_residents").update({
    portal_token: token,
    portal_token_expires_at: expiresAt.toISOString(),
  }).eq("id", residentId);

  if (error) throw new Error(`Failed to save portal token: ${error.message}`);

  return token;
}

// Validate a portal token and return the resident
export async function validatePortalToken(token: string): Promise<any | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("cde_residents")
    .select("*")
    .eq("portal_token", token)
    .single();

  if (!data) return null;

  // Check expiry
  if (data.portal_token_expires_at && new Date(data.portal_token_expires_at) < new Date()) {
    return null;
  }

  // Update last active
  await supabase.from("cde_residents").update({
    last_active_at: new Date().toISOString(),
  }).eq("id", data.id);

  return data;
}

// Build portal URL
export function buildPortalUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/cde/residents/portal/${token}`;
}
