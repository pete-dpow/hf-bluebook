"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, CheckCircle, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/lib/supabase";

const fontInter = "var(--font-inter), ui-sans-serif, system-ui, sans-serif";

interface BulkImportModalProps {
  manufacturerId: string;
  manufacturerName: string;
  onClose: () => void;
  onComplete: () => void;
}

type Step = "upload" | "mapping" | "importing" | "done";

interface PreviewData {
  columns: string[];
  suggested_mapping: Record<string, string>;
  total_rows: number;
  sample_rows: string[][];
  estimated_new: number;
  estimated_update: number;
}

interface ImportResult {
  created: number;
  updated: number;
  total_rows: number;
  errors?: string[];
}

const FIELD_OPTIONS = [
  { value: "skip", label: "— Skip —" },
  { value: "product_name", label: "Product Name *" },
  { value: "product_code", label: "Product Code" },
  { value: "description", label: "Description" },
  { value: "pillar", label: "Pillar / Category" },
  { value: "list_price", label: "List Price" },
  { value: "trade_price", label: "Trade Price" },
  { value: "sell_price", label: "Sell Price" },
  { value: "unit", label: "Unit" },
  { value: "lead_time_days", label: "Lead Time (days)" },
  { value: "certifications", label: "Certifications" },
];

export default function BulkImportModal({ manufacturerId, manufacturerName, onClose, onComplete }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(selectedFile: File) {
    setFile(selectedFile);
    setError(null);
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not authenticated"); setLoading(false); return; }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("dry_run", "true");

    const res = await fetch(`/api/manufacturers/${manufacturerId}/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to parse file");
      setLoading(false);
      return;
    }

    const data: PreviewData = await res.json();
    setPreview(data);
    setMapping(data.suggested_mapping);
    setStep("mapping");
    setLoading(false);
  }

  async function handleImport() {
    if (!file || !preview) return;

    // Validate mapping has product_name
    const hasName = Object.values(mapping).includes("product_name");
    if (!hasName) {
      setError("You must map at least one column to 'Product Name'");
      return;
    }

    setError(null);
    setLoading(true);
    setStep("importing");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Not authenticated"); setLoading(false); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    const res = await fetch(`/api/manufacturers/${manufacturerId}/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Import failed");
      setStep("mapping");
      return;
    }

    setResult(data);
    setStep("done");
  }

  function updateMapping(column: string, field: string) {
    setMapping((prev) => ({ ...prev, [column]: field }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" style={{ fontFamily: fontInter }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Import Products</h2>
            <p className="text-xs text-gray-500 mt-0.5">{manufacturerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition cursor-pointer"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFileUpload(f);
                }}
              >
                {loading ? (
                  <Loader2 size={32} className="mx-auto text-blue-500 animate-spin mb-3" />
                ) : (
                  <FileSpreadsheet size={32} className="mx-auto text-gray-400 mb-3" />
                )}
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {loading ? "Parsing file..." : "Drop a CSV or Excel file here"}
                </p>
                <p className="text-xs text-gray-400">
                  Supports .csv, .xlsx, .xls
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === "mapping" && preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span><strong>{preview.total_rows}</strong> rows found</span>
                <span className="text-green-600"><strong>{preview.estimated_new}</strong> new</span>
                <span className="text-blue-600"><strong>{preview.estimated_update}</strong> updates</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Map columns to product fields</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">CSV Column</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Sample Data</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Maps To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.columns.map((col, idx) => {
                        const currentMapping = mapping[col] || "skip";
                        const isSpec = currentMapping.startsWith("spec:");
                        return (
                          <tr key={col} className="border-b border-gray-100">
                            <td className="px-3 py-2 text-xs font-medium text-gray-700">{col}</td>
                            <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[150px]">
                              {preview.sample_rows[0]?.[idx] || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={isSpec ? "spec" : currentMapping}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === "spec") {
                                    updateMapping(col, `spec:${col}`);
                                  } else {
                                    updateMapping(col, val);
                                  }
                                }}
                                className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:border-blue-400"
                              >
                                {FIELD_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                                <option value="spec">Specification field</option>
                              </select>
                              {isSpec && (
                                <input
                                  type="text"
                                  value={currentMapping.slice(5)}
                                  onChange={(e) => updateMapping(col, `spec:${e.target.value}`)}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 w-full mt-1 focus:outline-none focus:border-blue-400"
                                  placeholder="Specification key name"
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Data Preview */}
              {preview.sample_rows.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Data preview (first {Math.min(preview.sample_rows.length, 3)} rows)</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="text-xs w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {preview.columns.map((col) => (
                            <th key={col} className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sample_rows.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            {preview.columns.map((col, j) => (
                              <td key={j} className="px-2 py-1.5 text-gray-600 truncate max-w-[120px]">{row[j] || ""}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Importing */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-700">Importing {preview?.total_rows} products...</p>
              <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
            </div>
          )}

          {/* Step 4: Done */}
          {step === "done" && result && (
            <div className="py-8">
              <div className="flex flex-col items-center mb-6">
                <CheckCircle size={40} className="text-green-500 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{result.created}</div>
                  <div className="text-xs text-green-600">Created</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{result.updated}</div>
                  <div className="text-xs text-blue-600">Updated</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-700">{result.total_rows}</div>
                  <div className="text-xs text-gray-500">Total Rows</div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3 mt-4">
                  <p className="text-xs font-medium text-amber-700 mb-2">{result.errors.length} warnings:</p>
                  <div className="text-xs text-amber-600 max-h-32 overflow-y-auto space-y-0.5">
                    {result.errors.map((e, i) => (
                      <p key={i}>{e}</p>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 text-center mt-4">
                All imported products are marked as &ldquo;Needs Review&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          {step === "mapping" && (
            <>
              <button
                onClick={() => { setStep("upload"); setFile(null); setPreview(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Import {preview?.total_rows} Products
              </button>
            </>
          )}
          {step === "done" && (
            <button
              onClick={() => { onComplete(); onClose(); }}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              Done
            </button>
          )}
          {step === "upload" && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
