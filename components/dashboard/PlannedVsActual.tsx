"use client";

import { ChevronDown } from "lucide-react";

// SVG line chart matching the Figma "Planned vs Actual" section
// Shows quote/activity trends over 12 months

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const lines = [
  { label: "Products", color: "#22C55E", data: [80, 95, 110, 130, 125, 140, 160, 175, 190, 210, 230, 250] },
  { label: "Quotes", color: "#F59E0B", data: [40, 55, 70, 60, 80, 95, 85, 110, 120, 105, 130, 140] },
  { label: "Compliance", color: "#EF4444", data: [20, 25, 30, 35, 45, 40, 50, 55, 65, 60, 70, 75] },
  { label: "Scraping", color: "#3B82F6", data: [60, 70, 65, 80, 90, 100, 95, 115, 130, 140, 155, 170] },
  { label: "Golden Thread", color: "#EC4899", data: [10, 15, 20, 25, 30, 45, 55, 50, 65, 80, 90, 100] },
];

const chartW = 680;
const chartH = 220;
const padL = 40;
const padR = 10;
const padT = 10;
const padB = 25;
const plotW = chartW - padL - padR;
const plotH = chartH - padT - padB;

const maxVal = 400;
const yTicks = [0, 100, 150, 200, 250, 300, 350, 400];

function toX(i: number): number {
  return padL + (i / (months.length - 1)) * plotW;
}

function toY(v: number): number {
  return padT + plotH - (v / maxVal) * plotH;
}

function buildPath(data: number[]): string {
  return data.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
}

export default function PlannedVsActual() {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F3F4F6] flex items-center justify-center mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <div>
            <h3
              className="text-base text-[#111827]"
              style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
            >
              Planned Vs Actual
            </h3>
            <p
              className="text-[0.7rem] text-[#9CA3AF]"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Platform activity trends across all modules.
            </p>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 text-xs text-[#6B7280] border border-[#E5E7EB] rounded-lg px-3 py-1.5 hover:bg-gray-50 transition shrink-0"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          This Year <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ maxHeight: 260 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padL}
              x2={chartW - padR}
              y1={toY(v)}
              y2={toY(v)}
              stroke="#F3F4F6"
              strokeWidth={1}
            />
            <text
              x={padL - 6}
              y={toY(v) + 3}
              textAnchor="end"
              className="text-[8px] fill-[#9CA3AF]"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {v}
            </text>
          </g>
        ))}

        {/* Month labels */}
        {months.map((m, i) => (
          <text
            key={m}
            x={toX(i)}
            y={chartH - 4}
            textAnchor="middle"
            className="text-[7px] fill-[#9CA3AF]"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {m}
          </text>
        ))}

        {/* Lines */}
        {lines.map((line) => (
          <path
            key={line.label}
            d={buildPath(line.data)}
            fill="none"
            stroke={line.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Dots on last data point */}
        {lines.map((line) => (
          <circle
            key={`dot-${line.label}`}
            cx={toX(line.data.length - 1)}
            cy={toY(line.data[line.data.length - 1])}
            r={3}
            fill={line.color}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="flex gap-5 mt-3 justify-center">
        {lines.map((line) => (
          <div key={line.label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: line.color }} />
            <span
              className="text-[0.7rem] text-[#6B7280]"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {line.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
