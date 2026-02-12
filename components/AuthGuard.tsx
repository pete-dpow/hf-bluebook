"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthDrawer from "@/components/AuthDrawer";

// Routes that don't require auth
const PUBLIC_PATHS = ["/auth", "/auth/callback", "/demo"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
