"use client";

import { ShieldCheck, ExternalLink } from "lucide-react";

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

interface RegulationCardProps {
  regulation: {
    id: string;
    name: string;
    reference: string;
    category: string;
    description?: string | null;
    status: string;
    pillar_tags?: string[];
    source_url?: string | null;
    last_scraped_at?: string | null;
    regulation_sections?: { count: number }[];
  };
  onClick: () => void;
}

export default function RegulationCard({ regulation, onClick }: RegulationCardProps) {
  const sectionCount = regulation.regulation_sections?.[0]?.count || 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md cursor-pointer transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600 flex-shrink-0" />
          <h3
            className="text-sm font-medium text-gray-900 line-clamp-2"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {regulation.name}
          </h3>
        </div>
        {regulation.source_url && (
          <a
            href={regulation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-gray-400 hover:text-blue-600 transition flex-shrink-0"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <p className="text-xs text-gray-500 mb-3" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {regulation.reference}
      </p>

      {regulation.description && (
        <p
          className="text-xs text-gray-400 mb-3 line-clamp-2"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          {regulation.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={`px-2 py-0.5 text-xs rounded-full ${CATEGORY_COLORS[regulation.category] || "bg-gray-100 text-gray-600"}`}>
          {CATEGORY_LABELS[regulation.category] || regulation.category}
        </span>
        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${STATUS_COLORS[regulation.status] || "bg-gray-100 text-gray-600"}`}>
          {regulation.status.replace("_", " ")}
        </span>
      </div>

      {regulation.pillar_tags && regulation.pillar_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {regulation.pillar_tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded"
            >
              {PILLAR_LABELS[tag] || tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        <span>{sectionCount} section{sectionCount !== 1 ? "s" : ""}</span>
        {regulation.last_scraped_at && (
          <span>
            Scraped {new Date(regulation.last_scraped_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          </span>
        )}
      </div>
    </div>
  );
}
