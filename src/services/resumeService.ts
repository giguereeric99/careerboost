/**
 * Resume Service Module
 *
 * This module provides comprehensive resume management functionality including:
 * - File upload and storage
 * - Resume parsing and structure extraction
 * - AI-powered optimization and enhancement
 * - Resume retrieval and manipulation
 * - ATS (Applicant Tracking System) compatibility scoring
 * - Atomic saving operations to ensure data consistency
 *
 * The service handles interaction with backend storage and AI processing while
 * providing appropriate error handling and user feedback.
 */

import { supabase } from "@/lib/supabase-client";
import { ResumeData, Suggestion } from "@/types/resumeTypes";
import { toast } from "sonner";
import {
  parseOptimizedText,
  extractKeywords,
  calculateAtsScore,
} from "./resumeParser";
import {
  validateResume,
  getResumeImprovementSuggestions,
} from "./resumeValidation";

// Re-export these functions so they can be imported from resumeService
export { parseOptimizedText, extractKeywords, calculateAtsScore };

/**
 * Uploads a resume file to Supabase storage
 * Handles file naming, upload process, and user feedback
 *
 * @param file - The resume file to upload
 * @returns Object containing the file path and any error
 */
export async function uploadResume(
  file: File
): Promise<{ path: string; error: Error | null }> {
  try {
    // Generate a unique file name using random string and timestamp
    const fileExt = file.name.split(".").pop() || "pdf";
    const fileName = `${Math.random()
      .toString(36)
      .substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    // Show upload status toast for user feedback
    const toastId = toast.loading("Uploading resume...");

    // Upload file to Supabase Storage bucket
    const { error } = await supabase.storage
      .from("resume-files")
      .upload(filePath, file);

    // Handle upload errors
    if (error) {
      toast.dismiss(toastId);
      toast.error("Upload failed", { description: error.message });
      throw error;
    }

    // Show success message and return file path
    toast.dismiss(toastId);
    toast.success("Resume uploaded successfully");

    return { path: filePath, error: null };
  } catch (error: any) {
    // Log error for debugging and return error object
    console.error("Error uploading resume:", error);
    return { path: "", error };
  }
}

/**
 * Gets the public URL for a file in Supabase storage
 * Converts storage path to accessible URL for frontend use
 *
 * @param filePath - Path to the file in storage
 * @returns Public URL of the file
 */
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage.from("resume-files").getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Parses a resume file to extract structured information
 * Calls backend parsing service through Supabase Edge Function
 *
 * @param filePath - Path to the resume file in Supabase storage
 * @returns Object containing the parsed data and any error
 */
export async function parseResume(
  filePath: string
): Promise<{ data: ResumeData | null; error: Error | null }> {
  try {
    // Show parsing status toast for user feedback
    const toastId = toast.loading("Analyzing resume structure...");

    // Call Supabase Edge Function to parse resume using AI
    const { data, error } = await supabase.functions.invoke("parse-resume", {
      body: { filePath },
    });

    // Handle API errors
    if (error) {
      toast.dismiss(toastId);
      toast.error("Resume analysis failed", { description: error.message });
      throw error;
    }

    // Show success message and return parsed data
    toast.dismiss(toastId);
    toast.success("Resume structure analyzed successfully");

    return { data, error: null };
  } catch (error: any) {
    // Log error for debugging and return error object
    console.error("Error parsing resume:", error);
    return { data: null, error };
  }
}

/**
 * Optimizes a resume using AI to improve content and ATS compatibility
 * Processes structured resume data through AI enhancement
 *
 * @param resumeData - Structured resume data to optimize
 * @returns Optimized data, suggestions, and any error
 */
export async function optimizeResume(resumeData: ResumeData): Promise<{
  optimizedData: ResumeData | null;
  optimizedText: string | null;
  suggestions: Suggestion[];
  keywordSuggestions: string[];
  atsScore: number;
  error: Error | null;
}> {
  try {
    // Show optimization status toast for user feedback
    const toastId = toast.loading("Optimizing your resume with AI...");

    // Call Supabase Edge Function to optimize resume
    const { data, error } = await supabase.functions.invoke("optimize-resume", {
      body: { resumeData },
    });

    // Handle API errors
    if (error) {
      toast.dismiss(toastId);
      toast.error("Optimization failed", { description: error.message });
      throw error;
    }

    // Show success message with ATS score
    toast.dismiss(toastId);
    toast.success("Resume optimized successfully", {
      description: `ATS Score: ${data.atsScore}/100`,
    });

    // Return comprehensive optimization results
    return {
      optimizedData: data.optimizedData,
      optimizedText: data.optimizedText || null,
      suggestions: data.suggestions || [],
      keywordSuggestions: data.keywordSuggestions || [],
      atsScore: data.atsScore || 60, // Default to 60 if not provided
      error: null,
    };
  } catch (error: any) {
    // Log error for debugging and return error object
    console.error("Error optimizing resume:", error);
    return {
      optimizedData: null,
      optimizedText: null,
      suggestions: [],
      keywordSuggestions: [],
      atsScore: 0,
      error,
    };
  }
}

/**
 * Retrieves the most recent optimized resume for a user
 * Uses the server API instead of direct database access to avoid RLS issues
 * Improved error handling and ID resolution logic
 *
 * @param userId - The ID of the user
 * @returns The optimized resume data or null if not found
 */
export async function getLatestOptimizedResume(userId: string): Promise<{
  data: {
    id: string;
    original_text: string;
    optimized_text: string;
    last_saved_text?: string;
    language: string;
    file_name: string;
    file_type: string;
    file_size?: number;
    ats_score: number;
    keywords?: { text: string; applied: boolean }[];
    suggestions?: Suggestion[];
  } | null;
  error: Error | null;
}> {
  // Reject empty user IDs early with clear error message
  if (!userId) {
    console.log("No user ID provided to getLatestOptimizedResume");
    return { data: null, error: new Error("User ID is required") };
  }

  try {
    console.log("Getting latest resume for user:", userId);

    console.log(userId);

    // NEW - Direct RPC call
    const { data: result, error: rpcError } = await supabase.rpc(
      "get_latest_resume_by_clerk_id",
      { p_clerk_id: userId }
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      throw new Error(rpcError.message || "Failed to load resume");
    }

    // IMPORTANT: Check if data exists, but treat "null data" as a valid state (new user)
    // This clear distinction prevents loading loops
    if (result && result.data) {
      console.log("Resume loaded successfully", result.data.id);

      // Process data for consistency to ensure consistent structure
      const processedData = {
        ...result.data,
        // Ensure keywords have a consistent structure regardless of API format
        keywords: Array.isArray(result.data.keywords)
          ? result.data.keywords.map((k: any) => ({
              text: k.keyword || k.text,
              applied: k.is_applied || k.applied || false,
            }))
          : [],
        // Ensure suggestions have a consistent structure regardless of API format
        suggestions: Array.isArray(result.data.suggestions)
          ? result.data.suggestions.map((s: any) => ({
              id: s.id,
              text: s.text,
              type: s.type || "general",
              impact: s.impact || "medium",
              isApplied: s.is_applied || s.isApplied || false,
            }))
          : [],
      };

      return { data: processedData, error: null };
    } else {
      // No resume found - this is normal for new users, NOT an error condition
      // This is key to prevent loading loops
      console.log("No resume found for user - this is expected for new users");

      // Return null data but NO ERROR - this is key to prevent loops
      // By returning error: null we signal this is a valid state, not a failure
      return { data: null, error: null };
    }
  } catch (error: any) {
    // Log the error for debugging
    console.error("Error loading resume:", error);
    return {
      data: null,
      error: new Error(`Failed to get resume: ${error.message}`),
    };
  }
}

/**
 * Validates if a resume load attempt should be made
 * Helps prevent infinite loading loops for non-existent resumes
 *
 * @param userId - The user ID to check
 * @param attemptCount - Current number of load attempts
 * @param maxAttempts - Maximum allowed attempts
 * @returns Boolean indicating if load should proceed
 */
export function shouldAttemptResumeLoad(
  userId: string | null | undefined,
  attemptCount: number,
  maxAttempts: number = 2
): boolean {
  // No user ID means no valid load attempt possible
  if (!userId) {
    return false;
  }

  // Check if we've exceeded maximum attempts
  if (attemptCount >= maxAttempts) {
    console.log(
      `Maximum resume load attempts (${maxAttempts}) reached for user ${userId}`
    );
    return false;
  }

  // All checks passed, can attempt to load
  return true;
}

/**
 * Checks if resume API response indicates "no resume" vs. genuine error
 * Helps distinguish between normal "new user" state and actual errors
 *
 * @param response - The API response object
 * @param result - The parsed JSON result
 * @returns Boolean indicating if this is a valid "no resume" state
 */
export function isValidNoResumeState(response: Response, result: any): boolean {
  // If response is OK (200) but no data property exists or it's null
  return response.ok && (!result.data || result.data === null);
}

/**
 * Save resume complete with all changes atomically
 * Uses a Supabase RPC function to ensure all related data is saved in a single transaction
 * This replaces the previous saveResumeContent, updateKeywordStatus, and updateSuggestionStatus functions
 * with a single atomic operation
 *
 * @param resumeId - The ID of the resume to update
 * @param content - The new content to save
 * @param atsScore - The new ATS score
 * @param appliedSuggestionIds - Array of suggestion IDs that are applied
 * @param appliedKeywords - Array of keywords that are applied
 * @returns Success status and any error
 */
/**
 * Save resume with all changes in a single atomic transaction
 * Handles content, score, suggestions, keywords, and template in one operation
 *
 * @param resumeId - ID of the resume to update
 * @param content - New content to save
 * @param atsScore - Current ATS score
 * @param appliedSuggestionIds - Array of applied suggestion IDs
 * @param appliedKeywords - Array of applied keyword texts
 * @param selectedTemplate - Selected template ID (optional)
 * @returns Object with success status and error if any
 */
export async function saveResumeComplete(
  resumeId: string,
  content: string,
  atsScore: number,
  appliedSuggestionIds: string[],
  appliedKeywords: string[],
  selectedTemplate?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Log debugging information
    console.log("Saving resume completely with atomic transaction:", {
      resumeId,
      contentLength: content.length,
      atsScore,
      suggestionCount: appliedSuggestionIds.length,
      keywordCount: appliedKeywords.length,
      template: selectedTemplate || "unchanged",
    });

    // Validate parameters
    if (!resumeId || !content) {
      console.error("saveResumeComplete: Missing required parameters");
      return {
        success: false,
        error: new Error("Missing required parameters"),
      };
    }

    // Prepare RPC parameters
    const rpcParams: any = {
      p_resume_id: resumeId,
      p_content: content,
      p_ats_score: atsScore,
      p_applied_suggestions: appliedSuggestionIds,
      p_applied_keywords: appliedKeywords,
    };

    // Add template parameter only if provided
    if (selectedTemplate) {
      rpcParams.p_selected_template = selectedTemplate;
    }

    // Call the Supabase RPC function
    const { data, error } = await supabase.rpc(
      "save_resume_complete",
      rpcParams
    );

    if (error) {
      console.error("Error during save_resume_complete RPC call:", error);
      throw error;
    }

    // data will be true if successful
    if (data !== true) {
      console.error("Save failed on server side");
      throw new Error("Failed to save resume");
    }

    console.log(`Resume ${resumeId} saved successfully with all changes`);

    // Success - return success status
    return { success: true, error: null };
  } catch (error) {
    // Log the error and return it
    console.error("Error saving resume completely:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Reset resume to original version
 * Removes all applied changes and reverts to the original optimized version
 * Uses the Supabase RPC function for atomic operations
 *
 * @param resumeId - The ID of the resume to reset
 * @returns Success status and any error
 */
export async function resetResumeToOriginal(
  resumeId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Validate input
    if (!resumeId) {
      console.error(
        "resetResumeToOriginal: Missing required resumeId parameter"
      );
      return { success: false, error: new Error("Resume ID is missing") };
    }

    console.log(`Resetting resume ID ${resumeId} via RPC function...`);

    // Call the Supabase RPC function
    const { data, error } = await supabase.rpc("reset_resume", {
      p_resume_id: resumeId,
    });

    if (error) {
      console.error("Error during RPC call:", error);
      throw error;
    }

    // Check the result (function returns true on success)
    if (data !== true) {
      console.error("Reset failed on server side");
      throw new Error("Failed to reset resume");
    }

    console.log(`Resume ${resumeId} successfully reset to original version`);

    // Success - return success status
    return { success: true, error: null };
  } catch (error) {
    // Log the error and return it
    console.error("Error resetting resume:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Update resume template
 * Sets the selected template for a resume
 *
 * @param resumeId - The ID of the resume
 * @param templateId - The ID of the template to apply
 * @returns Success status and any error
 */
export async function updateResumeTemplate(
  resumeId: string,
  templateId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Update the resume with the selected template
    const { error } = await supabase
      .from("resumes")
      .update({
        selected_template: templateId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resumeId);

    // Handle update errors
    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    // Log error for debugging and return error object
    console.error("Error updating resume template:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Validates resume content before optimization
 * Checks if the document is a valid resume and returns suggestions if needed
 *
 * @param content - Text content extracted from the uploaded file
 * @returns Validation result with suggestions
 */
export async function validateResumeContent(content: string) {
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
