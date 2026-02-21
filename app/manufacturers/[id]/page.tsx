"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Play, Globe, Trash2, Pencil, Check, X } from "lucide-react";
import ScraperProgress from "@/components/ScraperProgress";

export default function ManufacturerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [manufacturer, setManufacturer] = useState<any>(null);
  const [scrapeJobs, setScrapeJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  useEffect(() => {
    loadManufacturer();
  }, [params.id]);

  async function loadManufacturer() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const res = await fetch(`/api/manufacturers/${params.id}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setManufacturer(data.manufacturer);
    }

    // Load scrape jobs
    const { data: jobs } = await supabase
      .from("scrape_jobs")
      .select("*")
      .eq("manufacturer_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5);

    setScrapeJobs(jobs || []);
    setLoading(false);
  }

  async function triggerScrape() {
    setScraping(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/manufacturers/${params.id}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ scrape_type: "full" }),
    });

    if (res.ok) {
      await loadManufacturer();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to start scrape");
    }
    setScraping(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${manufacturer?.name}? This will archive the manufacturer and all its products.`)) return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/manufacturers/${params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      router.push("/library");
    } else {
      const err = await res.json();
      alert(err.error || "Failed to delete");
      setDeleting(false);
    }
  }

  async function saveUrl() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/manufacturers/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ website_url: urlDraft }),
    });

    setEditingUrl(false);
    await loadManufacturer();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!manufacturer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <p className="text-gray-500">Manufacturer not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/manufacturers")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          <ArrowLeft size={16} />
          All Manufacturers
        </button>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              {manufacturer.name}
            </h1>
            <div className="flex items-center gap-1 mt-1">
              <Globe size={14} className="text-gray-400 flex-shrink-0" />
              {editingUrl ? (
                <div className="flex items-center gap-1">
                  <input
                    type="url"
                    value={urlDraft}
                    onChange={(e) => setUrlDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveUrl(); if (e.key === "Escape") setEditingUrl(false); }}
                    className="px-2 py-0.5 border border-blue-300 rounded text-sm focus:outline-none focus:border-blue-500 w-80"
                    style={{ fontFamily: "var(--font-ibm-plex)" }}
                    autoFocus
                    placeholder="https://..."
                  />
                  <button onClick={saveUrl} className="p-0.5 text-green-600 hover:text-green-700"><Check size={14} /></button>
                  <button onClick={() => setEditingUrl(false)} className="p-0.5 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {manufacturer.website_url ? (
                    <a
                      href={manufacturer.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                      style={{ fontFamily: "var(--font-ibm-plex)" }}
                    >
                      {manufacturer.website_url}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>No URL set</span>
                  )}
                  <button
                    onClick={() => { setUrlDraft(manufacturer.website_url || ""); setEditingUrl(true); }}
                    className="p-0.5 text-gray-400 hover:text-blue-600 transition"
                    title="Edit URL"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {scraping ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              Scrape Products
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 text-sm font-medium rounded-lg hover:bg-red-50 transition disabled:opacity-50"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Delete
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Contact Details
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <div>
              <span className="text-gray-500">Name</span>
              <p className="text-gray-900">{manufacturer.contact_name || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="text-gray-900">{manufacturer.contact_email || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone</span>
              <p className="text-gray-900">{manufacturer.contact_phone || "—"}</p>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Products ({manufacturer.products?.length || 0})
            </h2>
            <button
              onClick={() => router.push(`/products/new?manufacturer=${params.id}`)}
              className="text-sm text-blue-600 hover:underline"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Add Product
            </button>
          </div>
          {manufacturer.products?.length > 0 ? (
            <div className="space-y-2">
              {manufacturer.products.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {p.product_name}
                    </span>
                    {p.product_code && (
                      <span className="ml-2 text-xs text-gray-500">{p.product_code}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{p.pillar}</span>
                    {p.needs_review && (
                      <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-700 rounded-full">Review</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No products yet. Scrape or add manually.
            </p>
          )}
        </div>

        {/* Scrape Jobs */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Scrape History
          </h2>
          {scrapeJobs.length > 0 ? (
            <div className="space-y-3">
              {scrapeJobs.map((job) => (
                <ScraperProgress key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No scrape jobs yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
