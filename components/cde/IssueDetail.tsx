"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PriorityBadge from "./PriorityBadge";

const MONO = "'DM Mono',monospace";
const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

interface IssueDetailProps {
  issueId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_FLOW = ["OPEN", "WORK_DONE", "INSPECT", "CLOSED"];

export default function IssueDetail({ issueId, onClose, onUpdated }: IssueDetailProps) {
  const [issue, setIssue] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!issueId) { setIssue(null); setAuditEvents([]); return; }
    loadIssue();
    loadAudit();
  }, [issueId]);

  async function loadIssue() {
    const { data } = await supabase.from("cde_issues").select("*").eq("id", issueId).single();
    setIssue(data);
  }

  async function loadAudit() {
    const { data } = await supabase.from("cde_audit_log").select("*")
      .eq("entity_id", issueId).eq("entity_type", "issue")
      .order("created_at", { ascending: false }).limit(20);
    setAuditEvents(data || []);
  }

  async function advanceStatus(newStatus: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/cde/issues/${issueId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      loadIssue();
      loadAudit();
      onUpdated();
    }
  }

  const isOpen = !!issueId;
  const currentIdx = issue ? STATUS_FLOW.indexOf(issue.status) : -1;
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 400, background: "#fff",
      borderLeft: "1px solid #d1d5db", zIndex: 200,
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform .2s cubic-bezier(.16,1,.3,1)",
      display: "flex", flexDirection: "column", boxShadow: "-4px 0 16px rgba(0,0,0,.08)",
      pointerEvents: isOpen ? "auto" : "none",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#f8f9fb" }}>
        <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: "#154f91" }}>{issue?.issue_number}</span>
        <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>✕</button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {issue && (
          <>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>{issue.title}</div>

            {/* Status progress */}
            <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
              {STATUS_FLOW.map((s, i) => (
                <div key={s} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i <= currentIdx ? statusColor(issue.status) : "#e5e7eb",
                }} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              <IssueStatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#9ca3af", background: "#eef0f4", padding: "2px 6px", borderRadius: 3 }}>{issue.issue_type}</span>
            </div>

            {issue.description && (
              <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, padding: 10, background: "#f8f9fb", borderRadius: 5, border: "1px solid #e5e7eb", marginBottom: 12 }}>
                {issue.description}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <FL label="Building">{issue.building || "—"}</FL>
              <FL label="Level">{issue.level || "—"}</FL>
              <FL label="Raised">{new Date(issue.raised_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</FL>
              <FL label="Due">{issue.due_date ? new Date(issue.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</FL>
            </div>

            {/* Audit */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>History</div>
              {auditEvents.map((e) => (
                <div key={e.id} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "#9ca3af" }}>
                    {new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                  {" · "}
                  <span style={{ color: "#4b5563" }}>{e.detail}</span>
                </div>
              ))}
              {auditEvents.length === 0 && <div style={{ fontSize: 10, color: "#9ca3af" }}>No history</div>}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {issue && issue.status !== "CLOSED" && (
        <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 6 }}>
          {nextStatus && (
            <button style={{ ...footBtn, background: "#154f91", borderColor: "#154f91", color: "#fff" }} onClick={() => advanceStatus(nextStatus)}>
              {nextStatus === "WORK_DONE" ? "Mark Work Done" : nextStatus === "INSPECT" ? "Ready for Inspect" : "Close Issue"}
            </button>
          )}
          <button style={footBtn} onClick={() => advanceStatus("CLOSED")}>Close</button>
        </div>
      )}
    </div>
  );
}

function statusColor(s: string): string {
  if (s === "OPEN") return "#dc2626";
  if (s === "WORK_DONE") return "#d97706";
  if (s === "INSPECT") return "#ea580c";
  return "#4d7c0f";
}

function IssueStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: "#fef2f2", color: "#dc2626" },
    WORK_DONE: { bg: "#fffbeb", color: "#d97706" },
    INSPECT: { bg: "#fff7ed", color: "#ea580c" },
    CLOSED: { bg: "#f0fdf4", color: "#4d7c0f" },
  };
  const c = map[status] || map.OPEN;
  return <span style={{ fontSize: 9, fontWeight: 600, color: c.color, background: c.bg, padding: "2px 6px", borderRadius: 3 }}>{status.replace("_", " ")}</span>;
}

function FL({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 500, color: "#d1d5db", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: "11.5px", color: "#111827", marginBottom: 10 }}>{children}</div>
    </div>
  );
}

const footBtn: React.CSSProperties = {
  flex: 1, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
  border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff",
  fontSize: "10.5px", fontWeight: 500, color: "#4b5563", cursor: "pointer",
  fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
};
