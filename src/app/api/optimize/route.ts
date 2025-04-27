/**
 * API Route for Resume Optimization
 * This route handles the optimization of resumes using AI services
 * It processes uploaded files or raw text, optimizes with OpenAI,
 * and stores the results in Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

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
  "gpt-4", // Most widely available model
  "gpt-3.5-turbo" // Fallback option
];

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
 * @param prompt - The optimization prompt
 * @returns The optimization result or null if failed
 */
async function tryOptimizeWithOpenAI(prompt: string): Promise<any | null> {
  try {
    console.log("Attempting resume optimization with OpenAI");
    
    // Try each OpenAI model in order until one works
    for (const model of OPENAI_MODELS) {
      try {
        console.log(`Trying OpenAI model: ${model}`);
        
        // Create the completion request with clear JSON instructions
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content: `You are an expert resume optimizer who helps improve resumes for ATS compatibility and recruiter appeal.
              
              IMPORTANT: Your response must be formatted as a valid JSON object with these fields:
              {
                "optimizedText": "The full improved resume content with better formatting",
                "suggestions": [
                  {"type": "section", "text": "what to improve", "impact": "why this helps"}
                ],
                "keywordSuggestions": ["keyword1", "keyword2", ...],
                "atsScore": number from 0-100
              }
              
              Do not include ANY explanatory text, code blocks, or other content outside the JSON structure.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        });
        
        // Extract the response content
        const content = completion.choices[0].message.content || "";
        console.log("OpenAI raw response:", content.substring(0, 100) + "...");
        
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
            throw new Error("Could not extract valid JSON from OpenAI response");
          }
          
          // Clean potential control characters that might break JSON parsing
          const cleanJson = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
          result = JSON.parse(cleanJson);
        }
        
        // Validate that all required fields are present
        if (!result.optimizedText) {
          throw new Error("OpenAI response missing optimizedText field");
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
 * @param prompt - The optimization prompt
 * @returns The optimization result or null if failed
 */
async function tryOptimizeWithGemini(prompt: string): Promise<any | null> {
  try {
    // Skip if Gemini API is not configured
    if (!genAI) {
      console.warn("Skipping Gemini optimization: API key not configured");
      return null;
    }
    
    console.log("Attempting resume optimization with Google Gemini");
    
    // Create Gemini model
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Craft a prompt optimized for JSON output
    const geminiPrompt = `
      ${prompt}
      
      IMPORTANT: Your response must be ONLY a valid JSON object with these exact fields:
      {
        "optimizedText": "full optimized resume content",
        "suggestions": [
          {"type": "section", "text": "suggestion text", "impact": "reason"}
        ],
        "keywordSuggestions": ["keyword1", "keyword2", "keyword3"],
        "atsScore": 75
      }
      
      Do not include any explanations, markdown formatting, or text outside the JSON.
    `;
    
    // Get Gemini response
    const geminiResponse = await geminiModel.generateContent(geminiPrompt);
    const geminiText = geminiResponse.response.text();
    
    // Try to parse response as JSON
    let result;
    try {
      result = JSON.parse(geminiText);
    } catch (jsonError) {
      console.log("Initial Gemini JSON parsing failed, trying to extract JSON structure");
      
      // Try to extract JSON by finding matching braces
      const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract valid JSON from Gemini response");
      }
      
      // Parse the extracted JSON
      result = JSON.parse(jsonMatch[0]);
    }
    
    // Validate the result has required fields
    if (!result.optimizedText) {
      throw new Error("Gemini response missing optimizedText field");
    }
    
    // Ensure all fields exist
    result.suggestions = result.suggestions || [];
    result.keywordSuggestions = result.keywordSuggestions || [];
    result.atsScore = typeof result.atsScore === 'number' ? result.atsScore : 65;
    
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
 * @param prompt - The optimization prompt
 * @returns The optimization result or throws if failed
 */
async function tryOptimizeWithClaude(prompt: string): Promise<any> {
  console.log("Attempting resume optimization with Anthropic Claude");
  
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === '') {
      throw new Error("Anthropic API key not configured");
    }
    
    // Craft a clear system prompt for Claude
    const claudeSystemPrompt = `You are an expert resume optimizer who improves resumes for ATS compatibility and recruiter appeal.
    
    Your task is to return ONLY valid JSON with these fields:
    - optimizedText: The full improved resume text
    - suggestions: Array of objects with type, text, and impact fields
    - keywordSuggestions: Array of relevant industry keywords
    - atsScore: A number from 0-100 for ATS compatibility
    
    Your response must be a valid JSON object with NO other text or explanations.`;
    
    // Send request to Claude
    const claudeCompletion = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4000,
      temperature: 0.5,
      system: claudeSystemPrompt,
      messages: [
        {
          role: "user",
          content: `${prompt}
          
          IMPORTANT: Respond ONLY with a valid JSON object and nothing else.`
        }
      ]
    });

    // Get the response text
    const claudeText = claudeCompletion.content[0].text;
    
    // Clean up the response if it contains code blocks
    let jsonContent = claudeText.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    // Try to parse the JSON
    let result;
    try {
      result = JSON.parse(jsonContent);
    } catch (parseError) {
      console.log("Initial Claude JSON parsing failed, trying to extract JSON structure");
      
      // Try to find JSON structure in the text
      const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract valid JSON from Claude response");
      }
      
      // Clean and parse the JSON
      const cleanJson = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      result = JSON.parse(cleanJson);
    }
    
    // Validate the result has required fields
    if (!result.optimizedText) {
      throw new Error("Claude response missing optimizedText field");
    }
    
    // Ensure all fields exist
    result.suggestions = result.suggestions || [];
    result.keywordSuggestions = result.keywordSuggestions || [];
    result.atsScore = typeof result.atsScore === 'number' ? result.atsScore : 65;
    
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
  try {
    // Extract data from the request
    const formData = await req.formData();
    const userId = formData.get("userId") as string;
    const rawText = formData.get("rawText") as string;
    const fileUrl = formData.get("fileUrl") as string;
    const fileName = formData.get("fileName") as string;
    const fileType = formData.get("fileType") as string;
    
    // Validate required fields
    if (!userId || (!rawText && !fileUrl)) {
      return NextResponse.json({ 
        error: "Missing required fields: userId and either rawText or fileUrl" 
      }, { status: 400 });
    }
    
    // Use text from input or placeholder for file upload
    const resumeText = rawText || "Resume content extracted from file";
    
    // Detect language of resume text
    const language = await detectLanguage(resumeText);
    console.log("Detected language:", language);
    
    // Create optimization prompt
    const prompt = `Optimize this resume in ${language} to improve its ATS score and appeal to recruiters.
    
    Resume content:
    ${resumeText.substring(0, 6000)}
    
    Please improve this resume to:
    1. Enhance its structure and formatting
    2. Use more powerful language and action verbs
    3. Highlight key achievements and skills
    4. Increase its compatibility with Applicant Tracking Systems (ATS)
    
    Return these outputs in JSON format:
    - optimizedText: The complete improved resume
    - suggestions: Specific improvements (what to change and why)
    - keywordSuggestions: Industry-relevant keywords for this resume
    - atsScore: A score from 0-100 indicating ATS compatibility`;
    
    // Try optimization with OpenAI first (with retry)
    let result, aiProvider;
    let optimizationSuccess = false;
    
    try {
      console.log("Starting optimization process with OpenAI...");
      const openAiResult = await withRetry(() => tryOptimizeWithOpenAI(prompt));
      
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
        const geminiResult = await withRetry(() => tryOptimizeWithGemini(prompt));
        
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
        const claudeResult = await tryOptimizeWithClaude(prompt);
        
        if (claudeResult) {
          result = claudeResult.result;
          aiProvider = claudeResult.provider;
          optimizationSuccess = true;
          console.log("Successfully optimized with Claude or fallback");
        }
      } catch (claudeError) {
        console.error("All optimization providers failed");
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
      const { data: resumeData, error: resumeError } = await supabaseAdmin
        .from('resumes')
        .insert({
          user_id: userId,
          auth_user_id: userId,
          original_text: resumeText,
          optimized_text: result.optimizedText,
          language: language,
          ats_score: result.atsScore || 65,
          file_url: fileUrl || null,
          file_name: fileName || null,
          file_type: fileType || null,
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
    // Handle any unexpected errors
    console.error("Unexpected optimization error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during resume optimization" },
      { status: 500 }
    );
  }
}