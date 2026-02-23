"use client";

import React from "react";

const MONO = "'DM Mono',monospace";

interface WorkflowCardProps {
  workflow: any;
  onCompleteStep: (workflowId: string, stepId: string) => void;
}

export default function WorkflowCard({ workflow, onCompleteStep }: WorkflowCardProps) {
  const steps = (workflow.cde_workflow_steps || []).sort((a: any, b: any) => a.step_number - b.step_number);
  const doc = workflow.cde_documents;
  const isOverdue = workflow.due_date && new Date(workflow.due_date) < new Date() && workflow.status === "ACTIVE";

  return (
    <div style={{
      border: `1px solid ${isOverdue ? "#fecaca" : "#e5e7eb"}`,
      borderRadius: 6,
      background: isOverdue ? "#fef2f2" : "#fff",
      padding: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "#154f91", fontWeight: 500 }}>
            {doc?.doc_number || "—"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#111827", marginTop: 2 }}>
            {doc?.title || "Untitled"}
          </div>
        </div>
        <WfStatusBadge status={workflow.status} overdue={isOverdue} />
      </div>

      {/* Step progress */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {steps.map((s: any) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: s.status === "COMPLETED" ? "#4d7c0f" : s.status === "ACTIVE" ? "#154f91" : "#e5e7eb",
            }}
            title={`${s.step_name} — ${s.status}`}
          />
        ))}
      </div>

      {/* Step labels */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {steps.map((s: any) => (
          <span
            key={s.id}
            style={{
              fontSize: 8,
              fontWeight: 500,
              color: s.status === "COMPLETED" ? "#4d7c0f" : s.status === "ACTIVE" ? "#154f91" : "#9ca3af",
              background: s.status === "ACTIVE" ? "#edf3fa" : "transparent",
              padding: s.status === "ACTIVE" ? "1px 4px" : "1px 2px",
              borderRadius: 2,
            }}
          >
            {s.step_number}. {s.step_name}
          </span>
        ))}
      </div>

      {/* Meta */}
      <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#9ca3af" }}>
        <span>Type: <strong style={{ color: "#4b5563" }}>{(workflow.workflow_type || "").replace("_", " ")}</strong></span>
        <span>Step {workflow.current_step}/{workflow.total_steps}</span>
        {workflow.due_date && (
          <span style={{ color: isOverdue ? "#dc2626" : "#9ca3af" }}>
            Due: {new Date(workflow.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>

      {/* Action */}
      {workflow.status === "ACTIVE" && (
        <div style={{ marginTop: 10 }}>
          {steps.filter((s: any) => s.status === "ACTIVE").map((s: any) => (
            <button
              key={s.id}
              onClick={() => onCompleteStep(workflow.id, s.id)}
              style={{
                height: 26, padding: "0 10px", border: "1px solid #154f91", borderRadius: 4,
                background: "#154f91", color: "#fff", fontSize: 10, fontWeight: 500, cursor: "pointer",
                fontFamily: "'Futura PT','Century Gothic','Futura',system-ui,sans-serif",
              }}
            >
              Complete: {s.step_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WfStatusBadge({ status, overdue }: { status: string; overdue: boolean }) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: overdue ? "#fef2f2" : "#edf3fa", color: overdue ? "#dc2626" : "#154f91" },
    COMPLETED: { bg: "#f0fdf4", color: "#4d7c0f" },
    CANCELLED: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const c = map[status] || map.ACTIVE;
  return <span style={{ fontSize: 9, fontWeight: 600, color: c.color, background: c.bg, padding: "2px 6px", borderRadius: 3 }}>{overdue ? "OVERDUE" : status}</span>;
}
