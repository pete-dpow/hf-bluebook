"use client";

interface WorkflowSubHeaderProps {
  active: number;
  completed: number;
  overdueSteps: number;
  avgCycleDays: number;
}

export default function WorkflowSubHeader({ active, completed, overdueSteps, avgCycleDays }: WorkflowSubHeaderProps) {
  return (
    <div style={{
      background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px",
      display: "flex", alignItems: "center", flexShrink: 0, height: 54, gap: 0,
    }}>
      <Block label="Active" value={String(active)} color={active > 0 ? "#154f91" : "#9ca3af"} />
      <Separator />
      <Block label="Completed" value={String(completed)} color="#4d7c0f" />
      <Separator />
      <Block label="Overdue Steps" value={String(overdueSteps)} color={overdueSteps > 0 ? "#dc2626" : "#9ca3af"} />
      <Separator />
      <div style={{ padding: "0 12px" }}>
        <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>Avg Cycle</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: "#154f91", letterSpacing: "-.01em", lineHeight: 1.1 }}>
          {avgCycleDays > 0 ? `${avgCycleDays}d` : "—"}
        </div>
      </div>
    </div>
  );
}

function Separator() { return <div style={{ width: 1, height: 34, background: "#e5e7eb", flexShrink: 0 }} />; }
function Block({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 12px" }}>
      <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color, letterSpacing: "-.01em", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
