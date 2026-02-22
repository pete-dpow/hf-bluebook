"use client";

interface AuditSubHeaderProps {
  totalEvents: number;
  todayCount: number;
  immutable: boolean;
}

export default function AuditSubHeader({ totalEvents, todayCount, immutable }: AuditSubHeaderProps) {
  return (
    <div style={{
      background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px",
      display: "flex", alignItems: "center", flexShrink: 0, height: 54, gap: 0,
    }}>
      <Block label="Total Events" value={String(totalEvents)} color="#154f91" />
      <Separator />
      <Block label="Today" value={String(todayCount)} color={todayCount > 0 ? "#4d7c0f" : "#9ca3af"} />
      <Separator />
      <div style={{ padding: "0 12px" }}>
        <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>Immutable</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: immutable ? "#4d7c0f" : "#dc2626", letterSpacing: "-.01em", lineHeight: 1.1 }}>
          {immutable ? "✓" : "✗"}
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
