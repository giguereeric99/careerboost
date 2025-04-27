/**
 * Resume service module
 * Contains functions for resume operations including upload, parsing, and optimization
 */

import { supabase } from "@/lib/supabase-client";
import { ResumeData, Suggestion } from "@/types/resume";
import { toast } from "sonner";
import { parseOptimizedText, extractKeywords, calculateAtsScore } from "./resumeParser";

/**
 * Uploads a resume file to Supabase storage
 * 
 * @param file - The resume file to upload
 * @returns Object containing the file path and any error
 */
export async function uploadResume(file: File): Promise<{ path: string; error: Error | null }> {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop() || 'pdf';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    // Show upload status toast
    const toastId = toast.loading("Uploading resume...");

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from('resume-files')
      .upload(filePath, file);

    if (error) {
      toast.dismiss(toastId);
      toast.error("Upload failed", { description: error.message });
      throw error;
    }

    toast.dismiss(toastId);
    toast.success("Resume uploaded successfully");

    return { path: filePath, error: null };
  } catch (error: any) {
    console.error("Error uploading resume:", error);
    return { path: '', error };
  }
}

/**
 * Gets the public URL for a file in Supabase storage
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
 * 
 * @param filePath - Path to the resume file in Supabase storage
 * @returns Object containing the parsed data and any error
 */
export async function parseResume(filePath: string): Promise<{ data: ResumeData | null; error: Error | null }> {
  try {
    // Show parsing status toast
    const toastId = toast.loading("Analyzing resume structure...");

    // Call Supabase Edge Function to parse resume
    const { data, error } = await supabase.functions.invoke('parse-resume', {
      body: { filePath },
    });

    if (error) {
      toast.dismiss(toastId);
      toast.error("Resume analysis failed", { description: error.message });
      throw error;
    }
    
    toast.dismiss(toastId);
    toast.success("Resume structure analyzed successfully");

    return { data, error: null };
  } catch (error: any) {
    console.error("Error parsing resume:", error);
    return { data: null, error };
  }
}

/**
 * Optimizes a resume using AI to improve content and ATS compatibility
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
    // Show optimization status toast
    const toastId = toast.loading("Optimizing your resume with AI...");

    // Call Supabase Edge Function to optimize resume
    const { data, error } = await supabase.functions.invoke('optimize-resume', {
      body: { resumeData },
    });

    if (error) {
      toast.dismiss(toastId);
      toast.error("Optimization failed", { description: error.message });
      throw error;
    }
    
    toast.dismiss(toastId);
    toast.success("Resume optimized successfully", { 
      description: `ATS Score: ${data.atsScore}/100` 
    });
    
    return { 
      optimizedData: data.optimizedData, 
      optimizedText: data.optimizedText || null,
      suggestions: data.suggestions || [], 
      keywordSuggestions: data.keywordSuggestions || [],
      atsScore: data.atsScore || 60, // Default to 60 if not provided
      error: null 
    };
  } catch (error: any) {
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
 * 
 * @param userId - The ID of the user
 * @returns The optimized resume data or null if not found
 */
export async function getLatestOptimizedResume(userId: string): Promise<{
  data: {
    id: string;
    original_text: string;
    optimized_text: string;
    language: string;
    file_name: string;
    file_type: string;
    file_size?: number;
    ats_score: number;
    keywords?: { text: string, applied: boolean }[];
    suggestions?: Suggestion[];
  } | null;
  error: Error | null;
}> {
  try {
    console.log("Getting latest resume for user:", userId);
    
    // Use the API route instead of direct Supabase query
    const response = await fetch(`/api/resumes/latest?userId=${userId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to load resume");
    }
    
    const { data } = await response.json();
    
    if (data) {
      // Resume found - log success
      console.log("Resume loaded successfully");
      return { data, error: null };
    } else {
      // No resume found for this user
      console.log("No previous resume found for user");
      return { data: null, error: null };
    }
  } catch (error: any) {
    // Handle any unexpected exceptions
    console.error("Exception in getLatestOptimizedResume:", error);
    return { 
      data: null, 
      error: new Error(`Failed to get resume: ${error.message}`) 
    };
  }
}

/**
 * Updates the status of a keyword for a resume
 * Uses the API route instead of direct database access
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
    const response = await fetch('/api/resumes/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        resumeId, 
        keywords: [{ text: keyword, applied }] 
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update keyword");
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating keyword status:", error);
    return { success: false, error };
  }
}

/**
 * Updates the status of a suggestion for a resume
 * Uses the API route instead of direct database access
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
    const response = await fetch('/api/resumes/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId, suggestionId, applied })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update suggestion");
    }
    
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating suggestion status:", error);
    return { success: false, error };
  }
}

/**
 * Regenerates the resume text with applied changes
 * Uses the API route instead of direct database access
 * 
 * @param resumeId - The resume ID
 * @param appliedKeywords - List of keywords that have been applied
 * @param appliedSuggestions - List of suggestions that have been applied
 * @returns Success status, updated text, and any error
 */
export async function regenerateResume(
  resumeId: string,
  appliedKeywords: string[],
  appliedSuggestions: string[]
): Promise<{ 
  success: boolean; 
  optimizedText: string | null;
  atsScore: number | null;
  error: Error | null 
}> {
  try {
    const response = await fetch('/api/resumes/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        resumeId, 
        appliedKeywords,
        appliedSuggestions
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to regenerate resume");
    }
    
    const data = await response.json();
    
    return { 
      success: true, 
      optimizedText: data.optimizedText,
      atsScore: data.atsScore,
      error: null 
    };
  } catch (error: any) {
    console.error("Error regenerating resume:", error);
    return { 
      success: false, 
      optimizedText: null,
      atsScore: null,
      error 
    };
  }
}

// Re-export utility functions from resumeParser
export { parseOptimizedText, extractKeywords, calculateAtsScore };