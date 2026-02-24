"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Globe, FileText, Trash2, Upload, ShieldCheck, Plus, ExternalLink, CheckCircle } from "lucide-react";
import RegulationLinkModal from "@/components/RegulationLinkModal";

const PILLAR_LABELS: Record<string, string> = {
  fire_doors: "Fire Doors",
  dampers: "Dampers",
  fire_stopping: "Fire Stopping",
  retro_fire_stopping: "Retro Fire Stopping",
  auro_lume: "Auro Lume",
};

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [deleting, setDeleting] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [params.id]);

  async function loadProduct() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch(`/api/products/${params.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setProduct(data.product);
    }
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("product_id", params.id as string);
    formData.append("file_type", "datasheet");

    const res = await fetch("/api/product-files", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (res.ok) {
      await loadProduct();
    } else {
      const err = await res.json();
      alert(err.error || "Upload failed");
    }
    setUploading(false);
  }

  async function handleDeleteFile(fileId: string) {
    if (!confirm("Delete this file?")) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/product-files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      await loadProduct();
    }
  }

  async function handleLinkRegulation(regulation: { id: string; name: string; reference: string; category: string }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/products/${params.id}/regulations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ regulation_id: regulation.id }),
    });

    if (res.ok) {
      setShowLinkModal(false);
      await loadProduct();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to link regulation");
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${product?.product_name}? This cannot be undone.`)) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/products/${params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      router.push("/library?tab=products");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete");
      setDeleting(false);
    }
  }

  async function handleActivate() {
    setActivating(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/products/${params.id}/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ approve: true }),
    });

    if (res.ok) {
      await loadProduct();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to activate product");
    }
    setActivating(false);
  }

  async function handleUnlinkRegulation(regulationId: string) {
    if (!confirm("Remove this regulation link?")) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/products/${params.id}/regulations?regulation_id=${regulationId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      await loadProduct();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <p className="text-gray-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/library?tab=products")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          <ArrowLeft size={16} />
          All Products
        </button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              {product.product_name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              {product.product_code && (
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                  {product.product_code}
                </span>
              )}
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                {PILLAR_LABELS[product.pillar] || product.pillar}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                product.status === "active" ? "bg-green-50 text-green-700"
                : product.status === "discontinued" ? "bg-red-50 text-red-600"
                : "bg-gray-100 text-gray-600"
              }`}>
                {product.status}
              </span>
              {product.needs_review && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700">
                  Needs review
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {product.status !== "active" && (
              <button
                onClick={handleActivate}
                disabled={activating}
                className="flex items-center gap-2 px-4 py-2 text-green-700 border border-green-200 text-sm font-medium rounded-lg hover:bg-green-50 transition disabled:opacity-50"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                {activating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Activate
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        </div>

        {/* Source link */}
        {product.scraped_data?.source_url && (
          <div className="mb-6">
            <a
              href={product.scraped_data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              <ExternalLink size={14} />
              View on manufacturer website
            </a>
          </div>
        )}

        {/* Product images */}
        {product.scraped_data?.image_urls?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Images
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {product.scraped_data.image_urls.slice(0, 8).map((url: string, i: number) => (
                <div key={i} className="aspect-square rounded-lg border border-gray-100 overflow-hidden bg-gray-50">
                  <img
                    src={url}
                    alt={`${product.product_name} ${i + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Description
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Pricing & Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Details
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <div>
              <span className="text-gray-500">Manufacturer</span>
              <p className="text-gray-900">{product.manufacturers?.name || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Price</span>
              <p className="text-gray-900">
                {product.list_price
                  ? `${product.currency || "GBP"} ${product.list_price.toFixed(2)}`
                  : product.scraped_data?.price_text || "—"}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Unit</span>
              <p className="text-gray-900">{product.unit || "each"}</p>
            </div>
            <div>
              <span className="text-gray-500">Lead Time</span>
              <p className="text-gray-900">{product.lead_time_days ? `${product.lead_time_days} days` : "—"}</p>
            </div>
          </div>
          {(product.trade_price || product.sell_price || product.certifications?.length > 0) && (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 text-sm mt-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {product.trade_price && (
                <div>
                  <span className="text-gray-500">Trade Price</span>
                  <p className="text-gray-900">{`${product.currency || "GBP"} ${product.trade_price.toFixed(2)}`}</p>
                </div>
              )}
              {product.sell_price && (
                <div>
                  <span className="text-gray-500">Sell Price</span>
                  <p className="text-gray-900">{`${product.currency || "GBP"} ${product.sell_price.toFixed(2)}`}</p>
                </div>
              )}
              {product.certifications?.length > 0 && (
                <div>
                  <span className="text-gray-500">Certifications</span>
                  <p className="text-gray-900">{product.certifications.join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Specifications
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-500">{key}</span>
                  <span className="text-gray-900">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Files ({product.product_files?.length || 0})
            </h2>
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 cursor-pointer transition">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span style={{ fontFamily: "var(--font-ibm-plex)" }}>Upload</span>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
          {/* File type filter chips */}
          {product.product_files?.length > 0 && (() => {
            const files = product.product_files as any[];
            const typeCounts: Record<string, number> = {};
            for (const f of files) {
              const t = f.file_type || "other";
              typeCounts[t] = (typeCounts[t] || 0) + 1;
            }
            const types = Object.keys(typeCounts);
            if (types.length <= 1) return null;
            return (
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setFileTypeFilter("all")}
                  className={`px-3 py-1 text-xs rounded-full border transition ${
                    fileTypeFilter === "all"
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                  style={{ fontFamily: "var(--font-ibm-plex)" }}
                >
                  All ({files.length})
                </button>
                {types.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFileTypeFilter(type)}
                    className={`px-3 py-1 text-xs rounded-full border transition ${
                      fileTypeFilter === type
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    style={{ fontFamily: "var(--font-ibm-plex)" }}
                  >
                    {type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} ({typeCounts[type]})
                  </button>
                ))}
              </div>
            );
          })()}
          {product.product_files?.length > 0 ? (
            <div className="space-y-2">
              {product.product_files.filter((f: any) => fileTypeFilter === "all" || f.file_type === fileTypeFilter).map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      {f.file_url ? (
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                          style={{ fontFamily: "var(--font-ibm-plex)" }}
                        >
                          {f.file_name}
                        </a>
                      ) : (
                        <span className="text-sm text-gray-900 truncate block" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                          {f.file_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{f.file_type?.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {f.file_url && (
                      <a
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-blue-600 transition"
                        title="Download"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteFile(f.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No files yet
            </p>
          )}
        </div>

        {/* Linked Regulations */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Linked Regulations ({product.product_regulations?.length || 0})
            </h2>
            <button
              onClick={() => setShowLinkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              <Plus size={14} />
              Link
            </button>
          </div>
          {product.product_regulations?.length > 0 ? (
            <div className="space-y-2">
              {product.product_regulations.map((pr: any) => (
                <div key={pr.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                        {pr.regulations?.name}
                      </span>
                      {pr.regulations?.reference && (
                        <span className="ml-2 text-xs text-gray-500">{pr.regulations.reference}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlinkRegulation(pr.regulation_id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No linked regulations — click Link to add
            </p>
          )}
        </div>

        <RegulationLinkModal
          open={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onSelect={handleLinkRegulation}
          excludeIds={product.product_regulations?.map((pr: any) => pr.regulation_id) || []}
        />
      </div>
    </div>
  );
}
