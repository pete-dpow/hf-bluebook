"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import type { SurveyWall } from "@/lib/surveying/types";

interface FloorPlanViewerProps {
  walls: SurveyWall[];
  floorLabel: string;
}

const WALL_COLOR = "#2A2A2A";
const DIM_COLOR = "#6B7280";
const GRID_COLOR = "#E5E7EB";
const NORTH_COLOR = "#0056a7";

export default function FloorPlanViewer({ walls, floorLabel }: FloorPlanViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Calculate view bounds from walls
  useEffect(() => {
    if (walls.length === 0) {
      setViewBox({ x: -5, y: -5, w: 10, h: 10 });
      return;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const w of walls) {
      minX = Math.min(minX, w.start_x, w.end_x);
      minY = Math.min(minY, w.start_y, w.end_y);
      maxX = Math.max(maxX, w.start_x, w.end_x);
      maxY = Math.max(maxY, w.start_y, w.end_y);
    }

    const padding = Math.max(maxX - minX, maxY - minY) * 0.15;
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      w: maxX - minX + 2 * padding,
      h: maxY - minY + 2 * padding,
    });
  }, [walls]);

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const mouseY = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;

    const newW = viewBox.w * factor;
    const newH = viewBox.h * factor;
    const newX = mouseX - (mouseX - viewBox.x) * factor;
    const newY = mouseY - (mouseY - viewBox.y) * factor;

    setViewBox({ x: newX, y: newY, w: newW, h: newH });
  }, [viewBox]);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - panStart.x) / rect.width) * viewBox.w;
    const dy = ((e.clientY - panStart.y) / rect.height) * viewBox.h;
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, viewBox]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Grid spacing (1m in world coords)
  const gridSpacing = 1;
  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let x = Math.floor(viewBox.x / gridSpacing) * gridSpacing; x < viewBox.x + viewBox.w; x += gridSpacing) {
    gridLines.push({ x1: x, y1: viewBox.y, x2: x, y2: viewBox.y + viewBox.h });
  }
  for (let y = Math.floor(viewBox.y / gridSpacing) * gridSpacing; y < viewBox.y + viewBox.h; y += gridSpacing) {
    gridLines.push({ x1: viewBox.x, y1: y, x2: viewBox.x + viewBox.w, y2: y });
  }

  const strokeWidth = viewBox.w / 500;
  const fontSize = viewBox.w / 60;

  return (
    <div className="w-full h-full bg-white relative" style={{ minHeight: "400px" }}>
      {walls.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            No walls detected for this floor
          </p>
        </div>
      ) : (
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          {/* Grid */}
          {gridLines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={GRID_COLOR} strokeWidth={strokeWidth * 0.3} />
          ))}

          {/* Walls */}
          {walls.map((w, i) => (
            <g key={i}>
              <line
                x1={w.start_x} y1={w.start_y}
                x2={w.end_x} y2={w.end_y}
                stroke={WALL_COLOR}
                strokeWidth={strokeWidth * 3}
                strokeLinecap="round"
              />
              {/* Dimension label */}
              <text
                x={(w.start_x + w.end_x) / 2}
                y={(w.start_y + w.end_y) / 2 - fontSize * 0.5}
                fill={DIM_COLOR}
                fontSize={fontSize * 0.8}
                textAnchor="middle"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                {Math.round(w.length_mm)}
              </text>
            </g>
          ))}

          {/* North arrow */}
          <g transform={`translate(${viewBox.x + viewBox.w * 0.93}, ${viewBox.y + viewBox.h * 0.08})`}>
            <line x1={0} y1={fontSize * 2} x2={0} y2={-fontSize * 2}
              stroke={NORTH_COLOR} strokeWidth={strokeWidth * 2} />
            <polygon
              points={`0,${-fontSize * 2} ${-fontSize * 0.6},${-fontSize * 0.8} ${fontSize * 0.6},${-fontSize * 0.8}`}
              fill={NORTH_COLOR}
            />
            <text x={0} y={-fontSize * 2.5} fill={NORTH_COLOR} fontSize={fontSize}
              textAnchor="middle" fontWeight="bold" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              N
            </text>
          </g>

          {/* Scale reference (bottom-left) */}
          <g transform={`translate(${viewBox.x + viewBox.w * 0.05}, ${viewBox.y + viewBox.h * 0.95})`}>
            <line x1={0} y1={0} x2={1} y2={0}
              stroke={WALL_COLOR} strokeWidth={strokeWidth * 2} />
            <line x1={0} y1={-fontSize * 0.3} x2={0} y2={fontSize * 0.3}
              stroke={WALL_COLOR} strokeWidth={strokeWidth} />
            <line x1={1} y1={-fontSize * 0.3} x2={1} y2={fontSize * 0.3}
              stroke={WALL_COLOR} strokeWidth={strokeWidth} />
            <text x={0.5} y={fontSize * 1.2} fill={DIM_COLOR} fontSize={fontSize * 0.7}
              textAnchor="middle" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              1m
            </text>
          </g>
        </svg>
      )}

      {/* Floor label overlay */}
      <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 rounded-lg border border-[#E5E7EB]">
        <p className="text-xs font-medium" style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A" }}>
          {floorLabel}
        </p>
      </div>
    </div>
  );
}
