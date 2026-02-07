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
    
    // Get the siteId from query parameters
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    
    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId query parameter is required' },
        { status: 400 }
      );
    }
    
    // Fetch document libraries (drives) from Microsoft Graph API
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`,
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
            error: 'Access denied',
            details: 'You do not have permission to access this SharePoint site. Please contact your administrator.',
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch document libraries', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Filter to only return document libraries (driveType === "documentLibrary")
    const documentLibraries = data.value?.filter(
      (drive: any) => drive.driveType === 'documentLibrary'
    ) || [];
    
    // Return the document libraries
    return NextResponse.json({
      libraries: documentLibraries,
      count: documentLibraries.length,
    });
  } catch (error) {
    console.error('Error fetching document libraries:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
