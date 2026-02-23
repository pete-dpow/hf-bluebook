"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isOverdue, formatDueLabel } from "@/lib/cde/mail-utils";

const MONO = "'DM Mono',monospace";
const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

interface MailDetailProps {
  mailId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export default function MailDetail({ mailId, onClose, onUpdated }: MailDetailProps) {
  const [mail, setMail] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [responseText, setResponseText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!mailId) { setMail(null); setResponses([]); return; }
    loadMail();
    loadResponses();
  }, [mailId]);

  async function loadMail() {
    const { data } = await supabase.from("cde_mail").select("*").eq("id", mailId).single();
    setMail(data);
  }

  async function loadResponses() {
    const { data } = await supabase
      .from("cde_mail_responses")
      .select("*")
      .eq("mail_id", mailId)
      .order("created_at", { ascending: true });
    setResponses(data || []);
  }

  async function handleRespond() {
    if (!responseText.trim()) return;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/cde/mail/${mailId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ responseBody: responseText }),
    });
    setSending(false);
    if (res.ok) {
      setResponseText("");
      loadMail();
      loadResponses();
      onUpdated();
    }
  }

  async function handleClose() {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/cde/mail/${mailId}/close`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      loadMail();
      onUpdated();
    }
  }

  const isOpen = !!mailId;
  const overdue = mail ? isOverdue(mail.due_date, mail.status) : false;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "#fff",
      borderLeft: "1px solid #d1d5db", zIndex: 200,
      transform: isOpen ? "translateX(0)" : "translateX(100%)",
      transition: "transform .2s cubic-bezier(.16,1,.3,1)",
      display: "flex", flexDirection: "column",
      boxShadow: "-4px 0 16px rgba(0,0,0,.08)",
      pointerEvents: isOpen ? "auto" : "none",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#f8f9fb" }}>
        <div>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, color: "#154f91" }}>{mail?.mail_number}</span>
          <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 6 }}>{mail?.mail_type}</span>
        </div>
        <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {mail && (
          <>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", marginBottom: 8 }}>{mail.subject}</div>

            <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
              <StatusPill status={mail.status} overdue={overdue} />
              <PriorityPill priority={mail.priority} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: "#9ca3af", background: "#eef0f4", padding: "2px 6px", borderRadius: 3 }}>
                {formatDueLabel(mail.due_date, mail.status)}
              </span>
            </div>

            {mail.body && (
              <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5, padding: 10, background: "#f8f9fb", borderRadius: 5, border: "1px solid #e5e7eb", marginBottom: 12 }}>
                {mail.body}
              </div>
            )}

            <div style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
              Responses ({responses.length})
            </div>

            {responses.map((r) => (
              <div key={r.id} style={{ padding: "8px 10px", background: "#f8f9fb", border: "1px solid #e5e7eb", borderRadius: 5, marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: "#9ca3af", marginBottom: 4 }}>
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ fontSize: 11, color: "#111827", lineHeight: 1.5 }}>{r.response_body}</div>
              </div>
            ))}

            {responses.length === 0 && mail.status !== "CLOSED" && (
              <div style={{ textAlign: "center", padding: 16, color: "#9ca3af", fontSize: 10 }}>No responses yet</div>
            )}
          </>
        )}
      </div>

      {/* Reply + actions */}
      {mail && mail.status !== "CLOSED" && (
        <div style={{ padding: 14, borderTop: "1px solid #e5e7eb" }}>
          <textarea
            style={{ width: "100%", height: 60, border: "1px solid #e5e7eb", borderRadius: 4, padding: 8, fontFamily: FONT, fontSize: 11, resize: "none", marginBottom: 6 }}
            placeholder="Type a response..."
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...footBtn }} onClick={handleClose}>Close</button>
            <button
              style={{ ...footBtn, background: "#154f91", borderColor: "#154f91", color: "#fff" }}
              onClick={handleRespond}
              disabled={sending || !responseText.trim()}
            >
              {sending ? "Sending..." : "Respond"}
            </button>
          </div>
        </div>
      )}
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
  return (
    <span style={{ fontSize: 9, fontWeight: 600, color: c.color, background: c.bg, padding: "2px 6px", borderRadius: 3 }}>
      {overdue ? "OVERDUE" : status}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const colors: Record<string, string> = { CRITICAL: "#dc2626", HIGH: "#ea580c", MEDIUM: "#d97706", LOW: "#9ca3af" };
  return (
    <span style={{ fontSize: 9, fontWeight: 500, color: colors[priority] || "#9ca3af", background: "#eef0f4", padding: "2px 6px", borderRadius: 3 }}>
      {priority}
    </span>
  );
}

const footBtn: React.CSSProperties = {
  flex: 1, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
  border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff",
  fontSize: "10.5px", fontWeight: 500, color: "#4b5563", cursor: "pointer",
  fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
};
