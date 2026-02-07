// /app/api/upload-excel/route.ts
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// ✅ REMOVED: export const runtime = "edge"; - causes build issues with XLSX

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

    // --- Read the Excel file in memory ---
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[];

    // --- Find header row automatically ---
    let headerIndex = jsonData.findIndex((row: any) =>
      Array.isArray(row) && row.some((cell: any) =>
        typeof cell === "string" &&
        /status|revision|document|drawing/i.test(cell)
      )
    );
    
    if (headerIndex === -1) headerIndex = 0;

    // --- Trim preamble & return first 15 rows for preview ---
    const trimmed = jsonData.slice(headerIndex);
    const preview = trimmed.slice(0, 15);

    return NextResponse.json({
      ok: true,
      mode: "freemium",
      totalRows: trimmed.length,
      headerIndex,
      first15: preview,
    });
  } catch (err: any) {
    console.error("❌ Freemium upload error:", err);
    return NextResponse.json({ error: err.message || "Failed to parse Excel." }, { status: 500 });
  }
}
