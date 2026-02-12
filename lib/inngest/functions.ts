import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";
import { scrapeManufacturerProducts } from "@/lib/scrapers/playwrightScraper";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 1. Scrape manufacturer products
const scrapeManufacturer = inngest.createFunction(
  { id: "scrape-manufacturer", concurrency: [{ limit: 2 }] },
  { event: "manufacturer/scrape.requested" },
  async ({ event, step }) => {
    const { manufacturer_id, job_id } = event.data;

    // Get manufacturer + scraper config
    const { data: manufacturer } = await step.run("get-manufacturer", async () => {
      const { data } = await supabaseAdmin
        .from("manufacturers")
        .select("*")
        .eq("id", manufacturer_id)
        .single();
      return data;
    });

    if (!manufacturer?.scraper_config?.product_list_url) {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "failed",
        error_log: "No scraper config or product_list_url set",
        completed_at: new Date().toISOString(),
      }).eq("id", job_id);
      return { error: "No scraper config" };
    }

    // Update job to running
    await step.run("mark-running", async () => {
      await supabaseAdmin.from("scrape_jobs").update({
        status: "running",
        started_at: new Date().toISOString(),
      }).eq("id", job_id);
    });

    // Run scraper
    const products = await step.run("scrape-products", async () => {
      return scrapeManufacturerProducts(
        manufacturer.scraper_config,
        async (current, total, found) => {
          await supabaseAdmin.from("scrape_jobs").update({
            progress: { current_page: current, total_pages: total, products_found: found },
          }).eq("id", job_id);
        }
      );
    });

    // Upsert products
    const { created, updated } = await step.run("upsert-products", async () => {
      let created = 0;
      let updated = 0;

      for (const p of products) {
        const productCode = p.product_code || p.product_name.toLowerCase().replace(/\s+/g, "-").slice(0, 50);

        const { data: existing } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("manufacturer_id", manufacturer_id)
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
            manufacturer_id,
            organization_id: manufacturer.organization_id,
            pillar: "fire_stopping", // default — needs manual review
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

      return { created, updated };
    });

    // Mark complete
    await step.run("mark-complete", async () => {
      const startedAt = new Date(manufacturer.last_scraped_at || Date.now());
      await supabaseAdmin.from("scrape_jobs").update({
        status: "completed",
        products_created: created,
        products_updated: updated,
        completed_at: new Date().toISOString(),
        duration_seconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
      }).eq("id", job_id);

      await supabaseAdmin.from("manufacturers").update({
        last_scraped_at: new Date().toISOString(),
      }).eq("id", manufacturer_id);
    });

    // Trigger embedding generation
    await step.sendEvent("trigger-embeddings", {
      name: "products/embeddings.requested",
      data: { manufacturer_id, organization_id: manufacturer.organization_id },
    });

    return { created, updated, total: products.length };
  }
);

// 2. Generate product embeddings
const generateProductEmbeddings = inngest.createFunction(
  { id: "generate-product-embeddings", concurrency: [{ limit: 1 }] },
  { event: "products/embeddings.requested" },
  async ({ event, step }) => {
    const { organization_id, manufacturer_id } = event.data;

    const products = await step.run("get-products", async () => {
      let query = supabaseAdmin
        .from("products")
        .select("id, product_name, description, specifications, pillar")
        .eq("organization_id", organization_id)
        .is("embedding", null);

      if (manufacturer_id) {
        query = query.eq("manufacturer_id", manufacturer_id);
      }

      const { data } = await query.limit(100);
      return data || [];
    });

    let embedded = 0;

    for (const product of products) {
      await step.run(`embed-${product.id}`, async () => {
        const text = [
          product.product_name,
          product.description,
          product.pillar,
          ...Object.entries(product.specifications || {}).map(([k, v]) => `${k}: ${v}`),
        ].filter(Boolean).join(". ");

        const response = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: text,
          }),
        });

        const result = await response.json();
        const embedding = result.data?.[0]?.embedding;

        if (embedding) {
          await supabaseAdmin
            .from("products")
            .update({ embedding })
            .eq("id", product.id);
          embedded++;
        }
      });
    }

    return { embedded, total: products.length };
  }
);

export const functions = [scrapeManufacturer, generateProductEmbeddings];
