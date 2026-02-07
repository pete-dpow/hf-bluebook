"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Loader2 } from "lucide-react";
import VoiceInput from "./VoiceInput";
import { useFreemiumUpload } from "@/components/hooks/useFreemiumUpload";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";

export default function ChatInput({
  onSend,
  disabled = false,
  showPrompt = false,
  messages = [],
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  showPrompt?: boolean;
  messages?: { role: string; content: string }[];
}) {
  const [value, setValue] = useState("");
  const { uploading, handleFreemiumUpload } = useFreemiumUpload();
  const textAreaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    textAreaRef.current?.focus();
  }, [messages]);

  const handleSend = () => {
    if (value.trim() && !disabled) {
      onSend(value.trim());
      setValue("");
      setTimeout(() => textAreaRef.current?.focus(), 300);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await handleFreemiumUpload(file);
      alert(`✅ ${file.name} processed in freemium mode.`);
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    }
  };

  // === Export Buttons ===
  const handleExportPDF = () => {
    const uploaded = localStorage.getItem("uploadedData");
    let projectName = "dpow_session";
    if (uploaded) {
      try {
        const data = JSON.parse(uploaded);
        if (data.fileName) projectName = data.fileName.replace(/\.[^/.]+$/, "");
      } catch {}
    }
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("DPoW.chat — Session Report", 20, 20);
    doc.setFontSize(11);
    doc.text(`Project: ${projectName}`, 20, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 38);
    doc.text("-------------------------------------------", 20, 46);
    let y = 56;
    messages.forEach((m) => {
      const label = m.role === "user" ? "Q: " : "A: ";
      const lines = doc.splitTextToSize(label + m.content, 170);
      doc.text(lines, 20, y);
      y += lines.length * 6 + 4;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save(`${projectName}_chat_report.pdf`);
  };

  const handleExportDOCX = async () => {
    const uploaded = localStorage.getItem("uploadedData");
    let projectName = "dpow_session";
    if (uploaded) {
      try {
        const data = JSON.parse(uploaded);
        if (data.fileName) projectName = data.fileName.replace(/\.[^/.]+$/, "");
      } catch {}
    }
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: "DPoW.chat — Session Report", bold: true, size: 28 })],
            }),
            ...messages.map(
              (m) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: (m.role === "user" ? "Q: " : "A: ") + m.content,
                      bold: m.role === "user",
                      italics: m.role !== "user",
                    }),
                  ],
                })
            ),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName}_chat_report.docx`;
    link.click();
  };

  return (
    <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3 items-end">
      {/* Export buttons (above Send) */}
      <div className="flex gap-2 justify-end w-full">
        <button
          onClick={handleExportPDF}
          disabled={!showPrompt}
          className={`text-xs px-3 py-1.5 rounded-md border border-gray-300 ${
            showPrompt
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
          }`}
        >
          Export PDF
        </button>
        <button
          onClick={handleExportDOCX}
          disabled={!showPrompt}
          className={`text-xs px-3 py-1.5 rounded-md border border-gray-300 ${
            showPrompt
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
          }`}
        >
          Generate Report (.docx)
        </button>
      </div>

      {/* File + Input + Send */}
      <div className="flex gap-3 items-center w-full">
        <label htmlFor="file-upload" className="cursor-pointer text-gray-500 hover:text-gray-700">
          {uploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-lg">
          <input
            ref={textAreaRef}
            className="flex-1 px-4 py-3 focus:outline-none transition-all"
            style={{ fontFamily: "var(--font-ibm-plex)", minHeight: "120px" }}
            placeholder="Ask about project data, generate reports..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={disabled}
          />
          <VoiceInput onTranscript={(t) => setValue(t)} />
        </div>

        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="bg-[#2563EB] text-white px-5 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          <Send size={18} />
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  );
}
