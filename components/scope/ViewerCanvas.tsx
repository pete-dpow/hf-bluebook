"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as OBC from "@thatopen/components";

interface ViewerCanvasProps {
  modelName: string;
  sectionHeight: number;
}

export default function ViewerCanvas({ modelName, sectionHeight }: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [loadingMessage, setLoadingMessage] = useState("Initializing viewer...");
  const sectionPlaneRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let components: OBC.Components | null = null;

    const initViewer = async () => {
      try {
        components = new OBC.Components();
        
        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();

        world.scene = new OBC.SimpleScene(components);
        const scene = world.scene.three as THREE.Scene;
        scene.background = new THREE.Color(0x202020);

        world.renderer = new OBC.SimpleRenderer(components, containerRef.current!);
        world.camera = new OBC.SimpleCamera(components);
        
        await world.camera.controls?.setLookAt(12, 6, 8, 0, 0, -10);

        components.init();

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(10, 10, 10);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-10, 5, -10);
        scene.add(fillLight);

        // NEW: Create section plane visualization
        const planeGeometry = new THREE.PlaneGeometry(20, 20);
        const planeMaterial = new THREE.MeshBasicMaterial({
          color: 0x8B5CF6,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.3
        });
        const sectionPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        sectionPlane.rotation.x = Math.PI / 2; // Horizontal
        sectionPlane.position.y = sectionHeight;
        scene.add(sectionPlane);
        sectionPlaneRef.current = sectionPlane;

        setLoadingMessage("Loading worker...");
        const workerUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedWorker = await fetch(workerUrl);
        const workerText = await fetchedWorker.text();
        const workerBlob = new Blob([workerText], { type: "text/javascript" });
        const localWorkerUrl = URL.createObjectURL(workerBlob);

        const fragments = components.get(OBC.FragmentsManager);
        fragments.init(localWorkerUrl);

        world.camera.controls?.addEventListener("rest", () => {
          fragments.core.update(true);
        });

        fragments.list.onItemSet.add(({ value: model }) => {
          model.useCamera(world.camera.three as THREE.PerspectiveCamera);
          world.scene.three.add(model.object);
          
          // Apply greyscale materials and force update
          model.object.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const newMaterial = new THREE.MeshStandardMaterial({
                color: 0xaaaaaa,
                roughness: 0.7,
                metalness: 0.1
              });
              child.material = newMaterial;
              child.material.needsUpdate = true;
            }
          });
          
          fragments.core.update(true);
        });

        const grids = components.get(OBC.Grids);
        grids.create(world);

        const storedFragment = localStorage.getItem("dpow_scope_fragment");
        if (!storedFragment) {
          throw new Error("No fragment found");
        }

        setLoadingMessage("Loading fragment data...");
        const fragmentData = JSON.parse(storedFragment);
        const binaryString = atob(fragmentData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        setLoadingMessage("Loading model...");
        
        await fragments.core.load(bytes.buffer, {
          modelId: modelName || "model"
        });
        
        fragments.core.update(true);

        setIsLoading(false);

      } catch (err: any) {
        console.error("Viewer error:", err);
        setError(err.message || "Failed to load model");
        setIsLoading(false);
      }
    };

    initViewer();

    return () => {
      if (components) {
        components.dispose();
      }
    };
  }, []);

  // NEW: Update section plane position when sectionHeight changes
  useEffect(() => {
    if (sectionPlaneRef.current) {
      sectionPlaneRef.current.position.y = sectionHeight;
    }
  }, [sectionHeight]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          background: "#202020",
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
          <div>{loadingMessage}</div>
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
