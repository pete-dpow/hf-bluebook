"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Settings, Bell, Info, Shield } from "lucide-react";
import LegalDrawer from "./LegalDrawer";
import SettingsDrawer from "./SettingsDrawer";

export default function RightSidebar() {
  // ⭐ Task 34: Check if cookie consent needed (show indicator)
  const [needsCookieConsent, setNeedsCookieConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("dpow_cookie_consent");
    if (!consent) {
      setNeedsCookieConsent(true);
    }
  }, []);

  const handleHelpClick = () => {
    const trigger = document.getElementById("help-trigger");
    if (trigger) trigger.click();
  };

  const handleAboutClick = () => {
    const trigger = document.getElementById("about-trigger");
    if (trigger) trigger.click();
  };

  const handleLegalClick = () => {
    window.dispatchEvent(new CustomEvent("openLegalDrawer"));
  };

  const handleSettingsClick = () => {
    window.dispatchEvent(new CustomEvent("openSettingsDrawer"));
  };

  return (
    <>
      {/* Legal Drawer Component */}
      <LegalDrawer />
      
      {/* Settings Drawer Component */}
      <SettingsDrawer />
      
      <div
        style={{
          position: "fixed",
          right: 0,
          top: 0,
          height: "100vh",
          width: "64px",
          background: "transparent",
          borderLeft: "1px solid rgba(229, 231, 235, 0.3)",
          boxShadow: "-2px 0 12px rgba(0, 0, 0, 0.03)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: "var(--font-ibm-plex)",
          padding: "20px 0",
        }}
      >
      {/* Top Section */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <IconButton icon={<Bell size={20} />} tooltip="Notifications" />
        <IconButton 
          icon={<Settings size={20} />} 
          tooltip="Settings" 
          onClick={handleSettingsClick}
        />
      </div>

      {/* Bottom Section */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          alignItems: "center",
        }}
      >
        <IconButton 
          icon={<Shield size={20} />} 
          tooltip="Legal & Privacy" 
          onClick={handleLegalClick}
          showBadge={needsCookieConsent}
        />
        <IconButton icon={<Info size={20} />} tooltip="About dpow.chat" onClick={handleAboutClick} />
        <IconButton icon={<HelpCircle size={20} />} tooltip="Help & Support" onClick={handleHelpClick} />
      </div>
    </div>
    </>
  );
}

// ⭐ UPDATED: Icon Button with matching tooltip style (arrow pointer) + badge support
function IconButton({
  icon,
  tooltip,
  onClick,
  showBadge = false,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
  showBadge?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: hovered ? "rgba(37, 99, 235, 0.1)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#6B7280",
        transition: "background 0.2s, color 0.2s",
        position: "relative",
      }}
    >
      {icon}

      {/* ⭐ Badge indicator (for cookie consent needed) */}
      {showBadge && (
        <div
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "#F59E0B",
            border: "2px solid white",
            animation: "pulse 2s infinite",
          }}
        />
      )}

      {/* ⭐ Tooltip with arrow (matches LeftSidebar style) */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            right: "52px",
            background: "#1F2937",
            color: "white",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 60,
            pointerEvents: "none",
          }}
        >
          {tooltip}
          {/* Arrow pointing right (towards icon) */}
          <div
            style={{
              position: "absolute",
              right: "-4px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderLeft: "4px solid #1F2937",
            }}
          />
        </div>
      )}

      {/* Pulse animation for badge */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
