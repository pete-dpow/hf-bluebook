"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { PROJECT_STATUSES } from "@/lib/cde/picklists";

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/cde/projects", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) { const d = await res.json(); setProjects(d.projects); }
    setLoading(false);
  }

  function startEdit(p: any) {
    setEditId(p.id);
    setEditName(p.name);
    setEditStatus(p.status);
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/cde/projects/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ name: editName, status: editStatus }),
    });
    setEditId(null);
    setSaving(false);
    loadProjects();
  }

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 12, color: "#9ca3af" }}>Loading...</div></div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em" }}>Admin — Project Management</div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb" }}>
          <thead>
            <tr>
              {["Project", "Code", "Client", "Status", "Start Date", "Created", ""].map((h) => (
                <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", borderBottom: "1px solid #d1d5db", background: "#f8f9fb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const isEditing = editId === p.id;
              const statusInfo = PROJECT_STATUSES.find((s) => s.code === p.status);
              return (
                <tr key={p.id}>
                  <td style={td}>{isEditing ? <input style={fi} value={editName} onChange={(e) => setEditName(e.target.value)} /> : <span style={{ fontWeight: 500 }}>{p.name}</span>}</td>
                  <td style={td}><span style={{ fontFamily: MONO, fontSize: 10 }}>{p.project_code}</span></td>
                  <td style={td}>{p.cde_clients?.name || "—"}</td>
                  <td style={td}>
                    {isEditing ? (
                      <select style={fi} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                        {PROJECT_STATUSES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: statusInfo?.color ? `${statusInfo.color}18` : "#f3f4f6", color: statusInfo?.color || "#9ca3af", fontWeight: 500 }}>{statusInfo?.label || p.status}</span>
                    )}
                  </td>
                  <td style={td}>{p.start_date ? <span style={{ fontFamily: MONO, fontSize: 10 }}>{new Date(p.start_date).toLocaleDateString("en-GB")}</span> : "—"}</td>
                  <td style={td}><span style={{ fontFamily: MONO, fontSize: 10 }}>{new Date(p.created_at).toLocaleDateString("en-GB")}</span></td>
                  <td style={td}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={saveEdit} disabled={saving} style={{ ...smallBtn, background: "#154f91", color: "#fff" }}>{saving ? "..." : "Save"}</button>
                        <button onClick={() => setEditId(null)} style={smallBtn}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => startEdit(p)} style={smallBtn}>Edit</button>
                        <button onClick={() => router.push(`/cde/${p.id}/documents`)} style={smallBtn}>Open</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {projects.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 12 }}>No projects</div>}
      </div>
    </div>
  );
}

const td: React.CSSProperties = { padding: "6px 12px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#4b5563" };
const fi: React.CSSProperties = { height: 26, border: "1px solid #e5e7eb", borderRadius: 3, padding: "0 6px", fontFamily: "'Futura PT',system-ui,sans-serif", fontSize: 11, color: "#111827" };
const smallBtn: React.CSSProperties = { height: 22, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 3, background: "#fff", fontSize: 9, fontWeight: 500, color: "#4b5563", cursor: "pointer", fontFamily: "'Futura PT',system-ui,sans-serif" };
