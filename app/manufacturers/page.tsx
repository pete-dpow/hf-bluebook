"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Plus, Search } from "lucide-react";
import ManufacturerCard from "@/components/ManufacturerCard";

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
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
            Manufacturers
          </h1>
          <button
            onClick={() => router.push("/manufacturers/new")}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            <Plus size={16} />
            Add Manufacturer
          </button>
        </div>

        <div className="mb-6 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search manufacturers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-400"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : manufacturers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No manufacturers found
            </p>
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Add your first manufacturer to start building your product catalog
            </p>
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
