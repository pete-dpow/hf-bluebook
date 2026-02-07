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

    // Get file data - FIXED: file_name not name
    const { data: file, error: fileError } = await supabaseAdmin
      .from("files")
      .select("id, file_name, dataset, project_id, created_at")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      console.error("File fetch error:", fileError);
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }

    // Get project data for context
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, name, organization_id")
      .eq("id", file.project_id)
      .single();

    if (projectError || !project) {
      console.error("Project fetch error:", projectError);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get chat messages for this file (if any)
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, text, created_at")
      .eq("project_id", file.project_id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Messages fetch error:", messagesError);
      // Don't fail - just return empty messages
    }

    // Get org name
    let orgName = "Personal";
    if (project.organization_id) {
      const { data: org } = await supabaseAdmin
        .from("organizations")
        .select("name")
        .eq("id", project.organization_id)
        .single();
      
      if (org) {
        orgName = org.name;
      }
    }

    return NextResponse.json({
      file: {
        id: file.id,
        name: file.file_name, // Return as 'name' for frontend
        created_at: file.created_at,
      },
      dataset: file.dataset,
      project: {
        id: project.id,
        name: project.name,
      },
      org_name: orgName,
      messages: messages || [],
    });

  } catch (err: any) {
    console.error("Load file error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
