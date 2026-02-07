import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Get projectId, archived status, and permanentDelete flag from body
    const { projectId, archived, permanentDelete } = await request.json();
    
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

    // Check if user has permission (creator or org admin)
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
        { error: 'You do not have permission to modify this project' },
        { status: 403 }
      );
    }

    // PERMANENT DELETE
    if (permanentDelete === true) {
      // Safety check: can only delete archived projects
      if (!project.is_archived) {
        return NextResponse.json(
          { error: 'Cannot delete active project. Archive it first.' },
          { status: 400 }
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

      // Delete the project
      const { error: deleteError } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (deleteError) {
        console.error('Failed to delete project:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete project' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Project permanently deleted'
      });
    }

    // ARCHIVE or RESTORE
    if (typeof archived !== 'boolean') {
      return NextResponse.json(
        { error: 'archived must be true or false' },
        { status: 400 }
      );
    }

    // Update is_archived column using ADMIN client
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ is_archived: archived })
      .eq('id', projectId);

    if (updateError) {
      console.error('Archive update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: archived ? 'Project archived successfully' : 'Project restored successfully'
    });
  } catch (error) {
    console.error('Error modifying project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
