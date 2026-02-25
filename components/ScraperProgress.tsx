"use client";

import { useState } from "react";
import { Loader2, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

const fontInter = "var(--font-inter), ui-sans-serif, system-ui, sans-serif";

interface ProgressStats {
  listingsFetched?: number;
  detailsFetched?: number;
  detailsBlocked?: number;
  productsFromFetch?: number;
  productsFromFallback?: number;
  enrichedWithKnowledgeBase?: number;
}

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
      stats?: ProgressStats;
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
  const [expanded, setExpanded] = useState(false);

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
  const stats = progress.stats;

  const elapsed = job.started_at
    ? Math.round((Date.now() - new Date(job.started_at).getTime()) / 1000)
    : null;

  const timestamp = job.completed_at
    ? new Date(job.completed_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : job.created_at
    ? new Date(job.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  const hasDetails = job.status === "completed" || job.status === "failed";
  const hasBlockedPages = stats && (stats.detailsBlocked ?? 0) > 0;

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white" style={{ fontFamily: fontInter }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusColor}`}>
            {job.status}
          </span>
          {stage && job.status === "running" && (
            <span className="text-xs text-blue-600 font-medium">
              {stage}
            </span>
          )}
          {hasBlockedPages && job.status === "running" && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle size={12} />
              {stats!.detailsBlocked} pages blocked
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {job.duration_seconds ? `${job.duration_seconds}s` : elapsed && job.status === "running" ? `${elapsed}s` : timestamp || ""}
          </span>
          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {expanded ? "Hide" : "Details"}
            </button>
          )}
        </div>
      </div>

      {job.status === "running" && (
        <div className="mb-2">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(percent, total > 0 ? 2 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>{total > 0 ? `${current}/${total}` : "Working..."}</span>
            {found > 0 && <span>{found} products found</span>}
          </div>
        </div>
      )}

      {job.status === "queued" && (
        <p className="text-xs text-gray-400 mt-1">
          Waiting to start...
        </p>
      )}

      {job.status === "completed" && (
        <div className="flex gap-4 text-xs text-gray-600">
          <span>{job.products_created || 0} created</span>
          <span>{job.products_updated || 0} updated</span>
          {found > 0 && <span>{found} total</span>}
        </div>
      )}

      {job.status === "failed" && job.error_log && (
        <p className="text-xs text-red-600 mt-1 break-words whitespace-pre-wrap">
          {job.error_log}
        </p>
      )}

      {/* Expandable details panel */}
      {expanded && hasDetails && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {/* Structured stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {stats.listingsFetched != null && (
                <div className="bg-gray-50 rounded px-2 py-1.5">
                  <span className="text-gray-400 block">Listings fetched</span>
                  <span className="font-medium text-gray-700">{stats.listingsFetched}</span>
                </div>
              )}
              {stats.detailsFetched != null && (
                <div className="bg-gray-50 rounded px-2 py-1.5">
                  <span className="text-gray-400 block">Details fetched</span>
                  <span className="font-medium text-gray-700">{stats.detailsFetched}</span>
                </div>
              )}
              {(stats.detailsBlocked ?? 0) > 0 && (
                <div className="bg-amber-50 rounded px-2 py-1.5">
                  <span className="text-amber-500 block">Details blocked</span>
                  <span className="font-medium text-amber-700">{stats.detailsBlocked}</span>
                </div>
              )}
              {stats.productsFromFetch != null && (
                <div className="bg-gray-50 rounded px-2 py-1.5">
                  <span className="text-gray-400 block">From page fetch</span>
                  <span className="font-medium text-gray-700">{stats.productsFromFetch}</span>
                </div>
              )}
              {stats.productsFromFallback != null && (
                <div className="bg-gray-50 rounded px-2 py-1.5">
                  <span className="text-gray-400 block">From URL fallback</span>
                  <span className="font-medium text-gray-700">{stats.productsFromFallback}</span>
                </div>
              )}
              {(stats.enrichedWithKnowledgeBase ?? 0) > 0 && (
                <div className="bg-green-50 rounded px-2 py-1.5">
                  <span className="text-green-500 block">KB enriched</span>
                  <span className="font-medium text-green-700">{stats.enrichedWithKnowledgeBase}</span>
                </div>
              )}
            </div>
          )}

          {/* Stage info for completed */}
          {job.status === "completed" && stage && (
            <p className="text-xs text-gray-400">Last stage: {stage}</p>
          )}

          {/* Full error log for failed */}
          {job.status === "failed" && job.error_log && (
            <div className="bg-red-50 rounded p-2">
              <p className="text-xs text-red-500 font-medium mb-1">Error details</p>
              <p className="text-xs text-red-700 break-words whitespace-pre-wrap font-mono leading-relaxed">
                {job.error_log}
              </p>
            </div>
          )}

          {/* Summary line */}
          {job.duration_seconds != null && (
            <p className="text-xs text-gray-400">
              Completed in {job.duration_seconds}s
              {job.completed_at && ` — ${new Date(job.completed_at).toLocaleString("en-GB")}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
