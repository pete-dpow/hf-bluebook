"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Product {
  id: string;
  product_name: string;
  product_code?: string;
  sell_price?: number;
  list_price?: number;
  unit?: string;
  manufacturers?: { name: string };
  manufacturer_name?: string;
}

interface ProductSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

export default function ProductSearchModal({ open, onClose, onSelect }: ProductSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/products/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.products || []);
      }
      setLoading(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Search Products
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product name, code..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    onSelect(product);
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                        {product.product_name}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                        {[product.product_code, product.manufacturers?.name || product.manufacturer_name].filter(Boolean).join(" — ")}
                      </div>
                    </div>
                    {(product.sell_price || product.list_price) && (
                      <span className="text-sm text-gray-600 ml-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                        £{(product.sell_price || product.list_price || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                No products found
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                Start typing to search products
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
