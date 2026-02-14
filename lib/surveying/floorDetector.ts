/**
 * Floor detector — Z-histogram analysis to find floor levels in point cloud data.
 * Uses 5cm bins, Gaussian smoothing, and local maxima detection.
 */

import type { PointCloudData, DetectedFloor } from "./types";

const BIN_SIZE = 0.05; // 5cm bins
const GAUSSIAN_SIGMA = 3; // smoothing kernel width
const MIN_PEAK_RATIO = 0.02; // peak must be >2% of max bin
const FLOOR_SEPARATION = 2.0; // minimum 2m between floors
const FLOOR_THICKNESS = 0.4; // 40cm range around detected z

export function detectFloors(data: PointCloudData): DetectedFloor[] {
  const { positions, count, bounds } = data;
  const zMin = bounds.min.z;
  const zMax = bounds.max.z;
  const zRange = zMax - zMin;

  if (zRange < 0.5) return []; // too flat

  const binCount = Math.ceil(zRange / BIN_SIZE) + 1;
  const histogram = new Float64Array(binCount);

  // Build Z histogram
  for (let i = 0; i < count; i++) {
    const z = positions[i * 3 + 2];
    const bin = Math.floor((z - zMin) / BIN_SIZE);
    if (bin >= 0 && bin < binCount) {
      histogram[bin]++;
    }
  }

  // Gaussian smooth
  const smoothed = gaussianSmooth(histogram, GAUSSIAN_SIGMA);

  // Find max value
  let maxVal = 0;
  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] > maxVal) maxVal = smoothed[i];
  }

  // Find local maxima
  const threshold = maxVal * MIN_PEAK_RATIO;
  const peaks: { bin: number; value: number }[] = [];

  for (let i = 1; i < smoothed.length - 1; i++) {
    if (smoothed[i] > threshold &&
        smoothed[i] >= smoothed[i - 1] &&
        smoothed[i] >= smoothed[i + 1]) {
      peaks.push({ bin: i, value: smoothed[i] });
    }
  }

  // Sort by value (strongest peaks first)
  peaks.sort((a, b) => b.value - a.value);

  // Filter peaks with minimum separation
  const selectedPeaks: { bin: number; value: number }[] = [];
  for (const peak of peaks) {
    const z = zMin + peak.bin * BIN_SIZE;
    const tooClose = selectedPeaks.some(p => {
      const pz = zMin + p.bin * BIN_SIZE;
      return Math.abs(z - pz) < FLOOR_SEPARATION;
    });
    if (!tooClose) {
      selectedPeaks.push(peak);
    }
  }

  // Sort by height (lowest first)
  selectedPeaks.sort((a, b) => a.bin - b.bin);

  // Build floor objects
  const floors: DetectedFloor[] = selectedPeaks.map((peak, idx) => {
    const z = zMin + peak.bin * BIN_SIZE;
    const confidence = Math.min(100, (peak.value / maxVal) * 100);

    // Count points in floor range
    const rangeMin = z - FLOOR_THICKNESS / 2;
    const rangeMax = z + FLOOR_THICKNESS / 2;
    let pointCount = 0;
    for (let i = 0; i < count; i++) {
      const pz = positions[i * 3 + 2];
      if (pz >= rangeMin && pz <= rangeMax) pointCount++;
    }

    return {
      label: getFloorLabel(idx, selectedPeaks.length),
      z_height_m: Math.round(z * 1000) / 1000,
      z_range_min: Math.round(rangeMin * 1000) / 1000,
      z_range_max: Math.round(rangeMax * 1000) / 1000,
      point_count: pointCount,
      confidence: Math.round(confidence * 100) / 100,
      sort_order: idx,
    };
  });

  return floors;
}

function gaussianSmooth(data: Float64Array, sigma: number): Float64Array {
  const kernelRadius = Math.ceil(sigma * 3);
  const kernel: number[] = [];
  let kernelSum = 0;

  for (let i = -kernelRadius; i <= kernelRadius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    kernelSum += v;
  }

  // Normalize
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= kernelSum;
  }

  const result = new Float64Array(data.length);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    for (let k = 0; k < kernel.length; k++) {
      const idx = i + k - kernelRadius;
      if (idx >= 0 && idx < data.length) {
        sum += data[idx] * kernel[k];
      }
    }
    result[i] = sum;
  }

  return result;
}

function getFloorLabel(index: number, total: number): string {
  if (total <= 1) return "Ground Floor";

  // UK floor naming convention
  const labels = [
    "Basement 2", "Basement 1", "Ground Floor",
    "First Floor", "Second Floor", "Third Floor",
    "Fourth Floor", "Fifth Floor", "Sixth Floor",
    "Seventh Floor", "Eighth Floor", "Ninth Floor",
  ];

  // Heuristic: assume lowest is ground if only a few floors, otherwise guess basement
  if (index === 0 && total <= 4) return "Ground Floor";
  if (index === 0 && total > 4) return "Basement 1";

  const startIdx = total > 4 ? 1 : 2; // offset if we have basements
  const labelIdx = startIdx + index;
  return labelIdx < labels.length ? labels[labelIdx] : `Level ${index}`;
}
