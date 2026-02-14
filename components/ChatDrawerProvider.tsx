"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatDrawerProvider() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ ${e?.message || "Connection error"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating chat bubble */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#2563EB] text-white rounded-full shadow-lg hover:opacity-90 transition flex items-center justify-center z-[60]"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Drawer overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-[59] flex items-end justify-center"
          onClick={() => setIsOpen(false)}
        >
          {/* Drawer panel (clicks inside do not close) */}
          <div
            className="relative w-full max-w-3xl bg-white rounded-t-2xl shadow-xl overflow-hidden h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  hf.bluebook
                </div>
                <div
                  className="text-xs text-gray-500"
                  style={{ fontFamily: "var(--font-ibm-plex)" }}
                >
                  Structured Intelligence for Project Delivery
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FCFCFA]">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-[#2563EB] text-white rounded-br-none"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                    style={{ fontFamily: "var(--font-ibm-plex)" }}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start text-gray-500 text-sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> analysing…
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t bg-white p-3 flex items-center gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your dataset…"
                className="flex-1 resize-none border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                style={{ fontFamily: "var(--font-ibm-plex)", minHeight: 44 }}
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="inline-flex items-center justify-center bg-[#2563EB] hover:opacity-90 text-white rounded-xl px-4 py-2 transition disabled:opacity-50"
                aria-label="Send"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
