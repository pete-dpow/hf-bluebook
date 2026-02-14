import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET — list SharePoint sites the user has access to */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("microsoft_access_token, microsoft_refresh_token, microsoft_token_expires_at")
    .eq("id", auth.user.id)
    .single();

  if (!userData?.microsoft_access_token) {
    return NextResponse.json({ error: "Microsoft not connected" }, { status: 400 });
  }

  const res = await fetch("https://graph.microsoft.com/v1.0/sites?search=*", {
    headers: { Authorization: `Bearer ${userData.microsoft_access_token}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch sites" }, { status: 502 });
  }

  const data = await res.json();
  const sites = (data.value || []).map((site: any) => ({
    id: site.id,
    name: site.displayName,
    webUrl: site.webUrl,
  }));

  return NextResponse.json({ sites });
}
