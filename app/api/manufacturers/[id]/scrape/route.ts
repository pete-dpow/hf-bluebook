import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";
import { inngest } from "@/lib/inngest/client";
import { scrapeShopifyProducts, categorizePdf, type ShopifyScraperConfig } from "@/lib/scrapers/shopifyScraper";

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
  if (isShopify && shopifyConfig) {
    try {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "running",
        started_at: new Date().toISOString(),
      }).eq("id", job.id);

      const products = await scrapeShopifyProducts(shopifyConfig);

      let created = 0;
      let updated = 0;
      let filesCreated = 0;
      const defaultPillar = shopifyConfig.default_pillar || "fire_stopping";

      for (const p of products) {
        const productCode = p.product_code || p.product_name.toLowerCase().replace(/\s+/g, "-").slice(0, 50);

        const { data: existing } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("manufacturer_id", params.id)
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
            .is("uploaded_by", null); // Only delete auto-scraped files (no uploaded_by)

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
        mode: "shopify",
        products_created: created,
        products_updated: updated,
        files_created: filesCreated,
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

  // No website_url and no scraper config — nothing to scrape
  const reason = manufacturer.website_url
    ? "This website requires Playwright scraping (needs Inngest infrastructure configured)"
    : "No website URL configured for this manufacturer";

  await supabaseAdmin.from("scrape_jobs").update({
    status: "failed",
    error_log: reason,
    completed_at: new Date().toISOString(),
  }).eq("id", job.id);

  return NextResponse.json({ error: reason }, { status: 400 });
}
