"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        console.warn("No active session, redirecting to /auth");
        router.replace("/auth");
      } else {
        setUser(user);
      }
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFCFA]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
        <p className="ml-3 text-gray-700">Loading workspace…</p>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FCFCFA] p-8">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        <h1
          className="text-4xl mb-4"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Welcome to DPoW
        </h1>
        <p
          className="text-gray-600 mb-6"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          You are signed in as <br />
          <span className="font-semibold text-gray-800">{user?.email}</span>
        </p>
        <button
          onClick={handleSignOut}
          className="px-5 py-2 bg-[#2563EB] text-white rounded-lg hover:opacity-90 transition"
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
