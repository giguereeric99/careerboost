/**
 * Main API Route for Resume Optimization
 *
 * This unified route handles all resume optimization operations:
 * - Initial optimization with AI services (OpenAI, Gemini, Claude)
 * - Extraction of text from various file formats
 * - Language detection
 * - Resume structure validation (new feature)
 * - Support for resetting last_saved_text on new uploads
 *
 * The route implements a cascading strategy for AI services:
 * 1. Tries OpenAI first (usually best quality)
 * 2. Falls back to Gemini if OpenAI fails
 * 3. Falls back to Claude as a last resort
 * 4. Uses a fallback generator if all services fail
 *
 * Improvements:
 * - Added resume structure validation before optimization
 * - Unified API endpoint for all optimization operations
 * - Modular service architecture for better maintainability
 * - Improved error handling with consistent response format
 * - Better file handling with proper cleanup
 * - Added support for resetting last_saved_text on new uploads
 * - Fixed timeout handling to prevent unhandled rejections
 * - Added handling for RETRY_UPLOAD errors from OpenAI parsing
 * - Ensures all suggestions and keywords have valid IDs when returned
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { extractTextFromFile } from "./services/extraction";
import { detectLanguage } from "./services/language";
import { optimizeResume } from "./services/optimization";
import { generateFallbackOptimization } from "./services/optimization/fallback";
import { getSupabaseUuid } from "./services/userMapping";
import { cleanupTempFile } from "./services/fileHandler";
import {
  OptimizationResult,
  OptimizationOptions,
  ResumeData,
  KeywordWithId,
} from "./types";

// Import resume validation service
import {
  validateResume,
  getResumeImprovementSuggestions,
} from "@/services/resumeValidation";

// API timeout duration in milliseconds (60 seconds)
const API_TIMEOUT = 60000;

// Minimum score required to consider a document as a valid resume
const MIN_RESUME_VALIDATION_SCORE = 60;

/**
 * Validates resume content before optimization
 * Checks if the document is a valid resume and returns suggestions if needed
 *
 * @param content - Text content extracted from the uploaded file
 * @returns Validation result with suggestions
 */
async function validateResumeContent(content: string) {
  // Perform resume validation
  const validationResult = validateResume(content);

  // Generate improvement suggestions if necessary
  const improvementSuggestions =
    getResumeImprovementSuggestions(validationResult);

  return {
    isValid: validationResult.isValid,
    score: validationResult.score,
    sections: validationResult.sections,
    missingElements: validationResult.missingElements,
    needsImprovement: improvementSuggestions.needsImprovement,
    suggestions: improvementSuggestions.suggestions,
  };
}

/**
 * POST handler for resume optimization
 */
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  // Create an AbortController to handle timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Extract data from request
    const formData = await req.formData();
    const fileUrl = formData.get("fileUrl") as string | null;
    const rawText = formData.get("rawText") as string | null;
    const userId = formData.get("userId") as string | null;
    const fileName = formData.get("fileName") as string | null;
    const fileType = formData.get("fileType") as string | null;

    // Check if we should reset last_saved_text
    const resetLastSavedText = formData.get("resetLastSavedText") === "true";

    // Validate input
    if (!userId) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!fileUrl && !rawText) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error:
            "Missing required fields: either fileUrl or rawText is required for optimization",
        },
        { status: 400 }
      );
    }

    // Handle optimization flow
    console.log(`New optimization for user ${userId}`);

    // Get text content from file or rawText
    let resumeText = "";
    let fileSize: number | null = null;

    if (fileUrl) {
      // Extract text from uploaded file - FIXED: Now passing fileType to properly handle DOCX files
      const extractionResult = await extractTextFromFile(
        fileUrl,
        fileType || undefined
      );

      if (extractionResult.error) {
        clearTimeout(timeoutId);
        console.error("Extraction error details:", extractionResult.error);

        // Create user-friendly error message based on file type
        let userMessage = extractionResult.error.message;

        if (
          fileType?.includes("openxmlformats") ||
          fileType?.includes("docx")
        ) {
          userMessage =
            "We encountered an issue processing this DOCX file. Please try uploading as PDF or copy-paste the content directly.";
        } else if (fileType?.includes("pdf")) {
          userMessage =
            "This PDF couldn't be processed correctly. Please ensure it contains selectable text or try copy-pasting the content.";
        }

        return NextResponse.json(
          {
            error: userMessage,
          },
          { status: 422 }
        ); // Using 422 Unprocessable Entity instead of 500 for better semantics
      }

      resumeText = extractionResult.text;
      tempFilePath = extractionResult.tempFilePath;
      fileSize = extractionResult.fileSize;

      console.log(`Extracted ${resumeText.length} characters from file`);
    } else if (rawText) {
      // Use provided raw text
      resumeText = rawText;
      console.log(`Using provided raw text (${resumeText.length} characters)`);
    }

    // Validate text length
    if (resumeText.length < 50) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          error:
            "Text is too short to process (minimum 50 characters required)",
        },
        { status: 400 }
      );
    }

    // Resume structure validation step - strict enforcement, no bypass
    console.log("Validating resume structure...");
    const validationResult = await validateResumeContent(resumeText);

    if (!validationResult.isValid) {
      console.log(
        "Resume validation failed:",
        validationResult.missingElements
      );

      clearTimeout(timeoutId);
      // Clean up temporary file
      if (tempFilePath) {
        cleanupTempFile(tempFilePath);
      }

      return NextResponse.json(
        {
          error: "The document doesn't appear to be a valid resume",
          validation: validationResult,
          // Include the extracted text so the UI can display the content
          content: resumeText,
          fileSize: fileSize,
        },
        { status: 422 }
      ); // 422 Unprocessable Entity for validation failures
    }

    // If valid but needs improvement, just log it and continue
    if (validationResult.needsImprovement) {
      console.log(
        "Resume is valid but could be improved:",
        validationResult.suggestions
      );
    }

    // Detect language
    const language = await detectLanguage(resumeText);
    console.log(`Detected language: ${language}`);

    // Optimize resume with cascade of AI services
    let optimizationResult: OptimizationResult & {
      keywords?: KeywordWithId[];
    } = {
      optimizedText: "",
      suggestions: [],
      keywordSuggestions: [],
      atsScore: 0,
      provider: "",
    };

    try {
      // Create options object with only properties that exist in OptimizationOptions
      // Using type assertion to avoid TypeScript errors related to signal
      const options = {
        // Add any properties that are actually in your OptimizationOptions interface
        // For example:
        // language: language,
        // customInstructions: []
      } as OptimizationOptions;

      // Call optimizeResume without passing the abort signal
      // Since it's not supported in your OptimizationOptions interface
      optimizationResult = await optimizeResume(resumeText, language, options);
      console.log(
        `Optimization successful using ${optimizationResult.provider}`
      );
    } catch (error: any) {
      // Check if this is a RETRY_UPLOAD error from OpenAI parsing
      if (error.message === "RETRY_UPLOAD") {
        console.error(
          "OpenAI response parsing failed, requesting file re-upload"
        );
        clearTimeout(timeoutId);

        // Clean up temporary file
        if (tempFilePath) {
          cleanupTempFile(tempFilePath);
        }

        return NextResponse.json(
          {
            success: false,
            error: "RETRY_UPLOAD",
            message:
              "An error occurred while analyzing your resume. Please try uploading the file again.",
          },
          { status: 422 }
        ); // 422 Unprocessable Entity
      }

      // Check if this is an abort error from our timeout
      if (error.name === "AbortError") {
        console.error(
          "Optimization request timed out after",
          API_TIMEOUT,
          "ms"
        );
        clearTimeout(timeoutId);

        // Clean up temporary file
        if (tempFilePath) {
          cleanupTempFile(tempFilePath);
        }

        return NextResponse.json(
          {
            error:
              "Optimization request timed out. Please try again with a smaller file or less text.",
          },
          { status: 504 }
        );
      }

      console.error("All optimization attempts failed, using fallback:", error);

      // Generate a fallback optimization if all services fail
      optimizationResult = generateFallbackOptimization(resumeText, language);
      console.log("Generated fallback optimization");
    }

    // Initialize keywords property if needed
    // This ensures type safety for later operations
    if (!optimizationResult.keywords) {
      optimizationResult.keywords = [];
    }

    // Save results to database if user ID is provided
    // Replace the entire database save block with this simplified version
    let resumeData: ResumeData | null = null;
    if (userId) {
      try {
        console.log(`Saving complete resume data for user ${userId}`);

        // Get Supabase admin client - IMPORTANT: This was missing!
        const supabaseAdmin = getAdminClient();

        // Prepare suggestions in JSONB format for the database function
        // Convert frontend suggestion format to database-compatible format
        const suggestionsForDb =
          optimizationResult.suggestions?.map((s) => ({
            type: s.type || "general",
            text: s.text,
            impact: s.impact || "medium",
          })) || [];

        // Single RPC call to save everything atomically
        // This replaces the previous 3 separate database operations:
        // 1. INSERT into resumes
        // 2. INSERT into resume_keywords
        // 3. INSERT into resume_suggestions
        const { data: result, error: rpcError } = await supabaseAdmin.rpc(
          "create_resume_complete",
          {
            // User identification
            p_clerk_id: userId,

            // Resume content
            p_original_text: resumeText,
            p_optimized_text: optimizationResult.optimizedText,
            p_language: language,
            p_ats_score: optimizationResult.atsScore || 65,

            // File information
            p_file_url: fileUrl || null,
            p_file_name: fileName || null,
            p_file_type: fileType || null,
            p_file_size: fileSize || null,

            // AI provider info
            p_ai_provider: optimizationResult.provider,

            // Keywords and suggestions arrays
            p_keywords: optimizationResult.keywordSuggestions || [],
            p_suggestions: suggestionsForDb,

            // Reset flag for new uploads
            p_reset_last_saved_text: resetLastSavedText,
          }
        );

        // Check for Supabase RPC errors first
        if (rpcError) {
          console.error("RPC Error:", rpcError);
          throw new Error(`Database error: ${rpcError.message}`);
        }

        // Check if the function returned an application error
        if (result?.error) {
          console.error("Function returned error:", result.error);
          throw new Error(result.error);
        }

        // Process successful result
        if (result?.success) {
          console.log("Resume saved successfully with ID:", result.resume.id);

          // Update optimization result with database-generated data
          // This ensures all suggestions and keywords have valid IDs from the database
          optimizationResult.resumeId = result.resume.id;
          optimizationResult.keywords = result.keywords || [];
          optimizationResult.suggestions = result.suggestions || [];

          // Store resume data for response
          resumeData = result.resume as ResumeData;
        } else {
          throw new Error("Unexpected response format from database function");
        }
      } catch (dbError: any) {
        console.error("Database operation failed:", dbError);
        // Continue to return results even if database operations fail
        // This ensures the user still gets their optimization results
        // You could alternatively choose to fail the entire operation here
      }
    }

    // Clean up temporary file
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }

    // Clear the timeout since we're done
    clearTimeout(timeoutId);

    // Return successful response with properly ID'd suggestions and keywords
    return NextResponse.json({
      success: true,
      ...optimizationResult,
      // Ensure suggestions and keywords are included with their IDs
      suggestions: optimizationResult.suggestions || [],
      // Use the keywords property we've already ensured exists and is typed correctly
      keywords: optimizationResult.keywords || [],
      data: {
        rawText: resumeText,
        originalText: resumeText,
        fileInfo: {
          name: fileName,
          type: fileType,
          size: fileSize,
          url: fileUrl,
        },
      },
    });
  } catch (error: any) {
    // Clear the timeout
    clearTimeout(timeoutId);

    console.error("Unexpected error:", error);

    // Clean up temporary file in case of error
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }

    // Check if this is a RETRY_UPLOAD error
    if (error.message === "RETRY_UPLOAD") {
      return NextResponse.json(
        {
          success: false,
          error: "RETRY_UPLOAD",
          message:
            "An error occurred while analyzing your resume. Please try uploading the file again.",
        },
        { status: 422 }
      ); // 422 Unprocessable Entity
    }

    // Check if this is an abort error from our timeout
    if (error.name === "AbortError") {
      return NextResponse.json(
        {
          error:
            "Request timed out. Please try again with a smaller file or less text.",
        },
        { status: 504 }
      );
    }

    // Return error response
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
