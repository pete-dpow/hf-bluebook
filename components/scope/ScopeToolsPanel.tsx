"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Compass,
  Maximize2,
  Move,
  Scissors, 
  PenTool, 
  Ruler, 
  Crop, 
  Info, 
  Palette,
  Save,
  Download,
  Upload,
  Share2,
  Eye,
  EyeOff,
  Grid3x3,
  Layers
} from "lucide-react";

interface ScopeToolsPanelProps {
  onToolSelect?: (tool: string) => void;
  onSaveProject?: () => void;
  onExport?: (format: string) => void;
  onUploadNew?: () => void;
}

export default function ScopeToolsPanel({
  onToolSelect,
  onSaveProject,
  onExport,
  onUploadNew
}: ScopeToolsPanelProps) {
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [viewSettings, setViewSettings] = useState({
    showGrid: true,
    showAxes: true,
    wireframe: false,
  });
  const [modelInfo, setModelInfo] = useState({
    name: "No model loaded",
    size: "0 KB",
  });

  // Panel starts open by default - no localStorage check needed
  // useEffect not needed for initial state

  useEffect(() => {
    checkAuth();
    loadModelInfo();
    
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newState = customEvent.detail.open;
      
      setIsOpen(newState);
      localStorage.setItem("scopeToolsPanelOpen", String(newState));
    };
    
    window.addEventListener("toggleScopeToolsPanel", handleToggle);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("toggleScopeToolsPanel", handleToggle);
    };
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  }

  function loadModelInfo() {
    const modelName = localStorage.getItem("uploadedModelName");
    const modelSize = localStorage.getItem("uploadedModelSize");
    
    if (modelName) {
      const sizeKB = modelSize ? Math.round(parseInt(modelSize) / 1024) : 0;
      setModelInfo({
        name: modelName,
        size: sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`,
      });
    }
  }

  const handleToolClick = (tool: string) => {
    setActiveTool(tool === activeTool ? null : tool);
    onToolSelect?.(tool);
  };

  const handleViewToggle = (setting: keyof typeof viewSettings) => {
    setViewSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSave = async () => {
    if (!user) {
      alert("❌ Please sign in to save projects");
      return;
    }
    
    const modelData = localStorage.getItem("uploadedModelData");
    if (!modelData) {
      alert("❌ No model data found");
      return;
    }

    const projectName = prompt("Enter project name:", modelInfo.name.replace('.ifc', ''));
    if (!projectName?.trim()) return;

    try {
      // TODO: Implement save to scope_models table
      onSaveProject?.();
      alert(`✅ Project "${projectName}" saved!`);
    } catch (err: any) {
      console.error("Save error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleExport = (format: string) => {
    onExport?.(format);
    alert(`Export as ${format.toUpperCase()} - Coming soon in Phase 2`);
  };

  const handleUpload = () => {
    if (confirm("Upload a new model? Current model will be replaced.")) {
      window.location.href = "/scope";
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    alert("✅ Link copied to clipboard!");
  };

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: "64px", // ✅ LEFT SIDE (like ProjectsPanel)
        top: 0,
        height: "100vh",
        width: isOpen ? "280px" : "0px",
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px)",
        borderRight: isOpen ? "1px solid rgba(229, 231, 235, 0.3)" : "none", // ✅ RIGHT border
        boxShadow: isOpen ? "2px 0 12px rgba(0, 0, 0, 0.03)" : "none", // ✅ RIGHT shadow
        zIndex: 35,
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-ibm-plex)",
        overflow: "hidden",
        transition: "width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
        opacity: isOpen ? 1 : 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid rgba(229, 231, 235, 0.3)",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#2A2A2A",
            marginBottom: "4px",
          }}
        >
          Scope Tools
        </h2>
        <div
          style={{
            fontSize: "11px",
            color: "#6B7280",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {modelInfo.name}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "#9CA3AF",
            marginTop: "2px",
          }}
        >
          {modelInfo.size}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
        }}
      >
        {/* VIEW CONTROLS SECTION */}
        <SectionHeader title="View Controls" icon={<Eye size={14} />} />
        
        <ToolButton
          icon={<Compass size={18} />}
          label="Navigation Cube"
          onClick={() => handleToolClick("navigation")}
          active={activeTool === "navigation"}
        />
        
        <ToolButton
          icon={<Maximize2 size={18} />}
          label="Fit to View"
          onClick={() => handleToolClick("fit")}
        />
        
        <ToolButton
          icon={<Move size={18} />}
          label="Orbit Controls"
          onClick={() => handleToolClick("orbit")}
          active={activeTool === "orbit"}
        />

        <ViewToggleButton
          icon={<Grid3x3 size={18} />}
          label="Show Grid"
          active={viewSettings.showGrid}
          onClick={() => handleViewToggle("showGrid")}
        />

        <ViewToggleButton
          icon={<Layers size={18} />}
          label="Show Axes"
          active={viewSettings.showAxes}
          onClick={() => handleViewToggle("showAxes")}
        />

        {/* TOOLS SECTION */}
        <SectionHeader title="Tools" icon={<PenTool size={14} />} />
        
        <ToolButton
          icon={<Scissors size={18} />}
          label="Section"
          subtitle="Coming Soon"
          onClick={() => handleToolClick("section")}
          active={activeTool === "section"}
          disabled
        />
        
        <ToolButton
          icon={<PenTool size={18} />}
          label="Markup"
          subtitle="Coming Soon"
          onClick={() => handleToolClick("markup")}
          active={activeTool === "markup"}
          disabled
        />
        
        <ToolButton
          icon={<Ruler size={18} />}
          label="Measure"
          subtitle="Coming Soon"
          onClick={() => handleToolClick("measure")}
          active={activeTool === "measure"}
          disabled
        />
        
        <ToolButton
          icon={<Crop size={18} />}
          label="Clip"
          subtitle="Coming Soon"
          onClick={() => handleToolClick("clip")}
          active={activeTool === "clip"}
          disabled
        />
        
        <ToolButton
          icon={<Info size={18} />}
          label="Properties"
          subtitle="Coming Soon"
          onClick={() => handleToolClick("properties")}
          active={activeTool === "properties"}
          disabled
        />
        
        <ToolButton
          icon={<Palette size={18} />}
          label="Color"
          subtitle="Coming Soon"
          onClick={() => handleToolClick("color")}
          active={activeTool === "color"}
          disabled
        />

        {/* ACTIONS SECTION */}
        <SectionHeader title="Actions" icon={<Save size={14} />} />
        
        <ActionButton
          icon={<Save size={18} />}
          label="Save to Project"
          onClick={handleSave}
          variant="primary"
        />
        
        <ActionButton
          icon={<Download size={18} />}
          label="Export PDF"
          subtitle="Coming Soon"
          onClick={() => handleExport("pdf")}
          disabled
        />
        
        <ActionButton
          icon={<Download size={18} />}
          label="Export DWG"
          subtitle="Coming Soon"
          onClick={() => handleExport("dwg")}
          disabled
        />
        
        <ActionButton
          icon={<Upload size={18} />}
          label="Upload New Model"
          onClick={handleUpload}
        />
        
        <ActionButton
          icon={<Share2 size={18} />}
          label="Share Link"
          onClick={handleShare}
        />
      </div>
    </div>
  );
}

// Section Header Component
function SectionHeader({ 
  title, 
  icon 
}: { 
  title: string; 
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "12px 8px 8px 8px",
        fontSize: "11px",
        fontWeight: 600,
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {icon}
      {title}
    </div>
  );
}

// Tool Button Component
function ToolButton({
  icon,
  label,
  subtitle,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px",
        marginBottom: "6px",
        borderRadius: "8px",
        border: active 
          ? "1.5px solid #8B5CF6" 
          : "1.5px solid transparent",
        background: active
          ? "rgba(139, 92, 246, 0.08)"
          : hovered && !disabled
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(255, 255, 255, 0.5)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: active 
            ? "rgba(139, 92, 246, 0.15)"
            : "rgba(139, 92, 246, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "#8B5CF6",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#1F2937",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: "10px",
              color: "#9CA3AF",
              marginTop: "2px",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// View Toggle Button Component
function ViewToggleButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 12px",
        marginBottom: "6px",
        borderRadius: "8px",
        background: hovered
          ? "rgba(255, 255, 255, 0.9)"
          : "rgba(255, 255, 255, 0.5)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ color: "#6B7280" }}>
          {icon}
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#1F2937",
          }}
        >
          {label}
        </div>
      </div>

      <div
        style={{
          width: "36px",
          height: "20px",
          borderRadius: "10px",
          background: active ? "#8B5CF6" : "#E5E7EB",
          position: "relative",
          transition: "background 0.2s",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "white",
            position: "absolute",
            top: "2px",
            left: active ? "18px" : "2px",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          }}
        />
      </div>
    </div>
  );
}

// Action Button Component
function ActionButton({
  icon,
  label,
  subtitle,
  variant = "default",
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  variant?: "default" | "primary";
  disabled?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const isPrimary = variant === "primary";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "14px",
        marginBottom: "8px",
        borderRadius: "10px",
        background: isPrimary
          ? hovered
            ? "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)"
            : "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
          : hovered && !disabled
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(255, 255, 255, 0.5)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s ease",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        border: isPrimary ? "none" : "1px solid rgba(229, 231, 235, 0.5)",
        boxShadow: isPrimary && hovered ? "0 4px 12px rgba(139, 92, 246, 0.3)" : "none",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: isPrimary
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(139, 92, 246, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: isPrimary ? "white" : "#8B5CF6",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: isPrimary ? "white" : "#1F2937",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: "10px",
              color: isPrimary ? "rgba(255, 255, 255, 0.8)" : "#9CA3AF",
              marginTop: "2px",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
