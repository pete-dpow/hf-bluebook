"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";

interface NewMailModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

export default function NewMailModal({ projectId, onClose, onCreated }: NewMailModalProps) {
  const [mailType, setMailType] = useState<"RFI" | "SI" | "QRY">("RFI");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!subject) return;
    setSending(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cde/mail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ projectId, mailType, subject, body, priority }),
      });

      if (res.ok) {
        onCreated();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Failed (${res.status})`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 8, width: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>New Correspondence</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>✕</button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FieldWrap label="Type">
              <select style={fiStyle} value={mailType} onChange={(e) => setMailType(e.target.value as any)}>
                <option value="RFI">RFI — Request for Information</option>
                <option value="SI">SI — Site Instruction</option>
                <option value="QRY">QRY — Query</option>
              </select>
            </FieldWrap>
            <FieldWrap label="Priority">
              <select style={fiStyle} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </FieldWrap>
          </div>

          <div style={{ marginTop: 10 }}>
            <FieldWrap label="Subject">
              <input style={fiStyle} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
            </FieldWrap>
          </div>

          <div style={{ marginTop: 10 }}>
            <FieldWrap label="Message">
              <textarea
                style={{ ...fiStyle, height: 100, padding: "8px", resize: "vertical" }}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the request or instruction..."
              />
            </FieldWrap>
          </div>
        </div>

        {error && (
          <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</div>
        )}

        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button style={btnStyle} onClick={onClose}>Cancel</button>
          <button
            style={{ ...btnStyle, background: "#154f91", borderColor: "#154f91", color: "#fff", opacity: (sending || !subject) ? 0.5 : 1, cursor: (sending || !subject) ? "not-allowed" : "pointer" }}
            onClick={handleSend}
            disabled={sending || !subject}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</label>
      {children}
    </div>
  );
}

const fiStyle: React.CSSProperties = {
  height: 30,
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  padding: "0 8px",
  fontFamily: FONT,
  fontSize: 11,
  color: "#111827",
  background: "#fff",
  width: "100%",
};

const btnStyle: React.CSSProperties = {
  height: 28,
  padding: "0 10px",
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  background: "#fff",
  fontFamily: FONT,
  fontSize: "10.5px",
  fontWeight: 500,
  color: "#4b5563",
  cursor: "pointer",
};
