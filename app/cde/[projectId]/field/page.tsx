"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import FieldSubHeader from "@/components/cde/FieldSubHeader";
import IssueDetail from "@/components/cde/IssueDetail";
import RaiseIssueModal from "@/components/cde/RaiseIssueModal";
import PriorityBadge from "@/components/cde/PriorityBadge";

const MONO = "'DM Mono',monospace";

export default function FieldPage() {
  const routeParams = useParams();
  const projectId = routeParams.projectId as string;

  const [issues, setIssues] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("raised_at");
  const [sortDir, setSortDir] = useState("desc");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showRaise, setShowRaise] = useState(false);

  const loadIssues = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const qp = new URLSearchParams({ projectId, page: String(page), limit: "50", sortBy, sortDir });
    if (filterType) qp.set("issueType", filterType);
    if (filterStatus) qp.set("status", filterStatus);
    if (filterPriority) qp.set("priority", filterPriority);
    if (search) qp.set("search", search);

    const res = await fetch(`/api/cde/issues?${qp}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) { const d = await res.json(); setIssues(d.issues); setTotal(d.total); }
  }, [projectId, page, sortBy, sortDir, filterType, filterStatus, filterPriority, search]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const open = issues.filter((i) => i.status === "OPEN").length;
  const workDone = issues.filter((i) => i.status === "WORK_DONE").length;
  const inspect = issues.filter((i) => i.status === "INSPECT").length;
  const closed = issues.filter((i) => i.status === "CLOSED").length;
  const closeRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  function handleSort(col: string) {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
    setPage(1);
  }

  const thStyle: React.CSSProperties = {
    position: "sticky", top: 0, background: "#f8f9fb", padding: "5px 10px",
    textAlign: "left", fontWeight: 500, fontSize: "9.5px", color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: ".04em",
    borderBottom: "1px solid #d1d5db", borderRight: "1px solid #e5e7eb",
    cursor: "pointer", whiteSpace: "nowrap", zIndex: 5,
  };
  const tdStyle: React.CSSProperties = {
    padding: "5px 10px", borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid rgba(229,231,235,.5)", fontSize: 11, color: "#4b5563", whiteSpace: "nowrap",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <FieldSubHeader total={total} open={open} workDone={workDone} inspect={inspect} closed={closed} closeRate={closeRate} />

      {/* Toolbar */}
      <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 12px", gap: 6, borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
        <button onClick={() => setShowRaise(true)} style={toolBtn}>+ Raise Issue</button>
        <select style={toolSel} value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="FD-DEF">FD-DEF</option>
          <option value="FS-DEF">FS-DEF</option>
          <option value="CM-BRE">CM-BRE</option>
          <option value="DM-DEF">DM-DEF</option>
          <option value="SNG">SNG</option>
          <option value="NCN">NCN</option>
        </select>
        <select style={toolSel} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="WORK_DONE">Work Done</option>
          <option value="INSPECT">Inspect</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select style={toolSel} value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}>
          <option value="">All Priority</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <input style={{ ...toolSel, width: 140 }} placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <button onClick={loadIssues} style={toolBtn}>Refresh</button>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort("issue_number")}>Number</th>
              <th style={thStyle} onClick={() => handleSort("issue_type")}>Type</th>
              <th style={thStyle} onClick={() => handleSort("title")}>Title</th>
              <th style={thStyle} onClick={() => handleSort("priority")}>Priority</th>
              <th style={thStyle} onClick={() => handleSort("status")}>Status</th>
              <th style={thStyle} onClick={() => handleSort("building")}>Building</th>
              <th style={thStyle} onClick={() => handleSort("raised_at")}>Raised</th>
              <th style={{ ...thStyle, borderRight: "none" }} onClick={() => handleSort("due_date")}>Due</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.id} onClick={() => setDetailId(i.id)} style={{ cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f4ff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <td style={tdStyle}><span style={{ fontFamily: MONO, fontSize: 10, color: "#154f91", fontWeight: 500 }}>{i.issue_number}</span></td>
                <td style={tdStyle}><span style={{ fontFamily: MONO, fontSize: 9, background: "#eef0f4", padding: "1px 5px", borderRadius: 3, color: "#9ca3af", fontWeight: 500 }}>{i.issue_type}</span></td>
                <td style={{ ...tdStyle, color: "#111827", fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>{i.title}</td>
                <td style={tdStyle}><PriorityBadge priority={i.priority} /></td>
                <td style={tdStyle}><IssueStatusBadge status={i.status} /></td>
                <td style={tdStyle}>{i.building || "—"}</td>
                <td style={tdStyle}><span style={{ fontFamily: MONO, fontSize: "9.5px", color: "#9ca3af" }}>{new Date(i.raised_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></td>
                <td style={{ ...tdStyle, borderRight: "none" }}><span style={{ fontFamily: MONO, fontSize: "9.5px", color: "#9ca3af" }}>{i.due_date ? new Date(i.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</span></td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdStyle, textAlign: "center", padding: 40, color: "#9ca3af", borderRight: "none" }}>No issues found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <IssueDetail issueId={detailId} onClose={() => setDetailId(null)} onUpdated={loadIssues} />
      {showRaise && <RaiseIssueModal projectId={projectId} onClose={() => setShowRaise(false)} onCreated={loadIssues} />}
    </div>
  );
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

const toolBtn: React.CSSProperties = { height: 24, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontSize: 10, fontWeight: 500, color: "#4b5563", cursor: "pointer", fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif" };
const toolSel: React.CSSProperties = { height: 24, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 6px", fontSize: 10, color: "#4b5563", background: "#fff", fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif" };
