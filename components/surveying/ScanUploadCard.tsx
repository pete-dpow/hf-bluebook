"use client";

import { useCallback, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ScanUploadCardProps {
  onUploadComplete?: () => void;
}

const ALLOWED_EXTS = [".e57", ".las", ".laz"];
const MAX_SIZE = 500 * 1024 * 1024;

export default function ScanUploadCard({ onUploadComplete }: ScanUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const valid = files.find(f => ALLOWED_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (valid) uploadFile(valid);
    else setError("Please upload an E57, LAS, or LAZ file");
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, []);

  const uploadFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      setError("File too large. Maximum 500MB.");
      return;
    }

    setIsUploading(true);
    setError("");
    setProgress("Preparing upload...");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      setProgress("Uploading...");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("scan_name", file.name.replace(/\.\w+$/, ""));

      const res = await fetch("/api/surveying/scans", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      setProgress("Upload complete — processing started");
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
        isDragging ? "border-[#0056a7] bg-[#0056a7]/5" : "border-[#E5E7EB]"
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="p-8">
        <input
          type="file"
          id="scan-upload"
          className="hidden"
          accept=".e57,.las,.laz"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center py-8">
            <Loader2 className="w-12 h-12 text-[#0056a7] animate-spin mb-4" />
            <p className="text-sm" style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A" }}>
              {progress}
            </p>
          </div>
        ) : (
          <label htmlFor="scan-upload" className="flex flex-col items-center cursor-pointer py-8">
            <Upload
              className={`w-12 h-12 mb-4 ${isDragging ? "text-[#0056a7]" : "text-[#9CA3AF]"}`}
            />
            <h3
              className="text-lg font-medium mb-1"
              style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}
            >
              Drop your scan file here
            </h3>
            <p className="text-xs mb-4" style={{ fontFamily: "var(--font-ibm-plex)", color: "#9CA3AF" }}>
              .e57, .las, .laz — Max 500MB
            </p>
            <button
              type="button"
              className="px-4 py-2 bg-[#0056a7] text-white text-sm font-medium rounded-lg hover:bg-[#004a8f] transition-colors"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Choose File
            </button>
          </label>
        )}
      </div>

      {error && (
        <div className="px-8 pb-4">
          <p className="text-xs text-red-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
