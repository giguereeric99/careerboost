/**
 * Resume Optimization API Route
 * 
 * This route acts as a proxy between the client and Supabase Edge Functions to avoid CORS issues.
 * It handles:
 * - File uploads and text extraction
 * - Resume optimization via AI (OpenAI, Gemini, Claude)
 * - Database storage of optimization results
 * - Proper error handling and client responses
 * 
 * Flow:
 * 1. Receives request from client
 * 2. Extracts and processes file/text
 * 3. Calls Supabase functions for AI optimization
 * 4. Stores results in database
 * 5. Returns formatted response to client
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase-admin';
import { extractTextFromFile } from './services/extraction';
import { detectLanguage } from './services/language';
import { cleanupTempFile } from './services/fileHandler';
import { getSupabaseUuid } from './services/userMapping';
import { ResumeData, KeywordWithId } from './types';

// Create regular Supabase client for Edge Function calls
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// API timeout duration (60 seconds)
const API_TIMEOUT = 60000;

/**
 * POST handler for resume optimization
 * Handles file processing, AI optimization, and database storage
 */
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  
  // Create an AbortController to handle timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    // Extract data from the request
    const formData = await req.formData();
    const fileUrl = formData.get("fileUrl") as string | null;
    const rawText = formData.get("rawText") as string | null;
    const userId = formData.get("userId") as string | null;
    const fileName = formData.get("fileName") as string | null;
    const fileType = formData.get("fileType") as string | null;
    const resetLastSavedText = formData.get("resetLastSavedText") === "true";

    // Validate required fields
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

    // Log the optimization request
    console.log(`New optimization request for user ${userId}`);
    
    // Initialize variables for text content and file size
    let resumeText = '';
    let fileSize: number | null = null;

    // Extract text from file or use provided raw text
    if (fileUrl) {
      console.log(`Processing file URL: ${fileUrl}`);
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
        }, { status: 422 });
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

    // Detect language of resume text
    const language = await detectLanguage(resumeText);
    console.log(`Detected language: ${language}`);

    // Call Supabase Edge Function for optimization
    // This proxy approach avoids CORS issues with direct client-to-Function calls
    console.log("Calling Supabase optimize-resume function...");
    const { data: optimizationData, error: optimizationError } = await supabaseClient.functions.invoke(
      'optimize-resume',
      {
        body: { 
          resumeText, 
          language,
          fileName,
          fileType 
        }
      }
    );

    // Handle optimization errors
    if (optimizationError) {
      clearTimeout(timeoutId);
      console.error("Optimization error:", optimizationError);
      
      // Clean up temporary file
      if (tempFilePath) {
        cleanupTempFile(tempFilePath);
      }
      
      return NextResponse.json({ 
        error: optimizationError.message || "Failed to optimize resume" 
      }, { status: 500 });
    }

    // Process optimization result
    const optimizationResult = optimizationData || {
      optimizedText: '',
      suggestions: [],
      keywordSuggestions: [],
      atsScore: 65,
      provider: 'fallback'
    };
    
    console.log(`Optimization successful using ${optimizationResult.provider}`);

    // Initialize keywords array if not present
    if (!optimizationResult.keywords) {
      optimizationResult.keywords = [];
    }

    // Save results to database
    let resumeData: ResumeData | null = null;
    if (userId) {
      try {
        // Get Supabase admin client for database operations
        const supabaseAdmin = getAdminClient();
        
        // Get or create Supabase UUID for user
        const supabaseUserId = await getSupabaseUuid(supabaseAdmin, userId);
        
        console.log(`Using Supabase user ID: ${supabaseUserId} for auth user ID: ${userId}`);
        
        // Insert resume into database
        const { data: insertedResumeData, error } = await supabaseAdmin
          .from('resumes')
          .insert({
            user_id: supabaseUserId,
            auth_user_id: userId,
            supabase_user_id: supabaseUserId,
            original_text: resumeText,
            optimized_text: optimizationResult.optimizedText,
            // Explicitly set last_saved_text to null for new uploads if requested
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
          
          // Save keywords to database if present
          if (optimizationResult.keywordSuggestions?.length > 0) {
            // Map keywords to database format
            const keywordsToInsert = optimizationResult.keywordSuggestions.map((keyword: string) => ({
              resume_id: resumeData!.id,
              keyword: keyword,
              is_applied: false
            }));
            
            // Insert keywords and retrieve generated IDs
            const { data: insertedKeywords, error: keywordsError } = await supabaseAdmin
              .from('resume_keywords')
              .insert(keywordsToInsert)
              .select();
            
            if (keywordsError) {
              console.error("Error inserting keywords:", keywordsError);
            } else if (insertedKeywords) {
              // Format keywords with IDs for frontend
              optimizationResult.keywords = insertedKeywords.map(k => ({
                id: k.id,
                text: k.keyword,
                isApplied: k.is_applied
              }));
              
              console.log(`${insertedKeywords.length} keywords saved with IDs`);
            }
          }
          
          // Save suggestions to database if present
          if (optimizationResult.suggestions?.length > 0) {
            // Map suggestions to database format
            const suggestionsToInsert = optimizationResult.suggestions.map((suggestion: any) => ({
              resume_id: resumeData!.id,
              type: suggestion.type || "general",
              text: suggestion.text,
              impact: suggestion.impact,
              is_applied: false
            }));
            
            // Insert suggestions and retrieve generated IDs
            const { data: insertedSuggestions, error: suggestionsError } = await supabaseAdmin
              .from('resume_suggestions')
              .insert(suggestionsToInsert)
              .select();
            
            if (suggestionsError) {
              console.error("Error inserting suggestions:", suggestionsError);
            } else if (insertedSuggestions) {
              // Format suggestions with IDs for frontend
              optimizationResult.suggestions = insertedSuggestions.map(s => ({
                id: s.id,
                text: s.text,
                type: s.type,
                impact: s.impact,
                isApplied: s.is_applied
              }));
              
              console.log(`${insertedSuggestions.length} suggestions saved with IDs`);
            }
          }
        }
      } catch (dbError) {
        console.error("Database operation failed:", dbError);
        // Continue to return results even if database operations fail
      }
    }

    // Clean up temporary file if present
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }

    // Clear the timeout since we're done
    clearTimeout(timeoutId);

    // Return successful response with properly formatted data
    return NextResponse.json({
      success: true,
      ...optimizationResult,
      suggestions: optimizationResult.suggestions || [],
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
    
    console.error("Unexpected error in optimization API:", error);
    
    // Clean up temporary file in case of error
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }
    
    // Handle specific error cases
    if (error.message === 'RETRY_UPLOAD') {
      return NextResponse.json({ 
        success: false,
        error: "RETRY_UPLOAD",
        message: "An error occurred while analyzing your resume. Please try uploading the file again."
      }, { status: 422 });
    }
    
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        error: "Request timed out. Please try again with a smaller file or less text." 
      }, { status: 504 });
    }
    
    // Return general error response
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler to support CORS preflight requests
 * This is useful for local development but may not be needed in production
 */
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}