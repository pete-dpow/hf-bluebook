/**
 * LAS/LAZ parser — wraps @loaders.gl/las to return typed PointCloudData.
 * Supports LAS 1.0–1.3 and LAZ compressed files.
 */

import { load } from "@loaders.gl/core";
import { LASLoader } from "@loaders.gl/las";
import type { PointCloudData } from "./types";

export async function parseLasFile(buffer: ArrayBuffer): Promise<PointCloudData> {
  const data = await load(buffer, LASLoader, {
    las: { fp64: false, skip: 1, colorDepth: 8 },
    worker: false,
  });

  const positions = data.attributes?.POSITION?.value as Float32Array;
  if (!positions || positions.length === 0) {
    throw new Error("No position data found in point cloud file");
  }

  const count = positions.length / 3;

  // Extract colors if available
  let colors: Float32Array | null = null;
  const colorAttr = data.attributes?.COLOR_0?.value;
  if (colorAttr && colorAttr.length >= count * 3) {
    colors = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      colors[i] = colorAttr[i] / 255;
    }
  }

  // Compute bounds
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };

  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    if (x < min.x) min.x = x;
    if (y < min.y) min.y = y;
    if (z < min.z) min.z = z;
    if (x > max.x) max.x = x;
    if (y > max.y) max.y = y;
    if (z > max.z) max.z = z;
  }

  return { positions, colors, count, bounds: { min, max } };
}
