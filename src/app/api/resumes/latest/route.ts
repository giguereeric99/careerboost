// app/api/resumes/latest/route.ts
// This API route fetches the latest resume for a user, bypassing RLS policies using the admin client

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAdminClient } from '@/lib/supabase-admin';

/**
 * GET handler to retrieve the latest resume for the authenticated user
 * This is a server-side API that uses the service role key to bypass RLS
 * 
 * @param req - The incoming request object
 * @returns JSON response containing resume data or error details
 */
export async function GET(req: NextRequest) {
  try {
    // Extract userId from query parameters
    const userId = req.nextUrl.searchParams.get('userId');
    
    // Validate required parameters
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    console.log('Getting latest resume for user:', userId);
    
    // Get admin client that bypasses RLS
    const adminClient = getAdminClient();
    
    // Try multiple approaches to find the resume based on different ID fields
    
    // First approach: Try with auth_user_id (likely from Clerk)
    const { data: authUserData, error: authUserError } = await adminClient
      .from('resumes')
      .select('*')
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // If we found a resume using auth_user_id, return it
    if (!authUserError && authUserData && authUserData.length > 0) {
      console.log('Found resume using auth_user_id:', authUserData[0].id);
      
      // Fetch associated keywords and suggestions
      const [keywordsResult, suggestionsResult] = await Promise.all([
        adminClient
          .from('resume_keywords')
          .select('*')
          .eq('resume_id', authUserData[0].id),
        
        adminClient
          .from('resume_suggestions')
          .select('*')
          .eq('resume_id', authUserData[0].id)
      ]);
      
      // Return the resume with keywords and suggestions
      return NextResponse.json({
        data: {
          ...authUserData[0],
          keywords: keywordsResult.data || [],
          suggestions: suggestionsResult.data || []
        }
      });
    }
    
    // Second approach: Try with user_id (UUID field)
    console.log('No resume found with auth_user_id, trying user_id');
    const { data: userIdData, error: userIdError } = await adminClient
      .from('resumes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // If we found a resume using user_id, return it
    if (!userIdError && userIdData && userIdData.length > 0) {
      console.log('Found resume using user_id:', userIdData[0].id);
      
      // Fetch associated keywords and suggestions
      const [keywordsResult, suggestionsResult] = await Promise.all([
        adminClient
          .from('resume_keywords')
          .select('*')
          .eq('resume_id', userIdData[0].id),
        
        adminClient
          .from('resume_suggestions')
          .select('*')
          .eq('resume_id', userIdData[0].id)
      ]);
      
      // Return the resume with keywords and suggestions
      return NextResponse.json({
        data: {
          ...userIdData[0],
          keywords: keywordsResult.data || [],
          suggestions: suggestionsResult.data || []
        }
      });
    }
    
    // Final approach: Try with supabase_user_id if it exists
    console.log('No resume found with user_id, trying supabase_user_id');
    const { data: supabaseUserData, error: supabaseUserError } = await adminClient
      .from('resumes')
      .select('*')
      .eq('supabase_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // If we found a resume using supabase_user_id, return it
    if (!supabaseUserError && supabaseUserData && supabaseUserData.length > 0) {
      console.log('Found resume using supabase_user_id:', supabaseUserData[0].id);
      
      // Fetch associated keywords and suggestions
      const [keywordsResult, suggestionsResult] = await Promise.all([
        adminClient
          .from('resume_keywords')
          .select('*')
          .eq('resume_id', supabaseUserData[0].id),
        
        adminClient
          .from('resume_suggestions')
          .select('*')
          .eq('resume_id', supabaseUserData[0].id)
      ]);
      
      // Return the resume with keywords and suggestions
      return NextResponse.json({
        data: {
          ...supabaseUserData[0],
          keywords: keywordsResult.data || [],
          suggestions: suggestionsResult.data || []
        }
      });
    }
    
    // If all approaches failed but no errors occurred, return empty data
    console.log('No resumes found for this user through any ID field');
    return NextResponse.json({
      data: null
    });
    
  } catch (error: any) {
    // Handle any unexpected errors
    console.error('Error in GET /api/resumes/latest:', error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}