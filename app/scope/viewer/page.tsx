"use client";

import { useEffect, useState, useRef } from "react";
import ViewerCanvas from "@/components/scope/ViewerCanvas";
import Viewer2D from "@/components/scope/Viewer2D";
import LeftSidebar from "@/components/LeftSidebar";
import ScopeToolsPanel from "@/components/scope/ScopeToolsPanel";

export default function ScopeViewerPage() {
  const [modelName, setModelName] = useState("No model loaded");
  const [splitPosition, setSplitPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [sectionHeight, setSectionHeight] = useState(3); // NEW: Section plane height
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedName = localStorage.getItem("uploadedModelName");
    if (storedName) {
      setModelName(storedName);
    }

    const savedPosition = localStorage.getItem("dpow_scope_split_position");
    if (savedPosition) {
      setSplitPosition(parseFloat(savedPosition));
    }
  }, []);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const newPosition = (offsetX / containerRect.width) * 100;

    const constrainedPosition = Math.min(Math.max(newPosition, 20), 80);
    setSplitPosition(constrainedPosition);
    localStorage.setItem("dpow_scope_split_position", constrainedPosition.toString());
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove as any);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        background: "#FCFCFA",
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar - 64px */}
      <LeftSidebar />

      {/* Scope Tools Panel - 280px (slides from left) */}
      <ScopeToolsPanel />

      {/* Main Split Screen Container - Flexible */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          marginLeft: "64px",
          position: "relative",
          height: "100vh",
          display: "flex",
          cursor: isDragging ? "col-resize" : "default",
        }}
      >
        {/* Left Panel - 3D Viewer */}
        <div
          style={{
            width: `${splitPosition}%`,
            height: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Pass sectionHeight to ViewerCanvas */}
          <ViewerCanvas modelName={modelName} sectionHeight={sectionHeight} />
          
          {/* 3D Label */}
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              background: "rgba(0, 0, 0, 0.7)",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              color: "white",
              fontSize: "0.875rem",
              fontFamily: "IBM Plex Sans, sans-serif",
              fontWeight: 500,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            3D View
          </div>

          {/* NEW: Section Height Slider */}
          <div
            style={{
              position: "absolute",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(0, 0, 0, 0.8)",
              padding: "1rem",
              borderRadius: "0.5rem",
              zIndex: 10,
              minWidth: "300px",
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: "0.875rem",
                fontFamily: "IBM Plex Sans, sans-serif",
                marginBottom: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Section Height</span>
              <span style={{ fontWeight: 600 }}>{sectionHeight.toFixed(1)}m</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.1"
              value={sectionHeight}
              onChange={(e) => setSectionHeight(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#8B5CF6",
              }}
            />
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          onMouseDown={handleMouseDown}
          style={{
            width: "4px",
            height: "100%",
            background: isDragging ? "#8B5CF6" : "#E5E7EB",
            cursor: "col-resize",
            position: "relative",
            flexShrink: 0,
            transition: isDragging ? "none" : "background 0.2s ease",
          }}
        >
          {/* Draggable Handle */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "32px",
              height: "64px",
              background: isDragging ? "#8B5CF6" : "#9CA3AF",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              transition: isDragging ? "none" : "background 0.2s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ width: "3px", height: "3px", background: "white", borderRadius: "50%" }} />
              <div style={{ width: "3px", height: "3px", background: "white", borderRadius: "50%" }} />
              <div style={{ width: "3px", height: "3px", background: "white", borderRadius: "50%" }} />
              <div style={{ width: "3px", height: "3px", background: "white", borderRadius: "50%" }} />
            </div>
          </div>
        </div>

        {/* Right Panel - 2D Viewer */}
        <div
          style={{
            width: `${100 - splitPosition}%`,
            height: "100%",
            position: "relative",
            background: "#1a1a1a",
            overflow: "hidden",
          }}
        >
          {/* 2D Label - Updated to show section height */}
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              background: "rgba(0, 0, 0, 0.7)",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              color: "white",
              fontSize: "0.875rem",
              fontFamily: "IBM Plex Sans, sans-serif",
              fontWeight: 500,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            2D Section @ {sectionHeight.toFixed(1)}m
          </div>

          {/* Pass sectionHeight to Viewer2D */}
          <Viewer2D modelName={modelName} sectionHeight={sectionHeight} />
        </div>
      </div>
    </div>
  );
}
