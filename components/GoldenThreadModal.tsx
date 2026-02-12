"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Loader2 } from "lucide-react";

interface GoldenThreadModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (options: {
    project_id: string;
    building_reference: string;
    export_format: string;
    include_photos: boolean;
    include_certificates: boolean;
    client_branding: boolean;
    notes: string;
  }) => void;
  generating: boolean;
}

export default function GoldenThreadModal({ open, onClose, onGenerate, generating }: GoldenThreadModalProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [buildingRef, setBuildingRef] = useState("");
  const [exportFormat, setExportFormat] = useState("all");
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeCerts, setIncludeCerts] = useState(true);
  const [clientBranding, setClientBranding] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) loadProjects();
  }, [open]);

  async function loadProjects() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Use the supabase client directly — projects belong to org via RLS
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .order("name");

    setProjects(data || []);
    setLoading(false);
  }

  function handleSubmit() {
    if (!projectId) {
      alert("Select a project");
      return;
    }
    onGenerate({
      project_id: projectId,
      building_reference: buildingRef,
      export_format: exportFormat,
      include_photos: includePhotos,
      include_certificates: includeCerts,
      client_branding: clientBranding,
      notes,
    });
  }

  if (!open) return null;

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400";
  const labelClass = "block text-sm text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Generate Golden Thread Package
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          <div>
            <label className={labelClass}>Project *</label>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className={labelClass}>Building Reference</label>
            <input
              type="text"
              value={buildingRef}
              onChange={(e) => setBuildingRef(e.target.value)}
              className={inputClass}
              placeholder="e.g. HRB-2024-001"
            />
            <p className="text-xs text-gray-400 mt-1">For higher-risk building identification (BSA 2022)</p>
          </div>

          <div>
            <label className={labelClass}>Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className={inputClass}
            >
              <option value="all">All Formats (JSON + PDF + CSV)</option>
              <option value="json">JSON only</option>
              <option value="pdf">PDF only</option>
              <option value="csv">CSV only</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include photos
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCerts}
                onChange={(e) => setIncludeCerts(e.target.checked)}
                className="rounded border-gray-300"
              />
              Include certificates
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={clientBranding}
                onChange={(e) => setClientBranding(e.target.checked)}
                className="rounded border-gray-300"
              />
              Client branding on PDF
            </label>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              rows={2}
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={generating || !projectId}
            className="px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </span>
            ) : (
              "Generate Package"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
