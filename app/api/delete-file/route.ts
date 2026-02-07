import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { fileId } = body;

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID required" },
        { status: 400 }
      );
    }

    // Verify file is archived and belongs to user's organization
    const { data: file, error: fileError } = await supabaseAdmin
      .from("files")
      .select("id, file_name, is_archived, project_id, projects!inner(org_id)")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    if (!file.is_archived) {
      return NextResponse.json(
        { error: "File must be archived before deletion" },
        { status: 400 }
      );
    }

    // Delete the file
    const { error: deleteError } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("id", fileId);

    if (deleteError) {
      console.error("Delete file error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `File "${file.file_name}" permanently deleted`,
    });
  } catch (err: any) {
    console.error("Delete file error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
