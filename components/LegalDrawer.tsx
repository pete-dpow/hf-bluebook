/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useRef } from "react";
import { X, Shield, Download, Trash2, Loader2, Check, Cookie } from "lucide-react";
import { supabase } from "@/lib/supabase";

// ⭐ Task 34: Cookie consent state
const COOKIE_CONSENT_KEY = "dpow_cookie_consent";
const COOKIE_CONSENT_VERSION = "1.0";

interface CookieConsent {
  version: string;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export default function LegalDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("privacy");
  const [forceSection, setForceSection] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // ⭐ Task 34: Cookie consent state
  const [cookieConsent, setCookieConsent] = useState<CookieConsent | null>(null);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  // ⭐ Task 38/39: GDPR action states
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check auth and cookie consent on mount
  useEffect(() => {
    checkAuth();
    checkCookieConsent();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  }

  // ⭐ Task 34: Check if cookie consent needed
  function checkCookieConsent() {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const consent = JSON.parse(stored) as CookieConsent;
        if (consent.version === COOKIE_CONSENT_VERSION) {
          setCookieConsent(consent);
          return;
        }
      } catch (e) {
        // Invalid consent, show banner
      }
    }
    // No valid consent - show banner after brief delay
    setTimeout(() => {
      setShowCookieBanner(true);
      setIsOpen(true);
      setForceSection("cookies");
      setActiveSection("cookies");
    }, 1500);
  }

  // ⭐ Task 34: Save cookie consent
  function saveCookieConsent(analytics: boolean, marketing: boolean) {
    const consent: CookieConsent = {
      version: COOKIE_CONSENT_VERSION,
      essential: true, // Always required
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setCookieConsent(consent);
    setShowCookieBanner(false);
    setForceSection(null);
    setIsOpen(false);
  }

  // Listen for trigger - use custom event
  useEffect(() => {
    const handleOpen = () => {
      setForceSection(null);
      setIsOpen(true);
    };
    
    window.addEventListener("openLegalDrawer", handleOpen);
    return () => window.removeEventListener("openLegalDrawer", handleOpen);
  }, []);

  // Section scroll tracking
  useEffect(() => {
    if (!isOpen || !contentRef.current || forceSection) return;

    const handleScroll = () => {
      const sections = contentRef.current?.querySelectorAll("[data-section]");
      if (!sections) return;

      let currentSection = "privacy";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.getAttribute("data-section") || "privacy";
        }
      });
      setActiveSection(currentSection);
    };

    const content = contentRef.current;
    content?.addEventListener("scroll", handleScroll);
    return () => content?.removeEventListener("scroll", handleScroll);
  }, [isOpen, forceSection]);

  const handleClose = () => {
    // Don't allow closing if cookie consent required
    if (showCookieBanner && !cookieConsent) {
      return;
    }
    setIsOpen(false);
    setForceSection(null);
  };

  const scrollToSection = (sectionId: string) => {
    setForceSection(null);
    const section = document.getElementById(sectionId);
    if (section && contentRef.current) {
      const offsetTop = section.offsetTop - 100;
      contentRef.current.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  };

  // ⭐ Task 38: Export user data
  async function handleExportData() {
    if (!user) return;
    
    setExportingData(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/gdpr/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Export failed");

      const data = await response.json();
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dpow_data_export_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data. Please try again or contact support.");
    } finally {
      setExportingData(false);
    }
  }

  // ⭐ Task 39: Delete account
  async function handleDeleteAccount() {
    if (!user) return;
    
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("/api/gdpr/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) throw new Error("Deletion failed");

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = "/?deleted=true";

    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete account. Please contact support at crane@dpow.co.uk");
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  }

  if (!isOpen) {
    return null;
  }

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
          cursor: showCookieBanner && !cookieConsent ? "not-allowed" : "pointer",
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Shield size={20} color="#2563EB" />
              Legal & Privacy
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
              Your rights and our policies
            </p>
          </div>

          <nav style={{ flex: 1, padding: "1rem 0", overflowY: "auto" }}>
            <NavItem
              active={activeSection === "privacy"}
              onClick={() => scrollToSection("privacy")}
              label="Privacy Policy"
            />
            <NavItem
              active={activeSection === "terms"}
              onClick={() => scrollToSection("terms")}
              label="Terms of Service"
            />
            <NavItem
              active={activeSection === "cookies"}
              onClick={() => scrollToSection("cookies")}
              label="Cookie Settings"
              highlight={showCookieBanner && !cookieConsent}
            />
            <NavItem
              active={activeSection === "gdpr"}
              onClick={() => scrollToSection("gdpr")}
              label="Your Data (GDPR)"
            />
          </nav>

          {/* Version info */}
          <div style={{ 
            padding: "1rem 1.5rem", 
            borderTop: "1px solid #E5E7EB",
            fontSize: "11px",
            color: "#9CA3AF",
          }}>
            Last updated: November 2025
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
                Legal & Privacy
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
                dpow.chat by DPOW Ltd
              </p>
            </div>
            {!(showCookieBanner && !cookieConsent) && (
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
            )}
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
            <LegalContent 
              forceSection={forceSection}
              cookieConsent={cookieConsent}
              showCookieBanner={showCookieBanner}
              onAcceptCookies={saveCookieConsent}
              user={user}
              exportingData={exportingData}
              onExportData={handleExportData}
              deletingAccount={deletingAccount}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              onDeleteAccount={handleDeleteAccount}
            />
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
      `}</style>
    </>
  );
}

function NavItem({
  active,
  onClick,
  label,
  highlight = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  highlight?: boolean;
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
        background: highlight 
          ? "rgba(245, 158, 11, 0.15)" 
          : active 
            ? "rgba(37, 99, 235, 0.1)" 
            : hovered 
              ? "rgba(0,0,0,0.03)" 
              : "transparent",
        border: "none",
        borderLeft: active ? "3px solid #2563EB" : highlight ? "3px solid #F59E0B" : "3px solid transparent",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "left",
        fontFamily: "var(--font-ibm-plex)",
        fontSize: "14px",
        fontWeight: active || highlight ? 600 : 400,
        color: highlight ? "#D97706" : active ? "#2563EB" : "#374151",
      }}
    >
      {label}
      {highlight && (
        <span style={{
          marginLeft: "auto",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#F59E0B",
          animation: "pulse 2s infinite",
        }} />
      )}
    </button>
  );
}

function LegalContent({
  forceSection,
  cookieConsent,
  showCookieBanner,
  onAcceptCookies,
  user,
  exportingData,
  onExportData,
  deletingAccount,
  showDeleteConfirm,
  setShowDeleteConfirm,
  onDeleteAccount,
}: {
  forceSection: string | null;
  cookieConsent: CookieConsent | null;
  showCookieBanner: boolean;
  onAcceptCookies: (analytics: boolean, marketing: boolean) => void;
  user: any;
  exportingData: boolean;
  onExportData: () => void;
  deletingAccount: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  onDeleteAccount: () => void;
}) {
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      
      {/* ==========================================
          SECTION 1: PRIVACY POLICY (Task 32)
          ========================================== */}
      <section id="privacy" data-section="privacy" style={{ marginBottom: "4rem" }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "2.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "0 0 1rem 0",
        }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#9CA3AF", margin: "0 0 2rem 0" }}>
          Effective Date: November 2025 | Version 1.0
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          1. Who We Are
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          dpow.chat is operated by <strong>DPOW Ltd</strong>, a company registered in England and Wales. 
          We are committed to protecting your privacy and handling your data in an open and transparent manner.
        </p>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          <strong>Data Controller:</strong> DPOW Ltd<br />
          <strong>Contact:</strong> crane@dpow.co.uk
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          2. What Data We Collect
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          We collect the following categories of personal data:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li><strong>Account Information:</strong> Email address, name (if provided)</li>
          <li><strong>Project Data:</strong> Files you upload, chat history, project names</li>
          <li><strong>Usage Data:</strong> How you interact with our service</li>
          <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
          <li><strong>Communication Data:</strong> Support requests, feedback</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          3. How We Use Your Data
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          We use your data to:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li>Provide and improve our AI-powered construction assistant</li>
          <li>Process your queries and generate responses</li>
          <li>Store your projects and chat history</li>
          <li>Send service-related communications</li>
          <li>Ensure security and prevent fraud</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          4. Legal Basis for Processing (GDPR)
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          We process your data under the following legal bases:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li><strong>Contract:</strong> To provide the service you've signed up for</li>
          <li><strong>Legitimate Interest:</strong> To improve our services and ensure security</li>
          <li><strong>Consent:</strong> For optional analytics and marketing (you can withdraw anytime)</li>
          <li><strong>Legal Obligation:</strong> To comply with applicable laws</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          5. Data Sharing
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          We share your data with:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li><strong>OpenAI:</strong> To process your queries (data is not used for training)</li>
          <li><strong>Supabase:</strong> Database hosting (EU servers)</li>
          <li><strong>Vercel:</strong> Application hosting</li>
          <li><strong>Twilio:</strong> WhatsApp integration (if enabled)</li>
          <li><strong>Microsoft:</strong> OneDrive/SharePoint integration (if connected)</li>
        </ul>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "1rem 0" }}>
          We do not sell your personal data to third parties.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          6. Data Retention
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          We retain your data for as long as your account is active. When you delete your account, 
          we delete your personal data within 30 days, except where we need to retain it for legal purposes.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          7. Your Rights
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          Under GDPR, you have the right to:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li><strong>Access:</strong> Request a copy of your data</li>
          <li><strong>Rectification:</strong> Correct inaccurate data</li>
          <li><strong>Erasure:</strong> Request deletion of your data</li>
          <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
          <li><strong>Restriction:</strong> Limit how we process your data</li>
          <li><strong>Objection:</strong> Object to certain processing</li>
          <li><strong>Withdraw Consent:</strong> Change your cookie preferences anytime</li>
        </ul>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "1rem 0" }}>
          Exercise your rights in the "Your Data" section below, or contact us at crane@dpow.co.uk.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          8. International Transfers
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Some of our service providers are based outside the UK/EEA. Where we transfer data internationally, 
          we ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the EU Commission.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          9. Contact & Complaints
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          For privacy inquiries, contact us at <a href="mailto:crane@dpow.co.uk" style={{ color: "#2563EB" }}>crane@dpow.co.uk</a>.
        </p>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          You also have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) 
          at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB" }}>ico.org.uk</a>.
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* ==========================================
          SECTION 2: TERMS OF SERVICE (Task 33)
          ========================================== */}
      <section id="terms" data-section="terms" style={{ marginBottom: "4rem" }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "2.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "0 0 1rem 0",
        }}>
          Terms of Service
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#9CA3AF", margin: "0 0 2rem 0" }}>
          Effective Date: November 2025 | Version 1.0
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          1. Acceptance of Terms
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          By accessing or using dpow.chat, you agree to be bound by these Terms of Service. 
          If you do not agree to these terms, please do not use our service.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          2. Description of Service
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          dpow.chat is an AI-powered assistant for construction and project management professionals. 
          The service allows you to upload project data (Excel files) and query it using natural language, 
          combined with construction industry knowledge.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          3. Account Registration
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          To access certain features, you must create an account. You agree to:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li>Provide accurate and complete information</li>
          <li>Keep your account credentials secure</li>
          <li>Notify us immediately of any unauthorized access</li>
          <li>Be responsible for all activity under your account</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          4. Acceptable Use
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          You agree not to:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li>Use the service for any illegal purpose</li>
          <li>Upload malicious content or malware</li>
          <li>Attempt to gain unauthorized access</li>
          <li>Interfere with or disrupt the service</li>
          <li>Reverse engineer or copy the service</li>
          <li>Use automated systems to access the service excessively</li>
          <li>Upload content that infringes intellectual property rights</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          5. Your Content
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          You retain ownership of all data and content you upload to dpow.chat. 
          By uploading content, you grant us a limited license to process it solely for the purpose of providing the service.
        </p>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          You are responsible for ensuring you have the right to upload and process any data you submit.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          6. AI-Generated Content
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          dpow.chat uses artificial intelligence to generate responses. While we strive for accuracy, 
          AI-generated content may contain errors or inaccuracies. You should:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 1rem 0" }}>
          <li>Verify critical information independently</li>
          <li>Not rely solely on AI responses for safety-critical decisions</li>
          <li>Use professional judgment in all construction matters</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          7. Subscription & Payment
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Some features require a paid subscription. By subscribing, you agree to pay the applicable fees. 
          Subscriptions renew automatically unless cancelled. Refunds are provided in accordance with our refund policy.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          8. Limitation of Liability
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          To the maximum extent permitted by law, DPOW Ltd shall not be liable for any indirect, 
          incidental, special, consequential, or punitive damages, including loss of profits, data, 
          or business opportunities arising from your use of the service.
        </p>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          9. Indemnification
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          You agree to indemnify and hold harmless DPOW Ltd from any claims, damages, or expenses 
          arising from your use of the service or violation of these terms.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          10. Termination
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          We may suspend or terminate your access to the service at any time for violation of these terms 
          or for any other reason with notice. You may terminate your account at any time through the account settings.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          11. Governing Law
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          These terms are governed by the laws of England and Wales. Any disputes shall be resolved 
          in the courts of England and Wales.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          12. Changes to Terms
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          We may update these terms from time to time. We will notify you of material changes via email 
          or through the service. Continued use after changes constitutes acceptance of the new terms.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          13. Contact
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          For questions about these terms, contact us at <a href="mailto:crane@dpow.co.uk" style={{ color: "#2563EB" }}>crane@dpow.co.uk</a>.
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* ==========================================
          SECTION 3: COOKIE SETTINGS (Task 34, 40)
          ========================================== */}
      <section id="cookies" data-section="cookies" style={{ marginBottom: "4rem" }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "2.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "0 0 1rem 0",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <Cookie size={32} color="#F59E0B" />
          Cookie Settings
        </h1>
        
        {/* ⭐ Task 34: Cookie Consent Banner */}
        {showCookieBanner && !cookieConsent && (
          <div style={{
            background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
            border: "2px solid #F59E0B",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "2rem",
          }}>
            <h3 style={{
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#92400E",
              margin: "0 0 12px 0",
            }}>
              🍪 We use cookies
            </h3>
            <p style={{ lineHeight: 1.6, color: "#78350F", margin: "0 0 16px 0" }}>
              We use essential cookies to make dpow.chat work. We'd also like to set optional cookies 
              to help us improve the service and show you relevant content.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => onAcceptCookies(true, true)}
                style={{
                  padding: "10px 20px",
                  background: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Check size={16} />
                Accept All
              </button>
              <button
                onClick={() => onAcceptCookies(false, false)}
                style={{
                  padding: "10px 20px",
                  background: "white",
                  color: "#374151",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontWeight: 500,
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Essential Only
              </button>
            </div>
          </div>
        )}

        {/* Current consent status */}
        {cookieConsent && (
          <div style={{
            background: "#D1FAE5",
            border: "1px solid #6EE7B7",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}>
            <Check size={20} color="#059669" />
            <div>
              <p style={{ margin: 0, fontWeight: 500, color: "#065F46" }}>
                Cookie preferences saved
              </p>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#047857" }}>
                Last updated: {new Date(cookieConsent.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          What are cookies?
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Cookies are small text files stored on your device when you visit a website. 
          They help the site remember your preferences and understand how you use it.
        </p>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          Types of cookies we use
        </h2>

        {/* Essential Cookies */}
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "12px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 600, color: "#1F2937" }}>
                Essential Cookies
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>
                Required for the service to function (login, preferences)
              </p>
            </div>
            <div style={{
              padding: "4px 12px",
              background: "#DBEAFE",
              color: "#1D4ED8",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
            }}>
              Always On
            </div>
          </div>
        </div>

        {/* Analytics Cookies */}
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "12px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 600, color: "#1F2937" }}>
                Analytics Cookies
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>
                Help us understand how you use dpow.chat to improve the service
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={cookieConsent?.analytics ?? analyticsConsent}
                onChange={(e) => setAnalyticsConsent(e.target.checked)}
                disabled={!!cookieConsent}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </label>
          </div>
        </div>

        {/* Marketing Cookies */}
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "12px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 600, color: "#1F2937" }}>
                Marketing Cookies
              </h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#6B7280" }}>
                Allow us to show you relevant content and measure ad effectiveness
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={cookieConsent?.marketing ?? marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                disabled={!!cookieConsent}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
            </label>
          </div>
        </div>

        {/* Update preferences button */}
        {cookieConsent && (
          <button
            onClick={() => {
              localStorage.removeItem(COOKIE_CONSENT_KEY);
              window.location.reload();
            }}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              background: "white",
              color: "#374151",
              border: "1px solid #D1D5DB",
              borderRadius: "8px",
              fontWeight: 500,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Update Cookie Preferences
          </button>
        )}

        {!cookieConsent && !showCookieBanner && (
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button
              onClick={() => onAcceptCookies(analyticsConsent, marketingConsent)}
              style={{
                padding: "10px 20px",
                background: "#2563EB",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Save Preferences
            </button>
          </div>
        )}
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* ==========================================
          SECTION 4: YOUR DATA / GDPR (Task 35-39)
          ========================================== */}
      <section id="gdpr" data-section="gdpr" style={{ marginBottom: "4rem" }}>
        <h1 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "2.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "0 0 1rem 0",
        }}>
          Your Data (GDPR)
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
          Exercise your data rights under GDPR and UK data protection law.
        </p>

        {!user && (
          <div style={{
            background: "#FEF3C7",
            border: "1px solid #FCD34D",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "2rem",
          }}>
            <p style={{ margin: 0, color: "#92400E" }}>
              <strong>Sign in required</strong> - You must be signed in to access your data or delete your account.
            </p>
          </div>
        )}

        {/* ⭐ Task 38: Export Data */}
        <div style={{
          background: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              background: "#DBEAFE",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Download size={24} color="#2563EB" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.125rem", fontWeight: 600, color: "#1F2937" }}>
                Export Your Data
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#6B7280", lineHeight: 1.6 }}>
                Download a copy of all your personal data, including your profile, projects, chat history, 
                and preferences in a machine-readable JSON format.
              </p>
              <button
                onClick={onExportData}
                disabled={!user || exportingData}
                style={{
                  padding: "10px 20px",
                  background: user ? "#2563EB" : "#9CA3AF",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: user ? "pointer" : "not-allowed",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: exportingData ? 0.7 : 1,
                }}
              >
                {exportingData ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export My Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ⭐ Task 39: Delete Account */}
        <div style={{
          background: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              background: "#FEE2E2",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Trash2 size={24} color="#DC2626" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "1.125rem", fontWeight: 600, color: "#991B1B" }}>
                Delete Your Account
              </h3>
              <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#7F1D1D", lineHeight: 1.6 }}>
                Permanently delete your account and all associated data. This action cannot be undone. 
                Your projects, chat history, and all personal information will be erased.
              </p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!user}
                  style={{
                    padding: "10px 20px",
                    background: user ? "#DC2626" : "#9CA3AF",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: user ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Trash2 size={16} />
                  Delete My Account
                </button>
              ) : (
                <div style={{
                  background: "#FEE2E2",
                  border: "1px solid #F87171",
                  borderRadius: "8px",
                  padding: "16px",
                }}>
                  <p style={{ margin: "0 0 12px 0", fontWeight: 600, color: "#991B1B" }}>
                    ⚠️ Are you absolutely sure?
                  </p>
                  <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#7F1D1D" }}>
                    This will permanently delete your account, all projects, and all data. 
                    This cannot be undone.
                  </p>
                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={onDeleteAccount}
                      disabled={deletingAccount}
                      style={{
                        padding: "10px 20px",
                        background: "#991B1B",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        opacity: deletingAccount ? 0.7 : 1,
                      }}
                    >
                      {deletingAccount ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Yes, Delete Everything"
                      )}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deletingAccount}
                      style={{
                        padding: "10px 20px",
                        background: "white",
                        color: "#374151",
                        border: "1px solid #D1D5DB",
                        borderRadius: "8px",
                        fontWeight: 500,
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Processing Info */}
        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "3rem 0 1rem 0",
        }}>
          How We Process Your Data
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          When you use dpow.chat, your data is processed as follows:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>Uploaded Files:</strong> Stored securely in our database, processed by AI only when you send a query</li>
          <li><strong>Chat Messages:</strong> Sent to OpenAI for processing, not stored by OpenAI for training</li>
          <li><strong>Account Data:</strong> Stored in Supabase (EU region)</li>
          <li><strong>WhatsApp Messages:</strong> Processed via Twilio, stored in our database</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          Data Retention
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>Active Accounts:</strong> Data retained while account is active</li>
          <li><strong>Deleted Accounts:</strong> All data erased within 30 days</li>
          <li><strong>Archived Projects:</strong> Retained until you permanently delete them</li>
          <li><strong>Backup Data:</strong> Removed from backups within 90 days of deletion</li>
        </ul>

        <h2 style={{
          fontFamily: "var(--font-cormorant)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#1F2937",
          margin: "2rem 0 1rem 0",
        }}>
          Contact the Data Protection Officer
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          For data protection inquiries, contact us at:<br />
          <a href="mailto:crane@dpow.co.uk" style={{ color: "#2563EB", fontWeight: 500 }}>crane@dpow.co.uk</a>
        </p>
      </section>
    </div>
  );
}
