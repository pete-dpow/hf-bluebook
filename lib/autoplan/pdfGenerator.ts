// lib/autoplan/pdfGenerator.ts — Generate branded fire safety plan PDF

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import { SYMBOL_MAP } from "./symbols";
import type { AutoplanPlan, AutoplanBuilding, AutoplanFloor, AutoplanApproval, PlacedSymbol, Annotation } from "./types";

// HF brand colors (matching goldenThread/pdfGenerator.ts)
const HF_BLUE = rgb(0, 0.337, 0.655);     // #0056a7
const DARK = rgb(0.165, 0.165, 0.165);     // #2A2A2A
const GRAY = rgb(0.4, 0.4, 0.4);
const LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.863, 0.149, 0.149);      // #DC2626
const GREEN = rgb(0.086, 0.639, 0.290);    // #16A34A
const BLUE = rgb(0.145, 0.388, 0.922);     // #2563EB

// A3 landscape
const PAGE_WIDTH = 1190.55;  // 420mm
const PAGE_HEIGHT = 841.89;  // 297mm
const MARGIN = 40;

// Title block height
const TITLE_BLOCK_H = 120;
const LEGEND_H = 50;

interface GeneratePdfOptions {
  plan: AutoplanPlan;
  building: AutoplanBuilding;
  floor: AutoplanFloor;
  approval?: AutoplanApproval;
  floorPlanPdfBytes: Uint8Array;
}

export async function generateAutoplanPdf(opts: GeneratePdfOptions): Promise<Uint8Array> {
  const { plan, building, floor, approval, floorPlanPdfBytes } = opts;

  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // ── 1. Embed floor plan as background ────────────────
  const floorPlanArea = {
    x: MARGIN,
    y: MARGIN + TITLE_BLOCK_H + LEGEND_H + 10,
    w: PAGE_WIDTH - 2 * MARGIN,
    h: PAGE_HEIGHT - 2 * MARGIN - TITLE_BLOCK_H - LEGEND_H - 10,
  };

  try {
    const floorPlanDoc = await PDFDocument.load(floorPlanPdfBytes);
    const [embeddedPage] = await doc.embedPdf(floorPlanDoc, [0]);

    const fpDims = embeddedPage.size();
    const scaleX = floorPlanArea.w / fpDims.width;
    const scaleY = floorPlanArea.h / fpDims.height;
    const fpScale = Math.min(scaleX, scaleY);

    const fpW = fpDims.width * fpScale;
    const fpH = fpDims.height * fpScale;
    const fpX = floorPlanArea.x + (floorPlanArea.w - fpW) / 2;
    const fpY = floorPlanArea.y + (floorPlanArea.h - fpH) / 2;

    page.drawPage(embeddedPage, { x: fpX, y: fpY, xScale: fpScale, yScale: fpScale });

    // ── 2. Draw symbols on top of floor plan ───────────
    drawSymbolsOnPdf(page, plan.symbol_data, fpX, fpY, fpW, fpH, fontBold);

    // ── 3. Draw annotations ────────────────────────────
    drawAnnotationsOnPdf(page, plan.annotations, fpX, fpY, fpW, fpH, fontRegular);
  } catch {
    // If floor plan embedding fails, draw placeholder
    page.drawRectangle({
      x: floorPlanArea.x, y: floorPlanArea.y,
      width: floorPlanArea.w, height: floorPlanArea.h,
      borderColor: LIGHT_GRAY, borderWidth: 1,
    });
    page.drawText("Floor plan could not be embedded", {
      x: floorPlanArea.x + floorPlanArea.w / 2 - 100,
      y: floorPlanArea.y + floorPlanArea.h / 2,
      size: 14, font: fontRegular, color: GRAY,
    });
  }

  // ── 4. Draw border ───────────────────────────────────
  page.drawRectangle({
    x: MARGIN - 1, y: MARGIN - 1,
    width: PAGE_WIDTH - 2 * MARGIN + 2,
    height: PAGE_HEIGHT - 2 * MARGIN + 2,
    borderColor: DARK, borderWidth: 1,
  });

  // ── 5. Symbol legend ─────────────────────────────────
  drawLegend(page, MARGIN, MARGIN + TITLE_BLOCK_H, PAGE_WIDTH - 2 * MARGIN, LEGEND_H, fontRegular, fontBold);

  // ── 6. Title block ───────────────────────────────────
  drawTitleBlock(page, MARGIN, MARGIN, PAGE_WIDTH - 2 * MARGIN, TITLE_BLOCK_H, {
    fontRegular, fontBold, plan, building, floor, approval,
  });

  // ── 7. Watermark if draft ────────────────────────────
  if (plan.status !== "approved") {
    page.drawText("DRAFT", {
      x: PAGE_WIDTH / 2 - 120, y: PAGE_HEIGHT / 2 - 20,
      size: 80, font: fontBold,
      color: rgb(0.9, 0.9, 0.9),
      opacity: 0.3,
    });
  }

  return doc.save();
}

function drawSymbolsOnPdf(
  page: PDFPage,
  symbols: PlacedSymbol[],
  fpX: number, fpY: number, fpW: number, fpH: number,
  font: PDFFont
): void {
  for (const sym of symbols) {
    const def = SYMBOL_MAP.get(sym.symbolId);
    if (!def) continue;

    // Convert normalised coords to PDF coords
    const x = fpX + sym.x * fpW;
    const y = fpY + (1 - sym.y) * fpH; // PDF y is bottom-up

    const w = (def.defaultWidth * sym.scale) * 0.8;
    const h = (def.defaultHeight * sym.scale) * 0.8;

    // Parse hex color to rgb
    const bgRgb = hexToRgb(def.bgColor);

    const isCircular = ["smoke_detector", "heat_detector", "dry_riser_inlet", "wet_riser_outlet", "assembly_point"].includes(sym.symbolId);

    if (isCircular) {
      const r = Math.max(w, h) / 2;
      page.drawCircle({ x, y, size: r, color: bgRgb });
    } else {
      page.drawRectangle({
        x: x - w / 2, y: y - h / 2,
        width: w, height: h,
        color: bgRgb, borderColor: bgRgb, borderWidth: 0.5,
      });
    }

    // Label
    const label = sym.label || def.shortLabel;
    const fontSize = Math.max(6, 8 * sym.scale);
    page.drawText(label, {
      x: x - (label.length * fontSize * 0.3),
      y: y - fontSize / 3,
      size: fontSize, font, color: WHITE,
    });
  }
}

function drawAnnotationsOnPdf(
  page: PDFPage,
  annotations: Annotation[],
  fpX: number, fpY: number, fpW: number, fpH: number,
  font: PDFFont
): void {
  for (const ann of annotations) {
    const x = fpX + ann.x * fpW;
    const y = fpY + (1 - ann.y) * fpH;

    if (ann.type === "text" && ann.text) {
      page.drawText(ann.text, {
        x, y, size: ann.fontSize || 8, font, color: DARK,
      });
    }

    if (ann.type === "travel_distance" && ann.endX !== undefined && ann.endY !== undefined) {
      const ex = fpX + ann.endX * fpW;
      const ey = fpY + (1 - ann.endY) * fpH;

      page.drawLine({
        start: { x, y }, end: { x: ex, y: ey },
        thickness: 1, color: RED, dashArray: [4, 2],
      });

      if (ann.distanceMetres) {
        const mx = (x + ex) / 2;
        const my = (y + ey) / 2;
        page.drawText(`${ann.distanceMetres}m`, {
          x: mx, y: my + 4, size: 7, font, color: RED,
        });
      }
    }
  }
}

function drawLegend(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  fontRegular: PDFFont, fontBold: PDFFont
): void {
  // Background
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(0.97, 0.97, 0.97) });
  page.drawLine({ start: { x, y: y + h }, end: { x: x + w, y: y + h }, thickness: 0.5, color: LIGHT_GRAY });

  page.drawText("SYMBOL KEY", { x: x + 8, y: y + h - 16, size: 8, font: fontBold, color: DARK });

  const legends = [
    { label: "EXIT", color: GREEN, text: "Fire Exit" },
    { label: "FE", color: RED, text: "Extinguisher" },
    { label: "CP", color: RED, text: "Call Point" },
    { label: "FD30", color: BLUE, text: "Fire Door" },
    { label: "S", color: BLUE, text: "Smoke Det." },
    { label: "EL", color: GREEN, text: "Emerg. Light" },
    { label: "D", color: RED, text: "Dry Riser" },
    { label: "SP", color: BLUE, text: "Sprinkler" },
  ];

  let lx = x + 80;
  const ly = y + h - 16;

  for (const leg of legends) {
    page.drawRectangle({ x: lx, y: ly - 4, width: 28, height: 14, color: leg.color });
    page.drawText(leg.label, { x: lx + 2, y: ly - 1, size: 7, font: fontBold, color: WHITE });
    page.drawText(leg.text, { x: lx + 32, y: ly - 1, size: 7, font: fontRegular, color: DARK });
    lx += 120;
  }
}

function drawTitleBlock(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  opts: {
    fontRegular: PDFFont; fontBold: PDFFont;
    plan: AutoplanPlan; building: AutoplanBuilding;
    floor: AutoplanFloor; approval?: AutoplanApproval;
  }
): void {
  const { fontRegular, fontBold, plan, building, floor, approval } = opts;

  // Background
  page.drawRectangle({ x, y, width: w, height: h, color: WHITE });

  // Blue accent bar (left)
  page.drawRectangle({ x, y, width: 8, height: h, color: HF_BLUE });

  // HF branding area
  const brandX = x + 20;
  page.drawText("HARMONY FIRE", { x: brandX, y: y + h - 24, size: 16, font: fontBold, color: HF_BLUE });
  page.drawText("Fire Protection Specialists", { x: brandX, y: y + h - 40, size: 9, font: fontRegular, color: GRAY });
  page.drawText("FIRE SAFETY PLAN", { x: brandX, y: y + h - 60, size: 12, font: fontBold, color: DARK });

  // Plan details (center)
  const detailX = x + 280;
  const kv = (label: string, value: string, yOff: number) => {
    page.drawText(label, { x: detailX, y: y + h - yOff, size: 8, font: fontBold, color: GRAY });
    page.drawText(value, { x: detailX + 80, y: y + h - yOff, size: 8, font: fontRegular, color: DARK });
  };

  kv("Building:", building.name, 20);
  kv("Address:", `${building.address_line_1}, ${building.city}`, 34);
  kv("Floor:", floor.floor_name || `Floor ${floor.floor_number}`, 48);
  kv("Reference:", plan.plan_reference, 62);
  kv("Version:", String(plan.version), 76);
  kv("Scale:", floor.scale || "As drawn", 90);
  kv("Date:", new Date().toLocaleDateString("en-GB"), 104);

  // Building info (right-center)
  const infoX = x + 560;
  kv2(page, fontBold, fontRegular, infoX, y + h - 20, "Jurisdiction:", building.jurisdiction.charAt(0).toUpperCase() + building.jurisdiction.slice(1));
  kv2(page, fontBold, fontRegular, infoX, y + h - 34, "Evacuation:", building.evacuation_strategy.replace(/_/g, " "));
  kv2(page, fontBold, fontRegular, infoX, y + h - 48, "Height:", building.height_metres ? `${building.height_metres}m` : "N/A");
  kv2(page, fontBold, fontRegular, infoX, y + h - 62, "Storeys:", String(building.number_of_storeys));
  kv2(page, fontBold, fontRegular, infoX, y + h - 76, "Sprinklers:", building.has_sprinklers ? "Yes" : "No");

  // Approval block (far right)
  const apX = x + w - 280;
  if (approval) {
    page.drawRectangle({ x: apX - 8, y: y + 4, width: 272, height: h - 8, borderColor: GREEN, borderWidth: 1 });
    page.drawText("APPROVED", { x: apX, y: y + h - 20, size: 11, font: fontBold, color: GREEN });
    page.drawText(approval.approver_name, { x: apX, y: y + h - 36, size: 9, font: fontBold, color: DARK });
    page.drawText(approval.approver_qualifications, { x: apX, y: y + h - 50, size: 8, font: fontRegular, color: GRAY });
    page.drawText(approval.approver_company, { x: apX, y: y + h - 64, size: 8, font: fontRegular, color: GRAY });
    page.drawText(new Date(approval.approved_at).toLocaleDateString("en-GB"), { x: apX, y: y + h - 78, size: 8, font: fontRegular, color: GRAY });
  } else {
    page.drawRectangle({ x: apX - 8, y: y + 4, width: 272, height: h - 8, borderColor: RED, borderWidth: 1 });
    page.drawText("DRAFT — PENDING VALIDATION", { x: apX, y: y + h - 30, size: 10, font: fontBold, color: RED });
    page.drawText("Not approved for submission", { x: apX, y: y + h - 48, size: 8, font: fontRegular, color: GRAY });
  }

  // Regulatory footer
  const regText = getRegulatoryText(building.jurisdiction);
  page.drawText(regText, { x: x + 20, y: y + 8, size: 6, font: fontRegular, color: GRAY });
}

function kv2(page: PDFPage, fontBold: PDFFont, fontRegular: PDFFont, x: number, y: number, label: string, value: string): void {
  page.drawText(label, { x, y, size: 8, font: fontBold, color: GRAY });
  page.drawText(value, { x: x + 70, y, size: 8, font: fontRegular, color: DARK });
}

function getRegulatoryText(jurisdiction: string): string {
  switch (jurisdiction) {
    case "england":
      return "Prepared in accordance with Fire Safety (England) Regulations 2022, Regulation 6. Approved Document B referenced for travel distances.";
    case "scotland":
      return "Prepared in accordance with Fire (Scotland) Act 2005, Section 78. Scottish Building Standards Technical Handbook 2.9 referenced.";
    case "wales":
      return "Prepared in accordance with Fire Safety Act 2021. Follows England guidance pending Building Safety (Wales) Bill enactment.";
    default:
      return "Prepared in accordance with applicable UK fire safety regulations.";
  }
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}
