/**
 * Voxel grid decimator — downsample point clouds to a target count for browser rendering.
 * Uses voxel grid averaging: divides space into cubes, keeps one averaged point per voxel.
 */

import type { PointCloudData } from "./types";

const TARGET_POINTS = 2_000_000;

export function decimatePointCloud(
  data: PointCloudData,
  targetPoints: number = TARGET_POINTS
): PointCloudData {
  if (data.count <= targetPoints) return data;

  const { positions, colors, bounds } = data;
  const rangeX = bounds.max.x - bounds.min.x;
  const rangeY = bounds.max.y - bounds.min.y;
  const rangeZ = bounds.max.z - bounds.min.z;

  // Calculate voxel size to achieve ~targetPoints
  const volume = rangeX * rangeY * rangeZ;
  const voxelVolume = volume / targetPoints;
  const voxelSize = Math.cbrt(voxelVolume);

  // Grid dimensions
  const gridX = Math.ceil(rangeX / voxelSize) + 1;
  const gridY = Math.ceil(rangeY / voxelSize) + 1;

  // Accumulate points per voxel
  const voxelMap = new Map<number, {
    sumX: number; sumY: number; sumZ: number;
    sumR: number; sumG: number; sumB: number;
    count: number;
  }>();

  for (let i = 0; i < data.count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    const gx = Math.floor((x - bounds.min.x) / voxelSize);
    const gy = Math.floor((y - bounds.min.y) / voxelSize);
    const gz = Math.floor((z - bounds.min.z) / voxelSize);

    const key = gx + gy * gridX + gz * gridX * gridY;

    let v = voxelMap.get(key);
    if (!v) {
      v = { sumX: 0, sumY: 0, sumZ: 0, sumR: 0, sumG: 0, sumB: 0, count: 0 };
      voxelMap.set(key, v);
    }

    v.sumX += x;
    v.sumY += y;
    v.sumZ += z;
    v.count++;

    if (colors) {
      v.sumR += colors[i * 3];
      v.sumG += colors[i * 3 + 1];
      v.sumB += colors[i * 3 + 2];
    }
  }

  const outCount = voxelMap.size;
  const outPositions = new Float32Array(outCount * 3);
  const outColors = colors ? new Float32Array(outCount * 3) : null;

  const newMin = { x: Infinity, y: Infinity, z: Infinity };
  const newMax = { x: -Infinity, y: -Infinity, z: -Infinity };

  let idx = 0;
  voxelMap.forEach((v) => {
    const x = v.sumX / v.count;
    const y = v.sumY / v.count;
    const z = v.sumZ / v.count;

    outPositions[idx * 3] = x;
    outPositions[idx * 3 + 1] = y;
    outPositions[idx * 3 + 2] = z;

    if (outColors) {
      outColors[idx * 3] = v.sumR / v.count;
      outColors[idx * 3 + 1] = v.sumG / v.count;
      outColors[idx * 3 + 2] = v.sumB / v.count;
    }

    if (x < newMin.x) newMin.x = x;
    if (y < newMin.y) newMin.y = y;
    if (z < newMin.z) newMin.z = z;
    if (x > newMax.x) newMax.x = x;
    if (y > newMax.y) newMax.y = y;
    if (z > newMax.z) newMax.z = z;

    idx++;
  });

  return {
    positions: outPositions,
    colors: outColors,
    count: outCount,
    bounds: { min: newMin, max: newMax },
  };
}

/** Serialize decimated point cloud to binary format for browser download */
export function serializePointCloud(data: PointCloudData): Uint8Array {
  const hasColors = data.colors !== null;
  // Header: 4 bytes magic + 4 bytes count + 1 byte hasColors + 24 bytes bounds
  const headerSize = 33;
  const pointSize = 12 + (hasColors ? 12 : 0); // 3 floats pos + 3 floats color
  const totalSize = headerSize + data.count * pointSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // Magic: "HFPC"
  view.setUint8(offset++, 72); // H
  view.setUint8(offset++, 70); // F
  view.setUint8(offset++, 80); // P
  view.setUint8(offset++, 67); // C

  view.setUint32(offset, data.count, true); offset += 4;
  view.setUint8(offset++, hasColors ? 1 : 0);

  // Bounds
  view.setFloat32(offset, data.bounds.min.x, true); offset += 4;
  view.setFloat32(offset, data.bounds.min.y, true); offset += 4;
  view.setFloat32(offset, data.bounds.min.z, true); offset += 4;
  view.setFloat32(offset, data.bounds.max.x, true); offset += 4;
  view.setFloat32(offset, data.bounds.max.y, true); offset += 4;
  view.setFloat32(offset, data.bounds.max.z, true); offset += 4;

  // Position data
  const posBytes = new Uint8Array(data.positions.buffer, data.positions.byteOffset, data.positions.byteLength);
  new Uint8Array(buffer, offset, posBytes.length).set(posBytes);
  offset += posBytes.length;

  // Color data
  if (hasColors && data.colors) {
    const colBytes = new Uint8Array(data.colors.buffer, data.colors.byteOffset, data.colors.byteLength);
    new Uint8Array(buffer, offset, colBytes.length).set(colBytes);
  }

  return new Uint8Array(buffer);
}

/** Deserialize binary format back to PointCloudData (browser-side) */
export function deserializePointCloud(buffer: ArrayBuffer): PointCloudData {
  const view = new DataView(buffer);
  let offset = 4; // skip magic

  const count = view.getUint32(offset, true); offset += 4;
  const hasColors = view.getUint8(offset++) === 1;

  const bounds = {
    min: {
      x: view.getFloat32(offset, true),
      y: view.getFloat32(offset + 4, true),
      z: view.getFloat32(offset + 8, true),
    },
    max: {
      x: view.getFloat32(offset + 12, true),
      y: view.getFloat32(offset + 16, true),
      z: view.getFloat32(offset + 20, true),
    },
  };
  offset += 24;

  const positions = new Float32Array(buffer, offset, count * 3);
  offset += count * 3 * 4;

  const colors = hasColors ? new Float32Array(buffer, offset, count * 3) : null;

  return { positions, colors, count, bounds };
}
