"use client";

import { useState } from "react";
import { Download, FileText, FileCode, ChevronDown, Info, Trash2 } from "lucide-react";
import FloorLevelPanel from "./FloorLevelPanel";
import type { SurveyScan, SurveyFloor } from "@/lib/surveying/types";
import { supabase } from "@/lib/supabase";

interface SurveyToolsPanelProps {
  scan: SurveyScan;
  floors: SurveyFloor[];
  selectedFloorId: string | null;
  onFloorSelect: (floorId: string) => void;
  onFloorUpdated?: () => void;
  onDelete?: () => void;
}

export default function SurveyToolsPanel({
  scan,
  floors,
  selectedFloorId,
  onFloorSelect,
  onFloorUpdated,
  onDelete,
}: SurveyToolsPanelProps) {
  const [paperSize, setPaperSize] = useState("A3");
  const [scale, setScale] = useState("1:100");
  const [exportFormat, setExportFormat] = useState<"pdf" | "dxf">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async () => {
    if (!selectedFloorId) return;
    setIsExporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(`/api/surveying/floors/${selectedFloorId}/export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: exportFormat,
          paper_size: paperSize,
          scale,
          project_name: scan.scan_name,
        }),
      });

      if (!res.ok) throw new Error("Export failed");
      const plan = await res.json();

      // Download the file
      const dlRes = await fetch(`/api/surveying/plans/${plan.id}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const dlData = await dlRes.json();

      if (dlData.url) {
        window.open(dlData.url, "_blank");
      }
    } catch (err: any) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="w-[280px] bg-white border-r border-[#E5E7EB] h-full flex flex-col overflow-y-auto"
      style={{ fontFamily: "var(--font-ibm-plex)" }}
    >
      {/* Scan Info */}
      <div className="p-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-[#0056a7]" />
          <span className="text-sm font-medium" style={{ color: "#2A2A2A" }}>
            Scan Info
          </span>
        </div>

        <div className="space-y-2 text-xs" style={{ color: "#6B7280" }}>
          <div className="flex justify-between">
            <span>Name</span>
            <span className="font-medium text-[#2A2A2A] truncate ml-2 max-w-[140px]">{scan.scan_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Format</span>
            <span>{scan.file_format.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>Size</span>
            <span>{formatFileSize(scan.file_size_bytes)}</span>
          </div>
          {scan.point_count && (
            <div className="flex justify-between">
              <span>Points</span>
              <span>{(scan.point_count / 1_000_000).toFixed(1)}M</span>
            </div>
          )}
          {scan.scanner_model && (
            <div className="flex justify-between">
              <span>Scanner</span>
              <span>{scan.scanner_model}</span>
            </div>
          )}
        </div>
      </div>

      {/* Floor Levels */}
      <FloorLevelPanel
        floors={floors}
        selectedFloorId={selectedFloorId}
        onFloorSelect={onFloorSelect}
        onFloorUpdated={onFloorUpdated}
      />

      {/* Export Controls */}
      <div className="p-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-4 h-4 text-[#0056a7]" />
          <span className="text-sm font-medium" style={{ color: "#2A2A2A" }}>
            Export Plan
          </span>
        </div>

        <div className="space-y-3">
          {/* Format toggle */}
          <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
            <button
              onClick={() => setExportFormat("pdf")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                exportFormat === "pdf" ? "bg-white shadow-sm text-[#0056a7]" : "text-[#6B7280]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={() => setExportFormat("dxf")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                exportFormat === "dxf" ? "bg-white shadow-sm text-[#0056a7]" : "text-[#6B7280]"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              DXF
            </button>
          </div>

          {/* Paper size */}
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">Paper Size</label>
            <div className="relative">
              <select
                value={paperSize}
                onChange={e => setPaperSize(e.target.value)}
                className="w-full text-xs border border-[#E5E7EB] rounded-lg px-3 py-2 appearance-none bg-white"
              >
                <option value="A1">A1 (841 x 594mm)</option>
                <option value="A3">A3 (420 x 297mm)</option>
                <option value="A4">A4 (297 x 210mm)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {/* Scale */}
          <div>
            <label className="text-xs text-[#6B7280] block mb-1">Scale</label>
            <div className="relative">
              <select
                value={scale}
                onChange={e => setScale(e.target.value)}
                className="w-full text-xs border border-[#E5E7EB] rounded-lg px-3 py-2 appearance-none bg-white"
              >
                <option value="1:50">1:50</option>
                <option value="1:100">1:100</option>
                <option value="1:200">1:200</option>
                <option value="1:500">1:500</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[#9CA3AF] pointer-events-none" />
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={!selectedFloorId || isExporting}
            className="w-full py-2 bg-[#0056a7] text-white text-xs font-medium rounded-lg hover:bg-[#004a8f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Export {exportFormat.toUpperCase()}
              </>
            )}
          </button>

          {!selectedFloorId && (
            <p className="text-xs text-[#9CA3AF] text-center">
              Select a floor to export
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 mt-auto">
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-full py-2 text-red-600 text-xs font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Scan
          </button>
        )}
      </div>
    </div>
  );
}
