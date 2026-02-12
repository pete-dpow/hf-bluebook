"use client";

import { FileText } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-gray-100 text-gray-400",
};

interface QuoteTableRowProps {
  quote: {
    id: string;
    quote_number: string;
    client_name: string;
    project_name?: string | null;
    status: string;
    total: number;
    updated_at: string;
    quote_line_items?: { count: number }[];
  };
  onClick: () => void;
}

export default function QuoteTableRow({ quote, onClick }: QuoteTableRowProps) {
  const date = new Date(quote.updated_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <tr
      onClick={onClick}
      className="hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {quote.quote_number}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {quote.client_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {quote.project_name || "—"}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${STATUS_COLORS[quote.status] || "bg-gray-100 text-gray-600"}`}>
          {quote.status}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 text-right" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        £{(quote.total || 0).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {date}
      </td>
    </tr>
  );
}
