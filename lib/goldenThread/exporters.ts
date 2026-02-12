/**
 * Golden Thread Export Formatters — JSON, CSV (ZIP).
 */

import type { GoldenThreadData } from "./compiler";
import type { ValidationResult } from "./validator";

/**
 * 7.8 — Generate BSA-compliant JSON export.
 */
export function generateGoldenThreadJson(
  data: GoldenThreadData,
  validation: ValidationResult
): string {
  const output = {
    schema_version: "1.0",
    bsa_2022_compliance: {
      section_88_compliant: validation.section_88_compliant,
      section_91_compliant: validation.section_91_compliant,
      audit_trail_complete: validation.audit_trail_complete,
      compliance_score: validation.score,
      warnings: validation.warnings,
    },
    package: {
      reference: data.package_reference,
      generated_at: data.compiled_at,
      building_reference: data.project.building_reference,
    },
    project: {
      id: data.project.id,
      name: data.project.name,
    },
    products: data.products.map((p) => ({
      product_code: p.product_code,
      product_name: p.product_name,
      pillar: p.pillar,
      manufacturer: p.manufacturer_name,
      specifications: p.specifications,
      certifications: p.certifications,
      applicable_regulations: p.regulations.map((r) => ({
        reference: r.reference,
        name: r.name,
        compliance_notes: r.compliance_notes,
        test_evidence_ref: r.test_evidence_ref,
      })),
      files: p.files.map((f) => ({
        name: f.file_name,
        type: f.file_type,
      })),
    })),
    regulations: data.regulations_summary.map((r) => ({
      reference: r.reference,
      name: r.name,
      category: r.category,
      products_covered: r.products_count,
    })),
    quotations: data.quotes.map((q) => ({
      quote_number: q.quote_number,
      client: q.client_name,
      status: q.status,
      total_gbp: q.total,
      items: q.line_items.length,
    })),
    audit_trail: data.audit_trail,
    metadata: data.metadata,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * 7.10 — Generate CSV files for ZIP export.
 * Returns a map of filename → CSV content.
 */
export function generateGoldenThreadCsvs(
  data: GoldenThreadData
): Record<string, string> {
  const csvs: Record<string, string> = {};

  // products.csv
  const productHeaders = ["product_code", "product_name", "pillar", "manufacturer", "certifications", "regulations"];
  const productRows = data.products.map((p) => [
    csvEscape(p.product_code),
    csvEscape(p.product_name),
    p.pillar,
    csvEscape(p.manufacturer_name),
    csvEscape(p.certifications.join("; ")),
    csvEscape(p.regulations.map((r) => r.reference).join("; ")),
  ]);
  csvs["products.csv"] = toCsv(productHeaders, productRows);

  // regulations.csv
  const regHeaders = ["reference", "name", "category", "products_covered"];
  const regRows = data.regulations_summary.map((r) => [
    csvEscape(r.reference),
    csvEscape(r.name),
    r.category,
    String(r.products_count),
  ]);
  csvs["regulations.csv"] = toCsv(regHeaders, regRows);

  // quotations.csv
  const quoteHeaders = ["quote_number", "client_name", "project_name", "status", "total", "items", "created_at"];
  const quoteRows = data.quotes.map((q) => [
    csvEscape(q.quote_number),
    csvEscape(q.client_name),
    csvEscape(q.project_name || ""),
    q.status,
    (q.total || 0).toFixed(2),
    String(q.line_items.length),
    q.created_at,
  ]);
  csvs["quotations.csv"] = toCsv(quoteHeaders, quoteRows);

  // audit_trail.csv
  const auditHeaders = ["action", "performed_by", "performed_at", "details"];
  const auditRows = data.audit_trail.map((a) => [
    a.action,
    a.performed_by,
    a.performed_at,
    csvEscape(JSON.stringify(a.details)),
  ]);
  csvs["audit_trail.csv"] = toCsv(auditHeaders, auditRows);

  return csvs;
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
