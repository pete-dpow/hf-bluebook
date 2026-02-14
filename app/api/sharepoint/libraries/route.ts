import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET — list document libraries for a given SharePoint site */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400 });

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("microsoft_access_token")
    .eq("id", auth.user.id)
    .single();

  if (!userData?.microsoft_access_token) {
    return NextResponse.json({ error: "Microsoft not connected" }, { status: 400 });
  }

  const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/drives`, {
    headers: { Authorization: `Bearer ${userData.microsoft_access_token}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to fetch libraries" }, { status: 502 });
  }

  const data = await res.json();
  const libraries = (data.value || [])
    .filter((drive: any) => drive.driveType === "documentLibrary")
    .map((drive: any) => ({
      id: drive.id,
      name: drive.name,
      webUrl: drive.webUrl,
    }));

  return NextResponse.json({ libraries });
}
