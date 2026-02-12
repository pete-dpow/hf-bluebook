"use client";

import { Package } from "lucide-react";

const PILLAR_LABELS: Record<string, string> = {
  fire_doors: "Fire Doors",
  dampers: "Dampers",
  fire_stopping: "Fire Stopping",
  retro_fire_stopping: "Retro",
  auro_lume: "Auro Lume",
};

interface ProductListRowProps {
  product: {
    id: string;
    product_name: string;
    product_code?: string;
    pillar: string;
    status: string;
    sell_price?: number;
    needs_review: boolean;
    manufacturers?: { name: string };
  };
  onClick: () => void;
}

export default function ProductListRow({ product, onClick }: ProductListRowProps) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {product.product_name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {product.product_code || "—"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {product.manufacturers?.name || "—"}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-gray-600">{PILLAR_LABELS[product.pillar] || product.pillar}</span>
      </td>
      <td className="px-4 py-3">
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
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 text-right" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {product.sell_price ? `£${product.sell_price.toFixed(2)}` : "—"}
      </td>
    </tr>
  );
}
