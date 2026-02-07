import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, newName } = body;

    if (!projectId || !newName?.trim()) {
      return NextResponse.json(
        { error: "Project ID and new name required" },
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
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Verify user has access to this project
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check user is member of this org
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("organization_id", project.organization_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Rename project
    const { error: updateError } = await supabaseAdmin
      .from("projects")
      .update({ name: newName.trim() })
      .eq("id", projectId);

    if (updateError) {
      console.error("Rename project error:", updateError);
      return NextResponse.json(
        { error: "Failed to rename project" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Project renamed to "${newName}"`,
    });

  } catch (err: any) {
    console.error("Rename project error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
