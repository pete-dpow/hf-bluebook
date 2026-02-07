import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Project name required" },
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

    // Get user's active organization
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("active_organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = userData?.active_organization_id;

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Create project
    const { data: project, error: createError } = await supabaseAdmin
      .from("projects")
      .insert({
        name: name.trim(),
        organization_id: organizationId,
      })
      .select()
      .single();

    if (createError) {
      console.error("Create project error:", createError);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project: project,
    });

  } catch (err: any) {
    console.error("Create project error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
