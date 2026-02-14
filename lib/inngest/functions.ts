import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { scrapeManufacturerProducts } from "@/lib/scrapers/playwrightScraper";
import { generateQuotePdf } from "@/lib/quoteGenerator";
import { scrapeAndStoreRegulation } from "@/lib/compliance/regulationScraper";
import { extractPagesFromPdf, chunkPages } from "@/lib/bluebook/chunker";
import { embedChunks } from "@/lib/bluebook/embeddings";
import { detectPillar } from "@/lib/bluebook/pillarDetector";
import { compileGoldenThreadData } from "@/lib/goldenThread/compiler";
import { validateGoldenThread } from "@/lib/goldenThread/validator";
import { generateGoldenThreadPdf } from "@/lib/goldenThread/pdfGenerator";
import { generateGoldenThreadJson, generateGoldenThreadCsvs } from "@/lib/goldenThread/exporters";
import { uploadGoldenThreadWithFallback } from "@/lib/sharepoint/uploadWithFallback";
import { processSurveyScan } from "@/lib/inngest/surveyFunctions";
import { analyzeFloorPlan } from "@/lib/inngest/autoplanFunctions";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
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
        from: "hf.bluebook <noreply@dpow.co.uk>",
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
                    Sent via hf.bluebook — Harmony Fire
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

// 4. Ingest bluebook PDFs — download from OneDrive, chunk, embed, store
const ingestBluebookPDFs = inngest.createFunction(
  { id: "ingest-bluebook-pdfs", concurrency: [{ limit: 2 }] },
  { event: "bluebook/ingest.requested" },
  async ({ event, step }) => {
    const { ingestion_id, org_id, source_file, source_file_drive_id } = event.data;

    // Mark as processing
    await step.run("mark-processing", async () => {
      await supabaseAdmin
        .from("bluebook_ingestion_log")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
        })
        .eq("id", ingestion_id);
    });

    // Download PDF from OneDrive via M365 Graph API
    const pdfBuffer = await step.run("download-pdf", async () => {
      if (!source_file_drive_id) {
        throw new Error("No drive ID — manual upload not yet supported in this flow");
      }

      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID || "",
            client_secret: process.env.MICROSOFT_CLIENT_SECRET || "",
            scope: "https://graph.microsoft.com/.default",
            grant_type: "client_credentials",
          }),
        }
      );

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) throw new Error("Failed to get M365 token");

      const fileRes = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${source_file_drive_id}/root:/${source_file}:/content`,
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );

      if (!fileRes.ok) throw new Error(`Failed to download file: ${fileRes.status}`);

      const arrayBuffer = await fileRes.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    });

    // Extract pages and chunk
    const chunks = await step.run("extract-and-chunk", async () => {
      const buffer = Buffer.from(pdfBuffer, "base64");
      const pages = await extractPagesFromPdf(buffer);

      await supabaseAdmin
        .from("bluebook_ingestion_log")
        .update({ pages_processed: pages.length })
        .eq("id", ingestion_id);

      return chunkPages(pages);
    });

    // Detect pillar
    const pillar = await step.run("detect-pillar", async () => {
      const sampleText = chunks.slice(0, 5).map((c) => c.text).join(" ");
      return detectPillar(source_file, sampleText);
    });

    // Generate embeddings in batches
    const BATCH_SIZE = 50;
    let totalStored = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchIndex = Math.floor(i / BATCH_SIZE);
      const batch = chunks.slice(i, i + BATCH_SIZE);

      await step.run(`embed-batch-${batchIndex}`, async () => {
        const embedded = await embedChunks(batch);

        const rows = embedded.map((ec) => ({
          org_id,
          source_file,
          source_file_drive_id: source_file_drive_id || null,
          page_number: ec.pageNumber,
          chunk_index: ec.chunkIndex,
          chunk_text: ec.text,
          chunk_type: ec.chunkType,
          pillar,
          embedding: ec.embedding,
          metadata: ec.metadata,
          token_count: Math.ceil(ec.text.length / 4),
        }));

        const { error } = await supabaseAdmin
          .from("bluebook_chunks")
          .insert(rows);

        if (error) throw new Error(`Insert failed: ${error.message}`);

        totalStored += rows.length;

        await supabaseAdmin
          .from("bluebook_ingestion_log")
          .update({ chunks_created: totalStored })
          .eq("id", ingestion_id);
      });
    }

    // Mark complete
    await step.run("mark-complete", async () => {
      await supabaseAdmin
        .from("bluebook_ingestion_log")
        .update({
          status: "complete",
          chunks_created: totalStored,
          completed_at: new Date().toISOString(),
        })
        .eq("id", ingestion_id);
    });

    return { chunks_created: totalStored, pillar, source_file };
  }
);

// 5. Scrape regulation sections — fetch regulation config, scrape, embed, store
const scrapeRegulation = inngest.createFunction(
  { id: "scrape-regulation", concurrency: [{ limit: 2 }] },
  { event: "regulation/scrape.requested" },
  async ({ event, step }) => {
    const { regulation_id } = event.data;

    // Fetch regulation + scraper config
    const regulation = await step.run("get-regulation", async () => {
      const { data, error } = await supabaseAdmin
        .from("regulations")
        .select("id, source_url, scraper_config")
        .eq("id", regulation_id)
        .single();

      if (error || !data) throw new Error("Regulation not found");
      return data;
    });

    const sourceUrl = regulation.scraper_config?.source_url || regulation.source_url;
    if (!sourceUrl) throw new Error("No source URL configured");

    const config = {
      source_url: sourceUrl,
      section_selector: regulation.scraper_config?.section_selector || "section, article, .section",
      content_selector: regulation.scraper_config?.content_selector || "p, li, td",
      section_ref_selector: regulation.scraper_config?.section_ref_selector,
    };

    // Run scraper
    const result = await step.run("scrape-and-store", async () => {
      return scrapeAndStoreRegulation(regulation_id, config);
    });

    return result;
  }
);

// 6. Generate Golden Thread package — compile, validate, export (JSON/PDF/CSV)
const generateGoldenThread = inngest.createFunction(
  { id: "generate-golden-thread", concurrency: [{ limit: 2 }] },
  { event: "golden-thread/generate.requested" },
  async ({ event, step }) => {
    const { package_id, project_id, organization_id, building_reference } = event.data;

    // Get package record
    const pkg = await step.run("get-package", async () => {
      const { data, error } = await supabaseAdmin
        .from("golden_thread_packages")
        .select("*")
        .eq("id", package_id)
        .single();
      if (error || !data) throw new Error("Package not found");
      return data;
    });

    // Compile project data
    const compiledData = await step.run("compile-data", async () => {
      return compileGoldenThreadData(project_id, organization_id, pkg.package_reference, building_reference);
    });

    // Validate against BSA 2022
    const validation = await step.run("validate", async () => {
      return validateGoldenThread(compiledData);
    });

    // Update compliance flags
    await step.run("update-compliance", async () => {
      await supabaseAdmin
        .from("golden_thread_packages")
        .update({
          section_88_compliant: validation.section_88_compliant,
          section_91_compliant: validation.section_91_compliant,
          audit_trail_complete: validation.audit_trail_complete,
        })
        .eq("id", package_id);
    });

    const exportFiles: { format: string; file_name: string; storage_path: string; size: number }[] = [];
    const storagePath = `${organization_id}/${pkg.package_reference}`;

    // Generate JSON export
    if (pkg.export_format === "json" || pkg.export_format === "all") {
      await step.run("export-json", async () => {
        const json = generateGoldenThreadJson(compiledData, validation);
        const buffer = Buffer.from(json, "utf-8");
        const fileName = `${pkg.package_reference}.json`;

        await supabaseAdmin.storage
          .from("golden-thread")
          .upload(`${storagePath}/${fileName}`, buffer, {
            contentType: "application/json",
            upsert: true,
          });

        exportFiles.push({
          format: "json",
          file_name: fileName,
          storage_path: `${storagePath}/${fileName}`,
          size: buffer.length,
        });
      });
    }

    // Generate PDF export
    if (pkg.export_format === "pdf" || pkg.export_format === "all") {
      await step.run("export-pdf", async () => {
        const pdfBytes = await generateGoldenThreadPdf(compiledData, validation);
        const buffer = Buffer.from(pdfBytes);
        const fileName = `${pkg.package_reference}.pdf`;

        await supabaseAdmin.storage
          .from("golden-thread")
          .upload(`${storagePath}/${fileName}`, buffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        exportFiles.push({
          format: "pdf",
          file_name: fileName,
          storage_path: `${storagePath}/${fileName}`,
          size: buffer.length,
        });
      });
    }

    // Generate CSV export (multiple CSVs concatenated — ZIP requires external lib)
    if (pkg.export_format === "csv" || pkg.export_format === "all") {
      await step.run("export-csv", async () => {
        const csvs = generateGoldenThreadCsvs(compiledData);

        for (const [csvName, csvContent] of Object.entries(csvs)) {
          const buffer = Buffer.from(csvContent, "utf-8");
          await supabaseAdmin.storage
            .from("golden-thread")
            .upload(`${storagePath}/${csvName}`, buffer, {
              contentType: "text/csv",
              upsert: true,
            });

          exportFiles.push({
            format: "csv",
            file_name: csvName,
            storage_path: `${storagePath}/${csvName}`,
            size: buffer.length,
          });
        }
      });
    }

    // Upload to SharePoint (best-effort — Supabase copies already saved above)
    await step.run("sharepoint-upload", async () => {
      const userId = pkg.generated_by;
      if (!userId) return;

      for (const file of exportFiles) {
        try {
          const { data: fileData } = await supabaseAdmin.storage
            .from("golden-thread")
            .download(file.storage_path);

          if (fileData) {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const contentType = file.format === "pdf" ? "application/pdf"
              : file.format === "json" ? "application/json"
              : "text/csv";

            await uploadGoldenThreadWithFallback(
              userId, organization_id, pkg.package_reference,
              file.file_name, buffer, contentType
            );
          }
        } catch {
          // Non-critical — Supabase copy exists
        }
      }
    });

    // Mark complete
    const totalSize = exportFiles.reduce((sum, f) => sum + f.size, 0);

    await step.run("mark-complete", async () => {
      await supabaseAdmin
        .from("golden_thread_packages")
        .update({
          status: "complete",
          export_files: exportFiles,
          file_size_bytes: totalSize,
          updated_at: new Date().toISOString(),
        })
        .eq("id", package_id);
    });

    return {
      package_id,
      package_reference: pkg.package_reference,
      exports: exportFiles.length,
      compliance_score: validation.score,
    };
  }
);

// 7. Parse uploaded product file — extract text, generate embedding
const parseProductFileJob = inngest.createFunction(
  { id: "parse-product-file", concurrency: [{ limit: 3 }] },
  { event: "product/file.uploaded" },
  async ({ event, step }) => {
    const { product_id, file_path, file_name, organization_id } = event.data;

    // Download + parse in one step (Buffer can't survive Inngest JSON serialization)
    const parsed = await step.run("download-and-parse", async () => {
      const { parseProductFile } = await import("@/lib/productFileParser");
      const { data, error } = await supabaseAdmin.storage
        .from("product-files")
        .download(file_path);
      if (error || !data) throw new Error("Failed to download product file");
      const fileBuffer = Buffer.from(await data.arrayBuffer());
      return parseProductFile(fileBuffer, file_name);
    });

    // Update product with extracted text
    await step.run("update-product", async () => {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("description, specifications")
        .eq("id", product_id)
        .single();

      const existingDesc = product?.description || "";
      const appendedDesc = existingDesc
        ? `${existingDesc}\n\n--- Extracted from ${file_name} ---\n${parsed.text.slice(0, 2000)}`
        : parsed.text.slice(0, 2000);

      await supabaseAdmin
        .from("products")
        .update({
          description: appendedDesc,
          needs_review: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product_id);
    });

    // Trigger re-embedding
    await step.sendEvent("trigger-re-embed", {
      name: "products/embeddings.requested",
      data: { organization_id, product_id },
    });

    return { product_id, file_name, text_length: parsed.text.length, pages: parsed.pageCount };
  }
);

export const functions = [scrapeManufacturer, generateProductEmbeddings, sendQuoteEmail, ingestBluebookPDFs, scrapeRegulation, generateGoldenThread, parseProductFileJob, processSurveyScan, analyzeFloorPlan];
