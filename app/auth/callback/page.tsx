"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    const errorParam = hashParams.get("error") || queryParams.get("error");
    const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    // Supabase's detectSessionInUrl (PKCE) handles the code exchange automatically.
    // Listen for the session to be established, then redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/");
      }
    });

    // Also check if session is already set (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/");
      }
    });

    // Safety fallback — if nothing happens after 10s, redirect home
    // (AuthGuard will show login if still unauthenticated)
    const fallback = setTimeout(() => router.replace("/"), 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFCFA] text-gray-700 p-4">
        <div className="text-red-600 mb-4 text-center max-w-md">
          <p className="font-semibold mb-2">Authentication Error</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={() => router.replace("/")}
          style={{
            marginTop: "16px",
            padding: "12px 24px",
            background: "#0056a7",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontFamily: "var(--font-ibm-plex)",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Return to hf.bluebook
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFCFA] text-gray-700 p-4">
      <Loader2 className="w-6 h-6 animate-spin mb-3" style={{ color: "#0056a7" }} />
      <p style={{ fontFamily: "var(--font-ibm-plex)", fontSize: "14px" }}>Signing you in...</p>
    </div>
  );
}
