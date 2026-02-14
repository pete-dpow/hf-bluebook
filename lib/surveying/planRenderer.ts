/**
 * Plan layout calculator — transforms wall coordinates to paper space.
 * Shared between PDF and DXF generators.
 */

import type { SurveyWall, PlanLayout, ExportOptions } from "./types";

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A1: { width: 841, height: 594 },
  A3: { width: 420, height: 297 },
  A4: { width: 297, height: 210 },
};

const TITLE_BLOCK_HEIGHT = 40; // mm
const MARGIN = 15; // mm

export function calculateLayout(
  walls: SurveyWall[],
  options: ExportOptions
): PlanLayout {
  if (walls.length === 0) {
    const paper = PAPER_SIZES[options.paper_size] || PAPER_SIZES.A3;
    return {
      paperWidth: paper.width,
      paperHeight: paper.height,
      scale: 100,
      offsetX: 0,
      offsetY: 0,
      walls: [],
      dimensions: [],
    };
  }

  const paper = PAPER_SIZES[options.paper_size] || PAPER_SIZES.A3;

  // Parse scale string (e.g., "1:100" → 100)
  const scaleValue = parseScale(options.scale);

  // Available drawing area in mm
  const drawableWidth = paper.width - 2 * MARGIN;
  const drawableHeight = paper.height - TITLE_BLOCK_HEIGHT - 2 * MARGIN;

  // Find bounding box of all walls (in metres)
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const w of walls) {
    minX = Math.min(minX, w.start_x, w.end_x);
    minY = Math.min(minY, w.start_y, w.end_y);
    maxX = Math.max(maxX, w.start_x, w.end_x);
    maxY = Math.max(maxY, w.start_y, w.end_y);
  }

  // Wall extent in mm at given scale
  const extentX = ((maxX - minX) * 1000) / scaleValue;
  const extentY = ((maxY - minY) * 1000) / scaleValue;

  // Centre on paper
  const offsetX = MARGIN + (drawableWidth - extentX) / 2;
  const offsetY = MARGIN + TITLE_BLOCK_HEIGHT + (drawableHeight - extentY) / 2;

  // Transform walls to paper coordinates
  const paperWalls = walls.map(w => ({
    x1: offsetX + ((w.start_x - minX) * 1000) / scaleValue,
    y1: offsetY + ((w.start_y - minY) * 1000) / scaleValue,
    x2: offsetX + ((w.end_x - minX) * 1000) / scaleValue,
    y2: offsetY + ((w.end_y - minY) * 1000) / scaleValue,
    length_mm: w.length_mm,
  }));

  // Generate dimension lines (offset from wall by 8mm)
  const dimensions = paperWalls.map(w => {
    const dx = w.x2 - w.x1;
    const dy = w.y2 - w.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return null;

    // Perpendicular offset
    const nx = -dy / len * 8;
    const ny = dx / len * 8;

    return {
      x1: w.x1 + nx,
      y1: w.y1 + ny,
      x2: w.x2 + nx,
      y2: w.y2 + ny,
      label: `${Math.round(w.length_mm)}`,
    };
  }).filter((d): d is NonNullable<typeof d> => d !== null);

  return {
    paperWidth: paper.width,
    paperHeight: paper.height,
    scale: scaleValue,
    offsetX,
    offsetY,
    walls: paperWalls,
    dimensions,
  };
}

function parseScale(scale: string): number {
  const match = scale.match(/1:(\d+)/);
  return match ? parseInt(match[1], 10) : 100;
}
