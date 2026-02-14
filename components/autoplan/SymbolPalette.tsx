"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import {
  SYMBOL_DEFINITIONS,
  SYMBOL_CATEGORIES,
  getSymbolsByCategory,
} from "@/lib/autoplan/symbols";
import type { SymbolCategory } from "@/lib/autoplan/types";

interface SymbolPaletteProps {
  onDragStart: (symbolId: string) => void;
  onSymbolClick: (symbolId: string) => void;
}

const CATEGORY_COLORS: Record<SymbolCategory, string> = {
  escape: "#16A34A",
  equipment: "#DC2626",
  doors: "#2563EB",
  detection: "#2563EB",
  suppression: "#2563EB",
  lighting: "#16A34A",
};

export default function SymbolPalette({
  onDragStart,
  onSymbolClick,
}: SymbolPaletteProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredBySearch = search.trim()
    ? SYMBOL_DEFINITIONS.filter(
        (s) =>
          s.label.toLowerCase().includes(search.toLowerCase()) ||
          s.shortLabel.toLowerCase().includes(search.toLowerCase()) ||
          s.bsReference.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div
      style={{
        width: "200px",
        height: "100%",
        background: "#FCFCFA",
        borderRight: "1px solid #E5E7EB",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "15px",
            fontWeight: 600,
            color: "#2A2A2A",
            marginBottom: "8px",
          }}
        >
          Symbols
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#FFFFFF",
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            padding: "6px 8px",
          }}
        >
          <Search size={14} color="#9CA3AF" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbols..."
            style={{
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "12px",
              color: "#2A2A2A",
              border: "none",
              outline: "none",
              background: "transparent",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Symbol List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 0",
        }}
      >
        {filteredBySearch ? (
          /* Flat search results */
          <div style={{ padding: "4px 8px" }}>
            {filteredBySearch.length === 0 && (
              <div
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontSize: "12px",
                  color: "#9CA3AF",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                No symbols found
              </div>
            )}
            {filteredBySearch.map((symbol) => (
              <SymbolItem
                key={symbol.id}
                symbolId={symbol.id}
                shortLabel={symbol.shortLabel}
                label={symbol.label}
                bgColor={symbol.bgColor}
                textColor={symbol.color}
                bsReference={symbol.bsReference}
                onDragStart={onDragStart}
                onSymbolClick={onSymbolClick}
              />
            ))}
          </div>
        ) : (
          /* Grouped by category */
          SYMBOL_CATEGORIES.map((cat) => {
            const symbols = getSymbolsByCategory(cat.key);
            const isCollapsed = collapsed[cat.key];
            const catColor = CATEGORY_COLORS[cat.key];

            return (
              <div key={cat.key}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(cat.key)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 12px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#F3F4F6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  {isCollapsed ? (
                    <ChevronRight size={13} color="#6B7280" />
                  ) : (
                    <ChevronDown size={13} color="#6B7280" />
                  )}
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "2px",
                      background: catColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#4B5563",
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {cat.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      fontSize: "10px",
                      color: "#9CA3AF",
                      marginLeft: "auto",
                    }}
                  >
                    {symbols.length}
                  </span>
                </button>

                {/* Symbols in Category */}
                {!isCollapsed && (
                  <div style={{ padding: "0 8px 4px 8px" }}>
                    {symbols.map((symbol) => (
                      <SymbolItem
                        key={symbol.id}
                        symbolId={symbol.id}
                        shortLabel={symbol.shortLabel}
                        label={symbol.label}
                        bgColor={symbol.bgColor}
                        textColor={symbol.color}
                        bsReference={symbol.bsReference}
                        onDragStart={onDragStart}
                        onSymbolClick={onSymbolClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Individual Symbol Item ─────────────────────────────── */

interface SymbolItemProps {
  symbolId: string;
  shortLabel: string;
  label: string;
  bgColor: string;
  textColor: string;
  bsReference: string;
  onDragStart: (symbolId: string) => void;
  onSymbolClick: (symbolId: string) => void;
}

function SymbolItem({
  symbolId,
  shortLabel,
  label,
  bgColor,
  textColor,
  bsReference,
  onDragStart,
  onSymbolClick,
}: SymbolItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", symbolId);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart(symbolId);
      }}
      onClick={() => onSymbolClick(symbolId)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 6px",
        marginBottom: "2px",
        borderRadius: "6px",
        cursor: "grab",
        background: hovered ? "#F3F4F6" : "transparent",
        transition: "background 0.1s",
      }}
    >
      {/* Drag Handle */}
      <GripVertical
        size={12}
        color="#D1D5DB"
        style={{ flexShrink: 0, opacity: hovered ? 1 : 0.4 }}
      />

      {/* Colored square with shortLabel */}
      <div
        style={{
          width: "28px",
          height: "20px",
          borderRadius: "3px",
          background: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "9px",
            fontWeight: 700,
            color: textColor,
            lineHeight: 1,
          }}
        >
          {shortLabel}
        </span>
      </div>

      {/* Label + BS Reference */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "11px",
            fontWeight: 500,
            color: "#2A2A2A",
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: "1.3",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "9px",
            color: "#9CA3AF",
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: "1.3",
          }}
        >
          {bsReference}
        </div>
      </div>
    </div>
  );
}
