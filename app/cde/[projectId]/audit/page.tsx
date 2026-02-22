"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuditSubHeader from "@/components/cde/AuditSubHeader";

const MONO = "'DM Mono',monospace";

const EVENT_COLORS: Record<string, string> = {
  UPLOAD: "#154f91", STATUS: "#7c3aed", SUPERSEDE: "#ea580c",
  MAIL_CREATED: "#0d9488", MAIL_RESPONDED: "#4d7c0f", MAIL_CLOSED: "#6b7280",
  ISSUE_RAISED: "#dc2626", ISSUE_STATUS: "#d97706",
  WORKFLOW_STARTED: "#154f91", WORKFLOW_STEP_COMPLETED: "#4d7c0f", WORKFLOW_COMPLETED: "#4d7c0f",
  SYNC: "#9ca3af", SYNC_CONFLICT: "#dc2626",
  EXPORT: "#6b7280", DOC_AUTO_APPROVED: "#4d7c0f",
};

export default function AuditPage() {
  const routeParams = useParams();
  const projectId = routeParams.projectId as string;

  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");
  const [todayCount, setTodayCount] = useState(0);

  const loadEvents = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const qp = new URLSearchParams({ page: String(page), limit: "100" });
    if (filterType) qp.set("entityType", filterType);
    if (search) qp.set("search", search);

    const res = await fetch(`/api/cde/audit?${qp}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) { const d = await res.json(); setEvents(d.events); setTotal(d.total); }
  }, [page, filterType, search]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodayCount(events.filter((e) => e.created_at?.startsWith(today)).length);
  }, [events]);

  async function handleExport() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const qp = new URLSearchParams();
    if (filterType) qp.set("entityType", filterType);
    window.open(`/api/cde/audit/export?${qp}`, "_blank");
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AuditSubHeader totalEvents={total} todayCount={todayCount} immutable={true} />

      {/* Toolbar */}
      <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 12px", gap: 6, borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
        <select style={toolSel} value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="document">Documents</option>
          <option value="mail">Mail</option>
          <option value="issue">Issues</option>
          <option value="workflow">Workflows</option>
          <option value="system">System</option>
        </select>
        <input style={{ ...toolSel, width: 180 }} placeholder="Search events..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <button onClick={loadEvents} style={toolBtn}>Refresh</button>
        <div style={{ flex: 1 }} />
        <button onClick={handleExport} style={{ ...toolBtn, background: "#154f91", color: "#fff", borderColor: "#154f91" }}>Export CSV</button>
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Timestamp</th>
              <th style={thStyle}>Event</th>
              <th style={thStyle}>Entity</th>
              <th style={thStyle}>Reference</th>
              <th style={thStyle}>User</th>
              <th style={{ ...thStyle, borderRight: "none" }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td style={tdStyle}>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: "#9ca3af" }}>
                    {new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{" "}
                    {new Date(e.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontSize: 9, fontWeight: 600, color: EVENT_COLORS[e.event_type] || "#9ca3af", background: "#eef0f4", padding: "1px 5px", borderRadius: 3 }}>
                    {e.event_type}
                  </span>
                </td>
                <td style={tdStyle}><span style={{ fontSize: 10, color: "#4b5563" }}>{e.entity_type}</span></td>
                <td style={tdStyle}><span style={{ fontFamily: MONO, fontSize: 10, color: "#154f91", fontWeight: 500 }}>{e.entity_ref || "—"}</span></td>
                <td style={tdStyle}><span style={{ fontSize: 10, color: "#4b5563" }}>{e.user_name || "System"}</span></td>
                <td style={{ ...tdStyle, borderRight: "none", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>{e.detail || "—"}</span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", padding: 40, color: "#9ca3af", borderRight: "none" }}>No audit events</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderTop: "1px solid #e5e7eb", background: "#f8f9fb", flexShrink: 0, fontSize: 10, color: "#9ca3af" }}>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ ...pgBtn, opacity: page <= 1 ? 0.4 : 1 }}>‹ Prev</button>
        <span>Page {page} of {Math.ceil(total / 100) || 1}</span>
        <button disabled={page >= Math.ceil(total / 100)} onClick={() => setPage(page + 1)} style={{ ...pgBtn, opacity: page >= Math.ceil(total / 100) ? 0.4 : 1 }}>Next ›</button>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { position: "sticky", top: 0, background: "#f8f9fb", padding: "5px 10px", textAlign: "left", fontWeight: 500, fontSize: "9.5px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #d1d5db", borderRight: "1px solid #e5e7eb", whiteSpace: "nowrap", zIndex: 5 };
const tdStyle: React.CSSProperties = { padding: "5px 10px", borderBottom: "1px solid #e5e7eb", borderRight: "1px solid rgba(229,231,235,.5)", fontSize: 11, color: "#4b5563", whiteSpace: "nowrap" };
const toolBtn: React.CSSProperties = { height: 24, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontSize: 10, fontWeight: 500, color: "#4b5563", cursor: "pointer", fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif" };
const toolSel: React.CSSProperties = { height: 24, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 6px", fontSize: 10, color: "#4b5563", background: "#fff", fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif" };
const pgBtn: React.CSSProperties = { border: "none", background: "transparent", fontSize: 10, color: "#154f91", cursor: "pointer", fontWeight: 500 };
