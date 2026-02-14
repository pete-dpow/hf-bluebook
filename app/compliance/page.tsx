"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";
import RegulationCard from "@/components/RegulationCard";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "legislation", label: "Legislation" },
  { value: "approved_document", label: "Approved Documents" },
  { value: "british_standard", label: "British Standards" },
  { value: "european_standard", label: "European Standards" },
  { value: "industry_guidance", label: "Industry Guidance" },
];

const PILLARS = [
  { value: "", label: "All Pillars" },
  { value: "fire_doors", label: "Fire Doors" },
  { value: "dampers", label: "Dampers" },
  { value: "fire_stopping", label: "Fire Stopping" },
  { value: "retro_fire_stopping", label: "Retro Fire Stopping" },
  { value: "auro_lume", label: "Auro Lume" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "in_force", label: "In Force" },
  { value: "under_revision", label: "Under Revision" },
  { value: "legacy", label: "Legacy" },
  { value: "draft", label: "Draft" },
];

export default function CompliancePage() {
  const router = useRouter();
  const [regulations, setRegulations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;

  const [category, setCategory] = useState("");
  const [pillar, setPillar] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    loadRegulations();
  }, [category, pillar, status, search, page]);

  async function loadRegulations() {
    setLoading(true);
    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (pillar) params.set("pillar", pillar);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("limit", String(limit));

    try {
      const res = await fetch(`/api/compliance?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRegulations(data.regulations || []);
        setTotal(data.total || 0);
      } else {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setError(err.error || "Failed to load regulations");
      }
    } catch {
      setError("Network error — check your connection and try again");
    }
    setLoading(false);
  }

  async function handleSeed() {
    setSeeding(true);
    setError("");
    setSuccessMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch("/api/compliance/seed", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`Seeded ${data.created} regulations successfully`);
        loadRegulations();
      } else {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setError(err.error || "Failed to seed regulations");
      }
    } catch {
      setError("Network error — check your connection and try again");
    }
    setSeeding(false);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Compliance Library
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {total} regulation{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={pillar}
            onChange={(e) => { setPillar(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {PILLARS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
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
            placeholder="Search regulations..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          />
        </div>

        {/* Inline error/success banners */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg flex items-start gap-3"
            style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm" style={{ fontFamily: "var(--font-ibm-plex)", color: "#991B1B" }}>
              {error}
            </p>
          </div>
        )}
        {successMsg && (
          <div
            className="mb-6 p-4 rounded-lg flex items-start gap-3"
            style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}
          >
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm" style={{ fontFamily: "var(--font-ibm-plex)", color: "#166534" }}>
              {successMsg}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : regulations.length === 0 ? (
          <div className="text-center py-16">
            <ShieldCheck size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No regulations found
            </p>
            <p className="text-sm text-gray-400 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Regulations will appear here once seeded
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {seeding ? "Seeding..." : "Seed 14 Starting Regulations"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regulations.map((r) => (
              <RegulationCard
                key={r.id}
                regulation={r}
                onClick={() => router.push(`/compliance/${r.id}`)}
              />
            ))}
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
