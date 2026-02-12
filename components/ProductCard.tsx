"use client";

import { Package, ChevronRight } from "lucide-react";

const PILLAR_COLORS: Record<string, string> = {
  fire_doors: "#DC2626",
  dampers: "#EA580C",
  fire_stopping: "#CA8A04",
  retro_fire_stopping: "#7C3AED",
  auro_lume: "#0D9488",
};

const PILLAR_LABELS: Record<string, string> = {
  fire_doors: "Fire Doors",
  dampers: "Dampers",
  fire_stopping: "Fire Stopping",
  retro_fire_stopping: "Retro Fire Stopping",
  auro_lume: "Auro Lume",
};

interface ProductCardProps {
  product: {
    id: string;
    product_name: string;
    product_code?: string;
    pillar: string;
    status: string;
    description?: string;
    sell_price?: number;
    currency?: string;
    needs_review: boolean;
    manufacturers?: { name: string };
  };
  onClick: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const pillarColor = PILLAR_COLORS[product.pillar] || "#6B7280";

  return (
    <button
      onClick={onClick}
      className="w-full p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${pillarColor}15` }}
          >
            <Package size={20} style={{ color: pillarColor }} />
          </div>
          <div className="min-w-0">
            <h3
              className="text-base font-medium text-gray-900 truncate"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {product.product_name}
            </h3>
            {product.product_code && (
              <span className="text-xs text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                {product.product_code}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-400 mt-1 flex-shrink-0" />
      </div>

      {product.description && (
        <p
          className="mt-2 text-sm text-gray-600 line-clamp-2"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          {product.description}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-0.5 text-xs rounded-full font-medium"
          style={{ background: `${pillarColor}15`, color: pillarColor }}
        >
          {PILLAR_LABELS[product.pillar] || product.pillar}
        </span>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            product.status === "active"
              ? "bg-green-50 text-green-700"
              : product.status === "discontinued"
              ? "bg-red-50 text-red-600"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {product.status}
        </span>
        {product.needs_review && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700">
            Needs review
          </span>
        )}
        {product.sell_price && (
          <span className="text-xs text-gray-500 ml-auto" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {product.currency || "GBP"} {product.sell_price.toFixed(2)}
          </span>
        )}
      </div>
      {product.manufacturers?.name && (
        <p className="mt-2 text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          {product.manufacturers.name}
        </p>
      )}
    </button>
  );
}
