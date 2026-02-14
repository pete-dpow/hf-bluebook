import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";
import { scrapeAndStoreRegulation } from "@/lib/compliance/regulationScraper";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const maxDuration = 60; // Allow up to 60s for fetch-based fallback

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Verify regulation belongs to org and has a source URL
  const { data: regulation, error } = await supabaseAdmin
    .from("regulations")
    .select("id, scraper_config, source_url")
    .eq("id", params.id)
    .eq("organization_id", auth.organizationId)
    .single();

  if (error || !regulation) return NextResponse.json({ error: "Regulation not found" }, { status: 404 });

  const sourceUrl = regulation.scraper_config?.source_url || regulation.source_url;
  if (!sourceUrl) {
    return NextResponse.json({ error: "No source URL configured for scraping" }, { status: 400 });
  }

  const config = {
    source_url: sourceUrl,
    section_selector: regulation.scraper_config?.section_selector || "section, article, .section",
    content_selector: regulation.scraper_config?.content_selector || "p, li, td",
    section_ref_selector: regulation.scraper_config?.section_ref_selector,
  };

  // Primary: try Inngest + Playwright (async, runs on Inngest infrastructure)
  try {
    await inngest.send({
      name: "regulation/scrape.requested",
      data: {
        regulation_id: params.id,
        organization_id: auth.organizationId,
      },
    });

    return NextResponse.json({ message: "Scraping started", mode: "inngest" }, { status: 202 });
  } catch (inngestError) {
    // Inngest not configured — fall back to synchronous fetch-based scraping
    console.warn(`[scrape] Inngest unavailable, falling back to fetch-based scraping:`, inngestError);
  }

  // Fallback: synchronous fetch-based scraping (works on Vercel without Inngest)
  try {
    const result = await scrapeAndStoreRegulation(params.id, config);

    return NextResponse.json({
      message: "Scraping complete",
      mode: "fetch",
      sections_scraped: result.sections_scraped,
      sections_stored: result.sections_stored,
    });
  } catch (err: any) {
    console.error(`[scrape] Error scraping regulation ${params.id}:`, err);
    return NextResponse.json(
      { error: err.message || "Scraping failed" },
      { status: 500 }
    );
  }
}
