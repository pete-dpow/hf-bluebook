"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { WORKFLOW_TEMPLATES } from "@/lib/cde/workflow-templates";

interface StartWorkflowModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

export default function StartWorkflowModal({ projectId, onClose, onCreated }: StartWorkflowModalProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [workflowType, setWorkflowType] = useState(WORKFLOW_TEMPLATES[0].type);
  const [dueDays, setDueDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocs() {
      const { data } = await supabase
        .from("cde_documents")
        .select("id, doc_number, title, status")
        .eq("project_id", projectId)
        .in("status", ["S0", "S1"])
        .order("doc_number");
      setDocuments(data || []);
      if (data && data.length > 0) setDocumentId(data[0].id);
    }
    loadDocs();
  }, [projectId]);

  async function handleStart() {
    if (!documentId || !workflowType) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cde/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ projectId, documentId, workflowType, dueDays }),
      });
      if (res.ok) { onCreated(); onClose(); }
      else { const d = await res.json().catch(() => null); setError(d?.error || `Failed (${res.status})`); }
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  const template = WORKFLOW_TEMPLATES.find((t) => t.type === workflowType);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: 480, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 30px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Start Workflow</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>✕</button>
        </div>

        <div style={{ padding: 18 }}>
          <FW label="Document">
            <select style={fi} value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.doc_number} — {d.title}</option>)}
              {documents.length === 0 && <option value="">No eligible documents</option>}
            </select>
          </FW>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <FW label="Workflow Type">
              <select style={fi} value={workflowType} onChange={(e) => setWorkflowType(e.target.value)}>
                {WORKFLOW_TEMPLATES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
            </FW>
            <FW label="Due (days)">
              <input style={fi} type="number" value={dueDays} onChange={(e) => setDueDays(parseInt(e.target.value) || 14)} min={1} />
            </FW>
          </div>

          {template && (
            <div style={{ marginTop: 12, padding: 10, background: "#f8f9fb", borderRadius: 5, border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", marginBottom: 4 }}>Steps</div>
              {template.steps.map((s) => (
                <div key={s.step_number} style={{ fontSize: 10, color: "#4b5563", padding: "2px 0" }}>
                  <strong>{s.step_number}.</strong> {s.step_name} <span style={{ color: "#9ca3af" }}>({s.role_hint})</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</div>}

        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button style={btn} onClick={onClose}>Cancel</button>
          <button style={{ ...btn, background: "#154f91", borderColor: "#154f91", color: "#fff" }} onClick={handleStart} disabled={submitting || !documentId}>
            {submitting ? "Starting..." : "Start Workflow"}
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
