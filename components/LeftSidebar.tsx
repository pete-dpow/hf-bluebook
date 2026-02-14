"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import {
  Home,
  Upload,
  FolderOpen,
  MessageSquare,
  MessageCircle,
  User,
  LogOut,
  X,
  Building2,
  Rocket,
  Package,
  FileText,
  Factory,
  Search,
  ShieldCheck,
  Scroll,
  Target,
  LayoutDashboard,
  FileBarChart,
  Flame,
} from "lucide-react";
import AppSwitcherBubble from "./AppSwitcherBubble";

export default function LeftSidebar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showProfileBubble, setShowProfileBubble] = useState(false);
  const [showAppSwitcher, setShowAppSwitcher] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [projectsPanelOpen, setProjectsPanelOpen] = useState(true);
  
  // WhatsApp connection state
  const [whatsappInfo, setWhatsappInfo] = useState<{
    projectName: string | null;
    fileName: string | null;
  }>({ projectName: null, fileName: null });

  // WhatsApp connection status
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState<string | null>(null);

  // Check auth status
  useEffect(() => {
    checkAuth();
    
    // Load projects panel state from localStorage
    const storedPanelState = localStorage.getItem("projectsPanelOpen");
    if (storedPanelState !== null) {
      setProjectsPanelOpen(storedPanelState === "true");
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setShowSignIn(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch WhatsApp connection info when profile bubble opens
  useEffect(() => {
    if (showProfileBubble && user) {
      fetchWhatsAppInfo();
    }
    
    // Listen for active project changes
    const handleProjectChange = () => {
      if (showProfileBubble && user) {
        fetchWhatsAppInfo();
      }
    };
    
    window.addEventListener('activeProjectChanged', handleProjectChange);
    
    return () => {
      window.removeEventListener('activeProjectChanged', handleProjectChange);
    };
  }, [showProfileBubble, user]);

  // Fetch WhatsApp info on mount for icon indicator
  useEffect(() => {
    if (user) {
      fetchWhatsAppInfo();
    }
  }, [user]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  }

  // Fetch active project, file info, and WhatsApp connection
  async function fetchWhatsAppInfo() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        setWhatsappInfo({ projectName: null, fileName: null });
        setWhatsappConnected(false);
        setWhatsappPhoneNumber(null);
        return;
      }

      // Get user's active organization to check WhatsApp numbers
      const { data: userData } = await supabase
        .from("users")
        .select("active_project_id, active_organization_id")
        .eq("id", currentUser.id)
        .single();

      console.log("🔍 Fetched active_project_id:", userData?.active_project_id);

      // Check WhatsApp connection
      if (userData?.active_organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("whatsapp_allowed_numbers")
          .eq("id", userData.active_organization_id)
          .single();

        const allowedNumbers = orgData?.whatsapp_allowed_numbers || [];
        setWhatsappConnected(allowedNumbers.length > 0);
        setWhatsappPhoneNumber(allowedNumbers[0] || null);
      } else {
        setWhatsappConnected(false);
        setWhatsappPhoneNumber(null);
      }

      if (!userData?.active_project_id) {
        console.log("❌ No active project found");
        setWhatsappInfo({ projectName: null, fileName: null });
        return;
      }

      const activeProjectId = userData.active_project_id;

      // Fetch project details
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("name")
        .eq("id", activeProjectId)
        .single();

      console.log("🔍 Fetched project:", project?.name);

      if (projectError || !project) {
        console.log("❌ Project not found");
        setWhatsappInfo({ projectName: null, fileName: null });
        return;
      }

      // Fetch first file in the project (or most recent)
      const { data: files, error: filesError } = await supabase
        .from("files")
        .select("file_name")
        .eq("project_id", activeProjectId)
        .order("created_at", { ascending: false })
        .limit(1);

      const fileName = files && files.length > 0 ? files[0].file_name : null;

      console.log("✅ WhatsApp info updated:", project.name, fileName);

      setWhatsappInfo({ 
        projectName: project.name, 
        fileName 
      });

    } catch (error) {
      console.error("Error fetching WhatsApp info:", error);
      setWhatsappInfo({ projectName: null, fileName: null });
      setWhatsappConnected(false);
      setWhatsappPhoneNumber(null);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowProfileBubble(false);
    router.push("/");
  };

  const handleToggleProjectsPanel = () => {
    const newState = !projectsPanelOpen;
    setProjectsPanelOpen(newState);
    localStorage.setItem("projectsPanelOpen", String(newState));
    
    window.dispatchEvent(new CustomEvent("toggleProjectsPanel", { 
      detail: { open: newState } 
    }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        },
      });

      if (error) {
        setMessage(`❌ ${error.message}`);
      } else {
        setMessage("✅ Check your email for the magic link!");
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message || "Failed to send magic link"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          width: "64px",
          background: "transparent",
          borderRight: "1px solid rgba(229, 231, 235, 0.3)",
          boxShadow: "2px 0 12px rgba(0, 0, 0, 0.03)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-ibm-plex)",
        }}
      >
        {/* Logo - Click to open App Switcher */}
        <div
          onClick={() => setShowAppSwitcher(!showAppSwitcher)}
          style={{
            padding: "20px",
            borderBottom: "1px solid rgba(229, 231, 235, 0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <LogoWithTooltip />
        </div>

        {/* Navigation Items */}
        <div style={{ 
          flex: 1,
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}>
          {/* ⭐ Task 2: New Upload with Tooltip */}
          <IconButton
            icon={<Upload size={20} />}
            label="New Upload"
            tooltip="Upload new file"
            onClick={() => router.push("/")}
          />

          {/* Dashboard */}
          {user && (
            <IconButton
              icon={<LayoutDashboard size={20} />}
              label="Dashboard"
              tooltip="Dashboard"
              onClick={() => router.push("/dashboard")}
            />
          )}

          {/* ⭐ Task 2: Projects with Tooltip */}
          {user && (
            <IconButton
              icon={<FolderOpen size={20} />}
              label="Projects"
              tooltip="Your Projects"
              onClick={handleToggleProjectsPanel}
              isActive={projectsPanelOpen}
            />
          )}

          {/* hf.bluebook Nav Items */}
          {user && (
            <>
              <IconButton
                icon={<Package size={20} />}
                label="Products"
                tooltip="Product Catalog"
                onClick={() => router.push("/products")}
              />
              <IconButton
                icon={<FileText size={20} />}
                label="Quotes"
                tooltip="Quotes"
                onClick={() => router.push("/quotes")}
              />
              <IconButton
                icon={<Factory size={20} />}
                label="Manufacturers"
                tooltip="Manufacturers"
                onClick={() => router.push("/manufacturers")}
              />
              <IconButton
                icon={<Search size={20} />}
                label="Data Mining"
                tooltip="Data Mining"
                onClick={() => router.push("/data-mining")}
              />
              <IconButton
                icon={<ShieldCheck size={20} />}
                label="Compliance"
                tooltip="Compliance Library"
                onClick={() => router.push("/compliance")}
              />
              <IconButton
                icon={<Scroll size={20} />}
                label="Golden Thread"
                tooltip="Golden Thread"
                onClick={() => router.push("/golden-thread")}
              />
              <IconButton
                icon={<FileBarChart size={20} />}
                label="Report"
                tooltip="Report Generator"
                onClick={() => router.push("/report")}
              />
              <IconButton
                icon={<Target size={20} />}
                label="Scope"
                tooltip="Scope — BIM Viewer"
                onClick={() => router.push("/scope")}
              />
              <IconButton
                icon={<Flame size={20} />}
                label="AutoPlan"
                tooltip="AutoPlan — Fire Safety Plans"
                onClick={() => router.push("/autoplan")}
              />
            </>
          )}
        </div>

        {/* Bottom Section */}
        <div style={{ 
          borderTop: "1px solid rgba(229, 231, 235, 0.3)", 
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}>
          {user ? (
            <>
              {/* ⭐ Task 2: Organizations with Tooltip */}
              <IconButton
                icon={<Building2 size={20} />}
                label="Organizations"
                tooltip="Manage Organizations"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("openProfileDrawer"));
                }}
              />
              
              {/* Profile with Bubble */}
              <div style={{ position: "relative" }}>
                <IconButton
                  icon={<User size={20} />}
                  label={user.email?.split("@")[0] || "Profile"}
                  tooltip="Profile & Settings"
                  onClick={() => setShowProfileBubble(!showProfileBubble)}
                />

                {/* Profile Bubble with WhatsApp Info */}
                {showProfileBubble && (
                  <div
                    style={{
                      position: "absolute",
                      left: "72px",
                      bottom: "0",
                      background: "white",
                      border: "1px solid rgba(229, 231, 235, 0.5)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
                      padding: "12px",
                      minWidth: "240px",
                      zIndex: 50,
                    }}
                  >
                    {/* Email Username */}
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#2A2A2A",
                        marginBottom: "8px",
                        paddingBottom: "8px",
                        borderBottom: "1px solid rgba(229, 231, 235, 0.5)",
                      }}
                    >
                      {user.email?.split("@")[0]}
                    </div>

                    {/* WhatsApp Connection Info */}
                    {whatsappInfo.projectName ? (
                      <div
                        style={{
                          marginBottom: "8px",
                          paddingBottom: "8px",
                          borderBottom: "1px solid rgba(229, 231, 235, 0.5)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: whatsappInfo.fileName ? "4px" : "0",
                          }}
                        >
                          <MessageCircle 
                            size={14} 
                            style={{ 
                              color: "#10B981",
                              flexShrink: 0,
                            }} 
                          />
                          <span style={{ 
                            fontWeight: 500, 
                            fontSize: "13px",
                            color: "#10B981",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {whatsappInfo.projectName}
                          </span>
                        </div>
                        
                        {whatsappInfo.fileName && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#6B7280",
                              paddingLeft: "22px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {whatsappInfo.fileName.length > 25 
                              ? whatsappInfo.fileName.substring(0, 25) + "..." 
                              : whatsappInfo.fileName}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#9CA3AF",
                          marginBottom: "8px",
                          paddingBottom: "8px",
                          borderBottom: "1px solid rgba(229, 231, 235, 0.5)",
                          fontStyle: "italic",
                        }}
                      >
                        No WhatsApp connection
                      </div>
                    )}

                    {/* Sign Out Button */}
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: "13px",
                        color: "#EF4444",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(254, 242, 242, 0.8)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <IconButton
              icon={<User size={20} />}
              label="Sign In"
              tooltip="Sign In"
              onClick={() => setShowSignIn(true)}
            />
          )}
        </div>
      </div>

      {/* App Switcher Bubble */}
      {showAppSwitcher && (
        <AppSwitcherBubble onClose={() => setShowAppSwitcher(false)} />
      )}

      {/* Click outside to close profile bubble */}
      {showProfileBubble && (
        <div
          onClick={() => setShowProfileBubble(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 45,
          }}
        />
      )}

      {/* Sign In Modal */}
      {showSignIn && !user && (
        <div
          onClick={() => setShowSignIn(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "90%",
              position: "relative",
              fontFamily: "var(--font-ibm-plex)",
            }}
          >
            <button
              onClick={() => setShowSignIn(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#6B7280",
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ 
              fontFamily: "var(--font-cormorant)", 
              fontSize: "24px",
              marginBottom: "8px",
              color: "#2A2A2A"
            }}>
              Sign in to hf.bluebook
            </h2>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px" }}>
              Enter your email to receive a magic link
            </p>

            <form onSubmit={handleSignIn}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "14px",
                  marginBottom: "16px",
                  fontFamily: "var(--font-ibm-plex)",
                }}
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#2563EB",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: loading || !email ? 0.5 : 1,
                }}
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>

            {message && (
              <p style={{ 
                marginTop: "16px", 
                fontSize: "13px", 
                color: message.includes("✅") ? "#059669" : "#DC2626"
              }}>
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ⭐ NEW: Task 2 - Logo with Tooltip
function LogoWithTooltip() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative" }}
    >
      <Image
        src="/hf_logo.svg"
        alt="hf.bluebook"
        width={24}
        height={24}
        style={{ flexShrink: 0 }}
      />
      
      {/* ⭐ Task 2: Tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: "40px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#1F2937",
            color: "white",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 60,
          }}
        >
          Switch Apps
          <div
            style={{
              position: "absolute",
              left: "-4px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderRight: "4px solid #1F2937",
            }}
          />
        </div>
      )}
    </div>
  );
}

// Chat History Button with WhatsApp Indicator
function ChatHistoryButton({ 
  connected, 
  phoneNumber, 
  onClick 
}: { 
  connected: boolean;
  phoneNumber: string | null;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const tooltipText = connected && phoneNumber
    ? `WhatsApp: ${phoneNumber}`
    : "Chat History";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 0",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div style={{ 
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: connected ? "2px solid #10B981" : "none",
        background: hovered ? "rgba(37, 99, 235, 0.1)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        color: connected ? "#10B981" : "#6B7280",
      }}>
        <MessageSquare size={20} />
      </div>

      {/* ⭐ Task 2: Tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: "72px",
            background: "#1F2937",
            color: "white",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 60,
          }}
        >
          {tooltipText}
          <div
            style={{
              position: "absolute",
              left: "-4px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderRight: "4px solid #1F2937",
            }}
          />
        </div>
      )}
    </div>
  );
}

// Upgrade Button Component
function UpgradeButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 0",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div style={{ 
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: hovered 
          ? "linear-gradient(135deg, #374151 0%, #1F2937 100%)" 
          : "#1F2937",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        color: "white",
        boxShadow: hovered 
          ? "0 4px 12px rgba(0, 0, 0, 0.4)" 
          : "0 2px 8px rgba(0, 0, 0, 0.3)",
        transform: hovered ? "scale(1.05)" : "scale(1)",
      }}>
        <Rocket size={20} />
      </div>

      {/* ⭐ Task 2: Tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: "72px",
            background: "#1F2937",
            color: "white",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 60,
          }}
        >
          Upgrade Plan
          <div
            style={{
              position: "absolute",
              left: "-4px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderRight: "4px solid #1F2937",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ⭐ UPDATED: Task 2 - Icon Button with Tooltip
function IconButton({ 
  icon, 
  label, 
  tooltip,
  onClick,
  isActive = false,
}: { 
  icon: React.ReactNode; 
  label: string; 
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 0",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div style={{ 
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: isActive 
          ? "rgba(37, 99, 235, 0.15)" 
          : hovered 
            ? "rgba(37, 99, 235, 0.1)" 
            : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s",
        color: isActive ? "#2563EB" : "#6B7280",
      }}>
        {icon}
      </div>

      {/* ⭐ Task 2: Tooltip */}
      {hovered && (
        <div
          style={{
            position: "absolute",
            left: "72px",
            background: "#1F2937",
            color: "white",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 60,
          }}
        >
          {tooltip}
          <div
            style={{
              position: "absolute",
              left: "-4px",
              top: "50%",
              transform: "translateY(-50%)",
              width: 0,
              height: 0,
              borderTop: "4px solid transparent",
              borderBottom: "4px solid transparent",
              borderRight: "4px solid #1F2937",
            }}
          />
        </div>
      )}
    </div>
  );
}
