"use client";

// StatusBadge — ISO 19650 document status badge (matches v5 HTML .b classes)

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  S0: { bg: "#f3f4f6", color: "#6b7280", label: "S0" },
  S1: { bg: "#edf3fa", color: "#154f91", label: "S1" },
  S3: { bg: "#fefce8", color: "#d97706", label: "S3" },
  S4: { bg: "#fff7ed", color: "#ea580c", label: "S4" },
  A: { bg: "#ecfccb", color: "#4d7c0f", label: "A" },
  B: { bg: "#ecfccb", color: "#4d7c0f", label: "B" },
  C: { bg: "#fef2f2", color: "#dc2626", label: "C" },
  CR: { bg: "#f5f3ff", color: "#7c3aed", label: "CR" },
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.S0;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 17,
        padding: "0 5px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: ".02em",
        background: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  );
}
