"use client";

// SyncBadge — ⟳ indicator for documents with needs_metadata = true

interface SyncBadgeProps {
  needsMetadata?: boolean;
  size?: number;
}

export default function SyncBadge({ needsMetadata, size = 14 }: SyncBadgeProps) {
  if (!needsMetadata) return null;

  return (
    <span
      title="Needs metadata — synced from SharePoint without ISO 19650 fields"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fef3c7",
        color: "#d97706",
        fontSize: size * 0.7,
        fontWeight: 600,
        cursor: "help",
        flexShrink: 0,
      }}
    >
      ⟳
    </span>
  );
}
