"use client";

import { useState } from "react";
import { X, CheckCircle2, XCircle, AlertTriangle, Loader2, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ComplianceChecklist } from "@/lib/autoplan/types";
import { CHECKLIST_LABELS } from "@/lib/autoplan/types";

interface ApprovalModalProps {
  planId: string;
  planReference: string;
  checklist: ComplianceChecklist;
  onClose: () => void;
  onApproved: () => void;
}

const ATTESTATION_TEXT =
  "I confirm that this fire safety plan has been reviewed and complies with the relevant provisions of the Building Safety Act 2022, Approved Document B, and applicable British Standards. The symbols, annotations, and markings accurately represent the fire safety measures in place and the plan is suitable for inclusion in the building's Golden Thread record.";

export default function ApprovalModal({
  planId,
  planReference,
  checklist,
  onClose,
  onApproved,
}: ApprovalModalProps) {
  const [approverName, setApproverName] = useState("");
  const [approverQualifications, setApproverQualifications] = useState("");
  const [approverCompany, setApproverCompany] = useState("Harmony Fire");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const checklistKeys = Object.keys(checklist) as (keyof ComplianceChecklist)[];
  const allChecked = checklistKeys.every((k) => checklist[k]);
  const failedCount = checklistKeys.filter((k) => !checklist[k]).length;
  const canApprove =
    allChecked && approverName.trim() !== "" && approverQualifications.trim() !== "";

  async function handleApprove() {
    if (!canApprove) return;
    setSubmitting(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Not authenticated. Please sign in again.");
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/autoplan/plans/${planId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          approver_name: approverName.trim(),
          approver_qualifications: approverQualifications.trim(),
          approver_company: approverCompany.trim(),
          attestation: ATTESTATION_TEXT,
          checklist_results: checklist,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Approval failed (${res.status})`);
      }

      onApproved();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
        }}
      />

      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#FFFFFF",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Shield size={18} color="#0056A7" />
              <h2
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#2A2A2A",
                  margin: 0,
                }}
              >
                Approve Fire Safety Plan
              </h2>
            </div>
            <div
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "13px",
                color: "#6B7280",
                marginTop: "4px",
                marginLeft: "26px",
              }}
            >
              {planReference}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              color: "#6B7280",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#2A2A2A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Approver Fields */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#2A2A2A",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Approver Name <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="Full name"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "14px",
                  color: "#2A2A2A",
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  outline: "none",
                  background: "#FFFFFF",
                  boxSizing: "border-box" as const,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#2A2A2A",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Qualifications <span style={{ color: "#DC2626" }}>*</span>
              </label>
              <input
                type="text"
                value={approverQualifications}
                onChange={(e) => setApproverQualifications(e.target.value)}
                placeholder="e.g. MIFireE, FPA Cert"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "14px",
                  color: "#2A2A2A",
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  outline: "none",
                  background: "#FFFFFF",
                  boxSizing: "border-box" as const,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
              />
            </div>

            <div>
              <label
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#2A2A2A",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Company
              </label>
              <input
                type="text"
                value={approverCompany}
                onChange={(e) => setApproverCompany(e.target.value)}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "14px",
                  color: "#2A2A2A",
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  outline: "none",
                  background: "#FFFFFF",
                  boxSizing: "border-box" as const,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
              />
            </div>
          </div>

          {/* Compliance Checklist */}
          <div
            style={{
              marginBottom: "20px",
              padding: "14px",
              background: "#FCFCFA",
              borderRadius: "10px",
              border: "1px solid #E5E7EB",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "13px",
                fontWeight: 600,
                color: "#2A2A2A",
                marginBottom: "10px",
              }}
            >
              Compliance Checklist
            </div>

            {checklistKeys.map((key) => {
              const passed = checklist[key];
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    padding: "5px 0",
                  }}
                >
                  {passed ? (
                    <CheckCircle2
                      size={16}
                      color="#16A34A"
                      style={{ flexShrink: 0, marginTop: "1px" }}
                    />
                  ) : (
                    <XCircle
                      size={16}
                      color="#DC2626"
                      style={{ flexShrink: 0, marginTop: "1px" }}
                    />
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "12px",
                      color: passed ? "#2A2A2A" : "#DC2626",
                      lineHeight: "1.4",
                    }}
                  >
                    {CHECKLIST_LABELS[key]}
                  </span>
                </div>
              );
            })}

            {!allChecked && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "10px",
                  padding: "8px 10px",
                  background: "#FEF3C7",
                  borderRadius: "8px",
                }}
              >
                <AlertTriangle size={14} color="#92400E" />
                <span
                  style={{
                    fontFamily: "var(--font-ibm-plex)",
                    fontSize: "12px",
                    color: "#92400E",
                    fontWeight: 500,
                  }}
                >
                  {failedCount} checklist{" "}
                  {failedCount === 1 ? "item" : "items"} not met. Plan cannot be
                  approved until all items pass.
                </span>
              </div>
            )}
          </div>

          {/* Attestation */}
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              background: "#F0F9FF",
              borderRadius: "8px",
              border: "1px solid #BAE6FD",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "11px",
                fontWeight: 600,
                color: "#0369A1",
                textTransform: "uppercase" as const,
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              Attestation
            </div>
            <p
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                color: "#0C4A6E",
                lineHeight: "1.5",
                margin: 0,
              }}
            >
              {ATTESTATION_TEXT}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#FEE2E2",
                borderRadius: "8px",
                marginBottom: "12px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  color: "#991B1B",
                }}
              >
                {error}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              fontWeight: 500,
              padding: "8px 20px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              color: "#6B7280",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.currentTarget.style.background = "#F9FAFB";
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.currentTarget.style.background = "#FFFFFF";
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={!canApprove || submitting}
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              fontWeight: 500,
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background:
                canApprove && !submitting ? "#16A34A" : "#D1D5DB",
              color: canApprove && !submitting ? "#FFFFFF" : "#9CA3AF",
              cursor:
                canApprove && !submitting ? "pointer" : "not-allowed",
              transition: "background 0.15s",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              if (canApprove && !submitting)
                e.currentTarget.style.background = "#15803D";
            }}
            onMouseLeave={(e) => {
              if (canApprove && !submitting)
                e.currentTarget.style.background = "#16A34A";
            }}
          >
            {submitting && (
              <Loader2
                size={14}
                style={{ animation: "spin 1s linear infinite" }}
              />
            )}
            {submitting ? "Approving..." : "Approve Plan"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
