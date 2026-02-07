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
    
    // Get the driveId from query parameters
    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get('driveId');
    
    if (!driveId) {
      return NextResponse.json(
        { error: 'driveId query parameter is required' },
        { status: 400 }
      );
    }
    
    // Fetch files from the document library root
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`,
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
            details: 'You do not have permission to access this document library.',
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch SharePoint files', details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Filter to only Excel files (.xlsx, .xlsm, .xls)
    const excelFiles = data.value?.filter((file: any) => {
      const fileName = file.name?.toLowerCase() || '';
      return (
        !file.folder && // Not a folder
        (fileName.endsWith('.xlsx') ||
          fileName.endsWith('.xlsm') ||
          fileName.endsWith('.xls'))
      );
    }) || [];
    
    // Transform to match the structure expected by the frontend
    const transformedFiles = excelFiles.map((file: any) => ({
      id: file.id,
      name: file.name,
      size: file.size,
      lastModifiedDateTime: file.lastModifiedDateTime,
      webUrl: file.webUrl,
      downloadUrl: file['@microsoft.graph.downloadUrl'],
      parentReference: file.parentReference,
    }));
    
    // Return the Excel files
    return NextResponse.json({
      files: transformedFiles,
      count: transformedFiles.length,
    });
  } catch (error) {
    console.error('Error fetching SharePoint files:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
