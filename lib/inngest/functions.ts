import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { scrapeManufacturerProducts } from "@/lib/scrapers/playwrightScraper";
import { generateQuotePdf } from "@/lib/quoteGenerator";

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

// 3. Send quote email with PDF attachment
const sendQuoteEmail = inngest.createFunction(
  { id: "send-quote-email", concurrency: [{ limit: 5 }] },
  { event: "quote/send.requested" },
  async ({ event, step }) => {
    const { quote_id, user_id } = event.data;

    // Fetch quote + line items
    const quote = await step.run("fetch-quote", async () => {
      const { data, error } = await supabaseAdmin
        .from("quotes")
        .select("*, quote_line_items(*)")
        .eq("id", quote_id)
        .single();

      if (error || !data) throw new Error("Quote not found");
      return data;
    });

    if (!quote.client_email) {
      throw new Error("Quote has no client email");
    }

    // Generate PDF
    const pdfBytes = await step.run("generate-pdf", async () => {
      const bytes = await generateQuotePdf(quote, quote.quote_line_items || []);
      return Buffer.from(bytes).toString("base64");
    });

    // Send email via Resend
    await step.run("send-email", async () => {
      const resend = new Resend(process.env.RESEND_API_KEY!);

      const createdDate = new Date(quote.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      await resend.emails.send({
        from: "HF.bluebook <noreply@dpow.co.uk>",
        to: quote.client_email,
        subject: `Quote ${quote.quote_number} from Harmony Fire`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #2A2A2A; margin: 0; padding: 40px 20px; background: #FCFCFA;">
              <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #E5E7EB;">

                <div style="padding: 40px 40px 32px 40px; border-bottom: 1px solid #E5E7EB;">
                  <h1 style="margin: 0 0 8px 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 36px; font-weight: 500; color: #0056A7;">
                    Harmony Fire
                  </h1>
                  <p style="margin: 0; font-size: 14px; color: #4B4B4B;">
                    Fire Protection Specialists
                  </p>
                </div>

                <div style="padding: 40px;">
                  <h2 style="margin: 0 0 24px 0; font-size: 20px; font-weight: 500; color: #2A2A2A;">
                    Quote ${quote.quote_number}
                  </h2>

                  <p style="margin: 0 0 16px 0; font-size: 16px;">
                    Dear ${quote.client_name},
                  </p>

                  <p style="margin: 0 0 16px 0; font-size: 15px; color: #4B4B4B;">
                    Please find attached your quotation${quote.project_name ? ` for ${quote.project_name}` : ""}.
                  </p>

                  <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="font-size: 13px; color: #6B7280;">Quote Number</span>
                      <span style="font-size: 13px; font-weight: 500;">${quote.quote_number}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                      <span style="font-size: 13px; color: #6B7280;">Date</span>
                      <span style="font-size: 13px;">${createdDate}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #E5E7EB; padding-top: 8px; margin-top: 8px;">
                      <span style="font-size: 15px; font-weight: 600; color: #0056A7;">Total</span>
                      <span style="font-size: 15px; font-weight: 600; color: #0056A7;">£${quote.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <p style="margin: 24px 0 0 0; font-size: 14px; color: #6B7280;">
                    The full quote is attached as a PDF. Please don't hesitate to get in touch if you have any questions.
                  </p>
                </div>

                <div style="padding: 24px 40px; background: #FCFCFA; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                    Sent via HF.bluebook — Harmony Fire
                  </p>
                </div>
              </div>
            </body>
          </html>
        `,
        attachments: [
          {
            filename: `${quote.quote_number}.pdf`,
            content: pdfBytes,
          },
        ],
      });
    });

    // Update quote status to sent
    await step.run("update-quote-status", async () => {
      await supabaseAdmin
        .from("quotes")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", quote_id);
    });

    return { sent: true, quote_id, to: quote.client_email };
  }
);

export const functions = [scrapeManufacturer, generateProductEmbeddings, sendQuoteEmail];
