/**
 * AI Scraper Inngest function.
 * Orchestrates: discover URLs → Playwright fetch → GPT-4o extract → upsert products.
 * Activated when a manufacturer has a website_url but no scraper_config.
 */

import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";
import {
  discoverProductUrls,
  extractProductWithAi,
  sanitizeHtml,
} from "@/lib/scrapers/aiScraper";
import { fetchPagesWithPlaywright } from "@/lib/scrapers/playwrightDetailFetcher";
import { categorizePdf } from "@/lib/scrapers/shopifyScraper";
import type { ScrapedProduct } from "@/lib/scrapers/playwrightScraper";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PLAYWRIGHT_BATCH_SIZE = 50;
const AI_EXTRACT_BATCH_SIZE = 10;
const AI_DELAY_MS = 3_000; // ~20 calls/minute

export const scrapeManufacturerAI = inngest.createFunction(
  { id: "scrape-manufacturer-ai", concurrency: [{ limit: 1 }] },
  { event: "manufacturer/scrape-ai.requested" },
  async ({ event, step }) => {
    const { manufacturer_id, job_id } = event.data;

    // Step 1: Get manufacturer
    const manufacturer = await step.run("get-manufacturer", async () => {
      const { data } = await supabaseAdmin
        .from("manufacturers")
        .select("*")
        .eq("id", manufacturer_id)
        .single();
      return data;
    });

    if (!manufacturer?.website_url) {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "failed",
        error_log: "No website URL configured",
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);
      return { error: "No website URL" };
    }

    // Step 2: Mark running
    await step.run("mark-running", async () => {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "running",
        started_at: new Date().toISOString(),
        progress: { stage: "AI: Discovering product URLs", current: 0, total: 0, found: 0 },
      }).eq("id", job_id);
    });

    // Step 3: Discover product URLs (sitemap + AI navigation)
    const discovery = await step.run("discover-urls", async () => {
      // For AI navigation, we need Playwright to fetch pages
      // Use a single-page fetch helper
      async function fetchPageHtml(url: string): Promise<string | null> {
        const results = await fetchPagesWithPlaywright([url], {
          concurrency: 1,
          timeoutMs: 30_000,
        });
        return results[0]?.html || null;
      }

      const result = await discoverProductUrls(
        manufacturer.website_url,
        manufacturer.name,
        fetchPageHtml,
        async (stage, detail) => {
          await supabaseAdmin.from("scrape_jobs").update({
            progress: { stage: `AI: ${stage}`, current: 0, total: 0, found: 0, detail },
          }).eq("id", job_id);
        }
      );

      return result;
    });

    const productUrls = discovery.product_urls;

    if (productUrls.length === 0) {
      await step.run("mark-no-products", async () => {
        await supabaseAdmin.from("scrape_jobs").update({
          status: "completed",
          products_created: 0,
          products_updated: 0,
          completed_at: new Date().toISOString(),
          progress: {
            stage: "AI: No product URLs discovered",
            current: 0, total: 0, found: 0,
            stats: { method: discovery.method, urlsFound: 0 },
          },
        }).eq("id", job_id);
      });
      return { created: 0, updated: 0, total: 0 };
    }

    await step.run("update-progress-discovery", async () => {
      await supabaseAdmin.from("scrape_jobs").update({
        progress: {
          stage: `AI: Found ${productUrls.length} product URLs (${discovery.method})`,
          current: 0, total: productUrls.length, found: 0,
        },
      }).eq("id", job_id);
    });

    // Step 4: Fetch pages with Playwright in batches
    const allFetchResults: { url: string; html: string | null }[] = [];

    for (let i = 0; i < productUrls.length; i += PLAYWRIGHT_BATCH_SIZE) {
      const batchIndex = Math.floor(i / PLAYWRIGHT_BATCH_SIZE);
      const batchUrls = productUrls.slice(i, i + PLAYWRIGHT_BATCH_SIZE);

      const batchResults = await step.run(`playwright-batch-${batchIndex}`, async () => {
        await supabaseAdmin.from("scrape_jobs").update({
          progress: {
            stage: `AI: Fetching pages (batch ${batchIndex + 1}/${Math.ceil(productUrls.length / PLAYWRIGHT_BATCH_SIZE)})`,
            current: i,
            total: productUrls.length,
            found: 0,
          },
        }).eq("id", job_id);

        const results = await fetchPagesWithPlaywright(batchUrls, {
          concurrency: 3,
          timeoutMs: 30_000,
        });

        return results.map((r) => ({ url: r.url, html: r.html }));
      });

      allFetchResults.push(...batchResults);
    }

    // Step 5: Extract products with GPT-4o in batches
    const allProducts: ScrapedProduct[] = [];
    const successfulFetches = allFetchResults.filter((r) => r.html);

    for (let i = 0; i < successfulFetches.length; i += AI_EXTRACT_BATCH_SIZE) {
      const batchIndex = Math.floor(i / AI_EXTRACT_BATCH_SIZE);
      const batch = successfulFetches.slice(i, i + AI_EXTRACT_BATCH_SIZE);

      const batchProducts = await step.run(`ai-extract-batch-${batchIndex}`, async () => {
        const products: ScrapedProduct[] = [];

        for (const { url, html } of batch) {
          try {
            await supabaseAdmin.from("scrape_jobs").update({
              progress: {
                stage: `AI: Extracting products (${i + products.length + 1}/${successfulFetches.length})`,
                current: i + products.length,
                total: successfulFetches.length,
                found: allProducts.length + products.length,
              },
            }).eq("id", job_id);

            const product = await extractProductWithAi(html!, url, manufacturer.name);
            if (product) {
              products.push(product);
            }

            // Rate limit
            await new Promise((r) => setTimeout(r, AI_DELAY_MS));
          } catch (err: any) {
            console.error(`[aiScraper] Extraction failed for ${url}:`, err.message);
          }
        }

        return products;
      });

      allProducts.push(...batchProducts);
    }

    // Step 6: Upsert products
    const { created, updated, filesCreated } = await step.run("upsert-products", async () => {
      let created = 0;
      let updated = 0;
      let filesCreated = 0;
      const defaultPillar = manufacturer.scraper_config?.default_pillar || "fire_stopping";

      for (const p of allProducts) {
        const productCode = p.product_code || p.product_name.toLowerCase().replace(/\s+/g, "-").slice(0, 50);

        const { data: existing } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("manufacturer_id", manufacturer_id)
          .eq("product_code", productCode)
          .single();

        let productId: string | undefined;

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
            manufacturer_id,
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

        // Save PDF files
        if (productId && p.pdf_urls && p.pdf_urls.length > 0) {
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
    });

    // Step 7: Mark complete
    await step.run("mark-complete", async () => {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "completed",
        products_created: created,
        products_updated: updated,
        completed_at: new Date().toISOString(),
        progress: {
          stage: "Complete",
          current: allProducts.length,
          total: allProducts.length,
          found: allProducts.length,
          stats: {
            method: discovery.method,
            urlsDiscovered: productUrls.length,
            pagesFetched: successfulFetches.length,
            pagesFailed: allFetchResults.length - successfulFetches.length,
            productsExtracted: allProducts.length,
            filesCreated,
          },
        },
      }).eq("id", job_id);

      await supabaseAdmin.from("manufacturers").update({
        last_scraped_at: new Date().toISOString(),
      }).eq("id", manufacturer_id);
    });

    // Step 8: Trigger downstream pipelines
    await step.sendEvent("trigger-embeddings", {
      name: "products/embeddings.requested",
      data: { manufacturer_id, organization_id: manufacturer.organization_id },
    });

    await step.sendEvent("trigger-normalize", {
      name: "products/normalize.requested",
      data: { manufacturer_id, organization_id: manufacturer.organization_id },
    });

    await step.sendEvent("trigger-pdf-parse", {
      name: "products/pdf-parse.requested",
      data: { manufacturer_id, organization_id: manufacturer.organization_id },
    });

    return {
      created,
      updated,
      total: allProducts.length,
      discovery_method: discovery.method,
      urls_discovered: productUrls.length,
      pages_fetched: successfulFetches.length,
    };
  }
);
