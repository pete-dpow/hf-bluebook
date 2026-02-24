"use client";

import { X, FileDown, Send, Printer } from "lucide-react";

interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  product_code?: string | null;
  notes?: string | null;
}

interface QuotePreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  quote: {
    quote_number: string;
    quote_date?: string;
    created_at: string;
    status: string;
    client_name: string;
    client_email?: string;
    client_phone?: string;
    project_name?: string;
    project_address?: string;
    subtotal?: number;
    vat_percent?: number;
    vat_amount?: number;
    total?: number;
    notes?: string;
    terms?: string;
    valid_until?: string;
  };
  lineItems: LineItem[];
  onExportPdf?: () => void;
  onSend?: () => void;
}

export default function QuotePreviewDrawer({
  open,
  onClose,
  quote,
  lineItems,
  onExportPdf,
  onSend,
}: QuotePreviewDrawerProps) {
  if (!open) return null;

  const quoteDate = new Date(quote.quote_date || quote.created_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const validUntil = quote.valid_until
    ? new Date(quote.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  const subtotal = quote.subtotal ?? lineItems.reduce((sum, li) => sum + li.quantity * li.unit_price, 0);
  const vatPercent = quote.vat_percent ?? 20;
  const vatAmount = quote.vat_amount ?? subtotal * (vatPercent / 100);
  const total = quote.total ?? subtotal + vatAmount;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          zIndex: 60,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "min(600px, 90vw)",
          height: "100vh",
          background: "#F3F4F6",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
          zIndex: 61,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.25s ease-out",
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #E5E7EB",
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h2
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 500,
                fontSize: "20px",
                color: "#2A2A2A",
                margin: 0,
              }}
            >
              Quote Preview
            </h2>
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: quote.status === "approved" ? "#F0FDF4" : quote.status === "sent" ? "#EFF6FF" : "#F9FAFB",
                color: quote.status === "approved" ? "#15803D" : quote.status === "sent" ? "#1D4ED8" : "#6B7280",
              }}
            >
              {quote.status}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onExportPdf && (
              <button
                onClick={onExportPdf}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  padding: "6px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FileDown size={14} />
                Export PDF
              </button>
            )}
            {onSend && quote.status === "draft" && (
              <button
                onClick={onSend}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  padding: "6px 12px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#2563EB",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Send size={14} />
                Send
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: "6px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#9CA3AF",
                borderRadius: "6px",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable document area */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* A4-style document */}
          <div
            style={{
              width: "100%",
              maxWidth: "540px",
              background: "white",
              borderRadius: "4px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
              padding: "48px 40px",
              minHeight: "700px",
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "13px",
              color: "#1F2937",
              lineHeight: 1.6,
            }}
          >
            {/* Document Header */}
            <div style={{ marginBottom: "32px", borderBottom: "2px solid #2563EB", paddingBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontWeight: 600,
                      fontSize: "28px",
                      color: "#2563EB",
                      margin: "0 0 4px",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    hf.bluebook
                  </h1>
                  <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>
                    Fire Protection Specialists
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <h2
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontWeight: 600,
                      fontSize: "22px",
                      color: "#1F2937",
                      margin: "0 0 4px",
                      letterSpacing: "0.02em",
                    }}
                  >
                    QUOTATION
                  </h2>
                  <p style={{ fontSize: "14px", color: "#2563EB", fontWeight: 600, margin: 0 }}>
                    {quote.quote_number}
                  </p>
                </div>
              </div>
            </div>

            {/* Quote Meta + Client */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "28px" }}>
              <div>
                <p style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                  Quote To
                </p>
                <p style={{ fontWeight: 600, fontSize: "14px", margin: "0 0 2px" }}>{quote.client_name}</p>
                {quote.client_email && <p style={{ fontSize: "12px", color: "#6B7280", margin: "0 0 1px" }}>{quote.client_email}</p>}
                {quote.client_phone && <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>{quote.client_phone}</p>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>
                    Date
                  </p>
                  <p style={{ fontSize: "13px", margin: 0 }}>{quoteDate}</p>
                </div>
                {validUntil && (
                  <div>
                    <p style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>
                      Valid Until
                    </p>
                    <p style={{ fontSize: "13px", margin: 0 }}>{validUntil}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Project Info */}
            {(quote.project_name || quote.project_address) && (
              <div style={{ marginBottom: "24px", padding: "12px 16px", background: "#F9FAFB", borderRadius: "6px" }}>
                <p style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>
                  Project
                </p>
                {quote.project_name && <p style={{ fontWeight: 500, margin: "0 0 2px" }}>{quote.project_name}</p>}
                {quote.project_address && <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>{quote.project_address}</p>}
              </div>
            )}

            {/* Line Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #E5E7EB" }}>
                  <th style={{ textAlign: "left", padding: "8px 0", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                    Item
                  </th>
                  <th style={{ textAlign: "left", padding: "8px 0", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, width: "70px" }}>
                    Code
                  </th>
                  <th style={{ textAlign: "center", padding: "8px 0", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, width: "50px" }}>
                    Qty
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 0", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, width: "80px" }}>
                    Unit Price
                  </th>
                  <th style={{ textAlign: "right", padding: "8px 0", fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, width: "90px" }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "24px 0", textAlign: "center", color: "#9CA3AF", fontSize: "12px" }}>
                      No line items yet
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item, i) => {
                    const lineTotal = item.quantity * item.unit_price;
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "10px 0 10px 0" }}>
                          <span style={{ fontSize: "13px" }}>{item.description}</span>
                          {item.notes && (
                            <p style={{ fontSize: "11px", color: "#9CA3AF", margin: "2px 0 0", fontStyle: "italic" }}>
                              {item.notes}
                            </p>
                          )}
                        </td>
                        <td style={{ padding: "10px 0", fontSize: "12px", color: "#6B7280" }}>
                          {item.product_code || "—"}
                        </td>
                        <td style={{ padding: "10px 0", textAlign: "center", fontSize: "13px" }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: "13px" }}>
                          {"\u00A3"}{item.unit_price.toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 0", textAlign: "right", fontSize: "13px", fontWeight: 500 }}>
                          {"\u00A3"}{lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
              <div style={{ width: "220px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px" }}>
                  <span style={{ color: "#6B7280" }}>Subtotal</span>
                  <span>{"\u00A3"}{subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", borderBottom: "1px solid #E5E7EB" }}>
                  <span style={{ color: "#6B7280" }}>VAT ({vatPercent}%)</span>
                  <span>{"\u00A3"}{vatAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "16px", fontWeight: 700 }}>
                  <span>Total</span>
                  <span style={{ color: "#2563EB" }}>{"\u00A3"}{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px", fontWeight: 600 }}>
                  Notes
                </p>
                <p style={{ fontSize: "12px", color: "#4B5563", whiteSpace: "pre-wrap", margin: 0 }}>
                  {quote.notes}
                </p>
              </div>
            )}

            {/* Terms */}
            {quote.terms && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "10px", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px", fontWeight: 600 }}>
                  Terms & Conditions
                </p>
                <p style={{ fontSize: "11px", color: "#6B7280", whiteSpace: "pre-wrap", margin: 0, lineHeight: 1.5 }}>
                  {quote.terms}
                </p>
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: "20px",
                borderTop: "1px solid #E5E7EB",
                textAlign: "center",
                fontSize: "10px",
                color: "#9CA3AF",
              }}
            >
              <p style={{ margin: "0 0 2px" }}>
                Generated by hf.bluebook — Fire Protection Intelligence Platform
              </p>
              <p style={{ margin: 0 }}>
                This quotation is valid for 30 days from the date of issue unless otherwise stated.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
