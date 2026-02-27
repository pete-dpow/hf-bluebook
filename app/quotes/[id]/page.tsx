"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, FileDown, Send, FileSpreadsheet, Eye, FileText } from "lucide-react";
import QuoteBuilder from "@/components/QuoteBuilder";
import ComplianceTab from "@/components/ComplianceTab";
import QuotePreviewDrawer from "@/components/QuotePreviewDrawer";

const fontInter = { fontFamily: "var(--font-inter)" };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-50 text-gray-600 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
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
  const [showPreview, setShowPreview] = useState(false);
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
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push("/quotes")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft size={16} />
          All Quotes
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <FileText size={18} className="text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{quote.quote_number}</h1>
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border capitalize ${STATUS_COLORS[quote.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {quote.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">{quote.client_name} &middot; {createdDate}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {generatingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              PDF
            </button>
            <button
              onClick={handleGenerateExcel}
              disabled={generatingExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              {generatingExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Excel
            </button>
            <button
              onClick={handleSendQuote}
              disabled={sending || !quote.client_email}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send to Client
            </button>
          </div>
        </div>

        {/* Status Management */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500">Status:</span>
            <select
              value={quote.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={saving}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-400"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quote Lifecycle Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Timeline</h2>
          {(() => {
            const STATUS_ORDER = ["draft", "sent", "approved", "rejected", "cancelled"];
            const currentIdx = STATUS_ORDER.indexOf(quote.status);
            const isRejected = quote.status === "rejected";
            const isCancelled = quote.status === "cancelled";
            const steps = [
              { label: "Created", date: quote.quote_date || quote.created_at, done: true },
              { label: "Sent", date: quote.sent_at, done: currentIdx >= 1 },
              {
                label: isRejected ? "Rejected" : isCancelled ? "Cancelled" : "Approved",
                date: quote.approved_at || quote.rejected_at,
                done: currentIdx >= 2,
              },
            ];
            const fmtDate = (d: string | null) => {
              if (!d) return "";
              return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
            };
            return (
              <div className="flex items-center gap-0">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center" style={{ flex: i < steps.length - 1 ? 1 : undefined }}>
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 ${
                          step.done
                            ? (isRejected && i === 2) ? "border-red-500 bg-red-50 text-red-500" : "border-green-500 bg-green-50 text-green-500"
                            : "border-gray-300 bg-white text-gray-400"
                        }`}
                      >
                        {step.done ? "\u2713" : i + 1}
                      </div>
                      <span className="text-xs text-gray-700 mt-1.5 font-medium">{step.label}</span>
                      <span className="text-xs text-gray-400 mt-0.5">{step.date ? fmtDate(step.date) : "\u2014"}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 ${steps[i + 1].done ? "bg-green-500" : "bg-gray-200"}`}
                        style={{ marginTop: "-24px" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Client Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Client Details</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-500">Name</span>
              <p
                className="text-blue-600 hover:underline cursor-pointer text-sm"
                onClick={() => router.push(`/customers`)}
              >
                {quote.client_name}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Email</span>
              <p className="text-sm text-gray-900">{quote.client_email || "\u2014"}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Phone</span>
              <p className="text-sm text-gray-900">{quote.client_phone || "\u2014"}</p>
            </div>
          </div>
        </div>

        {/* Project Info */}
        {(quote.project_name || quote.project_address) && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Project Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-500">Project Name</span>
                <p className="text-sm text-gray-900">{quote.project_name || "\u2014"}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Address</span>
                <p className="text-sm text-gray-900">{quote.project_address || "\u2014"}</p>
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
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Notes</h2>
            <textarea
              defaultValue={quote.notes || ""}
              onBlur={(e) => handleUpdateQuoteField("notes", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              placeholder="Internal notes..."
            />
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Terms & Conditions</h2>
            <textarea
              defaultValue={quote.terms || ""}
              onBlur={(e) => handleUpdateQuoteField("terms", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              placeholder="Terms & conditions..."
            />
          </div>
        </div>

        {/* Quote Preview Drawer */}
        <QuotePreviewDrawer
          open={showPreview}
          onClose={() => setShowPreview(false)}
          quote={quote}
          lineItems={lineItems}
          onExportPdf={handleGeneratePdf}
          onSend={quote.client_email ? handleSendQuote : undefined}
        />
      </div>
    </div>
  );
}
