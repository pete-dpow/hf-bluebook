import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⭐ Task 39: GDPR Account Deletion API
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
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "build-placeholder",
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

    const userId = user.id;

    // Use admin client for deletion operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log(`🗑️ Starting account deletion for user: ${userId}`);

    // Delete in order (respect foreign keys)

    // 1. Delete chat messages
    const { error: messagesError } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);
    
    if (messagesError) {
      console.error("Error deleting messages:", messagesError);
    }

    // 2. Delete files
    const { error: filesError } = await supabaseAdmin
      .from("files")
      .delete()
      .eq("user_id", userId);
    
    if (filesError) {
      console.error("Error deleting files:", filesError);
    }

    // 3. Delete projects
    const { error: projectsError } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("user_id", userId);
    
    if (projectsError) {
      console.error("Error deleting projects:", projectsError);
    }

    // 4. Delete organization invites (sent by user)
    const { error: invitesError } = await supabaseAdmin
      .from("organization_invites")
      .delete()
      .eq("invited_by", userId);
    
    if (invitesError) {
      console.error("Error deleting invites:", invitesError);
    }

    // 5. Delete organization memberships
    const { error: membershipsError } = await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("user_id", userId);
    
    if (membershipsError) {
      console.error("Error deleting memberships:", membershipsError);
    }

    // 6. Check if user is sole admin of any orgs - transfer or delete
    const { data: adminOrgs } = await supabaseAdmin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (adminOrgs && adminOrgs.length > 0) {
      for (const org of adminOrgs) {
        // Check if there are other admins
        const { data: otherAdmins } = await supabaseAdmin
          .from("organization_members")
          .select("user_id")
          .eq("organization_id", org.organization_id)
          .eq("role", "admin")
          .neq("user_id", userId);

        if (!otherAdmins || otherAdmins.length === 0) {
          // No other admins - delete the entire org
          // First delete org's projects, files, messages
          const { data: orgProjects } = await supabaseAdmin
            .from("projects")
            .select("id")
            .eq("organization_id", org.organization_id);

          if (orgProjects) {
            for (const project of orgProjects) {
              await supabaseAdmin.from("chat_messages").delete().eq("project_id", project.id);
              await supabaseAdmin.from("files").delete().eq("project_id", project.id);
            }
            await supabaseAdmin.from("projects").delete().eq("organization_id", org.organization_id);
          }

          // Delete org invites
          await supabaseAdmin.from("organization_invites").delete().eq("organization_id", org.organization_id);
          
          // Delete org members
          await supabaseAdmin.from("organization_members").delete().eq("organization_id", org.organization_id);
          
          // Delete org
          await supabaseAdmin.from("organizations").delete().eq("id", org.organization_id);
        }
      }
    }

    // 7. Delete user profile from users table
    const { error: userProfileError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);
    
    if (userProfileError) {
      console.error("Error deleting user profile:", userProfileError);
    }

    // 8. Delete auth user (this is the final step)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error("Error deleting auth user:", authDeleteError);
      return NextResponse.json(
        { error: "Failed to delete account", details: authDeleteError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Account deleted successfully: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: "Account and all associated data deleted successfully" 
    });

  } catch (err: any) {
    console.error("GDPR delete error:", err);
    return NextResponse.json(
      { error: "Deletion failed", details: err.message },
      { status: 500 }
    );
  }
}
