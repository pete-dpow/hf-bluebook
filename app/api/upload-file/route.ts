import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: "File and project ID required" },
        { status: 400 }
      );
    }

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (!jsonData || jsonData.length === 0) {
      return NextResponse.json(
        { error: "Excel file is empty or invalid" },
        { status: 400 }
      );
    }

    // Create file record - SKIP ALL VALIDATION, JUST INSERT
    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from("files")
      .insert({
        file_name: file.name,
        file_type: file.name.endsWith('.csv') ? 'csv' : 'excel',
        source: 'upload',
        project_id: projectId,
        dataset: { data: jsonData },
      })
      .select()
      .single();

    if (fileError) {
      console.error("File insert error:", fileError);
      console.error("Error code:", fileError.code);
      console.error("Error message:", fileError.message);
      console.error("Error details:", fileError.details);
      return NextResponse.json(
        { error: `Database error: ${fileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `File uploaded: ${file.name}`,
      file: {
        id: fileRecord.id,
        name: file.name,
        rows: jsonData.length,
      },
    });

  } catch (err: any) {
    console.error("Upload file error:", err);
    console.error("Error stack:", err.stack);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
