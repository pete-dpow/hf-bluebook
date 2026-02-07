"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Loader2 } from "lucide-react";
import VoiceInput from "@/components/VoiceInput";
import ChatDrawerWrapper from "@/components/ChatDrawerWrapper";

export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setSuccess("");
    setIsUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      setError("Only .xlsx, .xls, or .csv files are supported");
      setIsUploading(false);
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      if (!rows.length) throw new Error("Empty file");
      const structured = {
        totalRows: rows.length,
        totalColumns: rows[0]?.length || 0,
        rows,
        fileName: file.name,
      };
      localStorage.setItem("uploadedData", JSON.stringify(structured));
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-excel", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      console.log("✅ Uploaded to backend:", result);
      setSuccess(`${file.name} uploaded successfully with ${structured.totalRows} rows.`);
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      setError(`Failed to upload: ${err.message || "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    localStorage.setItem("userMessage", message);
    router.push("/chat");
  }, [message, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#FCFCFA" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(37,99,235,0.15), transparent 75%)`,
        }}
      />

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <h1
            className="text-6xl md:text-7xl mb-3"
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 500,
              letterSpacing: "0.01em",
              color: "#2A2A2A",
            }}
          >
            dpow.chat
          </h1>
          <p className="text-lg" style={{ fontFamily: "var(--font-ibm-plex)", color: "#4B4B4B" }}>
            Structured Intelligence for Project Delivery
          </p>
          <p className="text-sm mt-2" style={{ fontFamily: "var(--font-ibm-plex)", color: "#6B7280" }}>
            Conversational AI assistant for directors — ask, reason, report
          </p>
        </div>

        {/* Upload + Message UI */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden">
          <div className="p-6 border-b border-[#E5E7EB]">
            <div className="flex gap-2">
              <textarea
                placeholder="How can dpow.chat help you today?"
                className="w-full resize-none outline-none text-base"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  color: "#2A2A2A",
                  minHeight: "120px",
                }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="flex items-end pb-1">
                <VoiceInput onTranscript={(text) => setMessage(text)} />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-[#FCFCFA] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
              />
              <label
                htmlFor="file-upload"
                className="p-2 hover:bg-white rounded-lg cursor-pointer"
                title="Attach file"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 4V14M10 4L13 7M10 4L7 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 14V16C4 17.1046 4.89543 18 6 18H14C15.1046 18 16 17.1046 16 16V14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </label>
              <span className="text-xs text-gray-500">.xlsx, .xls, or .csv • max 5 MB</span>
              <button
                onClick={() => router.push("/chat")}
                className="ml-4 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Connect Microsoft 365
              </button>
            </div>
            <button
              onClick={handleSend}
              className="px-5 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:opacity-90 transition disabled:opacity-50"
              disabled={!message.trim()}
            >
              Send
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {success}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Your file should contain at least 4 columns for: Category, Revision, Status and Comments.</p>
          <p className="text-xs text-gray-400">
            Supported: .xlsx, .xls, .csv • Columns auto-detected or mapped manually.
          </p>
        </div>
      </div>

      {/* ✅ Centered floating chat drawer */}
      <ChatDrawerWrapper />
    </div>
  );
}
