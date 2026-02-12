"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

export default function Home() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const throttleMs = 16;

    const handleMouseMove = (e: MouseEvent) => {
      const currentTime = Date.now();
      if (currentTime - lastTime < throttleMs) return;
      lastTime = currentTime;

      rafId = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;
        setMousePos({ x, y });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const parseFile = useCallback(
    (file: File) => {
      setError("");

      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be under 5 MB");
        return;
      }

      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv"].includes(extension || "")) {
        setError("Only .xlsx, .xls, and .csv files are supported");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (jsonData.length === 0) {
            setError("File is empty");
            return;
          }

          localStorage.setItem("uploadedData", JSON.stringify(jsonData));
          localStorage.setItem("uploadedFileName", file.name);
          router.push("/preview");
        } catch (err) {
          setError("Failed to parse file. Please check the format.");
        }
      };

      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
      };

      reader.readAsBinaryString(file);
    },
    [router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        parseFile(file);
      }
    },
    [parseFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        parseFile(file);
      }
    },
    [parseFile]
  );

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" 
      style={{ background: '#FCFCFA' }}
    >
      {/* Animated gradient following mouse */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(16, 185, 129, 0.15), transparent 75%)`,
        }}
      />

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-6xl md:text-7xl mb-3" 
            style={{ 
              fontFamily: 'var(--font-cormorant)', 
              fontWeight: 500, 
              letterSpacing: '0.01em', 
              color: '#2A2A2A' 
            }}
          >
            hf.bluebook
          </h1>
          <p
            className="text-lg"
            style={{
              fontFamily: 'var(--font-ibm-plex)',
              color: '#4B4B4B',
              letterSpacing: '-0.01em'
            }}
          >
            Report Generator
          </p>
          <p
            className="text-sm mt-2"
            style={{
              fontFamily: 'var(--font-ibm-plex)',
              color: '#6B7280'
            }}
          >
            Automated summaries of progress, revisions, and project insights
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`bg-white rounded-xl p-16 transition-all cursor-pointer shadow-sm ${
            isDragging
              ? "border-2 border-[#10B981] bg-[#10B981]/5"
              : "border border-[#E5E7EB] hover:border-[#10B981]/40 hover:shadow-md"
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center cursor-pointer"
          >
            {/* Upload Icon */}
            <div className="mb-6">
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={isDragging ? "text-[#10B981]" : "text-gray-400"}
              >
                <path
                  d="M40 15V50M40 15L50 25M40 15L30 25"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 50V60C20 62.7614 22.2386 65 25 65H55C57.7614 65 60 62.7614 60 60V50"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Upload Text */}
            <p 
              className="text-lg font-medium mb-2" 
              style={{ 
                fontFamily: 'var(--font-ibm-plex)', 
                color: '#2A2A2A' 
              }}
            >
              Drop your TIDP Excel file here, or click to browse
            </p>
            <p 
              className="text-sm mb-6" 
              style={{ 
                fontFamily: 'var(--font-ibm-plex)', 
                color: '#6B7280' 
              }}
            >
              .xlsx, .xls, or .csv files only • Max 5MB
            </p>

            {/* CTA Button */}
            <span 
              className="px-7 py-3 text-white font-medium rounded-lg transition-all hover:opacity-90 hover:shadow-lg inline-block" 
              style={{ 
                fontFamily: 'var(--font-ibm-plex)', 
                background: '#10B981',
                fontSize: '15px'
              }}
            >
              Choose File
            </span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="mt-4 p-4 rounded-lg" 
            style={{ 
              background: '#FEF2F2', 
              border: '1px solid #FCA5A5' 
            }}
          >
            <p 
              className="text-sm font-medium" 
              style={{ 
                fontFamily: 'var(--font-ibm-plex)', 
                color: '#991B1B' 
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* Help Text */}
        <div 
          className="mt-8 text-center space-y-3" 
          style={{ 
            fontFamily: 'var(--font-ibm-plex)' 
          }}
        >
          <p 
            className="text-sm" 
            style={{ color: '#4B4B4B' }}
          >
            Analyses structured TIDP or deliverable-schedule data and produces automated text summaries
          </p>
          <p 
            className="text-xs" 
            style={{ color: '#9CA3AF' }}
          >
            Acts as the intelligence layer between raw spreadsheets and readable project insights • 
            Column mapping happens in the next step
          </p>
        </div>
      </div>
    </div>
  );
}
