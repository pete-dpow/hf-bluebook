"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ArrowRight } from "lucide-react";

interface PillarData {
  pillar: string;
  display_name: string;
  count: number;
  percentage: number;
}

const pillarMeta: Record<string, { abbrev: string; bg: string; text: string; category: string }> = {
  fire_doors: { abbrev: "FD", bg: "#FEF3C7", text: "#92400E", category: "Passive Fire Protection" },
  dampers: { abbrev: "DA", bg: "#DBEAFE", text: "#1E40AF", category: "HVAC Fire Protection" },
  fire_stopping: { abbrev: "FS", bg: "#DCFCE7", text: "#166534", category: "Passive Fire Protection" },
  retro_fire_stopping: { abbrev: "RF", bg: "#FCE7F3", text: "#9D174D", category: "Retro-fit Solutions" },
  auro_lume: { abbrev: "AL", bg: "#EDE9FE", text: "#5B21B6", category: "Emergency Lighting" },
};

// Stacked bar segment colors (matching Figma)
const segmentColors = ["#22C55E", "#EAB308", "#3B82F6", "#EF4444"];
const segmentLabels = ["Active", "Draft", "Review", "Inactive"];

export default function ProjectCompletion({ pillars }: { pillars: PillarData[] }) {
  const router = useRouter();

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
            </svg>
          </div>
          <div>
            <h3
              className="text-base text-[#111827]"
              style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
            >
              Product Coverage
            </h3>
            <p
              className="text-[0.7rem] text-[#9CA3AF]"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Target for all pillars to reach full catalog coverage across all product statuses.
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 text-xs text-[#6B7280] border border-[#E5E7EB] rounded-lg px-3 py-1.5 hover:bg-gray-50 transition shrink-0"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          This Month <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Column Headers */}
      <div className="flex items-center mb-2 pl-[200px]">
        <div className="flex-1" />
        {segmentLabels.map((label, i) => (
          <span
            key={label}
            className="w-[52px] text-center text-[0.6rem] text-[#9CA3AF] uppercase tracking-wider"
            style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 600 }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-4">
        {pillars.map((p) => {
          const meta = pillarMeta[p.pillar] || { abbrev: "??", bg: "#F3F4F6", text: "#6B7280", category: "Other" };
          // For demo: distribute the percentage across segments
          const total = p.count || 1;
          const active = Math.round(p.percentage * 0.5);
          const draft = Math.round(p.percentage * 0.3);
          const review = Math.round(p.percentage * 0.12);
          const inactive = Math.max(0, p.percentage - active - draft - review);
          const segments = [active, draft, review, inactive];

          return (
            <div key={p.pillar}>
              <div className="flex items-center gap-3">
                {/* Badge */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: meta.bg, color: meta.text, fontFamily: "var(--font-ibm-plex)" }}
                >
                  {meta.abbrev}
                </div>

                {/* Name + Category */}
                <div className="w-[140px] shrink-0">
                  <p
                    className="text-sm text-[#111827] leading-tight"
                    style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 600 }}
                  >
                    {p.display_name}
                  </p>
                  <p
                    className="text-[0.65rem] text-[#9CA3AF]"
                    style={{ fontFamily: "var(--font-ibm-plex)" }}
                  >
                    {meta.category}
                  </p>
                </div>

                {/* Stacked Bar */}
                <div className="flex-1 flex h-2.5 rounded-full overflow-hidden bg-[#F3F4F6]">
                  {segments.map((pct, i) =>
                    pct > 0 ? (
                      <div
                        key={i}
                        style={{
                          width: `${pct}%`,
                          background: segmentColors[i],
                          minWidth: pct > 0 ? 3 : 0,
                        }}
                      />
                    ) : null
                  )}
                </div>

                {/* Percentage Columns */}
                {segments.map((pct, i) => (
                  <span
                    key={i}
                    className="w-[52px] text-center text-xs text-[#374151]"
                    style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
                  >
                    {pct}%
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* View More */}
      <button
        onClick={() => router.push("/products")}
        className="flex items-center gap-1 text-sm text-[#0056a7] mt-5 hover:underline"
        style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
      >
        View More <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
