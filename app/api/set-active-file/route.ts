import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileId, token } = body;

    if (!fileId || !token) {
      return NextResponse.json(
        { error: "File ID and token required" },
        { status: 400 }
      );
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Get the file to find its project_id
    const { data: fileData, error: fileError } = await supabaseAdmin
      .from("files")
      .select("project_id")
      .eq("id", fileId)
      .single();

    if (fileError || !fileData) {
      console.error("Get file error:", fileError);
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Update user's active_file_id AND active_project_id
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ 
        active_file_id: fileId,
        active_project_id: fileData.project_id  // ⭐ THE FIX!
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Update active file/project error:", updateError);
      return NextResponse.json(
        { error: "Failed to set active file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Active file and project set",
      projectId: fileData.project_id,
    });
  } catch (err: any) {
    console.error("Set active file error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
