/**
 * Wall detector — RANSAC line fitting on floor-slice point clouds.
 * Detects walls as line segments, merges collinear segments, snaps to perpendicular.
 */

import type { PointCloudData, DetectedWall } from "./types";

const RANSAC_ITERATIONS = 200;
const INLIER_THRESHOLD = 0.05; // 5cm tolerance
const MIN_INLIERS = 50;
const MIN_WALL_LENGTH = 0.5; // 500mm minimum
const MERGE_ANGLE_THRESHOLD = 5; // degrees
const MERGE_GAP_THRESHOLD = 0.3; // 30cm max gap
const SNAP_ANGLE = 5; // snap to 90° if within 5°
const DEFAULT_THICKNESS = 100; // 100mm

interface Point2D {
  x: number;
  y: number;
}

interface Line {
  points: Point2D[];
  angle: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function detectWalls(
  data: PointCloudData,
  floorZ: number,
  floorThickness: number = 0.4
): DetectedWall[] {
  // Extract floor-level XY points (slice ±thickness/2 around floor Z, then offset up ~1m for wall level)
  const wallZ = floorZ + 1.2; // sample at ~1.2m above floor (wall height)
  const sliceMin = wallZ - 0.2;
  const sliceMax = wallZ + 0.2;

  const points: Point2D[] = [];
  for (let i = 0; i < data.count; i++) {
    const z = data.positions[i * 3 + 2];
    if (z >= sliceMin && z <= sliceMax) {
      points.push({
        x: data.positions[i * 3],
        y: data.positions[i * 3 + 1],
      });
    }
  }

  if (points.length < MIN_INLIERS) return [];

  // RANSAC line detection
  const lines = ransacDetectLines(points);

  // Merge collinear segments
  const merged = mergeCollinear(lines);

  // Snap to perpendicular
  const snapped = snapPerpendicular(merged);

  // Convert to DetectedWall
  return snapped.map(line => {
    const dx = line.endX - line.startX;
    const dy = line.endY - line.startY;
    const length = Math.sqrt(dx * dx + dy * dy) * 1000; // to mm

    return {
      start_x: Math.round(line.startX * 1000) / 1000,
      start_y: Math.round(line.startY * 1000) / 1000,
      end_x: Math.round(line.endX * 1000) / 1000,
      end_y: Math.round(line.endY * 1000) / 1000,
      thickness_mm: DEFAULT_THICKNESS,
      length_mm: Math.round(length),
      confidence: Math.min(100, Math.round((line.points.length / points.length) * 500)),
    };
  });
}

function ransacDetectLines(points: Point2D[]): Line[] {
  const lines: Line[] = [];
  const remaining = [...points];

  for (let attempt = 0; attempt < 20 && remaining.length > MIN_INLIERS; attempt++) {
    let bestInliers: Point2D[] = [];
    let bestA = 0, bestB = 0, bestC = 0;

    for (let iter = 0; iter < RANSAC_ITERATIONS; iter++) {
      // Pick 2 random points
      const i1 = Math.floor(Math.random() * remaining.length);
      let i2 = Math.floor(Math.random() * (remaining.length - 1));
      if (i2 >= i1) i2++;

      const p1 = remaining[i1];
      const p2 = remaining[i2];

      // Line equation: ax + by + c = 0
      const a = p2.y - p1.y;
      const b = p1.x - p2.x;
      const len = Math.sqrt(a * a + b * b);
      if (len < 1e-6) continue;

      const na = a / len;
      const nb = b / len;
      const nc = -(na * p1.x + nb * p1.y);

      // Count inliers
      const inliers: Point2D[] = [];
      for (const p of remaining) {
        const dist = Math.abs(na * p.x + nb * p.y + nc);
        if (dist < INLIER_THRESHOLD) {
          inliers.push(p);
        }
      }

      if (inliers.length > bestInliers.length) {
        bestInliers = inliers;
        bestA = na;
        bestB = nb;
        bestC = nc;
      }
    }

    if (bestInliers.length < MIN_INLIERS) break;

    // Project inliers onto line to find endpoints
    const dir = { x: -bestB, y: bestA };
    const projections = bestInliers.map(p => p.x * dir.x + p.y * dir.y);
    const minProj = Math.min(...projections);
    const maxProj = Math.max(...projections);

    const origin = { x: -bestA * bestC, y: -bestB * bestC };
    const startX = origin.x + dir.x * minProj + dir.x * (minProj - origin.x * dir.x - origin.y * dir.y);
    const startY = origin.y + dir.y * minProj + dir.y * (minProj - origin.x * dir.x - origin.y * dir.y);

    // Simpler: project along direction
    const refX = bestInliers[0].x;
    const refY = bestInliers[0].y;
    const ts = bestInliers.map(p => (p.x - refX) * dir.x + (p.y - refY) * dir.y);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);

    const line: Line = {
      points: bestInliers,
      angle: Math.atan2(dir.y, dir.x) * 180 / Math.PI,
      startX: refX + dir.x * tMin,
      startY: refY + dir.y * tMin,
      endX: refX + dir.x * tMax,
      endY: refY + dir.y * tMax,
    };

    const length = Math.sqrt(
      (line.endX - line.startX) ** 2 + (line.endY - line.startY) ** 2
    );

    if (length >= MIN_WALL_LENGTH) {
      lines.push(line);
    }

    // Remove inliers from remaining
    const inlierSet = new Set(bestInliers);
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (inlierSet.has(remaining[i])) {
        remaining.splice(i, 1);
      }
    }
  }

  return lines;
}

function mergeCollinear(lines: Line[]): Line[] {
  if (lines.length <= 1) return lines;

  const merged: Line[] = [];
  const used = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;

    let current = { ...lines[i] };
    used.add(i);

    for (let j = i + 1; j < lines.length; j++) {
      if (used.has(j)) continue;

      const angleDiff = Math.abs(normalizeAngle(current.angle - lines[j].angle));
      if (angleDiff > MERGE_ANGLE_THRESHOLD && angleDiff < 180 - MERGE_ANGLE_THRESHOLD) continue;

      // Check gap distance
      const gap = lineGap(current, lines[j]);
      if (gap > MERGE_GAP_THRESHOLD) continue;

      // Merge: extend endpoints
      const allPoints = [...current.points, ...lines[j].points];
      const dir = {
        x: Math.cos(current.angle * Math.PI / 180),
        y: Math.sin(current.angle * Math.PI / 180),
      };

      const refX = allPoints[0].x;
      const refY = allPoints[0].y;
      const ts = allPoints.map(p => (p.x - refX) * dir.x + (p.y - refY) * dir.y);
      const tMin = Math.min(...ts);
      const tMax = Math.max(...ts);

      current = {
        points: allPoints,
        angle: current.angle,
        startX: refX + dir.x * tMin,
        startY: refY + dir.y * tMin,
        endX: refX + dir.x * tMax,
        endY: refY + dir.y * tMax,
      };

      used.add(j);
    }

    merged.push(current);
  }

  return merged;
}

function snapPerpendicular(lines: Line[]): Line[] {
  if (lines.length === 0) return lines;

  // Find dominant angle
  const angles = lines.map(l => normalizeAngle(l.angle));
  const dominant = angles[0]; // strongest line

  return lines.map(line => {
    let angle = normalizeAngle(line.angle);

    // Snap to 0, 90, 180, 270 relative to dominant
    for (const target of [dominant, dominant + 90, dominant - 90, dominant + 180]) {
      const diff = Math.abs(normalizeAngle(angle - target));
      if (diff < SNAP_ANGLE) {
        angle = target;
        break;
      }
    }

    const length = Math.sqrt(
      (line.endX - line.startX) ** 2 + (line.endY - line.startY) ** 2
    );

    const midX = (line.startX + line.endX) / 2;
    const midY = (line.startY + line.endY) / 2;
    const rad = angle * Math.PI / 180;

    return {
      ...line,
      angle,
      startX: midX - Math.cos(rad) * length / 2,
      startY: midY - Math.sin(rad) * length / 2,
      endX: midX + Math.cos(rad) * length / 2,
      endY: midY + Math.sin(rad) * length / 2,
    };
  });
}

function normalizeAngle(a: number): number {
  a = a % 180;
  if (a < 0) a += 180;
  return a;
}

function lineGap(a: Line, b: Line): number {
  const dists = [
    Math.sqrt((a.endX - b.startX) ** 2 + (a.endY - b.startY) ** 2),
    Math.sqrt((a.startX - b.endX) ** 2 + (a.startY - b.endY) ** 2),
    Math.sqrt((a.startX - b.startX) ** 2 + (a.startY - b.startY) ** 2),
    Math.sqrt((a.endX - b.endX) ** 2 + (a.endY - b.endY) ** 2),
  ];
  return Math.min(...dists);
}
