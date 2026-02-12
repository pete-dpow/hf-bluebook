"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewManufacturerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    website_url: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    trade_discount_percent: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch("/api/manufacturers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        ...form,
        trade_discount_percent: form.trade_discount_percent ? parseFloat(form.trade_discount_percent) : null,
      }),
    });

    if (res.ok) {
      const { manufacturer } = await res.json();
      router.push(`/manufacturers/${manufacturer.id}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create manufacturer");
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400";

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-3xl mb-8" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
          Add Manufacturer
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>Website URL</label>
            <input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} placeholder="https://" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>Contact Name</label>
              <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>Contact Email</label>
              <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>Contact Phone</label>
              <input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>Trade Discount %</label>
              <input type="number" step="0.01" value={form.trade_discount_percent} onChange={(e) => setForm({ ...form, trade_discount_percent: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !form.name}
            className="w-full px-4 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Manufacturer"}
          </button>
        </form>
      </div>
    </div>
  );
}
