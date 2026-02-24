"use client";

import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

interface ScraperProgressProps {
  job: {
    id: string;
    status: string;
    scrape_type: string;
    progress?: {
      stage?: string;
      current?: number;
      total?: number;
      found?: number;
      current_page?: number;
      total_pages?: number;
      products_found?: number;
    } | null;
    products_created?: number;
    products_updated?: number;
    error_log?: string;
    started_at?: string;
    completed_at?: string;
    duration_seconds?: number;
    created_at?: string;
  };
}

export default function ScraperProgress({ job }: ScraperProgressProps) {
  const statusIcon = {
    queued: <Clock size={16} className="text-gray-400" />,
    running: <Loader2 size={16} className="text-blue-600 animate-spin" />,
    completed: <CheckCircle size={16} className="text-green-600" />,
    failed: <XCircle size={16} className="text-red-600" />,
  }[job.status] || <Clock size={16} className="text-gray-400" />;

  const statusColor = {
    queued: "bg-gray-100 text-gray-600",
    running: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
    failed: "bg-red-50 text-red-700",
  }[job.status] || "bg-gray-100 text-gray-600";

  const progress = job.progress || {};
  const current = progress.current ?? progress.current_page ?? 0;
  const total = progress.total ?? progress.total_pages ?? 0;
  const found = progress.found ?? progress.products_found ?? 0;
  const stage = progress.stage || "";
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  const elapsed = job.started_at
    ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : null;

  const timestamp = job.completed_at
    ? new Date(job.completed_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : job.created_at
    ? new Date(job.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColor}`}>
            {job.status}
          </span>
          {stage && job.status === "running" && (
            <span className="text-xs text-blue-600 font-medium" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {stage}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          {job.duration_seconds ? `${job.duration_seconds}s` : elapsed && job.status === "running" ? `${elapsed}s` : timestamp || ""}
        </span>
      </div>

      {job.status === "running" && (
        <div className="mb-2">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(percent, total > 0 ? 2 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <span>{total > 0 ? `${current}/${total}` : "Working..."}</span>
            {found > 0 && <span>{found} products found</span>}
          </div>
        </div>
      )}

      {job.status === "queued" && (
        <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          Waiting to start...
        </p>
      )}

      {job.status === "completed" && (
        <div className="flex gap-4 text-xs text-gray-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          <span>{job.products_created || 0} created</span>
          <span>{job.products_updated || 0} updated</span>
        </div>
      )}

      {job.status === "failed" && job.error_log && (
        <p className="text-xs text-red-600 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          {job.error_log}
        </p>
      )}
    </div>
  );
}
