"use client";

import { Scroll, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-blue-50 text-blue-700",
  complete: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-600",
  delivered: "bg-purple-50 text-purple-700",
};

interface GoldenThreadPackageCardProps {
  pkg: {
    id: string;
    package_reference: string;
    building_reference?: string | null;
    status: string;
    section_88_compliant: boolean;
    section_91_compliant: boolean;
    export_format: string;
    export_files?: { format: string; file_name: string }[];
    file_size_bytes?: number | null;
    created_at: string;
    updated_at: string;
  };
  onClick: () => void;
}

export default function GoldenThreadPackageCard({ pkg, onClick }: GoldenThreadPackageCardProps) {
  const fileCount = pkg.export_files?.length || 0;
  const sizeKb = pkg.file_size_bytes ? Math.round(pkg.file_size_bytes / 1024) : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md cursor-pointer transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scroll size={18} className="text-blue-600 flex-shrink-0" />
          <h3 className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {pkg.package_reference}
          </h3>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${STATUS_COLORS[pkg.status] || "bg-gray-100 text-gray-600"}`}>
          {pkg.status === "processing" && <Loader2 size={10} className="inline animate-spin mr-1" />}
          {pkg.status}
        </span>
      </div>

      {pkg.building_reference && (
        <p className="text-xs text-gray-500 mb-3" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          Building: {pkg.building_reference}
        </p>
      )}

      {/* Compliance indicators */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          {pkg.section_88_compliant ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : (
            <AlertCircle size={14} className="text-amber-500" />
          )}
          <span className="text-xs text-gray-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>S.88</span>
        </div>
        <div className="flex items-center gap-1">
          {pkg.section_91_compliant ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : (
            <AlertCircle size={14} className="text-amber-500" />
          )}
          <span className="text-xs text-gray-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>S.91</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        <span>
          {fileCount > 0 ? (
            <span className="flex items-center gap-1">
              <Download size={12} />
              {fileCount} file{fileCount !== 1 ? "s" : ""}{sizeKb > 0 ? ` (${sizeKb}KB)` : ""}
            </span>
          ) : (
            "No exports yet"
          )}
        </span>
        <span>
          {new Date(pkg.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}
