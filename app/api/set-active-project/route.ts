import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, token } = body;

    if (!projectId || !token) {
      return NextResponse.json(
        { error: "Project ID and token required" },
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

    // Update user's active_project_id and CLEAR active_file_id (Mode 1b: All Files)
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ 
        active_project_id: projectId,
        active_file_id: null // Clear for "all files" mode
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Update active_project_id error:", updateError);
      return NextResponse.json(
        { error: "Failed to set active project" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Active project set (all files mode)",
    });

  } catch (err: any) {
    console.error("Set active project error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
