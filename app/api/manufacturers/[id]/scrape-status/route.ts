import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("scrape_jobs")
    .select("id, status, progress, products_created, products_updated, error_log, completed_at, duration_seconds")
    .eq("manufacturer_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json(data || { status: "none" });
}
