"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Download,
  Undo2,
  Redo2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import SymbolPalette from "@/components/autoplan/SymbolPalette";
import PlanCanvas from "@/components/autoplan/PlanCanvas";
import CanvasToolbar from "@/components/autoplan/CanvasToolbar";
import PropertiesPanel from "@/components/autoplan/PropertiesPanel";
import ApprovalModal from "@/components/autoplan/ApprovalModal";
import { SYMBOL_MAP } from "@/lib/autoplan/symbols";
import type {
  AutoplanPlan,
  AutoplanFloor,
  AutoplanBuilding,
  AutoplanApproval,
  PlacedSymbol,
  Annotation,
  CanvasViewport,
  ComplianceChecklist,
} from "@/lib/autoplan/types";
import { EMPTY_CHECKLIST } from "@/lib/autoplan/types";

interface PlanResponse {
  plan: AutoplanPlan;
  floor: AutoplanFloor;
  building: AutoplanBuilding;
  approval?: AutoplanApproval;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  draft: { bg: "#F3F4F6", color: "#6B7280", label: "Draft" },
  review: { bg: "#FEF3C7", color: "#92400E", label: "Review" },
  approved: { bg: "#DCFCE7", color: "#166534", label: "Approved" },
  superseded: { bg: "#E0E7FF", color: "#3730A3", label: "Superseded" },
};

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.planId as string;

  // Data state
  const [plan, setPlan] = useState<AutoplanPlan | null>(null);
  const [floor, setFloor] = useState<AutoplanFloor | null>(null);
  const [building, setBuilding] = useState<AutoplanBuilding | null>(null);
  const [approval, setApproval] = useState<AutoplanApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Canvas state
  const [symbols, setSymbols] = useState<PlacedSymbol[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<CanvasViewport>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  const [checklist, setChecklist] = useState<ComplianceChecklist>({
    ...EMPTY_CHECKLIST,
  });

  // Undo/Redo
  const [undoStack, setUndoStack] = useState<PlacedSymbol[][]>([]);
  const [redoStack, setRedoStack] = useState<PlacedSymbol[][]>([]);

  // UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Floor plan signed URL
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);

  const getSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/auth");
      return null;
    }
    return session;
  }, [router]);

  // Fetch plan data
  const fetchPlan = useCallback(async () => {
    const session = await getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/autoplan/plans/${planId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to load plan");

      const data: PlanResponse = await res.json();
      setPlan(data.plan);
      setFloor(data.floor);
      setBuilding(data.building);
      setApproval(data.approval || null);

      setSymbols(data.plan.symbol_data || []);
      setAnnotations(data.plan.annotations || []);
      if (data.plan.canvas_viewport) {
        setViewport(data.plan.canvas_viewport);
      }

      // Generate signed URL for floor plan image
      if (data.floor.storage_path) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("autoplan")
          .createSignedUrl(data.floor.storage_path, 3600);

        if (signedData?.signedUrl) {
          setFloorPlanUrl(signedData.signedUrl);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [planId, getSession]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Auto-detect checklist items when symbols change
  useEffect(() => {
    setChecklist((prev) => ({
      ...prev,
      exits_marked: symbols.some(
        (s) =>
          s.symbolId.includes("exit") || s.symbolId === "assembly_point"
      ),
      doors_labelled: symbols.some((s) => s.symbolId.includes("fire_door")),
      equipment_shown: symbols.some(
        (s) =>
          s.symbolId.includes("extinguisher") ||
          s.symbolId.includes("alarm") ||
          s.symbolId.includes("blanket") ||
          s.symbolId.includes("hose")
      ),
      detection_shown: symbols.some(
        (s) =>
          s.symbolId.includes("detector") ||
          s.symbolId.includes("smoke") ||
          s.symbolId.includes("heat")
      ),
      emergency_lighting_shown: symbols.some(
        (s) => s.symbolId.includes("emergency_light")
      ),
      risers_shown: symbols.some(
        (s) =>
          s.symbolId.includes("riser") ||
          s.symbolId.includes("dry_riser") ||
          s.symbolId.includes("wet_riser")
      ),
    }));
  }, [symbols]);

  // Push undo state and update symbols
  function updateSymbols(newSymbols: PlacedSymbol[]) {
    setUndoStack((prev) => [...prev, symbols]);
    setRedoStack([]);
    setSymbols(newSymbols);
    setHasUnsavedChanges(true);
  }

  function updateAnnotations(newAnnotations: Annotation[]) {
    setAnnotations(newAnnotations);
    setHasUnsavedChanges(true);
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, symbols]);
    setSymbols(prev);
    setHasUnsavedChanges(true);
  }

  function handleRedo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, symbols]);
    setSymbols(next);
    setHasUnsavedChanges(true);
  }

  // Save plan
  async function handleSave() {
    const session = await getSession();
    if (!session) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/autoplan/plans/${planId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          symbol_data: symbols,
          annotations,
          canvas_viewport: viewport,
        }),
      });

      if (!res.ok) throw new Error("Failed to save plan");

      const data = await res.json();
      setPlan(data.plan);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Export PDF
  async function handleExport() {
    const session = await getSession();
    if (!session) return;

    setExporting(true);
    try {
      const res = await fetch(`/api/autoplan/plans/${planId}/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to export plan");

      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  // Approval completed callback
  async function handleApprovalComplete() {
    setShowApprovalModal(false);
    await fetchPlan();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedSymbolId) {
          e.preventDefault();
          updateSymbols(
            symbols.filter((s) => s.instanceId !== selectedSymbolId)
          );
          setSelectedSymbolId(null);
        }
      }
      if (e.key === "Escape") {
        setSelectedSymbolId(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Warn on unsaved changes before leaving
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (loading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "64px",
          right: 0,
          bottom: 0,
          background: "#FCFCFA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "14px",
            color: "#6B7280",
          }}
        >
          Loading editor...
        </span>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "64px",
          right: 0,
          bottom: 0,
          background: "#FCFCFA",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "14px",
            color: "#DC2626",
          }}
        >
          {error}
        </span>
      </div>
    );
  }

  if (!plan || !floor || !building) return null;

  const statusStyle = STATUS_STYLES[plan.status] || STATUS_STYLES.draft;
  const floorLabel = floor.floor_name || `Floor ${floor.floor_number}`;
  const selectedSymbol = selectedSymbolId
    ? symbols.find((s) => s.instanceId === selectedSymbolId) || null
    : null;
  const selectedDefinition = selectedSymbol
    ? SYMBOL_MAP.get(selectedSymbol.symbolId) || null
    : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "64px",
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        background: "#FCFCFA",
        overflow: "hidden",
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          height: "48px",
          minHeight: "48px",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          background: "#FFFFFF",
          borderBottom: "1px solid #E5E7EB",
          gap: "12px",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => {
            if (hasUnsavedChanges) {
              const leave = window.confirm(
                "You have unsaved changes. Leave anyway?"
              );
              if (!leave) return;
            }
            router.push(`/autoplan/${plan.building_id}`);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#6B7280",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#F3F4F6")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <ArrowLeft size={18} />
        </button>

        {/* Plan reference */}
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "14px",
            fontWeight: 600,
            color: "#2A2A2A",
          }}
        >
          {plan.plan_reference}
        </span>

        {/* Floor label */}
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "12px",
            color: "#6B7280",
          }}
        >
          {floorLabel}
        </span>

        {/* Status badge */}
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "11px",
            fontWeight: 600,
            padding: "3px 10px",
            borderRadius: "999px",
            background: statusStyle.bg,
            color: statusStyle.color,
          }}
        >
          {statusStyle.label}
        </span>

        {/* Unsaved indicator */}
        {hasUnsavedChanges && (
          <span
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "11px",
              color: "#F59E0B",
              fontWeight: 500,
            }}
          >
            Unsaved changes
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Undo / Redo */}
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            cursor: undoStack.length === 0 ? "not-allowed" : "pointer",
            color: undoStack.length === 0 ? "#D1D5DB" : "#6B7280",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (undoStack.length > 0)
              e.currentTarget.style.background = "#F3F4F6";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Y)"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            border: "none",
            background: "transparent",
            cursor: redoStack.length === 0 ? "not-allowed" : "pointer",
            color: redoStack.length === 0 ? "#D1D5DB" : "#6B7280",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (redoStack.length > 0)
              e.currentTarget.style.background = "#F3F4F6";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Redo2 size={16} />
        </button>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "24px",
            background: "#E5E7EB",
            margin: "0 4px",
          }}
        />

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "8px",
            border: "none",
            background:
              saving || !hasUnsavedChanges ? "#E5E7EB" : "#0056A7",
            color: saving || !hasUnsavedChanges ? "#9CA3AF" : "#FFFFFF",
            cursor:
              saving || !hasUnsavedChanges ? "not-allowed" : "pointer",
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "13px",
            fontWeight: 500,
            transition: "background 0.15s",
          }}
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save"}
        </button>

        {/* Approve button */}
        <button
          onClick={() => setShowApprovalModal(true)}
          disabled={plan.status === "approved"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "8px",
            border:
              plan.status === "approved"
                ? "1px solid #D1D5DB"
                : "1px solid #16A34A",
            background: "transparent",
            color: plan.status === "approved" ? "#9CA3AF" : "#16A34A",
            cursor: plan.status === "approved" ? "not-allowed" : "pointer",
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "13px",
            fontWeight: 500,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (plan.status !== "approved")
              e.currentTarget.style.background = "rgba(22, 163, 74, 0.06)";
          }}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <CheckCircle2 size={14} />
          {plan.status === "approved" ? "Approved" : "Approve"}
        </button>

        {/* Export PDF button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            background: "transparent",
            color: exporting ? "#9CA3AF" : "#2A2A2A",
            cursor: exporting ? "not-allowed" : "pointer",
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "13px",
            fontWeight: 500,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "#F9FAFB")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Download size={14} />
          {exporting ? "Exporting..." : "Export PDF"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div
          style={{
            padding: "8px 16px",
            background: "#FEE2E2",
            borderBottom: "1px solid #FECACA",
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "12px",
            color: "#991B1B",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "11px",
              color: "#991B1B",
              textDecoration: "underline",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Three-Panel Layout */}
      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Left Panel — Symbol Palette */}
        <div
          style={{
            width: "200px",
            minWidth: "200px",
            borderRight: "1px solid #E5E7EB",
            background: "#FFFFFF",
            overflowY: "auto",
          }}
        >
          <SymbolPalette
            onDragStart={() => {}}
            onSymbolClick={(symbolId: string) => {
              const newSymbol: PlacedSymbol = {
                instanceId: `${symbolId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                symbolId,
                x: 0.5,
                y: 0.5,
                rotation: 0,
                scale: 1,
              };
              updateSymbols([...symbols, newSymbol]);
            }}
          />
        </div>

        {/* Center — Canvas Area */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background: "#F3F4F6",
          }}
        >
          <PlanCanvas
            floorPlanUrl={floorPlanUrl}
            symbols={symbols}
            annotations={annotations}
            selectedSymbolId={selectedSymbolId}
            viewport={viewport}
            onViewportChange={(v: CanvasViewport) => {
              setViewport(v);
              setHasUnsavedChanges(true);
            }}
            onSymbolSelect={(instanceId: string | null) =>
              setSelectedSymbolId(instanceId)
            }
            onSymbolsChange={(newSymbols: PlacedSymbol[]) =>
              updateSymbols(newSymbols)
            }
            onAnnotationsChange={(newAnnotations: Annotation[]) =>
              updateAnnotations(newAnnotations)
            }
            onSave={handleSave}
          />

          {/* Canvas Toolbar Overlay */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10,
            }}
          >
            <CanvasToolbar
              zoom={viewport.zoom}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              selectedSymbolId={selectedSymbolId}
              onZoomIn={() => setViewport((v) => ({ ...v, zoom: Math.min(v.zoom * 1.2, 5) }))}
              onZoomOut={() => setViewport((v) => ({ ...v, zoom: Math.max(v.zoom / 1.2, 0.1) }))}
              onFitToScreen={() => setViewport({ zoom: 1, panX: 0, panY: 0 })}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onDeleteSelected={() => {
                if (selectedSymbolId) {
                  updateSymbols(symbols.filter((s) => s.instanceId !== selectedSymbolId));
                  setSelectedSymbolId(null);
                }
              }}
            />
          </div>
        </div>

        {/* Right Panel — Properties */}
        <div
          style={{
            width: "280px",
            minWidth: "280px",
            borderLeft: "1px solid #E5E7EB",
            background: "#FFFFFF",
            overflowY: "auto",
          }}
        >
          <PropertiesPanel
            selectedSymbol={selectedSymbol}
            symbolDefinition={selectedDefinition}
            aiAnalysis={floor.ai_analysis_result ? {
              confidence: floor.ai_confidence || 0,
              scale: floor.ai_analysis_result.scale || null,
              warnings: floor.ai_analysis_result.warnings || [],
              regulatory_notes: floor.ai_analysis_result.regulatory_notes || [],
              suggested_symbols: floor.ai_analysis_result.suggested_symbols || [],
              elements: floor.ai_analysis_result.elements || { exits: [], fire_doors: [], staircases: [], equipment: [], corridors: [], rooms: [] },
            } : null}
            checklist={checklist}
            onChecklistChange={(newChecklist: ComplianceChecklist) =>
              setChecklist(newChecklist)
            }
            onSymbolUpdate={(updated: PlacedSymbol) => {
              updateSymbols(
                symbols.map((s) =>
                  s.instanceId === updated.instanceId ? updated : s
                )
              );
            }}
            onDeleteSymbol={() => {
              if (selectedSymbolId) {
                updateSymbols(
                  symbols.filter((s) => s.instanceId !== selectedSymbolId)
                );
                setSelectedSymbolId(null);
              }
            }}
          />
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <ApprovalModal
          planId={planId}
          planReference={plan.plan_reference}
          checklist={checklist}
          onClose={() => setShowApprovalModal(false)}
          onApproved={handleApprovalComplete}
        />
      )}
    </div>
  );
}
