"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Plus, LayoutGrid, List, Factory, RefreshCw, Search, Upload,
  ChevronLeft, ChevronRight, MoreVertical, Star, ExternalLink, Mail, Phone, MapPin,
  TrendingUp, TrendingDown, Package, Activity, Award, BarChart3,
  Eye, Pencil, Download,
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

const PILLAR_LABELS: Record<string, string> = {
  fire_stopping: "Fire Stopping",
  fire_doors: "Fire Doors",
  dampers: "Dampers",
  retro_fire_stopping: "Retro Fire Stopping",
  auro_lume: "Auro Lume",
};

type Tab = "suppliers" | "products";
type SortField = "name" | "category" | "products" | "status";
type SortDir = "asc" | "desc";

const fontInter = { fontFamily: "var(--font-inter)" };

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

  // Supplier table state
  const [supplierPillarFilter, setSupplierPillarFilter] = useState("");
  const [supplierSort, setSupplierSort] = useState<{ field: SortField; dir: SortDir }>({ field: "name", dir: "asc" });
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierRowsPerPage, setSupplierRowsPerPage] = useState(10);
  const [supplierDense, setSupplierDense] = useState(false);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Scrape jobs table state
  const [scrapeJobsPage, setScrapeJobsPage] = useState(1);
  const [scrapeJobsRowsPerPage, setScrapeJobsRowsPerPage] = useState(6);
  const [scrapeJobsDense, setScrapeJobsDense] = useState(false);

  // Featured suppliers state
  const [featuredPage, setFeaturedPage] = useState(1);
  const [featuredRowsPerPage, setFeaturedRowsPerPage] = useState(8);

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

  // File upload ref for action menu
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

  // Close action menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

      try {
        const mfgRes = await fetch("/api/manufacturers", { headers });
        if (mfgRes.ok) {
          const data = await mfgRes.json();
          setManufacturers(data.manufacturers || []);
        } else {
          const errData = await mfgRes.json().catch(() => ({}));
          console.warn("[library] manufacturers API:", mfgRes.status, errData);
          setError(`Failed to load suppliers (${mfgRes.status}): ${errData.error || "Unknown error"}`);
        }
      } catch (e) { console.warn("[library] manufacturers fetch failed:", e); }

      try {
        const srRes = await fetch("/api/supplier-requests", { headers });
        if (srRes.ok) {
          const data = await srRes.json();
          setSupplierRequests(data.requests || []);
        } else {
          console.warn("[library] supplier-requests API:", srRes.status);
        }
      } catch (e) { console.warn("[library] supplier-requests fetch failed:", e); }

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

  // Derive jobs from manufacturer-embedded scrape_jobs
  const allJobs = manufacturers
    .map((m) => ({ ...(m.scrape_jobs?.[0] || null), manufacturer_name: m.name, manufacturer_id: m.id }))
    .filter((j) => j.id);
  const runningJobs = allJobs.filter((j) => j.status === "running" || j.status === "queued");
  const totalPages = Math.ceil(total / limit);

  // ── Supplier table: filter, sort, paginate ──
  const filteredManufacturers = manufacturers.filter((m) => {
    if (mfgSearch && !m.name.toLowerCase().includes(mfgSearch.toLowerCase())) return false;
    if (supplierPillarFilter) {
      const mPillar = m.scraper_config?.default_pillar || "";
      if (mPillar !== supplierPillarFilter) return false;
    }
    return true;
  });

  const sortedManufacturers = [...filteredManufacturers].sort((a, b) => {
    const dir = supplierSort.dir === "asc" ? 1 : -1;
    switch (supplierSort.field) {
      case "name": return dir * a.name.localeCompare(b.name);
      case "category": {
        const ap = a.scraper_config?.default_pillar || "";
        const bp = b.scraper_config?.default_pillar || "";
        return dir * ap.localeCompare(bp);
      }
      case "products": {
        const ac = a.products?.[0]?.count || 0;
        const bc = b.products?.[0]?.count || 0;
        return dir * (ac - bc);
      }
      case "status": {
        const as_ = getSupplierStatus(a);
        const bs_ = getSupplierStatus(b);
        return dir * as_.localeCompare(bs_);
      }
      default: return 0;
    }
  });

  const supplierTotalPages = Math.ceil(sortedManufacturers.length / supplierRowsPerPage);
  const paginatedSuppliers = sortedManufacturers.slice(
    (supplierPage - 1) * supplierRowsPerPage,
    supplierPage * supplierRowsPerPage
  );

  // ── Stats ──
  const totalProducts = manufacturers.reduce((sum, m) => sum + (m.products?.[0]?.count || 0), 0);
  const topSupplier = manufacturers.reduce((best, m) => {
    const count = m.products?.[0]?.count || 0;
    return count > (best.count || 0) ? { name: m.name, count } : best;
  }, { name: "—", count: 0 });

  // ── Scrape jobs table ──
  const scrapeJobsTotalPages = Math.ceil(allJobs.length / scrapeJobsRowsPerPage);
  const paginatedJobs = allJobs.slice(
    (scrapeJobsPage - 1) * scrapeJobsRowsPerPage,
    scrapeJobsPage * scrapeJobsRowsPerPage
  );

  // ── Featured suppliers ──
  const featuredSuppliers = manufacturers.filter((m) => (m.products?.[0]?.count || 0) > 0);
  const featuredTotalPages = Math.ceil(featuredSuppliers.length / featuredRowsPerPage);
  const paginatedFeatured = featuredSuppliers.slice(
    (featuredPage - 1) * featuredRowsPerPage,
    featuredPage * featuredRowsPerPage
  );

  // ── Unique pillars for filter tabs ──
  const uniquePillars = Array.from(new Set(manufacturers.map((m) => m.scraper_config?.default_pillar).filter(Boolean))) as string[];

  function getSupplierStatus(m: any): string {
    const job = m.scrape_jobs?.[0];
    if (job?.status === "running" || job?.status === "queued") return "Pending";
    if ((m.products?.[0]?.count || 0) > 0) return "Active";
    return "Inactive";
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "Active": return "bg-green-50 text-green-700 border-green-200";
      case "Pending": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Inactive": return "bg-gray-50 text-gray-500 border-gray-200";
      default: return "bg-gray-50 text-gray-500 border-gray-200";
    }
  }

  function getJobStatusBadge(status: string) {
    switch (status) {
      case "completed": return "bg-green-50 text-green-700";
      case "running": return "bg-blue-50 text-blue-700";
      case "queued": return "bg-gray-50 text-gray-500";
      case "failed": return "bg-red-50 text-red-700";
      default: return "bg-gray-50 text-gray-500";
    }
  }

  function productCountToStars(count: number): number {
    if (count >= 50) return 5;
    if (count >= 30) return 4;
    if (count >= 15) return 3;
    if (count >= 5) return 2;
    if (count >= 1) return 1;
    return 0;
  }

  function toggleSort(field: SortField) {
    setSupplierSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
    setSupplierPage(1);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (supplierSort.field !== field) return <span className="ml-1 text-gray-300">{"\u2195"}</span>;
    return <span className="ml-1">{supplierSort.dir === "asc" ? "\u2191" : "\u2193"}</span>;
  }

  function StarRating({ count }: { count: number }) {
    const stars = productCountToStars(count);
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={14}
            className={i <= stars ? "text-amber-400 fill-amber-400" : "text-gray-200"}
          />
        ))}
      </div>
    );
  }

  function PaginationBar({
    currentPage, totalPages: tp, totalItems, rowsPerPage, onPageChange, onRowsPerPageChange,
    dense, onDenseChange,
  }: {
    currentPage: number; totalPages: number; totalItems: number; rowsPerPage: number;
    onPageChange: (p: number) => void; onRowsPerPageChange: (n: number) => void;
    dense: boolean; onDenseChange: (d: boolean) => void;
  }) {
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalItems);
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100" style={fontInter}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDenseChange(!dense)}
            className={`relative w-10 h-5 rounded-full transition-colors ${dense ? "bg-gray-800" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dense ? "translate-x-5" : ""}`} />
          </button>
          <span className="text-xs text-gray-500">Dense</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { onRowsPerPageChange(Number(e.target.value)); onPageChange(1); }}
              className="border border-gray-200 rounded px-1 py-0.5 text-xs bg-white"
            >
              {[6, 8, 10, 20, 50].map((n) => <option key={n} value={n}>{String(n).padStart(2, "0")}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-500">
            {totalItems > 0 ? `${start}-${end} of ${totalItems}` : "0 items"}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(Math.min(tp, currentPage + 1))}
              disabled={currentPage >= tp}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <Factory size={18} className="text-gray-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {tab === "suppliers" ? "Suppliers" : "Library"}
                </h1>
                <p className="text-xs text-gray-500">
                  {tab === "suppliers" ? "Manage your inventory suppliers and vendors" : "Suppliers, products, and data mining"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === "suppliers" && (
              <>
                <button
                  onClick={() => router.push("/manufacturers/new")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                >
                  <Plus size={16} />
                  Add Supplier
                </button>
                <button
                  onClick={() => {
                    // Export as CSV
                    const csv = ["Name,Category,Contact,Products,Status"];
                    manufacturers.forEach((m) => {
                      csv.push([
                        m.name,
                        PILLAR_LABELS[m.scraper_config?.default_pillar] || "",
                        m.contact_email || m.website_url || "",
                        m.products?.[0]?.count || 0,
                        getSupplierStatus(m),
                      ].join(","));
                    });
                    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "suppliers.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition"
                >
                  <Download size={16} />
                  Export
                </button>
              </>
            )}
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
          >
            Products {total > 0 && `(${total})`}
          </button>
        </div>

        {/* ===== SUPPLIERS TAB ===== */}
        {tab === "suppliers" && (
          <>
            {/* Section A: Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Suppliers */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Suppliers</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{manufacturers.length}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <TrendingUp size={12} />
                  <span>+{manufacturers.filter((m) => {
                    const d = new Date(m.created_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length} this month</span>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Package size={16} className="text-blue-500" />
                </div>
              </div>

              {/* Active Scrapes */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Scrapes</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{runningJobs.length}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                  <Activity size={12} />
                  <span>{allJobs.filter((j) => j.status === "completed").length} completed total</span>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <RefreshCw size={16} className="text-green-500" />
                </div>
              </div>

              {/* Top Supplier */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top Supplier</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 truncate">{topSupplier.name}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                  <TrendingUp size={12} />
                  <span>{topSupplier.count} products</span>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Award size={16} className="text-amber-500" />
                </div>
              </div>

              {/* Total Products */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Products</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalProducts.toLocaleString()}</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-purple-600">
                  <BarChart3 size={12} />
                  <span>Across all suppliers</span>
                </div>
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <BarChart3 size={16} className="text-purple-500" />
                </div>
              </div>
            </div>

            {/* Section B: Suppliers Data Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
              {/* Filter tabs + search */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setSupplierPillarFilter(""); setSupplierPage(1); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      !supplierPillarFilter ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    All Suppliers
                  </button>
                  {uniquePillars.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setSupplierPillarFilter(p); setSupplierPage(1); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                        supplierPillarFilter === p ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {PILLAR_LABELS[p] || p}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search Here..."
                      value={mfgSearch}
                      onChange={(e) => { setMfgSearch(e.target.value); setSupplierPage(1); }}
                      className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 w-44"
                    />
                  </div>
                  <select
                    value={`${supplierSort.field}-${supplierSort.dir}`}
                    onChange={(e) => {
                      const [f, d] = e.target.value.split("-");
                      setSupplierSort({ field: f as SortField, dir: d as SortDir });
                    }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="name-asc">Newest First</option>
                    <option value="name-desc">Oldest First</option>
                    <option value="products-desc">Most Products</option>
                    <option value="products-asc">Fewest Products</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      Item ID <SortIcon field="name" />
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("name")}>
                      Name <SortIcon field="name" />
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("category")}>
                      Category <SortIcon field="category" />
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                      Contact
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("products")}>
                      Rating <SortIcon field="products" />
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("status")}>
                      Status <SortIcon field="status" />
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                        {mfgSearch ? "No suppliers match your search" : "No suppliers yet — click \"Add Supplier\" or \"Seed Suppliers\" to get started"}
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((m, idx) => {
                      const productCount = m.products?.[0]?.count || 0;
                      const supplierStatus = getSupplierStatus(m);
                      const shortId = m.id.slice(0, 8).toUpperCase();
                      const rowBg = (m.scrape_jobs?.[0]?.status === "running" || m.scrape_jobs?.[0]?.status === "queued")
                        ? "bg-green-50/50" : "";
                      return (
                        <tr
                          key={m.id}
                          className={`border-b border-gray-50 hover:bg-gray-50/80 transition ${rowBg} ${supplierDense ? "" : ""}`}
                        >
                          <td className={`px-4 ${supplierDense ? "py-2" : "py-3"} text-xs text-gray-500 font-mono`}>
                            {shortId}
                          </td>
                          <td className={`px-4 ${supplierDense ? "py-2" : "py-3"}`}>
                            <span
                              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition"
                              onClick={() => router.push(`/manufacturers/${m.id}`)}
                            >
                              {m.name}
                            </span>
                          </td>
                          <td className={`px-4 ${supplierDense ? "py-2" : "py-3"} text-sm text-gray-600`}>
                            {PILLAR_LABELS[m.scraper_config?.default_pillar] || "—"}
                          </td>
                          <td className={`px-4 ${supplierDense ? "py-2" : "py-3"}`}>
                            {m.contact_email ? (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Mail size={13} className="text-gray-400" />
                                {m.contact_email}
                              </div>
                            ) : m.website_url ? (
                              <div className="flex items-center gap-1.5 text-sm text-gray-600 truncate max-w-[200px]">
                                <ExternalLink size={13} className="text-gray-400 flex-shrink-0" />
                                <span className="truncate">{m.website_url.replace(/^https?:\/\//, "")}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </td>
                          <td className={`px-4 ${supplierDense ? "py-2" : "py-3"}`}>
                            <StarRating count={productCount} />
                          </td>
                          <td className={`px-4 ${supplierDense ? "py-2" : "py-3"}`}>
                            <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(supplierStatus)}`}>
                              {supplierStatus}
                            </span>
                          </td>
                          <td className={`px-4 ${supplierDense ? "py-2" : "py-3"} text-right relative`}>
                            <button
                              onClick={() => setOpenActionMenu(openActionMenu === m.id ? null : m.id)}
                              className="p-1 rounded hover:bg-gray-100 transition"
                            >
                              <MoreVertical size={16} className="text-gray-400" />
                            </button>
                            {openActionMenu === m.id && (
                              <div
                                ref={actionMenuRef}
                                className="absolute right-4 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
                              >
                                <button
                                  onClick={() => { router.push(`/manufacturers/${m.id}`); setOpenActionMenu(null); }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                  <Eye size={14} /> View Details
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionMenu(null);
                                    triggerScrape(m.id);
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                  <RefreshCw size={14} /> Scrape Now
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenActionMenu(null);
                                    setPendingUploadId(m.id);
                                    fileInputRef.current?.click();
                                  }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                  <Upload size={14} /> Upload Files
                                </button>
                                <button
                                  onClick={() => { router.push(`/manufacturers/${m.id}/edit`); setOpenActionMenu(null); }}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                                >
                                  <Pencil size={14} /> Edit Supplier
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <PaginationBar
                currentPage={supplierPage}
                totalPages={supplierTotalPages}
                totalItems={sortedManufacturers.length}
                rowsPerPage={supplierRowsPerPage}
                onPageChange={setSupplierPage}
                onRowsPerPageChange={setSupplierRowsPerPage}
                dense={supplierDense}
                onDenseChange={setSupplierDense}
              />
            </div>

            {/* Section C: Recent Scrape Jobs */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <RefreshCw size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Recent Scrapes</h2>
                    <p className="text-xs text-gray-500">Your most recent supplier scrapes</p>
                  </div>
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
                        const parts: string[] = [];
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
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition"
                  >
                    <Plus size={14} />
                    Seed Suppliers
                  </button>
                  <button
                    onClick={() => {
                      const csv = ["Job ID,Supplier,Date,Products Created,Products Updated,Duration,Status"];
                      allJobs.forEach((j) => {
                        csv.push([
                          j.id.slice(0, 8),
                          j.manufacturer_name,
                          j.completed_at || j.started_at || "",
                          j.products_created || 0,
                          j.products_updated || 0,
                          j.duration_seconds ? `${j.duration_seconds}s` : "",
                          j.status,
                        ].join(","));
                      });
                      const blob = new Blob([csv.join("\n")], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "scrape-jobs.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition"
                  >
                    <Download size={14} />
                    Export List
                  </button>
                </div>
              </div>

              {allJobs.length > 0 ? (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Job ID</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Name</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Time | Date</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Products</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Duration</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                        <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedJobs.map((job) => {
                        const date = job.completed_at || job.started_at;
                        const d = date ? new Date(date) : null;
                        return (
                          <tr key={job.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition ${job.status === "running" ? "bg-green-50/30" : ""}`}>
                            <td className={`px-4 ${scrapeJobsDense ? "py-2" : "py-3"} text-xs font-mono text-gray-500`}>
                              {job.id.slice(0, 8)}
                            </td>
                            <td className={`px-4 ${scrapeJobsDense ? "py-2" : "py-3"} text-sm text-gray-900`}>
                              {job.manufacturer_name}
                            </td>
                            <td className={`px-4 ${scrapeJobsDense ? "py-2" : "py-3"} text-xs text-gray-500`}>
                              {d ? (
                                <div>
                                  <div>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                                  <div className="text-gray-400">{d.toLocaleDateString()}</div>
                                </div>
                              ) : "—"}
                            </td>
                            <td className={`px-4 ${scrapeJobsDense ? "py-2" : "py-3"} text-sm text-gray-600`}>
                              {(job.products_created || 0) + (job.products_updated || 0)}
                            </td>
                            <td className={`px-4 ${scrapeJobsDense ? "py-2" : "py-3"} text-sm text-gray-600`}>
                              {job.duration_seconds ? `${job.duration_seconds}s` : "—"}
                            </td>
                            <td className={`px-4 ${scrapeJobsDense ? "py-2" : "py-3"}`}>
                              <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${getJobStatusBadge(job.status)}`}>
                                {job.status === "completed" ? "Completed" : job.status === "running" ? "Running" : job.status === "queued" ? "Queued" : job.status === "failed" ? "Failed" : job.status}
                              </span>
                            </td>
                            <td className={`px-4 ${scrapeJobsDense ? "py-2" : "py-3"} text-right`}>
                              <button
                                onClick={() => router.push(`/manufacturers/${job.manufacturer_id}`)}
                                className="p-1 rounded hover:bg-gray-100 transition"
                              >
                                <MoreVertical size={16} className="text-gray-400" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <PaginationBar
                    currentPage={scrapeJobsPage}
                    totalPages={scrapeJobsTotalPages}
                    totalItems={allJobs.length}
                    rowsPerPage={scrapeJobsRowsPerPage}
                    onPageChange={setScrapeJobsPage}
                    onRowsPerPageChange={setScrapeJobsRowsPerPage}
                    dense={scrapeJobsDense}
                    onDenseChange={setScrapeJobsDense}
                  />
                </>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-gray-400">
                  No scrape jobs yet — select a supplier and click &quot;Scrape Now&quot;
                </div>
              )}
            </div>

            {/* Section D: Featured Suppliers Cards */}
            {featuredSuppliers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Award size={16} className="text-gray-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">Featured Suppliers</h2>
                      <p className="text-xs text-gray-500">Your top-rated and most reliable suppliers</p>
                    </div>
                  </div>
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white"
                    defaultValue="newest"
                  >
                    <option value="newest">Newest First</option>
                    <option value="products">Most Products</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {paginatedFeatured.map((m) => {
                    const productCount = m.products?.[0]?.count || 0;
                    const supplierStatus = getSupplierStatus(m);
                    return (
                      <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 truncate mr-2">{m.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getStatusBadge(supplierStatus)}`}>
                            {supplierStatus}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                          {m.website_url
                            ? `${PILLAR_LABELS[m.scraper_config?.default_pillar] || "Supplier"} — ${m.website_url.replace(/^https?:\/\//, "")}`
                            : PILLAR_LABELS[m.scraper_config?.default_pillar] || "Supplier"
                          }
                        </p>
                        <div className="space-y-1.5 mb-3">
                          {m.contact_name && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{m.contact_name}</span>
                            </div>
                          )}
                          {m.contact_email && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{m.contact_email}</span>
                            </div>
                          )}
                          {m.contact_phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone size={12} className="text-gray-400 flex-shrink-0" />
                              <span>{m.contact_phone}</span>
                            </div>
                          )}
                          {m.website_url && !m.contact_email && !m.contact_phone && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <ExternalLink size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="truncate">{m.website_url.replace(/^https?:\/\//, "")}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <StarRating count={productCount} />
                            <span className="text-xs text-gray-400 mt-0.5 block">{productCount} Products</span>
                          </div>
                          {m.website_url && (
                            <a
                              href={m.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-700"
                            >
                              <ExternalLink size={12} />
                              Visit Website
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Featured pagination */}
                <div className="flex items-center justify-between mt-4 px-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Rows per page:</span>
                    <select
                      value={featuredRowsPerPage}
                      onChange={(e) => { setFeaturedRowsPerPage(Number(e.target.value)); setFeaturedPage(1); }}
                      className="border border-gray-200 rounded px-1 py-0.5 text-xs bg-white"
                    >
                      {[4, 8, 12, 16].map((n) => <option key={n} value={n}>{String(n).padStart(2, "0")}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">
                      {featuredSuppliers.length > 0
                        ? `${(featuredPage - 1) * featuredRowsPerPage + 1}-${Math.min(featuredPage * featuredRowsPerPage, featuredSuppliers.length)} of ${featuredSuppliers.length}`
                        : "0 items"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setFeaturedPage((p) => Math.max(1, p - 1))}
                        disabled={featuredPage <= 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setFeaturedPage((p) => Math.min(featuredTotalPages, p + 1))}
                        disabled={featuredPage >= featuredTotalPages}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Requests */}
            {supplierRequests.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">
                  Supplier Requests ({supplierRequests.length})
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

            {/* Hidden file input for action menu upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.doc,.docx,.csv,.dwg,.dxf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length && pendingUploadId) {
                  handleFileUpload(pendingUploadId, e.target.files);
                }
                e.target.value = "";
                setPendingUploadId(null);
              }}
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
                />
                <select
                  value={manufacturerFilter}
                  onChange={(e) => { setManufacturerFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
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
                >
                  {PILLARS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
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
                <p className="text-gray-500 mb-2">
                  No products found
                </p>
                <p className="text-sm text-gray-400">
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pillar</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
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
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
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
