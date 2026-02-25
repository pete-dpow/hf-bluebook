"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Play, Globe, Trash2, Pencil, Check, X, Factory, Package, RefreshCw, Mail, Phone, MapPin, ExternalLink, Search, ChevronDown, ChevronUp } from "lucide-react";
import ScraperProgress from "@/components/ScraperProgress";

const PILLAR_LABELS: Record<string, string> = {
  fire_doors: "Fire Doors",
  dampers: "Dampers",
  fire_stopping: "Fire Stopping",
  retro_fire_stopping: "Retro Fire Stopping",
  auro_lume: "Auro Lume",
};

const fontInter = { fontFamily: "var(--font-inter)" };

export default function ManufacturerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [manufacturer, setManufacturer] = useState<any>(null);
  const [scrapeJobs, setScrapeJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  useEffect(() => {
    loadManufacturer();
  }, [params.id]);

  // Poll for updates when a scrape is running or queued
  useEffect(() => {
    const hasActiveJob = scrapeJobs.some((j) => j.status === "running" || j.status === "queued");
    if (!hasActiveJob && !scraping) return;

    const interval = setInterval(async () => {
      const { data: jobs } = await supabase
        .from("scrape_jobs")
        .select("*")
        .eq("manufacturer_id", params.id)
        .order("started_at", { ascending: false })
        .limit(5);

      if (jobs) {
        setScrapeJobs(jobs);
        const stillActive = jobs.some((j: any) => j.status === "running" || j.status === "queued");
        if (!stillActive) {
          loadManufacturer();
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [scrapeJobs, scraping, params.id]);

  async function loadManufacturer() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch(`/api/manufacturers/${params.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setManufacturer(data.manufacturer);
    }

    const { data: jobs } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("manufacturer_id", params.id)
      .order("started_at", { ascending: false })
      .limit(5);

    setScrapeJobs(jobs || []);
    setLoading(false);
  }

  async function triggerScrape() {
    setScraping(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/manufacturers/${params.id}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ scrape_type: "full" }),
    });

    if (res.ok) {
      await loadManufacturer();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to start scrape");
    }
    setScraping(false);
  }

  async function triggerTestScrape() {
    setTesting(true);
    setTestResult(null);
    setDryRunResult(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Step 1: connectivity test
    const testRes = await fetch(`/api/manufacturers/${params.id}/scrape/test`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (testRes.ok) {
      const data = await testRes.json();
      setTestResult(data);

      // Step 2: dry run
      const dryRes = await fetch(`/api/manufacturers/${params.id}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ scrape_type: "full", dry_run: true }),
      });
      if (dryRes.ok) {
        setDryRunResult(await dryRes.json());
      }
    } else {
      const err = await testRes.json();
      setTestResult({ error: err.error || "Test failed" });
    }
    setTesting(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${manufacturer?.name}? This will archive the manufacturer and all its products.`)) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/manufacturers/${params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      router.push("/library?tab=suppliers");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete");
      setDeleting(false);
    }
  }

  async function saveUrl() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/manufacturers/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ website_url: urlDraft }),
    });

    setEditingUrl(false);
    await loadManufacturer();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <p className="text-gray-500" style={fontInter}>Manufacturer not found</p>
      </div>
    );
  }

  const productCount = manufacturer.products?.length || 0;
  const completedJobs = scrapeJobs.filter((j) => j.status === "completed").length;

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/library?tab=suppliers")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} />
          All Suppliers
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Factory size={20} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{manufacturer.name}</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <Globe size={13} className="text-gray-400 flex-shrink-0" />
                {editingUrl ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="url"
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveUrl(); if (e.key === "Escape") setEditingUrl(false); }}
                      className="px-2 py-0.5 border border-blue-300 rounded text-xs focus:outline-none focus:border-blue-500 w-72"
                      autoFocus
                      placeholder="https://..."
                    />
                    <button onClick={saveUrl} className="p-0.5 text-green-600 hover:text-green-700"><Check size={13} /></button>
                    <button onClick={() => setEditingUrl(false)} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {manufacturer.website_url ? (
                      <a href={manufacturer.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        {manufacturer.website_url.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">No URL set</span>
                    )}
                    <button
                      onClick={() => { setUrlDraft(manufacturer.website_url || ""); setEditingUrl(true); }}
                      className="p-0.5 text-gray-400 hover:text-blue-600 transition"
                    >
                      <Pencil size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerTestScrape}
              disabled={testing || scraping}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {testing ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Test
            </button>
            <button
              onClick={triggerScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {scraping ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Scrape Products
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Products</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{productCount}</div>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package size={16} className="text-blue-500" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scrapes Completed</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{completedJobs}</div>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <RefreshCw size={16} className="text-green-500" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{PILLAR_LABELS[manufacturer.scraper_config?.default_pillar] || "—"}</div>
            <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Factory size={16} className="text-purple-500" />
            </div>
          </div>
        </div>

        {/* Test Scrape Results */}
        {(testResult || dryRunResult) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Scrape Test Results</h2>
              <button onClick={() => { setTestResult(null); setDryRunResult(null); }} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
            </div>

            {testResult?.error && (
              <p className="text-sm text-red-600 mb-2">{testResult.error}</p>
            )}

            {testResult?.summary && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>Scraper: <strong>{testResult.scraperType}</strong> ({testResult.detailMethod})</span>
                  <span>Listings: <strong>{testResult.summary.accessibleListings}/{testResult.summary.totalListings}</strong> accessible</span>
                  <span>Product URLs: <strong>{testResult.summary.totalProductUrlsFound}</strong></span>
                  {testResult.summary.detailPagesAccessible !== null && (
                    <span>Detail pages: <strong className={testResult.summary.detailPagesAccessible ? "text-green-600" : "text-amber-600"}>
                      {testResult.summary.detailPagesAccessible ? "Accessible" : "Blocked"}
                    </strong></span>
                  )}
                </div>
                <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">{testResult.summary.recommendation}</p>

                {testResult.diagnostics?.length > 0 && (
                  <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                    {testResult.diagnostics.map((d: any, i: number) => (
                      <div key={i} className={`flex items-center gap-2 ${d.accessible ? "text-green-700" : "text-red-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${d.accessible ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="truncate flex-1 font-mono">{d.url.replace(/^https?:\/\//, "")}</span>
                        <span>{d.status || "ERR"}</span>
                        <span>{d.responseTimeMs}ms</span>
                        {d.productUrlCount > 0 && <span className="text-gray-500">({d.productUrlCount} URLs)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {dryRunResult && (
              <div className="border-t border-gray-100 pt-3 mt-3">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Dry Run Preview</h3>
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                  <span>Total: <strong>{dryRunResult.total_products}</strong></span>
                  <span className="text-green-600">New: <strong>{dryRunResult.would_create}</strong></span>
                  <span className="text-blue-600">Update: <strong>{dryRunResult.would_update}</strong></span>
                </div>
                {dryRunResult.categories && Object.keys(dryRunResult.categories).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {Object.entries(dryRunResult.categories).map(([cat, count]: [string, any]) => (
                      <span key={cat} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{cat}: {count}</span>
                    ))}
                  </div>
                )}
                {dryRunResult.sample_products?.length > 0 && (
                  <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                    {dryRunResult.sample_products.slice(0, 10).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-gray-600">
                        <span className="font-medium text-gray-900 truncate" style={{ maxWidth: "300px" }}>{p.product_name}</span>
                        <span className="text-gray-400 font-mono">{p.product_code || "—"}</span>
                        <span className="text-gray-400">{p.spec_count} specs</span>
                        {p.pdf_count > 0 && <span className="text-blue-500">{p.pdf_count} PDFs</span>}
                      </div>
                    ))}
                    {dryRunResult.sample_products.length > 10 && (
                      <p className="text-gray-400">...and {dryRunResult.total_products - 10} more</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contact Details */}
        {(manufacturer.contact_name || manufacturer.contact_email || manufacturer.contact_phone) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Contact Details</h2>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 block">Name</span>
                  <span className="text-gray-900">{manufacturer.contact_name || "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span className="text-gray-900">{manufacturer.contact_email || "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400" />
                <div>
                  <span className="text-xs text-gray-500 block">Phone</span>
                  <span className="text-gray-900">{manufacturer.contact_phone || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Products ({productCount})</h2>
            <button
              onClick={() => router.push(`/products/new?manufacturer=${params.id}`)}
              className="text-xs text-blue-600 hover:underline"
            >
              + Add Product
            </button>
          </div>
          {manufacturer.products?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Code</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Pillar</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {manufacturer.products.map((p: any) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition"
                  >
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{p.product_name}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 font-mono">{p.product_code || "—"}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-gray-600">{PILLAR_LABELS[p.pillar] || p.pillar}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          p.status === "active" ? "bg-green-50 text-green-700"
                          : p.status === "discontinued" ? "bg-red-50 text-red-600"
                          : "bg-gray-100 text-gray-600"
                        }`}>
                          {p.status || "draft"}
                        </span>
                        {p.needs_review && (
                          <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full">Review</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              No products yet. Scrape or add manually.
            </p>
          )}
        </div>

        {/* Scrape History */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Scrape History</h2>
          {scrapeJobs.length > 0 ? (
            <div className="space-y-3">
              {scrapeJobs.map((job) => (
                <ScraperProgress key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No scrape jobs yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
