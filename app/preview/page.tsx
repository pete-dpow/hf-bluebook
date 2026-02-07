"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Download, X, ChevronRight, Plus, Trash2, GripVertical } from "lucide-react";
import PremiumReportDrawer from "@/components/report/PremiumReportDrawer";

type Row = (string | number | null)[];

interface Slicer {
  column: string;
  value: string;
  availableValues: string[];
}

interface ReportSection {
  id: string;
  label: string;
  content: string;
}

interface ReportMeta {
  title: string;
  project: string;
  preparedBy: string;
  reportDateISO: string;
}

const analysisSteps = [
  "Parsing dataset",
  "Detecting slicers",
  "Interpreting Category / Status / Revision trends",
  "Extracting WHO / WHAT / WHEN / HOW",
  "Quantifying progress and risk",
  "Writing executive directive"
];

export default function Preview() {
  const router = useRouter();
  const [rawData, setRawData] = useState<Row[]>([]);
  const [headerRowNumber, setHeaderRowNumber] = useState(15);
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [generatedDate, setGeneratedDate] = useState<string>("");

  const [slicers, setSlicers] = useState<Slicer[]>([
    { column: "", value: "", availableValues: [] },
    { column: "", value: "", availableValues: [] },
    { column: "", value: "", availableValues: [] },
    { column: "", value: "", availableValues: [] },
  ]);

  const [summary, setSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const [summaryLabel, setSummaryLabel] = useState("");
  const [reportSections, setReportSections] = useState<ReportSection[]>([]);
  const [reportDrawerOpen, setReportDrawerOpen] = useState(false);
  const [premiumReportDrawerOpen, setPremiumReportDrawerOpen] = useState(false);
  const [showLabelAlert, setShowLabelAlert] = useState(false);
  const [reportMeta, setReportMeta] = useState<ReportMeta>({
    title: "Weekly Executive Report",
    project: "",
    preparedBy: "",
    reportDateISO: new Date().toISOString().split('T')[0]
  });

  const [directorQuestion, setDirectorQuestion] = useState("");
  const [queryAnswer, setQueryAnswer] = useState("");
  const [queryLabel, setQueryLabel] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const queryTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("uploadedData");
    if (!stored) {
      router.push("/");
      return;
    }

    const parsed: Row[] = JSON.parse(stored);
    if (parsed.length === 0) {
      router.push("/");
      return;
    }

    setRawData(parsed);
  }, [router]);

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

  useEffect(() => {
    if (rawData.length === 0) return;

    const headerIndex = headerRowNumber - 1;
    if (headerIndex >= rawData.length) return;

    const headerRow = rawData[headerIndex] as string[];
    const headerValues = headerRow.map((h, i) => String(h || `Column ${i + 1}`));
    const uniqueHeaders = Array.from(new Set(headerValues));

    setHeaders(uniqueHeaders);

    const dataRows = rawData.slice(headerIndex + 1);
    setAllRows(dataRows);
    setFilteredRows(dataRows);

    const findBestMatch = (keywords: string[]): string => {
      const lowerHeaders = uniqueHeaders.map(h => h.toLowerCase());
      for (const keyword of keywords) {
        const match = lowerHeaders.findIndex(h => h.includes(keyword));
        if (match !== -1) return uniqueHeaders[match];
      }
      return uniqueHeaders[0] || "";
    };

    const initialSlicers = [
      findBestMatch(["type", "category", "level", "floor"]) || uniqueHeaders[0] || "",
      findBestMatch(["revision", "discipline"]) || uniqueHeaders[1] || "",
      findBestMatch(["status", "state"]) || uniqueHeaders[2] || "",
      findBestMatch(["comment", "note", "remark"]) || uniqueHeaders[3] || "",
    ];

    setSlicers(initialSlicers.map(col => {
      const colIdx = uniqueHeaders.indexOf(col);
      const values = new Set<string>();
      dataRows.forEach(row => {
        const val = String(row[colIdx] || "");
        if (val) values.add(val);
      });
      return {
        column: col,
        value: "",
        availableValues: Array.from(values).sort(),
      };
    }));
  }, [rawData, headerRowNumber]);

  const handleSlicerColumnChange = (slicerIndex: number, newColumn: string) => {
    const colIdx = headers.indexOf(newColumn);
    const values = new Set<string>();
    allRows.forEach(row => {
      const val = String(row[colIdx] || "");
      if (val) values.add(val);
    });

    const newSlicers = [...slicers];
    newSlicers[slicerIndex] = {
      column: newColumn,
      value: "",
      availableValues: Array.from(values).sort(),
    };
    setSlicers(newSlicers);
  };

  const handleSlicerValueChange = (slicerIndex: number, newValue: string) => {
    const newSlicers = [...slicers];
    newSlicers[slicerIndex] = {
      ...newSlicers[slicerIndex],
      value: newValue,
    };
    setSlicers(newSlicers);
  };

  useEffect(() => {
    const activeFilters = slicers.filter(s => s.column && s.value);

    if (activeFilters.length === 0) {
      setFilteredRows(allRows);
      return;
    }

    const filtered = allRows.filter(row => {
      return activeFilters.every(filter => {
        const colIdx = headers.indexOf(filter.column);
        return String(row[colIdx] || "") === filter.value;
      });
    });

    setFilteredRows(filtered);
  }, [slicers, allRows, headers]);

  const handleGenerateSummary = async () => {
    const selectedColumns = slicers.filter(s => s.column);

    if (selectedColumns.length !== 4) {
      setError("Please select a column for all 4 slicers before generating summary.");
      return;
    }

    if (filteredRows.length === 0) {
      setError("No rows match your filter criteria.");
      return;
    }

    setIsGenerating(true);
    setCurrentStep(0);
    setError("");
    setSummary("");

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < analysisSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    try {
      const mappedData = filteredRows.map(row => {
        const obj: any = {};
        slicers.forEach(slicer => {
          if (slicer.column) {
            const colIdx = headers.indexOf(slicer.column);
            obj[slicer.column] = String(row[colIdx] || "");
          }
        });
        return obj;
      });

      const activeSlicer = slicers.filter(s => s.column && s.value).map(s => ({
        col: s.column,
        val: s.value,
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: mappedData,
          slicers: activeSlicer,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate summary");
      }

      const result = await response.json();

      clearInterval(stepInterval);
      setCurrentStep(analysisSteps.length - 1);

      setTimeout(() => {
        setSummary(result.summary);
        setIsGenerating(false);

        const now = new Date();
        const formatted = now.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        setGeneratedDate(formatted);

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.max(180, textareaRef.current.scrollHeight) + 'px';
          }
        }, 0);
      }, 500);
    } catch (err: any) {
      clearInterval(stepInterval);
      if (err.name === 'AbortError') {
        setError("Request timed out after 60 seconds. Please try with less data or check your connection.");
      } else {
        setError(err.message || "Failed to generate summary. Please try again.");
      }
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQueryData = async () => {
    if (!directorQuestion.trim()) {
      setError("Please type a question first.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsQuerying(true);
    setError("");
    setQueryAnswer("");

    try {
      const mappedData = allRows.map(row => {
        const obj: any = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx];
        });
        return obj;
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("/api/query-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: directorQuestion,
          rows: mappedData,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to query data");
      }

      const result = await response.json();
      setQueryAnswer(result.summary);

      setTimeout(() => {
        if (queryTextareaRef.current) {
          queryTextareaRef.current.style.height = 'auto';
          queryTextareaRef.current.style.height = Math.max(140, queryTextareaRef.current.scrollHeight) + 'px';
        }
      }, 0);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Request timed out after 60 seconds. Please try with less data or check your connection.");
      } else {
        setError(err.message || "Failed to query data. Please try again.");
      }
    } finally {
      setIsQuerying(false);
    }
  };

  const handleAddQueryToReport = () => {
    if (!queryAnswer.trim()) {
      setError("No answer to add yet.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!queryLabel.trim()) {
      setError("Please add a label for this query answer.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    const newSection: ReportSection = {
      id: `query-${Date.now()}`,
      label: queryLabel,
      content: queryAnswer,
    };

    setReportSections([...reportSections, newSection]);
    setQueryLabel("");
    setError("");
  };

  const getLatestCommentsColumn = (rowObjects: any[]): string | null => {
    if (!rowObjects || !rowObjects.length) return null;
    const firstRow = rowObjects[0];
    const columns = Object.keys(firstRow);
    const commentCols = columns.filter(c => /comment/i.test(c));
    if (!commentCols.length) return null;

    const parseDate = (txt: string): number => {
      const m = txt.match(/(\d{1,2}[\/\-\s](?:\d{1,2}|[A-Za-z]{3,})[\/\-\s]\d{2,4})/);
      if (!m) return 0;
      try {
        return Date.parse(m[1]);
      } catch {
        return 0;
      }
    };

    commentCols.sort((a, b) => parseDate(b) - parseDate(a));
    return commentCols[0];
  };

  const addUnifiedCommentsColumn = (rowObjects: any[]): any[] => {
    if (!rowObjects || !rowObjects.length) return [];
    const latestCol = getLatestCommentsColumn(rowObjects);
    if (!latestCol) return rowObjects;

    if (typeof window !== 'undefined') {
      (window as any).__dpow = (window as any).__dpow || {};
      (window as any).__dpow.activeCommentsColumn = latestCol;
    }

    return rowObjects.map(r => ({
      ...r,
      Comments: r[latestCol] || ""
    }));
  };

  const filterForMode = (mode: string, rowObjects: any[]): { filtered: any[], slicers: Array<{ col: string; val?: string }> } => {
    const all = Array.isArray(rowObjects) ? rowObjects : [];
    if (!all.length) return { filtered: [], slicers: [] };

    const hasType = (r: any, t: string) => String(r.Type || "").trim().toUpperCase() === t;
    const hasStatus = (r: any, s: string) => String(r.Status || "").trim().toUpperCase() === s;

    if (mode === "executive") {
      return {
        filtered: all,
        slicers: [
          { col: "Type" },
          { col: "Revision" },
          { col: "Status" },
          { col: "Comments" }
        ]
      };
    }

    if (mode === "drawings") {
      const filtered = all.filter(r => hasType(r, "DR"));
      return {
        filtered,
        slicers: [
          { col: "Type", val: "DR" },
          { col: "Revision" },
          { col: "Status" },
          { col: "Comments" }
        ]
      };
    }

    if (mode === "samples") {
      const filtered = all.filter(r => hasType(r, "SL"));
      return {
        filtered,
        slicers: [
          { col: "Type", val: "SL" },
          { col: "Revision" },
          { col: "Status" },
          { col: "Comments" }
        ]
      };
    }

    if (mode === "technical") {
      const filtered = all.filter(r => hasType(r, "TS"));
      return {
        filtered,
        slicers: [
          { col: "Type", val: "TS" },
          { col: "Revision" },
          { col: "Status" },
          { col: "Comments" }
        ]
      };
    }

    if (mode === "risks_issues") {
      const filtered = all.filter(r => hasStatus(r, "C"));
      return {
        filtered,
        slicers: [
          { col: "Status", val: "C" },
          { col: "Comments" }
        ]
      };
    }

    return { filtered: all, slicers: [] };
  };

  const handlePreArrangedSummary = async (mode: string, label: string) => {
    setIsGenerating(true);
    setCurrentStep(0);
    setError("");
    setSummary("");
    setSummaryLabel(label);

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < analysisSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    try {
      const rowObjects = allRows.map(row => {
        const obj: any = {};
        headers.forEach((header, idx) => {
          obj[header] = row[idx];
        });
        return obj;
      });

      const normalisedRows = addUnifiedCommentsColumn(rowObjects);
      const { filtered, slicers: effectiveSlicers } = filterForMode(mode, normalisedRows);

      if (filtered.length === 0) {
        clearInterval(stepInterval);
        setError(`No rows match the "${label}" criteria. Try with different data.`);
        setIsGenerating(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: filtered,
          slicers: effectiveSlicers,
          mode: mode,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate summary");
      }

      const result = await response.json();

      clearInterval(stepInterval);
      setCurrentStep(analysisSteps.length - 1);

      setTimeout(() => {
        setSummary(result.summary);
        setIsGenerating(false);

        const now = new Date();
        const formatted = now.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        setGeneratedDate(formatted);

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.max(180, textareaRef.current.scrollHeight) + 'px';
          }
        }, 0);
      }, 500);
    } catch (err: any) {
      clearInterval(stepInterval);
      if (err.name === 'AbortError') {
        setError("Request timed out after 60 seconds. Please try with less data or check your connection.");
      } else {
        setError(err.message || "Failed to generate summary. Please try again.");
      }
      setIsGenerating(false);
    }
  };

  const selectedColumnsCount = slicers.filter(s => s.column).length;
  const canGenerate = selectedColumnsCount === 4 && filteredRows.length > 0;

  if (rawData.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: '#FCFCFA', fontFamily: 'var(--font-ibm-plex)', position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
          background: `radial-gradient(circle 600px at ${mousePos.x}% ${mousePos.y}%, rgba(79, 165, 154, 0.18), transparent 80%)`,
          willChange: 'transform',
          mixBlendMode: 'normal'
        }}
      />
      <div className="max-w-[1200px] mx-auto p-6" style={{ position: 'relative', zIndex: 1 }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex-1"></div>
          <h1 style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: '28px',
            fontWeight: '500',
            letterSpacing: '0.01em',
            color: '#2A2A2A',
            textAlign: 'center',
            flex: 1
          }}>
            AI-Powered Summaries
          </h1>
          <div className="flex-1 flex justify-end gap-3">
            <button
              onClick={() => setPremiumReportDrawerOpen(true)}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm transition-opacity hover:opacity-85"
              style={{
                background: '#F97316',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '600',
                fontFamily: 'var(--font-ibm-plex)',
                boxShadow: '0 2px 4px rgba(249, 115, 22, 0.2)'
              }}
            >
              View Premium Report <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setReportDrawerOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm transition-opacity hover:opacity-70"
              style={{
                background: '#2A2A2A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '500',
                fontFamily: 'var(--font-ibm-plex)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)'
              }}
            >
              Open Report Preview <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-4 p-4" style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '6px',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm" style={{ fontWeight: '400', color: '#4B4B4B' }}>
              Header row:
              <input
                type="number"
                min="1"
                max="50"
                value={headerRowNumber}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setHeaderRowNumber(Math.max(1, Math.min(50, value)));
                }}
                className="ml-2 w-16 px-2 py-1 text-sm"
                style={{
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  color: '#2A2A2A',
                  background: '#FFFFFF'
                }}
              />
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm transition-opacity hover:opacity-70"
              style={{
                fontWeight: '500',
                color: '#4FA59A',
                background: '#EAEAEA',
                border: '1px solid #E5E7EB',
                borderRadius: '6px'
              }}
            >
              Inspect Data <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {slicers.map((slicer, index) => (
              <div key={index} className="flex-1 min-w-[180px]">
                <label className="block text-xs mb-1" style={{ fontWeight: '500', color: '#4B4B4B' }}>
                  {["Category", "Revision", "Status", "Comments"][index]}
                </label>
                <div className="relative mb-1.5">
                  <select
                    value={slicer.column}
                    onChange={(e) => handleSlicerColumnChange(index, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm appearance-none"
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      background: '#FFFFFF',
                      color: '#2A2A2A'
                    }}
                  >
                    <option value="">- select -</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#4B4B4B' }} />
                </div>

                {slicer.column && (
                  <div className="relative">
                    <select
                      value={slicer.value}
                      onChange={(e) => handleSlicerValueChange(index, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm appearance-none"
                      style={{
                        border: '2px solid #4FA59A',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        color: '#2A2A2A'
                      }}
                    >
                      <option value="">ALL</option>
                      {slicer.availableValues.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: '#4B4B4B' }} />
                  </div>
                )}
              </div>
            ))}
            <div className="flex-shrink-0 self-end pb-0.5">
              <button
                onClick={handleGenerateSummary}
                disabled={!canGenerate || isGenerating}
                className="px-4 py-1.5 text-sm transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: '#4FA59A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontWeight: '500',
                  letterSpacing: '0.01em'
                }}
              >
                {isGenerating ? "Generating..." : "Run Analysis"}
              </button>
            </div>
          </div>

          <div className="text-xs" style={{ color: '#4B4B4B' }}>
            <strong style={{ color: '#2A2A2A' }}>{filteredRows.length}</strong> rows match your filters
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3" style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px'
          }}>
            <p className="text-sm" style={{ color: '#991B1B', fontWeight: '500' }}>{error}</p>
          </div>
        )}

        <div className="mb-4 p-4" style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          position: 'relative',
          zIndex: 1
        }}>
          <h2 style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: '22px',
            fontWeight: '500',
            letterSpacing: '0.01em',
            color: '#2A2A2A',
            marginBottom: '8px',
            textAlign: 'center'
          }}>
            Director&apos;s Query
          </h2>

          <input
            type="text"
            value={directorQuestion}
            onChange={(e) => setDirectorQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleQueryData();
              }
            }}
            placeholder="Ask about your data… e.g. &apos;How many Status C drawings do we have and what&apos;s the issue?&apos;"
            className="w-full px-3 py-2.5 text-sm mb-2"
            style={{
              fontFamily: 'var(--font-ibm-plex)',
              fontSize: '15px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              background: '#FFFFFF',
              color: '#2A2A2A'
            }}
          />

          <div className="flex justify-end mb-3">
            <button
              onClick={handleQueryData}
              disabled={isQuerying || !directorQuestion.trim()}
              className="px-4 py-2 text-sm transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#4FA59A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '500',
                fontFamily: 'var(--font-ibm-plex)'
              }}
            >
              {isQuerying ? "Asking..." : "Ask Question"}
            </button>
          </div>

          {queryAnswer && (
            <>
              <textarea
                ref={queryTextareaRef}
                value={queryAnswer}
                onChange={(e) => {
                  setQueryAnswer(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.max(140, e.target.scrollHeight) + 'px';
                }}
                className="w-full px-4 py-3 text-sm resize-none mb-2"
                style={{
                  fontFamily: 'var(--font-ibm-plex)',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  background: '#FCFCFA',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  minHeight: '140px',
                  color: '#2A2A2A'
                }}
              />

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={queryLabel}
                  onChange={(e) => setQueryLabel(e.target.value)}
                  placeholder="Label this answer (e.g., Status C Overview)"
                  className="flex-1 px-3 py-1.5 text-sm"
                  style={{
                    fontFamily: 'var(--font-ibm-plex)',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    background: '#FFFFFF',
                    color: '#2A2A2A',
                    minWidth: '260px'
                  }}
                />
                <button
                  onClick={handleAddQueryToReport}
                  className="px-4 py-1.5 text-sm transition-opacity hover:opacity-85"
                  style={{
                    background: '#4FA59A',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontWeight: '500',
                    fontFamily: 'var(--font-ibm-plex)'
                  }}
                >
                  Add to Report
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mb-4 p-4" style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{
            fontFamily: 'var(--font-cormorant)',
            fontSize: '22px',
            fontWeight: '500',
            letterSpacing: '0.01em',
            color: '#2A2A2A',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            Pre-Arranged Summaries
          </h2>

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => handlePreArrangedSummary('executive', 'Executive Summary')}
              disabled={isGenerating || allRows.length === 0}
              className="px-5 py-2.5 text-sm transition-all hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#2A2A2A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '500',
                fontFamily: 'var(--font-ibm-plex)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              Executive Summary
            </button>

            <button
              onClick={() => handlePreArrangedSummary('drawings', 'Drawing Summary')}
              disabled={isGenerating || allRows.length === 0}
              className="px-5 py-2.5 text-sm transition-all hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#4FA59A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '500',
                fontFamily: 'var(--font-ibm-plex)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              Drawing Summary
            </button>

            <button
              onClick={() => handlePreArrangedSummary('samples', 'Samples Summary')}
              disabled={isGenerating || allRows.length === 0}
              className="px-5 py-2.5 text-sm transition-all hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#4FA59A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '500',
                fontFamily: 'var(--font-ibm-plex)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              Samples Summary
            </button>

            <button
              onClick={() => handlePreArrangedSummary('technical', 'Technical Summary')}
              disabled={isGenerating || allRows.length === 0}
              className="px-5 py-2.5 text-sm transition-all hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#4FA59A',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '500',
                fontFamily: 'var(--font-ibm-plex)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              Technical Summary
            </button>

            <button
              onClick={() => handlePreArrangedSummary('risks_issues', 'Risks + Issues')}
              disabled={isGenerating || allRows.length === 0}
              className="px-5 py-2.5 text-sm transition-all hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                borderRadius: '6px',
                fontWeight: '500',
                fontFamily: 'var(--font-ibm-plex)',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}
            >
              Risks + Issues
            </button>
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col" style={{
          background: '#FFFFFF',
          borderLeft: '2px solid #4FA59A',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          position: 'relative',
          zIndex: 1
        }}>
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-full" style={{ border: '3px solid #E5E7EB' }}></div>
                <div className="absolute inset-0 rounded-full animate-spin" style={{
                  border: '3px solid #4FA59A',
                  borderTopColor: 'transparent'
                }}></div>
              </div>
              <h3 className="text-base mb-3" style={{ fontWeight: '500', color: '#2A2A2A' }}>
                Running Project Analysis
              </h3>
              <div className="w-full max-w-lg space-y-1.5">
                {analysisSteps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 transition-all duration-200"
                    style={{
                      background: index === currentStep
                        ? 'rgba(79, 165, 154, 0.08)'
                        : index < currentStep
                        ? '#F9F9F8'
                        : '#FFFFFF',
                      border: `1px solid ${index === currentStep ? '#4FA59A' : '#E5E7EB'}`,
                      borderRadius: '6px'
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      style={{
                        background: index === currentStep
                          ? '#4FA59A'
                          : index < currentStep
                          ? '#9CA3AF'
                          : '#D1D5DB',
                        color: '#FFFFFF',
                        fontWeight: '500'
                      }}
                    >
                      {index + 1}
                    </div>
                    <span
                      className="text-sm"
                      style={{
                        color: index === currentStep ? '#2A2A2A' : '#4B4B4B',
                        fontWeight: index === currentStep ? '500' : '400'
                      }}
                    >
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary && !isGenerating && (
            <div className="animate-fadeIn flex-1 flex flex-col">
              <textarea
                ref={textareaRef}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (textareaRef.current) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = Math.max(180, textareaRef.current.scrollHeight) + 'px';
                  }
                }}
                className="w-full flex-1 p-4.5 text-[15px] resize-none transition-all duration-200"
                style={{
                  fontFamily: 'IBM Plex Sans, sans-serif',
                  lineHeight: '1.6',
                  background: '#FCFCFA',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  color: '#2A2A2A',
                  outline: 'none',
                  minHeight: '180px',
                  overflowY: 'auto'
                }}
                placeholder="The AI-powered summary will appear here…"
              />
              {generatedDate && (
                <p className="text-xs italic text-right mt-2" style={{ color: '#4B4B4B' }}>
                  Generated on {generatedDate}
                </p>
              )}

              <div className="flex items-center gap-2 mt-4 mb-3">
                <input
                  type="text"
                  value={summaryLabel}
                  onChange={(e) => setSummaryLabel(e.target.value)}
                  placeholder="Label this summary (e.g., MEP Coordination Update)"
                  className="flex-1 min-w-[280px] px-3 py-1.5 text-sm"
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    color: '#2A2A2A',
                    background: '#FFFFFF',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => {
                    if (!summaryLabel.trim()) {
                      setShowLabelAlert(true);
                      setTimeout(() => setShowLabelAlert(false), 3000);
                      return;
                    }
                    const newSection: ReportSection = {
                      id: Date.now().toString(),
                      label: summaryLabel,
                      content: summary
                    };
                    setReportSections([...reportSections, newSection]);
                    setSummaryLabel('');
                  }}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-sm transition-opacity hover:opacity-85"
                  style={{
                    background: '#4FA59A',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add to Report
                </button>
                <button
                  onClick={() => setReportDrawerOpen(true)}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-sm transition-opacity hover:opacity-70"
                  style={{
                    background: '#EAEAEA',
                    color: '#2A2A2A',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    fontWeight: '500'
                  }}
                >
                  Open Report Preview <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {showLabelAlert && (
                <div className="mb-3 p-2 text-sm" style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  color: '#991B1B'
                }}>
                  Please enter a label for this summary before adding it to your report.
                </div>
              )}

              <div className="flex items-center justify-center gap-2.5 mt-4">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="flex items-center gap-1 px-3.5 py-1.5 text-sm transition-opacity hover:opacity-70"
                  style={{
                    background: '#EAEAEA',
                    color: '#2A2A2A',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    fontWeight: '500'
                  }}
                >
                  Inspect Data <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-sm transition-opacity hover:opacity-85"
                  style={{
                    background: '#4FA59A',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy Summary"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-sm transition-opacity hover:opacity-85"
                  style={{
                    background: '#2A2A2A',
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontWeight: '500'
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download .txt
                </button>
              </div>
            </div>
          )}

          {!isGenerating && !summary && (
            <div className="text-center py-12 text-sm" style={{ color: '#4B4B4B' }}>
              Configure your slicers and click Run Analysis to begin
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity"
          style={{ background: 'rgba(0, 0, 0, 0.25)' }}
          onClick={() => setDrawerOpen(false)}
        ></div>
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 z-50 transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: '#F9F9F8',
          borderLeft: '1px solid #E5E7EB'
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <h3 className="text-base" style={{ fontWeight: '500', color: '#2A2A2A' }}>
              Data Preview
            </h3>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-2 transition-opacity hover:opacity-70"
              style={{ borderRadius: '6px' }}
            >
              <X className="w-5 h-5" style={{ color: '#4B4B4B' }} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <p className="text-sm mb-3" style={{ color: '#4B4B4B' }}>
              Showing <strong style={{ color: '#2A2A2A' }}>{Math.min(filteredRows.length, 20)}</strong> of <strong style={{ color: '#2A2A2A' }}>{filteredRows.length}</strong> rows
            </p>
            <div className="overflow-auto" style={{
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              background: '#FFFFFF'
            }}>
              <table className="text-sm" style={{ minWidth: '100%', width: 'max-content' }}>
                <thead>
                  <tr style={{ background: '#F9F9F8' }}>
                    {headers.map((header, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left text-xs whitespace-nowrap"
                        style={{
                          fontWeight: '500',
                          color: '#2A2A2A',
                          borderBottom: '1px solid #E5E7EB'
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 20).map((row, i) => (
                    <tr key={i} className="transition-colors" style={{
                      borderBottom: '1px solid #F3F4F6'
                    }}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: '#4B4B4B' }}>
                          {String(cell ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {reportDrawerOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity"
          style={{ background: 'rgba(0, 0, 0, 0.25)' }}
          onClick={() => setReportDrawerOpen(false)}
        ></div>
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full md:w-2/3 z-50 transform transition-transform duration-300 ease-in-out ${
          reportDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          background: '#FCFCFA',
          borderLeft: '1px solid #E5E7EB'
        }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <h3 className="text-base" style={{ fontWeight: '500', color: '#2A2A2A', fontFamily: 'DM Sans, sans-serif' }}>
              Report Preview (A4, 100% scale)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const response = await fetch('/api/export-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ format: 'docx', meta: reportMeta, sections: reportSections })
                  });
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'dpow-ai-weekly-report.rtf';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 text-sm transition-opacity hover:opacity-85"
                style={{
                  background: '#2A2A2A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontWeight: '500'
                }}
              >
                Export Word
              </button>
              <button
                onClick={async () => {
                  const response = await fetch('/api/export-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ format: 'pdf', meta: reportMeta, sections: reportSections })
                  });
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'dpow-ai-weekly-report.pdf';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 text-sm transition-opacity hover:opacity-85"
                style={{
                  background: '#4FA59A',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontWeight: '500'
                }}
              >
                Export .pdf
              </button>
              <button
                onClick={() => {
                  const text = `${reportMeta.title}\nProject: ${reportMeta.project}\nPrepared by: ${reportMeta.preparedBy}\nDate: ${reportMeta.reportDateISO}\n\n${reportSections.map(s => `## ${s.label}\n\n${s.content}\n\n`).join('')}`;
                  const blob = new Blob([text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'dpow-ai-weekly-report.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 text-sm transition-opacity hover:opacity-85"
                style={{
                  background: '#EAEAEA',
                  color: '#2A2A2A',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  fontWeight: '500'
                }}
              >
                Export .txt
              </button>
              <button
                onClick={() => setReportDrawerOpen(false)}
                className="p-2 transition-opacity hover:opacity-70"
                style={{ borderRadius: '6px' }}
              >
                <X className="w-5 h-5" style={{ color: '#4B4B4B' }} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="a4-page" style={{
              width: '210mm',
              minHeight: '297mm',
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.06)',
              margin: '0 auto 12mm auto',
              padding: '16mm',
              fontFamily: 'IBM Plex Sans, sans-serif'
            }}>
              <div style={{
                borderLeft: '2px solid #4FA59A',
                paddingLeft: '8px',
                marginBottom: '16px'
              }}>
                <h1 style={{
                  fontFamily: 'var(--font-cormorant)',
                  fontSize: '18px',
                  fontWeight: '500',
                  color: '#2A2A2A',
                  marginBottom: '4px',
                  letterSpacing: '0.01em'
                }}>
                  {reportMeta.title}
                </h1>
                <div style={{ fontSize: '12px', color: '#4B4B4B', lineHeight: '1.5' }}>
                  {reportMeta.project && <div>Project: {reportMeta.project}</div>}
                  {reportMeta.preparedBy && <div>Prepared by: {reportMeta.preparedBy}</div>}
                  <div>Date: {new Date(reportMeta.reportDateISO).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              {reportSections.length === 0 && (
                <div className="text-center py-12" style={{ color: '#4B4B4B', fontSize: '14px' }}>
                  No sections added yet. Generate summaries and add them using the &quot;Add to Report&quot; button.
                </div>
              )}

              {reportSections.map((section, index) => (
                <div key={section.id} style={{ marginBottom: '16px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 style={{
                      fontFamily: 'var(--font-cormorant)',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#2A2A2A',
                      letterSpacing: '0.01em'
                    }}>
                      {section.label}
                    </h2>
                    <button
                      onClick={() => {
                        setReportSections(reportSections.filter(s => s.id !== section.id));
                      }}
                      className="p-1 transition-opacity hover:opacity-70"
                      style={{ borderRadius: '4px' }}
                      title="Remove section"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                    </button>
                  </div>
                  <p style={{
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: '#2A2A2A',
                    marginBottom: '12px'
                  }}>
                    {section.content}
                  </p>
                  {index < reportSections.length - 1 && (
                    <div style={{
                      borderTop: '1px dashed #E5E7EB',
                      margin: '10px 0'
                    }}></div>
                  )}
                </div>
              ))}

              {reportSections.length > 0 && (
                <div style={{
                  borderTop: '1px solid #E5E7EB',
                  paddingTop: '6px',
                  marginTop: '20mm',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: '#4B4B4B'
                }}>
                  <span>{reportMeta.project || 'dpow.ai'}</span>
                  <span>Page 1 of 1</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <PremiumReportDrawer 
        isOpen={premiumReportDrawerOpen}
        onClose={() => setPremiumReportDrawerOpen(false)}
        excelData={{
          headers: headers,
          allRows: allRows
        }}
      />

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
