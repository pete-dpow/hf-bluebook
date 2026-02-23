"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import UserProfileHeader from "@/components/dashboard/UserProfileHeader";
import ProjectCompletion from "@/components/dashboard/ProjectCompletion";
import PlannedVsActual from "@/components/dashboard/PlannedVsActual";
import DashboardCalendar from "@/components/dashboard/DashboardCalendar";

interface DashboardData {
  user: {
    display_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
    organization_name: string;
    member_since: string;
    microsoft_connected: boolean;
  };
  stats: {
    total_products: number;
    active_quotes: number;
    total_regulations: number;
  };
  recent_quotes: {
    id: string;
    quote_number: string;
    client_name: string;
    status: string;
    total: number;
    created_at: string;
  }[];
  recent_activity: {
    type: string;
    description: string;
    timestamp: string;
  }[];
  pillar_coverage: {
    pillar: string;
    display_name: string;
    count: number;
    percentage: number;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth");
        return;
      }

      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        setData(await res.json());
      } else if (res.status === 401) {
        router.replace("/auth");
      }
      setLoading(false);
    };

    fetchDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
        <p className="ml-3 text-gray-700" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          Loading dashboard…
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#FCFCFA] pl-[64px]">
      <div className="max-w-[1100px] mx-auto p-6 flex flex-col gap-5">
        {/* Seed Demo Data */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={async () => {
              setSeeding(true);
              setSeedResult(null);
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) return;
              const res = await fetch("/api/seed-demo", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
              });
              const d = await res.json();
              setSeeding(false);
              setSeedResult(res.ok ? d.message : `Error: ${d.error}`);
              if (res.ok) window.location.reload();
            }}
            disabled={seeding}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E7EB",
              background: seeding ? "#F3F4F6" : "#2563EB", color: seeding ? "#6B7280" : "#fff",
              fontSize: 13, fontWeight: 500, cursor: seeding ? "not-allowed" : "pointer",
              fontFamily: "var(--font-ibm-plex)",
            }}
          >
            {seeding ? "Seeding demo data…" : "Seed Demo Data"}
          </button>
          {seedResult && <span style={{ fontSize: 12, color: seedResult.startsWith("Error") ? "#DC2626" : "#059669", fontFamily: "var(--font-ibm-plex)" }}>{seedResult}</span>}
        </div>

        {/* 1. User Profile Header — full-width card matching Figma */}
        <UserProfileHeader user={data.user} stats={data.stats} />

        {/* 2. Product Coverage — stacked bars matching Figma "Project Completion" */}
        <ProjectCompletion pillars={data.pillar_coverage} />

        {/* 3. Planned vs Actual — line chart matching Figma */}
        <PlannedVsActual />

        {/* 4. Calendar — month grid + event list matching Figma */}
        <DashboardCalendar events={data.recent_activity} />
      </div>
    </div>
  );
}
