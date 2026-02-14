"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import BuildingCard from "@/components/autoplan/BuildingCard";
import type { AutoplanBuilding } from "@/lib/autoplan/types";

interface BuildingWithCounts extends AutoplanBuilding {
  floor_count: number;
  plan_count: number;
  approved_count: number;
}

export default function AutoplanPage() {
  const router = useRouter();
  const [buildings, setBuildings] = useState<BuildingWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBuildings = useCallback(async () => {
    setLoading(true);
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
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to load buildings");
      }

      const data = await res.json();
      setBuildings(data.buildings || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

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
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "32px",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "28px",
                fontWeight: 500,
                color: "#2A2A2A",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              AutoPlan
            </h1>
            <p
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "14px",
                color: "#6B7280",
                marginTop: "4px",
              }}
            >
              Fire Safety Plans
            </p>
          </div>
          <button
            onClick={() => router.push("/autoplan/new")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "#0056A7",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              fontWeight: 500,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#004A8F")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "#0056A7")
            }
          >
            <Plus size={16} />
            New Building
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "80px",
              paddingBottom: "80px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "14px",
                color: "#6B7280",
              }}
            >
              Loading...
            </span>
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "80px",
              paddingBottom: "80px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "14px",
                color: "#DC2626",
              }}
            >
              {error}
            </span>
          </div>
        ) : buildings.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: "80px",
              paddingBottom: "80px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "rgba(0, 86, 167, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <Building2 size={28} color="#0056A7" />
            </div>
            <p
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "16px",
                fontWeight: 600,
                color: "#2A2A2A",
                margin: 0,
                marginBottom: "6px",
              }}
            >
              No buildings yet
            </p>
            <p
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "14px",
                color: "#6B7280",
                margin: 0,
                textAlign: "center",
                maxWidth: "360px",
              }}
            >
              Create your first building to start generating fire safety plans
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px",
            }}
          >
            {buildings.map((building) => (
              <BuildingCard
                key={building.id}
                building={building}
                floorCount={building.floor_count ?? 0}
                planCount={building.plan_count ?? 0}
                approvedCount={building.approved_count ?? 0}
                onClick={() => router.push(`/autoplan/${building.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
