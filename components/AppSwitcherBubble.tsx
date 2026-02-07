"use client";

import { useState } from "react";
import {
  MessageSquare,
  FileText,
  Target,
  FileBarChart,
  CheckSquare,
  ShoppingCart,
  Leaf,
  Users,
  Home,
  Lock,
} from "lucide-react";

interface App {
  name: string;
  subdomain: string;
  icon: React.ReactNode;
  isActive: boolean;
  description: string;
  color: string;
}

const apps: App[] = [
  {
    name: "chat",
    subdomain: "chat.dpow.ai",
    icon: <MessageSquare size={24} />,
    isActive: true,
    description: "Conversational AI for project data",
    color: "#2563EB",
  },
  {
    name: "report",
    subdomain: "report.dpow.ai",
    icon: <FileBarChart size={24} />,
    isActive: true,
    description: "Automated project reporting",
    color: "#10B981",
  },
  {
    name: "scope",
    subdomain: "scope.dpow.ai",
    icon: <Target size={24} />,
    isActive: true,
    description: "Visual scope capture & BIM markup",
    color: "#8B5CF6",
  },
  {
    name: "TIDP",
    subdomain: "TIDP.dpow.ai",
    icon: <FileText size={24} />,
    isActive: false,
    description: "Technical Information Delivery Plan",
    color: "#F97316",
  },
  {
    name: "list",
    subdomain: "list.dpow.ai",
    icon: <CheckSquare size={24} />,
    isActive: false,
    description: "Task & checklist management",
    color: "#EC4899",
  },
  {
    name: "procure",
    subdomain: "procure.dpow.ai",
    icon: <ShoppingCart size={24} />,
    isActive: false,
    description: "Procurement & supplier management",
    color: "#14B8A6",
  },
  {
    name: "wlca",
    subdomain: "wlca.dpow.ai",
    icon: <Leaf size={24} />,
    isActive: false,
    description: "Whole Life Carbon Assessment",
    color: "#EAB308",
  },
  {
    name: "assign",
    subdomain: "assign.dpow.ai",
    icon: <Users size={24} />,
    isActive: false,
    description: "Team & resource assignment",
    color: "#F43F5E",
  },
  {
    name: "dpow.ai",
    subdomain: "dpow.ai",
    icon: <Home size={24} />,
    isActive: false,
    description: "DPoW ecosystem landing page",
    color: "#6B7280",
  },
];

export default function AppSwitcherBubble({ onClose }: { onClose: () => void }) {
  const handleAppClick = (app: App) => {
    if (app.isActive) {
      // Navigate to the app's route
      if (app.name === "chat") {
        window.location.href = "/"; // Root landing page for dpow.chat
      } else if (app.name === "report") {
        window.location.href = "/report";
      } else if (app.name === "scope") {
        window.location.href = "/scope";
      }
      onClose();
    } else {
      // Navigate to landing page for inactive apps
      const routeName = app.name.toLowerCase();
      window.location.href = `/${routeName}`;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 45,
        }}
      />

      {/* Bubble */}
      <div
        style={{
          position: "fixed",
          left: "80px",
          top: "20px",
          background: "#FCFCFA",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(229, 231, 235, 0.5)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          padding: "20px",
          zIndex: 50,
          fontFamily: "var(--font-ibm-plex)",
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid rgba(229, 231, 235, 0.3)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: "20px",
              fontWeight: 500,
              color: "#2A2A2A",
              margin: 0,
            }}
          >
            DPoW Ecosystem
          </h3>
          <p
            style={{
              fontSize: "12px",
              color: "#6B7280",
              margin: "4px 0 0 0",
            }}
          >
            8 integrated apps for project delivery
          </p>
        </div>

        {/* 3x3 Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            width: "300px",
          }}
        >
          {apps.map((app) => (
            <AppCard
              key={app.subdomain}
              app={app}
              onClick={() => handleAppClick(app)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function AppCard({ app, onClick }: { app: App; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 12px",
        borderRadius: "12px",
        background: hovered
          ? "rgba(229, 231, 235, 0.3)"
          : "transparent",
        border: "1px solid transparent",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
      }}
      title={app.description}
    >
      {/* Icon */}
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: app.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "8px",
          color: "white",
          position: "relative",
          opacity: app.isActive ? 1 : 0.7,
        }}
      >
        {app.icon}
        
        {/* Lock Badge */}
        {!app.isActive && (
          <div
            style={{
              position: "absolute",
              bottom: "-2px",
              right: "-2px",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "#9CA3AF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid white",
            }}
          >
            <Lock size={10} color="white" />
          </div>
        )}
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "#2A2A2A",
          marginBottom: "2px",
        }}
      >
        {app.name}
      </div>

      {/* Status */}
      <div
        style={{
          fontSize: "10px",
          color: app.isActive ? "#10B981" : "#9CA3AF",
          fontWeight: 500,
        }}
      >
        {app.isActive ? "Active" : "Coming Soon"}
      </div>
    </div>
  );
}
