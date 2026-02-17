import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";
import { scrapeShopifyProducts } from "@/lib/scrapers/shopifyScraper";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const scrapeType = body.scrape_type || "full";

  // Get manufacturer to check scraper config
  const { data: manufacturer } = await supabaseAdmin
    .from("manufacturers")
    .select("id, organization_id, scraper_config")
    .eq("id", params.id)
    .single();

  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  // Create scrape job
  const { data: job, error } = await supabaseAdmin.from("scrape_jobs").insert({
    manufacturer_id: params.id,
    started_by: auth.user.id,
    scrape_type: scrapeType,
    status: "queued",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Primary: try Inngest (async)
  try {
    await inngest.send({
      name: "manufacturer/scrape.requested",
      data: { manufacturer_id: params.id, job_id: job.id },
    });

    return NextResponse.json({ job, mode: "inngest" }, { status: 201 });
  } catch (inngestError) {
    console.warn(`[scrape] Inngest unavailable, checking for sync fallback:`, inngestError);
  }

  // Fallback: synchronous Shopify scraping (no Playwright needed)
  if (manufacturer.scraper_config?.type === "shopify") {
    try {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "running",
        started_at: new Date().toISOString(),
      }).eq("id", job.id);

      const products = await scrapeShopifyProducts(manufacturer.scraper_config);

      let created = 0;
      let updated = 0;
      const defaultPillar = manufacturer.scraper_config.default_pillar || "fire_stopping";

      for (const p of products) {
        const productCode = p.product_code || p.product_name.toLowerCase().replace(/\s+/g, "-").slice(0, 50);

        const { data: existing } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("manufacturer_id", params.id)
          .eq("product_code", productCode)
          .single();

        if (existing) {
          await supabaseAdmin.from("products").update({
            product_name: p.product_name,
            description: p.description,
            specifications: p.specifications,
            scraped_data: p,
            needs_review: true,
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
          updated++;
        } else {
          await supabaseAdmin.from("products").insert({
            manufacturer_id: params.id,
            organization_id: manufacturer.organization_id,
            pillar: defaultPillar,
            product_code: productCode,
            product_name: p.product_name,
            description: p.description,
            specifications: p.specifications,
            scraped_data: p,
            needs_review: true,
            status: "draft",
          });
          created++;
        }
      }

      await supabaseAdmin.from("scrape_jobs").update({
        status: "completed",
        products_created: created,
        products_updated: updated,
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);

      await supabaseAdmin.from("manufacturers").update({
        last_scraped_at: new Date().toISOString(),
      }).eq("id", params.id);

      return NextResponse.json({
        job,
        mode: "fetch",
        products_created: created,
        products_updated: updated,
        total: products.length,
      });
    } catch (err: any) {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "failed",
        error_log: err.message || "Scraping failed",
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);

      return NextResponse.json({ error: err.message || "Scraping failed" }, { status: 500 });
    }
  }

  // No fallback available for Playwright-based scrapers
  await supabaseAdmin.from("scrape_jobs").update({
    status: "failed",
    error_log: "Inngest unavailable and no sync fallback for this scraper type",
    completed_at: new Date().toISOString(),
  }).eq("id", job.id);

  return NextResponse.json(
    { error: "Inngest unavailable — Playwright-based scraping requires Inngest infrastructure" },
    { status: 503 }
  );
}
