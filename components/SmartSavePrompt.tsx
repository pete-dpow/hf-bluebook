"use client";

export default function SmartSavePrompt({
  onSave,
  onAttach,
  onDiscard,
  onConnectMS,
}: {
  onSave: () => void;
  onAttach: () => void;
  onDiscard: () => void;
  onConnectMS: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "60vh", // ~300% taller than before
        background: "#F9FAFB",
        borderTop: "1px solid #E5E7EB",
        boxShadow: "0 -6px 20px rgba(0,0,0,0.15)",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontSize: 24,
          marginBottom: 12,
          color: "#111827",
          fontFamily: "var(--font-cormorant)",
        }}
      >
        Save this session?
      </h2>
      <p
        style={{
          color: "#4B5563",
          fontSize: 15,
          lineHeight: 1.6,
          marginBottom: 32,
          maxWidth: 480,
          fontFamily: "var(--font-ibm-plex)",
        }}
      >
        Would you like to save your current chat and uploaded file as a new
        project, attach it to an existing one, or connect your Microsoft 365
        account for sync?
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 260 }}>
        <button
          onClick={onSave}
          style={{
            background: "#2563EB",
            color: "#fff",
            padding: "0.75rem",
            borderRadius: 8,
            fontFamily: "var(--font-ibm-plex)",
          }}
        >
          Save as New Project
        </button>
        <button
          onClick={onAttach}
          style={{
            background: "#E5E7EB",
            color: "#111",
            padding: "0.75rem",
            borderRadius: 8,
            fontFamily: "var(--font-ibm-plex)",
          }}
        >
          Attach to Existing
        </button>
        <button
          onClick={onConnectMS}
          style={{
            background: "#107C10",
            color: "#fff",
            padding: "0.75rem",
            borderRadius: 8,
            fontFamily: "var(--font-ibm-plex)",
          }}
        >
          Connect Microsoft 365
        </button>
        <button
          onClick={onDiscard}
          style={{
            background: "transparent",
            color: "#6B7280",
            padding: "0.75rem",
            borderRadius: 8,
            fontFamily: "var(--font-ibm-plex)",
          }}
        >
          Discard
        </button>
      </div>
    </div>
  );
}
