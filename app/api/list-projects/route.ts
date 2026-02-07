import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    // Get auth token from header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    // Get filter parameter from URL
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter'); // 'active' or 'archived'

    // Get user's active organization using service role to bypass RLS on users table
    const { data: userData } = await supabase
      .from('users')
      .select('active_organization_id')
      .eq('id', user.id)
      .single();
    
    const activeOrgId = userData?.active_organization_id;

    // Get user's organization memberships (manually since we're using admin client)
    const { data: orgMemberships } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);
    
    const userOrgIds = orgMemberships?.map(m => m.organization_id) || [];
    
    if (userOrgIds.length === 0) {
      // User has no org memberships, return empty
      return NextResponse.json({
        ok: true,
        projects: [],
        active_organization_id: activeOrgId,
        total_count: 0,
        filter: filter || 'active',
      });
    }

    // Query projects using admin client (bypasses RLS)
    let query = supabaseAdmin
      .from("projects")
      .select(
        `
        id,
        name,
        description,
        created_at,
        updated_at,
        organization_id,
        created_by,
        is_archived,
        excel_datasets (
          id,
          file_name,
          total_rows,
          created_at
        ),
        organizations (
          id,
          name
        )
      `
      )
      .in('organization_id', userOrgIds); // Only projects in user's orgs

    // Filter by active organization if one is selected
    if (activeOrgId) {
      query = query.eq('organization_id', activeOrgId);
    }

    // Filter by archived status
    if (filter === 'archived') {
      query = query.eq('is_archived', true);
    } else {
      // Default: show only non-archived (active) projects
      query = query.eq('is_archived', false);
    }
    
    query = query.order("created_at", { ascending: false });

    const { data: projects, error } = await query;

    if (error) {
      console.error("Error fetching projects:", error);
      throw new Error(error.message);
    }

    // Format projects with org info
    const formattedProjects = projects?.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      created_at: p.created_at,
      updated_at: p.updated_at,
      organization_id: p.organization_id,
      created_by: p.created_by,
      is_archived: p.is_archived || false,
      excel_datasets: p.excel_datasets || [],
      org_name: p.organizations?.name || 'Personal',
      is_org_project: !!p.organization_id,
    })) || [];

    return NextResponse.json({
      ok: true,
      projects: formattedProjects,
      active_organization_id: activeOrgId,
      total_count: formattedProjects.length,
      filter: filter || 'active',
    });
  } catch (err: any) {
    console.error("List projects error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
