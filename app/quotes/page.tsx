"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, FileText, Clock, CheckCircle, PoundSterling } from "lucide-react";
import QuoteTableRow from "@/components/QuoteTableRow";

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
  const [stats, setStats] = useState<{ total: number; draft: number; approved: number; total_value: number } | null>(null);

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
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Quotes
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {total} quote{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => router.push("/quotes/new")}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            <Plus size={16} />
            New Quote
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Total Quotes</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>{stats.total.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-gray-500" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Draft</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>{stats.draft.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Approved</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>{stats.approved.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <PoundSterling size={16} className="text-blue-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Pipeline Value</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                £{stats.total_value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search quotes..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No quotes yet
            </p>
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Create your first quote to get started
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Quote #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Project</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Date</th>
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
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Previous
            </button>
            <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
