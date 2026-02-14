"use client";

import { HardDrive, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { SurveyScan } from "@/lib/surveying/types";

interface ScanCardProps {
  scan: SurveyScan & { survey_floors?: { count: number }[] };
  onClick?: () => void;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  uploaded: { icon: Clock, color: "#6B7280", bg: "#F3F4F6", label: "Uploaded" },
  converting: { icon: Loader2, color: "#D97706", bg: "#FEF3C7", label: "Converting" },
  processing: { icon: Loader2, color: "#2563EB", bg: "#DBEAFE", label: "Processing" },
  ready: { icon: CheckCircle, color: "#059669", bg: "#D1FAE5", label: "Ready" },
  failed: { icon: AlertCircle, color: "#DC2626", bg: "#FEE2E2", label: "Failed" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatPoints(count: number | null): string {
  if (!count) return "—";
  if (count < 1_000_000) return `${(count / 1000).toFixed(0)}K`;
  return `${(count / 1_000_000).toFixed(1)}M`;
}

export default function ScanCard({ scan, onClick }: ScanCardProps) {
  const status = STATUS_CONFIG[scan.processing_status] || STATUS_CONFIG.uploaded;
  const StatusIcon = status.icon;
  const isSpinning = scan.processing_status === "converting" || scan.processing_status === "processing";
  const floorCount = scan.survey_floors?.[0]?.count || 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-[#E5E7EB] p-5 hover:shadow-md hover:border-[#0056a7]/30 transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#0056a7]/10 flex items-center justify-center flex-shrink-0">
          <HardDrive className="w-5 h-5 text-[#0056a7]" />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            className="font-medium truncate mb-1"
            style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A", fontSize: "14px" }}
          >
            {scan.scan_name}
          </h3>

          <div className="flex items-center gap-3 text-xs" style={{ fontFamily: "var(--font-ibm-plex)", color: "#6B7280" }}>
            <span>{scan.file_format.toUpperCase()}</span>
            <span>{formatFileSize(scan.file_size_bytes)}</span>
            {scan.point_count && <span>{formatPoints(scan.point_count)} pts</span>}
            {floorCount > 0 && <span>{floorCount} floors</span>}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ background: status.bg, color: status.color, fontFamily: "var(--font-ibm-plex)" }}
        >
          <StatusIcon className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
          {status.label}
        </div>
      </div>

      {scan.processing_error && (
        <p className="mt-2 text-xs text-red-500 truncate" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          {scan.processing_error}
        </p>
      )}
    </button>
  );
}
