"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ExternalLink, RefreshCw, Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  legislation: "Legislation",
  approved_document: "Approved Document",
  british_standard: "British Standard",
  european_standard: "European Standard",
  industry_guidance: "Industry Guidance",
};

const CATEGORY_COLORS: Record<string, string> = {
  legislation: "bg-purple-50 text-purple-700",
  approved_document: "bg-blue-50 text-blue-700",
  british_standard: "bg-emerald-50 text-emerald-700",
  european_standard: "bg-amber-50 text-amber-700",
  industry_guidance: "bg-gray-100 text-gray-600",
};

const STATUS_COLORS: Record<string, string> = {
  in_force: "bg-green-50 text-green-700",
  under_revision: "bg-amber-50 text-amber-700",
  legacy: "bg-gray-100 text-gray-400",
  draft: "bg-blue-50 text-blue-600",
};

const PILLAR_LABELS: Record<string, string> = {
  fire_doors: "Fire Doors",
  dampers: "Dampers",
  fire_stopping: "Fire Stopping",
  retro_fire_stopping: "Retro Fire Stopping",
  auro_lume: "Auro Lume",
};

interface Section {
  id: string;
  section_ref?: string | null;
  section_title?: string | null;
  section_text: string;
  page_number?: number | null;
  chunk_index: number;
}

type ScrapeStatus = "idle" | "scraping" | "complete" | "error";

interface RegulationDetailProps {
  regulation: {
    id: string;
    name: string;
    reference: string;
    category: string;
    description?: string | null;
    status: string;
    pillar_tags?: string[];
    source_url?: string | null;
    effective_date?: string | null;
    last_scraped_at?: string | null;
    regulation_sections?: Section[];
  };
  onScrape: () => void;
  onRetry: () => void;
  scrapeStatus: ScrapeStatus;
  scrapeStartTime: number | null;
  scrapeError: string;
}

// Estimated step thresholds in seconds
const STEPS = [
  { label: "Scrape requested", threshold: 0 },
  { label: "Fetching source document", threshold: 3 },
  { label: "Processing sections & embeddings", threshold: 15 },
  { label: "Complete", threshold: Infinity },
];

function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="tabular-nums" style={{ fontFamily: "var(--font-ibm-plex)" }}>
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </span>
  );
}

function ScrapeProgressPanel({
  scrapeStatus,
  scrapeStartTime,
  scrapeError,
  onRetry,
  sectionCount,
}: {
  scrapeStatus: ScrapeStatus;
  scrapeStartTime: number | null;
  scrapeError: string;
  onRetry: () => void;
  sectionCount: number;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (scrapeStatus !== "scraping" || !scrapeStartTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - scrapeStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [scrapeStatus, scrapeStartTime]);

  if (scrapeStatus === "idle") return null;

  // Complete state
  if (scrapeStatus === "complete") {
    return (
      <div
        className="mb-6 p-4 rounded-xl flex items-start gap-3"
        style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}
      >
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm" style={{ fontFamily: "var(--font-ibm-plex)", color: "#166534" }}>
          Regulation updated — {sectionCount} section{sectionCount !== 1 ? "s" : ""} found
        </p>
      </div>
    );
  }

  // Error state
  if (scrapeStatus === "error") {
    return (
      <div
        className="mb-6 p-4 rounded-xl flex items-start gap-3"
        style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
      >
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm" style={{ fontFamily: "var(--font-ibm-plex)", color: "#991B1B" }}>
            {scrapeError}
          </p>
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Scraping state — progress panel
  const activeStepIndex = STEPS.findIndex((s) => elapsed < s.threshold) - 1;
  const currentStep = Math.max(0, Math.min(activeStepIndex, STEPS.length - 2));

  return (
    <div
      className="mb-6 rounded-xl overflow-hidden"
      style={{ border: "1px solid #BFDBFE", background: "#EFF6FF" }}
    >
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #BFDBFE" }}>
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-600" />
          <span className="text-sm font-medium text-blue-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Updating regulation...
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-700">
          <Clock size={14} />
          {scrapeStartTime && <ElapsedTimer startTime={scrapeStartTime} />}
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 py-4 space-y-3">
        {STEPS.map((step, i) => {
          const isComplete = i <= currentStep;
          const isActive = i === currentStep + 1;
          const isFuture = i > currentStep + 1;
          const isLastStep = i === STEPS.length - 1;

          // Don't show "Complete" step during scraping
          if (isLastStep) return null;

          return (
            <div key={step.label} className="flex items-center gap-3">
              {/* Step indicator */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isComplete ? "#2563EB" : isActive ? "#BFDBFE" : "#E5E7EB",
                  transition: "background 0.3s ease",
                }}
              >
                {isComplete ? (
                  <CheckCircle size={12} className="text-white" />
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                )}
              </div>

              {/* Step label */}
              <span
                className="text-sm"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  color: isComplete ? "#1E40AF" : isActive ? "#2563EB" : "#9CA3AF",
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {step.label}
                {isActive && (
                  <span className="text-blue-400 ml-1">...</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RegulationDetail({
  regulation,
  onScrape,
  onRetry,
  scrapeStatus,
  scrapeStartTime,
  scrapeError,
}: RegulationDetailProps) {
  const sections = regulation.regulation_sections || [];
  const isScraping = scrapeStatus === "scraping";

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={20} className="text-blue-600" />
            <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {regulation.reference}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 text-xs rounded-full ${CATEGORY_COLORS[regulation.category] || "bg-gray-100 text-gray-600"}`}>
              {CATEGORY_LABELS[regulation.category] || regulation.category}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${STATUS_COLORS[regulation.status] || "bg-gray-100 text-gray-600"}`}>
              {regulation.status.replace("_", " ")}
            </span>
            {regulation.pillar_tags?.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                {PILLAR_LABELS[tag] || tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {regulation.source_url && (
            <a
              href={regulation.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              <ExternalLink size={14} />
              Source
            </a>
          )}
          <button
            onClick={onScrape}
            disabled={isScraping}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {isScraping ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isScraping ? "Updating..." : "Update"}
          </button>
        </div>
      </div>

      {/* Scrape progress panel */}
      <ScrapeProgressPanel
        scrapeStatus={scrapeStatus}
        scrapeStartTime={scrapeStartTime}
        scrapeError={scrapeError}
        onRetry={onRetry}
        sectionCount={sections.length}
      />

      {/* Description */}
      {regulation.description && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {regulation.description}
          </p>
        </div>
      )}

      {/* Meta info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          <div>
            <span className="text-gray-500">Effective Date</span>
            <p className="text-gray-900">
              {regulation.effective_date
                ? new Date(regulation.effective_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Last Scraped</span>
            <p className="text-gray-900">
              {regulation.last_scraped_at
                ? new Date(regulation.last_scraped_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                : "Never"}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Sections</span>
            <p className="text-gray-900">{sections.length}</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Key Sections ({sections.length})
          </h3>
        </div>
        {sections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No sections scraped yet — click Update to scrape
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sections
              .sort((a, b) => a.chunk_index - b.chunk_index)
              .map((section) => (
                <div key={section.id} className="px-4 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    {section.section_ref && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {section.section_ref}
                      </span>
                    )}
                    {section.section_title && (
                      <span className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                        {section.section_title}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                    {section.section_text.length > 500
                      ? section.section_text.substring(0, 500) + "..."
                      : section.section_text}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
