"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle, XCircle, Wand2, ChevronDown, ChevronRight,
  Filter, Loader2, Package, AlertTriangle, ClipboardCheck,
} from "lucide-react";

const fontInter = { fontFamily: "var(--font-inter)" };

interface Product {
  id: string;
  product_name: string;
  product_code: string;
  pillar: string;
  status: string;
  needs_review: boolean;
  description: string | null;
  specifications: Record<string, string> | null;
  normalization_confidence: number | null;
  normalization_warnings: string[] | null;
  normalized_at: string | null;
  manufacturer_id: string;
  manufacturers?: { name: string };
}

const PILLARS = [
  { value: "", label: "All Pillars" },
  { value: "fire_doors", label: "Fire Doors" },
  { value: "dampers", label: "Dampers" },
  { value: "fire_stopping", label: "Fire Stopping" },
  { value: "retro_fire_stopping", label: "Retro Fire Stopping" },
  { value: "auro_lume", label: "Auro Lume" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "needs_review", label: "Needs Review" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
];

export default function ReviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [manufacturers, setManufacturers] = useState<{ id: string; name: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Filters
  const [filterManufacturer, setFilterManufacturer] = useState("");
  const [filterPillar, setFilterPillar] = useState("");
  const [filterStatus, setFilterStatus] = useState("needs_review");
  const [filterConfMin, setFilterConfMin] = useState(0);
  const [filterConfMax, setFilterConfMax] = useState(100);

  // Inline editing
  const [editingSpecs, setEditingSpecs] = useState<Record<string, string> | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let query = supabase
      .from("products")
      .select("id, product_name, product_code, pillar, status, needs_review, description, specifications, normalization_confidence, normalization_warnings, normalized_at, manufacturer_id, manufacturers(name)")
      .order("needs_review", { ascending: false })
      .order("product_name", { ascending: true })
      .limit(200);

    if (filterManufacturer) query = query.eq("manufacturer_id", filterManufacturer);
    if (filterPillar) query = query.eq("pillar", filterPillar);
    if (filterStatus === "needs_review") {
      query = query.eq("needs_review", true);
    } else if (filterStatus) {
      query = query.eq("status", filterStatus);
    }

    const { data } = await query;
    let filtered = (data || []) as unknown as Product[];

    // Client-side confidence filter
    if (filterConfMin > 0 || filterConfMax < 100) {
      filtered = filtered.filter((p) => {
        const conf = p.normalization_confidence ?? 0;
        return conf >= filterConfMin && conf <= filterConfMax;
      });
    }

    setProducts(filtered);
    setSelectedIds(new Set());
    setLoading(false);
  }, [filterManufacturer, filterPillar, filterStatus, filterConfMin, filterConfMax]);

  const loadCounts = useCallback(async () => {
    const { count: total } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });
    const { count: reviewed } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("needs_review", false);
    setTotalCount(total || 0);
    setReviewedCount(reviewed || 0);
  }, []);

  const loadManufacturers = useCallback(async () => {
    const { data } = await supabase
      .from("manufacturers")
      .select("id, name")
      .order("name");
    setManufacturers(data || []);
  }, []);

  useEffect(() => {
    loadProducts();
    loadCounts();
    loadManufacturers();
  }, [loadProducts, loadCounts, loadManufacturers]);

  async function handleBatchAction(action: "approve" | "reject" | "normalize") {
    if (selectedIds.size === 0) return;
    setActionLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setActionLoading(false); return; }

    await fetch("/api/products/batch-review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        product_ids: Array.from(selectedIds),
        action,
      }),
    });

    setActionLoading(false);
    setSelectedIds(new Set());
    loadProducts();
    loadCounts();
  }

  async function handleSaveSpecs(productId: string) {
    if (!editingSpecs) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ specifications: editingSpecs }),
    });

    setEditingProductId(null);
    setEditingSpecs(null);
    loadProducts();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  function confidenceColor(conf: number | null): string {
    if (conf === null) return "text-gray-400";
    if (conf >= 80) return "text-green-600";
    if (conf >= 50) return "text-amber-600";
    return "text-red-600";
  }

  function confidenceBg(conf: number | null): string {
    if (conf === null) return "bg-gray-100";
    if (conf >= 80) return "bg-green-50";
    if (conf >= 50) return "bg-amber-50";
    return "bg-red-50";
  }

  const pillarLabel = (p: string) => PILLARS.find((x) => x.value === p)?.label || p;

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Product Review Queue</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {reviewedCount} of {totalCount} reviewed
                {totalCount > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    ({Math.round((reviewedCount / totalCount) * 100)}%)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="w-48">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.round((reviewedCount / totalCount) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-gray-200">
          <Filter size={14} className="text-gray-400" />

          <select
            value={filterManufacturer}
            onChange={(e) => setFilterManufacturer(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
          >
            <option value="">All Manufacturers</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <select
            value={filterPillar}
            onChange={(e) => setFilterPillar(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
          >
            {PILLARS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>Confidence:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={filterConfMin}
              onChange={(e) => setFilterConfMin(Number(e.target.value))}
              className="w-12 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:border-blue-400"
            />
            <span>-</span>
            <input
              type="number"
              min={0}
              max={100}
              value={filterConfMax}
              onChange={(e) => setFilterConfMax(Number(e.target.value))}
              className="w-12 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-xs font-medium text-blue-700">{selectedIds.size} selected</span>
            <button
              onClick={() => handleBatchAction("approve")}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition"
            >
              <CheckCircle size={12} /> Approve
            </button>
            <button
              onClick={() => handleBatchAction("reject")}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition"
            >
              <XCircle size={12} /> Reject
            </button>
            <button
              onClick={() => handleBatchAction("normalize")}
              disabled={actionLoading}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200 transition"
            >
              <Wand2 size={12} /> Re-Normalize
            </button>
            {actionLoading && <Loader2 size={14} className="text-blue-500 animate-spin" />}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package size={32} className="mb-2" />
            <p className="text-sm">No products match your filters</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === products.length && products.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-6" />
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Manufacturer</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Pillar</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Confidence</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Specs</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isExpanded = expandedId === p.id;
                  const specCount = p.specifications ? Object.keys(p.specifications).length : 0;
                  const isEditing = editingProductId === p.id;

                  return (
                    <tbody key={p.id}>
                      <tr
                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          selectedIds.has(p.id) ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-1 py-2" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                          {isExpanded ? (
                            <ChevronDown size={14} className="text-gray-400" />
                          ) : (
                            <ChevronRight size={14} className="text-gray-400" />
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[200px]" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                          {p.product_name}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 font-mono">{p.product_code}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {(p.manufacturers as any)?.name || "\u2014"}
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                            {pillarLabel(p.pillar)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-medium ${confidenceColor(p.normalization_confidence)}`}>
                            {p.normalization_confidence !== null ? `${p.normalization_confidence}%` : "\u2014"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-xs text-gray-500">{specCount}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            p.needs_review ? "bg-amber-100 text-amber-700" :
                            p.status === "active" ? "bg-green-100 text-green-700" :
                            p.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {p.needs_review ? "Needs Review" : p.status}
                          </span>
                        </td>
                      </tr>

                      {/* Expanded row */}
                      {isExpanded && (
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              {/* Description */}
                              <div>
                                <h4 className="text-xs font-medium text-gray-500 mb-1">Description</h4>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                  {p.description || "No description"}
                                </p>
                              </div>

                              {/* Normalization info */}
                              <div>
                                <h4 className="text-xs font-medium text-gray-500 mb-1">Normalization</h4>
                                <div className={`rounded-lg p-2 ${confidenceBg(p.normalization_confidence)}`}>
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className={`font-medium ${confidenceColor(p.normalization_confidence)}`}>
                                      Confidence: {p.normalization_confidence ?? "Not normalized"}
                                    </span>
                                    {p.normalized_at && (
                                      <span className="text-gray-400">
                                        {new Date(p.normalized_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  {p.normalization_warnings && p.normalization_warnings.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {p.normalization_warnings.map((w, i) => (
                                        <div key={i} className="flex items-start gap-1 text-xs text-amber-600">
                                          <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
                                          <span>{w}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Specifications */}
                              <div className="col-span-2">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-xs font-medium text-gray-500">Specifications ({specCount})</h4>
                                  {!isEditing ? (
                                    <button
                                      onClick={() => {
                                        setEditingProductId(p.id);
                                        setEditingSpecs({ ...(p.specifications || {}) });
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      Edit
                                    </button>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleSaveSpecs(p.id)}
                                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => { setEditingProductId(null); setEditingSpecs(null); }}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {specCount > 0 ? (
                                  <div className="grid grid-cols-2 gap-1">
                                    {Object.entries(isEditing ? (editingSpecs || {}) : (p.specifications || {})).map(([key, val]) => (
                                      <div key={key} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border border-gray-100">
                                        <span className="font-medium text-gray-600 min-w-[100px]">{key}:</span>
                                        {isEditing ? (
                                          <input
                                            value={String(val)}
                                            onChange={(e) => setEditingSpecs((prev) => prev ? { ...prev, [key]: e.target.value } : null)}
                                            className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-blue-400"
                                          />
                                        ) : (
                                          <span className="text-gray-800 truncate">{String(val)}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400">No specifications extracted</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
