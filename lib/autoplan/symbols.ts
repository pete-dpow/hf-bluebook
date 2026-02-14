// lib/autoplan/symbols.ts — BS 5499 / ISO 7010 fire safety symbol definitions

import type { SymbolDefinition, SymbolCategory } from "./types";

export const SYMBOL_DEFINITIONS: SymbolDefinition[] = [
  // ── Escape symbols (green) ───────────────────────────
  {
    id: "fire_exit",
    label: "Fire Exit",
    shortLabel: "EXIT",
    category: "escape",
    color: "#FFFFFF",
    bgColor: "#16A34A",
    bsReference: "ISO 7010 E001/E002",
    defaultWidth: 40,
    defaultHeight: 24,
  },
  {
    id: "fire_exit_left",
    label: "Fire Exit (Left)",
    shortLabel: "← EXIT",
    category: "escape",
    color: "#FFFFFF",
    bgColor: "#16A34A",
    bsReference: "ISO 7010 E001",
    defaultWidth: 40,
    defaultHeight: 24,
  },
  {
    id: "fire_exit_right",
    label: "Fire Exit (Right)",
    shortLabel: "EXIT →",
    category: "escape",
    color: "#FFFFFF",
    bgColor: "#16A34A",
    bsReference: "ISO 7010 E002",
    defaultWidth: 40,
    defaultHeight: 24,
  },
  {
    id: "assembly_point",
    label: "Assembly Point",
    shortLabel: "AP",
    category: "escape",
    color: "#FFFFFF",
    bgColor: "#16A34A",
    bsReference: "ISO 7010 E007",
    defaultWidth: 32,
    defaultHeight: 32,
  },

  // ── Equipment symbols (red) ──────────────────────────
  {
    id: "fire_extinguisher",
    label: "Fire Extinguisher",
    shortLabel: "FE",
    category: "equipment",
    color: "#FFFFFF",
    bgColor: "#DC2626",
    bsReference: "ISO 7010 F001",
    defaultWidth: 24,
    defaultHeight: 24,
  },
  {
    id: "fire_hose_reel",
    label: "Fire Hose Reel",
    shortLabel: "HR",
    category: "equipment",
    color: "#FFFFFF",
    bgColor: "#DC2626",
    bsReference: "ISO 7010 F002",
    defaultWidth: 24,
    defaultHeight: 24,
  },
  {
    id: "fire_alarm_cp",
    label: "Fire Alarm Call Point",
    shortLabel: "CP",
    category: "equipment",
    color: "#FFFFFF",
    bgColor: "#DC2626",
    bsReference: "ISO 7010 F005",
    defaultWidth: 24,
    defaultHeight: 24,
  },
  {
    id: "fire_blanket",
    label: "Fire Blanket",
    shortLabel: "FB",
    category: "equipment",
    color: "#FFFFFF",
    bgColor: "#DC2626",
    bsReference: "ISO 7010 F016",
    defaultWidth: 24,
    defaultHeight: 24,
  },
  {
    id: "dry_riser_inlet",
    label: "Dry Riser Inlet",
    shortLabel: "D",
    category: "equipment",
    color: "#FFFFFF",
    bgColor: "#DC2626",
    bsReference: "BS 5499-5",
    defaultWidth: 28,
    defaultHeight: 28,
  },
  {
    id: "wet_riser_outlet",
    label: "Wet Riser Outlet",
    shortLabel: "W",
    category: "equipment",
    color: "#FFFFFF",
    bgColor: "#DC2626",
    bsReference: "BS 5499-5",
    defaultWidth: 28,
    defaultHeight: 28,
  },

  // ── Door symbols (blue) ──────────────────────────────
  {
    id: "fire_door_fd30",
    label: "Fire Door FD30",
    shortLabel: "FD30",
    category: "doors",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    bsReference: "BS 8214",
    defaultWidth: 36,
    defaultHeight: 20,
  },
  {
    id: "fire_door_fd60",
    label: "Fire Door FD60",
    shortLabel: "FD60",
    category: "doors",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    bsReference: "BS 8214",
    defaultWidth: 36,
    defaultHeight: 20,
  },
  {
    id: "fire_door_fd90",
    label: "Fire Door FD90",
    shortLabel: "FD90",
    category: "doors",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    bsReference: "BS 8214",
    defaultWidth: 36,
    defaultHeight: 20,
  },
  {
    id: "fire_door_fd120",
    label: "Fire Door FD120",
    shortLabel: "FD120",
    category: "doors",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    bsReference: "BS 8214",
    defaultWidth: 40,
    defaultHeight: 20,
  },

  // ── Detection symbols (blue) ─────────────────────────
  {
    id: "smoke_detector",
    label: "Smoke Detector",
    shortLabel: "S",
    category: "detection",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    bsReference: "BS 5839-1",
    defaultWidth: 24,
    defaultHeight: 24,
  },
  {
    id: "heat_detector",
    label: "Heat Detector",
    shortLabel: "H",
    category: "detection",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    bsReference: "BS 5839-1",
    defaultWidth: 24,
    defaultHeight: 24,
  },

  // ── Suppression symbols (blue) ───────────────────────
  {
    id: "sprinkler_head",
    label: "Sprinkler Head",
    shortLabel: "SP",
    category: "suppression",
    color: "#FFFFFF",
    bgColor: "#2563EB",
    bsReference: "BS EN 12845",
    defaultWidth: 24,
    defaultHeight: 24,
  },

  // ── Lighting symbols (green) ─────────────────────────
  {
    id: "emergency_light",
    label: "Emergency Light",
    shortLabel: "EL",
    category: "lighting",
    color: "#FFFFFF",
    bgColor: "#16A34A",
    bsReference: "BS 5266-1",
    defaultWidth: 28,
    defaultHeight: 20,
  },
];

export const SYMBOL_MAP = new Map(
  SYMBOL_DEFINITIONS.map((s) => [s.id, s])
);

export const SYMBOL_CATEGORIES: { key: SymbolCategory; label: string }[] = [
  { key: "escape", label: "Escape" },
  { key: "equipment", label: "Equipment" },
  { key: "doors", label: "Fire Doors" },
  { key: "detection", label: "Detection" },
  { key: "suppression", label: "Suppression" },
  { key: "lighting", label: "Lighting" },
];

export function getSymbolsByCategory(category: SymbolCategory): SymbolDefinition[] {
  return SYMBOL_DEFINITIONS.filter((s) => s.category === category);
}

/**
 * Draw a symbol on a 2D canvas context at the given position.
 * Used both for the palette preview and for rendering placed symbols on the plan canvas.
 */
export function drawSymbolOnCanvas(
  ctx: CanvasRenderingContext2D,
  symbol: SymbolDefinition,
  x: number,
  y: number,
  scale: number = 1,
  rotation: number = 0,
  selected: boolean = false
): void {
  const w = symbol.defaultWidth * scale;
  const h = symbol.defaultHeight * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);

  // Background
  const isCircular = ["smoke_detector", "heat_detector", "dry_riser_inlet", "wet_riser_outlet", "assembly_point"].includes(symbol.id);

  if (isCircular) {
    const r = Math.max(w, h) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = symbol.bgColor;
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = symbol.bgColor;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 3);
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Label text
  ctx.fillStyle = symbol.color;
  ctx.font = `bold ${Math.max(9, 11 * scale)}px 'IBM Plex Sans', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol.shortLabel, 0, 0);

  ctx.restore();
}
