"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2, ShieldCheck, Search } from "lucide-react";

interface RegulationLinkModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (regulation: { id: string; name: string; reference: string; category: string }) => void;
  excludeIds?: string[];
}

export default function RegulationLinkModal({ open, onClose, onSelect, excludeIds = [] }: RegulationLinkModalProps) {
  const [regulations, setRegulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      loadRegulations();
    }
  }, [open, search]);

  async function loadRegulations() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("limit", "50");

    const res = await fetch(`/api/compliance?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setRegulations((data.regulations || []).filter((r: any) => !excludeIds.includes(r.id)));
    }
    setLoading(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Link Regulation
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search regulations..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : regulations.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No regulations found
            </p>
          ) : (
            <div className="space-y-1">
              {regulations.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 text-left transition"
                >
                  <ShieldCheck size={16} className="text-blue-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {r.name}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {r.reference}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
