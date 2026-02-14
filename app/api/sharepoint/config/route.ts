import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/** GET — read current SharePoint config for the user's org */
export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("sharepoint_site_id, sharepoint_drive_id")
    .eq("id", auth.organizationId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    sharepoint_site_id: data?.sharepoint_site_id || null,
    sharepoint_drive_id: data?.sharepoint_drive_id || null,
    configured: !!(data?.sharepoint_site_id && data?.sharepoint_drive_id),
  });
}

/** PUT — save SharePoint config (admin only) */
export async function PUT(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const { sharepoint_site_id, sharepoint_drive_id } = body;

  if (!sharepoint_site_id || !sharepoint_drive_id) {
    return NextResponse.json({ error: "site_id and drive_id required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ sharepoint_site_id, sharepoint_drive_id })
    .eq("id", auth.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
