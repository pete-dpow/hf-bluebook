"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AcceptInvite() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  
  const [status, setStatus] = useState<"loading" | "success" | "error" | "magic_sent">("loading");
  const [message, setMessage] = useState("");
  const processingRef = useRef(false);

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !processingRef.current) {
        processingRef.current = true;
        acceptInvite();
      }
    });

    // Run on initial load
    if (!processingRef.current) {
      processingRef.current = true;
      handleInvite();
    }

    return () => subscription.unsubscribe();
  }, []);

  async function handleInvite() {
    try {
      setStatus("loading");
      
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Already logged in, accept the invite via API
        await acceptInvite();
        return;
      }

      // Not logged in - get the invite email to send magic link
      const response = await fetch(`${window.location.origin}/api/organizations/invite-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok || !data.email) {
        setStatus("error");
        setMessage(data.error || "Invalid or expired invitation link");
        processingRef.current = false;
        return;
      }

      // Send magic link
      await sendAutoMagicLink(data.email);
      
    } catch (error: any) {
      console.error("Handle invite error:", error);
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      processingRef.current = false;
    }
  }

  async function sendAutoMagicLink(email: string) {
    try {
      const redirectUrl = `${window.location.origin}/invite/${token}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        if (error.message.includes("Email rate limit exceeded")) {
          setStatus("error");
          setMessage("Please wait a minute before trying again.");
          processingRef.current = false;
          return;
        }
        throw error;
      }

      setStatus("magic_sent");
      setMessage(`We've sent a sign-in link to ${email}. Click the link in your email to join!`);
      processingRef.current = false;
      
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to send sign-in link");
      processingRef.current = false;
    }
  }

  async function acceptInvite() {
    try {
      setStatus("loading");
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setStatus("error");
        setMessage("Please sign in to accept this invitation");
        processingRef.current = false;
        return;
      }

      // Call the API to accept invite (uses service role)
      const response = await fetch("/api/organizations/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          userToken: session.access_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to accept invitation");
        processingRef.current = false;
        return;
      }

      // Success!
      setStatus("success");
      setMessage(data.message || "Welcome aboard!");

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/chat");
      }, 2000);

    } catch (error: any) {
      console.error("Accept invite error:", error);
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      processingRef.current = false;
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#FCFCFA" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1
            className="text-5xl mb-2"
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 500,
              color: "#2A2A2A",
            }}
          >
            dpow.chat
          </h1>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-ibm-plex)",
              color: "#4B4B4B",
            }}
          >
            Structured Intelligence for Project Delivery
          </p>
        </div>

        <div
          className="bg-white rounded-2xl shadow-sm border p-8"
          style={{ borderColor: "#E5E7EB" }}
        >
          {status === "loading" && (
            <div className="text-center">
              <Loader2
                className="w-8 h-8 animate-spin mx-auto mb-4"
                style={{ color: "#2563EB" }}
              />
              <p
                className="text-base"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  color: "#4B4B4B",
                }}
              >
                Processing your invitation...
              </p>
            </div>
          )}

          {status === "magic_sent" && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "#2563EB" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h2
                className="text-xl mb-2"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontWeight: 500,
                  color: "#2A2A2A",
                }}
              >
                Check your email
              </h2>
              <p
                className="text-base"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  color: "#4B4B4B",
                }}
              >
                {message}
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "#10B981" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2
                className="text-xl mb-2"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontWeight: 500,
                  color: "#2A2A2A",
                }}
              >
                Welcome aboard!
              </h2>
              <p
                className="text-base"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  color: "#4B4B4B",
                }}
              >
                {message}
              </p>
              <p
                className="text-sm mt-4"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  color: "#6B7280",
                }}
              >
                Redirecting to dpow.chat...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "#EF4444" }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2
                className="text-xl mb-2"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  fontWeight: 500,
                  color: "#2A2A2A",
                }}
              >
                Unable to Accept
              </h2>
              <p
                className="text-base mb-6"
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  color: "#4B4B4B",
                }}
              >
                {message}
              </p>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2 rounded-lg"
                style={{
                  background: "#2563EB",
                  color: "white",
                  fontFamily: "var(--font-ibm-plex)",
                  fontWeight: 500,
                }}
              >
                Go to dpow.chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
