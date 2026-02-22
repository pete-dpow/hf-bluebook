"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import WorkflowSubHeader from "@/components/cde/WorkflowSubHeader";
import WorkflowCard from "@/components/cde/WorkflowCard";
import StartWorkflowModal from "@/components/cde/StartWorkflowModal";

export default function WorkflowsPage() {
  const routeParams = useParams();
  const projectId = routeParams.projectId as string;

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [showStart, setShowStart] = useState(false);

  const loadWorkflows = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const qp = new URLSearchParams({ projectId });
    if (filterStatus) qp.set("status", filterStatus);

    const res = await fetch(`/api/cde/workflows?${qp}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) { const d = await res.json(); setWorkflows(d.workflows); }
  }, [projectId, filterStatus]);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  async function handleCompleteStep(workflowId: string, stepId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`/api/cde/workflows/${workflowId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({}),
    });
    loadWorkflows();
  }

  const active = workflows.filter((w) => w.status === "ACTIVE").length;
  const completed = workflows.filter((w) => w.status === "COMPLETED").length;
  const overdueSteps = workflows.filter((w) => w.status === "ACTIVE" && w.due_date && new Date(w.due_date) < new Date()).length;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <WorkflowSubHeader active={active} completed={completed} overdueSteps={overdueSteps} avgCycleDays={0} />

      {/* Toolbar */}
      <div style={{ height: 36, display: "flex", alignItems: "center", padding: "0 12px", gap: 6, borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>
        <button onClick={() => setShowStart(true)} style={toolBtn}>+ Start Workflow</button>
        <select style={toolSel} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <button onClick={loadWorkflows} style={toolBtn}>Refresh</button>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380, 1fr))", gap: 12 }}>
          {workflows.map((w) => (
            <WorkflowCard key={w.id} workflow={w} onCompleteStep={handleCompleteStep} />
          ))}
        </div>
        {workflows.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 12 }}>No workflows found</div>
        )}
      </div>

      {showStart && <StartWorkflowModal projectId={projectId} onClose={() => setShowStart(false)} onCreated={loadWorkflows} />}
    </div>
  );
}

const toolBtn: React.CSSProperties = { height: 24, padding: "0 8px", border: "1px solid #e5e7eb", borderRadius: 4, background: "#fff", fontSize: 10, fontWeight: 500, color: "#4b5563", cursor: "pointer", fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif" };
const toolSel: React.CSSProperties = { height: 24, border: "1px solid #e5e7eb", borderRadius: 4, padding: "0 6px", fontSize: 10, color: "#4b5563", background: "#fff", fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif" };
