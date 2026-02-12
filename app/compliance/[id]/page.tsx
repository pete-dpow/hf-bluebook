"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";
import RegulationDetail from "@/components/RegulationDetail";

export default function ComplianceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [regulation, setRegulation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    loadRegulation();
  }, [params.id]);

  async function loadRegulation() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch(`/api/compliance/${params.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setRegulation(data.regulation);
    }
    setLoading(false);
  }

  async function handleScrape() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setScraping(true);
    const res = await fetch(`/api/compliance/${params.id}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      alert("Scraping started — sections will update shortly");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to start scraping");
    }
    setScraping(false);
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
          scraping={scraping}
        />
      </div>
    </div>
  );
}
