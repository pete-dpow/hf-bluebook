import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
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

    // Get all organizations user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from('organization_members')
      .select(`
        role,
        organization_id,
        organizations (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (memberError) {
      console.error('List organizations error:', memberError);
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      );
    }

    // Format the response
    const organizations = (memberships || []).map((m: any) => ({
      id: m.organizations.id,
      name: m.organizations.name,
      role: m.role,
      created_at: m.organizations.created_at,
    }));

    return NextResponse.json({
      success: true,
      organizations,
    });

  } catch (error) {
    console.error('List organizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
