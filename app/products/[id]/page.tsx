"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Globe, FileText, Trash2, Upload, ShieldCheck } from "lucide-react";

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
          onClick={() => router.push("/products")}
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
        </div>

        {/* Description */}
        {product.description && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Description
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {product.description}
            </p>
          </div>
        )}

        {/* Pricing & Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Pricing & Details
          </h2>
          <div className="grid grid-cols-4 gap-4 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <div>
              <span className="text-gray-500">List Price</span>
              <p className="text-gray-900">{product.list_price ? `${product.currency || "GBP"} ${product.list_price.toFixed(2)}` : "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Trade Price</span>
              <p className="text-gray-900">{product.trade_price ? `${product.currency || "GBP"} ${product.trade_price.toFixed(2)}` : "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Sell Price</span>
              <p className="text-gray-900">{product.sell_price ? `${product.currency || "GBP"} ${product.sell_price.toFixed(2)}` : "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Unit</span>
              <p className="text-gray-900">{product.unit || "each"}</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm mt-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <div>
              <span className="text-gray-500">Lead Time</span>
              <p className="text-gray-900">{product.lead_time_days ? `${product.lead_time_days} days` : "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Min Order Qty</span>
              <p className="text-gray-900">{product.minimum_order_quantity || 1}</p>
            </div>
            <div>
              <span className="text-gray-500">Manufacturer</span>
              <p className="text-gray-900">{product.manufacturers?.name || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Certifications</span>
              <p className="text-gray-900">{product.certifications?.length ? product.certifications.join(", ") : "—"}</p>
            </div>
          </div>
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
          {product.product_files?.length > 0 ? (
            <div className="space-y-2">
              {product.product_files.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <div>
                      <span className="text-sm text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                        {f.file_name}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">{f.file_type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(f.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No files uploaded yet
            </p>
          )}
        </div>

        {/* Linked Regulations */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Linked Regulations
          </h2>
          {product.product_regulations?.length > 0 ? (
            <div className="space-y-2">
              {product.product_regulations.map((pr: any) => (
                <div key={pr.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
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
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No linked regulations
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
