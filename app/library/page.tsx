"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Plus, LayoutGrid, List, Factory, RefreshCw, Search, Upload,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductListRow from "@/components/ProductListRow";
import ScraperProgress from "@/components/ScraperProgress";
import RequestSupplierModal from "@/components/RequestSupplierModal";
import SupplierRequestCard from "@/components/SupplierRequestCard";

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
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "discontinued", label: "Discontinued" },
];

type Tab = "suppliers" | "products";

export default function LibraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "suppliers";

  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suppliers tab state
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [supplierRequests, setSupplierRequests] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [mfgSearch, setMfgSearch] = useState("");
  const [scrapingId, setScrapingId] = useState<string | null>(null);

  // Products tab state
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const limit = 50;
  const [pillar, setPillar] = useState("");
  const [status, setStatus] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliersData();
  }, []);

  // Poll for updates when any scrape is running
  useEffect(() => {
    const hasActiveJob = manufacturers.some(
      (m) => m.scrape_jobs?.[0]?.status === "running" || m.scrape_jobs?.[0]?.status === "queued"
    ) || scrapingId !== null;
    if (!hasActiveJob) return;

    const interval = setInterval(() => {
      loadSuppliersData();
    }, 3000);
    return () => clearInterval(interval);
  }, [manufacturers, scrapingId]);

  useEffect(() => {
    if (tab === "products") {
      loadProducts();
    }
  }, [tab, pillar, status, needsReview, productSearch, manufacturerFilter, page]);

  function switchTab(newTab: Tab) {
    setTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.replaceState({}, "", url.toString());
  }

  async function loadSuppliersData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth"); return; }

      const headers = { Authorization: `Bearer ${session.access_token}` };

      // Load manufacturers
      try {
        const mfgRes = await fetch("/api/manufacturers", { headers });
        if (mfgRes.ok) {
          const data = await mfgRes.json();
          setManufacturers(data.manufacturers || []);
        } else {
          console.warn("[library] manufacturers API:", mfgRes.status);
        }
      } catch (e) { console.warn("[library] manufacturers fetch failed:", e); }

      // Load supplier requests
      try {
        const srRes = await fetch("/api/supplier-requests", { headers });
        if (srRes.ok) {
          const data = await srRes.json();
          setSupplierRequests(data.requests || []);
        } else {
          console.warn("[library] supplier-requests API:", srRes.status);
        }
      } catch (e) { console.warn("[library] supplier-requests fetch failed:", e); }

      // Check admin status
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("active_organization_id")
          .eq("id", session.user.id)
          .single();

        if (userData?.active_organization_id) {
          const { data: membership } = await supabase
            .from("organization_members")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("organization_id", userData.active_organization_id)
            .single();

          setIsAdmin(membership?.role === "admin" || membership?.role === "owner");
        }
      } catch { /* admin check failed */ }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    setProductsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const params = new URLSearchParams();
    if (pillar) params.set("pillar", pillar);
    if (status) params.set("status", status);
    if (needsReview) params.set("needs_review", "true");
    if (productSearch) params.set("search", productSearch);
    if (manufacturerFilter) params.set("manufacturer_id", manufacturerFilter);
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/products?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    }
    setProductsLoading(false);
  }

  const [scrapeStatus, setScrapeStatus] = useState<Record<string, { msg: string; ok: boolean }>>({});

  async function triggerScrape(manufacturerId: string) {
    setScrapingId(manufacturerId);
    setScrapeStatus((s) => ({ ...s, [manufacturerId]: { msg: "Starting scrape...", ok: true } }));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setScrapingId(null); return; }

    try {
      const res = await fetch(`/api/manufacturers/${manufacturerId}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ scrape_type: "full" }),
      });

      const data = await res.json();

      if (res.ok) {
        const mode = data.mode || "unknown";
        if (mode === "shopify" || mode === "html") {
          setScrapeStatus((s) => ({ ...s, [manufacturerId]: { msg: `Done: ${data.products_created || 0} created, ${data.products_updated || 0} updated, ${data.files_created || 0} files`, ok: true } }));
        } else if (mode === "inngest") {
          setScrapeStatus((s) => ({ ...s, [manufacturerId]: { msg: "Queued in Inngest — check back shortly", ok: true } }));
        } else {
          setScrapeStatus((s) => ({ ...s, [manufacturerId]: { msg: `Scrape started (${mode})`, ok: true } }));
        }
        await loadSuppliersData();
      } else {
        setScrapeStatus((s) => ({ ...s, [manufacturerId]: { msg: data.error || "Failed", ok: false } }));
      }
    } catch (err: any) {
      setScrapeStatus((s) => ({ ...s, [manufacturerId]: { msg: err.message || "Network error", ok: false } }));
    }
    setScrapingId(null);
  }

  async function handleRequestSupplier(data: { supplier_name: string; supplier_website: string; reason: string }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch("/api/supplier-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    await loadSuppliersData();
  }

  async function handleApproveRequest(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/supplier-requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status: "approved" }),
    });

    await loadSuppliersData();
  }

  async function handleRejectRequest(id: string, reason: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/supplier-requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status: "rejected", rejected_reason: reason }),
    });

    await loadSuppliersData();
  }

  async function handleFileUpload(manufacturerId: string, files: FileList) {
    setUploadingId(manufacturerId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    const res = await fetch(`/api/manufacturers/${manufacturerId}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      alert(`Uploaded ${data.uploaded}/${data.total} files`);
    } else {
      const err = await res.json();
      alert(err.error || "Upload failed");
    }
    setUploadingId(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Derive active/completed jobs from manufacturer-embedded scrape_jobs
  const allJobs = manufacturers
    .map((m) => ({ ...(m.scrape_jobs?.[0] || null), manufacturer_name: m.name }))
    .filter((j) => j.id);
  const runningJobs = allJobs.filter((j) => j.status === "running" || j.status === "queued");
  const completedJobs = allJobs.filter((j) => j.status === "completed" || j.status === "failed");
  const totalPages = Math.ceil(total / limit);

  const filteredManufacturers = mfgSearch
    ? manufacturers.filter((m) => m.name.toLowerCase().includes(mfgSearch.toLowerCase()))
    : manufacturers;

  const selectStyle = { fontFamily: "var(--font-ibm-plex)" };

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-6xl mx-auto">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" style={selectStyle}>
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Library
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={selectStyle}>
              Suppliers, products, and data mining
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => switchTab("suppliers")}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === "suppliers"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={selectStyle}
          >
            Suppliers
          </button>
          <button
            onClick={() => switchTab("products")}
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
              tab === "products"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            style={selectStyle}
          >
            Products {total > 0 && `(${total})`}
          </button>
        </div>

        {/* ===== SUPPLIERS TAB ===== */}
        {tab === "suppliers" && (
          <>
            {/* Search + Actions */}
            <div className="flex items-center justify-between mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={mfgSearch}
                  onChange={(e) => setMfgSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
                  style={selectStyle}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;
                    const res = await fetch("/api/manufacturers/seed", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const parts = [];
                      if (data.created > 0) parts.push(`${data.created} created`);
                      if (data.updated > 0) parts.push(`${data.updated} updated`);
                      if (data.merged > 0) parts.push(`${data.merged} duplicates merged`);
                      alert(parts.length > 0 ? `Suppliers: ${parts.join(", ")}` : "All suppliers already up to date");
                      await loadSuppliersData();
                    } else {
                      const err = await res.json();
                      alert(err.error || "Failed to seed");
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  style={selectStyle}
                >
                  Seed Suppliers
                </button>
                {isAdmin && (
                  <button
                    onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;
                      const res = await fetch("/api/manufacturers/cleanup", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${session.access_token}` },
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.archived > 0) {
                          alert(`Cleaned up ${data.archived} duplicate(s), moved ${data.products_moved} products.\n\n${data.report.join("\n")}`);
                        } else {
                          alert("No duplicates found");
                        }
                        await loadSuppliersData();
                      } else {
                        const err = await res.json();
                        alert(err.error || "Cleanup failed");
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    style={selectStyle}
                  >
                    Clean Duplicates
                  </button>
                )}
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                  style={selectStyle}
                >
                  Request Supplier
                </button>
                <button
                  onClick={() => router.push("/manufacturers/new")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
                  style={selectStyle}
                >
                  <Plus size={16} />
                  Add Supplier
                </button>
              </div>
            </div>

            {/* Manufacturer Cards */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              {filteredManufacturers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredManufacturers.map((m) => {
                    const lastJob = m.scrape_jobs?.[0] || null;
                    const statusMsg = scrapeStatus[m.id];
                    const productCount = m.products?.[0]?.count || 0;
                    return (
                      <div key={m.id} className="p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Factory size={16} className="text-gray-400 flex-shrink-0" />
                            <span
                              className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                              style={selectStyle}
                              onClick={() => router.push(`/manufacturers/${m.id}`)}
                            >
                              {m.name}
                            </span>
                            {productCount > 0 && (
                              <span className="text-xs text-gray-400 flex-shrink-0">{productCount}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <label
                              className={`p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer ${uploadingId === m.id ? "opacity-50 pointer-events-none" : ""}`}
                              title="Upload files"
                            >
                              {uploadingId === m.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Upload size={14} />
                              )}
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.dwg,.dxf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.length) handleFileUpload(m.id, e.target.files);
                                  e.target.value = "";
                                }}
                                disabled={uploadingId === m.id}
                              />
                            </label>
                            <button
                              onClick={() => triggerScrape(m.id)}
                              disabled={scrapingId === m.id}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                              title="Start scrape"
                            >
                              {scrapingId === m.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <RefreshCw size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                        {/* Status line */}
                        <div className="mt-1.5 text-xs" style={selectStyle}>
                          {statusMsg ? (
                            <span className={statusMsg.ok ? "text-green-600" : "text-red-500"}>{statusMsg.msg}</span>
                          ) : lastJob ? (
                            <span className={lastJob.status === "completed" ? "text-green-600" : lastJob.status === "failed" ? "text-red-500" : "text-amber-500"}>
                              {lastJob.status === "completed" && `${lastJob.products_created || 0} created, ${lastJob.products_updated || 0} updated · ${new Date(lastJob.completed_at).toLocaleDateString()}`}
                              {lastJob.status === "failed" && `Failed: ${(lastJob.error_log || "Unknown error").slice(0, 60)}`}
                              {lastJob.status === "running" && `Scraping${lastJob.progress?.stage ? `: ${lastJob.progress.stage}` : "..."}`}
                              {lastJob.status === "queued" && "Queued..."}
                            </span>
                          ) : m.last_scraped_at ? (
                            <span className="text-gray-400">Last scraped: {new Date(m.last_scraped_at).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-gray-300">Not scraped yet</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400" style={selectStyle}>
                  {mfgSearch ? "No suppliers match your search" : "No suppliers yet — click \"Seed Suppliers\" above"}
                </p>
              )}
            </div>

            {/* Active Jobs */}
            {runningJobs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4" style={selectStyle}>
                  Active Jobs ({runningJobs.length})
                </h2>
                <div className="space-y-3">
                  {runningJobs.map((job) => (
                    <div key={job.id}>
                      {job.manufacturer_name && (
                        <p className="text-xs text-gray-500 mb-1" style={selectStyle}>
                          {job.manufacturer_name}
                        </p>
                      )}
                      <ScraperProgress job={job} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scrape History */}
            {completedJobs.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4" style={selectStyle}>
                  Scrape History
                </h2>
                <div className="space-y-3">
                  {completedJobs.map((job) => (
                    <div key={job.id}>
                      {job.manufacturer_name && (
                        <p className="text-xs text-gray-500 mb-1" style={selectStyle}>
                          {job.manufacturer_name}
                        </p>
                      )}
                      <ScraperProgress job={job} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supplier Requests */}
            {supplierRequests.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4" style={selectStyle}>
                  Supplier Requests
                </h2>
                <div className="space-y-3">
                  {supplierRequests.map((req) => (
                    <SupplierRequestCard
                      key={req.id}
                      request={req}
                      isAdmin={isAdmin}
                      onApprove={handleApproveRequest}
                      onReject={handleRejectRequest}
                    />
                  ))}
                </div>
              </div>
            )}

            <RequestSupplierModal
              open={showRequestModal}
              onClose={() => setShowRequestModal(false)}
              onSubmit={handleRequestSupplier}
            />
          </>
        )}

        {/* ===== PRODUCTS TAB ===== */}
        {tab === "products" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
                  style={selectStyle}
                />
                <select
                  value={manufacturerFilter}
                  onChange={(e) => { setManufacturerFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                  style={selectStyle}
                >
                  <option value="">All Suppliers</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <select
                  value={pillar}
                  onChange={(e) => { setPillar(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                  style={selectStyle}
                >
                  {PILLARS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                  style={selectStyle}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer" style={selectStyle}>
                  <input
                    type="checkbox"
                    checked={needsReview}
                    onChange={(e) => { setNeedsReview(e.target.checked); setPage(1); }}
                    className="rounded border-gray-300"
                  />
                  Needs review
                </label>
              </div>
              <div className="flex items-center gap-1 ml-4">
                <button
                  onClick={() => setView("grid")}
                  className={`p-2 rounded-lg transition ${view === "grid" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`p-2 rounded-lg transition ${view === "list" ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>

            {productsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-2" style={selectStyle}>
                  No products found
                </p>
                <p className="text-sm text-gray-400" style={selectStyle}>
                  Add products manually or scrape from a supplier
                </p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onClick={() => router.push(`/products/${p.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Manufacturer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Pillar</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={selectStyle}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <ProductListRow
                        key={p.id}
                        product={p}
                        onClick={() => router.push(`/products/${p.id}`)}
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
      </div>
    </div>
  );
}
