"use client";

interface LineItem {
  quantity: number;
  unit_price: number;
}

interface QuoteTotalsProps {
  lineItems: LineItem[];
  vatPercent: number;
}

export default function QuoteTotals({ lineItems, vatPercent }: QuoteTotalsProps) {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );
  const vatAmount = subtotal * (vatPercent / 100);
  const total = subtotal + vatAmount;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
      <div className="space-y-2 max-w-xs ml-auto">
        <div className="flex justify-between text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          <span className="text-gray-500">Subtotal</span>
          <span className="text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          <span className="text-gray-500">VAT ({vatPercent}%)</span>
          <span className="text-gray-900">{formatCurrency(vatAmount)}</span>
        </div>
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between text-base font-medium" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return `£${value.toFixed(2)}`;
}
