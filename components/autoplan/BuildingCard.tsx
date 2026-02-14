"use client";

import { useState } from "react";
import { Building2, MapPin } from "lucide-react";
import type { AutoplanBuilding } from "@/lib/autoplan/types";

interface BuildingCardProps {
  building: AutoplanBuilding;
  floorCount: number;
  planCount: number;
  approvedCount: number;
  onClick: () => void;
}

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

export default function BuildingCard({
  building,
  floorCount,
  planCount,
  approvedCount,
  onClick,
}: BuildingCardProps) {
  const [hovered, setHovered] = useState(false);

  const address = [building.address_line_1, building.city, building.postcode]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left" as const,
        padding: "16px 16px 16px 20px",
        background: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderLeft: "4px solid #0056A7",
        borderRadius: "12px",
        cursor: "pointer",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        boxShadow: hovered
          ? "0 4px 12px rgba(0, 86, 167, 0.12)"
          : "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "rgba(0, 86, 167, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Building2 size={18} color="#0056A7" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontWeight: 600,
              fontSize: "15px",
              color: "#2A2A2A",
              lineHeight: "1.3",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
            }}
          >
            {building.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "2px",
            }}
          >
            <MapPin size={12} color="#6B7280" />
            <span
              style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "13px",
                color: "#6B7280",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
              }}
            >
              {address}
            </span>
          </div>
        </div>
      </div>

      {/* Badges Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap" as const,
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "rgba(0, 86, 167, 0.1)",
            color: "#0056A7",
          }}
        >
          {building.number_of_storeys}F
        </span>

        {building.height_metres != null && (
          <span
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 8px",
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
            fontSize: "11px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "#F3F4F6",
            color: "#4B5563",
          }}
        >
          {building.jurisdiction.charAt(0).toUpperCase() +
            building.jurisdiction.slice(1)}
        </span>

        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "11px",
            fontWeight: 500,
            padding: "2px 8px",
            borderRadius: "999px",
            background: "#FEF3C7",
            color: "#92400E",
          }}
        >
          {EVAC_LABELS[building.evacuation_strategy] ||
            building.evacuation_strategy}
        </span>
      </div>

      {/* Footer */}
      <div
        style={{
          fontFamily: "var(--font-ibm-plex)",
          fontSize: "12px",
          color: "#6B7280",
          borderTop: "1px solid #F3F4F6",
          paddingTop: "8px",
        }}
      >
        {floorCount} {floorCount === 1 ? "floor" : "floors"} &middot;{" "}
        {planCount} {planCount === 1 ? "plan" : "plans"} ({approvedCount}{" "}
        approved)
      </div>
    </button>
  );
}
