/**
 * API Routes for Resume Suggestions
 * 
 * This file contains API routes for managing resume suggestions:
 * - GET: Fetch suggestions for a resume
 * - POST: Update suggestion status (applied/not applied)
 * - PUT: Add a new suggestion
 * - DELETE: Remove a suggestion
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getAuth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * Get suggestions for a specific resume
 * GET /api/resumes/suggestions?resumeId={resumeId}
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
    
    // Fetch suggestions for the resume
    const { data: suggestions, error: suggestionsError } = await supabaseAdmin
      .from("resume_suggestions")
      .select("*")
      .eq("resume_id", resumeId)
      .order("created_at", { ascending: false });
    
    if (suggestionsError) {
      return NextResponse.json({ 
        error: `Failed to fetch suggestions: ${suggestionsError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ data: suggestions });
  } catch (error: any) {
    console.error("Unexpected error in GET suggestions handler:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

/**
 * Update suggestion status (applied/not applied)
 * POST /api/resumes/suggestions
 * 
 * Body:
 * {
 *   resumeId: string
 *   suggestionId: string
 *   applied: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { resumeId, suggestionId, applied } = body;
    
    // Validate request body
    if (!resumeId || !suggestionId || applied === undefined) {
      return NextResponse.json({ 
        error: "Missing required fields: resumeId, suggestionId, and applied are required" 
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
        error: "You are not authorized to update this resume" 
      }, { status: 403 });
    }
    
    // Verify that the suggestion exists and belongs to the resume
    const { data: suggestion, error: suggestionError } = await supabaseAdmin
      .from("resume_suggestions")
      .select("id, resume_id")
      .eq("id", suggestionId)
      .eq("resume_id", resumeId)
      .single();
      
    if (suggestionError) {
      return NextResponse.json({ 
        error: "Suggestion not found or does not belong to this resume" 
      }, { status: 404 });
    }
    
    // Update the suggestion's is_applied status
    const { data: updatedSuggestion, error: updateError } = await supabaseAdmin
      .from("resume_suggestions")
      .update({
        is_applied: applied,
        updated_at: new Date().toISOString()
      })
      .eq("id", suggestionId)
      .select()
      .single();
    
    if (updateError) {
      return NextResponse.json({ 
        error: `Failed to update suggestion: ${updateError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Suggestion ${applied ? "applied" : "unapplied"} successfully`,
      data: updatedSuggestion
    });
  } catch (error: any) {
    console.error("Unexpected error in POST suggestions handler:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

/**
 * Add a new suggestion
 * PUT /api/resumes/suggestions
 * 
 * Body:
 * {
 *   resumeId: string
 *   type: string
 *   text: string
 *   impact: string
 *   is_applied?: boolean
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { resumeId, type, text, impact, is_applied = false } = body;
    
    // Validate request body
    if (!resumeId || !type || !text || !impact) {
      return NextResponse.json({ 
        error: "Missing required fields: resumeId, type, text, and impact are required" 
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
        error: "You are not authorized to update this resume" 
      }, { status: 403 });
    }
    
    // Create a new suggestion
    const { data: newSuggestion, error: createError } = await supabaseAdmin
      .from("resume_suggestions")
      .insert({
        resume_id: resumeId,
        type,
        text,
        impact,
        is_applied,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      return NextResponse.json({ 
        error: `Failed to create suggestion: ${createError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Suggestion created successfully",
      data: newSuggestion
    });
  } catch (error: any) {
    console.error("Unexpected error in PUT suggestions handler:", error);
    return NextResponse.json({ 
      error: error.message || "An unexpected error occurred" 
    }, { status: 500 });
  }
}

/**
 * Delete a suggestion
 * DELETE /api/resumes/suggestions?suggestionId={suggestionId}
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get request URL and parse search params
    const url = new URL(req.url);
    const suggestionId = url.searchParams.get("suggestionId");
    
    // Validate request parameters
    if (!suggestionId) {
      return NextResponse.json({ 
        error: "Missing required parameter: suggestionId" 
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
    
    // Get suggestion with resume ID
    const { data: suggestion, error: suggestionError } = await supabaseAdmin
      .from("resume_suggestions")
      .select("id, resume_id")
      .eq("id", suggestionId)
      .single();
      
    if (suggestionError) {
      return NextResponse.json({ 
        error: "Suggestion not found" 
      }, { status: 404 });
    }
    
    // Verify resume ownership
    const resumeId = suggestion.resume_id;
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
        error: "You are not authorized to delete this suggestion" 
      }, { status: 403 });
    }
    
    // Delete the suggestion
    const { error: deleteError } = await supabaseAdmin
      .from("resume_suggestions")
      .delete()
      .eq("id", suggestionId);
    
    if (deleteError) {
      return NextResponse.json({ 
        error: `Failed to delete suggestion: ${deleteError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Suggestion deleted successfully"
    });
  } catch (error: any) {
    console.error("Unexpected error in DELETE suggestions handler:", error);
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