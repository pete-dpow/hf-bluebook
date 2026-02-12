"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Shield, Mail } from "lucide-react";

interface AuthDrawerProps {
  isOpen: boolean;
}

export default function AuthDrawer({ isOpen }: AuthDrawerProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showMagicLink, setShowMagicLink] = useState(false);

  // Flip to true once Harmony IT adds the Azure redirect URI
  const ENTRA_ENABLED = false;

  const handleMicrosoftSignIn = () => {
    if (!ENTRA_ENABLED) {
      // Azure redirect URI not yet configured — nudge to magic link
      setShowMagicLink(true);
      setMessage("Microsoft Entra ID is being configured by Harmony IT. Please use email sign-in below.");
      return;
    }
    setMsLoading(true);
    window.location.href = "/api/microsoft/auth?userId=new";
  };

  const handleMagicLink = async (e: React.FormEvent) => {
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
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage("Check your email for a magic login link");
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message || "Failed to send magic link"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-[9999] flex items-center justify-center transition-transform duration-300"
        style={{
          width: "100%",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        <div
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 mx-4"
          style={{ maxHeight: "90vh", overflowY: "auto" }}
        >
          {/* Logo + Title */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
              style={{ background: "linear-gradient(135deg, #0056a7, #0078d4)" }}
            >
              <Shield size={32} className="text-white" />
            </div>
            <h1
              className="text-3xl mb-2"
              style={{ fontFamily: "var(--font-cormorant)", fontWeight: 600, color: "#2A2A2A" }}
            >
              HF.bluebook
            </h1>
            <p
              className="text-gray-500 text-sm"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Fire Protection Product Intelligence
            </p>
          </div>

          {/* Microsoft Entra ID — Primary */}
          <button
            onClick={handleMicrosoftSignIn}
            disabled={msLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 mb-4"
            style={{
              background: "linear-gradient(135deg, #0056a7, #0078d4)",
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "15px",
            }}
          >
            {msLoading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                </svg>
                Sign in with Microsoft
              </>
            )}
          </button>

          <p
            className="text-xs text-gray-400 text-center mb-6"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {ENTRA_ENABLED ? "Harmony Fire Microsoft Entra ID" : "Coming soon — pending Harmony IT configuration"}
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              or
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Magic Link — Secondary */}
          {!showMagicLink ? (
            <button
              onClick={() => setShowMagicLink(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
              style={{ fontFamily: "var(--font-ibm-plex)", fontSize: "14px" }}
            >
              <Mail size={16} />
              Sign in with email (demo)
            </button>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-[#0056a7] outline-none"
                style={{ fontFamily: "var(--font-ibm-plex)" }}
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-lg font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition"
                style={{ fontFamily: "var(--font-ibm-plex)", fontSize: "14px" }}
              >
                {loading ? (
                  <Loader2 className="animate-spin inline-block w-4 h-4" />
                ) : (
                  "Send Magic Link"
                )}
              </button>
            </form>
          )}

          {message && (
            <p
              className="mt-4 text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-3"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              {message}
            </p>
          )}

          {/* Footer */}
          <p
            className="mt-8 text-xs text-gray-300 text-center"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            Harmony Fire — Fire Protection Specialists
          </p>
        </div>
      </div>
    </>
  );
}
