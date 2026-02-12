"use client";

import { Factory, Globe, Clock, ChevronRight } from "lucide-react";

interface ManufacturerCardProps {
  manufacturer: {
    id: string;
    name: string;
    website_url?: string;
    contact_name?: string;
    is_active: boolean;
    last_scraped_at?: string;
    products?: { count: number }[];
  };
  onClick: () => void;
}

export default function ManufacturerCard({ manufacturer, onClick }: ManufacturerCardProps) {
  const productCount = manufacturer.products?.[0]?.count || 0;

  return (
    <button
      onClick={onClick}
      className="w-full p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Factory size={20} className="text-blue-600" />
          </div>
          <div>
            <h3
              className="text-base font-medium text-gray-900"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {manufacturer.name}
            </h3>
            {manufacturer.website_url && (
              <div className="flex items-center gap-1 mt-0.5">
                <Globe size={12} className="text-gray-400" />
                <span className="text-xs text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                  {manufacturer.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </span>
              </div>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-400 mt-1" />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        <span className="px-2 py-0.5 bg-gray-100 rounded-full">
          {productCount} {productCount === 1 ? "product" : "products"}
        </span>
        {manufacturer.last_scraped_at && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Scraped {new Date(manufacturer.last_scraped_at).toLocaleDateString("en-GB")}
          </span>
        )}
        {!manufacturer.is_active && (
          <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full">Inactive</span>
        )}
      </div>
    </button>
  );
}
