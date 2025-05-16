/**
 * Resume Service Module
 * 
 * This module provides comprehensive resume management functionality including:
 * - File upload and storage
 * - Resume parsing and structure extraction
 * - AI-powered optimization and enhancement
 * - Resume retrieval and manipulation
 * - ATS (Applicant Tracking System) compatibility scoring
 * 
 * The service handles interaction with backend storage and AI processing while
 * providing appropriate error handling and user feedback.
 * 
 * IMPORTANT: All database operations are performed through API routes instead
 * of direct Supabase access to ensure proper authentication and avoid RLS issues.
 */

import { supabase } from "@/lib/supabase-client";
import { ResumeData } from "@/types/resumeTypes";
// Import Suggestion from suggestionTypes instead of resumeTypes
import { OptimizationSuggestion as Suggestion } from "@/types/suggestionTypes";
import { Keyword } from "@/types/keywordTypes";
import { toast } from "sonner";
import { parseOptimizedText, extractKeywords, calculateAtsScore } from "./resumeParser";

// Re-export these functions so they can be imported from resumeService
export { parseOptimizedText, extractKeywords, calculateAtsScore };

/**
 * Uploads a resume file to Supabase storage
 * Handles file naming, upload process, and user feedback
 * 
 * Note: This operation uses direct Supabase client as it's a storage operation,
 * which is different from database operations that need to respect RLS
 * 
 * @param file - The resume file to upload
 * @returns Object containing the file path and any error
 */
export async function uploadResume(file: File): Promise<{ path: string; error: Error | null }> {
  try {
    // Generate a unique file name using random string and timestamp
    const fileExt = file.name.split('.').pop() || 'pdf';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    // Show upload status toast for user feedback
    const toastId = toast.loading("Uploading resume...");

    // Upload file to Supabase Storage bucket
    const { error } = await supabase.storage
      .from('resume-files')
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
    return { path: '', error };
  }
}

/**
 * Gets the public URL for a file in Supabase storage
 * Converts storage path to accessible URL for frontend use
 * 
 * Note: This is a client-side operation that doesn't require API access
 * 
 * @param filePath - Path to the file in storage
 * @returns Public URL of the file
 */
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('resume-files')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Parses a resume file to extract structured information
 * Calls backend parsing service through Supabase Edge Function
 * 
 * @param filePath - Path to the resume file in Supabase storage
 * @returns Object containing the parsed data and any error
 */
export async function parseResume(filePath: string): Promise<{ data: ResumeData | null; error: Error | null }> {
  try {
    // Show parsing status toast for user feedback
    const toastId = toast.loading("Analyzing resume structure...");

    // Call Supabase Edge Function to parse resume using AI
    const { data, error } = await supabase.functions.invoke('parse-resume', {
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
  error: Error | null 
}> {
  try {
    // Show optimization status toast for user feedback
    const toastId = toast.loading("Optimizing your resume with AI...");

    // Call Supabase Edge Function to optimize resume
    const { data, error } = await supabase.functions.invoke('optimize-resume', {
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
      description: `ATS Score: ${data.atsScore}/100` 
    });
    
    // Return comprehensive optimization results
    return { 
      optimizedData: data.optimizedData, 
      optimizedText: data.optimizedText || null,
      suggestions: data.suggestions || [], 
      keywordSuggestions: data.keywordSuggestions || [],
      atsScore: data.atsScore || 60, // Default to 60 if not provided
      error: null 
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
      error 
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
    keywords?: { text: string, applied: boolean }[];
    suggestions?: Suggestion[];
    last_saved_score_ats?: number; // Added missing field
  } | null;
  error: Error | null;
}> {
  // Reject empty user IDs early with clear error message
  if (!userId) {
    console.log("No user ID provided to getLatestOptimizedResume");
    return { data: null, error: new Error('User ID is required') };
  }

  try {
    console.log("Getting latest resume for user:", userId);
    
    // Use the API route instead of direct Supabase query
    // This provides a layer of abstraction and better error handling
    const response = await fetch(`/api/resumes?userId=${encodeURIComponent(userId)}`);
    
    // Parse the response regardless of status code to get error details
    const result = await response.json();
    
    // Check if the API returned an error
    if (!response.ok) {
      throw new Error(result.error || "Failed to load resume");
    }
    
    // IMPORTANT: Check if data exists, but treat "null data" as a valid state (new user)
    // This clear distinction prevents loading loops
    if (result.data) {
      console.log("Resume loaded successfully", result.data.id);
      
      // Process data for consistency to ensure consistent structure
      const processedData = {
        ...result.data,
        // Ensure keywords have a consistent structure regardless of API format
        keywords: Array.isArray(result.data.keywords) 
          ? result.data.keywords.map((k: any) => ({
              text: k.keyword || k.text,
              applied: k.is_applied || k.applied || false
            }))
          : [],
        // Ensure suggestions have a consistent structure regardless of API format
        suggestions: Array.isArray(result.data.suggestions) 
          ? result.data.suggestions.map((s: any) => ({
              id: s.id,
              text: s.text,
              type: s.type || 'general',
              impact: s.impact || 'medium',
              isApplied: s.is_applied || s.isApplied || false
            }))
          : []
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
      error: new Error(`Failed to get resume: ${error.message}`) 
    };
  }
}

/**
 * Updates the status of a keyword for a resume
 * Uses the API route instead of direct database access for security
 * 
 * @param resumeId - The resume ID
 * @param keyword - The keyword to update
 * @param applied - Whether the keyword has been applied
 * @returns Success status and any error
 */
export async function updateKeywordStatus(
  resumeId: string,
  keyword: string,
  applied: boolean
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Validate parameters
    if (!resumeId || !keyword) {
      console.error("updateKeywordStatus: Missing required parameters");
      return { success: false, error: new Error("Missing required parameters") };
    }
    
    console.log(`Updating keyword status for resume ${resumeId}: ${keyword} -> ${applied}`);
    
    // Call the API to update keyword status
    const response = await fetch('/api/resumes/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        resumeId, 
        keywords: [{ text: keyword, applied }] 
      })
    });
    
    // Parse the response to get error details
    const result = await response.json();
    
    // Handle API errors
    if (!response.ok) {
      const errorMessage = result.error || "Failed to update keyword";
      console.error(`Keyword status update API error:`, errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log(`Keyword status update successful for ${keyword}`);
    return { success: true, error: null };
  } catch (error: any) {
    // Log error for debugging and return error object
    console.error("Error updating keyword status:", error);
    return { success: false, error };
  }
}

/**
 * Updates the status of a suggestion for a resume
 * Uses the API route instead of direct database access for security
 * 
 * @param resumeId - The resume ID
 * @param suggestionId - The suggestion ID
 * @param applied - Whether the suggestion has been applied
 * @returns Success status and any error
 */
export async function updateSuggestionStatus(
  resumeId: string,
  suggestionId: string,
  applied: boolean
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Parameter validation
    if (!resumeId || !suggestionId || applied === undefined) {
      const error = new Error("Missing required parameters: resumeId, suggestionId, and applied status");
      console.error("updateSuggestionStatus validation error:", {
        resumeId,
        suggestionId,
        applied,
        error
      });
      return { success: false, error };
    }
    
    // Call the API to update suggestion status
    console.log("Sending request to update suggestion:", {
      resumeId,
      suggestionId,
      applied
    });
    
    const response = await fetch('/api/resumes/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId, suggestionId, applied })
    });
    
    // Parse the response to get error details
    const result = await response.json();
    
    // Handle API errors
    if (!response.ok) {
      const errorMessage = result.error || "Failed to update suggestion";
      console.error(`Suggestion status update API error:`, errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log(`Suggestion status update successful for ${suggestionId}`);
    return { success: true, error: null };
  } catch (error: any) {
    // Log error for debugging and return error object
    console.error("Error updating suggestion status:", error);
    return { success: false, error };
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
    console.log(`Maximum resume load attempts (${maxAttempts}) reached for user ${userId}`);
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
 * Save resume content and score
 * Updates the resume content and score in the database via API
 * 
 * @param resumeId - The ID of the resume to update
 * @param content - The new content to save
 * @param atsScore - The new ATS score
 * @returns Success status and any error
 */
export async function saveResumeContent(
  resumeId: string, 
  content: string, 
  atsScore: number
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Log debugging information
    console.log('Saving resume content:', {
      resumeId,
      contentLength: content.length,
      atsScore
    });

    // Validate parameters
    if (!resumeId || !content) {
      console.error('saveResumeContent: Missing required parameters');
      return { success: false, error: new Error('Missing required parameters') };
    }

    // Use the API route instead of direct Supabase query for better error handling
    const response = await fetch('/api/resumes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeId,
        content,
        atsScore
      }),
    });

    // Parse the response to get error details
    const result = await response.json();
    
    // Check if the API returned an error
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save resume');
    }
    
    console.log('Resume content saved successfully');
    // Request successful
    return { success: true, error: null };
  } catch (error) {
    // Log error for debugging and return error object
    console.error("Error saving resume content:", error);
    return { success: false, error: error as Error };
  }
}

/**
 * Reset resume to original version
 * Reverts all applied changes and returns to the original AI-optimized version
 * Uses the API PATCH endpoint instead of direct Supabase access for better security and reliability
 * 
 * Key improvements:
 * - Uses API route instead of direct database access to avoid RLS issues
 * - Comprehensive error handling and detailed logging for debugging
 * - Proper handling of suggestions and keywords reset
 * - Structured response format consistent with other service functions
 * 
 * @param resumeId - The ID of the resume to reset
 * @returns Promise with success status and any error
 */
export async function resetResumeToOriginal(
  resumeId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Log reset attempt for debugging
    console.log(`Attempting to reset resume with ID: ${resumeId} via API`);
    
    // Validate resumeId to prevent unnecessary API calls
    if (!resumeId) {
      console.error("Cannot reset resume: Missing resumeId");
      return { success: false, error: new Error("Resume ID is required") };
    }
    
    // Use the PATCH API endpoint instead of direct Supabase access
    // This ensures proper authorization and consistent data handling
    const response = await fetch('/api/resumes', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeId,
        action: 'reset', // Action parameter required by the API
      }),
    });
    
    // Parse response JSON for proper error handling
    const result = await response.json();
    console.log(`Reset API response status: ${response.status}`, result);
    
    // Handle API errors with detailed logging
    if (!response.ok) {
      const errorMessage = result.error || `API error: ${response.status}`;
      console.error(`Resume reset API error:`, errorMessage);
      return { 
        success: false, 
        error: new Error(errorMessage)
      };
    }
    
    // Success case - API call completed successfully
    console.log("Resume reset API call successful", result);
    return { success: true, error: null };
  } catch (error: any) {
    // Catch and handle any unexpected errors
    // This includes network errors or JSON parsing errors
    console.error("Unexpected error resetting resume:", error);
    return { 
      success: false, 
      error: new Error(`Failed to reset resume: ${error.message}`) 
    };
  }
}

/**
 * Update resume template
 * Sets the selected template for a resume
 * 
 * UPDATED: Now uses the API route instead of direct Supabase access
 * to maintain consistent authorization and avoid RLS issues
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
    // Log template update attempt for debugging
    console.log(`Updating template for resume ID: ${resumeId} to ${templateId}`);
    
    // Validate parameters
    if (!resumeId || !templateId) {
      console.error("updateResumeTemplate: Missing required parameters");
      return { success: false, error: new Error("Missing required parameters") };
    }
    
    // Use the PUT API endpoint instead of direct Supabase access
    // This ensures proper authorization and consistent data handling
    const response = await fetch('/api/resumes', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resumeId,
        updates: {
          selected_template: templateId
        }
      }),
    });
    
    // Parse response JSON for proper error handling
    const result = await response.json();
    console.log(`Template update API response:`, result);
    
    // Handle API errors with detailed logging
    if (!response.ok) {
      const errorMessage = result.error || `API error: ${response.status}`;
      console.error(`Template update API error:`, errorMessage);
      return { 
        success: false, 
        error: new Error(errorMessage) 
      };
    }
    
    // Success case
    console.log(`Template updated successfully to: ${templateId}`);
    return { success: true, error: null };
  } catch (error) {
    // Log error for debugging and return error object
    console.error("Error updating resume template:", error);
    return { success: false, error: error as Error };
  }
}