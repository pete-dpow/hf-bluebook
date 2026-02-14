"use client";

import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Trash2 } from "lucide-react";

interface CanvasToolbarProps {
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  selectedSymbolId: string | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
}

function ToolbarButton({
  onClick,
  disabled = false,
  title,
  danger = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        borderRadius: 4,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        color: danger && !disabled ? "#EF4444" : "#FFFFFF",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Separator() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: "rgba(255,255,255,0.2)",
        margin: "0 4px",
      }}
    />
  );
}

export default function CanvasToolbar({
  zoom,
  canUndo,
  canRedo,
  selectedSymbolId,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onUndo,
  onRedo,
  onDeleteSelected,
}: CanvasToolbarProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "4px 8px",
        background: "rgba(31, 41, 55, 0.9)",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        zIndex: 10,
      }}
    >
      <ToolbarButton onClick={onZoomIn} title="Zoom in">
        <ZoomIn size={18} />
      </ToolbarButton>

      <span
        style={{
          color: "#D1D5DB",
          fontSize: 12,
          fontFamily: "'IBM Plex Sans', sans-serif",
          minWidth: 40,
          textAlign: "center",
          userSelect: "none",
        }}
      >
        {Math.round(zoom * 100)}%
      </span>

      <ToolbarButton onClick={onZoomOut} title="Zoom out">
        <ZoomOut size={18} />
      </ToolbarButton>

      <ToolbarButton onClick={onFitToScreen} title="Fit to screen">
        <Maximize2 size={18} />
      </ToolbarButton>

      <Separator />

      <ToolbarButton onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={18} />
      </ToolbarButton>

      <ToolbarButton onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
        <Redo2 size={18} />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={onDeleteSelected}
        disabled={!selectedSymbolId}
        title="Delete selected (Del)"
        danger
      >
        <Trash2 size={18} />
      </ToolbarButton>
    </div>
  );
}
