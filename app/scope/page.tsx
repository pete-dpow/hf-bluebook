"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { IfcImporter } from "@thatopen/fragments";

export default function ScopePage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Mouse tracking for gradient
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const ifcFile = files.find((f) => f.name.toLowerCase().endsWith(".ifc"));

    if (ifcFile) {
      handleFileUpload(ifcFile);
    } else {
      setError("Please upload an IFC file (.ifc)");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    },
    []
  );

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setError("");
    setSuccess("");
    setUploadStatus("Reading file...");

    try {
      const arrayBuffer = await file.arrayBuffer();

      setUploadStatus("Converting IFC to Fragment...");
      
      const serializer = new IfcImporter();
      serializer.wasm = {
        absolute: true,
        path: "https://unpkg.com/web-ifc@0.0.72/"
      };

      const fragmentData = await serializer.process({
        bytes: new Uint8Array(arrayBuffer),
        progressCallback: (progress) => {
          setUploadStatus(`Converting... ${Math.round(progress * 100)}%`);
        }
      });

      const uint8 = new Uint8Array(fragmentData);
      const base64 = btoa(Array.from(uint8, byte => String.fromCharCode(byte)).join(''));

      localStorage.setItem("dpow_scope_fragment", JSON.stringify({
        data: base64,
        fileName: file.name,
        timestamp: Date.now()
      }));

      localStorage.setItem("uploadedModelName", file.name.replace(".ifc", ""));

      setSuccess(`✅ ${file.name} uploaded successfully. Redirecting to viewer...`);

      setTimeout(() => {
        router.push("/scope/viewer");
      }, 1500);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload IFC file");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#FCFCFA" }}
    >
      {/* Animated gradient following mouse - Purple theme */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(139,92,246,0.15), transparent 75%)`,
        }}
      />

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
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
            dpow.scope
          </h1>
          <p
            className="text-lg"
            style={{
              fontFamily: "var(--font-ibm-plex)",
              color: "#4B4B4B",
              letterSpacing: "-0.01em",
            }}
          >
            Visual Intelligence and Scope Mapping (2D + 3D)
          </p>
          <p
            className="text-sm mt-2"
            style={{
              fontFamily: "var(--font-ibm-plex)",
              color: "#6B7280",
            }}
          >
            Upload IFC models for 3D visualization, 2D sections, and scope markup
          </p>
        </div>

        {/* Upload Card - matches dpow.chat structure */}
        <div 
          className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
            isDragging ? "border-[#8B5CF6] bg-[#8B5CF6]/5" : "border-[#E5E7EB]"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="p-8">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".ifc"
              onChange={handleFileSelect}
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="flex flex-col items-center py-8">
                <Loader2
                  className="w-16 h-16 text-[#8B5CF6] animate-spin mb-6"
                />
                <p
                  className="text-lg font-medium"
                  style={{
                    fontFamily: "var(--font-ibm-plex)",
                    color: "#2A2A2A",
                  }}
                >
                  {uploadStatus || "Processing..."}
                </p>
              </div>
            ) : (
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer py-8"
              >
                {/* 3D Cube Icon - Purple */}
                <div className="mb-6">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={isDragging ? "opacity-100" : "opacity-60"}
                  >
                    <path
                      d="M40 8L68 24V56L40 72L12 56V24L40 8Z"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                      fill="none"
                    />
                    <path
                      d="M40 8L40 40M40 40L68 24M40 40L12 24M40 40V72"
                      stroke="#8B5CF6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <h2
                  className="text-xl font-medium mb-2"
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 500,
                    color: "#2A2A2A",
                  }}
                >
                  Drop your IFC model here, or click to browse
                </h2>
                <p
                  className="text-sm mb-6"
                  style={{
                    fontFamily: "var(--font-ibm-plex)",
                    color: "#9CA3AF",
                  }}
                >
                  .ifc files only • Max 100MB
                </p>
                <button
                  type="button"
                  className="px-5 py-2 bg-[#8B5CF6] text-white font-medium rounded-lg hover:bg-[#7C3AED] transition-colors"
                  style={{ fontFamily: "var(--font-ibm-plex)" }}
                >
                  Choose File
                </button>
              </label>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mt-4 p-4 rounded-lg flex items-start gap-3"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
            }}
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-ibm-plex)",
                color: "#991B1B",
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            className="mt-4 p-4 rounded-lg flex items-start gap-3"
            style={{
              background: "#F0FDF4",
              border: "1px solid #86EFAC",
            }}
          >
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-ibm-plex)",
                color: "#166534",
              }}
            >
              {success}
            </p>
          </div>
        )}

        {/* Help Text - matches dpow.chat structure */}
        <div
          className="mt-8 text-center text-sm"
          style={{
            fontFamily: "var(--font-ibm-plex)",
            color: "#4B4B4B",
          }}
        >
          <p className="mb-2">
            View your model in 3D, section into 2D plans, and mark up scope areas in color
          </p>
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Color markup zones link to TIDP deliverables •
            &ldquo;Where is this?&rdquo; answered visually in the model
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p
            className="text-xs"
            style={{
              fontFamily: "var(--font-ibm-plex)",
              color: "#9CA3AF",
            }}
          >
            Part of the{" "}
            <a
              href="https://www.dpow.ai"
              style={{ color: "#8B5CF6", textDecoration: "none" }}
            >
              dpow.ai
            </a>{" "}
            ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
