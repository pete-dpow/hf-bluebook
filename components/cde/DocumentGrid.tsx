"use client";

// DocumentGrid — dense data table (matches v5 HTML table.g)

import React from "react";
import StatusBadge from "./StatusBadge";
import SyncBadge from "./SyncBadge";

interface Document {
  id: string;
  doc_number: string;
  title: string;
  revision: string;
  version: number;
  doc_type: string;
  status: string;
  discipline?: string;
  building?: string;
  uploaded_at: string;
  needs_metadata?: boolean;
  author_id?: string;
}

interface DocumentGridProps {
  documents: Document[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onRowClick: (doc: Document) => void;
  sortBy: string;
  sortDir: string;
  onSort: (column: string) => void;
}

const MONO = "'DM Mono',monospace";

export default function DocumentGrid({
  documents,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onRowClick,
  sortBy,
  sortDir,
  onSort,
}: DocumentGridProps) {
  const allSelected = documents.length > 0 && selectedIds.length === documents.length;

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }

  const thStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    background: "#f8f9fb",
    padding: "5px 10px",
    textAlign: "left",
    fontWeight: 500,
    fontSize: "9.5px",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: ".04em",
    borderBottom: "1px solid #d1d5db",
    borderRight: "1px solid #e5e7eb",
    cursor: "pointer",
    whiteSpace: "nowrap",
    zIndex: 5,
  };

  const tdStyle: React.CSSProperties = {
    padding: "5px 10px",
    borderBottom: "1px solid #e5e7eb",
    borderRight: "1px solid rgba(229,231,235,.5)",
    fontSize: 11,
    color: "#4b5563",
    whiteSpace: "nowrap",
  };

  function renderSortArrow(col: string) {
    if (sortBy !== col) return null;
    return <span style={{ marginLeft: 2, fontSize: 8 }}>{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 28 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  style={{ width: 13, height: 13, cursor: "pointer" }}
                />
              </th>
              <th style={thStyle} onClick={() => onSort("doc_number")}>
                Doc Number{renderSortArrow("doc_number")}
              </th>
              <th style={thStyle} onClick={() => onSort("title")}>
                Title{renderSortArrow("title")}
              </th>
              <th style={thStyle}>Rev</th>
              <th style={thStyle}>V</th>
              <th style={thStyle} onClick={() => onSort("doc_type")}>
                Type{renderSortArrow("doc_type")}
              </th>
              <th style={thStyle} onClick={() => onSort("status")}>
                Status{renderSortArrow("status")}
              </th>
              <th style={thStyle}>Discipline</th>
              <th style={thStyle}>Building</th>
              <th style={thStyle} onClick={() => onSort("uploaded_at")}>
                Date{renderSortArrow("uploaded_at")}
              </th>
              <th style={{ ...thStyle, borderRight: "none" }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => onRowClick(doc)}
                style={{
                  cursor: "pointer",
                  transition: "background .06s",
                  background: doc.needs_metadata ? "#fefce8" : undefined,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = doc.needs_metadata ? "#fef9c3" : "#f0f4ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = doc.needs_metadata ? "#fefce8" : "";
                }}
              >
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(doc.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleSelect(doc.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: 13, height: 13, cursor: "pointer" }}
                  />
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      color: "#154f91",
                      fontWeight: 500,
                    }}
                  >
                    {doc.doc_number}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: "#111827", fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {doc.title}
                </td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: MONO, fontSize: "9.5px", color: "#9ca3af" }}>
                    {doc.revision || "—"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: MONO, fontSize: "9.5px", color: "#9ca3af" }}>
                    V{doc.version}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 9,
                      fontWeight: 500,
                      color: "#9ca3af",
                      background: "#eef0f4",
                      padding: "1px 5px",
                      borderRadius: 3,
                    }}
                  >
                    {doc.doc_type}
                  </span>
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={doc.status} />
                </td>
                <td style={tdStyle}>{doc.discipline || "—"}</td>
                <td style={tdStyle}>{doc.building || "—"}</td>
                <td style={tdStyle}>{formatDate(doc.uploaded_at)}</td>
                <td style={{ ...tdStyle, borderRight: "none" }}>
                  <SyncBadge needsMetadata={doc.needs_metadata} />
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={11} style={{ ...tdStyle, textAlign: "center", padding: 40, color: "#9ca3af", borderRight: "none" }}>
                  No documents found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
