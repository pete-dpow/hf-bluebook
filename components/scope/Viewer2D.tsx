"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";

interface Viewer2DProps {
  modelName: string;
  sectionHeight: number;
}

export default function Viewer2D({ modelName, sectionHeight }: Viewer2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const componentsRef = useRef<OBC.Components | null>(null);
  const worldRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let components: OBC.Components | null = null;

    const initViewer = async () => {
      try {
        // Wait for 3D viewer to initialize first
        await new Promise(resolve => setTimeout(resolve, 2000));

        components = new OBC.Components();
        componentsRef.current = components;
        
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();
        worldRef.current = world;

        world.scene = new OBC.SimpleScene(components);
        const scene = world.scene.three as THREE.Scene;
        scene.background = new THREE.Color(0x2a2a2a);

        world.renderer = new OBC.SimpleRenderer(components, containerRef.current!);
        const renderer = world.renderer.three as THREE.WebGLRenderer;
        
        // Enable clipping planes
        renderer.localClippingEnabled = true;

        // Orthographic camera for top-down view
        const aspect = containerRef.current!.clientWidth / containerRef.current!.clientHeight;
        const frustumSize = 20;
        const camera = new THREE.OrthographicCamera(
          frustumSize * aspect / -2,
          frustumSize * aspect / 2,
          frustumSize / 2,
          frustumSize / -2,
          0.1,
          1000
        );
        
        world.camera = new OBC.SimpleCamera(components);
        world.camera.three = camera;
        
        // Top-down view
        await world.camera.controls?.setLookAt(0, 50, 0, 0, 0, 0);

        components.init();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
        keyLight.position.set(10, 10, 10);
        scene.add(keyLight);

        // Load worker
        const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedWorker = await fetch(workerUrl);
        const workerText = await fetchedWorker.text();
        const workerBlob = new Blob([workerText], { type: "text/javascript" });
        const localWorkerUrl = URL.createObjectURL(workerBlob);

        const fragments = components.get(OBC.FragmentsManager);
        fragments.init(localWorkerUrl);

        // Create clipping planes
        const clipPlaneTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionHeight);
        const clipPlaneBottom = new THREE.Plane(new THREE.Vector3(0, 1, 0), -sectionHeight + 0.5);

        fragments.list.onItemSet.add(({ value: model }) => {
          model.useCamera(camera);
          world.scene.three.add(model.object);
          
          // Apply clipping planes to all materials
          model.object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  mat.clippingPlanes = [clipPlaneTop, clipPlaneBottom];
                  mat.clipIntersection = false;
                  mat.needsUpdate = true;
                });
              } else {
                child.material.clippingPlanes = [clipPlaneTop, clipPlaneBottom];
                child.material.clipIntersection = false;
                child.material.needsUpdate = true;
              }
            }
          });
          
          fragments.core.update(true);
        });

        const grids = components.get(OBC.Grids);
        grids.create(world);

        // Load fragment
        const storedFragment = localStorage.getItem("dpow_scope_fragment");
        if (!storedFragment) {
          throw new Error("No fragment found");
        }

        const fragmentData = JSON.parse(storedFragment);
        const binaryString = atob(fragmentData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        await fragments.core.load(bytes.buffer, {
          modelId: modelName || "model"
        });
        
        fragments.core.update(true);

        setIsLoading(false);

      } catch (err: any) {
        console.error("2D Viewer error:", err);
        setError(err.message || "Failed to load 2D view");
        setIsLoading(false);
      }
    };

    initViewer();

    return () => {
      if (components) {
        components.dispose();
      }
    };
  }, [modelName]);

  // Update clipping planes when sectionHeight changes
  useEffect(() => {
    if (!worldRef.current) return;

    const world = worldRef.current;
    const clipPlaneTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), sectionHeight);
    const clipPlaneBottom = new THREE.Plane(new THREE.Vector3(0, 1, 0), -sectionHeight + 0.5);

    world.scene.three.traverse((child: any) => {
      if (child instanceof THREE.Mesh) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat: any) => {
            mat.clippingPlanes = [clipPlaneTop, clipPlaneBottom];
            mat.needsUpdate = true;
          });
        } else if (child.material) {
          child.material.clippingPlanes = [clipPlaneTop, clipPlaneBottom];
          child.material.needsUpdate = true;
        }
      }
    });
  }, [sectionHeight]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          background: "#2a2a2a",
        }}
      />

      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.8)",
            padding: "2rem",
            borderRadius: "0.5rem",
            textAlign: "center",
            color: "white",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "4px solid #444",
              borderTop: "4px solid #8B5CF6",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <div>Loading 2D section...</div>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0, 0, 0, 0.9)",
            padding: "2rem",
            borderRadius: "0.5rem",
            textAlign: "center",
            color: "#ef4444",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
          <div>{error}</div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
