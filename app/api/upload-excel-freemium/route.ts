import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { randomUUID } from "crypto";

export const runtime = "nodejs"; // ✅ Must be Node runtime — Edge cannot use 'crypto'

export async function POST(req: Request) {
  try {
    // Parse uploaded file from form data
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert Excel/CSV to JSON rows
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[];

    if (!rows.length) {
      return NextResponse.json({ error: "File appears empty" }, { status: 400 });
    }

    // Generate ephemeral session ID — used only in memory for this session
    const sessionId = randomUUID();

    // ✅ Return structured metadata (no storage)
    return NextResponse.json({
      sessionId,
      fileName: file.name,
      totalRows: rows.length,
      totalColumns: Array.isArray(rows[0]) ? rows[0].length : 0,
      preview: rows.slice(0, 10), // limit preview for safety
      message: "File processed successfully (freemium in-memory mode)",
    });
  } catch (err: any) {
    console.error("❌ Freemium upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process file" },
      { status: 500 }
    );
  }
}
