"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CDEHomePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const displayName = user?.email?.split("@")[0] || "User";

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      {/* Section label */}
      <div style={{
        fontSize: 10, fontWeight: 500, color: "#9ca3af",
        textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10,
      }}>
        Portfolio Overview
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 500, marginTop: 2 }}>
        Good morning, {displayName}
      </h2>
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
        Harmony Fire Limited — Common Data Environment
      </p>

      {/* Placeholder KPI row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 12,
        marginTop: 18,
        marginBottom: 18,
      }}>
        {[
          { label: "Total Documents", value: "—", color: "#154f91" },
          { label: "Open Issues", value: "—", color: "#dc2626" },
          { label: "Overdue Items", value: "—", color: "#d97706" },
          { label: "Doc Compliance", value: "—", color: "#4d7c0f" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            padding: "14px 16px",
          }}>
            <div style={{
              fontSize: 10, fontWeight: 500, color: "#9ca3af",
              textTransform: "uppercase", letterSpacing: ".03em",
              marginBottom: 6,
            }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 500, color: kpi.color }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Setup notice */}
      <div style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 6,
        padding: 24,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>
          {String.fromCodePoint(0x1F6E1)}
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 4 }}>
          CDE is ready
        </div>
        <div style={{ fontSize: 11, color: "#9ca3af" }}>
          Database tables, client setup, and project configuration are coming in the next phases.
        </div>
      </div>
    </div>
  );
}
