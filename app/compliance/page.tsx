"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2, ShieldCheck, AlertCircle, CheckCircle, RefreshCw,
  Upload, BookOpen,
} from "lucide-react";
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

const REG_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "in_force", label: "In Force" },
  { value: "under_revision", label: "Under Revision" },
  { value: "legacy", label: "Legacy" },
  { value: "draft", label: "Draft" },
];

const PILLAR_LABELS: Record<string, string> = {
  fire_doors: "Fire Doors",
  dampers: "Dampers",
  fire_stopping: "Fire Stopping",
  retro_fire_stopping: "Retro Fire Stopping",
  auro_lume: "Auro Lume",
  unclassified: "Unclassified",
};

interface IngestionLog {
  id: string;
  source_file: string;
  status: string;
  pages_processed: number;
  chunks_created: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

type Tab = "regulations" | "knowledge";

export default function CompliancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "regulations";

  const [tab, setTab] = useState<Tab>(initialTab);

  // Regulations state
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
  const [bulkScraping, setBulkScraping] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  // Knowledge base state
  const [kbLoading, setKbLoading] = useState(false);
  const [totalChunks, setTotalChunks] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [pillarCounts, setPillarCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [ingesting, setIngesting] = useState(false);
  const [kbError, setKbError] = useState("");
  const [sourceFile, setSourceFile] = useState("");
  const [driveId, setDriveId] = useState("");

  useEffect(() => {
    loadRegulations();
  }, [category, pillar, status, search, page]);

  useEffect(() => {
    if (tab === "knowledge") {
      loadKnowledgeStatus();
    }
  }, [tab]);

  function switchTab(newTab: Tab) {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.replaceState({}, "", url.toString());
  }

  // === Regulations Functions ===

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

  async function handleUpdateAll() {
    setBulkScraping(true);
    setBulkProgress("Starting...");
    setError("");
    setSuccessMsg("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch("/api/compliance/scrape-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start bulk update");
        setBulkScraping(false);
        setBulkProgress("");
        return;
      }

      if (data.mode === "inngest") {
        setBulkProgress(`Updating ${data.total} regulations in background...`);
        let checks = 0;
        const pollInterval = setInterval(async () => {
          checks++;
          await loadRegulations();
          if (checks >= 3) {
            clearInterval(pollInterval);
            setBulkScraping(false);
            setBulkProgress("");
            setSuccessMsg(`Update started for ${data.total} regulations — sections will appear as processing completes`);
          }
        }, 10000);
      } else {
        const succeeded = data.results?.filter((r: any) => r.status === "ok").length || 0;
        setSuccessMsg(`Updated ${succeeded}/${data.total} regulations successfully`);
        setBulkScraping(false);
        setBulkProgress("");
        loadRegulations();
      }
    } catch {
      setError("Network error — check your connection and try again");
      setBulkScraping(false);
      setBulkProgress("");
    }
  }

  // === Knowledge Base Functions ===

  async function loadKnowledgeStatus() {
    setKbLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch("/api/bluebook/status", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setTotalChunks(data.total_chunks || 0);
      setTotalFiles(data.total_files || 0);
      setPillarCounts(data.pillar_counts || {});
      setLogs(data.ingestion_logs || []);
    }
    setKbLoading(false);
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceFile.trim()) return;

    setIngesting(true);
    setKbError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    try {
      const res = await fetch("/api/bluebook/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          source_file: sourceFile.trim(),
          source_file_drive_id: driveId.trim() || null,
        }),
      });

      if (res.ok) {
        setSourceFile("");
        setDriveId("");
        await loadKnowledgeStatus();
      } else {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setKbError(err.error || "Failed to trigger ingestion");
      }
    } catch {
      setKbError("Network error — check your connection and try again");
    }
    setIngesting(false);
  }

  function formatDate(d: string | null): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const kbStatusColor = (s: string) => {
    switch (s) {
      case "complete": return "bg-green-50 text-green-700";
      case "processing": return "bg-blue-50 text-blue-700";
      case "error": return "bg-red-50 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const totalPages = Math.ceil(total / limit);
  const selectStyle = { fontFamily: "var(--font-ibm-plex)" };

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Compliance
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={selectStyle}>
              Regulations and knowledge base
            </p>
          </div>
          {tab === "regulations" && regulations.length > 0 && (
            <button
              onClick={handleUpdateAll}
              disabled={bulkScraping}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              style={selectStyle}
            >
              {bulkScraping ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {bulkScraping ? bulkProgress || "Updating..." : "Update All"}
            </button>
          )}
          {tab === "knowledge" && (
            <button
              onClick={loadKnowledgeStatus}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              style={selectStyle}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => switchTab("regulations")}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === "regulations"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={selectStyle}
          >
            Regulations {total > 0 && `(${total})`}
          </button>
          <button
            onClick={() => switchTab("knowledge")}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === "knowledge"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={selectStyle}
          >
            Knowledge Base
          </button>
        </div>

        {/* ===== REGULATIONS TAB ===== */}
        {tab === "regulations" && (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                style={selectStyle}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <select
                value={pillar}
                onChange={(e) => { setPillar(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                style={selectStyle}
              >
                {PILLARS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                style={selectStyle}
              >
                {REG_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search regulations..."
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
                style={selectStyle}
              />
            </div>

            {/* Error/Success banners */}
            {error && (
              <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm" style={{ ...selectStyle, color: "#991B1B" }}>{error}</p>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm" style={{ ...selectStyle, color: "#166534" }}>{successMsg}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : regulations.length === 0 ? (
              <div className="text-center py-16">
                <ShieldCheck size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2" style={selectStyle}>No regulations found</p>
                <p className="text-sm text-gray-400 mb-4" style={selectStyle}>
                  Regulations will appear here once seeded
                </p>
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  style={selectStyle}
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
                  style={selectStyle}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500" style={selectStyle}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
                  style={selectStyle}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== KNOWLEDGE BASE TAB ===== */}
        {tab === "knowledge" && (
          <>
            {kbLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={16} className="text-blue-600" />
                      <span className="text-sm text-gray-500" style={selectStyle}>Total Chunks</span>
                    </div>
                    <p className="text-2xl font-medium text-gray-900" style={selectStyle}>
                      {totalChunks.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Upload size={16} className="text-blue-600" />
                      <span className="text-sm text-gray-500" style={selectStyle}>Source Files</span>
                    </div>
                    <p className="text-2xl font-medium text-gray-900" style={selectStyle}>
                      {totalFiles}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={16} className="text-blue-600" />
                      <span className="text-sm text-gray-500" style={selectStyle}>Ingestions</span>
                    </div>
                    <p className="text-2xl font-medium text-gray-900" style={selectStyle}>
                      {logs.length}
                    </p>
                  </div>
                </div>

                {/* Pillar breakdown */}
                {Object.keys(pillarCounts).length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-4" style={selectStyle}>
                      Chunks by Pillar
                    </h2>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(pillarCounts).map(([p, count]) => (
                        <div key={p} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-700" style={selectStyle}>
                            {PILLAR_LABELS[p] || p}
                          </span>
                          <span className="text-sm font-medium text-gray-900" style={selectStyle}>
                            {count.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* KB error */}
                {kbError && (
                  <div className="mb-6 p-4 rounded-lg flex items-start gap-3" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm" style={{ ...selectStyle, color: "#991B1B" }}>{kbError}</p>
                  </div>
                )}

                {/* Ingest Form */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
                  <h2 className="text-lg font-medium text-gray-900 mb-4" style={selectStyle}>
                    Ingest PDF from OneDrive
                  </h2>
                  <form onSubmit={handleIngest} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={selectStyle}>
                        Source File Path *
                      </label>
                      <input
                        type="text"
                        value={sourceFile}
                        onChange={(e) => setSourceFile(e.target.value)}
                        required
                        placeholder="e.g. Bluebook/Fire Doors/FD30 Spec.pdf"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        style={selectStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={selectStyle}>
                        OneDrive Drive ID
                      </label>
                      <input
                        type="text"
                        value={driveId}
                        onChange={(e) => setDriveId(e.target.value)}
                        placeholder="Drive ID from SharePoint/OneDrive"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
                        style={selectStyle}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={ingesting || !sourceFile.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
                      style={selectStyle}
                    >
                      {ingesting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Start Ingestion
                    </button>
                  </form>
                </div>

                {/* Ingestion Logs */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-sm font-medium text-gray-700" style={selectStyle}>
                      Ingestion History
                    </h3>
                  </div>
                  {logs.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-400" style={selectStyle}>
                        No ingestions yet
                      </p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>File</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Status</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Pages</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Chunks</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100">
                            <td className="px-4 py-3 text-sm text-gray-900" style={selectStyle}>
                              {log.source_file}
                              {log.error_message && (
                                <p className="text-xs text-red-500 mt-0.5">{log.error_message}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${kbStatusColor(log.status)}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-right" style={selectStyle}>
                              {log.pages_processed}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-right" style={selectStyle}>
                              {log.chunks_created}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500" style={selectStyle}>
                              {formatDate(log.completed_at || log.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
