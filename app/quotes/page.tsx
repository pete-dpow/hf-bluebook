"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Plus, FileText, Clock, CheckCircle, PoundSterling,
  TrendingUp, TrendingDown, FolderOpen, Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import QuoteTableRow from "@/components/QuoteTableRow";

const fontInter = { fontFamily: "var(--font-inter)" };

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export default function QuotesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [stats, setStats] = useState<{ total: number; draft: number; approved: number; total_value: number; total_trend: number; approved_trend: number; value_trend: number } | null>(null);
  const [viewMode, setViewMode] = useState<"quotes" | "projects">("quotes");

  useEffect(() => {
    loadQuotes();
  }, [status, search, page]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/quotes/stats", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setStats(await res.json());
  }

  async function loadQuotes() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/quotes?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setQuotes(data.quotes || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText size={18} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Quotes</h1>
              <p className="text-xs text-gray-500">{total} quote{total !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/quotes/new")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            <Plus size={16} />
            New Quote
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Quotes</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
              {stats.total_trend !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.total_trend > 0 ? "text-green-600" : "text-red-500"}`}>
                  {stats.total_trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stats.total_trend > 0 ? "+" : ""}{stats.total_trend} this month</span>
                </div>
              )}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText size={16} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Draft</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.draft.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <Clock size={12} />
                <span>Awaiting action</span>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Clock size={16} className="text-gray-400" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approved</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.approved.toLocaleString()}</div>
              {stats.approved_trend !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.approved_trend > 0 ? "text-green-600" : "text-red-500"}`}>
                  {stats.approved_trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stats.approved_trend > 0 ? "+" : ""}{stats.approved_trend} this month</span>
                </div>
              )}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pipeline Value</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {"\u00A3"}{stats.total_value.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              {stats.value_trend !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.value_trend > 0 ? "text-green-600" : "text-red-500"}`}>
                  {stats.value_trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stats.value_trend > 0 ? "+" : ""}{"\u00A3"}{Math.abs(stats.value_trend).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} this month</span>
                </div>
              )}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <PoundSterling size={16} className="text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search quotes..."
                  className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 w-56"
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode("quotes")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${viewMode === "quotes" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Quotes
              </button>
              <button
                onClick={() => setViewMode("projects")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${viewMode === "projects" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
              >
                <FolderOpen size={12} />
                Projects
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-500 mb-1">No quotes yet</p>
              <p className="text-xs text-gray-400">Create your first quote to get started</p>
            </div>
          ) : viewMode === "projects" ? (
            (() => {
              const projectMap = new Map<string, { name: string; address: string | null; quotes: typeof quotes; totalValue: number; lastDate: string }>();
              for (const q of quotes) {
                const key = (q.project_name || "Unassigned").toLowerCase();
                const existing = projectMap.get(key);
                if (existing) {
                  existing.quotes.push(q);
                  existing.totalValue += parseFloat(q.total) || 0;
                  if (q.updated_at > existing.lastDate) existing.lastDate = q.updated_at;
                } else {
                  projectMap.set(key, {
                    name: q.project_name || "Unassigned",
                    address: q.project_address || null,
                    quotes: [q],
                    totalValue: parseFloat(q.total) || 0,
                    lastDate: q.updated_at || "",
                  });
                }
              }
              const projects = Array.from(projectMap.values()).sort((a, b) => b.lastDate.localeCompare(a.lastDate));
              const STATUS_COLORS: Record<string, string> = { approved: "#10B981", sent: "#3B82F6", draft: "#9CA3AF", rejected: "#EF4444", cancelled: "#6B7280" };
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  {projects.map((proj, idx) => {
                    const statusCounts: Record<string, number> = {};
                    for (const q of proj.quotes) {
                      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
                    }
                    const total = proj.quotes.length;
                    return (
                      <div
                        key={idx}
                        onClick={() => { setSearch(proj.name === "Unassigned" ? "" : proj.name); setViewMode("quotes"); }}
                        className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <FolderOpen size={16} className="text-blue-600" />
                              <h3 className="text-sm font-medium text-gray-900">{proj.name}</h3>
                            </div>
                            {proj.address && (
                              <p className="text-xs text-gray-400 mt-0.5 ml-6">{proj.address}</p>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {"\u00A3"}{proj.totalValue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 mb-2">
                          {Object.entries(statusCounts).map(([s, count]) => (
                            <div key={s} style={{ width: `${(count / total) * 100}%`, background: STATUS_COLORS[s] || "#9CA3AF" }} />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{proj.quotes.length} quote{proj.quotes.length !== 1 ? "s" : ""}</span>
                          <div className="flex items-center gap-2">
                            {Object.entries(statusCounts).map(([s, count]) => (
                              <span key={s} className="capitalize">{count} {s}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Quote #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Client</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Project</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Total</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <QuoteTableRow
                      key={q.id}
                      quote={q}
                      onClick={() => router.push(`/quotes/${q.id}`)}
                    />
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <div />
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                      Page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
