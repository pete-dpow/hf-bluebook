"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, LayoutDashboard } from "lucide-react";
import UserProfileHeader from "@/components/dashboard/UserProfileHeader";
import ProjectCompletion from "@/components/dashboard/ProjectCompletion";
import PlannedVsActual from "@/components/dashboard/PlannedVsActual";
import DashboardCalendar from "@/components/dashboard/DashboardCalendar";

const fontInter = { fontFamily: "var(--font-inter)" };

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
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <LayoutDashboard size={18} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-xs text-gray-500">Overview of your workspace</p>
            </div>
          </div>
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
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
              seeding ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>
        </div>

        {seedResult && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${seedResult.startsWith("Error") ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
            {seedResult}
          </div>
        )}

        <div className="flex flex-col gap-5">
          <UserProfileHeader user={data.user} stats={data.stats} />
          <ProjectCompletion pillars={data.pillar_coverage} />
          <PlannedVsActual />
          <DashboardCalendar events={data.recent_activity} />
        </div>
      </div>
    </div>
  );
}
