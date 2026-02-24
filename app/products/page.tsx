"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, LayoutGrid, List, CheckCircle } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductListRow from "@/components/ProductListRow";
import ProductFilter from "@/components/ProductFilter";

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

  useEffect(() => {
    loadProducts();
  }, [pillar, status, needsReview, search, page]);

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
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Products
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {total} product{total !== 1 ? "s" : ""} in catalog
            </p>
          </div>
          <div className="flex items-center gap-2">
            {draftProducts.length > 0 && (
              <button
                onClick={handleActivateAll}
                disabled={activatingAll}
                className="flex items-center gap-2 px-4 py-2 text-green-700 border border-green-200 text-sm font-medium rounded-lg hover:bg-green-50 transition disabled:opacity-50"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                {activatingAll ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Activate {draftProducts.length} Draft{draftProducts.length !== 1 ? "s" : ""}
              </button>
            )}
            <button
              onClick={() => router.push("/products/new")}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>
        </div>

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

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No products found
            </p>
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Add products manually or scrape from a manufacturer
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Manufacturer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Pillar</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Price</th>
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
