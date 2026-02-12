import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface QuoteData {
  quote_number: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  project_name?: string | null;
  project_address?: string | null;
  quote_name?: string | null;
  valid_until?: string | null;
  vat_percent: number;
  subtotal: number;
  vat_amount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  created_at: string;
  status: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  product_code?: string | null;
  manufacturer_name?: string | null;
}

// HF brand blue
const HF_BLUE = rgb(0, 0x56 / 255, 0xa7 / 255); // #0056a7

function formatCurrency(value: number): string {
  return `£${value.toFixed(2)}`;
}

export async function generateQuotePdf(
  quote: QuoteData,
  lineItems: LineItem[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  function addPage() {
    page = doc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    return page;
  }

  function checkPageBreak(needed: number) {
    if (y - needed < margin + 30) {
      addPage();
    }
  }

  function drawText(text: string, x: number, options: { font?: typeof helvetica; size?: number; color?: typeof HF_BLUE } = {}) {
    const font = options.font || helvetica;
    const size = options.size || 10;
    const color = options.color || rgb(0.16, 0.16, 0.16);
    page.drawText(text, { x, y, size, font, color });
  }

  // === HEADER ===
  // Company name
  drawText("Harmony Fire", margin, { font: helveticaBold, size: 22, color: HF_BLUE });
  y -= 18;
  drawText("Fire Protection Specialists", margin, { size: 10, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  // Quote title bar
  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: contentWidth,
    height: 28,
    color: HF_BLUE,
  });
  page.drawText("QUOTATION", {
    x: margin + 10,
    y: y + 2,
    size: 14,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(quote.quote_number, {
    x: pageWidth - margin - helveticaBold.widthOfTextAtSize(quote.quote_number, 14) - 10,
    y: y + 2,
    size: 14,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  y -= 40;

  // Date and validity
  const createdDate = new Date(quote.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  drawText("Date:", margin, { font: helveticaBold, size: 9, color: rgb(0.4, 0.4, 0.4) });
  drawText(createdDate, margin + 60, { size: 9 });

  if (quote.valid_until) {
    const validDate = new Date(quote.valid_until).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    drawText("Valid Until:", margin + 250, { font: helveticaBold, size: 9, color: rgb(0.4, 0.4, 0.4) });
    drawText(validDate, margin + 320, { size: 9 });
  }
  y -= 25;

  // === CLIENT DETAILS ===
  drawText("Bill To:", margin, { font: helveticaBold, size: 10, color: HF_BLUE });
  y -= 15;
  drawText(quote.client_name, margin, { font: helveticaBold, size: 10 });
  y -= 13;
  if (quote.client_email) { drawText(quote.client_email, margin, { size: 9 }); y -= 13; }
  if (quote.client_phone) { drawText(quote.client_phone, margin, { size: 9 }); y -= 13; }

  // Project details (right side if available)
  if (quote.project_name || quote.project_address) {
    const projY = y + (quote.client_phone ? 39 : quote.client_email ? 26 : 13);
    let projOffset = 0;
    page.drawText("Project:", { x: margin + 280, y: projY, size: 10, font: helveticaBold, color: HF_BLUE });
    projOffset += 15;
    if (quote.project_name) {
      page.drawText(quote.project_name, { x: margin + 280, y: projY - projOffset, size: 10, font: helveticaBold, color: rgb(0.16, 0.16, 0.16) });
      projOffset += 13;
    }
    if (quote.project_address) {
      page.drawText(quote.project_address, { x: margin + 280, y: projY - projOffset, size: 9, font: helvetica, color: rgb(0.16, 0.16, 0.16) });
    }
  }

  y -= 20;

  // === LINE ITEMS TABLE ===
  checkPageBreak(60);

  // Table header
  const colX = {
    num: margin,
    desc: margin + 30,
    qty: margin + 290,
    unit: margin + 330,
    price: margin + 385,
    total: margin + 445,
  };

  page.drawRectangle({
    x: margin,
    y: y - 3,
    width: contentWidth,
    height: 20,
    color: rgb(0.95, 0.95, 0.95),
  });

  const headerOpts = { font: helveticaBold, size: 8, color: rgb(0.4, 0.4, 0.4) };
  drawText("#", colX.num + 5, headerOpts);
  drawText("DESCRIPTION", colX.desc, headerOpts);
  drawText("QTY", colX.qty, headerOpts);
  drawText("UNIT", colX.unit, headerOpts);
  drawText("UNIT PRICE", colX.price, headerOpts);
  drawText("TOTAL", colX.total, headerOpts);
  y -= 22;

  // Table rows
  for (let i = 0; i < lineItems.length; i++) {
    checkPageBreak(30);
    const item = lineItems[i];

    // Alternating row background
    if (i % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - 3,
        width: contentWidth,
        height: 18,
        color: rgb(0.98, 0.98, 0.98),
      });
    }

    drawText(String(i + 1), colX.num + 5, { size: 9 });

    // Truncate description if too long
    let desc = item.description || "";
    if (desc.length > 45) desc = desc.substring(0, 42) + "...";
    drawText(desc, colX.desc, { size: 9 });

    drawText(String(item.quantity), colX.qty, { size: 9 });
    drawText(item.unit || "each", colX.unit, { size: 9 });

    const priceStr = formatCurrency(item.unit_price);
    drawText(priceStr, colX.price, { size: 9 });

    const totalStr = formatCurrency(item.line_total);
    drawText(totalStr, colX.total, { size: 9 });

    y -= 18;
  }

  // Line separator
  y -= 5;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 15;

  // === TOTALS ===
  checkPageBreak(60);

  const totalsX = margin + 350;
  const totalsValueX = margin + 445;

  drawText("Subtotal:", totalsX, { font: helveticaBold, size: 9, color: rgb(0.4, 0.4, 0.4) });
  drawText(formatCurrency(quote.subtotal), totalsValueX, { size: 9 });
  y -= 15;

  drawText(`VAT (${quote.vat_percent}%):`, totalsX, { font: helveticaBold, size: 9, color: rgb(0.4, 0.4, 0.4) });
  drawText(formatCurrency(quote.vat_amount), totalsValueX, { size: 9 });
  y -= 5;

  page.drawLine({
    start: { x: totalsX, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 15;

  page.drawRectangle({
    x: totalsX - 5,
    y: y - 5,
    width: contentWidth - 345,
    height: 22,
    color: HF_BLUE,
  });
  page.drawText("TOTAL:", {
    x: totalsX,
    y: y,
    size: 11,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(formatCurrency(quote.total), {
    x: totalsValueX,
    y: y,
    size: 11,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });
  y -= 35;

  // === NOTES ===
  if (quote.notes) {
    checkPageBreak(50);
    drawText("Notes", margin, { font: helveticaBold, size: 10, color: HF_BLUE });
    y -= 14;
    const noteLines = quote.notes.split("\n");
    for (const line of noteLines) {
      checkPageBreak(15);
      drawText(line, margin, { size: 9, color: rgb(0.3, 0.3, 0.3) });
      y -= 13;
    }
    y -= 10;
  }

  // === TERMS ===
  if (quote.terms) {
    checkPageBreak(50);
    drawText("Terms & Conditions", margin, { font: helveticaBold, size: 10, color: HF_BLUE });
    y -= 14;
    const termLines = quote.terms.split("\n");
    for (const line of termLines) {
      checkPageBreak(15);
      drawText(line, margin, { size: 8, color: rgb(0.4, 0.4, 0.4) });
      y -= 12;
    }
  }

  // === FOOTER (on all pages) ===
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const footerText = `Page ${i + 1} of ${pages.length}`;
    p.drawText(footerText, {
      x: pageWidth / 2 - helvetica.widthOfTextAtSize(footerText, 8) / 2,
      y: 25,
      size: 8,
      font: helvetica,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  return doc.save();
}

export async function generateQuoteExcel(
  quote: QuoteData,
  lineItems: LineItem[]
): Promise<Buffer> {
  // Dynamic import to avoid bundling exceljs on the client
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "hf.bluebook";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Quote");

  // Column widths
  sheet.columns = [
    { width: 6 },   // A: #
    { width: 40 },  // B: Description
    { width: 10 },  // C: Qty
    { width: 10 },  // D: Unit
    { width: 14 },  // E: Unit Price
    { width: 14 },  // F: Line Total
  ];

  // HF Blue
  const hfBlue = "FF0056A7";
  const lightGray = "FFF5F5F5";
  const white = "FFFFFFFF";

  // Header section
  const titleRow = sheet.addRow(["QUOTATION"]);
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: hfBlue } };
  sheet.mergeCells("A1:F1");

  sheet.addRow([]);

  const infoRows = [
    ["Quote Number:", quote.quote_number, "", "Date:", new Date(quote.created_at).toLocaleDateString("en-GB")],
    ["Client:", quote.client_name, "", "Valid Until:", quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("en-GB") : "—"],
    ["Email:", quote.client_email || "—", "", "Project:", quote.project_name || "—"],
    ["Phone:", quote.client_phone || "—", "", "Address:", quote.project_address || "—"],
  ];

  for (const info of infoRows) {
    const row = sheet.addRow(info);
    row.getCell(1).font = { bold: true, size: 9, color: { argb: "FF666666" } };
    row.getCell(2).font = { size: 9 };
    row.getCell(4).font = { bold: true, size: 9, color: { argb: "FF666666" } };
    row.getCell(5).font = { size: 9 };
  }

  sheet.addRow([]);

  // Table header
  const headerRow = sheet.addRow(["#", "Description", "Qty", "Unit", "Unit Price", "Line Total"]);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9, color: { argb: white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: hfBlue } };
    cell.alignment = { horizontal: "left" };
  });
  headerRow.getCell(5).alignment = { horizontal: "right" };
  headerRow.getCell(6).alignment = { horizontal: "right" };

  // Line items
  lineItems.forEach((item, i) => {
    const row = sheet.addRow([
      i + 1,
      item.description,
      item.quantity,
      item.unit || "each",
      item.unit_price,
      item.line_total,
    ]);

    row.getCell(5).numFmt = "£#,##0.00";
    row.getCell(6).numFmt = "£#,##0.00";
    row.getCell(5).alignment = { horizontal: "right" };
    row.getCell(6).alignment = { horizontal: "right" };

    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightGray } };
      });
    }
  });

  sheet.addRow([]);

  // Totals
  const subtotalRow = sheet.addRow(["", "", "", "", "Subtotal:", quote.subtotal]);
  subtotalRow.getCell(5).font = { bold: true, size: 9 };
  subtotalRow.getCell(6).numFmt = "£#,##0.00";
  subtotalRow.getCell(5).alignment = { horizontal: "right" };
  subtotalRow.getCell(6).alignment = { horizontal: "right" };

  const vatRow = sheet.addRow(["", "", "", "", `VAT (${quote.vat_percent}%):`, quote.vat_amount]);
  vatRow.getCell(5).font = { bold: true, size: 9 };
  vatRow.getCell(6).numFmt = "£#,##0.00";
  vatRow.getCell(5).alignment = { horizontal: "right" };
  vatRow.getCell(6).alignment = { horizontal: "right" };

  const totalRow = sheet.addRow(["", "", "", "", "TOTAL:", quote.total]);
  totalRow.getCell(5).font = { bold: true, size: 12, color: { argb: white } };
  totalRow.getCell(6).font = { bold: true, size: 12, color: { argb: white } };
  totalRow.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: hfBlue } };
  totalRow.getCell(6).fill = { type: "pattern", pattern: "solid", fgColor: { argb: hfBlue } };
  totalRow.getCell(6).numFmt = "£#,##0.00";
  totalRow.getCell(5).alignment = { horizontal: "right" };
  totalRow.getCell(6).alignment = { horizontal: "right" };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
