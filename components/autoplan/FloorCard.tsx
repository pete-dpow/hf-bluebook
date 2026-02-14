"use client";

import { useState } from "react";
import {
  Layers,
  FileText,
  Trash2,
  Sparkles,
  ExternalLink,
  Loader2,
} from "lucide-react";
import type { AutoplanFloor, AutoplanPlan } from "@/lib/autoplan/types";

interface FloorCardProps {
  floor: AutoplanFloor;
  plans: AutoplanPlan[];
  onGeneratePlan: () => void;
  onDelete: () => void;
  onOpenEditor: (planId: string) => void;
}

const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  pending: { bg: "#F3F4F6", color: "#6B7280", label: "Pending" },
  analyzing: { bg: "#FEF3C7", color: "#92400E", label: "Analyzing" },
  completed: { bg: "#DCFCE7", color: "#166534", label: "Completed" },
  failed: { bg: "#FEE2E2", color: "#991B1B", label: "Failed" },
};

const PLAN_STATUS_STYLES: Record<
  string,
  { bg: string; color: string; label: string }
> = {
  draft: { bg: "#F3F4F6", color: "#6B7280", label: "Draft" },
  review: { bg: "#FEF3C7", color: "#92400E", label: "Review" },
  approved: { bg: "#DCFCE7", color: "#166534", label: "Approved" },
  superseded: { bg: "#E0E7FF", color: "#3730A3", label: "Superseded" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FloorCard({
  floor,
  plans,
  onGeneratePlan,
  onDelete,
  onOpenEditor,
}: FloorCardProps) {
  const [hovered, setHovered] = useState(false);
  const [deleteHovered, setDeleteHovered] = useState(false);
  const [generateHovered, setGenerateHovered] = useState(false);

  const status = STATUS_STYLES[floor.ai_analysis_status] || STATUS_STYLES.pending;
  const isAnalyzing = floor.ai_analysis_status === "analyzing";
  const isCompleted = floor.ai_analysis_status === "completed";
  const floorLabel = floor.floor_name || `Floor ${floor.floor_number}`;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "16px",
        transition: "box-shadow 0.2s ease",
        boxShadow: hovered
          ? "0 4px 12px rgba(0,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(0, 86, 167, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Layers size={16} color="#0056A7" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "14px",
                fontWeight: 600,
                color: "#2A2A2A",
              }}
            >
              {floorLabel}
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                color: "#6B7280",
                marginTop: "1px",
              }}
            >
              {floor.original_filename} &middot;{" "}
              {formatFileSize(floor.file_size_bytes)}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: "999px",
            background: status.bg,
            color: status.color,
            animation: isAnalyzing ? "pulse 2s infinite" : "none",
          }}
        >
          {isAnalyzing && (
            <Loader2
              size={10}
              style={{
                display: "inline-block",
                marginRight: "4px",
                verticalAlign: "middle",
                animation: "spin 1s linear infinite",
              }}
            />
          )}
          {status.label}
        </span>
      </div>

      {/* AI Confidence (when completed) */}
      {isCompleted && floor.ai_confidence != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "12px",
            padding: "6px 10px",
            background: "#F0FDF4",
            borderRadius: "8px",
          }}
        >
          <Sparkles size={13} color="#16A34A" />
          <span
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "12px",
              color: "#166534",
              fontWeight: 500,
            }}
          >
            AI Confidence: {Math.round(floor.ai_confidence * 100)}%
          </span>
        </div>
      )}

      {/* Plans List */}
      {plans.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #F3F4F6",
            paddingTop: "10px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "11px",
              fontWeight: 600,
              color: "#6B7280",
              textTransform: "uppercase" as const,
              letterSpacing: "0.5px",
              marginBottom: "6px",
            }}
          >
            Plans
          </div>
          {plans.map((plan) => {
            const planStatus =
              PLAN_STATUS_STYLES[plan.status] || PLAN_STATUS_STYLES.draft;
            return (
              <div
                key={plan.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid #F9FAFB",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FileText size={13} color="#6B7280" />
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "13px",
                      color: "#2A2A2A",
                    }}
                  >
                    {plan.plan_reference}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "10px",
                      color: "#9CA3AF",
                    }}
                  >
                    v{plan.version}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "1px 6px",
                      borderRadius: "999px",
                      background: planStatus.bg,
                      color: planStatus.color,
                    }}
                  >
                    {planStatus.label}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditor(plan.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontFamily: "var(--font-ibm-plex)",
                    fontSize: "12px",
                    color: "#0056A7",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "rgba(0,86,167,0.06)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <ExternalLink size={12} />
                  Open Editor
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #F3F4F6",
          paddingTop: "10px",
        }}
      >
        <button
          onClick={onGeneratePlan}
          disabled={!isCompleted}
          onMouseEnter={() => setGenerateHovered(true)}
          onMouseLeave={() => setGenerateHovered(false)}
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "13px",
            fontWeight: 500,
            padding: "6px 14px",
            borderRadius: "8px",
            border: "none",
            cursor: isCompleted ? "pointer" : "not-allowed",
            background: isCompleted
              ? generateHovered
                ? "#004A8F"
                : "#0056A7"
              : "#E5E7EB",
            color: isCompleted ? "#FFFFFF" : "#9CA3AF",
            transition: "background 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <Sparkles size={13} />
          Generate Plan
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onMouseEnter={() => setDeleteHovered(true)}
          onMouseLeave={() => setDeleteHovered(false)}
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "12px",
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            background: deleteHovered ? "#FEE2E2" : "transparent",
            color: "#DC2626",
            transition: "background 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Trash2 size={12} />
          Delete
        </button>
      </div>

      {/* Inline keyframe for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
