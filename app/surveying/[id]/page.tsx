"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, GripVertical } from "lucide-react";
import PointCloudViewer from "@/components/surveying/PointCloudViewer";
import FloorPlanViewer from "@/components/surveying/FloorPlanViewer";
import SurveyToolsPanel from "@/components/surveying/SurveyToolsPanel";
import type { SurveyScan, SurveyFloor, SurveyWall } from "@/lib/surveying/types";

interface ScanDetail extends SurveyScan {
  floors: (SurveyFloor & { survey_walls: SurveyWall[] })[];
  plans: { id: string; plan_reference: string; plan_format: string }[];
}

export default function ScanViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [pointCloudUrl, setPointCloudUrl] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [splitPercent, setSplitPercent] = useState(60); // 3D gets 60%
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchScan = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/surveying/scans/${id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    setScan(data);

    // Select first floor by default
    if (data.floors?.length > 0 && !selectedFloorId) {
      setSelectedFloorId(data.floors[0].id);
    }

    // Get point cloud URL
    if (data.processing_status === "ready") {
      const pcRes = await fetch(`/api/surveying/scans/${id}/point-cloud`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (pcRes.ok) {
        const pcData = await pcRes.json();
        setPointCloudUrl(pcData.url);
      }
    }
  }, [id, supabase, selectedFloorId]);

  useEffect(() => {
    fetchScan();
  }, [fetchScan]);

  // Draggable divider
  const handleDividerMouseDown = useCallback(() => setIsDragging(true), []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percent = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(20, Math.min(80, percent)));
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const selectedFloor = scan?.floors?.find(f => f.id === selectedFloorId);
  const selectedWalls = selectedFloor?.survey_walls || [];

  const handleDelete = async () => {
    if (!confirm("Delete this scan and all associated data?")) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/surveying/scans/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    router.push("/surveying");
  };

  if (!scan) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FCFCFA" }}>
        <div className="w-6 h-6 border-2 border-[#0056a7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex" style={{ background: "#FCFCFA" }}>
      {/* Tools Panel (left) */}
      <SurveyToolsPanel
        scan={scan}
        floors={scan.floors || []}
        selectedFloorId={selectedFloorId}
        onFloorSelect={setSelectedFloorId}
        onFloorUpdated={fetchScan}
        onDelete={handleDelete}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="h-12 border-b border-[#E5E7EB] bg-white flex items-center px-4 gap-3">
          <button
            onClick={() => router.push("/surveying")}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#6B7280]" />
          </button>
          <h2
            className="text-sm font-medium truncate"
            style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A" }}
          >
            {scan.scan_name}
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: scan.processing_status === "ready" ? "#D1FAE5" : "#DBEAFE",
              color: scan.processing_status === "ready" ? "#059669" : "#2563EB",
              fontFamily: "var(--font-ibm-plex)",
            }}
          >
            {scan.processing_status}
          </span>
        </div>

        {/* Split view */}
        <div ref={containerRef} className="flex-1 flex relative">
          {/* 3D Viewer */}
          <div style={{ width: `${splitPercent}%` }} className="h-full">
            <PointCloudViewer
              pointCloudUrl={pointCloudUrl}
              floors={scan.floors || []}
              selectedFloorId={selectedFloorId}
              onFloorSelect={setSelectedFloorId}
            />
          </div>

          {/* Draggable divider */}
          <div
            className="w-2 bg-[#E5E7EB] hover:bg-[#0056a7]/30 cursor-col-resize flex items-center justify-center transition-colors relative z-10"
            onMouseDown={handleDividerMouseDown}
            style={{ userSelect: "none" }}
          >
            <GripVertical className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </div>

          {/* 2D Floor Plan */}
          <div style={{ width: `${100 - splitPercent}%` }} className="h-full">
            <FloorPlanViewer
              walls={selectedWalls}
              floorLabel={selectedFloor?.floor_label || "No floor selected"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
