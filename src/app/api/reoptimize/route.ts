/**
 * API Route for Resume Reoptimization
 * 
 * This route handles the process of applying selected suggestions and keywords
 * to an existing resume. It uses AI to intelligently integrate these improvements
 * while maintaining the structure and language of the original resume.
 * 
 * The route accepts:
 * - Resume ID for database updates
 * - Selected suggestions to apply
 * - Applied keywords to incorporate
 * - Current resume text
 * - Language of the resume
 * 
 * It returns:
 * - Newly optimized resume text
 * - Updated ATS score
 * - Information about applied changes
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import getResumeReoptimizationPrompt from "@/utils/prompts/promptReoptimization";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { Suggestion } from "@/types/resume";
import { parseAIResponse } from "@/utils/aiResponseParser";
import { prepareOptimizedTextForEditor } from "@/utils/htmlProcessor";

// Initialize AI clients based on available environment variables
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const genAI = process.env.GOOGLE_AI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Configuration for AI models to use
const OPENAI_MODEL = "gpt-4";
const GEMINI_MODEL = "gemini-pro";
const CLAUDE_MODEL = "claude-3-sonnet-20240229";

/**
 * POST handler for resume reoptimization
 * This route processes a request to apply selected suggestions and keywords to a resume
 */
export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { 
      resumeId, 
      selectedSuggestions = [], 
      appliedKeywords = [], 
      currentText, 
      language = "English" 
    } = await req.json();
    
    // Validate required fields
    if (!resumeId) {
      return NextResponse.json(
        { error: "Missing required parameter: resumeId" },
        { status: 400 }
      );
    }
    
    if (!currentText) {
      return NextResponse.json(
        { error: "Missing required parameter: currentText" },
        { status: 400 }
      );
    }
    
    console.log(`Starting reoptimization for resume ID ${resumeId}`);
    console.log(`Selected suggestions: ${selectedSuggestions.length}`);
    console.log(`Applied keywords: ${appliedKeywords.length}`);
    
    // Get Supabase admin client
    const supabaseAdmin = getAdminClient();
    
    // Verify that the resume exists
    const { data: resumeData, error: fetchError } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .single();
    
    if (fetchError) {
      console.error("Error fetching resume:", fetchError);
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }
    
    // Track which AI provider we'll use
    let aiProvider = "openai";
    
    // Attempt reoptimization with available AI providers in order of preference
    let reoptimizationResult = null;
    
    // Prepare typed suggestions array
    const typedSuggestions: Suggestion[] = selectedSuggestions.map((suggestion: any) => ({
      id: suggestion.id || "",
      type: suggestion.type || "general",
      text: suggestion.text || "",
      impact: suggestion.impact || "Improves resume quality",
      isApplied: suggestion.isApplied || false
    }));
    
    // 1. Try with OpenAI first
    if (openai && !reoptimizationResult) {
      try {
        reoptimizationResult = await optimizeWithOpenAI(
          currentText,
          typedSuggestions,
          appliedKeywords,
          language
        );
        aiProvider = "openai";
        console.log("Successfully reoptimized with OpenAI");
      } catch (openAiError) {
        console.error("OpenAI reoptimization failed:", openAiError);
      }
    }
    
    // 2. Try with Gemini if OpenAI failed
    if (genAI && !reoptimizationResult) {
      try {
        reoptimizationResult = await optimizeWithGemini(
          currentText,
          typedSuggestions,
          appliedKeywords,
          language
        );
        aiProvider = "gemini";
        console.log("Successfully reoptimized with Gemini");
      } catch (geminiError) {
        console.error("Gemini reoptimization failed:", geminiError);
      }
    }
    
    // 3. Try with Claude as last resort
    if (anthropic && !reoptimizationResult) {
      try {
        reoptimizationResult = await optimizeWithClaude(
          currentText,
          typedSuggestions,
          appliedKeywords,
          language
        );
        aiProvider = "claude";
        console.log("Successfully reoptimized with Claude");
      } catch (claudeError) {
        console.error("Claude reoptimization failed:", claudeError);
      }
    }
    
    // If all AI providers failed, return error
    if (!reoptimizationResult) {
      throw new Error("All AI providers failed to reoptimize the resume");
    }
    
    // Process optimized text to ensure proper formatting
    const processedText = prepareOptimizedTextForEditor(reoptimizationResult.optimizedText);
    
    // Save to database with the reoptimized content
    const { error: updateError } = await supabaseAdmin
      .from("resumes")
      .update({
        last_saved_text: processedText,
        ats_score: reoptimizationResult.atsScore,
        updated_at: new Date().toISOString(),
        ai_provider: aiProvider
      })
      .eq("id", resumeId);
    
    if (updateError) {
      console.error("Error updating resume:", updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    // Update the suggestion statuses in the database
    if (typedSuggestions.length > 0) {
      try {
        // Create an array of updates for batch processing
        const suggestionUpdates = typedSuggestions.map(suggestion => ({
          resume_id: resumeId,
          id: suggestion.id,
          is_applied: true
        }));
        
        // Batch update suggestions
        const { error: suggestionsError } = await supabaseAdmin
          .from("resume_suggestions")
          .upsert(suggestionUpdates, { onConflict: 'resume_id,id' });
        
        if (suggestionsError) {
          console.warn("Error updating suggestions status:", suggestionsError);
        }
      } catch (suggestionUpdateError) {
        console.warn("Error in suggestion status update:", suggestionUpdateError);
        // Non-critical error, continue execution
      }
    }
    
    // Update the keyword statuses in the database
    if (appliedKeywords.length > 0) {
      try {
        // Create an array of updates for batch processing
        const keywordUpdates = appliedKeywords.map(keyword => ({
          resume_id: resumeId,
          keyword: keyword,
          is_applied: true
        }));
        
        // Batch update keywords
        const { error: keywordsError } = await supabaseAdmin
          .from("resume_keywords")
          .upsert(keywordUpdates, { onConflict: 'resume_id,keyword' });
        
        if (keywordsError) {
          console.warn("Error updating keywords status:", keywordsError);
        }
      } catch (keywordUpdateError) {
        console.warn("Error in keyword status update:", keywordUpdateError);
        // Non-critical error, continue execution
      }
    }
    
    // Return successful response with reoptimized content and metadata
    return NextResponse.json({
      success: true,
      optimizedText: processedText,
      atsScore: reoptimizationResult.atsScore,
      appliedSuggestions: reoptimizationResult.appliedSuggestions || [],
      appliedKeywords: reoptimizationResult.appliedKeywords || [],
      improvements: reoptimizationResult.improvements || "",
      aiProvider
    });
    
  } catch (error: any) {
    // Handle any unexpected errors
    console.error("Unexpected reoptimization error:", error);
    
    return NextResponse.json(
      { 
        error: error.message || "An unexpected error occurred during resume reoptimization",
        success: false
      },
      { status: 500 }
    );
  }
}

/**
 * Optimize a resume with OpenAI
 * 
 * @param resumeText - Current resume text
 * @param selectedSuggestions - Suggestions to apply
 * @param appliedKeywords - Keywords to incorporate
 * @param language - Language of the resume
 * @returns Reoptimization result object
 */
async function optimizeWithOpenAI(
  resumeText: string,
  selectedSuggestions: Suggestion[],
  appliedKeywords: string[],
  language: string
): Promise<any> {
  if (!openai) {
    throw new Error("OpenAI client not initialized");
  }
  
  // Get the prompts for reoptimization
  const { systemPrompt, userPrompt } = getResumeReoptimizationPrompt(
    resumeText,
    selectedSuggestions,
    appliedKeywords,
    language,
    "openai"
  );
  
  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.5,
    max_tokens: 4000
  });
  
  // Extract and parse the response
  const content = completion.choices[0].message.content || "";
  return parseAIResponse(content, resumeText);
}

/**
 * Optimize a resume with Google Gemini
 * 
 * @param resumeText - Current resume text
 * @param selectedSuggestions - Suggestions to apply
 * @param appliedKeywords - Keywords to incorporate
 * @param language - Language of the resume
 * @returns Reoptimization result object
 */
async function optimizeWithGemini(
  resumeText: string,
  selectedSuggestions: Suggestion[],
  appliedKeywords: string[],
  language: string
): Promise<any> {
  if (!genAI) {
    throw new Error("Gemini client not initialized");
  }
  
  // Get the prompts for reoptimization
  const { systemPrompt, userPrompt } = getResumeReoptimizationPrompt(
    resumeText,
    selectedSuggestions,
    appliedKeywords,
    language,
    "gemini"
  );
  
  // Initialize Gemini model
  const geminiModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  
  // Combine prompts for Gemini (as it doesn't have separate system/user)
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  // Call Gemini API
  const geminiResponse = await geminiModel.generateContent(combinedPrompt);
  const geminiText = geminiResponse.response.text();
  
  // Parse and validate the response
  return parseAIResponse(geminiText, resumeText);
}

/**
 * Optimize a resume with Anthropic Claude
 * 
 * @param resumeText - Current resume text
 * @param selectedSuggestions - Suggestions to apply
 * @param appliedKeywords - Keywords to incorporate
 * @param language - Language of the resume
 * @returns Reoptimization result object
 */
async function optimizeWithClaude(
  resumeText: string,
  selectedSuggestions: Suggestion[],
  appliedKeywords: string[],
  language: string
): Promise<any> {
  if (!anthropic) {
    throw new Error("Claude client not initialized");
  }
  
  // Get the prompts for reoptimization
  const { systemPrompt, userPrompt } = getResumeReoptimizationPrompt(
    resumeText,
    selectedSuggestions,
    appliedKeywords,
    language,
    "claude"
  );
  
  // Call Claude API
  const claudeCompletion = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    temperature: 0.5,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt }
    ]
  });
  
  // Extract the response text
  const claudeText = claudeCompletion.content[0].text;
  
  // Parse and validate the response
  return parseAIResponse(claudeText, resumeText);
}