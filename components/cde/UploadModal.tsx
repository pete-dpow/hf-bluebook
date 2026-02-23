"use client";

// UploadModal — 7-field ISO 19650 upload form (matches v5 HTML .modal)

import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { DOC_TYPES, FUNCTIONAL_CODES, SPATIAL_CODES, ROLE_CODES, DOC_STATUSES } from "@/lib/cde/picklists";

interface UploadModalProps {
  projectId: string;
  projectCode: string;
  onClose: () => void;
  onUploaded: () => void;
}

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

export default function UploadModal({ projectId, projectCode, onClose, onUploaded }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("FRA");
  const [functional, setFunctional] = useState("GN");
  const [spatial, setSpatial] = useState("ZZ");
  const [role, setRole] = useState("S");
  const [status, setStatus] = useState("S0");
  const [discipline, setDiscipline] = useState("");
  const [building, setBuilding] = useState("");
  const [revision, setRevision] = useState("A");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live ISO number preview
  const previewNumber = `${projectCode}-HF-${functional}-${spatial}-${docType}-${role}-XXXX`;

  async function handleUpload() {
    if (!title || !docType) return;
    setUploading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("title", title);
      formData.append("docType", docType);
      formData.append("functional", functional);
      formData.append("spatial", spatial);
      formData.append("role", role);
      formData.append("status", status);
      formData.append("revision", revision);
      if (discipline) formData.append("discipline", discipline);
      if (building) formData.append("building", building);

      const res = await fetch("/api/cde/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData,
      });

      if (res.ok) {
        onUploaded();
        onClose();
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || `Upload failed (${res.status})`);
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          width: 500,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 8px 30px rgba(0,0,0,.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Upload Document</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#9ca3af" }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18 }}>
          {/* Drop zone */}
          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: 6,
              padding: 28,
              textAlign: "center",
              cursor: "pointer",
            }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#154f91"; e.currentTarget.style.background = "#edf3fa"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.background = ""; }}
          >
            <input
              ref={fileRef}
              type="file"
              style={{ display: "none" }}
              accept=".pdf,.dwg,.dxf,.xlsx,.docx,.rvt,.ifc,.jpg,.jpeg,.png"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setFile(f);
                  if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
            {file ? (
              <>
                <div style={{ fontSize: 11, color: "#111827", fontWeight: 500 }}>{file.name}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 24, marginBottom: 6 }}>&#128193;</div>
                <div style={{ fontSize: 11, color: "#4b5563" }}>Drag and drop files, or click to browse</div>
                <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>PDF, DWG, XLSX, DOCX, RVT, IFC, JPG, PNG</div>
              </>
            )}
          </div>

          {/* ISO number preview */}
          <div style={{ margin: "12px 0 6px", padding: "6px 10px", background: "#edf3fa", borderRadius: 4, fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#154f91", fontWeight: 500, textAlign: "center" }}>
            {previewNumber}
          </div>

          {/* Form grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <FieldWrap label="Type" full={false}>
              <select style={fiStyle} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t.code} value={t.code}>{t.code} — {t.label}</option>)}
              </select>
            </FieldWrap>
            <FieldWrap label="Revision">
              <input style={fiStyle} value={revision} onChange={(e) => setRevision(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Title" full>
              <input style={fiStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
            </FieldWrap>
            <FieldWrap label="Functional">
              <select style={fiStyle} value={functional} onChange={(e) => setFunctional(e.target.value)}>
                {FUNCTIONAL_CODES.map((f) => <option key={f.code} value={f.code}>{f.code} — {f.label}</option>)}
              </select>
            </FieldWrap>
            <FieldWrap label="Spatial">
              <select style={fiStyle} value={spatial} onChange={(e) => setSpatial(e.target.value)}>
                {SPATIAL_CODES.map((s) => <option key={s.code} value={s.code}>{s.code} — {s.label}</option>)}
              </select>
            </FieldWrap>
            <FieldWrap label="Role">
              <select style={fiStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLE_CODES.map((r) => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
              </select>
            </FieldWrap>
            <FieldWrap label="Status">
              <select style={fiStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
                {DOC_STATUSES.filter((s) => ["S0", "S1", "S3", "S4"].includes(s.code)).map((s) => (
                  <option key={s.code} value={s.code}>{s.code} — {s.label}</option>
                ))}
              </select>
            </FieldWrap>
            <FieldWrap label="Discipline">
              <input style={fiStyle} value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="e.g. Fire Doors" />
            </FieldWrap>
            <FieldWrap label="Building">
              <input style={fiStyle} value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="e.g. Block A" />
            </FieldWrap>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button style={btnStyle} onClick={onClose}>Cancel</button>
          <button
            style={{ ...btnStyle, background: "#154f91", borderColor: "#154f91", color: "#fff", opacity: (uploading || !title) ? 0.5 : 1, cursor: (uploading || !title) ? "not-allowed" : "pointer" }}
            onClick={handleUpload}
            disabled={uploading || !title}
          >
            {uploading ? "Uploading..." : "Upload & Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldWrap({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, ...(full ? { gridColumn: "1/-1" } : {}) }}>
      <label style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const fiStyle: React.CSSProperties = {
  height: 30,
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  padding: "0 8px",
  fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
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
  fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
  fontSize: "10.5px",
  fontWeight: 500,
  color: "#4b5563",
  cursor: "pointer",
};
