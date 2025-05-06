/**
 * API Routes for Resume Keywords
 * 
 * This file contains API routes for managing resume keywords:
 * - GET: Fetch keywords for a resume
 * - POST: Update keyword status (applied/not applied) for multiple keywords
 * - PUT: Add new keywords to a resume
 * - DELETE: Remove keywords from a resume
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getAuth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * Get keywords for a specific resume
 * GET /api/resumes/keywords?resumeId={resumeId}
 */
export async function GET(req: NextRequest) {
  try {
    // Get request URL and parse search params
    const url = new URL(req.url);
    const resumeId = url.searchParams.get("resumeId");
    
    // Validate request parameters
    if (!resumeId) {
      return NextResponse.json({ 
        error: "Missing required parameter: resumeId" 
      }, { status: 400 });
    }
    
    // Get user authentication
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    // Initialize Supabase admin client
    const supabaseAdmin = getAdminClient();
    
    // Verify resume ownership
    const { data: resumeData, error: resumeError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, supabase_user_id")
      .eq("id", resumeId)
      .single();
      
    if (resumeError) {
      return NextResponse.json({ 
        error: "Resume not found" 
      }, { status: 404 });
    }
    
    // Get Supabase UUID for the authenticated user
    const supabaseUserId = await getOrCreateSupabaseUuid(supabaseAdmin, userId);
    
    // Check if the resume belongs to the authenticated user
    const isAuthorized = 
      resumeData.user_id === userId || 
      resumeData.auth_user_id === userId ||
      resumeData.user_id === supabaseUserId ||
      resumeData.supabase_user_id === supabaseUserId;
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "You are not authorized to access this resume" 
      }, { status: 403 });
    }
    
    // Fetch keywords for the resume
    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from("resume_keywords")
      .select("*")
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false });
    
    if (keywordsError) {
      return NextResponse.json({ 
        error: `Failed to fetch keywords: ${keywordsError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ data: keywords });
  } catch (error: any) {
    console.error("Unexpected error in GET keywords handler:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

/**
 * Update keywords status (applied/not applied)
 * POST /api/resumes/keywords
 * 
 * Body:
 * {
 *   resumeId: string
 *   keywords: Array<{ text: string, applied: boolean }>
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { resumeId, keywords } = body;
    
    // Validate request body
    if (!resumeId || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ 
        error: "Missing required fields: resumeId and keywords array are required" 
      }, { status: 400 });
    }
    
    // Validate keywords format
    for (const keyword of keywords) {
      if (typeof keyword.text !== 'string' || typeof keyword.applied !== 'boolean') {
        return NextResponse.json({ 
          error: "Invalid keyword format. Each keyword must have 'text' (string) and 'applied' (boolean)" 
        }, { status: 400 });
      }
    }
    
    // Get user authentication
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    // Initialize Supabase admin client
    const supabaseAdmin = getAdminClient();
    
    // Verify resume ownership
    const { data: resumeData, error: resumeError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, supabase_user_id")
      .eq("id", resumeId)
      .single();
      
    if (resumeError) {
      return NextResponse.json({ 
        error: "Resume not found" 
      }, { status: 404 });
    }
    
    // Get Supabase UUID for the authenticated user
    const supabaseUserId = await getOrCreateSupabaseUuid(supabaseAdmin, userId);
    
    // Check if the resume belongs to the authenticated user
    const isAuthorized = 
      resumeData.user_id === userId || 
      resumeData.auth_user_id === userId ||
      resumeData.user_id === supabaseUserId ||
      resumeData.supabase_user_id === supabaseUserId;
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "You are not authorized to update this resume" 
      }, { status: 403 });
    }
    
    // Process each keyword update
    const results = [];
    const updatedAt = new Date().toISOString();
    
    for (const keyword of keywords) {
      try {
        // Check if the keyword exists for this resume
        const { data: existingKeyword, error: findError } = await supabaseAdmin
          .from("resume_keywords")
          .select("id")
          .eq("resume_id", resumeId)
          .eq("keyword", keyword.text)
          .maybeSingle();
        
        if (findError) {
          console.error(`Error finding keyword ${keyword.text}:`, findError);
          results.push({
            keyword: keyword.text,
            success: false,
            error: findError.message
          });
          continue;
        }
        
        // If keyword exists, update it
        if (existingKeyword) {
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("resume_keywords")
            .update({
              is_applied: keyword.applied,
              updated_at: updatedAt
            })
            .eq("id", existingKeyword.id)
            .select();
          
          if (updateError) {
            console.error(`Error updating keyword ${keyword.text}:`, updateError);
            results.push({
              keyword: keyword.text,
              success: false,
              error: updateError.message
            });
          } else {
            results.push({
              keyword: keyword.text,
              success: true,
              data: updated[0]
            });
          }
        } 
        // If keyword doesn't exist, create it
        else {
          const { data: created, error: createError } = await supabaseAdmin
            .from("resume_keywords")
            .insert({
              resume_id: resumeId,
              keyword: keyword.text,
              is_applied: keyword.applied,
              created_at: updatedAt,
              updated_at: updatedAt
            })
            .select();
          
          if (createError) {
            console.error(`Error creating keyword ${keyword.text}:`, createError);
            results.push({
              keyword: keyword.text,
              success: false,
              error: createError.message
            });
          } else {
            results.push({
              keyword: keyword.text,
              success: true,
              data: created[0]
            });
          }
        }
      } catch (keywordError: any) {
        console.error(`Error processing keyword ${keyword.text}:`, keywordError);
        results.push({
          keyword: keyword.text,
          success: false,
          error: keywordError.message || "Unknown error"
        });
      }
    }
    
    // Check if any updates were successful
    const anySuccess = results.some(r => r.success);
    
    if (!anySuccess) {
      return NextResponse.json({ 
        error: "Failed to update any keywords",
        details: results
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Keywords updated successfully`,
      results
    });
  } catch (error: any) {
    console.error("Unexpected error in POST keywords handler:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

/**
 * Add new keywords to a resume
 * PUT /api/resumes/keywords
 * 
 * Body:
 * {
 *   resumeId: string
 *   keywords: Array<string>
 *   applied?: boolean (defaults to false)
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { resumeId, keywords, applied = false } = body;
    
    // Validate request body
    if (!resumeId || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ 
        error: "Missing required fields: resumeId and keywords array are required" 
      }, { status: 400 });
    }
    
    // Validate keywords format
    for (const keyword of keywords) {
      if (typeof keyword !== 'string' || keyword.trim() === '') {
        return NextResponse.json({ 
          error: "Invalid keyword format. Each keyword must be a non-empty string" 
        }, { status: 400 });
      }
    }
    
    // Get user authentication
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    // Initialize Supabase admin client
    const supabaseAdmin = getAdminClient();
    
    // Verify resume ownership
    const { data: resumeData, error: resumeError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, supabase_user_id")
      .eq("id", resumeId)
      .single();
      
    if (resumeError) {
      return NextResponse.json({ 
        error: "Resume not found" 
      }, { status: 404 });
    }
    
    // Get Supabase UUID for the authenticated user
    const supabaseUserId = await getOrCreateSupabaseUuid(supabaseAdmin, userId);
    
    // Check if the resume belongs to the authenticated user
    const isAuthorized = 
      resumeData.user_id === userId || 
      resumeData.auth_user_id === userId ||
      resumeData.user_id === supabaseUserId ||
      resumeData.supabase_user_id === supabaseUserId;
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "You are not authorized to update this resume" 
      }, { status: 403 });
    }
    
    // Add each keyword
    const keywordObjects = keywords.map(keyword => ({
      resume_id: resumeId,
      keyword: keyword.trim(),
      is_applied: applied,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    
    // Fetch existing keywords for this resume to avoid duplicates
    const { data: existingKeywords, error: fetchError } = await supabaseAdmin
      .from("resume_keywords")
      .select("keyword")
      .eq("resume_id", resumeId);
    
    if (fetchError) {
      return NextResponse.json({ 
        error: `Failed to fetch existing keywords: ${fetchError.message}` 
      }, { status: 500 });
    }
    
    // Filter out keywords that already exist
    const existingKeywordTexts = existingKeywords.map(k => k.keyword.toLowerCase());
    const newKeywordObjects = keywordObjects.filter(
      k => !existingKeywordTexts.includes(k.keyword.toLowerCase())
    );
    
    // If all keywords already exist, return success with a message
    if (newKeywordObjects.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All keywords already exist for this resume",
        added: 0,
        total: keywords.length
      });
    }
    
    // Insert new keywords
    const { data: newKeywords, error: insertError } = await supabaseAdmin
      .from("resume_keywords")
      .insert(newKeywordObjects)
      .select();
    
    if (insertError) {
      return NextResponse.json({ 
        error: `Failed to add keywords: ${insertError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Keywords added successfully",
      added: newKeywordObjects.length,
      total: keywords.length,
      data: newKeywords
    });
  } catch (error: any) {
    console.error("Unexpected error in PUT keywords handler:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

/**
 * Delete keywords from a resume
 * DELETE /api/resumes/keywords
 * 
 * Query parameters (two options):
 * 1. keywordId={keywordId} - Delete a single keyword by ID
 * 2. resumeId={resumeId}&keyword={keyword} - Delete a keyword by text for a specific resume
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get request URL and parse search params
    const url = new URL(req.url);
    const keywordId = url.searchParams.get("keywordId");
    const resumeId = url.searchParams.get("resumeId");
    const keyword = url.searchParams.get("keyword");
    
    // Validate request parameters
    if (!keywordId && (!resumeId || !keyword)) {
      return NextResponse.json({ 
        error: "Missing required parameters: either keywordId OR (resumeId AND keyword) are required" 
      }, { status: 400 });
    }
    
    // Get user authentication
    const auth = getAuth(req);
    const userId = auth.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        error: "Authentication required" 
      }, { status: 401 });
    }
    
    // Initialize Supabase admin client
    const supabaseAdmin = getAdminClient();
    
    let targetResumeId: string;
    
    // If deleting by keywordId, get the resumeId first
    if (keywordId) {
      const { data: keywordData, error: keywordError } = await supabaseAdmin
        .from("resume_keywords")
        .select("resume_id")
        .eq("id", keywordId)
        .single();
        
      if (keywordError) {
        return NextResponse.json({ 
          error: "Keyword not found" 
        }, { status: 404 });
      }
      
      targetResumeId = keywordData.resume_id;
    } else {
      // If deleting by resumeId and keyword text
      targetResumeId = resumeId as string;
    }
    
    // Verify resume ownership
    const { data: resumeData, error: resumeError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, supabase_user_id")
      .eq("id", targetResumeId)
      .single();
      
    if (resumeError) {
      return NextResponse.json({ 
        error: "Resume not found" 
      }, { status: 404 });
    }
    
    // Get Supabase UUID for the authenticated user
    const supabaseUserId = await getOrCreateSupabaseUuid(supabaseAdmin, userId);
    
    // Check if the resume belongs to the authenticated user
    const isAuthorized = 
      resumeData.user_id === userId || 
      resumeData.auth_user_id === userId ||
      resumeData.user_id === supabaseUserId ||
      resumeData.supabase_user_id === supabaseUserId;
    
    if (!isAuthorized) {
      return NextResponse.json({ 
        error: "You are not authorized to delete keywords for this resume" 
      }, { status: 403 });
    }
    
    // Delete the keyword(s)
    let deleteError;
    
    if (keywordId) {
      // Delete by keyword ID
      const { error } = await supabaseAdmin
        .from("resume_keywords")
        .delete()
        .eq("id", keywordId);
        
      deleteError = error;
    } else {
      // Delete by resume ID and keyword text
      const { error } = await supabaseAdmin
        .from("resume_keywords")
        .delete()
        .eq("resume_id", resumeId as string)
        .eq("keyword", keyword as string);
        
      deleteError = error;
    }
    
    if (deleteError) {
      return NextResponse.json({ 
        error: `Failed to delete keyword: ${deleteError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Keyword deleted successfully"
    });
  } catch (error: any) {
    console.error("Unexpected error in DELETE keywords handler:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

/**
 * Gets or creates a Supabase UUID for a Clerk user ID
 * Resolves the issue with Clerk IDs not being valid UUIDs
 * 
 * @param supabaseAdmin - Supabase admin client
 * @param clerkUserId - Clerk user ID (starting with "user_")
 * @returns A valid Supabase UUID for the user
 */
async function getOrCreateSupabaseUuid(supabaseAdmin: any, clerkUserId: string): Promise<string> {
  try {
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
  } catch (error) {
    console.error("Error in getOrCreateSupabaseUuid:", error);
    // Return the original ID as fallback (might not be a valid UUID)
    return clerkUserId;
  }
}