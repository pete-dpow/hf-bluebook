/**
 * PDF Pipeline — download, parse, and enrich products with PDF content.
 * Finds product_files with external URLs but no parsed content,
 * downloads PDFs, parses text, appends to product description,
 * and flags for re-normalization.
 *
 * Triggered after scrape/Playwright fetch completion.
 */

import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BATCH_SIZE = 50;

export const processProductPdfs = inngest.createFunction(
  { id: "process-product-pdfs", concurrency: [{ limit: 1 }] },
  { event: "products/pdf-parse.requested" },
  async ({ event, step }) => {
    const { manufacturer_id, organization_id } = event.data;

    // Find product files with external URLs that haven't been parsed
    const files = await step.run("get-unprocessed-files", async () => {
      let query = supabaseAdmin
        .from("product_files")
        .select("id, product_id, file_url, file_name, file_type, parsed_data")
        .not("file_url", "is", null)
        .is("parsed_data", null)
        .eq("mime_type", "application/pdf")
        .limit(BATCH_SIZE);

      // Filter by manufacturer's products if specified
      if (manufacturer_id) {
        const { data: productIds } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("manufacturer_id", manufacturer_id);
        if (productIds && productIds.length > 0) {
          query = query.in("product_id", productIds.map((p) => p.id));
        }
      }

      const { data } = await query;
      return data || [];
    });

    if (files.length === 0) {
      return { processed: 0, message: "No unprocessed PDF files found" };
    }

    let processed = 0;
    let failed = 0;

    for (const file of files) {
      await step.run(`process-pdf-${file.id}`, async () => {
        try {
          // Download PDF from external URL
          const response = await fetch(file.file_url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; HFBluebook/1.0)",
            },
            signal: AbortSignal.timeout(30_000),
          });

          if (!response.ok) {
            console.warn(`[pdfPipeline] Failed to download ${file.file_url}: ${response.status}`);
            failed++;
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Parse PDF
          const { parseProductPdf } = await import("@/lib/productFileParser");
          const parsed = await parseProductPdf(buffer);

          if (!parsed.text || parsed.text.trim().length === 0) {
            // Mark as parsed but empty
            await supabaseAdmin
              .from("product_files")
              .update({ parsed_data: { text: "", pages: parsed.pageCount, empty: true } })
              .eq("id", file.id);
            return;
          }

          // Store parsed data on the file record
          await supabaseAdmin
            .from("product_files")
            .update({
              parsed_data: {
                text: parsed.text.slice(0, 10_000),
                pages: parsed.pageCount,
                metadata: parsed.metadata,
                parsed_at: new Date().toISOString(),
              },
            })
            .eq("id", file.id);

          // Append extracted text to product description
          const { data: product } = await supabaseAdmin
            .from("products")
            .select("id, description")
            .eq("id", file.product_id)
            .single();

          if (product) {
            const existingDesc = product.description || "";
            const pdfExcerpt = parsed.text.slice(0, 2000);
            const appendedDesc = existingDesc
              ? `${existingDesc}\n\n--- Extracted from ${file.file_name} ---\n${pdfExcerpt}`
              : pdfExcerpt;

            await supabaseAdmin
              .from("products")
              .update({
                description: appendedDesc,
                normalized_at: null, // Flag for re-normalization
                needs_review: true,
                updated_at: new Date().toISOString(),
              })
              .eq("id", product.id);
          }

          // Upload to Supabase storage for permanent storage
          try {
            const storagePath = `${file.product_id}/${file.file_name}`;
            await supabaseAdmin.storage
              .from("product-files")
              .upload(storagePath, buffer, {
                contentType: "application/pdf",
                upsert: true,
              });

            await supabaseAdmin
              .from("product_files")
              .update({ file_path: storagePath })
              .eq("id", file.id);
          } catch {
            // Non-critical — external URL still available
          }

          processed++;
        } catch (err: any) {
          console.error(`[pdfPipeline] Error processing ${file.file_name}:`, err.message);
          failed++;
        }
      });
    }

    // Check if more files remain
    const { count } = await step.run("check-remaining", async () => {
      let query = supabaseAdmin
        .from("product_files")
        .select("id", { count: "exact", head: true })
        .not("file_url", "is", null)
        .is("parsed_data", null)
        .eq("mime_type", "application/pdf");

      if (manufacturer_id) {
        const { data: productIds } = await supabaseAdmin
          .from("products")
          .select("id")
          .eq("manufacturer_id", manufacturer_id);
        if (productIds && productIds.length > 0) {
          query = query.in("product_id", productIds.map((p) => p.id));
        }
      }

      const { count } = await query;
      return { count: count || 0 };
    });

    // Self-queue if more files remain
    if (count > 0) {
      await step.sendEvent("queue-next-batch", {
        name: "products/pdf-parse.requested",
        data: { manufacturer_id, organization_id },
      });
    }

    // Trigger normalization for products whose descriptions were updated
    if (processed > 0) {
      await step.sendEvent("trigger-normalize", {
        name: "products/normalize.requested",
        data: { manufacturer_id, organization_id },
      });
    }

    return { processed, failed, remaining: count };
  }
);
