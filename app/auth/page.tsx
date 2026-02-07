"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");
  const router = useRouter();

  // ✅ Automatically detect correct base URL (local or Bolt)
  useEffect(() => {
    const base = window.location.origin;
    setRedirectUrl(`${base}/auth/callback`);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (!redirectUrl) {
        throw new Error("Redirect URL not ready");
      }

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error("❌ Magic link error:", error);
        setMessage(`Error: ${error.message}`);
      } else {
        console.log("✅ Magic link sent:", data);
        setMessage("✅ Check your email for a magic login link ✉️");
      }
    } catch (err: any) {
      console.error("Exception during sign in:", err);
      setMessage(`Error: ${err.message || "Failed to send magic link"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFCFA] p-4">
      <div className="w-full max-w-md bg-white shadow-sm rounded-2xl border border-gray-200 p-8">
        <h1
          className="text-3xl font-semibold mb-4 text-center"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Sign in to DPoW
        </h1>
        <p
          className="text-gray-600 text-center mb-8"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          Enter your work email to receive a secure magic link
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-1 focus:ring-[#2563EB] outline-none"
          />

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-[#2563EB] text-white py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {loading ? (
              <Loader2 className="animate-spin inline-block w-5 h-5" />
            ) : (
              "Send Magic Link"
            )}
          </button>
        </form>

        {message && (
          <p
            className="mt-6 text-center text-sm text-gray-700"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          >
            {message}
          </p>
        )}

        <button
          onClick={() => router.push("/")}
          className="mt-6 text-sm text-gray-500 underline block mx-auto"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
