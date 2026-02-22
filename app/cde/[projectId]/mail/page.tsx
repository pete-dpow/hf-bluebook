"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isOverdue } from "@/lib/cde/mail-utils";
import MailSubHeader from "@/components/cde/MailSubHeader";
import MailDetail from "@/components/cde/MailDetail";
import NewMailModal from "@/components/cde/NewMailModal";

const MONO = "'DM Mono',monospace";

export default function MailPage() {
  const routeParams = useParams();
  const projectId = routeParams.projectId as string;

  const [mail, setMail] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("sent_at");
  const [sortDir, setSortDir] = useState("desc");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const loadMail = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const queryParams = new URLSearchParams({ projectId, page: String(page), limit: "50", sortBy, sortDir });
    if (filterType) queryParams.set("mailType", filterType);
    if (filterStatus) queryParams.set("status", filterStatus);
    if (search) queryParams.set("search", search);

    const res = await fetch(`/api/cde/mail?${queryParams}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMail(data.mail);
      setTotal(data.total);
    }
  }, [projectId, page, sortBy, sortDir, filterType, filterStatus, search]);

  useEffect(() => { loadMail(); }, [loadMail]);

  // Compute sub-header stats
  const open = mail.filter((m) => m.status === "OPEN").length;
  const responded = mail.filter((m) => m.status === "RESPONDED").length;
  const overdue = mail.filter((m) => isOverdue(m.due_date, m.status)).length;
  const closed = mail.filter((m) => m.status === "CLOSED").length;

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
    borderRight: "1px solid rgba(229,231,235,.5)",
    fontSize: 11, color: "#4b5563", whiteSpace: "nowrap",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <MailSubHeader total={total} open={open} responded={responded} overdue={overdue} closed={closed} avgResponseDays={0} />

      {/* Toolbar */}
      <div style={{
        height: 36, display: "flex", alignItems: "center", padding: "0 12px", gap: 6,
        borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0,
      }}>
        <button onClick={() => setShowNew(true)} style={toolBtn}>+ New</button>
        <select style={toolSelect} value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="RFI">RFI</option>
          <option value="SI">SI</option>
          <option value="QRY">QRY</option>
        </select>
        <select style={toolSelect} value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="RESPONDED">Responded</option>
          <option value="CLOSED">Closed</option>
        </select>
        <input
          style={{ ...toolSelect, width: 160 }}
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <button onClick={loadMail} style={toolBtn}>Refresh</button>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort("mail_number")}>Number</th>
              <th style={thStyle} onClick={() => handleSort("mail_type")}>Type</th>
              <th style={thStyle} onClick={() => handleSort("subject")}>Subject</th>
              <th style={thStyle} onClick={() => handleSort("priority")}>Priority</th>
              <th style={thStyle} onClick={() => handleSort("status")}>Status</th>
              <th style={thStyle} onClick={() => handleSort("due_date")}>Due</th>
              <th style={{ ...thStyle, borderRight: "none" }} onClick={() => handleSort("sent_at")}>Sent</th>
            </tr>
          </thead>
          <tbody>
            {mail.map((m) => {
              const od = isOverdue(m.due_date, m.status);
              return (
                <tr key={m.id} onClick={() => setDetailId(m.id)} style={{ cursor: "pointer", background: od ? "#fef2f2" : undefined }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = od ? "#fee2e2" : "#f0f4ff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = od ? "#fef2f2" : ""; }}
                >
                  <td style={tdStyle}><span style={{ fontFamily: MONO, fontSize: 10, color: "#154f91", fontWeight: 500 }}>{m.mail_number}</span></td>
                  <td style={tdStyle}><span style={{ fontFamily: MONO, fontSize: 9, background: "#eef0f4", padding: "1px 5px", borderRadius: 3, color: "#9ca3af", fontWeight: 500 }}>{m.mail_type}</span></td>
                  <td style={{ ...tdStyle, color: "#111827", fontWeight: 500, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{m.subject}</td>
                  <td style={tdStyle}><PriorityDot priority={m.priority} /></td>
                  <td style={tdStyle}><StatusPill status={m.status} overdue={od} /></td>
                  <td style={tdStyle}><span style={{ fontFamily: MONO, fontSize: "9.5px", color: od ? "#dc2626" : "#9ca3af" }}>{m.due_date ? new Date(m.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</span></td>
                  <td style={{ ...tdStyle, borderRight: "none" }}><span style={{ fontFamily: MONO, fontSize: "9.5px", color: "#9ca3af" }}>{new Date(m.sent_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span></td>
                </tr>
              );
            })}
            {mail.length === 0 && (
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: "center", padding: 40, color: "#9ca3af", borderRight: "none" }}>No correspondence found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail */}
      <MailDetail mailId={detailId} onClose={() => setDetailId(null)} onUpdated={loadMail} />

      {/* New modal */}
      {showNew && <NewMailModal projectId={projectId} onClose={() => setShowNew(false)} onCreated={loadMail} />}
    </div>
  );
}

function StatusPill({ status, overdue }: { status: string; overdue: boolean }) {
  const colors: Record<string, { bg: string; color: string }> = {
    OPEN: { bg: overdue ? "#fef2f2" : "#fffbeb", color: overdue ? "#dc2626" : "#d97706" },
    RESPONDED: { bg: "#f0fdf4", color: "#4d7c0f" },
    CLOSED: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const c = colors[status] || colors.OPEN;
  return <span style={{ fontSize: 9, fontWeight: 600, color: c.color, background: c.bg, padding: "2px 6px", borderRadius: 3 }}>{overdue ? "OVERDUE" : status}</span>;
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#d97706", LOW: "#9ca3af" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "9.5px", color: colors[priority] || "#9ca3af" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[priority] || "#9ca3af" }} />
      {priority}
    </span>
  );
}

const toolBtn: React.CSSProperties = {
  height: 24, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 4,
  background: "#fff", fontSize: 10, fontWeight: 500, color: "#4b5563", cursor: "pointer",
  fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
};

const toolSelect: React.CSSProperties = {
  height: 24, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 6px",
  fontSize: 10, color: "#4b5563", background: "#fff",
  fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
};
