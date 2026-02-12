"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import QuoteLineItemRow from "./QuoteLineItemRow";
import QuoteTotals from "./QuoteTotals";
import ProductSearchModal from "./ProductSearchModal";

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
  sort_order?: number;
}

interface QuoteBuilderProps {
  lineItems: LineItem[];
  vatPercent: number;
  onAddItem: (item: Omit<LineItem, "id">) => void;
  onRemoveItem: (index: number, id?: string) => void;
  onUpdateItem: (index: number, field: string, value: string | number) => void;
}

export default function QuoteBuilder({
  lineItems,
  vatPercent,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: QuoteBuilderProps) {
  const [showProductSearch, setShowProductSearch] = useState(false);

  function handleAddCustomLine() {
    onAddItem({
      product_id: null,
      description: "",
      quantity: 1,
      unit_price: 0,
      unit: "each",
      manufacturer_name: null,
      product_code: null,
      notes: null,
      sort_order: lineItems.length,
    });
  }

  function handleProductSelect(product: any) {
    onAddItem({
      product_id: product.id,
      description: product.product_name,
      quantity: 1,
      unit_price: product.sell_price || product.list_price || 0,
      unit: product.unit || "each",
      manufacturer_name: product.manufacturers?.name || product.manufacturer_name || null,
      product_code: product.product_code || null,
      notes: null,
      sort_order: lineItems.length,
    });
  }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Line Items ({lineItems.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProductSearch(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              <Search size={14} />
              Add Product
            </button>
            <button
              onClick={handleAddCustomLine}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              <Plus size={14} />
              Custom Line
            </button>
          </div>
        </div>

        {lineItems.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-10" style={{ fontFamily: "var(--font-ibm-plex)" }}>#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Description</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24" style={{ fontFamily: "var(--font-ibm-plex)" }}>Qty</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24" style={{ fontFamily: "var(--font-ibm-plex)" }}>Unit</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28" style={{ fontFamily: "var(--font-ibm-plex)" }}>Unit Price</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28" style={{ fontFamily: "var(--font-ibm-plex)" }}>Total</th>
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <QuoteLineItemRow
                  key={item.id || `new-${idx}`}
                  index={idx}
                  item={item}
                  onUpdate={(field, value) => onUpdateItem(idx, field, value)}
                  onRemove={() => onRemoveItem(idx, item.id)}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No line items yet — add a product or custom line
            </p>
          </div>
        )}
      </div>

      <QuoteTotals lineItems={lineItems} vatPercent={vatPercent} />

      <ProductSearchModal
        open={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onSelect={handleProductSelect}
      />
    </div>
  );
}
