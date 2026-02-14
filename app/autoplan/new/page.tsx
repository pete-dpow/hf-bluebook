"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BuildingForm from "@/components/autoplan/BuildingForm";

export default function NewBuildingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: Record<string, any>) {
    setSubmitting(true);
    setError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/auth");
      return;
    }

    try {
      const res = await fetch("/api/autoplan/buildings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create building");
      }

      const data = await res.json();
      router.push(`/autoplan/${data.building.id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.back();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FCFCFA",
        paddingLeft: "64px",
        paddingTop: "32px",
        paddingRight: "32px",
        paddingBottom: "32px",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Back link */}
        <button
          onClick={() => router.back()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "13px",
            color: "#6B7280",
            padding: "4px 0",
            marginBottom: "16px",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0056A7")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
        >
          <ArrowLeft size={14} />
          Back to AutoPlan
        </button>

        {/* Header */}
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "28px",
            fontWeight: 500,
            color: "#2A2A2A",
            margin: 0,
            marginBottom: "24px",
            lineHeight: 1.2,
          }}
        >
          New Building
        </h1>

        {/* Error display */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "#FEE2E2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              marginBottom: "20px",
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "13px",
              color: "#991B1B",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <BuildingForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitting={submitting}
          />
        </div>
      </div>
    </div>
  );
}
