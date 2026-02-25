"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Search, Factory } from "lucide-react";
import ManufacturerCard from "@/components/ManufacturerCard";

const fontInter = { fontFamily: "var(--font-inter)" };

export default function ManufacturersPage() {
  const router = useRouter();
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadManufacturers();
  }, [search]);

  async function loadManufacturers() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const params = new URLSearchParams();
    if (search) params.set("search", search);

    const res = await fetch(`/api/manufacturers?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setManufacturers(data.manufacturers || []);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Factory size={20} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Manufacturers</h1>
              <p className="text-xs text-gray-500">{manufacturers.length} manufacturer{manufacturers.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/manufacturers/new")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
          >
            <Plus size={16} />
            Add Manufacturer
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search manufacturers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-gray-400"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">No manufacturers found</p>
            <p className="text-sm text-gray-400">Add your first manufacturer to start building your product catalog</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {manufacturers.map((m) => (
              <ManufacturerCard
                key={m.id}
                manufacturer={m}
                onClick={() => router.push(`/manufacturers/${m.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
