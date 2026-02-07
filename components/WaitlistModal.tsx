"use client";

import { useState } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface App {
  name: string;
  subdomain: string;
  description: string;
}

export default function WaitlistModal({
  app,
  onClose,
}: {
  app: App;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    company: "",
    role: "",
    appInterest: app.name,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert([
          {
            email: formData.email,
            name: formData.name,
            company: formData.company,
            role: formData.role,
            app_interest: formData.appInterest,
          },
        ]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "480px",
          width: "90%",
          position: "relative",
          fontFamily: "var(--font-ibm-plex)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#6B7280",
          }}
        >
          <X size={20} />
        </button>

        {/* Success State */}
        {success ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
            }}
          >
            <CheckCircle
              size={64}
              style={{ color: "#10B981", margin: "0 auto 16px" }}
            />
            <h2
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "28px",
                fontWeight: 500,
                color: "#2A2A2A",
                marginBottom: "8px",
              }}
            >
              You&apos;re on the list!
            </h2>
            <p style={{ fontSize: "14px", color: "#6B7280" }}>
              We&apos;ll notify you when <strong>{app.name}</strong> launches.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "28px",
                  fontWeight: 500,
                  color: "#2A2A2A",
                  marginBottom: "8px",
                }}
              >
                Join the waitlist for {app.name}
              </h2>
              <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
                {app.description}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Email */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@company.com"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "var(--font-ibm-plex)",
                  }}
                  disabled={loading}
                />
              </div>

              {/* Name */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "var(--font-ibm-plex)",
                  }}
                  disabled={loading}
                />
              </div>

              {/* Company */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Company *
                </label>
                <input
                  type="text"
                  name="company"
                  required
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Acme Construction Ltd"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "var(--font-ibm-plex)",
                  }}
                  disabled={loading}
                />
              </div>

              {/* Role */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Role *
                </label>
                <input
                  type="text"
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  placeholder="Project Director"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "var(--font-ibm-plex)",
                  }}
                  disabled={loading}
                />
              </div>

              {/* App Interest Dropdown */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: "6px",
                  }}
                >
                  Which app are you interested in? *
                </label>
                <select
                  name="appInterest"
                  required
                  value={formData.appInterest}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontFamily: "var(--font-ibm-plex)",
                    background: "white",
                  }}
                  disabled={loading}
                >
                  <option value="chat">chat - Conversational AI</option>
                  <option value="TIDP">TIDP - Technical Information Delivery Plan</option>
                  <option value="scope">scope - Scope of Works management</option>
                  <option value="report">report - Automated reporting</option>
                  <option value="list">list - Task & checklist management</option>
                  <option value="procure">procure - Procurement management</option>
                  <option value="wlca">wlca - Whole Life Carbon Assessment</option>
                  <option value="assign">assign - Team & resource assignment</option>
                  <option value="dpow.ai">dpow.ai - Full ecosystem access</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px",
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    borderRadius: "8px",
                    color: "#DC2626",
                    fontSize: "13px",
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#2563EB",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: loading ? 0.5 : 1,
                  marginTop: "8px",
                }}
              >
                {loading ? "Submitting..." : "Join Waitlist"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
