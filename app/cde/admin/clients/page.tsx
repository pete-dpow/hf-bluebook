"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editSp, setEditSp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/cde/clients", { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) { const d = await res.json(); setClients(d.clients); }
    setLoading(false);
  }

  function startEdit(c: any) {
    setEditId(c.id);
    setEditName(c.name);
    setEditCode(c.short_code);
    setEditSp(c.sharepoint_library_name || "");
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/cde/clients/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ name: editName, short_code: editCode, sharepoint_library_name: editSp || null }),
    });
    setEditId(null);
    setSaving(false);
    loadClients();
  }

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 12, color: "#9ca3af" }}>Loading...</div></div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em" }}>Admin — Client Management</div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 6, border: "1px solid #e5e7eb" }}>
          <thead>
            <tr>
              {["Name", "Code", "SharePoint Library", "Projects", "Created", ""].map((h) => (
                <th key={h} style={{ padding: "6px 12px", textAlign: "left", fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", borderBottom: "1px solid #d1d5db", background: "#f8f9fb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const isEditing = editId === c.id;
              return (
                <tr key={c.id}>
                  <td style={td}>{isEditing ? <input style={fi} value={editName} onChange={(e) => setEditName(e.target.value)} /> : c.name}</td>
                  <td style={td}>{isEditing ? <input style={fi} value={editCode} onChange={(e) => setEditCode(e.target.value)} /> : <span style={{ fontFamily: MONO, fontSize: 10 }}>{c.short_code}</span>}</td>
                  <td style={td}>{isEditing ? <input style={fi} value={editSp} onChange={(e) => setEditSp(e.target.value)} /> : <span style={{ fontSize: 10, color: "#9ca3af" }}>{c.sharepoint_library_name || "—"}</span>}</td>
                  <td style={td}>{(c.cde_projects || []).length}</td>
                  <td style={td}><span style={{ fontFamily: MONO, fontSize: 10 }}>{new Date(c.created_at).toLocaleDateString("en-GB")}</span></td>
                  <td style={td}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={saveEdit} disabled={saving} style={{ ...smallBtn, background: "#154f91", color: "#fff" }}>{saving ? "..." : "Save"}</button>
                        <button onClick={() => setEditId(null)} style={smallBtn}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(c)} style={smallBtn}>Edit</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clients.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 12 }}>No clients</div>}
      </div>
    </div>
  );
}

const td: React.CSSProperties = { padding: "6px 12px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#4b5563" };
const fi: React.CSSProperties = { height: 26, border: "1px solid #e5e7eb", borderRadius: 3, padding: "0 6px", fontFamily: "'Futura PT',system-ui,sans-serif", fontSize: 11, color: "#111827", width: "100%" };
const smallBtn: React.CSSProperties = { height: 22, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 3, background: "#fff", fontSize: 9, fontWeight: 500, color: "#4b5563", cursor: "pointer", fontFamily: "'Futura PT',system-ui,sans-serif" };
