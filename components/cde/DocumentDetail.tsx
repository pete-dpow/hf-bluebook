"use client";

// DocumentDetail — slide-out panel (matches v5 HTML .detail)

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "./StatusBadge";

const MONO = "'DM Mono',monospace";

interface DocumentDetailProps {
  documentId: string | null;
  onClose: () => void;
}

export default function DocumentDetail({ documentId, onClose }: DocumentDetailProps) {
  const [doc, setDoc] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "versions" | "audit">("details");

  useEffect(() => {
    if (documentId) {
      loadDocument();
      loadVersions();
      loadAudit();
      setActiveTab("details");
    }
  }, [documentId]);

  async function loadDocument() {
    const { data } = await supabase
      .from("cde_documents")
      .select("*")
      .eq("id", documentId)
      .single();
    setDoc(data);
  }

  async function loadVersions() {
    const { data } = await supabase
      .from("cde_document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });
    setVersions(data || []);
  }

  async function loadAudit() {
    const { data } = await supabase
      .from("cde_audit_log")
      .select("*")
      .eq("entity_id", documentId)
      .eq("entity_type", "document")
      .order("created_at", { ascending: false })
      .limit(20);
    setAuditEvents(data || []);
  }

  const isOpen = !!documentId;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 400,
        background: "#fff",
        borderLeft: "1px solid #d1d5db",
        zIndex: 200,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform .2s cubic-bezier(.16,1,.3,1)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-4px 0 16px rgba(0,0,0,.08)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #e5e7eb", background: "#f8f9fb" }}>
        <div style={{ fontSize: "12.5px", fontWeight: 500 }}>
          {doc?.doc_number || "—"}
        </div>
        <button
          onClick={onClose}
          style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", padding: "0 14px" }}>
        {(["details", "versions", "audit"] as const).map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "7px 10px",
              fontSize: 10,
              fontWeight: 500,
              color: activeTab === tab ? "#154f91" : "#9ca3af",
              cursor: "pointer",
              borderBottom: activeTab === tab ? "2px solid #154f91" : "2px solid transparent",
              textTransform: "capitalize",
            }}
          >
            {tab}
            {tab === "versions" && ` (${versions.length + 1})`}
            {tab === "audit" && ` (${auditEvents.length})`}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {activeTab === "details" && doc && (
          <DetailsTab doc={doc} />
        )}
        {activeTab === "versions" && doc && (
          <VersionsTab doc={doc} versions={versions} />
        )}
        {activeTab === "audit" && (
          <AuditTab events={auditEvents} />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 6 }}>
        <button style={{ ...footBtn }}>Download</button>
        <button style={{ ...footBtn }}>Edit</button>
        <button style={{ ...footBtn, background: "#154f91", borderColor: "#154f91", color: "#fff" }}>Supersede</button>
      </div>
    </div>
  );
}

function DetailsTab({ doc }: { doc: any }) {
  return (
    <>
      {/* File preview area */}
      <div style={{ background: "#f8f9fb", border: "1px solid #e5e7eb", borderRadius: 5, padding: 22, textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 26, marginBottom: 4 }}>&#128196;</div>
        <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: MONO }}>{doc.file_name || "—"}</div>
        <div style={{ fontSize: 9, color: "#d1d5db" }}>
          {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB` : "—"}
        </div>
      </div>

      {/* Status + type badges */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
        <StatusBadge status={doc.status} />
        <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 500, color: "#9ca3af", background: "#eef0f4", padding: "2px 6px", borderRadius: 3 }}>
          {doc.doc_type}
        </span>
        <span style={{ fontFamily: MONO, fontSize: "9.5px", color: "#9ca3af", background: "#eef0f4", padding: "2px 5px", borderRadius: 3 }}>
          V{doc.version} · Rev {doc.revision}
        </span>
      </div>

      {/* Fields */}
      <FieldLabel>Title</FieldLabel>
      <FieldValue>{doc.title}</FieldValue>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
        <div><FieldLabel>Building</FieldLabel><FieldValue>{doc.building || "—"}</FieldValue></div>
        <div><FieldLabel>Discipline</FieldLabel><FieldValue>{doc.discipline || "—"}</FieldValue></div>
        <div><FieldLabel>Uploaded</FieldLabel><FieldValue>{new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</FieldValue></div>
        <div><FieldLabel>Functional</FieldLabel><FieldValue>{doc.functional || "—"}</FieldValue></div>
        <div><FieldLabel>Spatial</FieldLabel><FieldValue>{doc.spatial || "—"}</FieldValue></div>
        <div><FieldLabel>Role</FieldLabel><FieldValue>{doc.role || "—"}</FieldValue></div>
      </div>

      {doc.sharepoint_url && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e5e7eb" }}>
          <FieldLabel>SharePoint</FieldLabel>
          <a href={doc.sharepoint_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#154f91", fontWeight: 500 }}>
            Open in SharePoint
          </a>
        </div>
      )}
    </>
  );
}

function VersionsTab({ doc, versions }: { doc: any; versions: any[] }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 5, overflow: "hidden" }}>
      {/* Current version */}
      <div style={{ padding: "10px 12px", background: "#edf3fa", borderBottom: "1px solid #e5e7eb" }}>
        <StatusBadge status="A" />
        <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 4 }}>
          V{doc.version} — Rev {doc.revision}
        </span>
        <span style={{ fontSize: 9, fontWeight: 500, marginLeft: 6, color: "#154f91" }}>CURRENT</span>
        <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
          {new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {doc.file_name}
        </div>
      </div>

      {/* Previous versions */}
      {versions.map((v) => (
        <div key={v.id} style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ display: "inline-flex", alignItems: "center", height: 17, padding: "0 5px", borderRadius: 3, fontSize: 9, fontWeight: 500, background: "#f3f4f6", color: "#6b7280" }}>
            SUPERSEDED
          </span>
          <span style={{ fontSize: 11, fontWeight: 500, color: "#9ca3af", marginLeft: 4 }}>
            V{v.version_number} — Rev {v.revision}
          </span>
          <div style={{ fontSize: 9, color: "#d1d5db", marginTop: 2 }}>
            {v.superseded_at ? new Date(v.superseded_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"} · {v.file_name}
          </div>
        </div>
      ))}

      {versions.length === 0 && (
        <div style={{ padding: "16px 12px", fontSize: 10, color: "#9ca3af", textAlign: "center" }}>
          No previous versions
        </div>
      )}
    </div>
  );
}

function AuditTab({ events }: { events: any[] }) {
  return (
    <div style={{ fontSize: "10.5px" }}>
      {events.map((e) => (
        <div key={e.id} style={{ padding: "5px 0", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: "#9ca3af" }}>
            {new Date(e.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
          {" · "}
          <strong style={{ fontWeight: 500 }}>{e.user_name || "System"}</strong>
          {" "}
          <span style={{ color: "#4b5563" }}>{e.event_type.toLowerCase()}</span>
          {e.detail && (
            <div style={{ fontSize: 9, color: "#d1d5db", marginTop: 1 }}>{e.detail}</div>
          )}
        </div>
      ))}
      {events.length === 0 && (
        <div style={{ textAlign: "center", padding: 20, color: "#9ca3af" }}>No audit events</div>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9, fontWeight: 500, color: "#d1d5db", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>{children}</div>;
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "11.5px", color: "#111827", marginBottom: 10 }}>{children}</div>;
}

const footBtn: React.CSSProperties = {
  flex: 1,
  justifyContent: "center",
  height: 30,
  display: "flex",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  background: "#fff",
  fontSize: "10.5px",
  fontWeight: 500,
  color: "#4b5563",
  cursor: "pointer",
  fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
};
