"use client";

const COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#d97706",
  LOW: "#9ca3af",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const color = COLORS[priority] || "#9ca3af";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "9.5px", color }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
      {priority}
    </span>
  );
}
