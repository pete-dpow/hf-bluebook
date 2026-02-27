"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, LayoutGrid, List, CheckCircle, Package, AlertCircle, Building2, TrendingUp, TrendingDown } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductListRow from "@/components/ProductListRow";
import ProductFilter from "@/components/ProductFilter";

const fontInter = { fontFamily: "var(--font-inter)" };

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const limit = 50;

  // Filters
  const [pillar, setPillar] = useState("");
  const [status, setStatus] = useState("");
  const [needsReview, setNeedsReview] = useState(false);
  const [search, setSearch] = useState("");
  const [activatingAll, setActivatingAll] = useState(false);
  const [stats, setStats] = useState<{ total: number; active: number; needs_review: number; manufacturers: number; total_trend: number; active_trend: number; needs_review_trend: number } | null>(null);

  useEffect(() => {
    loadProducts();
  }, [pillar, status, needsReview, search, page]);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch("/api/products/stats", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setStats(await res.json());
  }

  async function loadProducts() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const params = new URLSearchParams();
    if (pillar) params.set("pillar", pillar);
    if (status) params.set("status", status);
    if (needsReview) params.set("needs_review", "true");
    if (search) params.set("search", search);
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
    setLoading(false);
  }

  const draftProducts = products.filter((p) => p.status === "draft" || p.needs_review);

  async function handleActivateAll() {
    if (draftProducts.length === 0) return;
    if (!confirm(`Activate ${draftProducts.length} draft product${draftProducts.length !== 1 ? "s" : ""}?`)) return;

    setActivatingAll(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let failed = 0;
    for (const p of draftProducts) {
      const res = await fetch(`/api/products/${p.id}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approve: true }),
      });
      if (!res.ok) failed++;
    }

    setActivatingAll(false);
    if (failed > 0) alert(`${failed} product${failed !== 1 ? "s" : ""} failed to activate`);
    await loadProducts();
    loadStats();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Package size={20} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Products</h1>
              <p className="text-xs text-gray-500">
                {total} product{total !== 1 ? "s" : ""} in catalog
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draftProducts.length > 0 && (
              <button
                onClick={handleActivateAll}
                disabled={activatingAll}
                className="flex items-center gap-2 px-4 py-2 text-green-700 border border-green-200 text-sm font-medium rounded-lg hover:bg-green-50 transition disabled:opacity-50"
              >
                {activatingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Activate {draftProducts.length} Draft{draftProducts.length !== 1 ? "s" : ""}
              </button>
            )}
            <button
              onClick={() => router.push("/products/new")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Products</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
              {stats.total_trend !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.total_trend > 0 ? "text-green-600" : "text-red-500"}`}>
                  {stats.total_trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stats.total_trend > 0 ? "+" : ""}{stats.total_trend} this month</span>
                </div>
              )}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package size={16} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.active.toLocaleString()}</div>
              {stats.active_trend !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.active_trend > 0 ? "text-green-600" : "text-red-500"}`}>
                  {stats.active_trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stats.active_trend > 0 ? "+" : ""}{stats.active_trend} this month</span>
                </div>
              )}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle size={16} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Needs Review</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.needs_review.toLocaleString()}</div>
              {stats.needs_review_trend !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.needs_review_trend > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {stats.needs_review_trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{stats.needs_review_trend > 0 ? "+" : ""}{stats.needs_review_trend} this month</span>
                </div>
              )}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle size={16} className="text-amber-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Manufacturers</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.manufacturers.toLocaleString()}</div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Building2 size={16} className="text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Filters + View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <ProductFilter
            pillar={pillar}
            status={status}
            needsReview={needsReview}
            search={search}
            onPillarChange={(v) => { setPillar(v); setPage(1); }}
            onStatusChange={(v) => { setStatus(v); setPage(1); }}
            onNeedsReviewChange={(v) => { setNeedsReview(v); setPage(1); }}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
          />
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg transition ${view === "grid" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg transition ${view === "list" ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-600"}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">No products found</p>
            <p className="text-sm text-gray-400">Add products manually or scrape from a manufacturer</p>
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
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Code</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Manufacturer</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Pillar</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
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
          <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
            <span>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              <span>
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
          </div>
        )}
      </div>
    </div>
  );
}
