import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://odhvxoelxiffhocrgtll.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface AuthResult {
  user: { id: string; email: string };
  isAdmin: boolean;
  organizationId: string | null;
}

export async function getAuthUser(req: NextRequest): Promise<AuthResult | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  // Get active organization and role
  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("active_organization_id")
    .eq("id", user.id)
    .single();

  const organizationId = userData?.active_organization_id || null;

  let isAdmin = false;
  if (organizationId) {
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    isAdmin = membership?.role === "admin";
  }

  return {
    user: { id: user.id, email: user.email || "" },
    isAdmin,
    organizationId,
  };
}
