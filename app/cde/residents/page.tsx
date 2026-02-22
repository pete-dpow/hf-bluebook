"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ScheduleVisitModal from "@/components/cde/ScheduleVisitModal";

const MONO = "'DM Mono',monospace";
const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

type Tab = "visits" | "residents" | "notifications" | "access";

export default function ResidentsStaffPage() {
  const [activeTab, setActiveTab] = useState<Tab>("visits");
  const [visits, setVisits] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [notifLog, setNotifLog] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [projectId, setProjectId] = useState<string>("");

  // Load first available project for now
  useEffect(() => {
    async function init() {
      const { data } = await supabase.from("cde_projects").select("id").limit(1).single();
      if (data) setProjectId(data.id);
    }
    init();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    loadAll();
  }, [projectId]);

  async function loadAll() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [vRes, rRes] = await Promise.all([
      fetch(`/api/cde/visits?projectId=${projectId}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
      fetch(`/api/cde/residents?projectId=${projectId}`, { headers: { Authorization: `Bearer ${session.access_token}` } }),
    ]);

    if (vRes.ok) { const d = await vRes.json(); setVisits(d.visits); }
    if (rRes.ok) { const d = await rRes.json(); setResidents(d.residents); }

    // Load notif log
    const { data: nData } = await supabase.from("cde_notifications_log").select("*").order("sent_at", { ascending: false }).limit(50);
    setNotifLog(nData || []);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "visits", label: "Visits" },
    { key: "residents", label: `Residents (${residents.length})` },
    { key: "notifications", label: "Notifications" },
    { key: "access", label: "Access" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Sub-header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px", display: "flex", alignItems: "center", flexShrink: 0, height: 54, gap: 0 }}>
        <Block label="Residents" value={String(residents.length)} color="#4d7c0f" />
        <Sep />
        <Block label="Visits" value={String(visits.length)} color="#154f91" />
        <Sep />
        <Block label="Upcoming" value={String(visits.filter((v) => new Date(v.visit_date) >= new Date()).length)} color="#d97706" />
      </div>

      {/* Tabs + toolbar */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0, padding: "0 12px" }}>
        {tabs.map((t) => (
          <div key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: "8px 12px", fontSize: 10, fontWeight: 500, cursor: "pointer",
            color: activeTab === t.key ? "#4d7c0f" : "#9ca3af",
            borderBottom: activeTab === t.key ? "2px solid #4d7c0f" : "2px solid transparent",
          }}>{t.label}</div>
        ))}
        <div style={{ flex: 1 }} />
        {activeTab === "visits" && (
          <button onClick={() => setShowSchedule(true)} style={{ ...toolBtn, background: "#4d7c0f", color: "#fff", borderColor: "#4d7c0f" }}>+ Schedule Visit</button>
        )}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {activeTab === "visits" && <VisitsTab visits={visits} />}
        {activeTab === "residents" && <ResidentsTab residents={residents} />}
        {activeTab === "notifications" && <NotifTab log={notifLog} />}
        {activeTab === "access" && <AccessTab residents={residents} />}
      </div>

      {showSchedule && projectId && (
        <ScheduleVisitModal projectId={projectId} onClose={() => setShowSchedule(false)} onCreated={loadAll} />
      )}
    </div>
  );
}

function VisitsTab({ visits }: { visits: any[] }) {
  if (visits.length === 0) return <Empty text="No visits scheduled" />;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {visits.map((v) => (
        <div key={v.id} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 14, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{v.visit_type}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: "#4d7c0f", fontWeight: 500, marginTop: 2 }}>
                {new Date(v.visit_date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af" }}>
              {v.start_time || "TBC"} – {v.end_time || "TBC"}
            </div>
          </div>
          {v.buildings?.length > 0 && <div style={{ fontSize: 10, color: "#4b5563", marginTop: 4 }}>Buildings: {v.buildings.join(", ")}</div>}
          {v.lead_surveyor && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Lead: {v.lead_surveyor}</div>}
        </div>
      ))}
    </div>
  );
}

function ResidentsTab({ residents }: { residents: any[] }) {
  if (residents.length === 0) return <Empty text="No residents registered" />;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Name", "Building", "Flat", "Mobile", "Email", "SMS", "Email Opt"].map((h) => (
            <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontSize: "9.5px", fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", borderBottom: "1px solid #d1d5db", background: "#f8f9fb" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {residents.map((r) => (
          <tr key={r.id}>
            <td style={td}>{r.first_name} {r.last_name}</td>
            <td style={td}>{r.building || "—"}</td>
            <td style={td}>{r.flat_ref || "—"}</td>
            <td style={td}><span style={{ fontFamily: MONO, fontSize: 10 }}>{r.mobile || "—"}</span></td>
            <td style={td}><span style={{ fontSize: 10 }}>{r.email || "—"}</span></td>
            <td style={td}>{r.sms_opt_in ? "✓" : "—"}</td>
            <td style={td}>{r.email_opt_in ? "✓" : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NotifTab({ log }: { log: any[] }) {
  if (log.length === 0) return <Empty text="No notifications sent" />;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {log.map((n) => (
        <div key={n.id} style={{ border: "1px solid #e5e7eb", borderRadius: 5, padding: 10, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
            <span style={{ fontWeight: 500, color: "#111827" }}>{n.subject || "Notification"}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: "#9ca3af" }}>{new Date(n.sent_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
          </div>
          <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
            {n.channel} · {n.recipient_count} recipients
          </div>
        </div>
      ))}
    </div>
  );
}

function AccessTab({ residents }: { residents: any[] }) {
  const grouped = residents.reduce((acc: Record<string, any[]>, r) => {
    const b = r.building || "Unassigned";
    if (!acc[b]) acc[b] = [];
    acc[b].push(r);
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {Object.entries(grouped).map(([building, list]) => (
        <div key={building}>
          <div style={{ fontSize: 11, fontWeight: 500, color: "#111827", marginBottom: 4 }}>{building}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 6 }}>
            {(list as any[]).map((r) => (
              <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 4, padding: "6px 8px", background: "#fff", fontSize: 10 }}>
                <div style={{ fontWeight: 500, color: "#111827" }}>{r.first_name} {r.last_name}</div>
                <div style={{ color: "#9ca3af", fontSize: 9 }}>{r.flat_ref || "—"} · {r.availability_notes || "No availability info"}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(grouped).length === 0 && <Empty text="No residents" />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 12 }}>{text}</div>;
}

function Sep() { return <div style={{ width: 1, height: 34, background: "#e5e7eb", flexShrink: 0 }} />; }
function Block({ label, value, color }: { label: string; value: string; color: string }) {
  return (<div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 12px" }}>
    <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 500, color, letterSpacing: "-.01em", lineHeight: 1.1 }}>{value}</div>
  </div>);
}

const td: React.CSSProperties = { padding: "5px 8px", borderBottom: "1px solid #e5e7eb", fontSize: 11, color: "#4b5563" };
const toolBtn: React.CSSProperties = { height: 24, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontSize: 10, fontWeight: 500, color: "#4b5563", cursor: "pointer", fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif" };
