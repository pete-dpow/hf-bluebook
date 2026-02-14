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

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });
  if (!auth.organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  // Fetch all regulations with a source URL for this org
  const { data: regulations, error } = await supabaseAdmin
    .from("regulations")
    .select("id, source_url, scraper_config")
    .eq("organization_id", auth.organizationId)
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const scrapeable = (regulations || []).filter((r) => {
    const url = r.scraper_config?.source_url || r.source_url;
    return !!url;
  });

  if (scrapeable.length === 0) {
    return NextResponse.json({ error: "No regulations have source URLs configured" }, { status: 400 });
  }

  // Try Inngest first — fire events for all regulations at once
  try {
    await inngest.send(
      scrapeable.map((r) => ({
        name: "regulation/scrape.requested" as const,
        data: {
          regulation_id: r.id,
          organization_id: auth.organizationId!,
        },
      }))
    );

    return NextResponse.json({
      message: `Scraping started for ${scrapeable.length} regulations`,
      mode: "inngest",
      regulation_ids: scrapeable.map((r) => r.id),
      total: scrapeable.length,
    }, { status: 202 });
  } catch (inngestError) {
    console.warn(`[scrape-all] Inngest unavailable, falling back to fetch-based scraping:`, inngestError);
  }

  // Fallback: synchronous fetch-based scraping (sequential)
  const results: { id: string; status: string; sections?: number }[] = [];

  for (const reg of scrapeable) {
    const sourceUrl = reg.scraper_config?.source_url || reg.source_url;
    const config = {
      source_url: sourceUrl,
      section_selector: reg.scraper_config?.section_selector || "section, article, .section",
      content_selector: reg.scraper_config?.content_selector || "p, li, td",
      section_ref_selector: reg.scraper_config?.section_ref_selector,
    };

    try {
      const result = await scrapeAndStoreRegulation(reg.id, config);
      results.push({ id: reg.id, status: "ok", sections: result.sections_stored });
    } catch (err: any) {
      console.error(`[scrape-all] Error scraping ${reg.id}:`, err.message);
      results.push({ id: reg.id, status: "error" });
    }
  }

  const succeeded = results.filter((r) => r.status === "ok").length;

  return NextResponse.json({
    message: `Scraped ${succeeded}/${scrapeable.length} regulations`,
    mode: "fetch",
    results,
    total: scrapeable.length,
  });
}
