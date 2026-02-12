import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * 8.7 — AI Normalizer: extract structured specifications from scraped HTML/text.
 * Uses GPT-4o for accuracy on complex tables.
 *
 * POST body: { product_id, raw_text?, pillar }
 * Returns: { specifications, confidence, warnings }
 */
export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const body = await req.json();
  const { product_id, raw_text, pillar } = body;

  if (!pillar) {
    return NextResponse.json({ error: "pillar is required" }, { status: 400 });
  }

  // Get pillar schema for structured extraction
  const { data: schema } = await supabaseAdmin
    .from("pillar_schemas")
    .select("*")
    .eq("pillar", pillar)
    .single();

  if (!schema) {
    return NextResponse.json({ error: "Unknown pillar: " + pillar }, { status: 400 });
  }

  // Get raw text from product if not provided
  let textToNormalize = raw_text;
  if (!textToNormalize && product_id) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("scraped_data, description, specifications")
      .eq("id", product_id)
      .single();

    if (product) {
      textToNormalize = JSON.stringify({
        description: product.description,
        scraped_data: product.scraped_data,
        existing_specs: product.specifications,
      });
    }
  }

  if (!textToNormalize) {
    return NextResponse.json({ error: "No text to normalize — provide raw_text or product_id" }, { status: 400 });
  }

  // Build extraction prompt from pillar schema
  const fieldDescriptions = Object.entries(schema.field_definitions as Record<string, any>)
    .map(([key, def]) => `- "${key}" (${def.type}): ${def.label}. Example: ${def.example}`)
    .join("\n");

  const requiredFields = (schema.required_fields as string[]).join(", ");

  const extractionPrompt = `You are a fire protection product data specialist. Extract structured specifications from the following raw product data.

PILLAR: ${schema.display_name}

EXPECTED FIELDS:
${fieldDescriptions}

REQUIRED FIELDS: ${requiredFields}

RAW DATA:
${textToNormalize.slice(0, 6000)}

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

  try {
    const result = JSON.parse(content);
    const specifications = result.specifications || {};
    const confidence = result.confidence || 0;
    const warnings = result.warnings || [];

    // 8.8 — Validate against pillar schema
    const validationWarnings = validateAgainstSchema(specifications, schema);
    warnings.push(...validationWarnings);

    // Optionally update product if product_id provided
    if (product_id && Object.keys(specifications).length > 0) {
      await supabaseAdmin
        .from("products")
        .update({
          specifications,
          needs_review: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product_id);
    }

    return NextResponse.json({
      specifications,
      confidence,
      warnings,
      pillar,
      fields_extracted: Object.keys(specifications).length,
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}

/**
 * 8.8 — Schema Validator: validate extracted specs against pillar_schemas.
 */
function validateAgainstSchema(
  specifications: Record<string, any>,
  schema: any
): string[] {
  const warnings: string[] = [];
  const requiredFields = schema.required_fields as string[];
  const fieldDefs = schema.field_definitions as Record<string, any>;

  // Check required fields
  for (const field of requiredFields) {
    if (!specifications[field]) {
      warnings.push(`Required field "${field}" is missing`);
    }
  }

  // Check field types
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
