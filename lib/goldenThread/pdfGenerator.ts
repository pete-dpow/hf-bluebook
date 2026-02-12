/**
 * Golden Thread PDF Generator — creates branded handover packs.
 * Uses pdf-lib for generation. Structure ready for Playwright page.pdf() swap on Inngest.
 */

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { GoldenThreadData } from "./compiler";
import type { ValidationResult } from "./validator";

const HF_BLUE = rgb(0, 0.337, 0.655); // #0056a7
const DARK = rgb(0.165, 0.165, 0.165); // #2A2A2A
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const WHITE = rgb(1, 1, 1);

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

interface PDFContext {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  pageNum: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;
}

function newPage(ctx: PDFContext): void {
  ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.y = PAGE_HEIGHT - MARGIN;
  ctx.pageNum++;

  // Footer
  ctx.page.drawText(`Page ${ctx.pageNum}`, {
    x: PAGE_WIDTH - MARGIN - 40,
    y: 25,
    size: 8,
    font: ctx.fontRegular,
    color: GRAY,
  });
  ctx.page.drawText("hf.bluebook — Golden Thread Package", {
    x: MARGIN,
    y: 25,
    size: 8,
    font: ctx.fontRegular,
    color: GRAY,
  });
}

function ensureSpace(ctx: PDFContext, needed: number): void {
  if (ctx.y - needed < MARGIN + 30) {
    newPage(ctx);
  }
}

function drawSectionTitle(ctx: PDFContext, title: string): void {
  ensureSpace(ctx, 30);
  ctx.y -= 20;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 4,
    width: CONTENT_WIDTH,
    height: 24,
    color: rgb(0.96, 0.97, 0.98),
  });
  ctx.page.drawText(title, {
    x: MARGIN + 8,
    y: ctx.y,
    size: 12,
    font: ctx.fontBold,
    color: HF_BLUE,
  });
  ctx.y -= 28;
}

function drawKeyValue(ctx: PDFContext, key: string, value: string): void {
  ensureSpace(ctx, 16);
  ctx.page.drawText(key, {
    x: MARGIN + 8,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
    color: GRAY,
  });
  ctx.page.drawText(value, {
    x: MARGIN + 150,
    y: ctx.y,
    size: 9,
    font: ctx.fontRegular,
    color: DARK,
  });
  ctx.y -= 16;
}

function drawWrappedText(ctx: PDFContext, text: string, maxWidth: number = CONTENT_WIDTH - 16, size: number = 9): void {
  const words = text.split(" ");
  let line = "";
  const charWidth = size * 0.5;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (testLine.length * charWidth > maxWidth) {
      ensureSpace(ctx, 14);
      ctx.page.drawText(line, {
        x: MARGIN + 8,
        y: ctx.y,
        size,
        font: ctx.fontRegular,
        color: DARK,
      });
      ctx.y -= 14;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ensureSpace(ctx, 14);
    ctx.page.drawText(line, {
      x: MARGIN + 8,
      y: ctx.y,
      size,
      font: ctx.fontRegular,
      color: DARK,
    });
    ctx.y -= 14;
  }
}

export async function generateGoldenThreadPdf(
  data: GoldenThreadData,
  validation: ValidationResult
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: PDFContext = {
    doc,
    page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
    y: PAGE_HEIGHT - MARGIN,
    pageNum: 1,
    fontRegular,
    fontBold,
  };

  // === COVER PAGE ===
  ctx.page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 200,
    width: PAGE_WIDTH,
    height: 200,
    color: HF_BLUE,
  });

  ctx.page.drawText("GOLDEN THREAD", {
    x: MARGIN,
    y: PAGE_HEIGHT - 100,
    size: 36,
    font: fontBold,
    color: WHITE,
  });
  ctx.page.drawText("HANDOVER PACKAGE", {
    x: MARGIN,
    y: PAGE_HEIGHT - 140,
    size: 24,
    font: fontRegular,
    color: WHITE,
  });
  ctx.page.drawText("BSA 2022 Compliant", {
    x: MARGIN,
    y: PAGE_HEIGHT - 170,
    size: 12,
    font: fontRegular,
    color: rgb(0.8, 0.9, 1),
  });

  // Project info on cover
  ctx.y = PAGE_HEIGHT - 260;
  ctx.page.drawText(data.project.name, {
    x: MARGIN,
    y: ctx.y,
    size: 20,
    font: fontBold,
    color: DARK,
  });
  ctx.y -= 30;

  drawKeyValue(ctx, "Package Reference:", data.package_reference);
  if (data.project.building_reference) {
    drawKeyValue(ctx, "Building Reference:", data.project.building_reference);
  }
  drawKeyValue(ctx, "Generated:", new Date(data.compiled_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }));
  drawKeyValue(ctx, "Products:", String(data.metadata.total_products));
  drawKeyValue(ctx, "Regulations:", String(data.metadata.total_regulations));
  drawKeyValue(ctx, "Quotes:", String(data.metadata.total_quotes));

  // Compliance status on cover
  ctx.y -= 20;
  const s88Color = validation.section_88_compliant ? rgb(0.13, 0.55, 0.13) : rgb(0.8, 0.2, 0.2);
  const s91Color = validation.section_91_compliant ? rgb(0.13, 0.55, 0.13) : rgb(0.8, 0.2, 0.2);

  ctx.page.drawText(`Section 88: ${validation.section_88_compliant ? "COMPLIANT" : "INCOMPLETE"}`, {
    x: MARGIN + 8,
    y: ctx.y,
    size: 11,
    font: fontBold,
    color: s88Color,
  });
  ctx.y -= 18;
  ctx.page.drawText(`Section 91: ${validation.section_91_compliant ? "COMPLIANT" : "INCOMPLETE"}`, {
    x: MARGIN + 8,
    y: ctx.y,
    size: 11,
    font: fontBold,
    color: s91Color,
  });
  ctx.y -= 18;
  ctx.page.drawText(`Compliance Score: ${validation.score}%`, {
    x: MARGIN + 8,
    y: ctx.y,
    size: 11,
    font: fontBold,
    color: DARK,
  });

  // Footer on cover
  ctx.page.drawText("Harmony Fire — Fire Protection Specialists", {
    x: MARGIN,
    y: 40,
    size: 10,
    font: fontRegular,
    color: HF_BLUE,
  });
  ctx.page.drawText("Generated by hf.bluebook", {
    x: MARGIN,
    y: 25,
    size: 8,
    font: fontRegular,
    color: GRAY,
  });

  // === TABLE OF CONTENTS ===
  newPage(ctx);
  ctx.page.drawText("Table of Contents", {
    x: MARGIN,
    y: ctx.y,
    size: 18,
    font: fontBold,
    color: HF_BLUE,
  });
  ctx.y -= 30;

  const tocItems = [
    "1. Compliance Summary",
    "2. Product Specifications",
    "3. Regulatory Compliance",
    "4. Quotation Records",
    "5. Audit Trail",
  ];
  for (const item of tocItems) {
    ctx.page.drawText(item, { x: MARGIN + 8, y: ctx.y, size: 11, font: fontRegular, color: DARK });
    ctx.y -= 20;
  }

  // === SECTION 1: COMPLIANCE SUMMARY ===
  newPage(ctx);
  drawSectionTitle(ctx, "1. Compliance Summary");

  if (validation.warnings.length === 0) {
    drawWrappedText(ctx, "All compliance checks passed. This package meets BSA 2022 Section 88 and Section 91 requirements.");
  } else {
    for (const w of validation.warnings) {
      const prefix = w.severity === "error" ? "[ERROR]" : w.severity === "warning" ? "[WARNING]" : "[INFO]";
      drawWrappedText(ctx, `${prefix} ${w.message}`, CONTENT_WIDTH - 16);
      ctx.y -= 4;
    }
  }

  // === SECTION 2: PRODUCT SPECIFICATIONS ===
  newPage(ctx);
  drawSectionTitle(ctx, "2. Product Specifications");

  if (data.products.length === 0) {
    drawWrappedText(ctx, "No products included in this package.");
  } else {
    for (const product of data.products) {
      ensureSpace(ctx, 60);
      ctx.y -= 8;

      // Product header
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - 4,
        width: CONTENT_WIDTH,
        height: 20,
        color: rgb(0.97, 0.97, 0.97),
        borderColor: LIGHT_GRAY,
        borderWidth: 0.5,
      });
      ctx.page.drawText(product.product_name, {
        x: MARGIN + 8,
        y: ctx.y,
        size: 10,
        font: fontBold,
        color: DARK,
      });
      ctx.y -= 24;

      drawKeyValue(ctx, "Code:", product.product_code || "—");
      drawKeyValue(ctx, "Pillar:", product.pillar.replace(/_/g, " "));
      drawKeyValue(ctx, "Manufacturer:", product.manufacturer_name || "—");

      if (product.certifications.length > 0) {
        drawKeyValue(ctx, "Certifications:", product.certifications.join(", "));
      }

      const specEntries = Object.entries(product.specifications);
      if (specEntries.length > 0) {
        for (const [key, value] of specEntries.slice(0, 8)) {
          drawKeyValue(ctx, `  ${key}:`, String(value));
        }
        if (specEntries.length > 8) {
          drawWrappedText(ctx, `  ... and ${specEntries.length - 8} more specifications`);
        }
      }

      if (product.regulations.length > 0) {
        drawKeyValue(ctx, "Regulations:", product.regulations.map((r) => r.reference).join(", "));
      }

      ctx.y -= 8;
    }
  }

  // === SECTION 3: REGULATORY COMPLIANCE ===
  newPage(ctx);
  drawSectionTitle(ctx, "3. Regulatory Compliance");

  if (data.regulations_summary.length === 0) {
    drawWrappedText(ctx, "No regulations linked to products in this package.");
  } else {
    for (const reg of data.regulations_summary) {
      ensureSpace(ctx, 30);
      drawKeyValue(ctx, reg.reference, `${reg.name} (${reg.products_count} product${reg.products_count !== 1 ? "s" : ""})`);
    }
  }

  // === SECTION 4: QUOTATION RECORDS ===
  newPage(ctx);
  drawSectionTitle(ctx, "4. Quotation Records");

  if (data.quotes.length === 0) {
    drawWrappedText(ctx, "No quotations found for this project.");
  } else {
    for (const quote of data.quotes) {
      ensureSpace(ctx, 40);
      ctx.y -= 4;
      drawKeyValue(ctx, "Quote:", `${quote.quote_number} — ${quote.client_name}`);
      drawKeyValue(ctx, "Status:", quote.status);
      drawKeyValue(ctx, "Total:", `£${(quote.total || 0).toFixed(2)}`);
      drawKeyValue(ctx, "Items:", `${quote.line_items.length} line item${quote.line_items.length !== 1 ? "s" : ""}`);
      ctx.y -= 8;
    }
  }

  // === SECTION 5: AUDIT TRAIL ===
  newPage(ctx);
  drawSectionTitle(ctx, "5. Audit Trail");

  if (data.audit_trail.length === 0) {
    drawWrappedText(ctx, "First generation — no prior audit trail entries.");
  } else {
    for (const entry of data.audit_trail) {
      ensureSpace(ctx, 20);
      const date = new Date(entry.performed_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      drawWrappedText(ctx, `${date} — ${entry.action}`, CONTENT_WIDTH - 16);
    }
  }

  return doc.save();
}
