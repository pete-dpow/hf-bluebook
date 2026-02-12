"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthDrawer from "@/components/AuthDrawer";

// Routes that don't require auth
const PUBLIC_PATHS = ["/auth", "/auth/callback", "/demo"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();
  const provisionedRef = useRef(false);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (session) provision(session.access_token);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (session) provision(session.access_token);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-provision user/org/membership on first login
  async function provision(token: string) {
    if (provisionedRef.current) return;
    provisionedRef.current = true;
    try {
      await fetch("/api/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Non-critical — pages will work once provisioned
      provisionedRef.current = false;
    }
  }

  // Still loading auth state
  if (isAuthenticated === null) {
    return <>{children}</>;
  }

  // Public paths always render
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Show AuthDrawer overlay when not authenticated
  return (
    <>
      {children}
      <AuthDrawer isOpen={!isAuthenticated} />
    </>
  );
}
