/**
 * Main API Route for Resume Optimization
 * 
 * This unified route handles all resume optimization operations:
 * - Initial optimization with AI services (OpenAI, Gemini, Claude)
 * - Reoptimization of existing resumes
 * - Extraction of text from various file formats
 * - Language detection
 * 
 * The route implements a cascading strategy for AI services:
 * 1. Tries OpenAI first (usually best quality)
 * 2. Falls back to Gemini if OpenAI fails
 * 3. Falls back to Claude as a last resort
 * 4. Uses a fallback generator if all services fail
 * 
 * Improvements from previous version:
 * - Unified API endpoint for all optimization operations
 * - Modular service architecture for better maintainability
 * - Improved error handling with consistent response format
 * - Better file handling with proper cleanup
 * - Standardized optimization results across all providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { extractTextFromFile } from './services/extraction';
import { detectLanguage } from './services/language';
import { optimizeResume, reoptimizeResume } from './services/optimization';
import { generateFallbackOptimization } from './services/optimization/fallback';
import { getSupabaseUuid } from './services/userMapping';
import { cleanupTempFile } from './services/fileHandler';
import { OptimizationResult } from './types';

/**
 * POST handler for both initial optimization and reoptimization
 */
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  try {
    // Extract data from request
    const formData = await req.formData();
    const fileUrl = formData.get("fileUrl") as string | null;
    const rawText = formData.get("rawText") as string | null;
    const userId = formData.get("userId") as string | null;
    const resumeId = formData.get("resumeId") as string | null;
    const fileName = formData.get("fileName") as string | null;
    const fileType = formData.get("fileType") as string | null;
    
    // For reoptimization
    const appliedKeywords = formData.get("appliedKeywords") ? 
      JSON.parse(formData.get("appliedKeywords") as string) : [];
    const appliedSuggestions = formData.get("appliedSuggestions") ? 
      JSON.parse(formData.get("appliedSuggestions") as string) : [];

    // Validate input
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!resumeId && !fileUrl && !rawText) {
      return NextResponse.json({ 
        error: "Missing required fields: either resumeId (for reoptimization) or fileUrl/rawText (for new optimization)" 
      }, { status: 400 });
    }

    // Determine if this is a reoptimization request
    const isReoptimization = !!resumeId;

    // Handle reoptimization flow
    if (isReoptimization) {
      console.log(`Reoptimizing resume ${resumeId} for user ${userId}`);
      
      const result = await reoptimizeResume(
        resumeId,
        userId,
        appliedKeywords,
        appliedSuggestions
      );
      
      return NextResponse.json(result);
    }

    // Handle new optimization flow
    console.log(`New optimization for user ${userId}`);
    
    // Get text content from file or rawText
    let resumeText = '';
    let fileSize: number | null = null;

    if (fileUrl) {
      // Extract text from uploaded file
      const extractionResult = await extractTextFromFile(fileUrl);
      
      if (extractionResult.error) {
        return NextResponse.json({ 
          error: `Failed to extract text: ${extractionResult.error.message}` 
        }, { status: 500 });
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
      return NextResponse.json({ 
        error: "Text is too short to process (minimum 50 characters required)" 
      }, { status: 400 });
    }

    // Detect language
    const language = await detectLanguage(resumeText);
    console.log(`Detected language: ${language}`);

    // Optimize resume with cascade of AI services
    let optimizationResult: OptimizationResult;
    
    try {
      optimizationResult = await optimizeResume(resumeText, language);
      console.log(`Optimization successful using ${optimizationResult.provider}`);
    } catch (error: any) {
      console.error("All optimization attempts failed, using fallback:", error);
      
      // Generate a fallback optimization if all services fail
      optimizationResult = generateFallbackOptimization(resumeText, language);
      console.log("Generated fallback optimization");
    }

    // Save results to database if user ID is provided
    if (userId) {
      try {
        // Get Supabase admin client
        const supabaseAdmin = getAdminClient();
        
        // Get or create Supabase UUID for user
        const supabaseUserId = await getSupabaseUuid(supabaseAdmin, userId);
        
        // Insert into database
        const { data: resumeData, error } = await supabaseAdmin
          .from('resumes')
          .insert({
            user_id: supabaseUserId,
            auth_user_id: userId,
            supabase_user_id: supabaseUserId,
            original_text: resumeText,
            optimized_text: optimizationResult.optimizedText,
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
        } else if (resumeData) {
          console.log("Resume saved successfully with ID:", resumeData.id);
          optimizationResult.resumeId = resumeData.id;
          
          // Save keywords if present
          if (optimizationResult.keywordSuggestions?.length > 0) {
            const keywordsToInsert = optimizationResult.keywordSuggestions.map((keyword: string) => ({
              resume_id: resumeData.id,
              keyword: keyword,
              is_applied: false
            }));
            
            await supabaseAdmin
              .from('resume_keywords')
              .insert(keywordsToInsert);
          }
          
          // Save suggestions if present
          if (optimizationResult.suggestions?.length > 0) {
            const suggestionsToInsert = optimizationResult.suggestions.map((suggestion: any) => ({
              resume_id: resumeData.id,
              type: suggestion.type || "general",
              text: suggestion.text,
              impact: suggestion.impact,
              is_applied: false
            }));
            
            await supabaseAdmin
              .from('resume_suggestions')
              .insert(suggestionsToInsert);
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

    // Return successful response
    return NextResponse.json({
      success: true,
      ...optimizationResult,
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
    console.error("Unexpected error:", error);
    
    // Clean up temporary file in case of error
    if (tempFilePath) {
      cleanupTempFile(tempFilePath);
    }
    
    // Return error response
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}