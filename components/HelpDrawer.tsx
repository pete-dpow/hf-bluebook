/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function HelpDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("getting-started");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = document.getElementById("help-trigger");
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

      let currentSection = "getting-started";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.getAttribute("data-section") || "getting-started";
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
      <button id="help-trigger" style={{ display: "none" }}>
        Open Help
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
              Help & Resources
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
              Learn how to use hf.bluebook
            </p>
          </div>

          <nav style={{ flex: 1, padding: "1rem 0", overflowY: "auto" }}>
            <NavItem
              active={activeSection === "getting-started"}
              onClick={() => scrollToSection("getting-started")}
              label="Getting Started"
            />
            <NavItem
              active={activeSection === "chat-guide"}
              onClick={() => scrollToSection("chat-guide")}
              label="Chat with AI Guide"
            />
            <NavItem
              active={activeSection === "data-management"}
              onClick={() => scrollToSection("data-management")}
              label="Upload & Manage Data"
            />
            <NavItem
              active={activeSection === "organizations"}
              onClick={() => scrollToSection("organizations")}
              label="Organizations"
            />
            <NavItem
              active={activeSection === "whatsapp"}
              onClick={() => scrollToSection("whatsapp")}
              label="WhatsApp Setup"
            />
            <NavItem
              active={activeSection === "ms365"}
              onClick={() => scrollToSection("ms365")}
              label="MS365 Integration"
            />
            <NavItem
              active={activeSection === "support"}
              onClick={() => scrollToSection("support")}
              label="Get Support"
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
                Help & Resources
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
                Get the most out of hf.bluebook
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
            <HelpContent />
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

function HelpContent() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Section 1: Getting Started */}
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
          Welcome to hf.bluebook - your AI-powered construction project assistant!
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
          Quick Start (3 steps)
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          1. Upload Your Data
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 1.5rem 0" }}>
          <li>Click "Upload Excel" on the homepage</li>
          <li>Select your project file (.xlsx, .xls, or .csv)</li>
          <li>hf.bluebook automatically parses your data</li>
        </ul>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          2. Ask Questions
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 1.5rem 0" }}>
          <li>Type naturally: "How many fire doors on Level 3?"</li>
          <li>The AI understands construction terminology</li>
          <li>Get instant, actionable answers</li>
        </ul>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          3. Save Your Project
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 1.5rem 0" }}>
          <li>Click "Save Project" to persist your work</li>
          <li>Sign in with magic link (no password needed)</li>
          <li>Access from any device</li>
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
          Your First Query
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Try these example questions:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>"Summarize the project scope"</li>
          <li>"What's the status of steel deliveries?"</li>
          <li>"Show me items behind schedule"</li>
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
          Hybrid Knowledge Mode ⭐
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          hf.bluebook intelligently routes your queries:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li><strong>GENERAL:</strong> "What's fire door compliance?" → Industry knowledge</li>
          <li><strong>PROJECT:</strong> "How many fire doors?" → Your data</li>
          <li><strong>BOTH:</strong> "Are our doors compliant?" → Combined analysis</li>
        </ul>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 2: Chat with AI Guide */}
      <section id="chat-guide" data-section="chat-guide" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Chat with AI Guide
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          hf.bluebook uses Claude Sonnet 4.5 to understand your construction projects.
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
          How Hybrid Knowledge Works
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#10B981", margin: "1.5rem 0 0.5rem 0" }}>
          GENERAL Queries
        </h3>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          Questions about industry standards, regulations, best practices:
        </p>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 1rem 0" }}>
          <li>"What's the minimum corridor width for Type B buildings?"</li>
          <li>"Explain the CDM regulations"</li>
          <li>"What's the difference between FD30 and FD60 doors?"</li>
        </ul>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 2rem 0" }}>
          → AI uses construction industry knowledge
        </p>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#3B82F6", margin: "1.5rem 0 0.5rem 0" }}>
          PROJECT Queries
        </h3>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          Questions about YOUR uploaded data:
        </p>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 1rem 0" }}>
          <li>"How many beam connections on Level 2?"</li>
          <li>"Show me all fire-rated doors"</li>
          <li>"What's the total concrete volume?"</li>
        </ul>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 2rem 0" }}>
          → AI searches your Excel data
        </p>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#8B5CF6", margin: "1.5rem 0 0.5rem 0" }}>
          BOTH Queries
        </h3>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          Questions requiring combined analysis:
        </p>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 1rem 0" }}>
          <li>"Are our fire doors compliant with UK regs?"</li>
          <li>"Do we have enough steel for the schedule?"</li>
          <li>"Compare our specs to industry standards"</li>
        </ul>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 2rem 0" }}>
          → AI combines both sources
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
          Tips for Better Answers
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#10B981", margin: "1.5rem 0 0.5rem 0" }}>
          ✅ DO
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>Be specific with your questions</li>
          <li>Use construction terminology</li>
          <li>Reference your data column names</li>
        </ul>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#DC2626", margin: "1.5rem 0 0.5rem 0" }}>
          ❌ DON'T
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>Ask vague questions like "How's it going?"</li>
          <li>Expect data you haven't uploaded</li>
          <li>Ask about other projects (switch projects first)</li>
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
          Advanced Features
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 0.5rem 0" }}>
          <strong>Follow-up Questions:</strong> The AI remembers context from your conversation.
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0", fontStyle: "italic" }}>
          Example: Ask "How many fire doors?", then follow up with "Which floor has the most?" - the AI remembers you're talking about fire doors.
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 3: Upload & Manage Data */}
      <section id="data-management" data-section="data-management" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Upload & Manage Data
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          hf.bluebook works with Excel files containing your project information.
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
          Supported File Types
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Excel (.xlsx, .xls)</li>
          <li>CSV (.csv)</li>
          <li>TSV (.tsv)</li>
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
          Best Practices
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#10B981", margin: "1.5rem 0 0.5rem 0" }}>
          ✅ Good File Structure
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>First row should contain column headers</li>
          <li>Use consistent data types in each column</li>
          <li>Avoid merged cells</li>
          <li>Use clear, descriptive column names</li>
        </ul>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#DC2626", margin: "1.5rem 0 0.5rem 0" }}>
          ❌ Avoid
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>Multiple header rows</li>
          <li>Empty rows between data</li>
          <li>Merged cells</li>
          <li>Special characters in column names</li>
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
          Managing Projects
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          Save Project
        </h3>
        <ol style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Click "Save Project" in chat</li>
          <li>Enter project name (e.g., "Manchester Hospital Phase 2")</li>
          <li>Add description (optional)</li>
          <li>Project saved to your account</li>
        </ol>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          Load Project
        </h3>
        <ol style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Sign in to hf.bluebook</li>
          <li>Click project name in left sidebar</li>
          <li>Project loads with full history</li>
          <li>Continue where you left off</li>
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
          Data Privacy
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Your data stays in your organization</li>
          <li>Not used to train AI models</li>
          <li>Encrypted at rest and in transit</li>
          <li>Only visible to your team members</li>
        </ul>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 4: Organizations */}
      <section id="organizations" data-section="organizations" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Organizations
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          Work together with your team on shared projects.
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
          What are Organizations?
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Organizations are shared workspaces where:
        </p>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Teams collaborate on projects</li>
          <li>Data is scoped to the organization</li>
          <li>Members have role-based access</li>
          <li>Projects are visible to the whole team</li>
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
          Creating an Organization
        </h2>
        <ol style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Click your profile icon (bottom left sidebar)</li>
          <li>Click "New Organization" button</li>
          <li>Enter organization name (e.g., "JJ Sweeney Limited")</li>
          <li>You're automatically set as admin</li>
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
          Organization Roles
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#F59E0B", margin: "1.5rem 0 0.5rem 0" }}>
          👑 Admin
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>Create and delete projects</li>
          <li>Invite team members</li>
          <li>Remove members</li>
          <li>Manage organization settings</li>
          <li>Full access to all projects</li>
        </ul>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#6B7280", margin: "1.5rem 0 0.5rem 0" }}>
          Member
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>View organization projects</li>
          <li>Create new projects</li>
          <li>Chat with project data</li>
          <li>Cannot manage team</li>
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
          Switching Organizations
        </h2>
        <ol style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Click your profile icon</li>
          <li>View "All Organizations"</li>
          <li>Click organization to switch</li>
          <li>Page reloads with new context</li>
          <li>Projects list updates</li>
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
          Inviting Team Members
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          <strong>Coming Soon (Phase 7.4)</strong>
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          For now, contact support to add team members: <a href="mailto:help@dpow.co.uk" style={{ color: "#2563EB", textDecoration: "none" }}>help@dpow.co.uk</a>
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 5: WhatsApp Setup */}
      <section id="whatsapp" data-section="whatsapp" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          WhatsApp Setup
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          Query your projects from your phone via WhatsApp (Premium feature).
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
          Prerequisites
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Premium hf.bluebook account</li>
          <li>Active project uploaded</li>
          <li>WhatsApp Business or personal number</li>
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
          Setup Steps
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          1. Link Your Number
        </h3>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          UI coming in Phase 9. For now, contact support at <a href="mailto:help@dpow.co.uk" style={{ color: "#2563EB", textDecoration: "none" }}>help@dpow.co.uk</a> with subject "Link WhatsApp Number" and include your phone number with country code.
        </p>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          2. Set Active Project
        </h3>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <strong>Coming Soon (Phase 7.7)</strong> - Currently WhatsApp queries use general knowledge only. Project context will be available after Phase 7.7 is complete.
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
          Example Queries
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>"Show me today's deliveries"</li>
          <li>"What's the concrete volume for Level 2?"</li>
          <li>"Are we on schedule?"</li>
          <li>"List all outstanding issues"</li>
        </ul>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 6: MS365 Integration */}
      <section id="ms365" data-section="ms365" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          MS365 Integration
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          Connect hf.bluebook with SharePoint, Teams, and OneDrive for seamless collaboration.
        </p>

        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 2rem 0" }}>
          <strong>🚧 Coming Soon</strong> - MS365 integration is currently in development as part of our Phase 11 roadmap.
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
          Planned Features
        </h2>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          SharePoint Integration
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>Auto-sync project files from SharePoint libraries</li>
          <li>Query documents directly without manual upload</li>
          <li>Keep hf.bluebook data in sync with SharePoint</li>
        </ul>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          Teams Integration
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>Chat with hf.bluebook directly in Teams channels</li>
          <li>Share AI insights with team members</li>
          <li>Project notifications in Teams</li>
        </ul>

        <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1F2937", margin: "1.5rem 0 0.5rem 0" }}>
          OneDrive Integration
        </h3>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li>Access personal project files</li>
          <li>Automatic file discovery</li>
          <li>Cross-device sync</li>
        </ul>

        <p style={{ lineHeight: 1.7, color: "#374151", margin: "2rem 0 0 0" }}>
          Want to be notified when MS365 integration launches? Email us at <a href="mailto:help@dpow.co.uk?subject=MS365 Integration" style={{ color: "#2563EB", textDecoration: "none" }}>help@dpow.co.uk</a> with subject "MS365 Integration"
        </p>
      </section>

      <div style={{ borderTop: "2px solid #E5E7EB", margin: "4rem 0" }} />

      {/* Section 7: Get Support */}
      <section id="support" data-section="support" style={{ marginBottom: "4rem" }}>
        <h1
          style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "2.5rem",
            fontWeight: 600,
            color: "#1F2937",
            margin: "0 0 1rem 0",
          }}
        >
          Get Support
        </h1>
        <p style={{ fontSize: "1.125rem", color: "#6B7280", lineHeight: 1.7, margin: "0 0 2.5rem 0" }}>
          Need help? We're here for you.
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
          Email Support
        </h2>
        <p style={{ fontSize: "1.125rem", lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          📧 <a href="mailto:help@dpow.co.uk" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>help@dpow.co.uk</a>
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          Response time: Within 24-48 hours
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
          What to Include
        </h2>
        <ul style={{ lineHeight: 1.8, color: "#374151", margin: "0 0 2rem 0" }}>
          <li>Your account email address</li>
          <li>Description of the issue</li>
          <li>Screenshots (if relevant)</li>
          <li>What you've tried already</li>
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
          Feature Requests & Bug Reports
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Have an idea for a new feature? Found a bug?
        </p>
        <ul style={{ lineHeight: 1.7, color: "#6B7280", margin: "0 0 2rem 0" }}>
          <li><strong>Feature Requests:</strong> Email with subject "Feature Request"</li>
          <li><strong>Bug Reports:</strong> Email with subject "Bug Report"</li>
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
          Premium Support
        </h2>
        <p style={{ lineHeight: 1.7, color: "#374151", margin: "0 0 1rem 0" }}>
          Upgrade to Premium for priority support with 4-hour SLA, video call support, and dedicated account manager.
        </p>
        <p style={{ lineHeight: 1.7, color: "#6B7280", margin: "0" }}>
          Contact us to upgrade: <a href="mailto:help@dpow.co.uk?subject=Upgrade to Premium" style={{ color: "#2563EB", textDecoration: "none" }}>help@dpow.co.uk</a>
        </p>
      </section>
    </div>
  );
}
