"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { HardDrive } from "lucide-react";
import ScanUploadCard from "@/components/surveying/ScanUploadCard";
import ScanCard from "@/components/surveying/ScanCard";
import type { SurveyScan } from "@/lib/surveying/types";

export default function SurveyingPage() {
  const [scans, setScans] = useState<SurveyScan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchScans = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/surveying/scans", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setScans(data);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchScans();

    // Poll for processing updates
    const interval = setInterval(() => {
      const hasProcessing = scans.some(s =>
        s.processing_status === "uploaded" ||
        s.processing_status === "converting" ||
        s.processing_status === "processing"
      );
      if (hasProcessing) fetchScans();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchScans, scans]);

  return (
    <div className="min-h-screen p-6" style={{ background: "#FCFCFA" }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl md:text-5xl mb-2"
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 500,
              letterSpacing: "0.01em",
              color: "#2A2A2A",
            }}
          >
            hf.surveying
          </h1>
          <p
            className="text-sm"
            style={{ fontFamily: "var(--font-ibm-plex)", color: "#6B7280" }}
          >
            Upload point cloud scans, detect floors and walls, export floor plans
          </p>
        </div>

        {/* Upload Card */}
        <div className="mb-8">
          <ScanUploadCard onUploadComplete={fetchScans} />
        </div>

        {/* Scan Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#0056a7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <div className="text-center py-16">
            <HardDrive className="w-12 h-12 text-[#D1D5DB] mx-auto mb-4" />
            <p
              className="text-sm mb-1"
              style={{ fontFamily: "var(--font-ibm-plex)", color: "#6B7280" }}
            >
              No scans uploaded yet
            </p>
            <p
              className="text-xs"
              style={{ fontFamily: "var(--font-ibm-plex)", color: "#9CA3AF" }}
            >
              Upload E57, LAS, or LAZ files from your Leica BLK360 scanner
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2
              className="text-sm font-medium mb-3"
              style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A" }}
            >
              Your Scans ({scans.length})
            </h2>
            {scans.map(scan => (
              <ScanCard
                key={scan.id}
                scan={scan}
                onClick={() => {
                  if (scan.processing_status === "ready") {
                    router.push(`/surveying/${scan.id}`);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p
            className="text-xs"
            style={{ fontFamily: "var(--font-ibm-plex)", color: "#9CA3AF" }}
          >
            Part of the{" "}
            <a href="https://www.dpow.ai" style={{ color: "#0056a7", textDecoration: "none" }}>
              dpow.ai
            </a>{" "}
            ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
