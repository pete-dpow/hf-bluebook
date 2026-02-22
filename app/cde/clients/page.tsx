"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/cde/clients", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) { const d = await res.json(); setClients(d.clients); }
    setLoading(false);
  }

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 12, color: "#9ca3af" }}>Loading clients...</div></div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Sub-header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", display: "flex", alignItems: "center", height: 44, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em" }}>Customer Portfolio</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setShowCreate(true)} style={{ height: 26, padding: "0 10px", background: "#154f91", color: "#fff", border: "none", borderRadius: 4, fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: FONT }}>+ New Client</button>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {clients.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 12 }}>No clients yet. Create your first client to get started.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {clients.map((c) => {
              const projects = c.cde_projects || [];
              const activeProjects = projects.filter((p: any) => p.status === "active");
              return (
                <div key={c.id} onClick={() => router.push(`/cde/clients/${c.id}`)} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: 16, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: MONO, marginTop: 2 }}>{c.short_code}</div>
                    </div>
                    <div style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#edf3fa", color: "#154f91", fontWeight: 500 }}>
                      {projects.length} project{projects.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {activeProjects.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                      {activeProjects.slice(0, 3).map((p: any) => (
                        <div key={p.id} style={{ fontSize: 10, color: "#4b5563", display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4d7c0f", flexShrink: 0 }} />
                          {p.name} <span style={{ color: "#9ca3af", fontFamily: MONO }}>{p.project_code}</span>
                        </div>
                      ))}
                      {activeProjects.length > 3 && <div style={{ fontSize: 9, color: "#9ca3af" }}>+{activeProjects.length - 3} more</div>}
                    </div>
                  )}
                  <div style={{ marginTop: 10, fontSize: 9, color: "#9ca3af" }}>
                    Created {new Date(c.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <CreateClientModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadClients(); }} />}
    </div>
  );
}

function CreateClientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [spLib, setSpLib] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name || !shortCode) return;
    setSubmitting(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/cde/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ name, shortCode, sharepointLibraryName: spLib || undefined }),
    });
    if (res.ok) { onCreated(); }
    else { const d = await res.json().catch(() => null); setError(d?.error || "Failed"); }
    setSubmitting(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: 420, boxShadow: "0 8px 30px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>New Client</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 11, color: "#9ca3af" }}>✕</button>
        </div>
        <div style={{ padding: 18, display: "grid", gap: 10 }}>
          <FW label="Client Name"><input style={fi} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. London Borough of Camden" /></FW>
          <FW label="Short Code"><input style={fi} value={shortCode} onChange={(e) => setShortCode(e.target.value.toUpperCase())} placeholder="e.g. LBC" maxLength={10} /></FW>
          <FW label="SharePoint Library Name (optional)"><input style={fi} value={spLib} onChange={(e) => setSpLib(e.target.value)} placeholder="CDE-LBC" /></FW>
        </div>
        {error && <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</div>}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button style={btn} onClick={onClose}>Cancel</button>
          <button style={{ ...btn, background: "#154f91", borderColor: "#154f91", color: "#fff" }} onClick={handleSubmit} disabled={submitting || !name || !shortCode}>
            {submitting ? "Creating..." : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FW({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 2 }}><label style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</label>{children}</div>);
}

const FONT_VAL = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const fi: React.CSSProperties = { height: 30, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 8px", fontFamily: FONT_VAL, fontSize: 11, color: "#111827", background: "#fff", width: "100%" };
const btn: React.CSSProperties = { height: 28, padding: "0 10px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontFamily: FONT_VAL, fontSize: "10.5px", fontWeight: 500, color: "#4b5563", cursor: "pointer" };
