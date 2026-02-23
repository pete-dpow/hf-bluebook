"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/cde/picklists";

interface RaiseIssueModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

export default function RaiseIssueModal({ projectId, onClose, onCreated }: RaiseIssueModalProps) {
  const [issueType, setIssueType] = useState("FD-DEF");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [building, setBuilding] = useState("");
  const [level, setLevel] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cde/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectId, issueType, title, description, building, level, priority }),
      });
      if (res.ok) { onCreated(); onClose(); }
      else { const d = await res.json().catch(() => null); setError(d?.error || `Failed (${res.status})`); }
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Raise Issue</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>✕</button>
        </div>

        <div style={{ padding: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FW label="Type">
              <select style={fi} value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                {ISSUE_TYPES.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
              </select>
            </FW>
            <FW label="Priority">
              <select style={fi} value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => <option key={p.code} value={p.code}>{p.label}</option>)}
              </select>
            </FW>
          </div>
          <div style={{ marginTop: 10 }}><FW label="Title"><input style={fi} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Issue title" /></FW></div>
          <div style={{ marginTop: 10 }}><FW label="Description"><textarea style={{ ...fi, height: 80, padding: 8, resize: "vertical" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue..." /></FW></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <FW label="Building"><input style={fi} value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="e.g. Block A" /></FW>
            <FW label="Level"><input style={fi} value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Level 3" /></FW>
          </div>
        </div>

        {error && <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</div>}

        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button style={btn} onClick={onClose}>Cancel</button>
          <button style={{ ...btn, background: "#154f91", borderColor: "#154f91", color: "#fff", opacity: (submitting || !title) ? 0.5 : 1, cursor: (submitting || !title) ? "not-allowed" : "pointer" }} onClick={handleSubmit} disabled={submitting || !title}>
            {submitting ? "Raising..." : "Raise Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FW({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <label style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</label>
      {children}
    </div>
  );
}

const fi: React.CSSProperties = { height: 30, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 8px", fontFamily: FONT, fontSize: 11, color: "#111827", background: "#fff", width: "100%" };
const btn: React.CSSProperties = { height: 28, padding: "0 10px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontFamily: FONT, fontSize: "10.5px", fontWeight: 500, color: "#4b5563", cursor: "pointer" };
