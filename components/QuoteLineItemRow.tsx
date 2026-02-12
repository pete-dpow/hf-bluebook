"use client";

import { Trash2 } from "lucide-react";

interface LineItem {
  id?: string;
  product_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  manufacturer_name?: string | null;
  product_code?: string | null;
  notes?: string | null;
}

interface QuoteLineItemRowProps {
  index: number;
  item: LineItem;
  onUpdate: (field: string, value: string | number) => void;
  onRemove: () => void;
}

export default function QuoteLineItemRow({ index, item, onUpdate, onRemove }: QuoteLineItemRowProps) {
  const lineTotal = (item.quantity || 0) * (item.unit_price || 0);

  const inputClass = "w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400";

  return (
    <tr className="border-b border-gray-100">
      <td className="px-3 py-2 text-sm text-gray-500 text-center" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {index + 1}
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onUpdate("description", e.target.value)}
          className={inputClass}
          style={{ fontFamily: "var(--font-ibm-plex)" }}
          placeholder="Description"
        />
        {(item.product_code || item.manufacturer_name) && (
          <div className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {[item.product_code, item.manufacturer_name].filter(Boolean).join(" — ")}
          </div>
        )}
      </td>
      <td className="px-3 py-2 w-24">
        <input
          type="number"
          value={item.quantity || ""}
          onChange={(e) => onUpdate("quantity", parseFloat(e.target.value) || 0)}
          className={`${inputClass} text-right`}
          style={{ fontFamily: "var(--font-ibm-plex)" }}
          min="0"
          step="1"
        />
      </td>
      <td className="px-3 py-2 w-24">
        <input
          type="text"
          value={item.unit}
          onChange={(e) => onUpdate("unit", e.target.value)}
          className={inputClass}
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        />
      </td>
      <td className="px-3 py-2 w-28">
        <input
          type="number"
          value={item.unit_price || ""}
          onChange={(e) => onUpdate("unit_price", parseFloat(e.target.value) || 0)}
          className={`${inputClass} text-right`}
          style={{ fontFamily: "var(--font-ibm-plex)" }}
          min="0"
          step="0.01"
        />
      </td>
      <td className="px-3 py-2 w-28 text-right text-sm text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        £{lineTotal.toFixed(2)}
      </td>
      <td className="px-3 py-2 w-12 text-center">
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-600 transition"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
