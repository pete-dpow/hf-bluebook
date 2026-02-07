import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { projectId, token } = await req.json();
    
    if (!projectId || !token) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch project with org info using admin client (bypasses RLS)
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select(`
        id,
        name,
        description,
        user_id,
        organization_id,
        created_by,
        created_at,
        excel_datasets (
          id, 
          file_name, 
          total_rows, 
          data
        ),
        chat_messages (
          id, 
          role, 
          text, 
          timestamp
        ),
        organizations (
          id,
          name
        )
      `)
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check authorization
    if (project.user_id !== user.id) {
      if (project.organization_id) {
        const { data: member } = await supabaseAdmin
          .from("organization_members")
          .select("role")
          .eq("organization_id", project.organization_id)
          .eq("user_id", user.id)
          .single();
        
        if (!member) {
          return NextResponse.json(
            { error: "Not authorized" },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Not authorized" },
          { status: 403 }
        );
      }
    }

    // Set active project for WhatsApp integration
    await supabaseAdmin
      .from("users")
      .update({ active_project_id: projectId })
      .eq("id", user.id);

    // Format response
    const dataset = project.excel_datasets?.[0];
    const messages = (project.chat_messages || [])
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((msg: any) => ({ role: msg.role, content: msg.text }));

    return NextResponse.json({
      ok: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        organization_id: project.organization_id,
        org_name: (project.organizations as any)?.name || 'Personal',
        created_by: project.created_by,
        created_at: project.created_at,
      },
      dataset: dataset ? {
        id: dataset.id,
        file_name: dataset.file_name,
        total_rows: dataset.total_rows,
        data: dataset.data
      } : null,
      messages
    });
  } catch (error: any) {
    console.error("Load project error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
