"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { deserializePointCloud } from "@/lib/surveying/decimator";
import type { SurveyFloor } from "@/lib/surveying/types";

interface PointCloudViewerProps {
  pointCloudUrl: string | null;
  floors?: SurveyFloor[];
  selectedFloorId?: string | null;
  onFloorSelect?: (floorId: string) => void;
}

export default function PointCloudViewer({
  pointCloudUrl,
  floors = [],
  selectedFloorId,
}: PointCloudViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [pointCount, setPointCount] = useState(0);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const floorPlanesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!containerRef.current || !pointCloudUrl) return;

    let disposed = false;
    const container = containerRef.current;

    const init = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Fetch point cloud data
        const response = await fetch(pointCloudUrl);
        if (!response.ok) throw new Error("Failed to load point cloud");
        const buffer = await response.arrayBuffer();
        const pcData = deserializePointCloud(buffer);

        if (disposed) return;

        setPointCount(pcData.count);

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        sceneRef.current = scene;

        // Camera
        const width = container.clientWidth;
        const height = container.clientHeight;
        const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

        // Position camera to see full model
        const center = {
          x: (pcData.bounds.min.x + pcData.bounds.max.x) / 2,
          y: (pcData.bounds.min.y + pcData.bounds.max.y) / 2,
          z: (pcData.bounds.min.z + pcData.bounds.max.z) / 2,
        };
        const size = Math.max(
          pcData.bounds.max.x - pcData.bounds.min.x,
          pcData.bounds.max.y - pcData.bounds.min.y,
          pcData.bounds.max.z - pcData.bounds.min.z
        );

        camera.position.set(center.x + size, center.y + size * 0.5, center.z + size);
        camera.lookAt(center.x, center.y, center.z);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(center.x, center.y, center.z);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.update();

        // Point cloud geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(pcData.positions, 3));

        if (pcData.colors) {
          geometry.setAttribute("color", new THREE.BufferAttribute(pcData.colors, 3));
        } else {
          // Height-based coloring
          const colors = new Float32Array(pcData.count * 3);
          const zRange = pcData.bounds.max.z - pcData.bounds.min.z;
          for (let i = 0; i < pcData.count; i++) {
            const z = pcData.positions[i * 3 + 2];
            const t = zRange > 0 ? (z - pcData.bounds.min.z) / zRange : 0.5;

            // Blue → Cyan → Green → Yellow → Red
            const hue = (1 - t) * 0.7;
            const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
          }
          geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        }

        const material = new THREE.PointsMaterial({
          size: 0.02,
          vertexColors: true,
          sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // Add floor planes
        if (floors.length > 0) {
          addFloorPlanes(scene, pcData.bounds, floors, selectedFloorId);
        }

        // Grid helper
        const gridSize = Math.ceil(size / 5) * 5;
        const grid = new THREE.GridHelper(gridSize, gridSize, 0x333355, 0x222244);
        grid.position.set(center.x, pcData.bounds.min.z, center.y);
        scene.add(grid);

        // Ambient + directional light
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));

        // Resize handler
        const handleResize = () => {
          if (disposed) return;
          const w = container.clientWidth;
          const h = container.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);

        // Animate
        const animate = () => {
          if (disposed) return;
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        setIsLoading(false);

        return () => {
          disposed = true;
          window.removeEventListener("resize", handleResize);
          renderer.dispose();
          geometry.dispose();
          material.dispose();
          container.removeChild(renderer.domElement);
        };
      } catch (err: any) {
        if (!disposed) {
          setError(err.message || "Failed to load point cloud");
          setIsLoading(false);
        }
      }
    };

    const cleanup = init();
    return () => {
      disposed = true;
      cleanup?.then(fn => fn?.());
    };
  }, [pointCloudUrl]);

  // Update floor planes when selection changes
  useEffect(() => {
    if (!sceneRef.current) return;
    // Remove old planes
    for (const plane of floorPlanesRef.current) {
      sceneRef.current.remove(plane);
      plane.geometry.dispose();
      (plane.material as THREE.Material).dispose();
    }
    floorPlanesRef.current = [];

    if (floors.length > 0) {
      const bounds = { min: { x: -20, y: -20 }, max: { x: 20, y: 20 } };
      addFloorPlanes(sceneRef.current, { min: { ...bounds.min, z: 0 }, max: { ...bounds.max, z: 10 } }, floors, selectedFloorId);
    }
  }, [selectedFloorId, floors]);

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: "400px" }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#0056a7] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Loading point cloud...
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
          <p className="text-sm text-red-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {error}
          </p>
        </div>
      )}

      {!isLoading && !error && pointCount > 0 && (
        <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 rounded-lg text-xs text-gray-300"
          style={{ fontFamily: "var(--font-ibm-plex)" }}>
          {(pointCount / 1_000_000).toFixed(1)}M points
        </div>
      )}

      {!pointCloudUrl && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a2e]">
          <p className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Scan processing — 3D view will appear when ready
          </p>
        </div>
      )}
    </div>
  );
}

function addFloorPlanes(
  scene: THREE.Scene,
  bounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  floors: SurveyFloor[],
  selectedId?: string | null
) {
  const sizeX = Math.max(bounds.max.x - bounds.min.x, 10);
  const sizeY = Math.max(bounds.max.y - bounds.min.y, 10);
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerY = (bounds.min.y + bounds.max.y) / 2;

  for (const floor of floors) {
    const isSelected = floor.id === selectedId;
    const geometry = new THREE.PlaneGeometry(sizeX * 1.2, sizeY * 1.2);
    const material = new THREE.MeshBasicMaterial({
      color: isSelected ? 0x0056a7 : 0x444466,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isSelected ? 0.3 : 0.1,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = Math.PI / 2;
    plane.position.set(centerX, floor.z_height_m, centerY);
    scene.add(plane);
  }
}
