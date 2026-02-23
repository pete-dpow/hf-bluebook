"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

// DocumentToolbar — action bar for document register page
// Includes: Upload, Download, Supersede, Manual Sync, Filters, Columns

interface DocumentToolbarProps {
  projectId: string;
  driveId?: string;
  onUploadClick?: () => void;
  onFilterToggle?: () => void;
  onRefresh?: () => void;
  filterActive?: boolean;
  selectedCount?: number;
}

const BTN_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 10px",
  fontSize: 11,
  fontWeight: 500,
  border: "1px solid #d1d5db",
  borderRadius: 4,
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const PRIMARY_BTN: React.CSSProperties = {
  ...BTN_STYLE,
  background: "#154f91",
  color: "#fff",
  border: "1px solid #154f91",
};

export default function DocumentToolbar({
  projectId,
  driveId,
  onUploadClick,
  onFilterToggle,
  onRefresh,
  filterActive,
  selectedCount = 0,
}: DocumentToolbarProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function handleManualSync() {
    if (!driveId || syncing) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/cde/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ driveId, projectId, source: "manual" }),
      });

      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Synced: ${data.new} new, ${data.updated} updated`);
        onRefresh?.();
      } else {
        setSyncResult(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setSyncResult(`Failed: ${err.message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 4000);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      {/* Upload button */}
      <button style={PRIMARY_BTN} onClick={onUploadClick}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Upload
      </button>

      {/* Filter toggle */}
      <button
        style={{
          ...BTN_STYLE,
          ...(filterActive ? { background: "#edf3fa", borderColor: "#154f91", color: "#154f91" } : {}),
        }}
        onClick={onFilterToggle}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filters
      </button>

      {/* Sync button */}
      {driveId && (
        <button
          style={BTN_STYLE}
          onClick={handleManualSync}
          disabled={syncing}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}
          >
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
          </svg>
          {syncing ? "Syncing..." : "Sync"}
        </button>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sync result toast */}
      {syncResult && (
        <span style={{ fontSize: 10, color: "#4b5563" }}>{syncResult}</span>
      )}

      {/* Selected count */}
      {selectedCount > 0 && (
        <span style={{ fontSize: 10, color: "#4b5563", fontWeight: 500 }}>
          {selectedCount} selected
        </span>
      )}
    </div>
  );
}
