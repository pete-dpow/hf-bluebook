"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Check, Circle, Trash2 } from "lucide-react";
import type {
  PlacedSymbol,
  SymbolDefinition,
  AIAnalysisResult,
  ComplianceChecklist,
} from "@/lib/autoplan/types";
import { CHECKLIST_LABELS } from "@/lib/autoplan/types";

interface PropertiesPanelProps {
  selectedSymbol: PlacedSymbol | null;
  symbolDefinition: SymbolDefinition | null;
  aiAnalysis: AIAnalysisResult | null;
  checklist: ComplianceChecklist;
  onSymbolUpdate: (updated: PlacedSymbol) => void;
  onChecklistChange: (checklist: ComplianceChecklist) => void;
  onDeleteSymbol: () => void;
}

function SectionHeader({
  title,
  subtitle,
  expanded,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        width: "100%",
        padding: "10px 16px",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid #E5E7EB",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {expanded ? (
        <ChevronDown size={14} color="#6B7280" />
      ) : (
        <ChevronRight size={14} color="#6B7280" />
      )}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'IBM Plex Sans', sans-serif",
          color: "#1F2937",
        }}
      >
        {title}
      </span>
      {subtitle && (
        <span
          style={{
            fontSize: 11,
            color: "#9CA3AF",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          {subtitle}
        </span>
      )}
    </button>
  );
}

export default function PropertiesPanel({
  selectedSymbol,
  symbolDefinition,
  aiAnalysis,
  checklist,
  onSymbolUpdate,
  onChecklistChange,
  onDeleteSymbol,
}: PropertiesPanelProps) {
  const [symbolExpanded, setSymbolExpanded] = useState(true);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [checklistExpanded, setChecklistExpanded] = useState(true);

  // ─── Checklist count ───────────────────────────────────
  const checklistKeys = Object.keys(checklist) as (keyof ComplianceChecklist)[];
  const checkedCount = checklistKeys.filter((k) => checklist[k]).length;

  // ─── Confidence color ──────────────────────────────────
  const getConfidenceColor = (c: number) => {
    if (c > 0.7) return "#16A34A";
    if (c > 0.4) return "#F59E0B";
    return "#DC2626";
  };

  return (
    <div
      style={{
        width: 280,
        height: "100%",
        background: "#FCFCFA",
        borderLeft: "1px solid #E5E7EB",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* ─── Section 1: Selected Symbol ───────────────────── */}
      <SectionHeader
        title="Selected Symbol"
        expanded={symbolExpanded}
        onToggle={() => setSymbolExpanded(!symbolExpanded)}
      />
      {symbolExpanded && (
        <div style={{ padding: "12px 16px" }}>
          {!selectedSymbol || !symbolDefinition ? (
            <p
              style={{
                color: "#9CA3AF",
                fontSize: 13,
                margin: 0,
                fontStyle: "italic",
              }}
            >
              No symbol selected
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Symbol type + swatch */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    background: symbolDefinition.bgColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: symbolDefinition.color,
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {symbolDefinition.shortLabel}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1F2937" }}>
                    {symbolDefinition.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {symbolDefinition.bsReference}
                  </div>
                </div>
              </div>

              {/* Position (read-only) */}
              <div>
                <label style={labelStyle}>Position</label>
                <div style={{ fontSize: 12, color: "#6B7280", fontFamily: "monospace" }}>
                  x: {selectedSymbol.x.toFixed(2)}&nbsp;&nbsp;y: {selectedSymbol.y.toFixed(2)}
                </div>
              </div>

              {/* Rotation slider */}
              <div>
                <label style={labelStyle}>
                  Rotation: {selectedSymbol.rotation}°
                </label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={selectedSymbol.rotation}
                  onChange={(e) =>
                    onSymbolUpdate({
                      ...selectedSymbol,
                      rotation: Number(e.target.value),
                    })
                  }
                  style={sliderStyle}
                />
              </div>

              {/* Scale slider */}
              <div>
                <label style={labelStyle}>
                  Scale: {selectedSymbol.scale.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min={0.3}
                  max={3.0}
                  step={0.1}
                  value={selectedSymbol.scale}
                  onChange={(e) =>
                    onSymbolUpdate({
                      ...selectedSymbol,
                      scale: Number(e.target.value),
                    })
                  }
                  style={sliderStyle}
                />
              </div>

              {/* Label input */}
              <div>
                <label style={labelStyle}>Label (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor Exit A"
                  value={selectedSymbol.label || ""}
                  onChange={(e) =>
                    onSymbolUpdate({
                      ...selectedSymbol,
                      label: e.target.value || undefined,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    fontSize: 12,
                    border: "1px solid #D1D5DB",
                    borderRadius: 4,
                    outline: "none",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    background: "#FFFFFF",
                    color: "#1F2937",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Delete button */}
              <button
                onClick={onDeleteSymbol}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#DC2626",
                  background: "transparent",
                  border: "1px solid #FCA5A5",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <Trash2 size={14} />
                Delete Symbol
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Section 2: AI Analysis ───────────────────────── */}
      {aiAnalysis && (
        <>
          <SectionHeader
            title="AI Analysis"
            expanded={aiExpanded}
            onToggle={() => setAiExpanded(!aiExpanded)}
          />
          {aiExpanded && (
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Confidence */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#6B7280" }}>Confidence:</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: getConfidenceColor(aiAnalysis.confidence),
                  }}
                >
                  {Math.round(aiAnalysis.confidence * 100)}%
                </span>
              </div>

              {/* Scale */}
              {aiAnalysis.scale && (
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  Detected scale: <strong style={{ color: "#1F2937" }}>{aiAnalysis.scale}</strong>
                </div>
              )}

              {/* Warnings */}
              {aiAnalysis.warnings.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#92400E", marginBottom: 4 }}>
                    Warnings
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, listStyle: "none" }}>
                    {aiAnalysis.warnings.map((w, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "#92400E",
                          marginBottom: 3,
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: -14,
                            top: 4,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#F59E0B",
                          }}
                        />
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Regulatory notes */}
              {aiAnalysis.regulatory_notes.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#1E40AF", marginBottom: 4 }}>
                    Regulatory Notes
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, listStyle: "none" }}>
                    {aiAnalysis.regulatory_notes.map((n, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: 12,
                          color: "#1E40AF",
                          marginBottom: 3,
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            position: "absolute",
                            left: -14,
                            top: 4,
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#3B82F6",
                          }}
                        />
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Section 3: Compliance Checklist ──────────────── */}
      <SectionHeader
        title="Compliance Checklist"
        subtitle={`${checkedCount}/${checklistKeys.length} complete`}
        expanded={checklistExpanded}
        onToggle={() => setChecklistExpanded(!checklistExpanded)}
      />
      {checklistExpanded && (
        <div style={{ padding: "8px 16px" }}>
          {checklistKeys.map((key) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                padding: "6px 0",
                cursor: "pointer",
                fontSize: 12,
                color: "#374151",
                lineHeight: 1.4,
              }}
            >
              <button
                onClick={() =>
                  onChecklistChange({ ...checklist, [key]: !checklist[key] })
                }
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: checklist[key] ? "none" : "1.5px solid #D1D5DB",
                  background: checklist[key] ? "#16A34A" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginTop: 1,
                  padding: 0,
                }}
              >
                {checklist[key] ? (
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Circle size={10} color="#D1D5DB" />
                )}
              </button>
              <span
                style={{
                  textDecoration: checklist[key] ? "line-through" : "none",
                  color: checklist[key] ? "#9CA3AF" : "#374151",
                }}
              >
                {CHECKLIST_LABELS[key]}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared styles ──────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "#6B7280",
  marginBottom: 4,
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  height: 4,
  cursor: "pointer",
  accentColor: "#2563EB",
};
