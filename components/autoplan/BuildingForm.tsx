"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  AutoplanBuilding,
  BuildingUse,
  EvacuationStrategy,
} from "@/lib/autoplan/types";

interface BuildingFormProps {
  initialData?: Partial<AutoplanBuilding>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  /** Alias for loading — accepted for backward compatibility */
  submitting?: boolean;
}

const BUILDING_USE_OPTIONS: { value: BuildingUse; label: string }[] = [
  { value: "residential_high_rise", label: "Residential (High-Rise)" },
  { value: "residential_low_rise", label: "Residential (Low-Rise)" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "care_home", label: "Care Home" },
  { value: "student_accommodation", label: "Student Accommodation" },
  { value: "hotel", label: "Hotel" },
  { value: "office", label: "Office" },
  { value: "retail", label: "Retail" },
];

const EVAC_OPTIONS: { value: EvacuationStrategy; label: string }[] = [
  { value: "stay_put", label: "Stay Put" },
  { value: "simultaneous", label: "Simultaneous" },
  { value: "phased", label: "Phased" },
  { value: "progressive_horizontal", label: "Progressive Horizontal" },
  { value: "defend_in_place", label: "Defend in Place" },
];

const JURISDICTIONS: { value: "england" | "scotland" | "wales"; label: string }[] = [
  { value: "england", label: "England" },
  { value: "scotland", label: "Scotland" },
  { value: "wales", label: "Wales" },
];

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ibm-plex)",
  fontSize: "13px",
  fontWeight: 500,
  color: "#2A2A2A",
  display: "block",
  marginBottom: "4px",
};

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-ibm-plex)",
  fontSize: "14px",
  color: "#2A2A2A",
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  outline: "none",
  transition: "border-color 0.15s",
  background: "#FFFFFF",
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const requiredStar: React.CSSProperties = {
  color: "#DC2626",
  marginLeft: "2px",
};

export default function BuildingForm({
  initialData,
  onSubmit,
  onCancel,
  loading: loadingProp = false,
  submitting = false,
}: BuildingFormProps) {
  const loading = loadingProp || submitting;
  const [name, setName] = useState(initialData?.name || "");
  const [addressLine1, setAddressLine1] = useState(
    initialData?.address_line_1 || ""
  );
  const [addressLine2, setAddressLine2] = useState(
    initialData?.address_line_2 || ""
  );
  const [city, setCity] = useState(initialData?.city || "");
  const [postcode, setPostcode] = useState(initialData?.postcode || "");
  const [jurisdiction, setJurisdiction] = useState<
    "england" | "scotland" | "wales"
  >(initialData?.jurisdiction || "england");
  const [heightMetres, setHeightMetres] = useState<string>(
    initialData?.height_metres != null
      ? String(initialData.height_metres)
      : ""
  );
  const [numberOfStoreys, setNumberOfStoreys] = useState<string>(
    initialData?.number_of_storeys != null
      ? String(initialData.number_of_storeys)
      : ""
  );
  const [buildingUse, setBuildingUse] = useState<BuildingUse>(
    initialData?.building_use || "residential_high_rise"
  );
  const [evacuationStrategy, setEvacuationStrategy] =
    useState<EvacuationStrategy>(
      initialData?.evacuation_strategy || "stay_put"
    );
  const [hasSprinklers, setHasSprinklers] = useState(
    initialData?.has_sprinklers || false
  );
  const [hasDryRiser, setHasDryRiser] = useState(
    initialData?.has_dry_riser || false
  );
  const [hasWetRiser, setHasWetRiser] = useState(
    initialData?.has_wet_riser || false
  );
  const [numberOfFirefightingLifts, setNumberOfFirefightingLifts] =
    useState<string>(
      initialData?.number_of_firefighting_lifts != null
        ? String(initialData.number_of_firefighting_lifts)
        : "0"
    );
  const [responsiblePerson, setResponsiblePerson] = useState(
    initialData?.responsible_person || ""
  );
  const [rpContactEmail, setRpContactEmail] = useState(
    initialData?.rp_contact_email || ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Building name is required";
    if (!addressLine1.trim()) errs.address_line_1 = "Address is required";
    if (!city.trim()) errs.city = "City is required";
    if (!postcode.trim()) errs.postcode = "Postcode is required";
    if (!jurisdiction) errs.jurisdiction = "Jurisdiction is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      address_line_1: addressLine1.trim(),
      address_line_2: addressLine2.trim() || undefined,
      city: city.trim(),
      postcode: postcode.trim(),
      jurisdiction,
      height_metres: heightMetres ? parseFloat(heightMetres) : undefined,
      number_of_storeys: parseInt(numberOfStoreys) || 1,
      building_use: buildingUse,
      evacuation_strategy: evacuationStrategy,
      has_sprinklers: hasSprinklers,
      has_dry_riser: hasDryRiser,
      has_wet_riser: hasWetRiser,
      number_of_firefighting_lifts: parseInt(numberOfFirefightingLifts) || 0,
      responsible_person: responsiblePerson.trim() || undefined,
      rp_contact_email: rpContactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  const errorText = (field: string) =>
    errors[field] ? (
      <span
        style={{
          fontFamily: "var(--font-ibm-plex)",
          fontSize: "12px",
          color: "#DC2626",
          marginTop: "2px",
          display: "block",
        }}
      >
        {errors[field]}
      </span>
    ) : null;

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        {/* Section: Building Details */}
        <h3
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "18px",
            fontWeight: 600,
            color: "#2A2A2A",
            marginBottom: "16px",
            paddingBottom: "8px",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          Building Details
        </h3>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>
            Building Name<span style={requiredStar}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Grenfell Tower"
            style={{
              ...inputStyle,
              borderColor: errors.name ? "#DC2626" : "#E5E7EB",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = errors.name
                ? "#DC2626"
                : "#E5E7EB")
            }
          />
          {errorText("name")}
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>
            Address Line 1<span style={requiredStar}>*</span>
          </label>
          <input
            type="text"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            style={{
              ...inputStyle,
              borderColor: errors.address_line_1 ? "#DC2626" : "#E5E7EB",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = errors.address_line_1
                ? "#DC2626"
                : "#E5E7EB")
            }
          />
          {errorText("address_line_1")}
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Address Line 2</label>
          <input
            type="text"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            ...fieldGroupStyle,
          }}
        >
          <div>
            <label style={labelStyle}>
              City<span style={requiredStar}>*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: errors.city ? "#DC2626" : "#E5E7EB",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = errors.city
                  ? "#DC2626"
                  : "#E5E7EB")
              }
            />
            {errorText("city")}
          </div>
          <div>
            <label style={labelStyle}>
              Postcode<span style={requiredStar}>*</span>
            </label>
            <input
              type="text"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              style={{
                ...inputStyle,
                borderColor: errors.postcode ? "#DC2626" : "#E5E7EB",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = errors.postcode
                  ? "#DC2626"
                  : "#E5E7EB")
              }
            />
            {errorText("postcode")}
          </div>
        </div>

        {/* Jurisdiction Radio Buttons */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>
            Jurisdiction<span style={requiredStar}>*</span>
          </label>
          <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
            {JURISDICTIONS.map((j) => (
              <label
                key={j.value}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "14px",
                  color: "#2A2A2A",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="jurisdiction"
                  value={j.value}
                  checked={jurisdiction === j.value}
                  onChange={(e) =>
                    setJurisdiction(
                      e.target.value as "england" | "scotland" | "wales"
                    )
                  }
                  style={{ accentColor: "#0056A7" }}
                />
                {j.label}
              </label>
            ))}
          </div>
          {errorText("jurisdiction")}
        </div>

        {/* Section: Building Characteristics */}
        <h3
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "18px",
            fontWeight: 600,
            color: "#2A2A2A",
            marginTop: "24px",
            marginBottom: "16px",
            paddingBottom: "8px",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          Building Characteristics
        </h3>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Building Use</label>
          <select
            value={buildingUse}
            onChange={(e) => setBuildingUse(e.target.value as BuildingUse)}
            style={inputStyle}
          >
            {BUILDING_USE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Evacuation Strategy</label>
          <select
            value={evacuationStrategy}
            onChange={(e) =>
              setEvacuationStrategy(e.target.value as EvacuationStrategy)
            }
            style={inputStyle}
          >
            {EVAC_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            ...fieldGroupStyle,
          }}
        >
          <div>
            <label style={labelStyle}>Number of Storeys</label>
            <input
              type="number"
              min="1"
              value={numberOfStoreys}
              onChange={(e) => setNumberOfStoreys(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Height (metres)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={heightMetres}
              onChange={(e) => setHeightMetres(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Firefighting Lifts</label>
            <input
              type="number"
              min="0"
              value={numberOfFirefightingLifts}
              onChange={(e) => setNumberOfFirefightingLifts(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Fire Protection Checkboxes */}
        <div style={{ ...fieldGroupStyle, display: "flex", gap: "24px" }}>
          <label
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              color: "#2A2A2A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={hasSprinklers}
              onChange={(e) => setHasSprinklers(e.target.checked)}
              style={{ accentColor: "#0056A7", width: "16px", height: "16px" }}
            />
            Sprinklers
          </label>
          <label
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              color: "#2A2A2A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={hasDryRiser}
              onChange={(e) => setHasDryRiser(e.target.checked)}
              style={{ accentColor: "#0056A7", width: "16px", height: "16px" }}
            />
            Dry Riser
          </label>
          <label
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              color: "#2A2A2A",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={hasWetRiser}
              onChange={(e) => setHasWetRiser(e.target.checked)}
              style={{ accentColor: "#0056A7", width: "16px", height: "16px" }}
            />
            Wet Riser
          </label>
        </div>

        {/* Section: Responsible Person */}
        <h3
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "18px",
            fontWeight: 600,
            color: "#2A2A2A",
            marginTop: "24px",
            marginBottom: "16px",
            paddingBottom: "8px",
            borderBottom: "1px solid #F3F4F6",
          }}
        >
          Responsible Person
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            ...fieldGroupStyle,
          }}
        >
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            />
          </div>
          <div>
            <label style={labelStyle}>Contact Email</label>
            <input
              type="email"
              value={rpContactEmail}
              onChange={(e) => setRpContactEmail(e.target.value)}
              placeholder="Optional"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
            />
          </div>
        </div>

        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any additional notes about the building..."
            style={{
              ...inputStyle,
              resize: "vertical" as const,
              minHeight: "60px",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#0056A7")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
          />
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "14px",
            fontWeight: 500,
            padding: "8px 20px",
            borderRadius: "8px",
            border: "1px solid #E5E7EB",
            background: "#FFFFFF",
            color: "#6B7280",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "14px",
            fontWeight: 500,
            padding: "8px 20px",
            borderRadius: "8px",
            border: "none",
            background: loading ? "#93C5FD" : "#0056A7",
            color: "#FFFFFF",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = "#004A8F";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = "#0056A7";
          }}
        >
          {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {initialData?.id ? "Update Building" : "Create Building"}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
