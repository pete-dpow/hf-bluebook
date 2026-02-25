"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Package } from "lucide-react";

const PILLARS = [
  { value: "fire_doors", label: "Fire Doors" },
  { value: "dampers", label: "Dampers" },
  { value: "fire_stopping", label: "Fire Stopping" },
  { value: "retro_fire_stopping", label: "Retro Fire Stopping" },
  { value: "auro_lume", label: "Auro Lume" },
];

const fontInter = { fontFamily: "var(--font-inter)" };

export default function NewProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [manufacturers, setManufacturers] = useState<any[]>([]);

  const [form, setForm] = useState({
    manufacturer_id: searchParams.get("manufacturer") || "",
    pillar: "fire_doors",
    product_name: "",
    product_code: "",
    description: "",
    list_price: "",
    trade_price: "",
    sell_price: "",
    currency: "GBP",
    unit: "each",
    lead_time_days: "",
    minimum_order_quantity: "1",
    status: "draft",
  });

  useEffect(() => {
    loadManufacturers();
  }, []);

  async function loadManufacturers() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch("/api/manufacturers", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setManufacturers(data.manufacturers || []);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...form,
        list_price: form.list_price ? parseFloat(form.list_price) : null,
        trade_price: form.trade_price ? parseFloat(form.trade_price) : null,
        sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
        lead_time_days: form.lead_time_days ? parseInt(form.lead_time_days) : null,
        minimum_order_quantity: parseInt(form.minimum_order_quantity) || 1,
        manufacturer_id: form.manufacturer_id || null,
      }),
    });

    if (res.ok) {
      const { product } = await res.json();
      router.push(`/products/${product.id}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create product");
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 bg-white";
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Package size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Add Product</h1>
            <p className="text-xs text-gray-500">Create a new product entry</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
          <div>
            <label className={labelClass}>Product Name *</label>
            <input type="text" required value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Product Code</label>
              <input type="text" value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Pillar *</label>
              <select value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value })} className={inputClass}>
                {PILLARS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Manufacturer</label>
            <select value={form.manufacturer_id} onChange={(e) => setForm({ ...form, manufacturer_id: e.target.value })} className={inputClass}>
              <option value="">None</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>List Price</label>
              <input type="number" step="0.01" value={form.list_price} onChange={(e) => setForm({ ...form, list_price: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Trade Price</label>
              <input type="number" step="0.01" value={form.trade_price} onChange={(e) => setForm({ ...form, trade_price: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Sell Price</label>
              <input type="number" step="0.01" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputClass}>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lead Time (days)</label>
              <input type="number" value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Min Order Qty</label>
              <input type="number" value={form.minimum_order_quantity} onChange={(e) => setForm({ ...form, minimum_order_quantity: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !form.product_name}
            className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
