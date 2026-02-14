"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { X, Loader2, Check, ExternalLink, Download, Trash2 } from "lucide-react";

// Token limits per tier
const TOKEN_LIMITS: Record<string, number> = {
  free: 50000,
  pro: 500000,
  "pro+": 2000000,
};

export default function SettingsDrawer() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("profile");
  const contentRef = useRef<HTMLDivElement>(null);
  
  // User data
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [tokensUsed, setTokensUsed] = useState(0);
  const [memberSince, setMemberSince] = useState("");
  
  // Action states
  const [saving, setSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  
  // Preferences
  const [defaultAIMode, setDefaultAIMode] = useState("auto");
  const [theme, setTheme] = useState("system");

  // Listen for open event
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("openSettingsDrawer", handleOpen);
    return () => window.removeEventListener("openSettingsDrawer", handleOpen);
  }, []);

  // Load user data when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadUserData();
      loadPreferences();
    }
  }, [isOpen]);

  // Scroll tracking
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;

    const handleScroll = () => {
      const sections = contentRef.current?.querySelectorAll("[data-section]");
      if (!sections) return;

      let currentSection = "profile";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.getAttribute("data-section") || "profile";
        }
      });
      setActiveSection(currentSection);
    };

    const content = contentRef.current;
    content?.addEventListener("scroll", handleScroll);
    return () => content?.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  async function loadUserData() {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      setUser(authUser);

      const { data } = await supabase
        .from("users")
        .select("display_name, subscription_tier, tokens_used, created_at")
        .eq("id", authUser.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || authUser.email?.split("@")[0] || "");
        setSubscriptionTier(data.subscription_tier || "free");
        setTokensUsed(data.tokens_used || 0);
        setMemberSince(
          data.created_at
            ? new Date(data.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
            : "Unknown"
        );
      }
    } catch (err) {
      console.error("Failed to load user data:", err);
    } finally {
      setLoading(false);
    }
  }

  function loadPreferences() {
    const savedMode = localStorage.getItem("dpow_default_ai_mode");
    const savedTheme = localStorage.getItem("dpow_theme");
    if (savedMode) setDefaultAIMode(savedMode);
    if (savedTheme) setTheme(savedTheme);
  }

  function savePreference(key: string, value: string) {
    localStorage.setItem(key, value);
  }

  async function handleSaveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ display_name: displayName })
        .eq("id", user.id);

      if (error) throw error;
      alert("✅ Profile updated!");
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in first");
        return;
      }

      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create portal session");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Billing portal error:", err);
      alert(`❌ ${err.message}`);
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleExportData() {
    setExportLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in first");
        return;
      }

      const res = await fetch("/api/gdpr/export", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dpow-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert("✅ Data exported successfully!");
    } catch (err: any) {
      console.error("Export error:", err);
      alert(`❌ ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeleteAccount() {
    const confirm1 = window.confirm(
      "⚠️ DELETE ACCOUNT?\n\nThis will permanently delete:\n- All your projects\n- All your files\n- All your chat history\n- Your account\n\nThis action CANNOT be undone."
    );

    if (!confirm1) return;

    const confirm2 = window.prompt('Type "DELETE" to confirm account deletion:');

    if (confirm2 !== "DELETE") {
      alert("Account deletion cancelled.");
      return;
    }

    setDeleteLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in first");
        return;
      }

      const res = await fetch("/api/gdpr/delete-account", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Deletion failed");
      }

      alert("✅ Account deleted. You will be signed out.");
      await supabase.auth.signOut();
      router.push("/");
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(`❌ ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  }

  const handleClose = () => setIsOpen(false);

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section && contentRef.current) {
      const offsetTop = section.offsetTop - 100;
      contentRef.current.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  };

  if (!isOpen) return null;

  const tier = subscriptionTier?.toLowerCase() || "free";
  const tokenLimit = TOKEN_LIMITS[tier] || TOKEN_LIMITS.free;
  const usagePercent = Math.min((tokensUsed / tokenLimit) * 100, 100);
  const isFreeTier = tier === "free";

  const formatTokens = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toLocaleString();
  };

  const initials = (displayName || user?.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.3)",
          zIndex: 45,
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: "64px",
          height: "100vh",
          width: "70vw",
          background: "#FCFCFA",
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.1)",
          zIndex: 50,
          display: "flex",
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        {/* Sidebar Navigation */}
        <div
          style={{
            width: "240px",
            borderRight: "1px solid #E5E7EB",
            background: "#FAFAFA",
            padding: "1.5rem 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "0 1.5rem 1.5rem", borderBottom: "1px solid #E5E7EB" }}>
            <h3
              style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#2A2A2A",
                margin: 0,
              }}
            >
              Settings
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
              Account & preferences
            </p>
          </div>

          <nav style={{ flex: 1, padding: "1rem 0", overflowY: "auto" }}>
            <NavItem
              active={activeSection === "profile"}
              onClick={() => scrollToSection("profile")}
              label="Profile"
            />
            <NavItem
              active={activeSection === "subscription"}
              onClick={() => scrollToSection("subscription")}
              label="Subscription"
            />
            <NavItem
              active={activeSection === "integrations"}
              onClick={() => scrollToSection("integrations")}
              label="Integrations"
            />
            <NavItem
              active={activeSection === "preferences"}
              onClick={() => scrollToSection("preferences")}
              label="Preferences"
            />
            <NavItem
              active={activeSection === "privacy"}
              onClick={() => scrollToSection("privacy")}
              label="Data & Privacy"
            />
          </nav>

          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #E5E7EB", fontSize: "11px", color: "#9CA3AF" }}>
            dpow.chat v1.0
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1.5rem 2rem",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  color: "#2A2A2A",
                  margin: 0,
                }}
              >
                Settings
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
                Manage your account and preferences
              </p>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <X size={24} color="#6B7280" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "3rem 4rem",
              fontFamily: "var(--font-ibm-plex)",
            }}
          >
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                <Loader2 size={32} style={{ color: "#6B7280", animation: "spin 1s linear infinite" }} />
              </div>
            ) : (
              <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                {/* Profile Section */}
                <section id="profile" data-section="profile" style={{ marginBottom: "4rem" }}>
                  <h1
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: "2.5rem",
                      fontWeight: 600,
                      color: "#1F2937",
                      margin: "0 0 1rem 0",
                      lineHeight: 1.2,
                    }}
                  >
                    Profile
                  </h1>
                  <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
                    Manage your personal information and account details.
                  </p>

                  {/* Avatar */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem" }}>
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "white",
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#2A2A2A" }}>
                        {displayName || "User"}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#6B7280" }}>
                        Member since {memberSince}
                      </div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "0.5rem" }}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{
                        width: "100%",
                        maxWidth: "400px",
                        padding: "12px 16px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontFamily: "var(--font-ibm-plex)",
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div style={{ marginBottom: "2rem" }}>
                    <label style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "0.5rem" }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      readOnly
                      style={{
                        width: "100%",
                        maxWidth: "400px",
                        padding: "12px 16px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "1rem",
                        fontFamily: "var(--font-ibm-plex)",
                        background: "#F9FAFB",
                        color: "#6B7280",
                      }}
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={{
                      padding: "12px 24px",
                      background: saving ? "#E5E7EB" : "#2563EB",
                      color: saving ? "#9CA3AF" : "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "1rem",
                      fontWeight: 500,
                      cursor: saving ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {saving ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={18} />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </section>

                <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

                {/* Subscription Section */}
                <section id="subscription" data-section="subscription" style={{ marginBottom: "4rem" }}>
                  <h1
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: "2.5rem",
                      fontWeight: 600,
                      color: "#1F2937",
                      margin: "0 0 1rem 0",
                    }}
                  >
                    Subscription
                  </h1>
                  <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
                    Manage your subscription plan and billing.
                  </p>

                  {/* Current Plan */}
                  <div
                    style={{
                      padding: "1.5rem",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                      background: "white",
                      marginBottom: "2rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.875rem", color: "#6B7280", marginBottom: "0.25rem" }}>Current Plan</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "#2A2A2A", textTransform: "uppercase" }}>
                          {tier === "pro+" ? "PRO+" : tier}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "6px 12px",
                          borderRadius: "20px",
                          background: isFreeTier ? "#F3F4F6" : "#DCFCE7",
                          color: isFreeTier ? "#6B7280" : "#166534",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                        }}
                      >
                        {isFreeTier ? "Free" : "Active"}
                      </div>
                    </div>

                    {/* Token Usage */}
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.875rem", color: "#6B7280" }}>Token Usage</span>
                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: usagePercent >= 80 ? "#DC2626" : "#374151" }}>
                          {formatTokens(tokensUsed)} / {formatTokens(tokenLimit)}
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          borderRadius: "4px",
                          background: "#E5E7EB",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${usagePercent}%`,
                            height: "100%",
                            borderRadius: "4px",
                            background: usagePercent >= 80 ? "#DC2626" : "#2563EB",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>

                    {/* Upgrade or Manage */}
                    {isFreeTier ? (
                      <button
                        onClick={() => router.push("/pricing")}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "#2563EB",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "1rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        Upgrade to Pro
                      </button>
                    ) : (
                      <button
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "white",
                          color: "#374151",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          fontSize: "1rem",
                          fontWeight: 500,
                          cursor: portalLoading ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                        }}
                      >
                        {portalLoading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <ExternalLink size={18} />}
                        {portalLoading ? "Loading..." : "Manage Billing"}
                      </button>
                    )}
                  </div>

                  {/* Plan Comparison */}
                  <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", fontWeight: 600, color: "#1F2937", margin: "2rem 0 1rem 0" }}>
                    Compare Plans
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <PlanRow name="Free" tokens="50k" price="£0" current={tier === "free"} />
                    <PlanRow name="Pro" tokens="500k" price="£25/mo" current={tier === "pro"} />
                    <PlanRow name="Pro+" tokens="2M" price="£50/mo" current={tier === "pro+"} />
                  </div>
                </section>

                <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

                {/* Integrations Section */}
                <section id="integrations" data-section="integrations" style={{ marginBottom: "4rem" }}>
                  <h1
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: "2.5rem",
                      fontWeight: 600,
                      color: "#1F2937",
                      margin: "0 0 1rem 0",
                    }}
                  >
                    Integrations
                  </h1>
                  <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
                    Connect external services to enhance your dpow.chat experience.
                  </p>

                  <SharePointConfigSection />

                  <IntegrationCard
                    name="WhatsApp Business"
                    description="Get a dedicated WhatsApp number for your organisation"
                    status={isFreeTier ? "pro-only" : "configure"}
                    color="#25D366"
                  />
                  <IntegrationCard
                    name="OpenAI API Key"
                    description="Bring your own OpenAI API key for unlimited usage"
                    status="coming-soon"
                    color="#10A37F"
                  />
                  <IntegrationCard
                    name="Claude API Key"
                    description="Connect your Anthropic API key for Claude models"
                    status="coming-soon"
                    color="#8B5CF6"
                  />
                </section>

                <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

                {/* Preferences Section */}
                <section id="preferences" data-section="preferences" style={{ marginBottom: "4rem" }}>
                  <h1
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: "2.5rem",
                      fontWeight: 600,
                      color: "#1F2937",
                      margin: "0 0 1rem 0",
                    }}
                  >
                    Preferences
                  </h1>
                  <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
                    Customise your dpow.chat experience.
                  </p>

                  {/* Default AI Mode */}
                  <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", fontWeight: 600, color: "#1F2937", margin: "0 0 1rem 0" }}>
                    Default AI Mode
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
                    {[
                      { id: "auto", label: "Auto", desc: "AI decides the best mode" },
                      { id: "general", label: "General", desc: "Industry knowledge only" },
                      { id: "project", label: "Project", desc: "Your data only" },
                      { id: "both", label: "Both", desc: "Combined responses" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setDefaultAIMode(mode.id);
                          savePreference("dpow_default_ai_mode", mode.id);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          borderRadius: "8px",
                          border: defaultAIMode === mode.id ? "2px solid #2563EB" : "1px solid #E5E7EB",
                          background: defaultAIMode === mode.id ? "rgba(37, 99, 235, 0.05)" : "white",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "1rem", fontWeight: 500, color: "#2A2A2A" }}>{mode.label}</div>
                          <div style={{ fontSize: "0.875rem", color: "#6B7280" }}>{mode.desc}</div>
                        </div>
                        {defaultAIMode === mode.id && <Check size={20} style={{ color: "#2563EB" }} />}
                      </button>
                    ))}
                  </div>

                  {/* Theme */}
                  <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "1.5rem", fontWeight: 600, color: "#1F2937", margin: "0 0 1rem 0" }}>
                    Theme
                  </h2>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    {[
                      { id: "light", label: "Light" },
                      { id: "dark", label: "Dark" },
                      { id: "system", label: "System" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          savePreference("dpow_theme", t.id);
                        }}
                        style={{
                          flex: 1,
                          padding: "16px",
                          borderRadius: "8px",
                          border: theme === t.id ? "2px solid #2563EB" : "1px solid #E5E7EB",
                          background: theme === t.id ? "rgba(37, 99, 235, 0.05)" : "white",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: theme === t.id ? "#2563EB" : "#6B7280",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </section>

                <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

                {/* Privacy Section */}
                <section id="privacy" data-section="privacy" style={{ marginBottom: "4rem" }}>
                  <h1
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontSize: "2.5rem",
                      fontWeight: 600,
                      color: "#1F2937",
                      margin: "0 0 1rem 0",
                    }}
                  >
                    Data & Privacy
                  </h1>
                  <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
                    Manage your data and privacy settings.
                  </p>

                  {/* Export Data */}
                  <div
                    style={{
                      padding: "1.5rem",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                      background: "white",
                      marginBottom: "1rem",
                    }}
                  >
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#2A2A2A", margin: "0 0 0.5rem 0" }}>
                      Export Your Data
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0 0 1rem 0" }}>
                      Download all your data including projects, files, and chat history in JSON format.
                    </p>
                    <button
                      onClick={handleExportData}
                      disabled={exportLoading}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(37, 99, 235, 0.1)",
                        color: "#2563EB",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: exportLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {exportLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={16} />}
                      {exportLoading ? "Exporting..." : "Export Data"}
                    </button>
                  </div>

                  {/* Legal Links */}
                  <div
                    style={{
                      padding: "1.5rem",
                      borderRadius: "12px",
                      border: "1px solid #E5E7EB",
                      background: "white",
                      marginBottom: "1rem",
                    }}
                  >
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#2A2A2A", margin: "0 0 1rem 0" }}>
                      Legal Documents
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <LegalLink label="Privacy Policy" onClick={() => window.dispatchEvent(new CustomEvent("openLegalDrawer"))} />
                      <LegalLink label="Terms of Service" onClick={() => window.dispatchEvent(new CustomEvent("openLegalDrawer"))} />
                      <LegalLink label="Cookie Policy" onClick={() => window.dispatchEvent(new CustomEvent("openLegalDrawer"))} />
                    </div>
                  </div>

                  {/* Delete Account */}
                  <div
                    style={{
                      padding: "1.5rem",
                      borderRadius: "12px",
                      border: "1px solid #FEE2E2",
                      background: "rgba(254, 242, 242, 0.5)",
                    }}
                  >
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#DC2626", margin: "0 0 0.5rem 0" }}>
                      Delete Account
                    </h3>
                    <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0 0 1rem 0" }}>
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#DC2626",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        cursor: deleteLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {deleteLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={16} />}
                      {deleteLoading ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function NavItem({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        padding: "10px 1.5rem",
        background: active ? "rgba(37, 99, 235, 0.1)" : hovered ? "rgba(0,0,0,0.03)" : "transparent",
        border: "none",
        borderLeft: active ? "3px solid #2563EB" : "3px solid transparent",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "left",
        fontFamily: "var(--font-ibm-plex)",
        fontSize: "14px",
        fontWeight: active ? 600 : 400,
        color: active ? "#2563EB" : "#374151",
      }}
    >
      {label}
    </button>
  );
}

function PlanRow({ name, tokens, price, current }: { name: string; tokens: string; price: string; current: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderRadius: "8px",
        background: current ? "rgba(37, 99, 235, 0.05)" : "#F9FAFB",
        border: current ? "2px solid #2563EB" : "1px solid transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "1rem", fontWeight: 500, color: "#2A2A2A" }}>{name}</span>
        {current && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "#2563EB",
              background: "rgba(37, 99, 235, 0.1)",
              padding: "2px 8px",
              borderRadius: "4px",
            }}
          >
            CURRENT
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <span style={{ fontSize: "0.875rem", color: "#6B7280" }}>{tokens} tokens</span>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "#2A2A2A" }}>{price}</span>
      </div>
    </div>
  );
}

function IntegrationCard({ name, description, status, color }: { name: string; description: string; status: string; color: string }) {
  return (
    <div
      style={{
        padding: "1.5rem",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
        background: "white",
        marginBottom: "1rem",
        opacity: status === "coming-soon" ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: `${color}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: color,
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {name[0]}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "#2A2A2A" }}>{name}</span>
              {status === "coming-soon" && (
                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#6B7280", background: "#F3F4F6", padding: "2px 8px", borderRadius: "4px" }}>
                  COMING SOON
                </span>
              )}
              {status === "pro-only" && (
                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#F59E0B", background: "rgba(245, 158, 11, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                  PRO ONLY
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: 0 }}>{description}</p>
          </div>
        </div>
        {status === "configure" && (
          <button
            style={{
              padding: "8px 16px",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#2563EB",
              background: "rgba(37, 99, 235, 0.1)",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Configure
          </button>
        )}
      </div>
    </div>
  );
}

function SharePointConfigSection() {
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [libraries, setLibraries] = useState<{ id: string; name: string }[]>([]);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedDrive, setSelectedDrive] = useState("");
  const [configured, setConfigured] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingLibs, setLoadingLibs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }

  async function loadConfig() {
    const token = await getToken();
    const res = await fetch("/api/sharepoint/config", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setConfigured(data.configured);
      if (data.sharepoint_site_id) setSelectedSite(data.sharepoint_site_id);
      if (data.sharepoint_drive_id) setSelectedDrive(data.sharepoint_drive_id);
    }
  }

  async function loadSites() {
    setLoadingSites(true);
    const token = await getToken();
    const res = await fetch("/api/sharepoint/sites", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setSites(data.sites || []);
    }
    setLoadingSites(false);
  }

  async function loadLibraries(siteId: string) {
    setLoadingLibs(true);
    const token = await getToken();
    const res = await fetch(`/api/sharepoint/libraries?siteId=${siteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setLibraries(data.libraries || []);
    }
    setLoadingLibs(false);
  }

  async function handleSave() {
    if (!selectedSite || !selectedDrive) return;
    setSaving(true);
    const token = await getToken();
    const res = await fetch("/api/sharepoint/config", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sharepoint_site_id: selectedSite, sharepoint_drive_id: selectedDrive }),
    });
    if (res.ok) setConfigured(true);
    setSaving(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const token = await getToken();
    const res = await fetch("/api/sharepoint/test", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTestResult(data.ok ? "Connected — folders created" : data.error || "Connection failed");
    setTesting(false);
  }

  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #E5E7EB",
    fontSize: "0.875rem",
    fontFamily: "var(--font-ibm-plex)",
    background: "white",
    marginBottom: "0.75rem",
  };

  const btnStyle: React.CSSProperties = {
    padding: "8px 16px",
    fontSize: "0.875rem",
    fontWeight: 500,
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        padding: "1.5rem",
        borderRadius: "12px",
        border: configured ? "1px solid #BBF7D0" : "1px solid #E5E7EB",
        background: configured ? "rgba(187, 247, 208, 0.1)" : "white",
        marginBottom: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
        <div
          style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "rgba(0, 86, 167, 0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0056a7", fontWeight: 700, fontSize: "1rem",
          }}
        >
          S
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "1rem", fontWeight: 600, color: "#2A2A2A" }}>SharePoint</span>
            {configured && (
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "#166534", background: "#DCFCE7", padding: "2px 8px", borderRadius: "4px" }}>
                CONNECTED
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: 0 }}>
            Store quotes, product files, and Golden Thread exports in your SharePoint document library
          </p>
        </div>
      </div>

      {/* Site selector */}
      <div style={{ marginBottom: "0.5rem" }}>
        <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "0.25rem" }}>
          SharePoint Site
        </label>
        {sites.length === 0 ? (
          <button onClick={loadSites} disabled={loadingSites} style={{ ...btnStyle, color: "#2563EB", background: "rgba(37, 99, 235, 0.1)" }}>
            {loadingSites ? "Loading..." : "Load Sites"}
          </button>
        ) : (
          <select
            value={selectedSite}
            onChange={(e) => { setSelectedSite(e.target.value); setSelectedDrive(""); setLibraries([]); if (e.target.value) loadLibraries(e.target.value); }}
            style={selectStyle}
          >
            <option value="">Select a site...</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Library selector */}
      {selectedSite && (
        <div style={{ marginBottom: "0.75rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 500, color: "#374151", display: "block", marginBottom: "0.25rem" }}>
            Document Library
          </label>
          {loadingLibs ? (
            <p style={{ fontSize: "0.875rem", color: "#6B7280" }}>Loading libraries...</p>
          ) : (
            <select value={selectedDrive} onChange={(e) => setSelectedDrive(e.target.value)} style={selectStyle}>
              <option value="">Select a library...</option>
              {libraries.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {selectedSite && selectedDrive && (
          <button onClick={handleSave} disabled={saving} style={{ ...btnStyle, color: "white", background: "#0056a7" }}>
            {saving ? "Saving..." : "Save Config"}
          </button>
        )}
        {configured && (
          <button onClick={handleTest} disabled={testing} style={{ ...btnStyle, color: "#0056a7", background: "rgba(0, 86, 167, 0.1)" }}>
            {testing ? "Testing..." : "Test Connection"}
          </button>
        )}
      </div>

      {testResult && (
        <p style={{ fontSize: "0.875rem", marginTop: "0.5rem", color: testResult.includes("Connected") ? "#166534" : "#DC2626" }}>
          {testResult}
        </p>
      )}
    </div>
  );
}

function LegalLink({ label, onClick }: { label: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: "6px",
        border: "none",
        background: hovered ? "#F3F4F6" : "#F9FAFB",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        fontSize: "0.875rem",
        color: "#2A2A2A",
      }}
    >
      {label}
      <span style={{ color: "#9CA3AF" }}>→</span>
    </button>
  );
}
