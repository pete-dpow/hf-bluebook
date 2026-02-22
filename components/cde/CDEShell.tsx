"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/* ── Design tokens from harmony_cde-v5.html ── */
const T = {
  hf: "#154f91",
  hfL: "#1a6bc4",
  hfW: "#edf3fa",
  grn: "#4d7c0f",
  red: "#dc2626",
  amb: "#d97706",
  bg: "#eef0f4",
  bgw: "#fff",
  bgh: "#f8f9fb",
  hd: "#0f2847",
  tab: "#1a3a5c",
  tx: "#111827",
  tx2: "#4b5563",
  tx3: "#9ca3af",
  bd: "#d1d5db",
  bdl: "#e5e7eb",
  htx: "rgba(255,255,255,.9)",
  htx2: "rgba(255,255,255,.55)",
} as const;

const FONT = "'Futura PT','Century Gothic','Futura',system-ui,sans-serif";
const MONO = "'DM Mono',monospace";

/* ── Tab definitions ── */
interface Tab {
  id: string;
  label: string;
  icon: string; // SVG path(s) inline
  badge?: { count: number; color: string };
  projectOnly?: boolean;
}

const TABS: Tab[] = [
  { id: "home", label: "Home", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z|M9 22V12h6v10" },
  { id: "customers", label: "Customers", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2|C9 7 4" },
  { id: "residents", label: "Residents", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z|M9 22V12h6v10|C12 7 3" },
  { id: "documents", label: "Documents", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z|M14 2v6h6", projectOnly: true },
  { id: "mail", label: "Mail", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z|M22 6l-10 7L2 6", projectOnly: true },
  { id: "workflows", label: "Workflows", icon: "M22 12l-4 0-3 9-6-18-3 9-4 0", projectOnly: true },
  { id: "field", label: "Field", icon: "M12 22c4.97-2.5 8-6.1 8-10V5l-8-3-8 3v7c0 3.9 3.03 7.5 8 10z", projectOnly: true },
  { id: "audit", label: "Audit", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", projectOnly: true },
];

function TabIcon({ pathData }: { pathData: string }) {
  const parts = pathData.split("|");
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {parts.map((d, i) => {
        // Circle shorthand: "C{cx} {cy} {r}"
        if (d.startsWith("C")) {
          const [, cx, cy, r] = d.match(/C(\d+)\s+(\d+)\s+(\d+)/) || [];
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        return <path key={i} d={d} />;
      })}
    </svg>
  );
}

interface CDEShellProps {
  children: React.ReactNode;
}

export default function CDEShell({ children }: CDEShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  // Determine active tab from pathname
  const getActiveTab = (): string => {
    if (!pathname) return "home";
    if (pathname === "/cde" || pathname === "/cde/home") return "home";
    if (pathname.startsWith("/cde/clients")) return "customers";
    if (pathname.startsWith("/cde/residents")) return "residents";
    if (pathname.includes("/documents")) return "documents";
    if (pathname.includes("/mail")) return "mail";
    if (pathname.includes("/workflows")) return "workflows";
    if (pathname.includes("/field")) return "field";
    if (pathname.includes("/audit")) return "audit";
    return "home";
  };

  const activeTab = getActiveTab();

  // Check if we're in a project context (have a projectId in the URL)
  const projectMatch = pathname?.match(/\/cde\/([a-f0-9-]{36})\//);
  const hasProject = !!projectMatch;

  const handleTabClick = (tab: Tab) => {
    if (tab.id === "home") {
      router.push("/cde/home");
    } else if (tab.id === "customers") {
      router.push("/cde/clients");
    } else if (tab.id === "residents") {
      router.push("/cde/residents");
    } else if (tab.projectOnly && projectMatch) {
      router.push(`/cde/${projectMatch[1]}/${tab.id}`);
    }
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "??";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      fontFamily: FONT,
      fontSize: "13px",
      color: T.tx,
      background: T.bg,
      zIndex: 100,
    }}>
      {/* ── HEADER ── */}
      <div style={{
        height: 48,
        background: T.hd,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div
          onClick={() => router.push("/cde/home")}
          style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: T.hf,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: "10.5px",
          }}>HF</div>
          <div style={{ color: T.htx, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>
            Harmony Fire <span style={{ fontWeight: 400, color: T.htx2 }}>CDE</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,.12)", margin: "0 4px" }} />

        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11.5px", color: T.htx2 }}>
          <span
            onClick={() => router.push("/cde/home")}
            style={{ color: "rgba(255,255,255,.7)", cursor: "pointer" }}
          >
            Home
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <input
          type="text"
          placeholder="Search documents, mail, issues..."
          style={{
            width: 220, height: 30,
            border: "1px solid rgba(255,255,255,.15)",
            borderRadius: 5, padding: "0 10px",
            fontFamily: "inherit", fontSize: 11,
            color: T.htx, background: "rgba(255,255,255,.06)",
          }}
        />

        {/* User avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: T.hfL, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 500, cursor: "pointer", marginLeft: 4,
        }}>
          {initials}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{
        height: 36,
        background: T.tab,
        display: "flex",
        alignItems: "stretch",
        padding: "0 16px",
        flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          // Hide project-only tabs when no project is selected
          if (tab.projectOnly && !hasProject) return null;

          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "0 14px",
                fontSize: "11.5px",
                fontWeight: 500,
                color: isActive ? "#fff" : "rgba(255,255,255,.55)",
                cursor: "pointer",
                borderBottom: isActive ? "2px solid #fff" : "2px solid transparent",
                whiteSpace: "nowrap",
                transition: "color .15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,.8)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,.55)";
              }}
            >
              <TabIcon pathData={tab.icon} />
              {tab.label}
              {tab.badge && (
                <span style={{
                  fontSize: 9, fontWeight: 500,
                  padding: "1px 5px", borderRadius: 8, marginLeft: 1,
                  background: tab.badge.color === "red" ? "rgba(220,38,38,.25)" : "rgba(59,130,246,.25)",
                  color: tab.badge.color === "red" ? "#fca5a5" : "#93c5fd",
                }}>
                  {tab.badge.count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
