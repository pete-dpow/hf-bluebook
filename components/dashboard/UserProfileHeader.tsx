"use client";

import { useState } from "react";
import { Mail, StickyNote, Building2, Calendar, Shield, MapPin, Pencil } from "lucide-react";
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
    <div className="w-full bg-white border border-[#E5E7EB] overflow-visible" style={{ borderRadius: 20 }}>
      <div className="flex min-h-[230px]">
        {/* ── Left: Avatar + Buttons ── */}
        <div className="relative shrink-0 flex flex-col items-center" style={{ width: 200 }}>
          {/* Avatar — large portrait, fills left column */}
          <div className="flex-1 flex items-end w-full px-3 pt-3">
            <AvatarUpload
              currentUrl={avatarUrl}
              displayName={user.display_name}
              onUploaded={setAvatarUrl}
              width={176}
              height={200}
            />
          </div>
          {/* Email + Notes buttons at bottom */}
          <div className="flex gap-2 py-3">
            <a
              href={`mailto:${user.email}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] text-white hover:opacity-90 transition"
              style={{ background: "#374151", fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
            >
              <Mail className="w-3 h-3" /> Email
            </a>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.7rem] text-white hover:opacity-90 transition"
              style={{ background: "#1F2937", fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
            >
              <StickyNote className="w-3 h-3" /> Notes
            </button>
          </div>
        </div>

        {/* ── Center: Tags + Name + Detail Grid ── */}
        <div className="flex-1 py-5 pr-4 min-w-0">
          {/* Tags — above the name, matching Figma exactly */}
          <div className="flex gap-2 mb-2.5">
            <Tag label="Active" bg="#DCFCE7" color="#166534" border="#BBF7D0" />
            {user.role === "admin" && (
              <Tag label="Admin" bg="#FEF3C7" color="#92400E" border="#FDE68A" />
            )}
            {user.microsoft_connected && (
              <Tag label="Microsoft Connected" bg="#CCFBF1" color="#0F766E" border="#99F6E4" />
            )}
          </div>

          {/* Name — large Cormorant Garamond */}
          <h2
            className="text-[2rem] leading-tight text-[#111827] mb-1"
            style={{ fontFamily: "var(--font-cormorant)", fontWeight: 700 }}
          >
            {user.display_name}
          </h2>

          {/* Subtitle */}
          <p
            className="text-[0.8rem] text-[#6B7280] mb-5"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {user.email} &bull; Role: <span className="capitalize">{user.role}</span>
          </p>

          {/* 2×2 Detail Grid — circular icon backgrounds */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <DetailField
              icon={<Building2 className="w-3.5 h-3.5 text-[#6B7280]" />}
              label="Organisation"
              value={user.organization_name || "—"}
            />
            <DetailField
              icon={<Calendar className="w-3.5 h-3.5 text-[#6B7280]" />}
              label="Member Since"
              value={memberDate || "—"}
            />
            <DetailField
              icon={<Shield className="w-3.5 h-3.5 text-[#6B7280]" />}
              label="Primary Focus"
              value="Fire Protection"
            />
            <DetailField
              icon={<MapPin className="w-3.5 h-3.5 text-[#6B7280]" />}
              label="Location"
              value="United Kingdom"
            />
          </div>
        </div>

        {/* ── Right: Key Insights Panel ── */}
        <div
          className="bg-[#F9FAFB] border border-[#E5E7EB] shrink-0 flex flex-col m-4 ml-0 p-5"
          style={{ borderRadius: 14, width: 420 }}
        >
          {/* Panel Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
                </svg>
              </div>
              <h3
                className="text-[0.9rem] text-[#111827]"
                style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 600 }}
              >
                Key insights
              </h3>
            </div>
            <button
              onClick={handleOpenProfile}
              className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 border border-[#D1D5DB] rounded-full text-[#374151] bg-white hover:bg-gray-50 transition"
              style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
            >
              <Pencil className="w-3 h-3" /> Edit Details
            </button>
          </div>
          <p
            className="text-[0.68rem] text-[#9CA3AF] mb-4"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            Key metrics for fire protection operations.
          </p>

          {/* 3 Metric Columns */}
          <div className="flex gap-0 flex-1">
            <InsightColumn
              color="#10B981"
              label="Products"
              value={stats.total_products}
              description="Total Catalogued"
              barColor="#1F2937"
              barPercent={65}
              indicator="↑ High"
              indicatorLabel="(Catalogue)"
            />
            <InsightColumn
              color="#3B82F6"
              label="Active Quotes"
              value={stats.active_quotes}
              description="In Pipeline"
              barColor="#374151"
              barPercent={50}
              indicator="↕ 95%"
              indicatorLabel="(On Track)"
            />
            <InsightColumn
              color="#8B5CF6"
              label="Compliance"
              value={stats.total_regulations}
              description="Regulations Tracked"
              barColor="#1F2937"
              barPercent={40}
              indicator="↑ 10%"
              indicatorLabel="(Monitored)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function DetailField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Circular icon background — matching Figma */}
      <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p
          className="text-[0.6rem] text-[#9CA3AF] uppercase tracking-wider leading-none"
          style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 600 }}
        >
          {label}
        </p>
        <p
          className="text-[0.8rem] text-[#374151] mt-0.5"
          style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function InsightColumn({
  color,
  label,
  value,
  description,
  barColor,
  barPercent,
  indicator,
  indicatorLabel,
}: {
  color: string;
  label: string;
  value: number;
  description: string;
  barColor: string;
  barPercent: number;
  indicator: string;
  indicatorLabel: string;
}) {
  return (
    <div className="flex-1 flex flex-col px-3 first:pl-0 last:pr-0">
      {/* Diamond + Label */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[0.6rem]" style={{ color }}>◆</span>
        <span
          className="text-[0.68rem] text-[#6B7280]"
          style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 500 }}
        >
          {label}
        </span>
      </div>

      {/* Large Value */}
      <p
        className="text-[1.75rem] text-[#111827] leading-none mb-1"
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

      {/* Progress Bar — short thick bar matching Figma */}
      <div className="w-full h-1 bg-[#E5E7EB] rounded-full mb-1.5">
        <div
          className="h-full rounded-full"
          style={{ width: `${barPercent}%`, background: barColor }}
        />
      </div>

      {/* Indicator */}
      <p
        className="text-[0.6rem] text-[#6B7280] mt-auto"
        style={{ fontFamily: "var(--font-ibm-plex)" }}
      >
        <span className="font-medium">{indicator}</span>{" "}
        <span className="text-[#9CA3AF]">{indicatorLabel}</span>
      </p>
    </div>
  );
}

function Tag({ label, bg, color, border }: { label: string; bg: string; color: string; border: string }) {
  return (
    <span
      className="text-[0.7rem] px-3 py-0.5 rounded-full"
      style={{
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        fontFamily: "var(--font-ibm-plex)",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}
