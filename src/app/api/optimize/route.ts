/**
 * API Route for Resume Optimization
 * This route handles the complete resume optimization workflow:
 * 1. Processing uploaded files or raw text
 * 2. Extracting text content from files
 * 3. Optimizing with AI services (OpenAI, Gemini, Claude)
 * 4. Storing results in Supabase with proper UUID handling
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import getResumeOptimizationPrompt from "@/utils/prompts/resumeOptimizationPrompt";
import { extractText } from "@/utils/processResume";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Google Gemini API (conditional on having a key)
const geminiApiKey = process.env.GOOGLE_AI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// Initialize Anthropic client for Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Available models for each provider, in order of preference
const OPENAI_MODELS = [
  // "gpt-4", // Most widely available model
  "gpt-3.5-turbo" // Fallback option
];

/**
 * Gets or creates a Supabase UUID for a Clerk user ID
 * Resolves the issue with Clerk IDs not being valid UUIDs
 * 
 * @param supabaseAdmin - Supabase admin client
 * @param clerkUserId - Clerk user ID (starting with "user_")
 * @returns A valid Supabase UUID for the user
 */
async function getOrCreateSupabaseUuid(supabaseAdmin: any, clerkUserId: string): Promise<string> {
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
}

/**
 * Downloads a file from a URL and saves it to a temporary location
 * 
 * @param fileUrl - URL of the file to download
 * @returns Object containing the file path, size, and any error
 */
async function downloadFileFromUrl(fileUrl: string): Promise<{
  path: string | null;
  size: number | null;
  error: Error | null;
}> {
  let tempFilePath: string | null = null;
  
  try {
    console.log("Downloading file from:", fileUrl);
    
    // Fetch the file from the URL
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    // Get file content as buffer
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    const fileSize = fileBuffer.length;
    
    // Create temp directory if it doesn't exist
    fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
    
    // Extract filename from URL and preserve extension
    const urlParts = fileUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const ext = path.extname(fileName) || ".pdf";
    
    // Create a unique temp filename
    tempFilePath = path.join(process.cwd(), "tmp", `resume-${Date.now()}${ext}`);
    
    // Write file to temp location
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    console.log(`File downloaded to ${tempFilePath}, size: ${fileSize} bytes`);
    
    return {
      path: tempFilePath,
      size: fileSize,
      error: null
    };
  } catch (error: any) {
    console.error("Error downloading file:", error);
    return {
      path: null,
      size: null,
      error
    };
  }
}

/**
 * Cleans up temporary files created during processing
 * 
 * @param filePath - Path to the temporary file
 */
function cleanupTempFile(filePath: string | null): void {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log("Cleaned up temporary file:", filePath);
    } catch (error) {
      console.error("Error cleaning up temporary file:", error);
    }
  }
}

/**
 * Detects the language of the given text using OpenAI
 * 
 * @param text - Text to analyze
 * @returns The detected language or "English" as default
 */
async function detectLanguage(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a language detection service. Return only the language name."
        },
        {
          role: "user",
          content: `Detect the language of the following text and respond only with the language name (e.g., "English", "French", "Spanish"):\n\n${text.substring(0, 500)}`
        }
      ],
      max_tokens: 10
    });
    
    return response.choices[0].message.content?.trim() || "English";
  } catch (error) {
    console.error("Language detection failed:", error);
    return "English"; // Default to English if detection fails
  }
}

/**
 * Tries to optimize a resume with OpenAI
 * Includes fallback mechanisms and robust error handling
 * 
 * @param resumeText - The resume text to optimize
 * @param language - The detected language of the resume
 * @returns The optimization result or null if failed
 */
async function tryOptimizeWithOpenAI(resumeText: string, language: string): Promise<any | null> {
  try {
    console.log("Attempting resume optimization with OpenAI");
    
    // Try each OpenAI model in order until one works
    for (const model of OPENAI_MODELS) {
      try {
        console.log(`Trying OpenAI model: ${model}`);
        
        // Get standardized prompts for OpenAI
        const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(
          resumeText,
          'openai',
          { language }
        );
        
        // Create the completion request with our standardized prompts
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          temperature: 0.7
        });
        
        // Extract the response content
        const content = completion.choices[0].message.content || "";
        console.log("OpenAI raw response:", content.substring(0, 100) + "...");
        
        // Parse and validate the response
        const result = parseAIResponse(content);
        
        console.log("OpenAI optimization successful with model:", model);
        return { result, provider: "openai" };
      } catch (modelError) {
        console.warn(`Failed with model ${model}:`, modelError.message);
        // Continue to the next model if available
      }
    }
    
    // If we get here, all models failed
    console.error("All OpenAI models failed");
    return null;
  } catch (openaiError) {
    console.error("OpenAI optimization failed:", openaiError);
    return null;
  }
}

/**
 * Tries to optimize a resume with Google Gemini
 * Only used as fallback if OpenAI fails
 * 
 * @param resumeText - The resume text to optimize
 * @param language - The detected language of the resume
 * @returns The optimization result or null if failed
 */
async function tryOptimizeWithGemini(resumeText: string, language: string): Promise<any | null> {
  try {
    // Skip if Gemini API is not configured
    if (!genAI) {
      console.warn("Skipping Gemini optimization: API key not configured");
      return null;
    }
    
    console.log("Attempting resume optimization with Google Gemini");
    
    // Create Gemini model
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Get standardized prompts for Gemini
    const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(
      resumeText,
      'gemini',
      { language }
    );
    
    // Combine prompts for Gemini (as it doesn't have separate system/user)
    const geminiPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    // Get Gemini response
    const geminiResponse = await geminiModel.generateContent(geminiPrompt);
    const geminiText = geminiResponse.response.text();
    
    // Parse and validate the response
    const result = parseAIResponse(geminiText);
    
    console.log("Gemini optimization successful");
    return { result, provider: "gemini" };
  } catch (geminiError) {
    console.error("Gemini optimization failed:", geminiError);
    return null;
  }
}

/**
 * Tries to optimize a resume with Anthropic Claude
 * Used as final fallback if both OpenAI and Gemini fail
 * 
 * @param resumeText - The resume text to optimize
 * @param language - The detected language of the resume
 * @returns The optimization result or throws if failed
 */
async function tryOptimizeWithClaude(resumeText: string, language: string): Promise<any> {
  console.log("Attempting resume optimization with Anthropic Claude");
  
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === '') {
      throw new Error("Anthropic API key not configured");
    }
    
    // Get standardized prompts for Claude
    const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(
      resumeText,
      'claude',
      { language }
    );
    
    // Send request to Claude
    const claudeCompletion = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    // Get the response text
    const claudeText = claudeCompletion.content[0].text;
    
    // Parse and validate the response
    const result = parseAIResponse(claudeText);
    
    console.log("Claude optimization successful");
    return { result, provider: "claude" };
  } catch (claudeError) {
    console.error("Claude optimization failed:", claudeError);
    
    // Create a minimal fallback result to avoid complete failure
    return {
      result: {
        optimizedText: "Could not generate optimized text. Please try again later.",
        suggestions: [],
        keywordSuggestions: [],
        atsScore: 50
      },
      provider: "fallback"
    };
  }
}

/**
 * Helper function to parse and validate AI response JSON
 * Handles different formats and ensures all required fields exist
 * 
 * @param content - Raw response text from AI service
 * @returns Parsed and validated JSON object
 */
function parseAIResponse(content: string): any {
  // Try to parse the response as JSON
  let result;
  try {
    // First try direct parsing
    result = JSON.parse(content);
  } catch (jsonError) {
    console.log("Initial JSON parsing failed, trying to extract JSON structure");
    
    // Try to extract JSON by finding matching braces
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract valid JSON from AI response");
    }
    
    // Clean potential control characters that might break JSON parsing
    const cleanJson = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    result = JSON.parse(cleanJson);
  }
  
  // Validate that all required fields are present
  if (!result.optimizedText) {
    throw new Error("AI response missing optimizedText field");
  }
  
  // Ensure suggestions is an array (even if empty)
  if (!result.suggestions || !Array.isArray(result.suggestions)) {
    result.suggestions = [];
  }
  
  // Ensure keywordSuggestions is an array (even if empty)
  if (!result.keywordSuggestions || !Array.isArray(result.keywordSuggestions)) {
    result.keywordSuggestions = [];
  }
  
  // Ensure atsScore is a number between 0-100
  if (typeof result.atsScore !== 'number' || result.atsScore < 0 || result.atsScore > 100) {
    result.atsScore = 65; // Default fallback score
  }
  
  // Limit suggestions to a reasonable number (1-5)
  if (result.suggestions.length > 5) {
    result.suggestions = result.suggestions.slice(0, 5);
  }
  
  // Limit keywords to a reasonable number (1-10)
  if (result.keywordSuggestions.length > 10) {
    result.keywordSuggestions = result.keywordSuggestions.slice(0, 10);
  }
  
  return result;
}

/**
 * Retries a function with backoff to handle transient errors
 * 
 * @param fn - The function to retry
 * @param retries - Number of retries
 * @param delay - Initial delay in ms
 * @returns Result of the function
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${attempt + 1}/${retries} failed:`, error);
      lastError = error;
      
      if (attempt < retries - 1) {
        // Wait before next retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
}

/**
 * POST handler for resume optimization
 * Processes the request, optimizes the resume with AI, and stores results
 */
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    // Extract data from the request
    const formData = await req.formData();
    const userId = formData.get("userId") as string;
    const rawText = formData.get("rawText") as string;
    const fileUrl = formData.get("fileUrl") as string;
    const fileName = formData.get("fileName") as string || null;
    const fileType = formData.get("fileType") as string || null;
    
    // Validate required fields
    if (!userId || (!rawText && !fileUrl)) {
      return NextResponse.json({ 
        error: "Missing required fields: userId and either rawText or fileUrl" 
      }, { status: 400 });
    }
    
    // Process file if URL is provided
    let resumeText = rawText;
    let fileSize: number | null = null;
    
    if (fileUrl && !rawText) {
      console.log("Processing file from URL:", fileUrl);
      
      // Download file
      const downloadResult = await downloadFileFromUrl(fileUrl);
      
      if (downloadResult.error) {
        return NextResponse.json({ 
          error: `Failed to download file: ${downloadResult.error.message}` 
        }, { status: 500 });
      }
      
      tempFilePath = downloadResult.path;
      fileSize = downloadResult.size;
      
      if (!tempFilePath) {
        return NextResponse.json({ 
          error: "Failed to save file temporarily" 
        }, { status: 500 });
      }
      
      // Extract text from file
      try {
        resumeText = await extractText(tempFilePath);
        console.log("Successfully extracted text, length:", resumeText.length);
        
        // Validate extracted text
        if (!resumeText || resumeText.length < 50) {
          return NextResponse.json({ 
            error: "Extracted text is too short or empty. Please upload a different file or provide raw text." 
          }, { status: 400 });
        }
      } catch (extractError: any) {
        return NextResponse.json({ 
          error: `Failed to extract text from file: ${extractError.message}` 
        }, { status: 500 });
      }
    }
    
    // Detect language of resume text
    const language = await detectLanguage(resumeText);
    console.log("Detected language:", language);
    
    // Try optimization with OpenAI first (with retry)
    let result, aiProvider;
    let optimizationSuccess = false;
    
    try {
      console.log("Starting optimization process with OpenAI...");
      const openAiResult = await withRetry(() => tryOptimizeWithOpenAI(resumeText, language));
      
      if (openAiResult) {
        result = openAiResult.result;
        aiProvider = openAiResult.provider;
        optimizationSuccess = true;
        console.log("Successfully optimized with OpenAI");
      }
    } catch (openAiError) {
      console.log("All OpenAI attempts failed, trying Gemini next");
    }
    
    // If OpenAI fails, try Gemini
    if (!optimizationSuccess) {
      try {
        const geminiResult = await withRetry(() => tryOptimizeWithGemini(resumeText, language));
        
        if (geminiResult) {
          result = geminiResult.result;
          aiProvider = geminiResult.provider;
          optimizationSuccess = true;
          console.log("Successfully optimized with Gemini");
        }
      } catch (geminiError) {
        console.log("All Gemini attempts failed, trying Claude as last resort");
      }
    }
    
    // If both OpenAI and Gemini fail, try Claude
    if (!optimizationSuccess) {
      try {
        const claudeResult = await tryOptimizeWithClaude(resumeText, language);
        
        if (claudeResult) {
          result = claudeResult.result;
          aiProvider = claudeResult.provider;
          optimizationSuccess = true;
          console.log("Successfully optimized with Claude or fallback");
        }
      } catch (claudeError) {
        console.error("All optimization providers failed");
        cleanupTempFile(tempFilePath);
        return NextResponse.json(
          { error: "Failed to optimize resume after trying all available services" },
          { status: 500 }
        );
      }
    }
    
    // Get Supabase admin client
    const supabaseAdmin = getAdminClient();
    let resumeId = null;
    
    // Save to database
    try {
      console.log("Saving optimized resume to database");
      
      // Get or create Supabase UUID for the Clerk user ID
      let supabaseUserId;
      try {
        // Convert Clerk ID to valid Supabase UUID
        supabaseUserId = await getOrCreateSupabaseUuid(supabaseAdmin, userId);
        console.log("Using Supabase UUID:", supabaseUserId, "for Clerk ID:", userId);
      } catch (uuidError) {
        console.error("Error getting Supabase UUID:", uuidError);
        // Fall back to using the Clerk ID directly in this case
        supabaseUserId = userId;
      }
      
      const { data: resumeData, error: resumeError } = await supabaseAdmin
        .from('resumes')
        .insert({
          user_id: supabaseUserId, // Use the Supabase UUID
          auth_user_id: userId,    // Keep the original Clerk ID for reference
          supabase_user_id: supabaseUserId, // Set this field too for consistency
          original_text: resumeText,
          optimized_text: result.optimizedText,
          language: language,
          ats_score: result.atsScore || 65,
          file_url: fileUrl || null,
          file_name: fileName || null,
          file_type: fileType || null,
          file_size: fileSize || null,
          ai_provider: aiProvider
        })
        .select()
        .single();
      
      if (resumeError) {
        console.error("Error saving resume to database:", resumeError);
      } else if (resumeData) {
        console.log("Resume saved successfully with ID:", resumeData.id);
        resumeId = resumeData.id;
        
        // Save keywords if present
        if (result.keywordSuggestions && result.keywordSuggestions.length > 0) {
          const keywordsToInsert = result.keywordSuggestions.map((keyword: string) => ({
            resume_id: resumeData.id,
            keyword: keyword,
            is_applied: false
          }));
          
          const { error: keywordsError } = await supabaseAdmin
            .from('resume_keywords')
            .insert(keywordsToInsert);
          
          if (keywordsError) {
            console.error("Error saving keywords:", keywordsError);
          }
        }
        
        // Save suggestions if present
        if (result.suggestions && result.suggestions.length > 0) {
          const suggestionsToInsert = result.suggestions.map((suggestion: any) => ({
            resume_id: resumeData.id,
            type: suggestion.type || "general",
            text: suggestion.text,
            impact: suggestion.impact,
            is_applied: false
          }));
          
          const { error: suggestionsError } = await supabaseAdmin
            .from('resume_suggestions')
            .insert(suggestionsToInsert);
          
          if (suggestionsError) {
            console.error("Error saving suggestions:", suggestionsError);
          }
        }
      }
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      // Continue to return results even if database operations fail
    }
    
    // Clean up temporary file
    cleanupTempFile(tempFilePath);
    
    // Return successful response with optimization results
    return NextResponse.json({
      resumeId: resumeId || "temp-id",
      optimizedText: result.optimizedText,
      suggestions: result.suggestions || [],
      keywordSuggestions: result.keywordSuggestions || [],
      atsScore: result.atsScore || 65,
      language: language,
      aiProvider: aiProvider
    });
    
  } catch (error: any) {
    // Clean up temporary file in case of error
    cleanupTempFile(tempFilePath);
    
    // Handle any unexpected errors
    console.error("Unexpected optimization error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during resume optimization" },
      { status: 500 }
    );
  }
}