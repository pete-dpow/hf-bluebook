"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";

export default function CDEHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState({ docs: 0, issues: 0, overdue: 0, workflows: 0, mail: 0, residents: 0 });
  const [recentAudit, setRecentAudit] = useState<any[]>([]);
  const [mySteps, setMySteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);

      const [cRes, dRes, iRes, wRes, mRes, rRes, aRes, sRes] = await Promise.all([
        supabase.from("cde_clients").select("id, name, short_code, created_at").order("name"),
        supabase.from("cde_documents").select("id", { count: "exact", head: true }),
        supabase.from("cde_issues").select("id, status", { count: "exact", head: false }).in("status", ["open", "work_done", "ready_to_inspect"]),
        supabase.from("cde_workflows").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("cde_mail").select("id", { count: "exact", head: true }).in("status", ["outstanding", "overdue"]),
        supabase.from("cde_residents").select("id", { count: "exact", head: true }),
        supabase.from("cde_audit_log").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("cde_workflow_steps").select("*, cde_workflows(document_id, project_id, workflow_type)").eq("status", "active").limit(5),
      ]);

      setClients(cRes.data || []);
      setStats({
        docs: dRes.count || 0,
        issues: iRes.data?.length || 0,
        overdue: (mRes.count || 0),
        workflows: wRes.count || 0,
        mail: mRes.count || 0,
        residents: rRes.count || 0,
      });
      setRecentAudit(aRes.data || []);
      setMySteps(sRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const displayName = user?.email?.split("@")[0] || "User";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 12, color: "#9ca3af" }}>Loading dashboard...</div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      {/* Section label */}
      <div style={{ fontSize: 10, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
        Portfolio Overview
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 500, marginTop: 2 }}>
        {greeting}, {displayName}
      </h2>
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
        Harmony Fire Limited — Common Data Environment
      </p>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginTop: 18, marginBottom: 18 }}>
        {[
          { label: "Documents", value: String(stats.docs), color: "#154f91" },
          { label: "Open Issues", value: String(stats.issues), color: "#dc2626" },
          { label: "Open Mail", value: String(stats.mail), color: "#d97706" },
          { label: "Active Workflows", value: String(stats.workflows), color: "#7c3aed" },
          { label: "Residents", value: String(stats.residents), color: "#4d7c0f" },
          { label: "Clients", value: String(clients.length), color: "#0d9488" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".03em", marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: 20, fontWeight: 500, color: kpi.color, fontFamily: MONO }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: My Tasks + Clients */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* My Tasks */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontSize: 11, fontWeight: 500, color: "#111827" }}>My Active Tasks</div>
            <div style={{ padding: mySteps.length ? 0 : 20 }}>
              {mySteps.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11 }}>No active workflow steps assigned to you</div>
              ) : mySteps.map((s) => (
                <div key={s.id} style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#111827" }}>{s.step_name}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{s.cde_workflows?.workflow_type || "Workflow"}</div>
                  </div>
                  <div style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "#edf3fa", color: "#154f91", fontWeight: 500 }}>Active</div>
                </div>
              ))}
            </div>
          </div>

          {/* Client Portfolio */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#111827" }}>Client Portfolio</div>
              <button onClick={() => router.push("/cde/clients")} style={{ fontSize: 10, color: "#154f91", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>View All</button>
            </div>
            <div style={{ padding: clients.length ? 0 : 20 }}>
              {clients.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11 }}>No clients yet</div>
              ) : clients.map((c) => (
                <div key={c.id} onClick={() => router.push(`/cde/clients/${c.id}`)} style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#111827" }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af", fontFamily: MONO }}>{c.short_code}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(c.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid #e5e7eb", fontSize: 11, fontWeight: 500, color: "#111827" }}>Recent Activity</div>
          <div style={{ padding: recentAudit.length ? 0 : 20 }}>
            {recentAudit.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 11 }}>No recent activity</div>
            ) : recentAudit.map((a) => (
              <div key={a.id} style={{ padding: "8px 14px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 500, color: "#111827" }}>{a.event_type.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 9, color: "#9ca3af", fontFamily: MONO }}>{new Date(a.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 1 }}>{a.detail || a.entity_type}</div>
                {a.user_name && <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}>{a.user_name}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
