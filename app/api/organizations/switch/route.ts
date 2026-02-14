import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { organization_id, token } = await request.json();
    
    if (!organization_id) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Create Supabase client with user's token
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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Verify user is member
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Update active organization
    const { error: updateError } = await supabase
      .from('users')
      .update({ active_organization_id: organization_id })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update active organization' }, { status: 500 });
    }

    // Get projects for new org
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    return NextResponse.json({ 
      success: true, 
      organization_id,
      projects: projects || []
    });

  } catch (error) {
    console.error('Switch org error:', error);
    return NextResponse.json({ error: 'Failed to switch organization' }, { status: 500 });
  }
}
