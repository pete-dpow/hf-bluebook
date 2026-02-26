import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";
import { scrapeShopifyProducts, categorizePdf, type ShopifyScraperConfig } from "@/lib/scrapers/shopifyScraper";
import { scrapeWithHtmlConfig, type HtmlScraperConfig } from "@/lib/scrapers/htmlScraper";
import type { ScrapedProduct } from "@/lib/scrapers/playwrightScraper";
import { generateEmbeddingsBatch } from "@/lib/embeddingService";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const maxDuration = 60;

/**
 * Extract the origin (protocol + host) from a URL.
 * e.g. "https://quelfire.co.uk/pages/foo" → "https://quelfire.co.uk"
 */
function extractOrigin(websiteUrl: string): string {
  try {
    return new URL(websiteUrl).origin;
  } catch {
    // If it's not a valid URL, return as-is stripped of trailing slashes
    return websiteUrl.replace(/\/+$/, "");
  }
}

/**
 * Auto-detect if a URL is a Shopify store by probing /products.json
 * Uses the origin (host) only — ignores any path in the URL.
 */
async function detectShopify(websiteUrl: string): Promise<{ detected: boolean; storeUrl: string }> {
  const storeUrl = extractOrigin(websiteUrl);
  try {
    const url = storeUrl + "/products.json?limit=1";
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0)",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { detected: false, storeUrl };
    const data = await res.json();
    return { detected: Array.isArray(data?.products), storeUrl };
  } catch {
    return { detected: false, storeUrl };
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const scrapeType = body.scrape_type || "full";
  const dryRun = body.dry_run === true;

  // Get manufacturer
  const { data: manufacturer } = await supabaseAdmin
    .from("manufacturers")
    .select("id, organization_id, website_url, scraper_config")
    .eq("id", params.id)
    .single();

  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  // Determine scraper type — explicit config or auto-detect from website_url
  let isShopify = manufacturer.scraper_config?.type === "shopify";
  let shopifyConfig: ShopifyScraperConfig | null = null;

  if (isShopify) {
    shopifyConfig = manufacturer.scraper_config as ShopifyScraperConfig;
  } else if (manufacturer.website_url && !manufacturer.scraper_config?.product_list_url) {
    // No explicit config — try auto-detecting Shopify (uses origin only)
    const detection = await detectShopify(manufacturer.website_url);
    isShopify = detection.detected;
    if (isShopify) {
      shopifyConfig = {
        type: "shopify",
        store_url: detection.storeUrl,
        default_pillar: "fire_stopping",
      };
      // Save detected config for future scrapes
      await supabaseAdmin.from("manufacturers").update({
        scraper_config: shopifyConfig,
      }).eq("id", params.id);
    }
  }

  // ── Dry run: scrape without writing to DB ──
  if (dryRun) {
    const noopProgress = () => {};
    let products: ScrapedProduct[] = [];

    try {
      if (isShopify && shopifyConfig) {
        products = await scrapeShopifyProducts(shopifyConfig, noopProgress);
      } else if (manufacturer.scraper_config?.type === "html") {
        products = await scrapeWithHtmlConfig(manufacturer.scraper_config as HtmlScraperConfig, noopProgress);
      } else {
        return NextResponse.json({ error: "Dry run only supports shopify and html scrapers" }, { status: 400 });
      }
    } catch (err: any) {
      return NextResponse.json({ dry_run: true, error: err.message, total_products: 0 }, { status: 500 });
    }

    // Check which would be new vs update
    const existingCodes = new Set<string>();
    for (const p of products) {
      const code = p.product_code || p.product_name.toLowerCase().replace(/\s+/g, "-").slice(0, 50);
      const { data } = await supabaseAdmin
        .from("products")
        .select("id")
        .eq("manufacturer_id", params.id)
        .eq("product_code", code)
        .single();
      if (data) existingCodes.add(code);
    }

    // Group by category from specifications
    const categories: Record<string, number> = {};
    for (const p of products) {
      const cat = (p.specifications as any)?.Category || (p.specifications as any)?.["White Book Section"] || "Uncategorized";
      categories[cat] = (categories[cat] || 0) + 1;
    }

    return NextResponse.json({
      dry_run: true,
      total_products: products.length,
      would_create: products.length - existingCodes.size,
      would_update: existingCodes.size,
      categories,
      sample_products: products.slice(0, 25).map((p) => ({
        product_name: p.product_name,
        product_code: p.product_code,
        has_description: !!p.description,
        spec_count: Object.keys(p.specifications || {}).length,
        pdf_count: p.pdf_urls?.length || 0,
        source_url: p.source_url,
      })),
    });
  }

  // Create scrape job
  const { data: job, error } = await supabaseAdmin.from("scrape_jobs").insert({
    manufacturer_id: params.id,
    started_by: auth.user.id,
    scrape_type: scrapeType,
    status: "queued",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Progress callback: throttled DB updates so the UI can track progress ──
  let lastProgressUpdate = 0;
  let lastStats: Record<string, any> | undefined;
  const updateProgress = async (progress: { stage: string; current: number; total: number; found: number; stats?: Record<string, any> }) => {
    if (progress.stats) lastStats = progress.stats;
    const now = Date.now();
    if (now - lastProgressUpdate < 1500) return; // Throttle: max every 1.5s
    lastProgressUpdate = now;
    await supabaseAdmin.from("scrape_jobs").update({ progress }).eq("id", job.id).then(() => {});
  };

  // ── Primary: run sync scrapers directly (Shopify & HTML) ──
  // These don't need Playwright/browser, so run them inline for immediate results.

  if (isShopify && shopifyConfig) {
    return runSyncScrape(job.id, params.id, manufacturer, "shopify", async () => {
      const products = await scrapeShopifyProducts(shopifyConfig!, updateProgress);
      return products;
    }, shopifyConfig.default_pillar || "fire_stopping", () => lastStats);
  }

  const isHtml = manufacturer.scraper_config?.type === "html";
  const isPlaywrightSitemap = isHtml && (manufacturer.scraper_config as HtmlScraperConfig).detail?.method === "sitemap-playwright";

  // Route sitemap-playwright to Inngest (needs Playwright browser)
  if (isPlaywrightSitemap) {
    const inngestConfigured = !!process.env.INNGEST_EVENT_KEY;
    if (inngestConfigured) {
      try {
        await inngest.send({
          name: "manufacturer/scrape-playwright.requested",
          data: { manufacturer_id: params.id, job_id: job.id },
        });
        return NextResponse.json({ job, mode: "inngest-playwright" }, { status: 201 });
      } catch (inngestError: any) {
        console.warn(`[scrape] Inngest send failed:`, inngestError.message);
        // Fall through to regular HTML scrape
      }
    }
  }

  if (isHtml) {
    const htmlConfig = manufacturer.scraper_config as HtmlScraperConfig;
    return runSyncScrape(job.id, params.id, manufacturer, "html", async () => {
      const products = await scrapeWithHtmlConfig(htmlConfig, updateProgress);
      return products;
    }, htmlConfig.default_pillar || "fire_stopping", () => lastStats);
  }

  // ── Fallback: Inngest for Playwright-dependent sites ──
  const inngestConfigured = !!process.env.INNGEST_EVENT_KEY;

  if (inngestConfigured) {
    try {
      await inngest.send({
        name: "manufacturer/scrape.requested",
        data: { manufacturer_id: params.id, job_id: job.id },
      });

      return NextResponse.json({ job, mode: "inngest" }, { status: 201 });
    } catch (inngestError: any) {
      console.warn(`[scrape] Inngest send failed:`, inngestError.message);
    }
  }

  // No scraper available — provide clear error
  let reason: string;
  if (!manufacturer.website_url) {
    reason = "No website URL configured for this manufacturer.";
  } else if (!manufacturer.scraper_config?.type) {
    reason = "No scraper configured. Click 'Seed Suppliers' to set up scraper configs, or add a scraper_config with type 'shopify' or 'html'.";
  } else if (!inngestConfigured) {
    reason = `Scraper type "${manufacturer.scraper_config.type}" requires Inngest (not configured). Set INNGEST_EVENT_KEY in environment variables, or switch to 'shopify' or 'html' scraper type.`;
  } else {
    reason = "Scraping failed — no compatible scraper could process this manufacturer.";
  }

  await supabaseAdmin.from("scrape_jobs").update({
    status: "failed",
    error_log: reason,
    completed_at: new Date().toISOString(),
  }).eq("id", job.id);

  return NextResponse.json({ error: reason }, { status: 400 });
}

// ---------------------------------------------------------------------------
// Shared: run a synchronous scrape, upsert products, update job
// ---------------------------------------------------------------------------

async function runSyncScrape(
  jobId: string,
  manufacturerId: string,
  manufacturer: { id: string; organization_id: string },
  mode: string,
  scrapeFn: () => Promise<ScrapedProduct[]>,
  defaultPillar: string,
  getLastStats?: () => Record<string, any> | undefined
) {
  const scrapeStart = Date.now();
  try {
    await supabaseAdmin.from("scrape_jobs").update({
      status: "running",
      started_at: new Date().toISOString(),
      progress: { stage: "Starting scrape", current: 0, total: 0, found: 0 },
    }).eq("id", jobId);

    const products = await scrapeFn();

    // Update progress: saving products
    await supabaseAdmin.from("scrape_jobs").update({
      progress: { stage: `Saving ${products.length} products`, current: 0, total: products.length, found: products.length },
    }).eq("id", jobId);

    const { created, updated, filesCreated } = await upsertScrapedProducts(
      products, manufacturerId, manufacturer.organization_id, defaultPillar
    );

    const durationSeconds = Math.round((Date.now() - scrapeStart) / 1000);
    const scrapeStats = getLastStats?.();
    await supabaseAdmin.from("scrape_jobs").update({
      status: "completed",
      products_created: created,
      products_updated: updated,
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      progress: {
        stage: "Complete",
        current: products.length,
        total: products.length,
        found: products.length,
        ...(scrapeStats ? { stats: scrapeStats } : {}),
      },
    }).eq("id", jobId);

    await supabaseAdmin.from("manufacturers").update({
      last_scraped_at: new Date().toISOString(),
    }).eq("id", manufacturerId);

    // Generate embeddings for products that don't have them yet
    await supabaseAdmin.from("scrape_jobs").update({
      progress: { stage: "Generating embeddings", current: 0, total: products.length, found: products.length },
    }).eq("id", jobId);

    let embedded = 0;
    try {
      const { data: unembedded } = await supabaseAdmin
        .from("products")
        .select("id, product_name, description, pillar, specifications")
        .eq("manufacturer_id", manufacturerId)
        .is("embedding", null)
        .limit(100);

      if (unembedded && unembedded.length > 0) {
        const texts = unembedded.map((p: any) =>
          [p.product_name, p.description, p.pillar, p.specifications ? JSON.stringify(p.specifications) : ""]
            .filter(Boolean).join(" — ")
        );

        const embeddings = await generateEmbeddingsBatch(texts);

        for (let i = 0; i < embeddings.length; i++) {
          await supabaseAdmin
            .from("products")
            .update({ embedding: embeddings[i].embedding })
            .eq("id", unembedded[i].id);
          embedded++;
        }
      }
    } catch (embErr: any) {
      console.warn(`[scrape] Embedding generation failed (non-fatal):`, embErr.message);
    }

    // Trigger auto-normalization via Inngest (non-blocking)
    try {
      await inngest.send({
        name: "products/normalize.requested",
        data: { manufacturer_id: manufacturerId, organization_id: manufacturer.organization_id },
      });
    } catch (normErr: any) {
      console.warn(`[scrape] Normalize trigger failed (non-fatal):`, normErr.message);
    }

    return NextResponse.json({
      job: { id: jobId },
      mode,
      products_created: created,
      products_updated: updated,
      files_created: filesCreated,
      products_embedded: embedded,
      total: products.length,
    });
  } catch (err: any) {
    const durationSeconds = Math.round((Date.now() - scrapeStart) / 1000);
    const errorMsg = err.message || "Scraping failed";
    console.error(`[scrape] Failed after ${durationSeconds}s:`, errorMsg);

    await supabaseAdmin.from("scrape_jobs").update({
      status: "failed",
      error_log: errorMsg,
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      progress: { stage: `Failed: ${errorMsg}`, current: 0, total: 0, found: 0 },
    }).eq("id", jobId);

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

async function upsertScrapedProducts(
  products: ScrapedProduct[],
  manufacturerId: string,
  organizationId: string,
  defaultPillar: string
): Promise<{ created: number; updated: number; filesCreated: number }> {
  let created = 0;
  let updated = 0;
  let filesCreated = 0;

  for (const p of products) {
    const productCode = p.product_code || p.product_name.toLowerCase().replace(/\s+/g, "-").slice(0, 50);

    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("manufacturer_id", manufacturerId)
      .eq("product_code", productCode)
      .single();

    let productId: string;

    if (existing) {
      await supabaseAdmin.from("products").update({
        product_name: p.product_name,
        description: p.description,
        specifications: p.specifications,
        scraped_data: p,
        needs_review: true,
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
      productId = existing.id;
      updated++;
    } else {
      const { data: newProduct } = await supabaseAdmin.from("products").insert({
        manufacturer_id: manufacturerId,
        organization_id: organizationId,
        pillar: defaultPillar,
        product_code: productCode,
        product_name: p.product_name,
        description: p.description,
        specifications: p.specifications,
        scraped_data: p,
        needs_review: true,
        status: "draft",
      }).select("id").single();
      productId = newProduct?.id;
      created++;
    }

    // Save PDF files as product_files records
    if (productId && p.pdf_urls && p.pdf_urls.length > 0) {
      // Remove existing scraped files for this product (avoid duplicates on re-scrape)
      await supabaseAdmin
        .from("product_files")
        .delete()
        .eq("product_id", productId)
        .is("uploaded_by", null);

      for (const pdfUrl of p.pdf_urls) {
        const { type, name } = categorizePdf(pdfUrl);
        await supabaseAdmin.from("product_files").insert({
          product_id: productId,
          file_type: type,
          file_name: name,
          file_url: pdfUrl,
          mime_type: "application/pdf",
        });
        filesCreated++;
      }
    }
  }

  return { created, updated, filesCreated };
}
