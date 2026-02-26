import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authHelper";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odhvxoelxiffhocrgtll.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const maxDuration = 60;

/** Direct product fields that can be mapped from CSV columns */
const DIRECT_FIELDS = new Set([
  "product_name", "product_code", "description", "pillar",
  "list_price", "trade_price", "sell_price", "unit",
  "lead_time_days", "certifications",
]);

/** Auto-detect column → field mapping via fuzzy matching */
function suggestMapping(columnName: string): string | null {
  const col = columnName.toLowerCase().trim();

  // Direct field matches
  const directMap: Record<string, string> = {
    "product name": "product_name", "name": "product_name", "product": "product_name", "title": "product_name",
    "product code": "product_code", "code": "product_code", "sku": "product_code", "ref": "product_code", "reference": "product_code",
    "description": "description", "desc": "description", "details": "description",
    "pillar": "pillar", "category": "pillar", "type": "pillar",
    "list price": "list_price", "price": "list_price", "rrp": "list_price",
    "trade price": "trade_price", "trade": "trade_price",
    "sell price": "sell_price", "selling price": "sell_price", "net price": "sell_price",
    "unit": "unit", "uom": "unit",
    "lead time": "lead_time_days", "lead time days": "lead_time_days",
    "certifications": "certifications", "certs": "certifications", "standards": "certifications",
  };

  if (directMap[col]) return directMap[col];

  // Partial matches
  for (const [key, value] of Object.entries(directMap)) {
    if (col.includes(key) || key.includes(col)) return value;
  }

  // Anything else → treat as a specification field
  return `spec:${columnName.trim()}`;
}

/** Parse a CSV string into rows */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }

  return rows;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.isAdmin) return NextResponse.json({ error: "Admin required" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const dryRun = formData.get("dry_run") === "true";
  const mappingJson = formData.get("mapping") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Get manufacturer
  const { data: manufacturer } = await supabaseAdmin
    .from("manufacturers")
    .select("id, organization_id, scraper_config")
    .eq("id", params.id)
    .single();

  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  // Parse file
  let headers: string[] = [];
  let dataRows: string[][] = [];

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".csv")) {
    const text = await file.text();
    const allRows = parseCsv(text);
    if (allRows.length < 2) {
      return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
    }
    headers = allRows[0];
    dataRows = allRows.slice(1);
  } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await file.arrayBuffer());
    await workbook.xlsx.load(buffer);

    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      return NextResponse.json({ error: "Spreadsheet has no data rows" }, { status: 400 });
    }

    const headerRow = sheet.getRow(1);
    headers = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || `Column ${colNumber}`);
    });

    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const cells: string[] = [];
      let hasData = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const val = cell.value != null ? String(cell.value) : "";
        cells[colNumber - 1] = val;
        if (val.trim()) hasData = true;
      });
      if (hasData) dataRows.push(cells);
    }
  } else {
    return NextResponse.json({ error: "Unsupported file type. Use .csv or .xlsx" }, { status: 400 });
  }

  // Auto-generate column mapping suggestions
  const suggestedMapping: Record<string, string> = {};
  for (const header of headers) {
    const suggestion = suggestMapping(header);
    if (suggestion) suggestedMapping[header] = suggestion;
  }

  // If no mapping provided (preview mode) OR dry_run, return preview
  if (!mappingJson || dryRun) {
    // Check for existing products
    const sampleCodes = dataRows.slice(0, 20).map((row) => {
      const codeIdx = headers.findIndex((h) => suggestedMapping[h] === "product_code");
      const nameIdx = headers.findIndex((h) => suggestedMapping[h] === "product_name");
      if (codeIdx >= 0 && row[codeIdx]) return row[codeIdx];
      if (nameIdx >= 0 && row[nameIdx]) return row[nameIdx].toLowerCase().replace(/\s+/g, "-").slice(0, 50);
      return null;
    }).filter(Boolean);

    let existingCount = 0;
    if (sampleCodes.length > 0) {
      const { count } = await supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("manufacturer_id", params.id)
        .in("product_code", sampleCodes);
      existingCount = count || 0;
    }

    return NextResponse.json({
      preview: true,
      columns: headers,
      suggested_mapping: suggestedMapping,
      total_rows: dataRows.length,
      sample_rows: dataRows.slice(0, 5),
      estimated_new: dataRows.length - existingCount,
      estimated_update: existingCount,
    });
  }

  // Import mode — parse mapping and upsert products
  let mapping: Record<string, string>;
  try {
    mapping = JSON.parse(mappingJson);
  } catch {
    return NextResponse.json({ error: "Invalid mapping JSON" }, { status: 400 });
  }

  // Validate mapping has at least product_name
  const nameCol = Object.entries(mapping).find(([, v]) => v === "product_name")?.[0];
  if (!nameCol) {
    return NextResponse.json({ error: "Mapping must include product_name" }, { status: 400 });
  }

  const defaultPillar = manufacturer.scraper_config?.default_pillar || "fire_stopping";
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx];
    const directFields: Record<string, any> = {};
    const specs: Record<string, string> = {};

    for (const [colName, fieldName] of Object.entries(mapping)) {
      const colIdx = headers.indexOf(colName);
      if (colIdx < 0 || !row[colIdx]?.trim()) continue;
      const value = row[colIdx].trim();

      if (fieldName === "skip" || !fieldName) continue;

      if (fieldName.startsWith("spec:")) {
        specs[fieldName.slice(5)] = value;
      } else if (DIRECT_FIELDS.has(fieldName)) {
        // Type coerce numeric fields
        if (["list_price", "trade_price", "sell_price", "lead_time_days"].includes(fieldName)) {
          const num = parseFloat(value.replace(/[£$€,]/g, ""));
          if (!isNaN(num)) directFields[fieldName] = num;
        } else {
          directFields[fieldName] = value;
        }
      }
    }

    const productName = directFields.product_name;
    if (!productName) {
      errors.push(`Row ${rowIdx + 2}: Missing product name`);
      continue;
    }

    const productCode = directFields.product_code ||
      productName.toLowerCase().replace(/\s+/g, "-").slice(0, 50);
    const pillar = directFields.pillar || defaultPillar;

    // Check for existing product
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("manufacturer_id", params.id)
      .eq("product_code", productCode)
      .single();

    try {
      if (existing) {
        await supabaseAdmin.from("products").update({
          product_name: productName,
          description: directFields.description || undefined,
          specifications: Object.keys(specs).length > 0 ? specs : undefined,
          list_price: directFields.list_price,
          trade_price: directFields.trade_price,
          sell_price: directFields.sell_price,
          unit: directFields.unit,
          lead_time_days: directFields.lead_time_days,
          certifications: directFields.certifications,
          needs_review: true,
          updated_at: new Date().toISOString(),
          scraped_data: { source: "csv_import", filename: file.name, imported_at: new Date().toISOString() },
        }).eq("id", existing.id);
        updated++;
      } else {
        await supabaseAdmin.from("products").insert({
          manufacturer_id: params.id,
          organization_id: manufacturer.organization_id,
          pillar,
          product_code: productCode,
          product_name: productName,
          description: directFields.description || null,
          specifications: Object.keys(specs).length > 0 ? specs : {},
          list_price: directFields.list_price || null,
          trade_price: directFields.trade_price || null,
          sell_price: directFields.sell_price || null,
          unit: directFields.unit || null,
          lead_time_days: directFields.lead_time_days || null,
          certifications: directFields.certifications || null,
          needs_review: true,
          status: "draft",
          scraped_data: { source: "csv_import", filename: file.name, imported_at: new Date().toISOString() },
        });
        created++;
      }
    } catch (err: any) {
      errors.push(`Row ${rowIdx + 2} (${productName}): ${err.message}`);
    }
  }

  // Trigger auto-normalization via Inngest (non-blocking)
  try {
    const { inngest } = await import("@/lib/inngest/client");
    await inngest.send({
      name: "products/normalize.requested",
      data: { manufacturer_id: params.id, organization_id: manufacturer.organization_id },
    });
  } catch {
    // Non-critical — normalization can be triggered manually
  }

  return NextResponse.json({
    imported: true,
    created,
    updated,
    total_rows: dataRows.length,
    errors: errors.length > 0 ? errors : undefined,
  }, { status: 201 });
}
