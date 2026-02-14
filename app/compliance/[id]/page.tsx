"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";
import RegulationDetail from "@/components/RegulationDetail";

type ScrapeStatus = "idle" | "scraping" | "complete" | "error";

export default function ComplianceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [regulation, setRegulation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Scrape progress state
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus>("idle");
  const [scrapeStartTime, setScrapeStartTime] = useState<number | null>(null);
  const [scrapeError, setScrapeError] = useState("");
  const previousScrapeAt = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadRegulation = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch(`/api/compliance/${params.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setRegulation(data.regulation);
      return data.regulation;
    }
    return null;
  }, [params.id, router]);

  useEffect(() => {
    loadRegulation().then(() => setLoading(false));
  }, [loadRegulation]);

  // Store initial last_scraped_at when regulation loads
  useEffect(() => {
    if (regulation && scrapeStatus === "idle") {
      previousScrapeAt.current = regulation.last_scraped_at || null;
    }
  }, [regulation, scrapeStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  async function handleScrape() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setScrapeStatus("scraping");
    setScrapeStartTime(Date.now());
    setScrapeError("");

    try {
      const res = await fetch(`/api/compliance/${params.id}/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setScrapeStatus("error");
        setScrapeError(err.error || "Failed to start scraping");
        return;
      }

      // Start polling every 5 seconds
      pollIntervalRef.current = setInterval(async () => {
        const updated = await loadRegulation();
        if (updated) {
          const newScrapeAt = updated.last_scraped_at || null;
          if (newScrapeAt && newScrapeAt !== previousScrapeAt.current) {
            // Scraping complete — new timestamp detected
            stopPolling();
            setScrapeStatus("complete");
            previousScrapeAt.current = newScrapeAt;

            // Auto-dismiss after 8 seconds
            setTimeout(() => setScrapeStatus("idle"), 8000);
          }
        }
      }, 5000);

      // Timeout after 3 minutes
      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setScrapeStatus("error");
        setScrapeError("Scraping is taking longer than expected. Check back shortly — sections will appear when processing completes.");
      }, 180_000);

    } catch {
      setScrapeStatus("error");
      setScrapeError("Network error — check your connection and try again");
    }
  }

  function handleRetry() {
    stopPolling();
    setScrapeStatus("idle");
    setScrapeError("");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!regulation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <p className="text-gray-500">Regulation not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/compliance")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          <ArrowLeft size={16} />
          All Regulations
        </button>

        <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
          {regulation.name}
        </h1>

        <RegulationDetail
          regulation={regulation}
          onScrape={handleScrape}
          onRetry={handleRetry}
          scrapeStatus={scrapeStatus}
          scrapeStartTime={scrapeStartTime}
          scrapeError={scrapeError}
        />
      </div>
    </div>
  );
}
