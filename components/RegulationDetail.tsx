"use client";

import { ShieldCheck, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

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
  scraping: boolean;
}

export default function RegulationDetail({ regulation, onScrape, scraping }: RegulationDetailProps) {
  const sections = regulation.regulation_sections || [];

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
            disabled={scraping}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {scraping ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Update
          </button>
        </div>
      </div>

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
