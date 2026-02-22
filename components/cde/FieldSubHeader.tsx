"use client";

interface FieldSubHeaderProps {
  total: number;
  open: number;
  workDone: number;
  inspect: number;
  closed: number;
  closeRate: number;
}

export default function FieldSubHeader({ total, open, workDone, inspect, closed, closeRate }: FieldSubHeaderProps) {
  return (
    <div style={{
      background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 16px",
      display: "flex", alignItems: "center", flexShrink: 0, height: 54, gap: 0,
    }}>
      <Block label="Total" value={String(total)} color="#154f91" />
      <Separator />
      <Block label="Open" value={String(open)} color={open > 0 ? "#dc2626" : "#9ca3af"} />
      <Separator />
      <Block label="Work Done" value={String(workDone)} color={workDone > 0 ? "#d97706" : "#9ca3af"} />
      <Separator />
      <Block label="Inspect" value={String(inspect)} color={inspect > 0 ? "#ea580c" : "#9ca3af"} />
      <Separator />
      <Block label="Closed" value={String(closed)} color="#4d7c0f" />
      <Separator />
      <div style={{ padding: "0 12px" }}>
        <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>Close Rate</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: closeRate >= 75 ? "#4d7c0f" : closeRate >= 50 ? "#d97706" : "#dc2626", letterSpacing: "-.01em", lineHeight: 1.1 }}>
          {total > 0 ? `${closeRate}%` : "—"}
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
