"use client";

import { useState } from "react";
import { Mail, StickyNote, Building2, Calendar, Shield, MapPin } from "lucide-react";
import AvatarUpload from "./AvatarUpload";

interface UserProfile {
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  organization_name: string;
  member_since: string;
  microsoft_connected: boolean;
}

interface Stats {
  total_products: number;
  active_quotes: number;
  total_regulations: number;
}

interface UserProfileHeaderProps {
  user: UserProfile;
  stats: Stats;
}

export default function UserProfileHeader({ user, stats }: UserProfileHeaderProps) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);

  const memberDate = user.member_since
    ? new Date(user.member_since).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "";

  const handleOpenProfile = () => {
    window.dispatchEvent(new CustomEvent("openProfileDrawer"));
  };

  return (
    <div className="w-full bg-white border border-[#E5E7EB] rounded-2xl p-6">
      <div className="flex gap-6">
        {/* Left Column: Avatar + Action Buttons */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <AvatarUpload
            currentUrl={avatarUrl}
            displayName={user.display_name}
            onUploaded={setAvatarUrl}
            size={130}
          />
          <div className="flex gap-2 mt-1">
            <a
              href={`mailto:${user.email}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs text-white transition hover:opacity-90"
              style={{ background: "#0EA5E9", fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
            >
              <Mail className="w-3 h-3" /> Email
            </a>
            <button
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs text-white transition hover:opacity-90"
              style={{ background: "#374151", fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
            >
              <StickyNote className="w-3 h-3" /> Notes
            </button>
          </div>
        </div>

        {/* Center Column: Tags + Name + Details */}
        <div className="flex-1 min-w-0 pt-1">
          {/* Tags Row — above name (matching Figma) */}
          <div className="flex gap-2 mb-2">
            <Tag label="Active" bg="#DCFCE7" color="#166534" />
            {user.role === "admin" && (
              <Tag label="Admin" bg="rgba(0,86,167,0.1)" color="#0056a7" />
            )}
            {user.microsoft_connected && (
              <Tag label="Microsoft Connected" bg="rgba(0,120,212,0.1)" color="#0078d4" />
            )}
          </div>

          {/* Name */}
          <h2
            className="text-[1.75rem] leading-tight text-[#111827] mb-0.5"
            style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
          >
            {user.display_name}
          </h2>

          {/* Subtitle */}
          <p
            className="text-[0.8rem] text-[#6B7280] mb-4"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {user.email} &bull; Role: <span className="capitalize">{user.role}</span>
          </p>

          {/* 2×2 Detail Grid with Icons */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-3">
            <DetailField icon={<Building2 className="w-3.5 h-3.5" />} label="Organisation" value={user.organization_name || "—"} />
            <DetailField icon={<Calendar className="w-3.5 h-3.5" />} label="Member Since" value={memberDate || "—"} />
            <DetailField icon={<Shield className="w-3.5 h-3.5" />} label="Primary Focus" value="Fire Protection" />
            <DetailField icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value="United Kingdom" />
          </div>
        </div>

        {/* Right Column: Key Insights Panel */}
        <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 min-w-[360px] shrink-0 self-stretch flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h3
                className="text-sm font-semibold text-[#111827]"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                Key Insights
              </h3>
              <p
                className="text-[0.7rem] text-[#9CA3AF] mt-0.5"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                Key metrics for fire protection operations.
              </p>
            </div>
            <button
              onClick={handleOpenProfile}
              className="text-xs px-3.5 py-1.5 border border-[#D1D5DB] rounded-full text-[#374151] hover:bg-white transition"
              style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
            >
              Edit Details
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E5E7EB] my-3" />

          {/* 3 Metric Columns */}
          <div className="flex flex-1">
            <InsightColumn
              dotColor="#10B981"
              label="Products"
              value={stats.total_products.toString()}
              description="Total Catalogued"
              badge="Active"
              badgeBg="#DCFCE7"
              badgeColor="#166534"
              badgeArrow="▲"
            />
            <div className="w-px bg-[#E5E7EB] mx-3" />
            <InsightColumn
              dotColor="#3B82F6"
              label="Active Quotes"
              value={stats.active_quotes.toString()}
              description="In Pipeline"
              badge="95% On Track"
              badgeBg="#FEF3C7"
              badgeColor="#92400E"
              badgeArrow="↑"
            />
            <div className="w-px bg-[#E5E7EB] mx-3" />
            <InsightColumn
              dotColor="#8B5CF6"
              label="Compliance"
              value={stats.total_regulations.toString()}
              description="Regulations Tracked"
              badge="Monitored"
              badgeBg="#DCFCE7"
              badgeColor="#166534"
              badgeArrow="↓"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#9CA3AF] mt-0.5">{icon}</span>
      <div>
        <p
          className="text-[0.65rem] text-[#9CA3AF] uppercase tracking-wider leading-none mb-0.5"
          style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
        >
          {label}
        </p>
        <p
          className="text-[0.8rem] text-[#374151]"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function InsightColumn({
  dotColor,
  label,
  value,
  description,
  badge,
  badgeBg,
  badgeColor,
  badgeArrow,
}: {
  dotColor: string;
  label: string;
  value: string;
  description: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  badgeArrow: string;
}) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Dot + Label */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
        <span
          className="text-[0.7rem] text-[#6B7280]"
          style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
        >
          {label}
        </span>
      </div>

      {/* Large Value */}
      <p
        className="text-2xl text-[#111827] leading-tight mb-0.5"
        style={{ fontFamily: "var(--font-cormorant)", fontWeight: 700 }}
      >
        {value}
      </p>

      {/* Description */}
      <p
        className="text-[0.65rem] text-[#9CA3AF] mb-2"
        style={{ fontFamily: "var(--font-ibm-plex)" }}
      >
        {description}
      </p>

      {/* Badge */}
      <span
        className="text-[0.6rem] px-2 py-0.5 rounded-full w-fit mt-auto"
        style={{
          background: badgeBg,
          color: badgeColor,
          fontFamily: "var(--font-ibm-plex)",
          fontWeight: 500,
        }}
      >
        {badgeArrow} {badge}
      </span>
    </div>
  );
}

function Tag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="text-[0.7rem] px-2.5 py-0.5 rounded-full"
      style={{
        background: bg,
        color: color,
        fontFamily: "var(--font-ibm-plex)",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}
