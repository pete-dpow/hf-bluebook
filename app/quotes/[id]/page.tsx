"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, FileDown, Send, FileSpreadsheet } from "lucide-react";
import QuoteBuilder from "@/components/QuoteBuilder";
import ComplianceTab from "@/components/ComplianceTab";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-gray-100 text-gray-400",
};

const STATUS_OPTIONS = ["draft", "sent", "approved", "rejected", "cancelled"];

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [quote, setQuote] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingExcel, setGeneratingExcel] = useState(false);
  const [sending, setSending] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    loadQuote();
  }, [params.id]);

  async function getSession() {
    if (session) return session;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.replace("/auth"); return null; }
    setSession(s);
    return s;
  }

  async function loadQuote() {
    const s = await getSession();
    if (!s) return;

    const res = await fetch(`/api/quotes/${params.id}`, {
      headers: { Authorization: `Bearer ${s.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setQuote(data.quote);
      setLineItems(data.quote?.quote_line_items || []);
    }
    setLoading(false);
  }

  async function handleAddItem(item: any) {
    const s = await getSession();
    if (!s) return;

    const res = await fetch(`/api/quotes/${params.id}/line-items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.access_token}`,
      },
      body: JSON.stringify(item),
    });

    if (res.ok) {
      await loadQuote();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to add line item");
    }
  }

  async function handleRemoveItem(index: number, id?: string) {
    if (!id) {
      // Item hasn't been saved yet — just remove locally
      setLineItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    const s = await getSession();
    if (!s) return;

    const res = await fetch(`/api/quotes/${params.id}/line-items?item_id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${s.access_token}` },
    });

    if (res.ok) {
      await loadQuote();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to remove line item");
    }
  }

  function handleUpdateItem(index: number, field: string, value: string | number) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleStatusChange(newStatus: string) {
    const s = await getSession();
    if (!s) return;

    setSaving(true);
    const res = await fetch(`/api/quotes/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.access_token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      await loadQuote();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to update status");
    }
    setSaving(false);
  }

  async function handleUpdateQuoteField(field: string, value: string) {
    const s = await getSession();
    if (!s) return;

    const res = await fetch(`/api/quotes/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.access_token}`,
      },
      body: JSON.stringify({ [field]: value }),
    });

    if (res.ok) {
      await loadQuote();
    }
  }

  async function handleGeneratePdf() {
    const s = await getSession();
    if (!s) return;

    setGeneratingPdf(true);
    const res = await fetch(`/api/quotes/${params.id}/generate-pdf`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.access_token}` },
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote?.quote_number || "quote"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("Failed to generate PDF");
    }
    setGeneratingPdf(false);
  }

  async function handleGenerateExcel() {
    const s = await getSession();
    if (!s) return;

    setGeneratingExcel(true);
    const res = await fetch(`/api/quotes/${params.id}/generate-excel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.access_token}` },
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quote?.quote_number || "quote"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("Failed to generate Excel");
    }
    setGeneratingExcel(false);
  }

  async function handleSendQuote() {
    if (!quote?.client_email) {
      alert("Please add a client email before sending");
      return;
    }

    const s = await getSession();
    if (!s) return;

    setSending(true);
    const res = await fetch(`/api/quotes/${params.id}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${s.access_token}` },
    });

    if (res.ok) {
      alert("Quote is being sent to " + quote.client_email);
      await loadQuote();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to send quote");
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <p className="text-gray-500">Quote not found</p>
      </div>
    );
  }

  const createdDate = new Date(quote.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/quotes")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          <ArrowLeft size={16} />
          All Quotes
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              {quote.quote_number}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                {quote.client_name}
              </span>
              <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${STATUS_COLORS[quote.status] || "bg-gray-100 text-gray-600"}`}>
                {quote.status}
              </span>
              <span className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                {createdDate}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              PDF
            </button>
            <button
              onClick={handleGenerateExcel}
              disabled={generatingExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {generatingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Excel
            </button>
            <button
              onClick={handleSendQuote}
              disabled={sending || !quote.client_email}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send to Client
            </button>
          </div>
        </div>

        {/* Status Management */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Status:</span>
            <select
              value={quote.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={saving}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Client Details
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <div>
              <span className="text-gray-500">Name</span>
              <p className="text-gray-900">{quote.client_name}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="text-gray-900">{quote.client_email || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone</span>
              <p className="text-gray-900">{quote.client_phone || "—"}</p>
            </div>
          </div>
        </div>

        {/* Project Info */}
        {(quote.project_name || quote.project_address) && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Project Details
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              <div>
                <span className="text-gray-500">Project Name</span>
                <p className="text-gray-900">{quote.project_name || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Address</span>
                <p className="text-gray-900">{quote.project_address || "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="mb-6">
          <QuoteBuilder
            lineItems={lineItems}
            vatPercent={quote.vat_percent ?? 20}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onUpdateItem={handleUpdateItem}
          />
        </div>

        {/* Compliance Coverage */}
        <div className="mb-6">
          <ComplianceTab quoteId={params.id as string} />
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Notes
            </h2>
            <textarea
              defaultValue={quote.notes || ""}
              onBlur={(e) => handleUpdateQuoteField("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
              placeholder="Internal notes..."
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Terms & Conditions
            </h2>
            <textarea
              defaultValue={quote.terms || ""}
              onBlur={(e) => handleUpdateQuoteField("terms", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
              placeholder="Terms & conditions..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
