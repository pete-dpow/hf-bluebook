"use client";

import { useState } from "react";
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
    <div
      className="w-full bg-white border border-[#E5E7EB] rounded-2xl p-6"
      style={{ borderRadius: "16px" }}
    >
      <div className="flex items-start justify-between gap-6">
        {/* Left: Avatar + Details */}
        <div className="flex items-start gap-5">
          <AvatarUpload
            currentUrl={avatarUrl}
            displayName={user.display_name}
            onUploaded={setAvatarUrl}
          />

          <div className="flex flex-col gap-1">
            {/* Name + Role Badge */}
            <div className="flex items-center gap-3">
              <h2
                className="text-[1.75rem] leading-tight text-[#1F2937]"
                style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600 }}
              >
                {user.display_name}
              </h2>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize"
                style={{
                  background: user.role === "admin" ? "rgba(0,86,167,0.1)" : "#F3F4F6",
                  color: user.role === "admin" ? "#0056a7" : "#6B7280",
                  fontFamily: "var(--font-ibm-plex)",
                }}
              >
                {user.role}
              </span>
            </div>

            {/* Email */}
            <p
              className="text-sm text-[#6B7280]"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {user.email}
            </p>

            {/* Organisation + Member Since */}
            {user.organization_name && (
              <p
                className="text-sm text-[#6B7280]"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                Organisation: {user.organization_name}
              </p>
            )}
            {memberDate && (
              <p
                className="text-sm text-[#6B7280]"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              >
                Member Since: {memberDate}
              </p>
            )}

            {/* Edit Details button */}
            <button
              onClick={handleOpenProfile}
              className="mt-2 text-sm px-3 py-1 border border-[#E5E7EB] rounded-lg text-[#6B7280] hover:bg-gray-50 transition w-fit"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Edit Details
            </button>
          </div>
        </div>

        {/* Right: Key Insights */}
        <div className="bg-[#FCFCFA] border border-[#E5E7EB] rounded-xl p-4 min-w-[200px]">
          <h3
            className="text-xs text-[#6B7280] uppercase tracking-wider mb-3"
            style={{ fontFamily: "var(--font-ibm-plex)", fontWeight: 600 }}
          >
            Key Insights
          </h3>
          <div className="flex flex-col gap-3">
            <InsightRow label="Products" value={stats.total_products} />
            <InsightRow label="Active Quotes" value={stats.active_quotes} />
            <InsightRow label="Compliance" value={stats.total_regulations} />
          </div>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex gap-2 mt-4">
        <Tag label="Active" bg="#DCFCE7" color="#166534" />
        {user.role === "admin" && (
          <Tag label="Admin" bg="rgba(0,86,167,0.1)" color="#0056a7" />
        )}
        {user.microsoft_connected && (
          <Tag label="Microsoft Connected" bg="rgba(0,120,212,0.1)" color="#0078d4" />
        )}
      </div>
    </div>
  );
}

function InsightRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className="text-xs text-[#6B7280]"
        style={{ fontFamily: "var(--font-ibm-plex)" }}
      >
        {label}
      </span>
      <span
        className="text-lg text-[#1F2937]"
        style={{ fontFamily: "var(--font-cormorant)", fontWeight: 700 }}
      >
        {value}
      </span>
    </div>
  );
}

function Tag({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{
        background: bg,
        color: color,
        fontFamily: "var(--font-ibm-plex)",
      }}
    >
      {label}
    </span>
  );
}
