"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PROJECT_STATUSES } from "@/lib/cde/picklists";

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";

export default function ClientDetailPage() {
  const routeParams = useParams();
  const router = useRouter();
  const clientId = routeParams.clientId as string;

  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [stats, setStats] = useState({ documents: 0, openIssues: 0, residents: 0, projects: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);

  useEffect(() => { loadClient(); }, [clientId]);

  async function loadClient() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`/api/cde/clients/${clientId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) {
      const d = await res.json();
      setClient(d.client);
      setProjects(d.projects);
      setResidents(d.residents);
      setVisits(d.visits);
      setStats(d.stats);
    }
    setLoading(false);
  }

  if (loading) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 12, color: "#9ca3af" }}>Loading client...</div></div>;
  if (!client) return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ fontSize: 12, color: "#dc2626" }}>Client not found</div></div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Sub-header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => router.push("/cde/clients")} style={{ background: "none", border: "none", fontSize: 11, color: "#154f91", cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>← Customers</button>
          <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />
          <div style={{ fontSize: 15, fontWeight: 500, color: "#111827" }}>{client.name}</div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: MONO }}>{client.short_code}</div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", display: "flex", alignItems: "center", height: 54, gap: 0, flexShrink: 0 }}>
        <Block label="Projects" value={String(stats.projects)} color="#154f91" />
        <Sep />
        <Block label="Documents" value={String(stats.documents)} color="#0d9488" />
        <Sep />
        <Block label="Open Issues" value={String(stats.openIssues)} color="#dc2626" />
        <Sep />
        <Block label="Residents" value={String(stats.residents)} color="#4d7c0f" />
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Projects */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#111827" }}>Projects</div>
              <button onClick={() => setShowCreateProject(true)} style={{ fontSize: 10, padding: "2px 8px", background: "#154f91", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>+ New</button>
            </div>
            <div style={{ padding: projects.length ? 0 : 20 }}>
              {projects.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11 }}>No projects</div>
              ) : projects.map((p) => {
                const statusInfo = PROJECT_STATUSES.find((s) => s.code === p.status);
                return (
                  <div key={p.id} onClick={() => router.push(`/cde/${p.id}/documents`)} style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: MONO, marginTop: 1 }}>{p.project_code}</div>
                    </div>
                    <div style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: statusInfo?.color ? `${statusInfo.color}18` : "#f3f4f6", color: statusInfo?.color || "#9ca3af", fontWeight: 500 }}>
                      {statusInfo?.label || p.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Residents */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#111827" }}>Residents</div>
              <div style={{ fontSize: 10, color: "#4d7c0f", fontWeight: 500 }}>{residents.length} registered</div>
            </div>
            <div style={{ padding: residents.length ? 0 : 20 }}>
              {residents.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11 }}>No residents</div>
              ) : (
                <div>
                  {residents.slice(0, 8).map((r) => (
                    <div key={r.id} style={{ padding: "6px 14px", borderBottom: "1px solid #f3f4f6", fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#111827" }}>{r.first_name} {r.last_name}</span>
                      <span style={{ color: "#9ca3af", fontSize: 10 }}>{r.building || ""} {r.flat_ref || ""}</span>
                    </div>
                  ))}
                  {residents.length > 8 && <div style={{ padding: "6px 14px", fontSize: 10, color: "#9ca3af" }}>+{residents.length - 8} more</div>}
                </div>
              )}
            </div>
          </div>

          {/* Recent Visits */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, gridColumn: "1 / -1" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontSize: 11, fontWeight: 500, color: "#111827" }}>Recent Visits</div>
            <div style={{ padding: visits.length ? 0 : 20 }}>
              {visits.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11 }}>No visits</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Date", "Type", "Buildings", "Lead", "Access"].map((h) => (
                        <th key={h} style={{ padding: "5px 14px", textAlign: "left", fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", borderBottom: "1px solid #d1d5db", background: "#f8f9fb" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => (
                      <tr key={v.id}>
                        <td style={td}><span style={{ fontFamily: MONO, fontSize: 10 }}>{new Date(v.visit_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span></td>
                        <td style={td}>{v.visit_type}</td>
                        <td style={td}>{v.buildings?.join(", ") || "—"}</td>
                        <td style={td}>{v.lead_surveyor || "—"}</td>
                        <td style={td}>{v.flat_access_required ? "Required" : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCreateProject && <CreateProjectModal clientId={clientId} onClose={() => setShowCreateProject(false)} onCreated={() => { setShowCreateProject(false); loadClient(); }} />}
    </div>
  );
}

function CreateProjectModal({ clientId, onClose, onCreated }: { clientId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name || !code) return;
    setSubmitting(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/cde/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ clientId, name, projectCode: code, startDate: startDate || undefined }),
    });
    if (res.ok) { onCreated(); }
    else { const d = await res.json().catch(() => null); setError(d?.error || "Failed"); }
    setSubmitting(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 8, width: 420, boxShadow: "0 8px 30px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>New Project</div>
          <button onClick={onClose} style={{ width: 24, height: 24, borderRadius: 4, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 11, color: "#9ca3af" }}>✕</button>
        </div>
        <div style={{ padding: 18, display: "grid", gap: 10 }}>
          <FW label="Project Name"><input style={fi} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Camden Tower Block A" /></FW>
          <FW label="Project Code"><input style={fi} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. CAM-TBA" maxLength={20} /></FW>
          <FW label="Start Date"><input style={fi} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></FW>
        </div>
        {error && <div style={{ padding: "0 18px 8px", fontSize: 11, color: "#dc2626", fontWeight: 500 }}>{error}</div>}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: 6 }}>
          <button style={btn} onClick={onClose}>Cancel</button>
          <button style={{ ...btn, background: "#154f91", borderColor: "#154f91", color: "#fff" }} onClick={handleSubmit} disabled={submitting || !name || !code}>
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Block({ label, value, color }: { label: string; value: string; color: string }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 12px" }}>
    <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 500, color, letterSpacing: "-.01em", lineHeight: 1.1, fontFamily: "'DM Mono',monospace" }}>{value}</div>
  </div>);
}

function Sep() { return <div style={{ width: 1, height: 34, background: "#e5e7eb", flexShrink: 0 }} />; }

function FW({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 2 }}><label style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</label>{children}</div>);
}

const FONT_VAL = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const fi: React.CSSProperties = { height: 30, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 8px", fontFamily: FONT_VAL, fontSize: 11, color: "#111827", background: "#fff", width: "100%" };
const btn: React.CSSProperties = { height: 28, padding: "0 10px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontFamily: FONT_VAL, fontSize: "10.5px", fontWeight: 500, color: "#4b5563", cursor: "pointer" };
const td: React.CSSProperties = { padding: "5px 14px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#4b5563" };
