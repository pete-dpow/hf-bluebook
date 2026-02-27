"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, FileText } from "lucide-react";

const fontInter = { fontFamily: "var(--font-inter)" };

interface ClientSuggestion {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clientSuggestions, setClientSuggestions] = useState<ClientSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function searchClients(term: string) {
    if (term.length < 2) {
      setClientSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/quotes/clients?search=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClientSuggestions(data.clients || []);
        setShowSuggestions((data.clients || []).length > 0);
      }
    } catch { /* ignore */ }
  }

  function handleClientNameChange(value: string) {
    setForm({ ...form, client_name: value });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchClients(value), 300);
  }

  function selectClient(client: ClientSuggestion) {
    setForm({
      ...form,
      client_name: client.client_name,
      client_email: client.client_email || "",
      client_phone: client.client_phone || "",
    });
    setShowSuggestions(false);
  }

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
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

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

        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <FileText size={18} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">New Quote</h1>
            <p className="text-xs text-gray-500">Create a new quote for a client</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Client Details</h2>
            <div className="space-y-4">
              <div className="relative">
                <label className={labelClass}>Client Name *</label>
                <input
                  type="text"
                  required
                  value={form.client_name}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  onFocus={() => { if (clientSuggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
                  className={inputClass}
                  autoComplete="off"
                />
                {showSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-[200px] overflow-y-auto">
                    {clientSuggestions.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectClient(c); }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                      >
                        <div className="text-sm font-medium text-gray-900">{c.client_name}</div>
                        {(c.client_email || c.client_phone) && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {[c.client_email, c.client_phone].filter(Boolean).join(" \u2022 ")}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Project Details</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Project Name</label>
                <input type="text" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Project Address</label>
                <input type="text" value={form.project_address} onChange={(e) => setForm({ ...form, project_address: e.target.value })} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Quote Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Quote Details</h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Quote Name</label>
                <input type="text" value={form.quote_name} onChange={(e) => setForm({ ...form, quote_name: e.target.value })} className={inputClass} placeholder="Optional descriptive name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Valid Until</label>
                  <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>VAT %</label>
                  <input type="number" value={form.vat_percent} onChange={(e) => setForm({ ...form, vat_percent: e.target.value })} className={inputClass} min="0" max="100" step="0.5" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={labelClass}>Terms & Conditions</label>
                <textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !form.client_name}
            className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Quote"}
          </button>
        </form>
      </div>
    </div>
  );
}
