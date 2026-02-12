"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface RequestSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { supplier_name: string; supplier_website: string; reason: string }) => void;
}

export default function RequestSupplierModal({ open, onClose, onSubmit }: RequestSupplierModalProps) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [reason, setReason] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ supplier_name: name, supplier_website: website, reason });
    setName("");
    setWebsite("");
    setReason("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Request New Supplier
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Supplier Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
              placeholder="e.g. Quelfire"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
              placeholder="https://quelfire.co.uk"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 resize-none"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
              placeholder="Why should we add this supplier?"
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:opacity-90 transition"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
}
