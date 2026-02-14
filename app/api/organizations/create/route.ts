import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { name, token } = await request.json();

    if (!name || !token) {
      return NextResponse.json(
        { error: 'Organization name and token required' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        owner_id: user.id,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return NextResponse.json(
        { error: orgError.message || 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Add creator as admin in organization_members
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'admin',
      });

    if (memberError) {
      console.error('Member creation error:', memberError);
      // Rollback: delete the organization if member creation fails
      await supabase.from('organizations').delete().eq('id', organization.id);
      return NextResponse.json(
        { error: 'Failed to create organization membership' },
        { status: 500 }
      );
    }

    // Set as active organization
    const { error: updateError } = await supabase
      .from('users')
      .update({ active_organization_id: organization.id })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update active org error:', updateError);
      // Don't fail the request, just log it
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        role: 'admin',
      },
    });

  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
