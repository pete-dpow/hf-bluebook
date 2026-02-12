"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Scroll, Plus } from "lucide-react";
import GoldenThreadPackageCard from "@/components/GoldenThreadPackageCard";
import GoldenThreadModal from "@/components/GoldenThreadModal";

export default function GoldenThreadPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPackages();
  }, [page]);

  async function loadPackages() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    const res = await fetch(`/api/golden-thread/packages?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setPackages(data.packages || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }

  async function handleGenerate(options: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setGenerating(true);
    const res = await fetch("/api/golden-thread/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (res.ok) {
      const data = await res.json();
      setShowModal(false);
      router.push(`/golden-thread/${data.package.id}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to generate package");
    }
    setGenerating(false);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Golden Thread
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              BSA 2022 compliant handover packages — {total} package{total !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            <Plus size={16} />
            New Package
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16">
            <Scroll size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No packages yet
            </p>
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Generate your first Golden Thread handover package
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <GoldenThreadPackageCard
                key={pkg.id}
                pkg={pkg}
                onClick={() => router.push(`/golden-thread/${pkg.id}`)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Previous
            </button>
            <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <GoldenThreadModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
        generating={generating}
      />
    </div>
  );
}
