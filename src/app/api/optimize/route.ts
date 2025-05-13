/**
 * Main API Route for Resume Optimization
 * 
 * This unified route handles all resume optimization operations:
 * - Initial optimization with AI services (OpenAI, Gemini, Claude)
 * - Extraction of text from various file formats
 * - Language detection
 * - Support for resetting last_saved_text on new uploads
 * 
 * The route implements a cascading strategy for AI services:
 * 1. Tries OpenAI first (usually best quality)
 * 2. Falls back to Gemini if OpenAI fails
 * 3. Falls back to Claude as a last resort
 * 4. Uses a fallback generator if all services fail
 * 
 * Improvements:
 * - Unified API endpoint for all optimization operations
 * - Modular service architecture for better maintainability
 * - Improved error handling with consistent response format
 * - Better file handling with proper cleanup
 * - Added support for resetting last_saved_text on new uploads
 * - Fixed timeout handling to prevent unhandled rejections
 * - Added handling for RETRY_UPLOAD errors from OpenAI parsing
 * - Ensures all suggestions and keywords have valid IDs when returned
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { extractTextFromFile } from './services/extraction';
import { detectLanguage } from './services/language';
import { optimizeResume } from './services/optimization';
import { generateFallbackOptimization } from './services/optimization/fallback';
import { getSupabaseUuid } from './services/userMapping';
import { cleanupTempFile } from './services/fileHandler';
import { OptimizationResult, OptimizationOptions } from './types';

// API timeout duration in milliseconds (60 seconds)
const API_TIMEOUT = 60000;

// Define interface for database resume data
interface ResumeData {
  id: string;
  user_id: string;
  auth_user_id: string;
  supabase_user_id: string;
  original_text: string;
  optimized_text: string;
  last_saved_text: string | null;
  language: string;
  ats_score: number;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  ai_provider: string;
  [key: string]: any; // Allow for additional properties
}

// Interface for keywords with IDs for frontend consumption
interface KeywordWithId {
  id: string;
  text: string;
  isApplied: boolean;
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
      return NextResponse.json({ 
        error: "Missing required fields: either fileUrl or rawText is required for optimization" 
      }, { status: 400 });
    }

    // Handle optimization flow
    console.log(`New optimization for user ${userId}`);
    
    // Get text content from file or rawText
    let resumeText = '';
    let fileSize: number | null = null;

    if (fileUrl) {
      // Extract text from uploaded file - FIXED: Now passing fileType to properly handle DOCX files
      const extractionResult = await extractTextFromFile(fileUrl, fileType || undefined);
      
      if (extractionResult.error) {
        clearTimeout(timeoutId);
        console.error("Extraction error details:", extractionResult.error);
        
        // Create user-friendly error message based on file type
        let userMessage = extractionResult.error.message;
        
        if (fileType?.includes("openxmlformats") || fileType?.includes("docx")) {
          userMessage = "We encountered an issue processing this DOCX file. Please try uploading as PDF or copy-paste the content directly.";
        } else if (fileType?.includes("pdf")) {
          userMessage = "This PDF couldn't be processed correctly. Please ensure it contains selectable text or try copy-pasting the content.";
        }
        
        return NextResponse.json({ 
          error: userMessage 
        }, { status: 422 }); // Using 422 Unprocessable Entity instead of 500 for better semantics
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
      return NextResponse.json({ 
        error: "Text is too short to process (minimum 50 characters required)" 
      }, { status: 400 });
    }

    // Detect language
    const language = await detectLanguage(resumeText);
    console.log(`Detected language: ${language}`);

    // Optimize resume with cascade of AI services
    let optimizationResult: OptimizationResult & { keywords?: KeywordWithId[] } = {
      optimizedText: '',
      suggestions: [],
      keywordSuggestions: [],
      atsScore: 0,
      provider: ''
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
      console.log(`Optimization successful using ${optimizationResult.provider}`);
    } catch (error: any) {
      // Check if this is a RETRY_UPLOAD error from OpenAI parsing
      if (error.message === 'RETRY_UPLOAD') {
        console.error("OpenAI response parsing failed, requesting file re-upload");
        clearTimeout(timeoutId);
        
        // Clean up temporary file
        if (tempFilePath) {
          cleanupTempFile(tempFilePath);
        }
        
        return NextResponse.json({ 
          success: false,
          error: "RETRY_UPLOAD",
          message: "An error occurred while analyzing your resume. Please try uploading the file again."
        }, { status: 422 }); // 422 Unprocessable Entity
      }
      
      // Check if this is an abort error from our timeout
      if (error.name === 'AbortError') {
        console.error("Optimization request timed out after", API_TIMEOUT, "ms");
        clearTimeout(timeoutId);
        
        // Clean up temporary file
        if (tempFilePath) {
          cleanupTempFile(tempFilePath);
        }
        
        return NextResponse.json({ 
          error: "Optimization request timed out. Please try again with a smaller file or less text." 
        }, { status: 504 });
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
    let resumeData: ResumeData | null = null;
    if (userId) {
      try {
        // Get Supabase admin client
        const supabaseAdmin = getAdminClient();
        
        // Get or create Supabase UUID for user
        const supabaseUserId = await getSupabaseUuid(supabaseAdmin, userId);
        
        // Insert into database
        // NOTE: last_saved_text is explicitly set to null for new uploads
        const { data: insertedResumeData, error } = await supabaseAdmin
          .from('resumes')
          .insert({
            user_id: supabaseUserId,
            auth_user_id: userId,
            supabase_user_id: supabaseUserId,
            original_text: resumeText,
            optimized_text: optimizationResult.optimizedText,
            // Explicitly set last_saved_text to null for new uploads
            last_saved_text: resetLastSavedText ? null : undefined,
            language: language,
            ats_score: optimizationResult.atsScore || 65,
            file_url: fileUrl || null,
            file_name: fileName || null,
            file_type: fileType || null,
            file_size: fileSize || null,
            ai_provider: optimizationResult.provider
          })
          .select()
          .single();
        
        if (error) {
          console.error("Error saving resume to database:", error);
        } else if (insertedResumeData) {
          resumeData = insertedResumeData as ResumeData;
          console.log("Resume saved successfully with ID:", resumeData.id);
          optimizationResult.resumeId = resumeData.id;
          
          // Save keywords if present
          if (optimizationResult.keywordSuggestions?.length > 0) {
            // Prepare keywords with resume ID reference
            const keywordsToInsert = optimizationResult.keywordSuggestions.map((keyword: string) => ({
              resume_id: resumeData!.id,
              keyword: keyword,
              is_applied: false
            }));
            
            // Insert keywords and retrieve the created records with their IDs
            const { data: insertedKeywords, error: keywordsError } = await supabaseAdmin
              .from('resume_keywords')
              .insert(keywordsToInsert)
              .select(); // Important: this returns inserted records with generated IDs
            
            if (keywordsError) {
              console.error("Error inserting keywords:", keywordsError);
            } else if (insertedKeywords) {
              // Create a properly formatted keywords array with IDs for the response
              // This ensures all keywords have a valid ID from the database
              // We use the extended type definition to ensure type safety
              optimizationResult.keywords = insertedKeywords.map(k => ({
                id: k.id,
                text: k.keyword,
                isApplied: k.is_applied // Convert snake_case to camelCase for frontend
              }));
              
              console.log("Keywords saved with IDs:", insertedKeywords.length);
            }
          }
          
          // Save suggestions if present
          if (optimizationResult.suggestions?.length > 0) {
            // Prepare suggestions with resume ID reference
            const suggestionsToInsert = optimizationResult.suggestions.map((suggestion: any) => ({
              resume_id: resumeData!.id,
              type: suggestion.type || "general",
              text: suggestion.text,
              impact: suggestion.impact,
              is_applied: false
            }));
            
            // Insert suggestions and retrieve the created records with their IDs
            const { data: insertedSuggestions, error: suggestionsError } = await supabaseAdmin
              .from('resume_suggestions')
              .insert(suggestionsToInsert)
              .select(); // Important: this returns inserted records with generated IDs
            
            if (suggestionsError) {
              console.error("Error inserting suggestions:", suggestionsError);
            } else if (insertedSuggestions) {
              // Replace suggestions in optimization result with those having valid IDs
              // This ensures all suggestions have an ID from the database
              optimizationResult.suggestions = insertedSuggestions.map(s => ({
                id: s.id, // Database-generated ID
                text: s.text,
                type: s.type,
                impact: s.impact,
                isApplied: s.is_applied // Convert snake_case to camelCase for frontend
              }));
              
              console.log("Suggestions saved with IDs:", insertedSuggestions.length);
            }
          }
        }
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
        // Continue to return results even if database operations fail
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
          url: fileUrl
        }
      }
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
    if (error.message === 'RETRY_UPLOAD') {
      return NextResponse.json({ 
        success: false,
        error: "RETRY_UPLOAD",
        message: "An error occurred while analyzing your resume. Please try uploading the file again."
      }, { status: 422 }); // 422 Unprocessable Entity
    }
    
    // Check if this is an abort error from our timeout
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        error: "Request timed out. Please try again with a smaller file or less text." 
      }, { status: 504 });
    }
    
    // Return error response
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}