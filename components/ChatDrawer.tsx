"use client";

import { useState } from "react";
import ChatInput from "./ChatInput";
import { Loader2 } from "lucide-react";

export default function ChatDrawer() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      style={{
        padding: "40px",
      }}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        style={{
          width: "66%",
          maxWidth: "1100px",
          height: "80vh",
          margin: "auto",
          boxShadow:
            "0 10px 25px rgba(0,0,0,0.08), 0 6px 12px rgba(0,0,0,0.04)",
        }}
      >
        {/* Header */}
        <div className="p-5 border-b bg-white shadow-sm">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-cormorant)", color: "#1E1E1E" }}
          >
            hf.bluebook
          </h1>
          <p
            className="text-sm text-gray-500"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            Structured Intelligence for Project Delivery
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FCFCFA]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#2563EB] text-white rounded-br-none"
                    : "bg-white border border-gray-200 rounded-bl-none text-gray-800"
                }`}
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> analysing…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-white flex items-center gap-3">
          <ChatInput
            onSend={(msg) => {
              setMessages((prev) => [...prev, { role: "user", content: msg }]);
              setIsLoading(true);
              setTimeout(() => {
                setIsLoading(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `Acknowledged: ${msg}`,
                  },
                ]);
              }, 1000);
            }}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
