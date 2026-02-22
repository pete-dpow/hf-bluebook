// lib/cde/audit.ts — Centralized audit logging helper

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface AuditEntry {
  event_type: string;
  entity_type: string;
  entity_id?: string;
  entity_ref?: string;
  user_id?: string;
  user_name?: string;
  detail?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("cde_audit_log").insert({
    event_type: entry.event_type,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id || null,
    entity_ref: entry.entity_ref || null,
    user_id: entry.user_id || null,
    user_name: entry.user_name || null,
    detail: entry.detail || null,
  });

  if (error) {
    console.error("[CDE Audit] Failed to log event:", entry.event_type, error.message);
  }
}

// Common event types
export const AUDIT_EVENTS = {
  // Documents
  UPLOAD: "UPLOAD",
  STATUS: "STATUS",
  SUPERSEDE: "SUPERSEDE",
  DOC_AUTO_APPROVED: "DOC_AUTO_APPROVED",
  DOC_VERSION_CREATED: "DOC_VERSION_CREATED",
  DOC_REVISION_UPGRADED: "DOC_REVISION_UPGRADED",
  // Mail
  MAIL_CREATED: "MAIL_CREATED",
  MAIL_RESPONDED: "MAIL_RESPONDED",
  MAIL_CLOSED: "MAIL_CLOSED",
  // Issues
  ISSUE_RAISED: "ISSUE_RAISED",
  ISSUE_STATUS: "ISSUE_STATUS",
  // Workflows
  WORKFLOW_STARTED: "WORKFLOW_STARTED",
  WORKFLOW_STEP_COMPLETED: "WORKFLOW_STEP_COMPLETED",
  WORKFLOW_COMPLETED: "WORKFLOW_COMPLETED",
  // Sync
  SYNC: "SYNC",
  SYNC_CONFLICT: "SYNC_CONFLICT",
  // Residents
  NOTIFY: "NOTIFY",
  VISIT_SCHEDULED: "VISIT_SCHEDULED",
  // System
  LOGIN: "LOGIN",
  EXPORT: "EXPORT",
} as const;
