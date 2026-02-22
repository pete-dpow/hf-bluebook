"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// SyncStatus — header indicator showing last sync time + pending count

interface SyncStatusProps {
  projectId?: string;
}

export default function SyncStatus({ projectId }: SyncStatusProps) {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadSyncInfo();
  }, [projectId]);

  async function loadSyncInfo() {
    // Get last sync event from audit log
    const { data: auditData } = await supabase
      .from("cde_audit_log")
      .select("created_at")
      .eq("event_type", "SYNC")
      .order("created_at", { ascending: false })
      .limit(1);

    if (auditData && auditData.length > 0) {
      setLastSync(auditData[0].created_at);
    }

    // Get count of documents needing metadata
    if (projectId) {
      const { count } = await supabase
        .from("cde_documents")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("needs_metadata", true);

      setPendingCount(count || 0);
    }
  }

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 10,
        color: "rgba(255,255,255,.55)",
      }}
    >
      {/* Sync icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: syncing ? "spin 1s linear infinite" : "none",
        }}
      >
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      </svg>

      {lastSync ? (
        <span>Synced {formatRelativeTime(lastSync)}</span>
      ) : (
        <span>No sync yet</span>
      )}

      {pendingCount > 0 && (
        <span
          style={{
            background: "rgba(217,119,6,.25)",
            color: "#fcd34d",
            padding: "0 4px",
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 500,
          }}
        >
          {pendingCount} pending
        </span>
      )}
    </div>
  );
}
