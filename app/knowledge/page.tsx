"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, BookOpen, RefreshCw, AlertCircle } from "lucide-react";

const fontInter = { fontFamily: "var(--font-inter)" };

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

export default function KnowledgePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalChunks, setTotalChunks] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [pillarCounts, setPillarCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [ingesting, setIngesting] = useState(false);

  const [error, setError] = useState("");

  // Ingest form
  const [sourceFile, setSourceFile] = useState("");
  const [driveId, setDriveId] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
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
    setLoading(false);
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceFile.trim()) return;

    setIngesting(true);
    setError("");
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
        await loadStatus();
      } else {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setError(err.error || "Failed to trigger ingestion");
      }
    } catch {
      setError("Network error \u2014 check your connection and try again");
    }
    setIngesting(false);
  }

  function formatDate(d: string | null): string {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "complete": return "bg-green-50 text-green-700";
      case "processing": return "bg-blue-50 text-blue-700";
      case "error": return "bg-red-50 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Knowledge Base
              </h1>
              <p className="text-xs text-gray-500">
                Bluebook PDF ingestion and RAG knowledge management
              </p>
            </div>
          </div>
          <button
            onClick={loadStatus}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={16} className="text-blue-600" />
              <span className="text-sm text-gray-500">Total Chunks</span>
            </div>
            <p className="text-2xl font-medium text-gray-900">
              {totalChunks.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Upload size={16} className="text-blue-600" />
              <span className="text-sm text-gray-500">Source Files</span>
            </div>
            <p className="text-2xl font-medium text-gray-900">
              {totalFiles}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={16} className="text-blue-600" />
              <span className="text-sm text-gray-500">Ingestions</span>
            </div>
            <p className="text-2xl font-medium text-gray-900">
              {logs.length}
            </p>
          </div>
        </div>

        {/* Pillar breakdown */}
        {Object.keys(pillarCounts).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Chunks by Pillar
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(pillarCounts).map(([pillar, count]) => (
                <div key={pillar} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {PILLAR_LABELS[pillar] || pillar}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inline error banner */}
        {error && (
          <div
            className="mb-6 p-4 rounded-lg flex items-start gap-3"
            style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              {error}
            </p>
          </div>
        )}

        {/* Ingest Form (admin only) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Ingest PDF from OneDrive
          </h2>
          <form onSubmit={handleIngest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source File Path *
              </label>
              <input
                type="text"
                value={sourceFile}
                onChange={(e) => setSourceFile(e.target.value)}
                required
                placeholder="e.g. Bluebook/Fire Doors/FD30 Spec.pdf"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OneDrive Drive ID
              </label>
              <input
                type="text"
                value={driveId}
                onChange={(e) => setDriveId(e.target.value)}
                placeholder="Drive ID from SharePoint/OneDrive"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <button
              type="submit"
              disabled={ingesting || !sourceFile.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
            >
              {ingesting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              Start Ingestion
            </button>
          </form>
        </div>

        {/* Ingestion Logs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-900">
              Ingestion History
            </h3>
          </div>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">
                No ingestions yet
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pages</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Chunks</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.source_file}
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-0.5">{log.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${statusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">
                      {log.pages_processed}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">
                      {log.chunks_created}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(log.completed_at || log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
