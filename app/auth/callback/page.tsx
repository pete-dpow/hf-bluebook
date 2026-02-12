"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const access_token = hashParams.get("access_token") || queryParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token") || queryParams.get("refresh_token");
        const type = hashParams.get("type") || queryParams.get("type");
        const errorParam = hashParams.get("error") || queryParams.get("error");
        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

        if (errorParam) {
          console.error("Auth error:", errorDescription || errorParam);
          setError(errorDescription || errorParam);
          return;
        }

        if (type === "magiclink" || type === "signup") {
          if (access_token && refresh_token) {
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (sessionError) {
              console.error("Session error:", sessionError);
              setError(sessionError.message);
              return;
            }

            if (data.session) {
              console.log("✅ User signed in:", data.session.user.email);
              setSuccess(true);
              
              // Auto-redirect after 2 seconds
              setTimeout(() => {
                router.replace("/");
              }, 2000);
              return;
            }
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("✅ Existing session found:", session.user.email);
          setSuccess(true);
          setTimeout(() => {
            router.replace("/");
          }, 2000);
          return;
        }

        console.log("No auth data found");
        setTimeout(() => router.replace("/"), 2000);
      } catch (err: any) {
        console.error("Callback exception:", err);
        setError(err.message || "An error occurred");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFCFA] text-gray-700 p-4">
      {error ? (
        <>
          <div className="text-red-600 mb-4 text-center max-w-md">
            <p className="font-semibold mb-2">❌ Authentication Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => router.replace("/")}
            style={{
              marginTop: "16px",
              padding: "12px 24px",
              background: "#2563EB",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Return to HF.bluebook
          </button>
        </>
      ) : success ? (
        <>
          <div className="text-green-600 mb-4 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-semibold" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Successfully signed in!
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-4">Redirecting to HF.bluebook...</p>
          <button
            onClick={() => router.replace("/")}
            style={{
              padding: "12px 24px",
              background: "#2563EB",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontFamily: "var(--font-ibm-plex)",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Continue to HF.bluebook →
          </button>
        </>
      ) : (
        <>
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <p style={{ fontFamily: "var(--font-ibm-plex)" }}>Signing you in...</p>
        </>
      )}
    </div>
  );
}