"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewQuotePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    project_name: "",
    project_address: "",
    quote_name: "",
    valid_until: "",
    vat_percent: "20",
    notes: "",
    terms: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        client_name: form.client_name,
        client_email: form.client_email || null,
        client_phone: form.client_phone || null,
        project_name: form.project_name || null,
        project_address: form.project_address || null,
        quote_name: form.quote_name || null,
        valid_until: form.valid_until || null,
        vat_percent: parseFloat(form.vat_percent) || 20,
        notes: form.notes || null,
        terms: form.terms || null,
      }),
    });

    if (res.ok) {
      const { quote } = await res.json();
      router.push(`/quotes/${quote.id}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create quote");
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

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
          New Quote
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Client Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Client Name *</label>
                <input type="text" required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Email</label>
                  <input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Phone</label>
                  <input type="tel" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Project Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Project Name</label>
                <input type="text" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Project Address</label>
                <input type="text" value={form.project_address} onChange={(e) => setForm({ ...form, project_address: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
              </div>
            </div>
          </div>

          {/* Quote Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Quote Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Quote Name</label>
                <input type="text" value={form.quote_name} onChange={(e) => setForm({ ...form, quote_name: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} placeholder="Optional descriptive name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Valid Until</label>
                  <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} />
                </div>
                <div>
                  <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>VAT %</label>
                  <input type="number" value={form.vat_percent} onChange={(e) => setForm({ ...form, vat_percent: e.target.value })} className={inputClass} style={{ fontFamily: "var(--font-ibm-plex)" }} min="0" max="100" step="0.5" />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={`${inputClass} resize-none`} style={{ fontFamily: "var(--font-ibm-plex)" }} />
              </div>
              <div>
                <label className={labelClass} style={{ fontFamily: "var(--font-ibm-plex)" }}>Terms & Conditions</label>
                <textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={3} className={`${inputClass} resize-none`} style={{ fontFamily: "var(--font-ibm-plex)" }} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !form.client_name}
            className="w-full px-4 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Quote"}
          </button>
        </form>
      </div>
    </div>
  );
}
