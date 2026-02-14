"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type {
  PlacedSymbol,
  Annotation,
  CanvasViewport,
} from "@/lib/autoplan/types";
import { SYMBOL_MAP, drawSymbolOnCanvas } from "@/lib/autoplan/symbols";

interface PlanCanvasProps {
  floorPlanUrl: string | null;
  symbols: PlacedSymbol[];
  annotations: Annotation[];
  selectedSymbolId: string | null;
  viewport: CanvasViewport;
  onSymbolsChange: (symbols: PlacedSymbol[]) => void;
  onAnnotationsChange: (annotations: Annotation[]) => void;
  onSymbolSelect: (instanceId: string | null) => void;
  onViewportChange: (viewport: CanvasViewport) => void;
  onSave: () => void;
}

const MAX_UNDO = 50;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;

export default function PlanCanvas({
  floorPlanUrl,
  symbols,
  annotations,
  selectedSymbolId,
  viewport,
  onSymbolsChange,
  onAnnotationsChange,
  onSymbolSelect,
  onViewportChange,
  onSave,
}: PlanCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const floorPlanImgRef = useRef<HTMLImageElement | null>(null);
  const floorPlanLoadedRef = useRef(false);
  const animFrameRef = useRef<number>(0);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; origX: number; origY: number } | null>(null);
  const dragInstanceRef = useRef<string | null>(null);

  // Pan state (middle mouse)
  const [panning, setPanning] = useState(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; panX: number; panY: number } | null>(null);

  // Undo/redo
  const undoStackRef = useRef<PlacedSymbol[][]>([]);
  const redoStackRef = useRef<PlacedSymbol[][]>([]);

  // Keep latest refs for use in animation frame
  const symbolsRef = useRef(symbols);
  const annotationsRef = useRef(annotations);
  const viewportRef = useRef(viewport);
  const selectedRef = useRef(selectedSymbolId);

  useEffect(() => { symbolsRef.current = symbols; }, [symbols]);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  useEffect(() => { selectedRef.current = selectedSymbolId; }, [selectedSymbolId]);

  // ─── Undo helpers ──────────────────────────────────────
  const pushUndo = useCallback(() => {
    undoStackRef.current = [
      ...undoStackRef.current.slice(-(MAX_UNDO - 1)),
      structuredClone(symbolsRef.current),
    ];
    redoStackRef.current = [];
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    redoStackRef.current = [...redoStackRef.current, structuredClone(symbolsRef.current)];
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    onSymbolsChange(prev);
  }, [onSymbolsChange]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    undoStackRef.current = [...undoStackRef.current, structuredClone(symbolsRef.current)];
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    onSymbolsChange(next);
  }, [onSymbolsChange]);

  // ─── Load floor plan image ─────────────────────────────
  useEffect(() => {
    if (!floorPlanUrl) {
      floorPlanImgRef.current = null;
      floorPlanLoadedRef.current = false;
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      floorPlanImgRef.current = img;
      floorPlanLoadedRef.current = true;
    };
    img.onerror = () => {
      floorPlanImgRef.current = null;
      floorPlanLoadedRef.current = false;
    };
    img.src = floorPlanUrl;
  }, [floorPlanUrl]);

  // ─── Canvas resize ─────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctxRef.current = ctx;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ─── Floor plan dimensions helper ──────────────────────
  const getFloorPlanRect = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !floorPlanImgRef.current || !floorPlanLoadedRef.current) return null;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const img = floorPlanImgRef.current;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = cw / ch;
    let drawW: number, drawH: number;
    if (imgAspect > canvasAspect) {
      drawW = cw;
      drawH = cw / imgAspect;
    } else {
      drawH = ch;
      drawW = ch * imgAspect;
    }
    return { x: 0, y: 0, width: drawW, height: drawH };
  }, []);

  // ─── Render loop ───────────────────────────────────────
  useEffect(() => {
    const render = () => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      const vp = viewportRef.current;

      // Clear
      ctx.clearRect(0, 0, cw, ch);

      // Apply viewport transform
      ctx.save();
      ctx.translate(vp.panX, vp.panY);
      ctx.scale(vp.zoom, vp.zoom);

      // Draw floor plan
      const fpRect = getFloorPlanRect();
      if (floorPlanImgRef.current && floorPlanLoadedRef.current && fpRect) {
        ctx.drawImage(floorPlanImgRef.current, fpRect.x, fpRect.y, fpRect.width, fpRect.height);
      } else {
        // Placeholder when no image
        ctx.fillStyle = "#2a2a3e";
        ctx.fillRect(0, 0, cw, ch);
        ctx.fillStyle = "#6b7280";
        ctx.font = "16px 'IBM Plex Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No floor plan loaded", cw / 2, ch / 2);
      }

      // Draw annotations
      const syms = symbolsRef.current;
      const annots = annotationsRef.current;
      const sel = selectedRef.current;

      if (fpRect) {
        for (const ann of annots) {
          const ax = ann.x * fpRect.width + fpRect.x;
          const ay = ann.y * fpRect.height + fpRect.y;

          if (ann.type === "text" && ann.text) {
            ctx.fillStyle = "#1F2937";
            ctx.font = `${ann.fontSize || 14}px 'IBM Plex Sans', sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(ann.text, ax, ay);
          } else if (ann.type === "travel_distance" && ann.endX != null && ann.endY != null) {
            const ex = ann.endX * fpRect.width + fpRect.x;
            const ey = ann.endY * fpRect.height + fpRect.y;
            ctx.setLineDash([6, 4]);
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.setLineDash([]);
            // Label
            if (ann.distanceMetres != null) {
              const midX = (ax + ex) / 2;
              const midY = (ay + ey) / 2;
              ctx.fillStyle = "#F59E0B";
              ctx.font = "12px 'IBM Plex Sans', sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "bottom";
              ctx.fillText(`${ann.distanceMetres}m`, midX, midY - 4);
            }
          } else if (ann.type === "arrow" && ann.endX != null && ann.endY != null) {
            const ex = ann.endX * fpRect.width + fpRect.x;
            const ey = ann.endY * fpRect.height + fpRect.y;
            ctx.strokeStyle = "#DC2626";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            // Arrowhead
            const angle = Math.atan2(ey - ay, ex - ax);
            const headLen = 10;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
            ctx.stroke();
          } else if (ann.type === "zone" && ann.width != null && ann.height != null) {
            const zw = ann.width * fpRect.width;
            const zh = ann.height * fpRect.height;
            const zoneColors: Record<string, string> = {
              compartment: "rgba(220, 38, 38, 0.15)",
              protected_corridor: "rgba(37, 99, 235, 0.15)",
              stairwell: "rgba(22, 163, 74, 0.15)",
            };
            const zoneBorders: Record<string, string> = {
              compartment: "#DC2626",
              protected_corridor: "#2563EB",
              stairwell: "#16A34A",
            };
            const zt = ann.zoneType || "compartment";
            ctx.fillStyle = zoneColors[zt] || zoneColors.compartment;
            ctx.fillRect(ax, ay, zw, zh);
            ctx.strokeStyle = zoneBorders[zt] || zoneBorders.compartment;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(ax, ay, zw, zh);
            ctx.setLineDash([]);
          }
        }

        // Draw symbols
        for (const sym of syms) {
          const def = SYMBOL_MAP.get(sym.symbolId);
          if (!def) continue;
          const sx = sym.x * fpRect.width + fpRect.x;
          const sy = sym.y * fpRect.height + fpRect.y;
          const isSelected = sel === sym.instanceId;
          drawSymbolOnCanvas(ctx, def, sx, sy, sym.scale, sym.rotation, isSelected);

          // Draw label below symbol if present
          if (sym.label) {
            ctx.fillStyle = "#1F2937";
            ctx.font = "10px 'IBM Plex Sans', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            const labelY = sy + (Math.max(def.defaultWidth, def.defaultHeight) * sym.scale) / 2 + 4;
            ctx.fillText(sym.label, sx, labelY);
          }
        }
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [getFloorPlanRect]);

  // ─── Hit test ──────────────────────────────────────────
  const hitTestSymbol = useCallback(
    (clientX: number, clientY: number): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const vp = viewportRef.current;
      const fpRect = getFloorPlanRect();
      if (!fpRect) return null;

      // Transform mouse to world coords
      const worldX = (mx - vp.panX) / vp.zoom;
      const worldY = (my - vp.panY) / vp.zoom;

      // Iterate in reverse so top-most symbols are hit first
      const syms = symbolsRef.current;
      for (let i = syms.length - 1; i >= 0; i--) {
        const sym = syms[i];
        const def = SYMBOL_MAP.get(sym.symbolId);
        if (!def) continue;
        const sx = sym.x * fpRect.width + fpRect.x;
        const sy = sym.y * fpRect.height + fpRect.y;
        const halfW = (def.defaultWidth * sym.scale) / 2 + 4;
        const halfH = (def.defaultHeight * sym.scale) / 2 + 4;
        if (
          worldX >= sx - halfW &&
          worldX <= sx + halfW &&
          worldY >= sy - halfH &&
          worldY <= sy + halfH
        ) {
          return sym.instanceId;
        }
      }
      return null;
    },
    [getFloorPlanRect]
  );

  // ─── Mouse to normalised coords ───────────────────────
  const mouseToNormalised = useCallback(
    (clientX: number, clientY: number): { nx: number; ny: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const vp = viewportRef.current;
      const fpRect = getFloorPlanRect();
      if (!fpRect || fpRect.width === 0 || fpRect.height === 0) return null;

      const worldX = (mx - vp.panX) / vp.zoom;
      const worldY = (my - vp.panY) / vp.zoom;
      const nx = (worldX - fpRect.x) / fpRect.width;
      const ny = (worldY - fpRect.y) / fpRect.height;
      return { nx: Math.max(0, Math.min(1, nx)), ny: Math.max(0, Math.min(1, ny)) };
    },
    [getFloorPlanRect]
  );

  // ─── Mouse handlers ────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Middle mouse for panning
      if (e.button === 1) {
        e.preventDefault();
        setPanning(true);
        panStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          panX: viewportRef.current.panX,
          panY: viewportRef.current.panY,
        };
        return;
      }

      if (e.button !== 0) return;

      const hitId = hitTestSymbol(e.clientX, e.clientY);
      onSymbolSelect(hitId);

      if (hitId) {
        const sym = symbolsRef.current.find((s) => s.instanceId === hitId);
        if (sym) {
          setDragging(true);
          dragInstanceRef.current = hitId;
          dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            origX: sym.x,
            origY: sym.y,
          };
        }
      }
    },
    [hitTestSymbol, onSymbolSelect]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Panning
      if (panning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        onViewportChange({
          ...viewportRef.current,
          panX: panStartRef.current.panX + dx,
          panY: panStartRef.current.panY + dy,
        });
        return;
      }

      // Dragging symbol
      if (dragging && dragInstanceRef.current && dragStartRef.current) {
        const fpRect = getFloorPlanRect();
        if (!fpRect || fpRect.width === 0 || fpRect.height === 0) return;

        const vp = viewportRef.current;
        const dx = (e.clientX - dragStartRef.current.mouseX) / vp.zoom;
        const dy = (e.clientY - dragStartRef.current.mouseY) / vp.zoom;
        const newNX = Math.max(0, Math.min(1, dragStartRef.current.origX + dx / fpRect.width));
        const newNY = Math.max(0, Math.min(1, dragStartRef.current.origY + dy / fpRect.height));

        const updated = symbolsRef.current.map((s) =>
          s.instanceId === dragInstanceRef.current ? { ...s, x: newNX, y: newNY } : s
        );
        onSymbolsChange(updated);
      }
    },
    [dragging, panning, getFloorPlanRect, onSymbolsChange, onViewportChange]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (panning) {
        setPanning(false);
        panStartRef.current = null;
        return;
      }
      if (dragging && dragInstanceRef.current) {
        // Push undo only if actually moved
        const ds = dragStartRef.current;
        const sym = symbolsRef.current.find((s) => s.instanceId === dragInstanceRef.current);
        if (ds && sym && (Math.abs(sym.x - ds.origX) > 0.001 || Math.abs(sym.y - ds.origY) > 0.001)) {
          // We push the pre-drag state onto undo
          const preDrag = symbolsRef.current.map((s) =>
            s.instanceId === dragInstanceRef.current ? { ...s, x: ds.origX, y: ds.origY } : s
          );
          undoStackRef.current = [
            ...undoStackRef.current.slice(-(MAX_UNDO - 1)),
            preDrag,
          ];
          redoStackRef.current = [];
        }
        setDragging(false);
        dragInstanceRef.current = null;
        dragStartRef.current = null;
      }
    },
    [dragging, panning]
  );

  // ─── Wheel (zoom) ─────────────────────────────────────
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const vp = viewportRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vp.zoom * zoomFactor));

      // Zoom centered on cursor
      const newPanX = mx - (mx - vp.panX) * (newZoom / vp.zoom);
      const newPanY = my - (my - vp.panY) * (newZoom / vp.zoom);

      onViewportChange({ zoom: newZoom, panX: newPanX, panY: newPanY });
    },
    [onViewportChange]
  );

  // ─── Drop handler (palette drag-drop) ──────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const symbolId = e.dataTransfer.getData("text/plain");
      if (!symbolId || !SYMBOL_MAP.has(symbolId)) return;

      const norm = mouseToNormalised(e.clientX, e.clientY);
      if (!norm) return;

      pushUndo();
      const newSymbol: PlacedSymbol = {
        instanceId: crypto.randomUUID(),
        symbolId,
        x: norm.nx,
        y: norm.ny,
        rotation: 0,
        scale: 1.0,
      };
      onSymbolsChange([...symbolsRef.current, newSymbol]);
      onSymbolSelect(newSymbol.instanceId);
    },
    [mouseToNormalised, pushUndo, onSymbolsChange, onSymbolSelect]
  );

  // ─── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't intercept if typing in an input
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const sel = selectedRef.current;

      // Ctrl+S: save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
        return;
      }

      // Ctrl+Z: undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete / Backspace: delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && sel) {
        e.preventDefault();
        pushUndo();
        onSymbolsChange(symbolsRef.current.filter((s) => s.instanceId !== sel));
        onSymbolSelect(null);
        return;
      }

      // R: rotate selected by 45 degrees
      if (e.key === "r" && sel) {
        pushUndo();
        onSymbolsChange(
          symbolsRef.current.map((s) =>
            s.instanceId === sel ? { ...s, rotation: (s.rotation + 45) % 360 } : s
          )
        );
        return;
      }

      // + or =: increase scale
      if ((e.key === "+" || e.key === "=") && sel) {
        pushUndo();
        onSymbolsChange(
          symbolsRef.current.map((s) =>
            s.instanceId === sel
              ? { ...s, scale: Math.round((s.scale + 0.1) * 10) / 10 }
              : s
          )
        );
        return;
      }

      // -: decrease scale (min 0.3)
      if (e.key === "-" && sel) {
        pushUndo();
        onSymbolsChange(
          symbolsRef.current.map((s) =>
            s.instanceId === sel
              ? { ...s, scale: Math.max(0.3, Math.round((s.scale - 0.1) * 10) / 10) }
              : s
          )
        );
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, onSymbolsChange, onSymbolSelect, pushUndo, undo, redo]);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        background: "#1a1a2e",
        borderRadius: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          cursor: panning ? "grabbing" : dragging ? "move" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
