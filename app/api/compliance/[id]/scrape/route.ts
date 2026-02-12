import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Verify regulation belongs to org and has scraper config
  const { data: regulation, error } = await supabaseAdmin
    .from("regulations")
    .select("id, scraper_config, source_url")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (error || !regulation) return NextResponse.json({ error: "Regulation not found" }, { status: 404 });

  if (!regulation.source_url && !regulation.scraper_config?.source_url) {
    return NextResponse.json({ error: "No source URL configured for scraping" }, { status: 400 });
  }

  // Trigger Inngest event
  await inngest.send({
    name: "regulation/scrape.requested",
    data: {
      regulation_id: params.id,
      organization_id: auth.organizationId,
    },
  });

  return NextResponse.json({ message: "Scraping started" }, { status: 202 });
}
