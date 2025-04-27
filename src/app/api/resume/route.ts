import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAdminClient } from '@/lib/supabase-admin';

/**
 * GET handler for retrieving the latest resume for a user
 * 
 * @param req - The incoming request object
 * @returns JSON response with the resume data or error message
 */
export async function GET(req: NextRequest) {
  // Extract userId from query parameters
  const userId = req.nextUrl.searchParams.get('userId');
  
  // Validate required parameters
  if (!userId) {
    return NextResponse.json(
      { error: 'UserId is required' },
      { status: 400 }
    );
  }
  
  try {
    // Ensure admin client is available
    const adminClient = getAdminClient();
    
    // First attempt: Query by auth_user_id (for Clerk integration)
    console.log(`Querying for resumes with auth_user_id = ${userId}`);
    const { data: authUserData, error: authUserError } = await adminClient
      .from('resumes')
      .select('*')
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    // If first query fails or returns no results, try with user_id field
    if (authUserError || !authUserData || authUserData.length === 0) {
      console.log(`No results with auth_user_id, trying user_id next. Error: ${authUserError?.message || 'No data'}`);
      
      // Second attempt: Query by user_id (UUID type field)
      const { data: userIdData, error: userIdError } = await adminClient
        .from('resumes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      // If second query also fails, return appropriate error
      if (userIdError) {
        console.error('Both resume query approaches failed:', userIdError);
        return NextResponse.json(
          { error: userIdError.message },
          { status: 500 }
        );
      }
      
      // Return second query results
      return NextResponse.json({ data: userIdData });
    }
    
    // Return first query results if successful
    return NextResponse.json({ data: authUserData });
  } catch (error: any) {
    // Handle any unexpected errors
    console.error('Error in GET /api/resume:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST handler for saving a new resume
 * 
 * @param req - The incoming request object
 * @returns JSON response with the saved resume ID or error message
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.userId || (!body.originalText && !body.optimizedText)) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and either originalText or optimizedText' },
        { status: 400 }
      );
    }
    
    // Ensure admin client is available
    const adminClient = getAdminClient();
    
    // Insert new resume record
    const { data, error } = await adminClient
      .from('resumes')
      .insert({
        user_id: body.userId,
        auth_user_id: body.authUserId || body.userId,
        original_text: body.originalText || '',
        optimized_text: body.optimizedText || '',
        language: body.language || 'English',
        ats_score: body.atsScore || 0,
        file_url: body.fileUrl || null,
        file_name: body.fileName || null,
        file_type: body.fileType || null,
        ai_provider: body.aiProvider || 'unknown'
      })
      .select()
      .single();
      
    // Handle database errors
    if (error) {
      console.error('Error saving resume:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Return success response with the resume ID
    return NextResponse.json({ 
      success: true,
      resumeId: data.id,
      message: 'Resume saved successfully'
    });
  } catch (error: any) {
    // Handle any unexpected errors
    console.error('Error in POST /api/resume:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}