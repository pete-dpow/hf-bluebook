"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Package, FileText, ShieldCheck, Scroll, ArrowRight } from "lucide-react";
import UserProfileHeader from "@/components/dashboard/UserProfileHeader";

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

const statusStyles: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#F3F4F6", color: "#6B7280" },
  sent: { bg: "rgba(37,99,235,0.1)", color: "#2563EB" },
  approved: { bg: "#DCFCE7", color: "#166534" },
  rejected: { bg: "#FEE2E2", color: "#DC2626" },
  cancelled: { bg: "#F3F4F6", color: "#9CA3AF" },
};

const quickActions = [
  { label: "Products", icon: Package, route: "/products" },
  { label: "Quotes", icon: FileText, route: "/quotes" },
  { label: "Compliance", icon: ShieldCheck, route: "/compliance" },
  { label: "Golden Thread", icon: Scroll, route: "/golden-thread" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="max-w-[1200px] mx-auto p-8 flex flex-col gap-6">
        {/* User Profile Header */}
        <UserProfileHeader user={data.user} stats={data.stats} />

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map(({ label, icon: Icon, route }) => (
            <button
              key={route}
              onClick={() => router.push(route)}
              className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Icon className="w-6 h-6 text-[#0056a7]" />
              <span
                className="text-sm text-[#1F2937] font-medium"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* Two-column: Recent Quotes + Recent Activity */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Quotes */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg text-[#1F2937]"
                style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
              >
                Recent Quotes
              </h3>
              <button
                onClick={() => router.push("/quotes")}
                className="text-xs text-[#0056a7] hover:underline flex items-center gap-1"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                View All <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {data.recent_quotes.length === 0 ? (
              <p className="text-sm text-[#6B7280]" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                No quotes yet
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recent_quotes.map((q) => {
                  const style = statusStyles[q.status] || statusStyles.draft;
                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
                      onClick={() => router.push(`/quotes/${q.id}`)}
                    >
                      <div>
                        <span
                          className="text-sm font-medium text-[#1F2937]"
                          style={{ fontFamily: "var(--font-ibm-plex)" }}
                        >
                          {q.quote_number}
                        </span>
                        {q.client_name && (
                          <span className="text-xs text-[#6B7280] ml-2">
                            {q.client_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {q.total > 0 && (
                          <span
                            className="text-xs text-[#6B7280]"
                            style={{ fontFamily: "var(--font-ibm-plex)" }}
                          >
                            £{q.total.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        <span
                          className="text-xs px-2 py-0.5 rounded-full capitalize"
                          style={{
                            background: style.bg,
                            color: style.color,
                            fontFamily: "var(--font-ibm-plex)",
                            textDecoration: q.status === "cancelled" ? "line-through" : "none",
                          }}
                        >
                          {q.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg text-[#1F2937]"
                style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
              >
                Recent Activity
              </h3>
            </div>

            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-[#6B7280]" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                No recent activity
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recent_activity.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between py-2 border-b border-[#F3F4F6] last:border-0"
                  >
                    <p
                      className="text-sm text-[#1F2937]"
                      style={{ fontFamily: "var(--font-ibm-plex)" }}
                    >
                      {a.description}
                    </p>
                    <span
                      className="text-xs text-[#9CA3AF] whitespace-nowrap ml-3"
                      style={{ fontFamily: "var(--font-ibm-plex)" }}
                    >
                      {new Date(a.timestamp).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Coverage by Pillar */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
          <h3
            className="text-lg text-[#1F2937] mb-4"
            style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
          >
            Product Coverage by Pillar
          </h3>

          {data.pillar_coverage.length === 0 ? (
            <p className="text-sm text-[#6B7280]" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No products catalogued yet
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {data.pillar_coverage.map((p) => (
                <div key={p.pillar} className="flex items-center gap-4">
                  <span
                    className="text-sm text-[#1F2937] w-[140px] shrink-0"
                    style={{ fontFamily: "var(--font-ibm-plex)" }}
                  >
                    {p.display_name}
                  </span>
                  <div className="flex-1 h-3 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(p.percentage, 2)}%`,
                        background: "linear-gradient(90deg, #0056a7, #0078d4)",
                      }}
                    />
                  </div>
                  <span
                    className="text-sm text-[#6B7280] w-[60px] text-right"
                    style={{ fontFamily: "var(--font-ibm-plex)" }}
                  >
                    {p.count} ({p.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
