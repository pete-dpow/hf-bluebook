import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the Microsoft access token from the session
    const accessToken = session.provider_token;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Microsoft access token found' },
        { status: 401 }
      );
    }
    
    // Fetch SharePoint sites from Microsoft Graph API
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/sites?search=*',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Microsoft Graph API error:', errorText);
      
      // Check for specific error types
      if (response.status === 403 || response.status === 401) {
        return NextResponse.json(
          { 
            error: 'SharePoint access not available',
            details: 'Your account does not have access to SharePoint. Personal Microsoft accounts (like @outlook.com or @hotmail.com) do not have SharePoint. Please use a work or school account with SharePoint enabled.',
            accountType: 'personal'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch SharePoint sites', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Check if no sites returned
    if (!data.value || data.value.length === 0) {
      return NextResponse.json(
        {
          sites: [],
          count: 0,
          message: 'No SharePoint sites found. You may not have access to any SharePoint sites, or your account may be a personal account.'
        }
      );
    }
    
    // Return the sites
    return NextResponse.json({
      sites: data.value || [],
      count: data.value?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching SharePoint sites:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
