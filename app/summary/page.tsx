"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Copy, Download, Home, Loader2, ChevronDown } from "lucide-react";

type Row = (string | number | null)[];

export default function Summary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);

  const [selectedColumns, setSelectedColumns] = useState({
    column1: "",
    column2: "",
    column3: "",
    column4: "",
  });

  const [values1, setValues1] = useState<string[]>([]);
  const [values2, setValues2] = useState<string[]>([]);
  const [values3, setValues3] = useState<string[]>([]);
  const [values4, setValues4] = useState<string[]>([]);

  const [selectedValues, setSelectedValues] = useState({
    value1: "",
    value2: "",
    value3: "",
    value4: "",
  });

  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      router.replace("/summary");
      setIsLoading(false);
      return;
    }

    const stored = localStorage.getItem("uploadedData");
    const columnsStr = localStorage.getItem("selectedColumns");
    const headerRowStr = localStorage.getItem("headerRowNumber");

    if (!stored || !columnsStr) {
      router.push("/");
      return;
    }

    const rawData: Row[] = JSON.parse(stored);
    const columns = JSON.parse(columnsStr);
    const headerRowNumber = parseInt(headerRowStr || "15");

    setSelectedColumns(columns);

    const headerIndex = headerRowNumber - 1;
    const headers = rawData[headerIndex] as string[];

    const col1Idx = headers.indexOf(columns.column1);
    const col2Idx = headers.indexOf(columns.column2);
    const col3Idx = headers.indexOf(columns.column3);
    const col4Idx = headers.indexOf(columns.column4);

    const dataRows = rawData.slice(headerIndex + 1);
    const mappedData = dataRows.map((row) => ({
      [columns.column1]: String(row[col1Idx] || ""),
      [columns.column2]: String(row[col2Idx] || ""),
      [columns.column3]: String(row[col3Idx] || ""),
      [columns.column4]: String(row[col4Idx] || ""),
    })).filter(row =>
      row[columns.column1] ||
      row[columns.column2] ||
      row[columns.column3] ||
      row[columns.column4]
    );

    setAllData(mappedData);

    const unique1 = Array.from(new Set(mappedData.map(r => r[columns.column1]).filter(Boolean))).sort();
    const unique2 = Array.from(new Set(mappedData.map(r => r[columns.column2]).filter(Boolean))).sort();
    const unique3 = Array.from(new Set(mappedData.map(r => r[columns.column3]).filter(Boolean))).sort();
    const unique4 = Array.from(new Set(mappedData.map(r => r[columns.column4]).filter(Boolean))).sort();

    setValues1(unique1);
    setValues2(unique2);
    setValues3(unique3);
    setValues4(unique4);
    setIsLoading(false);
  }, [router, searchParams]);

  useEffect(() => {
    if (!selectedValues.value1 || !selectedValues.value2 || !selectedValues.value3 || !selectedValues.value4) {
      setFilteredData([]);
      return;
    }

    const filtered = allData.filter(
      row =>
        row[selectedColumns.column1] === selectedValues.value1 &&
        row[selectedColumns.column2] === selectedValues.value2 &&
        row[selectedColumns.column3] === selectedValues.value3 &&
        row[selectedColumns.column4] === selectedValues.value4
    );
    setFilteredData(filtered);
  }, [selectedValues, allData, selectedColumns]);

  const handleGenerateSummary = async () => {
    if (!selectedValues.value1 || !selectedValues.value2 || !selectedValues.value3 || !selectedValues.value4) {
      setError("Please select all 4 filter values.");
      return;
    }

    if (filteredData.length === 0) {
      setError("No rows match your filter criteria.");
      return;
    }

    setIsGenerating(true);
    setError("");
    setSummary("");

    try {
      const activeSlicer = [
        { col: selectedColumns.column1, val: selectedValues.value1 },
        { col: selectedColumns.column2, val: selectedValues.value2 },
        { col: selectedColumns.column3, val: selectedValues.value3 },
        { col: selectedColumns.column4, val: selectedValues.value4 },
      ];

      const response = await fetch("/api/generate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: filteredData,
          slicers: activeSlicer,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const result = await response.json();
      setSummary(result.summary);
    } catch (err) {
      setError("Failed to generate summary. Please try again.");
    } finally {
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
    a.download = `summary-${selectedValues.value1}-${selectedValues.value2}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartOver = () => {
    localStorage.removeItem("uploadedData");
    localStorage.removeItem("selectedColumns");
    localStorage.removeItem("headerRowNumber");
    router.push("/");
  };

  const allFiltersSelected = selectedValues.value1 && selectedValues.value2 && selectedValues.value3 && selectedValues.value4;

  return (
    <div className="min-h-screen bg-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-2">
            Board-Room Summary
          </h1>
          <p className="text-gray-600">
            180 Piccadilly TIDP - Filter by your selected columns
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-[#00BFA5] animate-spin mb-4" />
            <p className="text-gray-600">Loading data...</p>
          </div>
        ) : (
          <>
            <div className="mb-6 p-6 bg-gray-50 border-2 border-gray-200 rounded-lg">
              <h2 className="text-xl font-bold text-black mb-4">Filter Criteria</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    {selectedColumns.column1}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedValues.value1}
                      onChange={(e) => setSelectedValues({ ...selectedValues, value1: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg appearance-none bg-white text-black focus:border-[#00BFA5] focus:outline-none"
                    >
                      <option value="">- select -</option>
                      {values1.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    {selectedColumns.column2}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedValues.value2}
                      onChange={(e) => setSelectedValues({ ...selectedValues, value2: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg appearance-none bg-white text-black focus:border-[#00BFA5] focus:outline-none"
                    >
                      <option value="">- select -</option>
                      {values2.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    {selectedColumns.column3}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedValues.value3}
                      onChange={(e) => setSelectedValues({ ...selectedValues, value3: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg appearance-none bg-white text-black focus:border-[#00BFA5] focus:outline-none"
                    >
                      <option value="">- select -</option>
                      {values3.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    {selectedColumns.column4}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedValues.value4}
                      onChange={(e) => setSelectedValues({ ...selectedValues, value4: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg appearance-none bg-white text-black focus:border-[#00BFA5] focus:outline-none"
                    >
                      <option value="">- select -</option>
                      {values4.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {allFiltersSelected && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    <strong>{filteredData.length}</strong> rows match your filters
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={isGenerating || filteredData.length === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    <Loader2 className={`w-4 h-4 ${isGenerating ? "animate-spin" : "hidden"}`} />
                    {isGenerating ? "Generating..." : "Generate Summary"}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {filteredData.length > 0 && (
              <div className="mb-6 overflow-x-auto border-2 border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black border-b-2 border-gray-200">{selectedColumns.column1}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black border-b-2 border-gray-200">{selectedColumns.column2}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black border-b-2 border-gray-200">{selectedColumns.column3}</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-black border-b-2 border-gray-200">{selectedColumns.column4}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm text-gray-700">{row[selectedColumns.column1]}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row[selectedColumns.column2]}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row[selectedColumns.column3]}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{row[selectedColumns.column4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredData.length > 100 && (
                  <p className="p-4 text-sm text-gray-600 bg-gray-50">
                    Showing first 100 of {filteredData.length} rows
                  </p>
                )}
              </div>
            )}

            {summary && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Summary
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full min-h-32 max-h-96 p-6 border-2 border-gray-300 rounded-lg text-gray-800 leading-relaxed resize-y focus:border-[#00BFA5] focus:outline-none overflow-y-auto"
                  placeholder="Your summary will appear here..."
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {summary && (
                <>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy"}
                  </button>

                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </>
              )}

              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-6 py-3 border-2 border-black text-black rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                <Home className="w-4 h-4" />
                Start Over
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
