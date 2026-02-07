import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileId, archived } = body;

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

    if (!fileId || typeof archived !== "boolean") {
      return NextResponse.json(
        { error: "File ID and archived status required" },
        { status: 400 }
      );
    }

    // Verify file belongs to user's organization
    const { data: file, error: fileError } = await supabaseAdmin
      .from("files")
      .select("id, project_id, projects!inner(org_id)")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Archive/restore the file
    const { error: updateError } = await supabaseAdmin
      .from("files")
      .update({ is_archived: archived })
      .eq("id", fileId);

    if (updateError) {
      console.error("Archive file error:", updateError);
      return NextResponse.json(
        { error: "Failed to update file" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: archived ? "File archived successfully" : "File restored successfully",
    });
  } catch (err: any) {
    console.error("Archive file error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
