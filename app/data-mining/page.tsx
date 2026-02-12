"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Factory, RefreshCw } from "lucide-react";
import ScraperProgress from "@/components/ScraperProgress";
import RequestSupplierModal from "@/components/RequestSupplierModal";
import SupplierRequestCard from "@/components/SupplierRequestCard";

export default function DataMiningPage() {
  const router = useRouter();
  const [scrapeJobs, setScrapeJobs] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [supplierRequests, setSupplierRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const headers = { Authorization: `Bearer ${session.access_token}` };

    // Load manufacturers for quick-scrape buttons
    const mfgRes = await fetch("/api/manufacturers", { headers });
    if (mfgRes.ok) {
      const data = await mfgRes.json();
      setManufacturers(data.manufacturers || []);
    }

    // Load recent scrape jobs from Supabase directly
    const { data: jobs } = await supabase
      .from("scrape_jobs")
      .select("*, manufacturers(name)")
      .order("created_at", { ascending: false })
      .limit(20);

    setScrapeJobs(jobs || []);

    // Load supplier requests
    const srRes = await fetch("/api/supplier-requests", { headers });
    if (srRes.ok) {
      const data = await srRes.json();
      setSupplierRequests(data.requests || []);
    }

    // Check admin status via a lightweight call
    const { data: userData } = await supabase
      .from("users")
      .select("active_organization_id")
      .eq("id", session.user.id)
      .single();

    if (userData?.active_organization_id) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("organization_id", userData.active_organization_id)
        .single();

      setIsAdmin(membership?.role === "admin" || membership?.role === "owner");
    }

    setLoading(false);
  }

  async function triggerScrape(manufacturerId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/manufacturers/${manufacturerId}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ scrape_type: "full" }),
    });

    if (res.ok) {
      await loadData();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to start scrape");
    }
  }

  async function handleRequestSupplier(data: { supplier_name: string; supplier_website: string; reason: string }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch("/api/supplier-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    await loadData();
  }

  async function handleApproveRequest(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/supplier-requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status: "approved" }),
    });

    await loadData();
  }

  async function handleRejectRequest(id: string, reason: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/supplier-requests/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status: "rejected", rejected_reason: reason }),
    });

    await loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const runningJobs = scrapeJobs.filter((j) => j.status === "running" || j.status === "queued");
  const completedJobs = scrapeJobs.filter((j) => j.status === "completed" || j.status === "failed");

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Data Mining
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Scrape products from manufacturer websites
            </p>
          </div>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            Request New Supplier
          </button>
        </div>

        {/* Quick Scrape */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Manufacturers
          </h2>
          {manufacturers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {manufacturers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0">
                    <Factory size={16} className="text-gray-400 flex-shrink-0" />
                    <span
                      className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                      style={{ fontFamily: "var(--font-ibm-plex)" }}
                      onClick={() => router.push(`/manufacturers/${m.id}`)}
                    >
                      {m.name}
                    </span>
                  </div>
                  <button
                    onClick={() => triggerScrape(m.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition flex-shrink-0"
                    title="Start scrape"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No manufacturers yet.{" "}
              <button onClick={() => router.push("/manufacturers/new")} className="text-blue-600 hover:underline">
                Add one
              </button>
            </p>
          )}
        </div>

        {/* Active Jobs */}
        {runningJobs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Active Jobs ({runningJobs.length})
            </h2>
            <div className="space-y-3">
              {runningJobs.map((job) => (
                <div key={job.id}>
                  {job.manufacturers?.name && (
                    <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {job.manufacturers.name}
                    </p>
                  )}
                  <ScraperProgress job={job} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Jobs */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Scrape History
          </h2>
          {completedJobs.length > 0 ? (
            <div className="space-y-3">
              {completedJobs.map((job) => (
                <div key={job.id}>
                  {job.manufacturers?.name && (
                    <p className="text-xs text-gray-500 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {job.manufacturers.name}
                    </p>
                  )}
                  <ScraperProgress job={job} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No scrape jobs yet
            </p>
          )}
        </div>

        {/* Supplier Requests */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Supplier Requests
          </h2>
          {supplierRequests.length > 0 ? (
            <div className="space-y-3">
              {supplierRequests.map((req) => (
                <SupplierRequestCard
                  key={req.id}
                  request={req}
                  isAdmin={isAdmin}
                  onApprove={handleApproveRequest}
                  onReject={handleRejectRequest}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No supplier requests yet
            </p>
          )}
        </div>
      </div>

      <RequestSupplierModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSubmit={handleRequestSupplier}
      />
    </div>
  );
}
