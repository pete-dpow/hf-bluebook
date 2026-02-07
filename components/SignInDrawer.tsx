"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignInDrawer({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const redirectUrl = `https://dpow-chat.vercel.app/auth/callback`;

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
    <div className="flex justify-start">
      <div
        className="bg-white border border-gray-200 rounded-2xl rounded-bl-none shadow-sm px-4 py-4 text-gray-800 max-w-[85%]"
        style={{ 
          fontFamily: "var(--font-ibm-plex)",
          position: "relative",
          zIndex: 100
        }}
      >
        <p className="font-medium mb-2 text-sm">🔐 Sign in to load projects</p>
        <p className="text-xs text-gray-600 mb-3">
          Enter your email to receive a magic link
        </p>

        <form onSubmit={handleSignIn} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:border-transparent outline-none"
            style={{ 
              pointerEvents: "auto",
              position: "relative",
              zIndex: 101
            }}
            disabled={loading}
            autoFocus
          />

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-[#2563EB] text-white text-xs px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ 
              pointerEvents: "auto",
              position: "relative",
              zIndex: 101
            }}
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        {message && (
          <p className="mt-3 text-xs text-gray-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}