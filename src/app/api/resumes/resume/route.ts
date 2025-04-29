/**
 * API Route for Resume Management
 * Handles retrieving and saving resume data in the database
 * Supports user-specific resume operations with proper UUID handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import crypto from 'crypto';

/**
 * Gets or creates a Supabase UUID for a Clerk user ID
 * Resolves the issue with Clerk IDs not being valid UUIDs
 * 
 * @param supabaseAdmin - Supabase admin client
 * @param clerkUserId - Clerk user ID (starting with "user_")
 * @returns A valid Supabase UUID for the user
 */
async function getOrCreateSupabaseUuid(supabaseAdmin: any, clerkUserId: string): Promise<string> {
  // First check if this user already has a mapping
  const { data: existingMapping, error: mappingError } = await supabaseAdmin
    .from('user_mapping')
    .select('supabase_uuid')
    .eq('clerk_id', clerkUserId)
    .single();
  
  if (mappingError) {
    console.log("No existing mapping found, creating new one");
    
    // Generate a new UUID for this user
    const newUuid = crypto.randomUUID();
    
    // Insert the mapping
    const { error: insertError } = await supabaseAdmin
      .from('user_mapping')
      .insert({
        clerk_id: clerkUserId,
        supabase_uuid: newUuid
      });
    
    if (insertError) {
      console.error("Error creating user mapping:", insertError);
      throw new Error(`Failed to create user mapping: ${insertError.message}`);
    }
    
    return newUuid;
  }
  
  // Return the existing UUID from the mapping
  return existingMapping.supabase_uuid;
}

/**
 * GET handler for retrieving the latest resume for a user
 * Finds the most recent resume for the specified user
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
    // Get admin client
    const adminClient = getAdminClient();
    
    // Get or create Supabase UUID for Clerk user ID
    let supabaseUserId;
    try {
      supabaseUserId = await getOrCreateSupabaseUuid(adminClient, userId);
      console.log("Using Supabase UUID:", supabaseUserId, "for Clerk ID:", userId);
    } catch (uuidError) {
      console.error("Error getting Supabase UUID:", uuidError);
      // Continue with original userId as fallback
      supabaseUserId = userId;
    }
    
    // Query resumes with both IDs to ensure we find all possible matches
    console.log(`Querying for resumes with user_id = ${supabaseUserId} OR auth_user_id = ${userId}`);
    
    // Find all resumes associated with this user (using both ID fields)
    const { data: resumeData, error: resumeError } = await adminClient
      .from('resumes')
      .select(`
        id,
        user_id,
        auth_user_id,
        supabase_user_id,
        original_text,
        optimized_text,
        language,
        file_name,
        file_type,
        file_url,
        file_size,
        ats_score,
        ai_provider,
        created_at,
        updated_at
      `)
      .or(`user_id.eq.${supabaseUserId},auth_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Handle query errors
    if (resumeError) {
      console.error('Error retrieving resume:', resumeError);
      return NextResponse.json(
        { error: resumeError.message },
        { status: 500 }
      );
    }
    
    // If no resume found, try one more approach with exact query
    if (!resumeData || resumeData.length === 0) {
      console.log("No resumes found, trying exact user_id match as fallback");
      
      // Direct query on user_id field (for backward compatibility)
      const { data: fallbackData, error: fallbackError } = await adminClient
        .from('resumes')
        .select('*')
        .eq('user_id', userId)  // Try with original userId as fallback
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (fallbackError) {
        console.error('Fallback resume query failed:', fallbackError);
        return NextResponse.json(
          { error: 'No resumes found for this user' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ data: fallbackData || [] });
    }
    
    // Get resume suggestions and keywords
    if (resumeData && resumeData.length > 0) {
      const resumeId = resumeData[0].id;
      
      // Fetch associated keywords
      const { data: keywords, error: keywordsError } = await adminClient
        .from('resume_keywords')
        .select('*')
        .eq('resume_id', resumeId);
      
      if (keywordsError) {
        console.warn('Error fetching keywords:', keywordsError);
      }
      
      // Fetch associated suggestions
      const { data: suggestions, error: suggestionsError } = await adminClient
        .from('resume_suggestions')
        .select('*')
        .eq('resume_id', resumeId);
      
      if (suggestionsError) {
        console.warn('Error fetching suggestions:', suggestionsError);
      }
      
      // Add keywords and suggestions to the resume data
      resumeData[0].keywords = keywords || [];
      resumeData[0].suggestions = suggestions || [];
    }
    
    // Return resume data
    return NextResponse.json({ data: resumeData });
    
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
 * Creates a new resume entry in the database
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
    
    // Get admin client
    const adminClient = getAdminClient();
    
    // Get or create Supabase UUID for Clerk user ID
    let supabaseUserId;
    try {
      supabaseUserId = await getOrCreateSupabaseUuid(adminClient, body.userId);
      console.log("Using Supabase UUID:", supabaseUserId, "for Clerk ID:", body.userId);
    } catch (uuidError) {
      console.error("Error getting Supabase UUID:", uuidError);
      // Continue with original userId as fallback
      supabaseUserId = body.userId;
    }
    
    // Insert new resume record
    const { data, error } = await adminClient
      .from('resumes')
      .insert({
        user_id: supabaseUserId,                    // Supabase UUID for user identification
        auth_user_id: body.userId,                  // Original Clerk ID for reference
        supabase_user_id: supabaseUserId,           // Duplicate for backward compatibility
        original_text: body.originalText || '',
        optimized_text: body.optimizedText || '',
        language: body.language || 'English',
        ats_score: body.atsScore || 0,
        file_url: body.fileUrl || null,
        file_name: body.fileName || null,
        file_type: body.fileType || null,
        file_size: body.fileSize || null,
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

/**
 * PUT handler for updating an existing resume
 * Updates a resume entry in the database
 * 
 * @param req - The incoming request object
 * @returns JSON response with success status or error message
 */
export async function PUT(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate required fields
    if (!body.resumeId) {
      return NextResponse.json(
        { error: 'Missing required field: resumeId' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateData: any = {};
    
    // Include only provided fields in the update
    if (body.optimizedText !== undefined) updateData.optimized_text = body.optimizedText;
    if (body.originalText !== undefined) updateData.original_text = body.originalText;
    if (body.language !== undefined) updateData.language = body.language;
    if (body.atsScore !== undefined) updateData.ats_score = body.atsScore;
    if (body.aiProvider !== undefined) updateData.ai_provider = body.aiProvider;
    
    // Get admin client
    const adminClient = getAdminClient();
    
    // Update the resume record
    const { error } = await adminClient
      .from('resumes')
      .update(updateData)
      .eq('id', body.resumeId);
      
    // Handle database errors
    if (error) {
      console.error('Error updating resume:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Resume updated successfully'
    });
  } catch (error: any) {
    // Handle any unexpected errors
    console.error('Error in PUT /api/resume:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}