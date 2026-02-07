import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    // Get projectId from body
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Get the project using ADMIN client to bypass RLS
    const { data: project, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('created_by, organization_id, is_archived')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      console.error('Project fetch error:', fetchError);
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if project is archived (FIXED: is_archived not archived)
    if (!project.is_archived) {
      return NextResponse.json(
        { error: 'Projects must be archived before they can be deleted. Please archive this project first.' },
        { status: 400 }
      );
    }

    // Check if user has permission using ADMIN client
    const { data: membership } = await supabaseAdmin
      .from('organization_members')
      .select('role')
      .eq('organization_id', project.organization_id)
      .eq('user_id', user.id)
      .single();

    const isCreator = project.created_by === user.id;
    const isOrgAdmin = membership?.role === 'admin';

    if (!isCreator && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this project' },
        { status: 403 }
      );
    }

    // Delete all files associated with project first
    const { error: filesError } = await supabaseAdmin
      .from('files')
      .delete()
      .eq('project_id', projectId);

    if (filesError) {
      console.error('Failed to delete files:', filesError);
      return NextResponse.json(
        { error: 'Failed to delete project files' },
        { status: 500 }
      );
    }

    // Delete the project using ADMIN client
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      console.error('Failed to delete project:', deleteError);
      throw deleteError;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project permanently deleted' 
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
