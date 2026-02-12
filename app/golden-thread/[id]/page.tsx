"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Loader2, Download, CheckCircle2, AlertCircle, FileJson, FileText, Table } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  processing: "bg-blue-50 text-blue-700",
  complete: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-600",
  delivered: "bg-purple-50 text-purple-700",
};

const FORMAT_ICONS: Record<string, any> = {
  json: FileJson,
  pdf: FileText,
  csv: Table,
};

export default function GoldenThreadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [pkg, setPkg] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackage();
  }, [params.id]);

  async function loadPackage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const [pkgRes, auditRes] = await Promise.all([
      fetch(`/api/golden-thread/packages/${params.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
      fetch(`/api/golden-thread/packages/${params.id}/audit`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
    ]);

    if (pkgRes.ok) {
      const data = await pkgRes.json();
      setPkg(data.package);
    }
    if (auditRes.ok) {
      const data = await auditRes.json();
      setAuditTrail(data.audit_trail || []);
    }
    setLoading(false);
  }

  async function handleDownload(format: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/golden-thread/packages/${params.id}/download?format=${format}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "csv" ? "zip" : format;
      a.download = `${pkg?.package_reference || "package"}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const err = await res.json();
      alert(err.error || "Download failed");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <p className="text-gray-500">Package not found</p>
      </div>
    );
  }

  const exportFiles = pkg.export_files || [];
  const sizeKb = pkg.file_size_bytes ? Math.round(pkg.file_size_bytes / 1024) : 0;

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/golden-thread")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          <ArrowLeft size={16} />
          All Packages
        </button>

        <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
          {pkg.package_reference}
        </h1>

        <div className="flex items-center gap-3 mb-8">
          <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${STATUS_COLORS[pkg.status] || "bg-gray-100 text-gray-600"}`}>
            {pkg.status}
          </span>
          {pkg.building_reference && (
            <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Building: {pkg.building_reference}
            </span>
          )}
        </div>

        {/* Compliance Status */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            BSA 2022 Compliance
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              {pkg.section_88_compliant ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <AlertCircle size={20} className="text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                  Section 88
                </p>
                <p className="text-xs text-gray-500">{pkg.section_88_compliant ? "Compliant" : "Incomplete"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pkg.section_91_compliant ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <AlertCircle size={20} className="text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                  Section 91
                </p>
                <p className="text-xs text-gray-500">{pkg.section_91_compliant ? "Compliant" : "Incomplete"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pkg.audit_trail_complete ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <AlertCircle size={20} className="text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                  Audit Trail
                </p>
                <p className="text-xs text-gray-500">{pkg.audit_trail_complete ? "Complete" : "Incomplete"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Files */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Exports
            </h2>
            {sizeKb > 0 && (
              <span className="text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                {sizeKb}KB total
              </span>
            )}
          </div>

          {pkg.status === "processing" ? (
            <div className="flex items-center gap-3 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                Generating exports — this may take a moment...
              </p>
            </div>
          ) : exportFiles.length === 0 ? (
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No exports available
            </p>
          ) : (
            <div className="space-y-2">
              {exportFiles.map((file: any, i: number) => {
                const Icon = FORMAT_ICONS[file.format] || FileText;
                return (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                          {file.file_name}
                        </p>
                        <p className="text-xs text-gray-400">{file.format.toUpperCase()}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(file.format)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                      style={{ fontFamily: "var(--font-ibm-plex)" }}
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Package Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Details
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            <div>
              <span className="text-gray-500">Created</span>
              <p className="text-gray-900">
                {new Date(pkg.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Format</span>
              <p className="text-gray-900 uppercase">{pkg.export_format || "all"}</p>
            </div>
            <div>
              <span className="text-gray-500">Options</span>
              <p className="text-gray-900">
                {[
                  pkg.include_photos && "Photos",
                  pkg.include_certificates && "Certs",
                  pkg.client_branding && "Branded",
                ].filter(Boolean).join(", ") || "—"}
              </p>
            </div>
          </div>
          {pkg.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">Notes</span>
              <p className="text-sm text-gray-900 mt-1">{pkg.notes}</p>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-base font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Audit Trail ({auditTrail.length})
            </h2>
          </div>
          {auditTrail.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                No audit entries yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {auditTrail.map((entry) => (
                <div key={entry.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-900 capitalize" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {entry.action}
                    </span>
                    {entry.details?.format && (
                      <span className="ml-2 text-xs text-gray-500">({entry.details.format})</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                    {new Date(entry.performed_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
