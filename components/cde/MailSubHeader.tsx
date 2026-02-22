"use client";

const MONO = "'DM Mono',monospace";

interface MailSubHeaderProps {
  total: number;
  open: number;
  responded: number;
  overdue: number;
  closed: number;
  avgResponseDays: number;
}

export default function MailSubHeader({ total, open, responded, overdue, closed, avgResponseDays }: MailSubHeaderProps) {
  return (
    <div style={{
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
      padding: "0 16px",
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      height: 54,
      gap: 0,
    }}>
      <Block label="Total" value={String(total)} color="#154f91" />
      <Separator />
      <Block label="Open" value={String(open)} color={open > 0 ? "#d97706" : "#9ca3af"} />
      <Separator />
      <Block label="Responded" value={String(responded)} color="#4d7c0f" />
      <Separator />
      <Block label="Overdue" value={String(overdue)} color={overdue > 0 ? "#dc2626" : "#9ca3af"} />
      <Separator />
      <Block label="Closed" value={String(closed)} color="#9ca3af" />
      <Separator />
      <div style={{ padding: "0 12px" }}>
        <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>Avg Response</div>
        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 500, color: "#154f91", letterSpacing: "-.01em", lineHeight: 1.1 }}>
          {avgResponseDays > 0 ? `${avgResponseDays}d` : "—"}
        </div>
      </div>
    </div>
  );
}

function Separator() {
  return <div style={{ width: 1, height: 34, background: "#e5e7eb", flexShrink: 0 }} />;
}

function Block({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "0 12px" }}>
      <div style={{ fontSize: 8, fontWeight: 500, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color, letterSpacing: "-.01em", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}
