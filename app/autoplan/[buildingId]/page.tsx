"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  X,
  Building2,
  MapPin,
  Shield,
  Droplets,
  Flame,
  Layers,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import FloorCard from "@/components/autoplan/FloorCard";
import type {
  AutoplanBuilding,
  AutoplanFloor,
  AutoplanPlan,
} from "@/lib/autoplan/types";

const BUILDING_USE_LABELS: Record<string, string> = {
  residential_high_rise: "Residential (High-Rise)",
  residential_low_rise: "Residential (Low-Rise)",
  mixed_use: "Mixed Use",
  care_home: "Care Home",
  student_accommodation: "Student Accommodation",
  hotel: "Hotel",
  office: "Office",
  retail: "Retail",
};

const EVAC_LABELS: Record<string, string> = {
  stay_put: "Stay Put",
  simultaneous: "Simultaneous",
  phased: "Phased",
  progressive_horizontal: "Progressive Horizontal",
  defend_in_place: "Defend in Place",
};

export default function BuildingDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [building, setBuilding] = useState<AutoplanBuilding | null>(null);
  const [floors, setFloors] = useState<AutoplanFloor[]>([]);
  const [plans, setPlans] = useState<AutoplanPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFloorNumber, setUploadFloorNumber] = useState("");
  const [uploadFloorName, setUploadFloorName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Polling ref
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/auth");
      return null;
    }
    return session;
  }, [router]);

  const fetchBuilding = useCallback(async () => {
    const session = await getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/autoplan/buildings/${buildingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to load building");

      const data = await res.json();
      setBuilding(data.building);
      setFloors(data.floors || []);
      setPlans(data.plans || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [buildingId, getSession]);

  useEffect(() => {
    fetchBuilding();
  }, [fetchBuilding]);

  // Poll for AI analysis status
  useEffect(() => {
    const hasPending = floors.some(
      (f) =>
        f.ai_analysis_status === "pending" ||
        f.ai_analysis_status === "analyzing"
    );

    if (hasPending) {
      pollIntervalRef.current = setInterval(() => {
        fetchBuilding();
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [floors, fetchBuilding]);

  async function handleUpload() {
    if (!uploadFile || !uploadFloorNumber.trim()) return;

    setUploading(true);
    setUploadError(null);

    const session = await getSession();
    if (!session) return;

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("building_id", buildingId);
      formData.append("floor_number", uploadFloorNumber.trim());
      if (uploadFloorName.trim()) {
        formData.append("floor_name", uploadFloorName.trim());
      }

      const res = await fetch("/api/autoplan/floors", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to upload floor plan");
      }

      // Reset modal and refresh
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadFloorNumber("");
      setUploadFloorName("");
      await fetchBuilding();
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleGeneratePlan(floorId: string) {
    const session = await getSession();
    if (!session) return;

    try {
      const res = await fetch("/api/autoplan/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ floor_id: floorId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate plan");
      }

      const data = await res.json();
      router.push(`/autoplan/editor/${data.plan.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteFloor(floorId: string) {
    const confirmed = window.confirm(
      "Delete this floor plan? This will also delete all associated plans."
    );
    if (!confirmed) return;

    const session = await getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/autoplan/floors/${floorId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) throw new Error("Failed to delete floor");
      await fetchBuilding();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadFile(file);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#FCFCFA",
          paddingLeft: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
    );
  }

  if (error && !building) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#FCFCFA",
          paddingLeft: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
    );
  }

  if (!building) return null;

  const fullAddress = [
    building.address_line_1,
    building.address_line_2,
    building.city,
    building.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const features: { label: string; active: boolean }[] = [
    { label: "Sprinklers", active: building.has_sprinklers },
    { label: "Dry Riser", active: building.has_dry_riser },
    { label: "Wet Riser", active: building.has_wet_riser },
  ];

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
        {/* Back link */}
        <button
          onClick={() => router.push("/autoplan")}
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

        {/* Error banner */}
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

        {/* Building Header Card */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(0, 86, 167, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Building2 size={22} color="#0056A7" />
              </div>
              <div>
                <h1
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: "26px",
                    fontWeight: 600,
                    color: "#2A2A2A",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {building.name}
                </h1>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginTop: "4px",
                  }}
                >
                  <MapPin size={13} color="#6B7280" />
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "13px",
                      color: "#6B7280",
                    }}
                  >
                    {fullAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "rgba(0, 86, 167, 0.1)",
                color: "#0056A7",
              }}
            >
              {building.jurisdiction.charAt(0).toUpperCase() +
                building.jurisdiction.slice(1)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "#F3F4F6",
                color: "#4B5563",
              }}
            >
              {BUILDING_USE_LABELS[building.building_use] || building.building_use}
            </span>
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "rgba(0, 86, 167, 0.1)",
                color: "#0056A7",
              }}
            >
              {building.number_of_storeys} Storeys
            </span>
            {building.height_metres != null && (
              <span
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: "999px",
                  background: "rgba(0, 86, 167, 0.1)",
                  color: "#0056A7",
                }}
              >
                {building.height_metres}m
              </span>
            )}
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: "999px",
                background: "#FEF3C7",
                color: "#92400E",
              }}
            >
              {EVAC_LABELS[building.evacuation_strategy] ||
                building.evacuation_strategy}
            </span>
          </div>

          {/* Features */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {features.map((feat) => (
              <span
                key={feat.label}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: feat.active ? "#DCFCE7" : "#F3F4F6",
                  color: feat.active ? "#166534" : "#9CA3AF",
                }}
              >
                {feat.label}
              </span>
            ))}
            {building.number_of_firefighting_lifts > 0 && (
              <span
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "11px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: "#DCFCE7",
                  color: "#166534",
                }}
              >
                {building.number_of_firefighting_lifts} Firefighting{" "}
                {building.number_of_firefighting_lifts === 1 ? "Lift" : "Lifts"}
              </span>
            )}
          </div>

          {/* Responsible Person */}
          {building.responsible_person && (
            <div
              style={{
                marginTop: "12px",
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "12px",
                color: "#6B7280",
                borderTop: "1px solid #F3F4F6",
                paddingTop: "10px",
              }}
            >
              Responsible Person: {building.responsible_person}
            </div>
          )}
        </div>

        {/* Floor Plans Section */}
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "22px",
                fontWeight: 500,
                color: "#2A2A2A",
                margin: 0,
              }}
            >
              Floor Plans
            </h2>
            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadFile(null);
                setUploadFloorNumber("");
                setUploadFloorName("");
                setUploadError(null);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "#0056A7",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "13px",
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
              <Upload size={14} />
              Upload Floor Plan
            </button>
          </div>

          {floors.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                padding: "40px",
                textAlign: "center",
              }}
            >
              <Layers
                size={28}
                color="#9CA3AF"
                style={{ marginBottom: "8px" }}
              />
              <p
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "14px",
                  color: "#6B7280",
                  margin: 0,
                }}
              >
                No floor plans uploaded yet. Upload a PDF to get started.
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
              {floors.map((floor) => {
                const floorPlans = plans.filter(
                  (p) => p.floor_id === floor.id
                );
                return (
                  <FloorCard
                    key={floor.id}
                    floor={floor}
                    plans={floorPlans}
                    onGeneratePlan={() => handleGeneratePlan(floor.id)}
                    onDelete={() => handleDeleteFloor(floor.id)}
                    onOpenEditor={(planId) =>
                      router.push(`/autoplan/editor/${planId}`)
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Plans Overview Section */}
        {plans.length > 0 && (
          <div>
            <h2
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "22px",
                fontWeight: 500,
                color: "#2A2A2A",
                margin: 0,
                marginBottom: "16px",
              }}
            >
              All Plans
            </h2>
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              {plans.map((plan, idx) => {
                const statusColors: Record<
                  string,
                  { bg: string; color: string }
                > = {
                  draft: { bg: "#F3F4F6", color: "#6B7280" },
                  review: { bg: "#FEF3C7", color: "#92400E" },
                  approved: { bg: "#DCFCE7", color: "#166534" },
                  superseded: { bg: "#E0E7FF", color: "#3730A3" },
                };
                const sc = statusColors[plan.status] || statusColors.draft;

                return (
                  <div
                    key={plan.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderBottom:
                        idx < plans.length - 1
                          ? "1px solid #F3F4F6"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex)",
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "#2A2A2A",
                        }}
                      >
                        {plan.plan_reference}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex)",
                          fontSize: "11px",
                          color: "#9CA3AF",
                        }}
                      >
                        v{plan.version}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-ibm-plex)",
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: sc.bg,
                          color: sc.color,
                        }}
                      >
                        {plan.status.charAt(0).toUpperCase() +
                          plan.status.slice(1)}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        router.push(`/autoplan/editor/${plan.id}`)
                      }
                      style={{
                        fontFamily: "var(--font-ibm-plex)",
                        fontSize: "13px",
                        fontWeight: 500,
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: "1px solid #0056A7",
                        background: "transparent",
                        color: "#0056A7",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(0, 86, 167, 0.06)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      Open Editor
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal Overlay */}
      {showUploadModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUploadModal(false);
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "#2A2A2A",
                  margin: 0,
                }}
              >
                Upload Floor Plan
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                  color: "#6B7280",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#F3F4F6")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                <X size={18} />
              </button>
            </div>

            {/* Upload Error */}
            {uploadError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "#FEE2E2",
                  border: "1px solid #FECACA",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  color: "#991B1B",
                }}
              >
                {uploadError}
              </div>
            )}

            {/* Drag-Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#0056A7" : "#D1D5DB"}`,
                borderRadius: "12px",
                padding: "28px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "rgba(0, 86, 167, 0.04)" : "#FAFAFA",
                transition: "border-color 0.2s, background 0.2s",
                marginBottom: "16px",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <Upload
                size={28}
                color={dragOver ? "#0056A7" : "#9CA3AF"}
                style={{ marginBottom: "8px" }}
              />
              {uploadFile ? (
                <p
                  style={{
                    fontFamily: "var(--font-ibm-plex)",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "#2A2A2A",
                    margin: 0,
                  }}
                >
                  {uploadFile.name}
                </p>
              ) : (
                <>
                  <p
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "14px",
                      color: "#6B7280",
                      margin: 0,
                      marginBottom: "4px",
                    }}
                  >
                    Drop a PDF file here or click to browse
                  </p>
                  <p
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "12px",
                      color: "#9CA3AF",
                      margin: 0,
                    }}
                  >
                    PDF floor plans only
                  </p>
                </>
              )}
            </div>

            {/* Floor Number */}
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#2A2A2A",
                  marginBottom: "4px",
                }}
              >
                Floor Number *
              </label>
              <input
                type="number"
                value={uploadFloorNumber}
                onChange={(e) => setUploadFloorNumber(e.target.value)}
                placeholder="e.g. 0, 1, 2..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "14px",
                  color: "#2A2A2A",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#0056A7")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "#D1D5DB")
                }
              />
            </div>

            {/* Floor Name */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "#2A2A2A",
                  marginBottom: "4px",
                }}
              >
                Floor Name (optional)
              </label>
              <input
                type="text"
                value={uploadFloorName}
                onChange={(e) => setUploadFloorName(e.target.value)}
                placeholder="e.g. Ground Floor, Basement..."
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "14px",
                  color: "#2A2A2A",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "#0056A7")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "#D1D5DB")
                }
              />
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid #D1D5DB",
                  background: "#FFFFFF",
                  color: "#6B7280",
                  cursor: uploading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFile || !uploadFloorNumber.trim()}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "13px",
                  fontWeight: 500,
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    uploading || !uploadFile || !uploadFloorNumber.trim()
                      ? "#E5E7EB"
                      : "#0056A7",
                  color:
                    uploading || !uploadFile || !uploadFloorNumber.trim()
                      ? "#9CA3AF"
                      : "#FFFFFF",
                  cursor:
                    uploading || !uploadFile || !uploadFloorNumber.trim()
                      ? "not-allowed"
                      : "pointer",
                  transition: "background 0.15s",
                }}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
