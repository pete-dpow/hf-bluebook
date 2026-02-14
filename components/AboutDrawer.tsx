/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function AboutDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("what-is-dpow");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.getElementById("about-trigger");
    if (!trigger) return;
    
    const handleClick = () => {
      setIsOpen(true);
    };
    trigger.addEventListener("click", handleClick);
    
    return () => trigger.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    if (!isOpen || !contentRef.current) return;

    const handleScroll = () => {
      const sections = contentRef.current?.querySelectorAll("[data-section]");
      if (!sections) return;

      let currentSection = "what-is-dpow";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.getAttribute("data-section") || "what-is-dpow";
        }
      });
      setActiveSection(currentSection);
    };

    const content = contentRef.current;
    content?.addEventListener("scroll", handleScroll);
    return () => content?.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

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

  if (!isOpen) {
    return (
      <button id="about-trigger" style={{ display: "none" }}>
        Open About
      </button>
    );
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
              About hf.bluebook
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
              Product overview
            </p>
          </div>

          <nav style={{ flex: 1, padding: "1rem 0", overflowY: "auto" }}>
            <NavItem
              active={activeSection === "what-is-dpow"}
              onClick={() => scrollToSection("what-is-dpow")}
              label="What is hf.bluebook?"
            />
            <NavItem
              active={activeSection === "key-features"}
              onClick={() => scrollToSection("key-features")}
              label="Key Features & USP"
            />
            <NavItem
              active={activeSection === "getting-started"}
              onClick={() => scrollToSection("getting-started")}
              label="Getting Started"
            />
            <NavItem
              active={activeSection === "why-choose"}
              onClick={() => scrollToSection("why-choose")}
              label="Why Choose hf.bluebook?"
            />
            <NavItem
              active={activeSection === "technology"}
              onClick={() => scrollToSection("technology")}
              label="Technology"
            />
            <NavItem
              active={activeSection === "vision"}
              onClick={() => scrollToSection("vision")}
              label="The 8-App Vision"
            />
            <NavItem
              active={activeSection === "roadmap"}
              onClick={() => scrollToSection("roadmap")}
              label="Roadmap & Timeline"
            />
          </nav>
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
                About hf.bluebook
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
                Structured Intelligence for Project Delivery
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
            <AboutContent />
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

function AboutContent() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Section 1: What is hf.bluebook? */}
      <section id="what-is-dpow" data-section="what-is-dpow" style={{ marginBottom: "4rem" }}>
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
          What is hf.bluebook?
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
          hf.bluebook is an AI-powered construction project management platform that transforms how construction teams interact with their project data. Upload your Excel files, ask questions in plain English, and get instant, actionable answers powered by Claude AI.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Who It's For
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>Construction Directors:</strong> Make informed decisions on-site with instant access to project data via WhatsApp</li>
          <li><strong>Project Managers:</strong> Query complex datasets without navigating spreadsheets or complex UIs</li>
          <li><strong>Engineering Teams:</strong> Collaborate on shared projects with organization-scoped data and team access</li>
        </ul>

        <p style={{ fontSize: "1.125rem", color: "#374151", lineHeight: 1.7, margin: "2rem 0 0 0" }}>
          hf.bluebook is the conversational entry point to the dpow.app platform - a comprehensive 8-app construction intelligence ecosystem. Start with hf.bluebook's freemium offering, experience the power of AI-driven insights, then unlock the full platform.
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 2: Key Features & USP */}
      <section id="key-features" data-section="key-features" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Key Features & USP
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          hf.bluebook combines cutting-edge AI with practical construction workflows to deliver unmatched project intelligence.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Hybrid Knowledge Mode ⭐
        </h2>
        <p style={{ fontSize: "1.125rem", color: "#374151", lineHeight: 1.7, margin: "0 0 1.5rem 0" }}>
          <strong>Our breakthrough feature that no other construction software has.</strong> Traditional software forces you to choose between generic industry knowledge OR your specific project data. hf.bluebook intelligently combines both.
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>GENERAL:</strong> "What's UK fire door compliance?" → Industry regulations and standards</li>
          <li><strong>PROJECT:</strong> "How many fire doors on Level 3?" → Your uploaded project data</li>
          <li><strong>BOTH:</strong> "Are our fire doors compliant?" → Combined intelligent analysis</li>
        </ul>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Core Features
        </h2>

        <div style={{ margin: "1.5rem 0" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
            Excel Upload & Parsing
          </h3>
          <p style={{ lineHeight: 1.7, color: "#6B7280", margin: 0 }}>
            Upload .xlsx, .xls, or .csv files instantly. Our intelligent parser extracts structured data and makes it queryable through natural language. No complex setup or data transformation required.
          </p>
        </div>

        <div style={{ margin: "1.5rem 0" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
            AI-Powered Chat
          </h3>
          <p style={{ lineHeight: 1.7, color: "#6B7280", margin: 0 }}>
            Powered by Claude Sonnet 4.5, ask questions in plain English and get actionable answers. The AI understands construction terminology, follows up on context, and provides insights tailored to your industry.
          </p>
        </div>

        <div style={{ margin: "1.5rem 0" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
            Smart Save & Load
          </h3>
          <p style={{ lineHeight: 1.7, color: "#6B7280", margin: 0 }}>
            Save projects with complete chat history. Access from any device. Continue conversations exactly where you left off. All data encrypted and secured in your organization's workspace.
          </p>
        </div>

        <div style={{ margin: "1.5rem 0" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
            Multi-Organization Support
          </h3>
          <p style={{ lineHeight: 1.7, color: "#6B7280", margin: 0 }}>
            Create organizations, invite team members, and collaborate on shared projects. Data is scoped to organizations with role-based access control. Switch between organizations seamlessly.
          </p>
        </div>

        <div style={{ margin: "1.5rem 0" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
            WhatsApp Integration <span style={{ fontSize: "0.875rem", color: "#F59E0B" }}>(Premium)</span>
          </h3>
          <p style={{ lineHeight: 1.7, color: "#6B7280", margin: 0 }}>
            Query your projects from your phone via WhatsApp. Perfect for construction directors making decisions on-site. Active project context coming in Phase 7.7.
          </p>
        </div>

        <div style={{ margin: "1.5rem 0" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
            MS365 Integration <span style={{ fontSize: "0.875rem", color: "#6B7280" }}>(Coming Soon)</span>
          </h3>
          <p style={{ lineHeight: 1.7, color: "#6B7280", margin: 0 }}>
            Connect SharePoint, Teams, and OneDrive for seamless file access. Auto-sync project files and query documents without manual uploads. Work where your team already works.
          </p>
        </div>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 3: Getting Started */}
      <section id="getting-started" data-section="getting-started" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Getting Started
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          hf.bluebook follows a freemium model designed to deliver immediate value while scaling with your needs.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          1. Try It Free
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          <strong>No sign-up required.</strong> Upload an Excel file and start chatting immediately. Experience Hybrid Knowledge Mode with your real project data.
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          Freemium features: Upload Excel files, AI-powered chat, browser-only storage.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          2. Sign Up & Save
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Want to access your project from another device? Click "Save Project" and sign in with a magic link. No password needed.
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          Unlocked features: Save unlimited projects, access from any device, persistent chat history.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          3. Create Organization
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Working with a team? Create an organization and invite colleagues. Projects become shared, data is scoped to your organization.
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          Team features: Shared project access, role-based permissions, organization-scoped data, team collaboration.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          4. Upgrade to Premium
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Need advanced features? Upgrade to Premium for WhatsApp integration, priority support, and advanced analytics.
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          Premium features: WhatsApp integration, priority AI access, advanced analytics, priority support (4-hour SLA).
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          5. Unlock Full Platform
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Ready for comprehensive project intelligence? Unlock all 8 apps in the dpow.app platform for end-to-end construction management.
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          Full platform access: All 8 integrated apps, cross-app data flow, enterprise features, dedicated account manager.
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 4: Why Choose hf.bluebook? */}
      <section id="why-choose" data-section="why-choose" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Why Choose hf.bluebook?
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          hf.bluebook isn't just another project management tool. We've built something fundamentally different.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Conversational Interface
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Ask questions in plain English, not navigate complex UIs. Traditional workflow requires 6 steps to get an answer. hf.bluebook: Ask question, get answer.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Mobile-First
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Construction directors work on-site, not at desks. WhatsApp integration means you can query your projects from your phone while walking the site. Make informed decisions in real-time.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Built for Teams
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Multi-tenant architecture from day one, not bolted on later. Your data stays in your workspace, visible only to your team. Switch between organizations seamlessly.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Modern Tech Stack
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Built with cutting-edge technology for speed and reliability. Next.js, Supabase, Claude Sonnet 4.5, and Vercel deliver sub-second response times and 99.9% uptime. Your data is encrypted at rest and in transit.
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 5: Technology */}
      <section id="technology" data-section="technology" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Technology
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          hf.bluebook is built with modern, proven technologies chosen for performance, scalability, and developer experience.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Core Stack
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>Next.js 14:</strong> React framework with App Router, Server Components, and serverless deployment</li>
          <li><strong>Supabase:</strong> PostgreSQL database with real-time subscriptions, Row Level Security, and magic link authentication</li>
          <li><strong>Claude Sonnet 4.5:</strong> Anthropic's flagship AI model powering the Hybrid Knowledge Mode</li>
          <li><strong>Vercel:</strong> Serverless platform with edge functions and global CDN distribution</li>
          <li><strong>Twilio:</strong> WhatsApp Business API for mobile messaging integration</li>
        </ul>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Security & Performance
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>Encryption:</strong> TLS 1.3 in transit, AES-256 at rest</li>
          <li><strong>Authentication:</strong> Magic links (no passwords to compromise)</li>
          <li><strong>Data Isolation:</strong> Organization-scoped with role-based access</li>
          <li><strong>Response Times:</strong> Sub-500ms API responses</li>
          <li><strong>Uptime:</strong> 99.9% availability with automatic scaling</li>
        </ul>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 6: The 8-App Vision */}
      <section id="vision" data-section="vision" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          The 8-App Vision
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          hf.bluebook is the conversational gateway to the dpow.app platform - a comprehensive construction intelligence ecosystem.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          The Complete Platform
        </h2>
        <ol style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>hf.bluebook</strong> - Conversational project hub (Live)</li>
          <li><strong>dpow.TIDP</strong> - Core deliverable generator (In Development)</li>
          <li><strong>dpow.scope</strong> - Spatial and visual layer (Planned)</li>
          <li><strong>dpow.report</strong> - Analytical reporting engine (Planned)</li>
          <li><strong>dpow.list</strong> - Task and request capture (Planned)</li>
          <li><strong>dpow.procure</strong> - Procurement lifecycle tracker (Planned)</li>
          <li><strong>dpow.wlca</strong> - Whole life carbon assessment (Planned)</li>
          <li><strong>dpow.assign</strong> - Resource and workload management (Planned)</li>
        </ol>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          The Power of Integration
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          All 8 apps share authentication, organizations, and data. Start a conversation in hf.bluebook, generate reports in dpow.report, track procurement in dpow.procure, and assess carbon in dpow.wlca - all within one unified platform.
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 7: Roadmap & Timeline */}
      <section id="roadmap" data-section="roadmap" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Roadmap & Timeline
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          We're 75% complete to Production MVP. Here's what's built and what's coming.
        </p>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Currently Available
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Excel Upload (.xlsx, .xls, .csv support)</li>
          <li>AI Chat (Powered by Claude Sonnet 4.5)</li>
          <li>Hybrid Knowledge Mode (GENERAL / PROJECT / BOTH query routing)</li>
          <li>Smart Save/Load (Persistent projects with chat history)</li>
          <li>Organizations (Multi-tenant workspaces with role-based access)</li>
          <li>WhatsApp (Basic integration for general knowledge queries)</li>
          <li>Magic Link Auth (Passwordless authentication)</li>
        </ul>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          In Development (Q1 2025)
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>Phase 7.5:</strong> Organization-scoped data isolation</li>
          <li><strong>Phase 7.7:</strong> WhatsApp active project integration</li>
          <li><strong>Phase 7.6:</strong> Production security and RLS policies</li>
          <li><strong>Phase 8:</strong> Testing and bug fixes</li>
          <li><strong>Phase 9:</strong> Production polish</li>
        </ul>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Coming Soon (2025)
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>Phase 10:</strong> Dashboard UI (Q2 2025)</li>
          <li><strong>Phase 11:</strong> Full platform integration with MS365 (Q3-Q4 2025)</li>
          <li><strong>8-App Platform:</strong> Complete dpow.app ecosystem</li>
        </ul>

        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "2.5rem 0 1rem 0",
          }}
        >
          Detailed Documentation
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1.5rem 0" }}>
          Want the full technical specification with detailed phase breakdowns, architecture diagrams, and implementation timelines?
        </p>
        <a 
          href="/DPOW_CHAT_ROADMAP.md" 
          target="_blank"
          style={{
            display: "inline-block",
            background: "#2563EB",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#1D4ED8")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#2563EB")}
        >
          View Complete Roadmap →
        </a>
      </section>

      {/* Bottom CTA */}
      <div style={{ borderTop: "2px solid #E5E7EB", paddingTop: "3rem", textAlign: "center", marginTop: "4rem" }}>
        <h2
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Ready to Get Started?
        </h2>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2rem 0" }}>
          No sign-up required. Upload an Excel file and start asking questions immediately.
        </p>
        <a 
          href="/" 
          style={{
            display: "inline-block",
            background: "#2563EB",
            color: "white",
            padding: "16px 32px",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "1.125rem",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#1D4ED8")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#2563EB")}
        >
          Try hf.bluebook Free →
        </a>
      </div>
    </div>
  );
}
