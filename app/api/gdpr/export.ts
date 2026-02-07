import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⭐ Task 38: GDPR Data Export API
export async function POST(req: Request) {
  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Create authenticated Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Collect all user data
    const exportData: any = {
      exportDate: new Date().toISOString(),
      exportVersion: "1.0",
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
    };

    // Get user profile data
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      // Remove sensitive internal fields
      const { id, ...profile } = profileData;
      exportData.profile = profile;
    }

    // Get user's organizations
    const { data: memberships } = await supabase
      .from("organization_members")
      .select(`
        role,
        created_at,
        organizations:organization_id (
          id,
          name,
          created_at
        )
      `)
      .eq("user_id", user.id);

    if (memberships) {
      exportData.organizations = memberships.map((m: any) => ({
        name: m.organizations?.name,
        role: m.role,
        joined_at: m.created_at,
      }));
    }

    // Get user's projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, description, created_at, updated_at, is_archived")
      .eq("user_id", user.id);

    if (projects) {
      exportData.projects = projects.map((p: any) => ({
        name: p.name,
        description: p.description,
        created_at: p.created_at,
        updated_at: p.updated_at,
        is_archived: p.is_archived,
      }));
    }

    // Get user's files
    const { data: files } = await supabase
      .from("files")
      .select("id, file_name, created_at, project_id")
      .eq("user_id", user.id);

    if (files) {
      exportData.files = files.map((f: any) => ({
        file_name: f.file_name,
        created_at: f.created_at,
      }));
    }

    // Get user's chat messages
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("role, text, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (messages) {
      exportData.chat_history = messages;
    }

    // Get organization invites sent by user
    const { data: invites } = await supabase
      .from("organization_invites")
      .select("email, role, status, created_at")
      .eq("invited_by", user.id);

    if (invites) {
      exportData.invites_sent = invites;
    }

    return NextResponse.json(exportData);

  } catch (err: any) {
    console.error("GDPR export error:", err);
    return NextResponse.json(
      { error: "Export failed", details: err.message },
      { status: 500 }
    );
  }
}
