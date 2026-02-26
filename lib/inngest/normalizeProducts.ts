/**
 * Auto-normalize pipeline — GPT-4o extracts structured specs from products.
 * Runs as an Inngest function after scraping or CSV import.
 * Processes products in batches of 100, rate-limited to 20 GPT calls/minute.
 */

import { inngest } from "./client";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-placeholder" });

const BATCH_SIZE = 100;
const RATE_LIMIT_DELAY_MS = 3_000; // ~20 calls/minute

interface NormalizeResult {
  specifications: Record<string, any>;
  confidence: number;
  warnings: string[];
}

function validateAgainstSchema(
  specifications: Record<string, any>,
  schema: any
): string[] {
  const warnings: string[] = [];
  const requiredFields = schema.required_fields as string[];
  const fieldDefs = schema.field_definitions as Record<string, any>;

  for (const field of requiredFields) {
    if (!specifications[field]) {
      warnings.push(`Required field "${field}" is missing`);
    }
  }

  for (const [key, value] of Object.entries(specifications)) {
    const def = fieldDefs[key];
    if (!def) {
      warnings.push(`Unknown field "${key}" — not in ${schema.display_name} schema`);
      continue;
    }
    if (def.type === "number" && typeof value !== "number") {
      const parsed = parseFloat(String(value));
      if (isNaN(parsed)) {
        warnings.push(`Field "${key}" should be a number, got "${value}"`);
      }
    }
    if (def.options && !def.options.includes(String(value).toLowerCase())) {
      warnings.push(`Field "${key}" value "${value}" not in allowed options: ${def.options.join(", ")}`);
    }
  }

  return warnings;
}

async function normalizeProduct(
  product: any,
  schema: any
): Promise<NormalizeResult> {
  const fieldDescriptions = Object.entries(schema.field_definitions as Record<string, any>)
    .map(([key, def]) => `- "${key}" (${def.type}): ${def.label}. Example: ${def.example}`)
    .join("\n");

  const requiredFields = (schema.required_fields as string[]).join(", ");

  const rawText = JSON.stringify({
    description: product.description,
    scraped_data: product.scraped_data,
    existing_specs: product.specifications,
  });

  const extractionPrompt = `You are a fire protection product data specialist. Extract structured specifications from the following raw product data.

PILLAR: ${schema.display_name}

EXPECTED FIELDS:
${fieldDescriptions}

REQUIRED FIELDS: ${requiredFields}

RAW DATA:
${rawText.slice(0, 6000)}

INSTRUCTIONS:
1. Extract values for each field from the raw data
2. Use the exact field keys listed above
3. Match the expected types (text vs number)
4. If a value is not found, omit the field (don't guess)
5. Normalize units (mm, minutes, °C) to match examples
6. For the "confidence" field, rate 0-100 how confident you are in the extraction

Return ONLY valid JSON in this format:
{
  "specifications": { ... extracted key-value pairs ... },
  "confidence": 85,
  "warnings": ["field X not found in source data", ...]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: extractionPrompt }],
    temperature: 0.1,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || "{}";
  const result = JSON.parse(content);
  const specifications = result.specifications || {};
  const confidence = result.confidence || 0;
  const warnings = result.warnings || [];

  const validationWarnings = validateAgainstSchema(specifications, schema);
  warnings.push(...validationWarnings);

  return { specifications, confidence, warnings };
}

export const normalizeProductBatch = inngest.createFunction(
  { id: "normalize-product-batch", concurrency: [{ limit: 1 }] },
  { event: "products/normalize.requested" },
  async ({ event, step }) => {
    const { manufacturer_id, organization_id } = event.data;

    // Get unnormalized products for this manufacturer
    const products = await step.run("get-unnormalized-products", async () => {
      let query = supabaseAdmin
        .from("products")
        .select("id, product_name, description, scraped_data, specifications, pillar")
        .is("normalized_at", null)
        .order("created_at", { ascending: true })
        .limit(BATCH_SIZE);

      if (manufacturer_id) {
        query = query.eq("manufacturer_id", manufacturer_id);
      } else if (organization_id) {
        query = query.eq("organization_id", organization_id);
      }

      const { data } = await query;
      return data || [];
    });

    if (products.length === 0) {
      return { normalized: 0, total: 0, message: "No products to normalize" };
    }

    // Cache pillar schemas to avoid redundant queries
    const schemaCache: Record<string, any> = {};

    let normalized = 0;
    let failed = 0;

    for (const product of products) {
      await step.run(`normalize-${product.id}`, async () => {
        // Get pillar schema (cached)
        if (!schemaCache[product.pillar]) {
          const { data: schema } = await supabaseAdmin
            .from("pillar_schemas")
            .select("*")
            .eq("pillar", product.pillar)
            .single();
          if (schema) schemaCache[product.pillar] = schema;
        }

        const schema = schemaCache[product.pillar];
        if (!schema) {
          console.warn(`[normalize] No schema for pillar "${product.pillar}" — skipping ${product.id}`);
          failed++;
          return;
        }

        try {
          const result = await normalizeProduct(product, schema);

          await supabaseAdmin
            .from("products")
            .update({
              specifications: {
                ...(product.specifications || {}),
                ...result.specifications,
              },
              normalized_at: new Date().toISOString(),
              normalization_confidence: result.confidence,
              normalization_warnings: result.warnings,
              needs_review: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", product.id);

          normalized++;
        } catch (err: any) {
          console.error(`[normalize] Failed for product ${product.id}:`, err.message);
          failed++;
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
      });
    }

    // If more products remain, queue next batch
    const { count } = await step.run("check-remaining", async () => {
      let query = supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .is("normalized_at", null);

      if (manufacturer_id) {
        query = query.eq("manufacturer_id", manufacturer_id);
      } else if (organization_id) {
        query = query.eq("organization_id", organization_id);
      }

      const { count } = await query;
      return { count: count || 0 };
    });

    if (count > 0) {
      await step.sendEvent("queue-next-batch", {
        name: "products/normalize.requested",
        data: { manufacturer_id, organization_id },
      });
    }

    return { normalized, failed, remaining: count, batch_size: products.length };
  }
);
