"use client";

// FilterPanel — left sidebar filter panel (matches v5 HTML .fpanel)

import React from "react";
import { DOC_TYPES, DOC_STATUSES, FUNCTIONAL_CODES } from "@/lib/cde/picklists";

interface Filters {
  search: string;
  docTypes: string[];
  status: string;
  discipline: string;
  building: string;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  buildings?: string[];
}

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";

export default function FilterPanel({ filters, onChange, buildings = [] }: FilterPanelProps) {
  const updateFilter = (key: keyof Filters, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  const toggleDocType = (code: string) => {
    const current = filters.docTypes;
    const updated = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    updateFilter("docTypes", updated);
  };

  return (
    <div
      style={{
        width: 230,
        background: "#fff",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 34,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "#4b5563",
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          Filters
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Search</div>
          <input
            style={inputStyle}
            placeholder="Doc number or title..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>

        {/* Type checkboxes */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Type</div>
          {DOC_TYPES.slice(0, 8).map((dt) => (
            <label
              key={dt.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "2px 0",
                fontSize: "10.5px",
                color: "#4b5563",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={filters.docTypes.length === 0 || filters.docTypes.includes(dt.code)}
                onChange={() => toggleDocType(dt.code)}
                style={{ width: 13, height: 13, borderRadius: 3, cursor: "pointer" }}
              />
              {dt.code}
            </label>
          ))}
        </div>

        {/* Status */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Status</div>
          <select
            style={inputStyle}
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">All</option>
            {DOC_STATUSES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Discipline */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Discipline</div>
          <select
            style={inputStyle}
            value={filters.discipline}
            onChange={(e) => updateFilter("discipline", e.target.value)}
          >
            <option value="">All</option>
            {FUNCTIONAL_CODES.map((f) => (
              <option key={f.code} value={f.label}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Building */}
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>Building</div>
          <select
            style={inputStyle}
            value={filters.building}
            onChange={(e) => updateFilter("building", e.target.value)}
          >
            <option value="">All</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 500,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 26,
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  padding: "0 8px",
  fontFamily: FONT,
  fontSize: "10.5px",
  color: "#111827",
  background: "#fff",
};
