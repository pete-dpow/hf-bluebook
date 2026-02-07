"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle, Pencil } from "lucide-react";
import ChatPage from "@/app/chat/page";
import { supabase } from "@/lib/supabase";

export default function ChatDrawerWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  // Check auth status
  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    
    // Check WhatsApp connection status
    if (session?.user) {
      const { data } = await supabase
        .from("users")
        .select("whatsapp_number")
        .eq("id", session.user.id)
        .single();
      
      setWhatsappConnected(!!data?.whatsapp_number);
    }
  }

  // Listen for project/file name changes from ChatPage
  useEffect(() => {
    const handleProjectChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setProjectName(customEvent.detail.projectName);
      setFileName(customEvent.detail.fileName || null);
    };
    
    window.addEventListener('projectLoaded', handleProjectChange);
    return () => window.removeEventListener('projectLoaded', handleProjectChange);
  }, []);

  // Listen for custom event from LeftSidebar and auto-open
  useEffect(() => {
    const handleOpenDrawer = () => {
      console.log('🚀 ChatDrawerWrapper: openChatDrawer event received');
      setIsOpen(true);
    };
    
    window.addEventListener("openChatDrawer", handleOpenDrawer);
    return () => window.removeEventListener("openChatDrawer", handleOpenDrawer);
  }, []);

  // Original button click listener (for homepage trigger)
  useEffect(() => {
    const trigger = document.getElementById("chat-trigger");
    if (!trigger) return;

    const handleClick = () => {
      console.log('🚀 ChatDrawerWrapper: chat-trigger clicked');
      setIsOpen(true);
    };
    
    trigger.addEventListener("click", handleClick);
    return () => trigger.removeEventListener("click", handleClick);
  }, []);

  // Calculate drawer position based on user status
  const drawerRight = user ? "64px" : "0px"; // 64px when signed in (right sidebar width), 0 when freemium

  return (
    <>
      {/* Hidden trigger button - always present */}
      <button id="chat-trigger" style={{ display: "none" }}>
        Open Chat
      </button>

      {/* Drawer - only visible when isOpen */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 45,
              animation: "fadeIn 0.2s ease-out",
            }}
          />

          {/* Drawer - 70% width */}
          <div
            style={{
              position: "fixed",
              top: 0,
              right: drawerRight,
              height: "100vh",
              width: "70vw",
              background: "#FCFCFA",
              boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.1)",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.3s ease-out",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #E5E7EB",
                background: "white",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    color: "#2A2A2A",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  Chat
                  {whatsappConnected && (
                    <MessageCircle size={20} color="#25D366" style={{ marginLeft: "4px" }} />
                  )}
                </h2>
                {(projectName || fileName) && (
                  <>
                    <span style={{ color: "#D1D5DB", fontSize: "1.5rem" }}>|</span>
                    <span
                      style={{
                        fontFamily: "var(--font-ibm-plex)",
                        fontSize: "0.875rem",
                        color: "#6B7280",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {fileName || projectName}
                      <button
                        onClick={() => {/* TODO: Rename project */}}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "4px",
                          background: "rgba(37, 99, 235, 0.08)",
                          border: "1px solid rgba(37, 99, 235, 0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        title="Rename project"
                      >
                        <Pencil size={12} style={{ color: "#2563EB" }} />
                      </button>
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <X size={24} color="#6B7280" />
              </button>
            </div>

            {/* Chat Content */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ChatPage />
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
