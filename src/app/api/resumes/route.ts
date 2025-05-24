/**
 * api/resumes/route.ts
 * Unified Resume API Route Handler with Header Structure Preservation
 *
 * Complete RESTful API for all resume operations:
 * - GET: Fetch resume by ID or latest resume for a user
 * - POST: Save/update resume content to last_saved_text and last_saved_score_ats
 * - PUT: Update resume properties
 * - DELETE: Delete a resume
 * - PATCH: Reset resume to original optimized version (clears last_saved_text and last_saved_score_ats)
 *
 * Enhanced Features:
 * - Header structure preservation after editing
 * - Subscription limit integration
 * - Proper HTML sanitization with structure preservation
 * - Smart header reconstruction from TipTap editor output
 *
 * This combined approach centralizes all resume-related operations
 * while maintaining clear separation of concerns and robust error handling.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { getAuth } from "@clerk/nextjs/server";
import crypto from "crypto";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";

// Initialize DOMPurify with JSDOM for server-side sanitization
let DOMPurify: any;
try {
  // Create a virtual DOM environment using JSDOM
  const window = new JSDOM("").window;
  // Initialize DOMPurify with the virtual window
  DOMPurify = createDOMPurify(window);

  // Add additional hooks for maintaining resume structure
  DOMPurify.addHook("afterSanitizeAttributes", function (node: any) {
    // Add security attributes for external links
    if ("target" in node) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  console.log("DOMPurify initialized successfully with JSDOM");
} catch (error) {
  console.error("Error initializing DOMPurify with JSDOM:", error);
  // Create a fallback sanitizer function
  DOMPurify = {
    sanitize: (html: string) => {
      // Simple fallback sanitization - not as robust as DOMPurify
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
        .replace(/\son\w+\s*=\s*["']?[^"']*["']?/gi, "") // Remove event handlers
        .replace(/javascript:/gi, ""); // Remove javascript: protocol
    },
  };
  console.warn("Using fallback sanitization method - LESS SECURE!");
}

/**
 * Header Information Interface
 * Defines the structure for extracted header data
 */
interface HeaderInfo {
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  linkedin?: string;
  portfolio?: string;
  address?: string;
}

/**
 * GET handler for resume data
 * Fetches a resume by ID or gets the latest resume for a user
 * Enhanced with subscription info integration
 */
export async function GET(req: NextRequest) {
  try {
    // Get request URL and parse search params
    const url = new URL(req.url);
    const resumeId = url.searchParams.get("id");
    const userId = url.searchParams.get("userId");
    const getLatest = url.searchParams.get("latest") === "true";

    // Validate request parameters
    if (!resumeId && !userId) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters. Please provide either 'id' or 'userId'",
        },
        { status: 400 }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = getAdminClient();

    // Fetch by resumeId if provided
    if (resumeId) {
      console.log("📄 Fetching resume by ID:", resumeId);

      const { data: resume, error } = await supabaseAdmin
        .from("resumes")
        .select(
          `
          *,
          resume_suggestions (*),
          resume_keywords (*)
        `
        )
        .eq("id", resumeId)
        .single();

      if (error) {
        console.error("❌ Error fetching resume by ID:", error);
        return NextResponse.json(
          {
            error: `Failed to fetch resume: ${error.message}`,
          },
          { status: 404 }
        );
      }

      // Return with convenience fields for current version of text and score
      return NextResponse.json({
        data: {
          ...resume,
          keywords: resume.resume_keywords,
          suggestions: resume.resume_suggestions,
          // Add convenience fields for the most current version
          current_text: resume.last_saved_text || resume.optimized_text,
          current_score:
            resume.last_saved_score_ats !== null
              ? resume.last_saved_score_ats
              : resume.ats_score,
          has_edits: !!resume.last_saved_text,
        },
      });
    }

    // Fetch latest resume for userId if provided
    if (userId) {
      console.log("👤 Fetching latest resume for user:", userId);

      // Try multiple approaches to find the user's resume based on different ID fields

      // First approach: Try with auth_user_id (likely from Clerk)
      const { data: authUserData, error: authUserError } = await supabaseAdmin
        .from("resumes")
        .select(
          `
          *,
          resume_suggestions (*),
          resume_keywords (*)
        `
        )
        .eq("auth_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      // If we found a resume using auth_user_id, return it
      if (!authUserError && authUserData && authUserData.length > 0) {
        console.log("✅ Found resume using auth_user_id:", authUserData[0].id);

        // Return with convenience fields for current version
        return NextResponse.json({
          data: {
            ...authUserData[0],
            keywords: authUserData[0].resume_keywords,
            suggestions: authUserData[0].resume_suggestions,
            // Add convenience fields for the most current version
            current_text:
              authUserData[0].last_saved_text || authUserData[0].optimized_text,
            current_score:
              authUserData[0].last_saved_score_ats !== null
                ? authUserData[0].last_saved_score_ats
                : authUserData[0].ats_score,
            has_edits: !!authUserData[0].last_saved_text,
          },
        });
      }

      // Second approach: Try with user_id (UUID field)
      console.log("🔍 No resume found with auth_user_id, trying user_id");
      const { data: userIdData, error: userIdError } = await supabaseAdmin
        .from("resumes")
        .select(
          `
          *,
          resume_suggestions (*),
          resume_keywords (*)
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      // If we found a resume using user_id, return it
      if (!userIdError && userIdData && userIdData.length > 0) {
        console.log("✅ Found resume using user_id:", userIdData[0].id);

        // Return with convenience fields for current version
        return NextResponse.json({
          data: {
            ...userIdData[0],
            keywords: userIdData[0].resume_keywords,
            suggestions: userIdData[0].resume_suggestions,
            // Add convenience fields for the most current version
            current_text:
              userIdData[0].last_saved_text || userIdData[0].optimized_text,
            current_score:
              userIdData[0].last_saved_score_ats !== null
                ? userIdData[0].last_saved_score_ats
                : userIdData[0].ats_score,
            has_edits: !!userIdData[0].last_saved_text,
          },
        });
      }

      // Try getting or creating a Supabase UUID for this user
      try {
        const supabaseUserId = await getOrCreateSupabaseUuid(
          supabaseAdmin,
          userId
        );

        // Third approach: Try with supabase_user_id
        console.log(
          "🔍 No resume found with user_id, trying supabase_user_id:",
          supabaseUserId
        );
        const { data: supabaseUserData, error: supabaseUserError } =
          await supabaseAdmin
            .from("resumes")
            .select(
              `
            *,
            resume_suggestions (*),
            resume_keywords (*)
          `
            )
            .eq("supabase_user_id", supabaseUserId)
            .order("created_at", { ascending: false })
            .limit(1);

        // If we found a resume using supabase_user_id, return it
        if (
          !supabaseUserError &&
          supabaseUserData &&
          supabaseUserData.length > 0
        ) {
          console.log(
            "✅ Found resume using supabase_user_id:",
            supabaseUserData[0].id
          );

          // Return with convenience fields for current version
          return NextResponse.json({
            data: {
              ...supabaseUserData[0],
              keywords: supabaseUserData[0].resume_keywords,
              suggestions: supabaseUserData[0].resume_suggestions,
              // Add convenience fields for the most current version
              current_text:
                supabaseUserData[0].last_saved_text ||
                supabaseUserData[0].optimized_text,
              current_score:
                supabaseUserData[0].last_saved_score_ats !== null
                  ? supabaseUserData[0].last_saved_score_ats
                  : supabaseUserData[0].ats_score,
              has_edits: !!supabaseUserData[0].last_saved_text,
            },
          });
        }
      } catch (mappingError) {
        console.error("❌ Error mapping user ID:", mappingError);
        // Continue execution, as we might still find resumes with other methods
      }

      // IMPORTANT: If all approaches failed but no errors occurred, return null data with 200 status
      // This is critical to prevent infinite loading loops for users with no resumes
      console.log("❌ No resumes found for this user through any ID field");
      return NextResponse.json(
        {
          data: null,
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("❌ Unexpected error in GET handler:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for saving resume content and score
 * Enhanced with header structure preservation and subscription checking
 * Updates the last_saved_text field of a resume and last_saved_score_ats fields
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { resumeId, content, userId, atsScore } = body;

    // Validate request body
    if (!resumeId || !content) {
      return NextResponse.json(
        {
          error: "Missing required fields: resumeId and content are required",
        },
        { status: 400 }
      );
    }

    // Optional authentication check
    if (!userId) {
      console.warn("⚠️ No userId provided for resume save operation");
    }

    // Authenticate using Clerk if needed
    let authenticatedUserId = userId;
    if (!authenticatedUserId) {
      // Use getAuth for server routes
      const auth = getAuth(req);
      authenticatedUserId = auth.userId;
    }

    // Proceed only if user is authenticated or userId was provided
    if (!authenticatedUserId) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    console.log(`💾 Saving resume ${resumeId} for user ${authenticatedUserId}`);

    // Get Supabase admin client
    const supabaseAdmin = getAdminClient();

    // Check subscription limits before saving (optional - depends on your business logic)
    // You might want to allow saves without consuming optimization quota
    // Uncomment below if you want to check limits for saves too
    /*
    const { data: accessCheck } = await supabaseAdmin.rpc('check_feature_access', {
      p_clerk_id: authenticatedUserId,
      p_feature: 'cv_saves_per_month',
      p_increment: 1
    });
    
    if (accessCheck && !accessCheck.allowed) {
      return NextResponse.json({ 
        error: 'Save limit exceeded',
        subscription_info: accessCheck
      }, { status: 402 });
    }
    */

    // First verify that the resume belongs to the user
    const { data: existingResume, error: fetchError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, supabase_user_id")
      .eq("id", resumeId)
      .single();

    if (fetchError) {
      console.error("❌ Error fetching resume:", fetchError);
      return NextResponse.json(
        {
          error: "Resume not found",
        },
        { status: 404 }
      );
    }

    // Get Supabase UUID for the authenticated user
    const supabaseUserId = await getOrCreateSupabaseUuid(
      supabaseAdmin,
      authenticatedUserId
    );

    // Check if the resume belongs to the authenticated user
    const isAuthorized =
      existingResume.user_id === authenticatedUserId ||
      existingResume.auth_user_id === authenticatedUserId ||
      existingResume.user_id === supabaseUserId ||
      existingResume.supabase_user_id === supabaseUserId;

    if (!isAuthorized) {
      console.error(
        `❌ User ${authenticatedUserId} not authorized to update resume ${resumeId}`
      );
      return NextResponse.json(
        {
          error: "You are not authorized to update this resume",
        },
        { status: 403 }
      );
    }

    // ================================================================
    // HEADER STRUCTURE PRESERVATION - Key Enhancement
    // ================================================================
    console.log("🔧 Processing content with header structure preservation...");

    // Sanitize and fix header structure
    const processedContent = await sanitizeAndFixHeaderStructure(content);

    // Validate processed content
    if (!processedContent || processedContent.length < 50) {
      return NextResponse.json(
        {
          error: "Content is too short or empty after processing",
        },
        { status: 400 }
      );
    }

    // Validate ATS score if provided
    let validatedAtsScore = null;
    if (atsScore !== undefined) {
      // Convert to number if it's a string
      const scoreValue =
        typeof atsScore === "string" ? parseInt(atsScore, 10) : atsScore;

      // Check if it's a valid number in range 0-100
      if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
        validatedAtsScore = scoreValue;
        console.log(
          `💯 Saving resume ${resumeId} with ATS score: ${validatedAtsScore}`
        );
      } else {
        console.warn(
          `⚠️ Invalid ATS score provided: ${atsScore}. Will not save score.`
        );
      }
    }

    console.log(
      `💾 Saving resume ${resumeId} with content length: ${processedContent.length}`
    );

    // Prepare update object with text and potentially score
    const updateObject: any = {
      last_saved_text: processedContent,
      updated_at: new Date().toISOString(),
    };

    // Add ATS score to update if valid
    if (validatedAtsScore !== null) {
      updateObject.last_saved_score_ats = validatedAtsScore;
    }

    // Update the resume with processed content and score
    const { data: updatedResume, error: updateError } = await supabaseAdmin
      .from("resumes")
      .update(updateObject)
      .eq("id", resumeId)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating resume:", updateError);
      return NextResponse.json(
        {
          error: `Failed to update resume: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    console.log("✅ Resume saved successfully with preserved header structure");

    // Return success response with updated data
    return NextResponse.json({
      success: true,
      message: "Resume updated successfully with preserved structure",
      data: updatedResume,
    });
  } catch (error: any) {
    console.error("❌ Unexpected error in POST handler:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating resume properties
 * Updates various fields of a resume record
 * Enhanced to support last_saved_score_ats and other fields
 */
export async function PUT(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { resumeId, updates, userId } = body;

    // Validate request
    if (!resumeId || !updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          error: "Missing required fields: resumeId and updates are required",
        },
        { status: 400 }
      );
    }

    // Authenticate user
    let authenticatedUserId = userId;
    if (!authenticatedUserId) {
      // Use getAuth for server routes
      const auth = getAuth(req);
      authenticatedUserId = auth.userId;
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    console.log(
      `🔧 Updating resume ${resumeId} properties for user ${authenticatedUserId}`
    );

    // Get Supabase admin client
    const supabaseAdmin = getAdminClient();

    // Get Supabase UUID for the user
    const supabaseUserId = await getOrCreateSupabaseUuid(
      supabaseAdmin,
      authenticatedUserId
    );

    // Verify resume ownership
    const { data: existingResume, error: fetchError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, supabase_user_id")
      .eq("id", resumeId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        {
          error: "Resume not found",
        },
        { status: 404 }
      );
    }

    // Check authorization
    const isAuthorized =
      existingResume.user_id === authenticatedUserId ||
      existingResume.auth_user_id === authenticatedUserId ||
      existingResume.user_id === supabaseUserId ||
      existingResume.supabase_user_id === supabaseUserId;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: "You are not authorized to update this resume",
        },
        { status: 403 }
      );
    }

    // Sanitize updates to prevent unwanted field modifications
    const sanitizedUpdates = sanitizeUpdates(updates);

    // Add updated_at timestamp
    sanitizedUpdates.updated_at = new Date().toISOString();

    // Update resume
    const { data: updatedResume, error: updateError } = await supabaseAdmin
      .from("resumes")
      .update(sanitizedUpdates)
      .eq("id", resumeId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: `Failed to update resume: ${updateError.message}`,
        },
        { status: 500 }
      );
    }

    console.log("✅ Resume properties updated successfully");

    return NextResponse.json({
      success: true,
      message: "Resume updated successfully",
      data: updatedResume,
    });
  } catch (error: any) {
    console.error("❌ Unexpected error in PUT handler:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing a resume
 * Enhanced with proper authorization checks
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get request URL and parse search params
    const url = new URL(req.url);
    const resumeId = url.searchParams.get("id");

    // Validate request
    if (!resumeId) {
      return NextResponse.json(
        {
          error: "Missing required parameter: id",
        },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting resume ${resumeId}`);

    // Authenticate user
    const auth = getAuth(req);
    const userId = auth.userId;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Get Supabase admin client
    const supabaseAdmin = getAdminClient();

    // Get Supabase UUID for the user
    const supabaseUserId = await getOrCreateSupabaseUuid(supabaseAdmin, userId);

    // Verify resume ownership
    const { data: existingResume, error: fetchError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, supabase_user_id")
      .eq("id", resumeId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        {
          error: "Resume not found",
        },
        { status: 404 }
      );
    }

    // Check authorization
    const isAuthorized =
      existingResume.user_id === userId ||
      existingResume.auth_user_id === userId ||
      existingResume.user_id === supabaseUserId ||
      existingResume.supabase_user_id === supabaseUserId;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: "You are not authorized to delete this resume",
        },
        { status: 403 }
      );
    }

    // Delete related records first (maintain referential integrity)
    // Delete keywords
    await supabaseAdmin
      .from("resume_keywords")
      .delete()
      .eq("resume_id", resumeId);

    // Delete suggestions
    await supabaseAdmin
      .from("resume_suggestions")
      .delete()
      .eq("resume_id", resumeId);

    // Delete resume
    const { error: deleteError } = await supabaseAdmin
      .from("resumes")
      .delete()
      .eq("id", resumeId);

    if (deleteError) {
      return NextResponse.json(
        {
          error: `Failed to delete resume: ${deleteError.message}`,
        },
        { status: 500 }
      );
    }

    console.log("✅ Resume deleted successfully");

    return NextResponse.json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error: any) {
    console.error("❌ Unexpected error in DELETE handler:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for resetting resume to original version
 * Enhanced with RPC function integration and proper error handling
 * Clears the last_saved_text and last_saved_score_ats fields to restore the original optimized version
 */
export async function PATCH(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { resumeId, userId, action } = body;

    // Validate parameters
    if (!resumeId || action !== "reset") {
      return NextResponse.json(
        {
          error:
            "Missing parameters or invalid action. Expected 'reset' action",
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Resetting resume ${resumeId} to original version`);

    // Authenticate user
    let authenticatedUserId = userId;
    if (!authenticatedUserId) {
      const auth = getAuth(req);
      authenticatedUserId = auth.userId;
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        {
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Get Supabase admin client
    const supabaseAdmin = getAdminClient();

    // Verify resume ownership
    const { data: existingResume, error: fetchError } = await supabaseAdmin
      .from("resumes")
      .select("id, user_id, auth_user_id, optimized_text, supabase_user_id")
      .eq("id", resumeId)
      .single();

    if (fetchError) {
      return NextResponse.json(
        {
          error: "Resume not found",
        },
        { status: 404 }
      );
    }

    // Check authorization
    const isAuthorized =
      existingResume.user_id === authenticatedUserId ||
      existingResume.auth_user_id === authenticatedUserId ||
      existingResume.supabase_user_id === authenticatedUserId;

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: "You are not authorized to reset this resume",
        },
        { status: 403 }
      );
    }

    // Check that the resume has optimized text to reset to
    if (!existingResume.optimized_text) {
      return NextResponse.json(
        {
          error: "This resume has no optimized version to reset to",
        },
        { status: 400 }
      );
    }

    // Call the RPC function to reset the resume
    const { data, error } = await supabaseAdmin.rpc("reset_resume", {
      p_resume_id: resumeId,
    });

    if (error) {
      console.error("❌ Error calling reset_resume RPC:", error);
      return NextResponse.json(
        {
          error: `Failed to reset resume: ${error.message}`,
        },
        { status: 500 }
      );
    }

    if (data !== true) {
      return NextResponse.json(
        {
          error: "Resume reset operation failed",
        },
        { status: 500 }
      );
    }

    console.log("✅ Resume reset successfully to original optimized version");

    return NextResponse.json({
      success: true,
      message: "Resume reset successfully to original optimized version",
    });
  } catch (error: any) {
    console.error("❌ Unexpected error in PATCH handler:", error);
    return NextResponse.json(
      {
        error: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Gets or creates a Supabase UUID for a Clerk user ID
 * This resolves the issue with Clerk IDs not being valid UUIDs
 *
 * @param supabaseAdmin - Supabase admin client
 * @param clerkUserId - Clerk user ID (starting with "user_")
 * @returns A valid Supabase UUID for the user
 */
async function getOrCreateSupabaseUuid(
  supabaseAdmin: any,
  clerkUserId: string
): Promise<string> {
  try {
    // First check if this user already has a mapping
    const { data: existingMapping, error: mappingError } = await supabaseAdmin
      .from("user_mapping")
      .select("supabase_uuid")
      .eq("clerk_id", clerkUserId)
      .single();

    if (mappingError) {
      console.log("🔍 No existing mapping found, creating new one");

      // Generate a new UUID for this user
      const newUuid = crypto.randomUUID();

      // Insert the mapping
      const { error: insertError } = await supabaseAdmin
        .from("user_mapping")
        .insert({
          clerk_id: clerkUserId,
          supabase_uuid: newUuid,
        });

      if (insertError) {
        console.error("❌ Error creating user mapping:", insertError);
        throw new Error(
          `Failed to create user mapping: ${insertError.message}`
        );
      }

      return newUuid;
    }

    // Return the existing UUID from the mapping
    return existingMapping.supabase_uuid;
  } catch (error) {
    console.error("❌ Error in getOrCreateSupabaseUuid:", error);
    // Return the original ID as fallback (might not be a valid UUID)
    return clerkUserId;
  }
}

/**
 * CRITICAL FUNCTION: Sanitize and fix header structure
 * This is the key function that preserves header structure after TipTap editing
 *
 * @param html - Raw HTML content from TipTap editor
 * @returns Processed HTML with preserved header structure
 */
async function sanitizeAndFixHeaderStructure(html: string): Promise<string> {
  try {
    console.log("🔧 Starting header structure preservation process...");

    // First, sanitize the HTML for security
    const sanitizedHtml = sanitizeHtml(html);

    // Then, fix the header structure specifically
    const fixedHtml = reconstructHeaderStructure(sanitizedHtml);

    console.log("✅ Header structure preservation completed");
    return fixedHtml;
  } catch (error) {
    console.error("❌ Error in header structure preservation:", error);
    // Fallback to basic sanitization if header fixing fails
    return sanitizeHtml(html);
  }
}

/**
 * Reconstruct proper header structure from TipTap editor output
 * This function fixes the missing classes and spans that TipTap removes
 *
 * @param html - Sanitized HTML content
 * @returns HTML with reconstructed header structure
 */
function reconstructHeaderStructure(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Find the header section
    const headerSection =
      doc.querySelector("section#resume-header") ||
      doc.querySelector("#resume-header");

    if (!headerSection) {
      console.log("ℹ️ No header section found, returning original HTML");
      return html;
    }

    console.log("🔧 Reconstructing header structure...");

    // Extract header information from the degraded structure
    const headerInfo = extractHeaderInfoFromDegradedStructure(headerSection);

    // Reconstruct the proper header structure
    const reconstructedHeader = generateProperHeaderStructure(headerInfo);

    // Replace the old header with the reconstructed one
    headerSection.outerHTML = reconstructedHeader;

    console.log("✅ Header structure reconstructed successfully");
    return doc.documentElement.outerHTML;
  } catch (error) {
    console.error("❌ Error reconstructing header structure:", error);
    return html;
  }
}

/**
 * Extract header information from degraded TipTap structure
 * Handles the case where TipTap has removed classes and spans
 *
 * @param headerElement - The header section DOM element
 * @returns Structured header information
 */
function extractHeaderInfoFromDegradedStructure(
  headerElement: Element
): HeaderInfo {
  const headerInfo: HeaderInfo = {
    name: "",
    title: "",
    phone: "",
    email: "",
    linkedin: "",
    portfolio: "",
    address: "",
  };

  try {
    // Extract name from h1 (should be the first element)
    const nameElement = headerElement.querySelector("h1");
    if (nameElement) {
      headerInfo.name = nameElement.textContent?.trim() || "";
    }

    // Get all paragraphs
    const paragraphs = headerElement.querySelectorAll("p");

    if (paragraphs.length > 0) {
      // First paragraph might be the title (if it's not contact info)
      const firstParagraph = paragraphs[0];
      const firstPText = firstParagraph.textContent?.trim() || "";

      // Check if first paragraph is a title (not contact info)
      if (firstPText && !isContactInfo(firstPText)) {
        headerInfo.title = firstPText;
      }

      // Process remaining paragraphs for contact info
      paragraphs.forEach((p, index) => {
        const text = p.textContent?.trim() || "";

        // Skip if this is the title paragraph
        if (index === 0 && !isContactInfo(text)) {
          return;
        }

        // Check if this paragraph contains contact information
        if (isContactInfo(text)) {
          extractContactInfoFromText(text, headerInfo);
        } else if (text && !headerInfo.title && index === 0) {
          // If we haven't found a title yet and this is readable text
          headerInfo.title = text;
        } else if (text && isAddressInfo(text)) {
          // This might be an address
          headerInfo.address = text;
        }
      });
    }

    console.log("📋 Extracted header info:", headerInfo);
    return headerInfo;
  } catch (error) {
    console.error(
      "❌ Error extracting header info from degraded structure:",
      error
    );
    return headerInfo;
  }
}

/**
 * Check if text contains contact information patterns
 *
 * @param text - Text to analyze
 * @returns Boolean indicating if text contains contact info
 */
function isContactInfo(text: string): boolean {
  if (!text) return false;

  // Check for email pattern
  if (text.includes("@")) return true;

  // Check for phone pattern
  if (text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/)) return true;

  // Check for LinkedIn
  if (text.toLowerCase().includes("linkedin")) return true;

  // Check for portfolio/website
  if (
    text.toLowerCase().includes("portfolio") ||
    text.includes(".com") ||
    text.includes(".ca")
  )
    return true;

  // Check for separators indicating contact info
  if (text.includes("|") && text.length < 100) return true;

  return false;
}

/**
 * Check if text contains address information
 *
 * @param text - Text to analyze
 * @returns Boolean indicating if text contains address info
 */
function isAddressInfo(text: string): boolean {
  if (!text) return false;

  // Canadian postal code pattern
  if (text.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i)) return true;

  // Common address indicators
  if (text.includes("app.") || text.includes("apt.")) return true;

  // Quebec/Montreal indicators
  if (text.match(/québec|quebec|montréal|montreal/i)) return true;

  // Street address pattern
  if (text.match(/\d+\s+\w+\s+(ave|avenue|rue|street|blvd)/i)) return true;

  return false;
}

/**
 * Extract specific contact information from text
 * Updates the headerInfo object with found contact details
 *
 * @param text - Text containing contact information
 * @param headerInfo - Header info object to update
 */
function extractContactInfoFromText(
  text: string,
  headerInfo: HeaderInfo
): void {
  // Extract email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    headerInfo.email = emailMatch[0];
  }

  // Extract phone (various patterns)
  const phoneMatch = text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/);
  if (phoneMatch) {
    headerInfo.phone = phoneMatch[0];
  }

  // Extract LinkedIn
  if (text.toLowerCase().includes("linkedin")) {
    // Try to extract just the LinkedIn part
    const linkedinMatch = text.match(/linkedin[^\s|]*/i);
    if (linkedinMatch) {
      headerInfo.linkedin = linkedinMatch[0];
    }
  }

  // Extract portfolio/website
  const portfolioPatterns = [
    /portfolio[^\s|]*/i,
    /[^\s|]*\.com[^\s|]*/,
    /[^\s|]*\.ca[^\s|]*/,
    /[^\s|]*\.dev[^\s|]*/,
  ];

  for (const pattern of portfolioPatterns) {
    const match = text.match(pattern);
    if (match && !match[0].includes("@")) {
      // Not an email
      headerInfo.portfolio = match[0];
      break;
    }
  }

  // Handle the case where portfolio is marked as "inactif"
  if (text.toLowerCase().includes("inactif")) {
    headerInfo.portfolio = "inactif";
  }
}

/**
 * Generate proper header structure with all required classes and spans
 * This recreates the original optimized structure
 *
 * @param headerInfo - Extracted header information
 * @returns Properly structured HTML
 */
function generateProperHeaderStructure(headerInfo: HeaderInfo): string {
  let headerHtml = '<section id="resume-header">\n';

  // Add name with proper classes
  if (headerInfo.name) {
    headerHtml += `  <h1 class="section-title name">${headerInfo.name}</h1>\n`;
  }

  // Add title if present
  if (headerInfo.title) {
    headerHtml += `  <p class="title">${headerInfo.title}</p>\n`;
  }

  // Build contact line with proper spans and separators
  const contactElements: string[] = [];

  if (headerInfo.phone) {
    contactElements.push(`<span class="phone">${headerInfo.phone}</span>`);
  }

  if (headerInfo.email) {
    contactElements.push(`<span class="email">${headerInfo.email}</span>`);
  }

  if (headerInfo.linkedin) {
    contactElements.push(
      `<span class="linkedin">${headerInfo.linkedin}</span>`
    );
  }

  if (headerInfo.portfolio) {
    contactElements.push(
      `<span class="portfolio">${headerInfo.portfolio}</span>`
    );
  }

  // Add contact line only if we have contact elements
  if (contactElements.length > 0) {
    headerHtml += "  <p>\n";
    headerHtml += "    " + contactElements.join(" | \n    ") + "\n";
    headerHtml += "  </p>\n";
  }

  // Add address in separate paragraph if present
  if (headerInfo.address) {
    const formattedAddress = headerInfo.address.replace(/\n/g, "<br>");
    headerHtml += `  <p><span class="address">${formattedAddress}</span></p>\n`;
  }

  headerHtml += "</section>";

  console.log("🏗️ Generated proper header structure");
  return headerHtml;
}

/**
 * Sanitizes HTML content to prevent XSS attacks using DOMPurify with JSDOM
 * Enhanced version for server-side use with resume structure preservation
 *
 * @param html - Raw HTML content from the client
 * @returns Sanitized HTML content
 */
function sanitizeHtml(html: string): string {
  try {
    console.log("🧹 Sanitizing HTML content...");

    // Safety check for null/undefined input
    if (!html) {
      console.warn("⚠️ Empty HTML content provided for sanitization");
      return "";
    }

    // Check if DOMPurify is properly initialized
    if (!DOMPurify || typeof DOMPurify.sanitize !== "function") {
      console.error("❌ DOMPurify not initialized properly");

      // Fallback basic sanitization
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
        .replace(/\son\w+\s*=\s*["']?[^"']*["']?/gi, "") // Remove event handlers
        .replace(/javascript:/gi, ""); // Remove javascript: protocol
    }

    // Use DOMPurify for comprehensive sanitization
    const sanitizedHtml = DOMPurify.sanitize(html, {
      // Allow most standard HTML tags
      ALLOWED_TAGS: [
        "b",
        "br",
        "caption",
        "div",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "i",
        "li",
        "ol",
        "p",
        "section",
        "span",
        "strong",
        "ul",
      ],
      // Allow common attributes
      ALLOWED_ATTR: [
        "href",
        "target",
        "rel",
        "id",
        "class",
        "style",
        "data-section",
        "data-section-id",
        "title",
        "alt",
      ],
      // DOMPurify options for better security and structure preservation
      ADD_ATTR: ["target", "id", "class"], // Preserve important attributes
      ADD_URI_SAFE_ATTR: ["style"], // Allow style attributes with safe values
      ALLOW_ARIA_ATTR: true, // Allow ARIA attributes
      USE_PROFILES: { html: true }, // Use HTML profile
      WHOLE_DOCUMENT: false, // Don't sanitize the entire document
      SANITIZE_DOM: true, // Keep enabled for security
      KEEP_CONTENT: true, // Keep content of elements when removing elements
      RETURN_DOM: false, // Return HTML as string
      ALLOW_DATA_ATTR: true, // Allow data attributes for resume sections
      ALLOW_UNKNOWN_PROTOCOLS: false, // Don't allow unknown protocols
      ADD_TAGS: ["section"], // Ensure section is allowed
    });

    console.log("✅ HTML sanitization completed");
    return sanitizedHtml;
  } catch (error) {
    console.error("❌ Error sanitizing HTML:", error);
    // Fallback to simple HTML entity encoding if sanitization fails
    return html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

/**
 * Sanitizes object of updates to prevent unwanted field modifications
 * Updated to allow last_saved_score_ats field in updates
 *
 * @param updates - Object containing fields to update
 * @returns Sanitized updates object
 */
function sanitizeUpdates(updates: any): any {
  // Define allowed fields for update
  const allowedFields = [
    "optimized_text",
    "last_saved_text",
    "ats_score",
    "last_saved_score_ats",
    "language",
    "file_name",
    "file_type",
    "file_url",
    "file_size",
    "ai_provider",
    "selected_template",
  ];

  // Filter out unwanted fields
  const sanitized: any = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      // Special handling for text fields
      if (
        (field === "optimized_text" || field === "last_saved_text") &&
        typeof updates[field] === "string"
      ) {
        sanitized[field] = sanitizeHtml(updates[field]);
      }
      // Special handling for score fields
      else if (
        (field === "ats_score" || field === "last_saved_score_ats") &&
        updates[field] !== null
      ) {
        // Validate score is in range 0-100
        const scoreValue =
          typeof updates[field] === "string"
            ? parseInt(updates[field], 10)
            : updates[field];

        if (!isNaN(scoreValue) && scoreValue >= 0 && scoreValue <= 100) {
          sanitized[field] = scoreValue;
        } else {
          console.warn(
            `⚠️ Invalid score value for ${field}: ${updates[field]}. Skipping.`
          );
        }
      } else {
        sanitized[field] = updates[field];
      }
    }
  }

  return sanitized;
}
