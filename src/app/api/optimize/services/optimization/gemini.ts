/**
 * Gemini Optimization Service
 * 
 * This service handles resume optimization using Google's Gemini AI models.
 * It manages:
 * 1. Prompt construction specific to Gemini
 * 2. Response parsing and validation
 * 3. Error handling and retry logic
 * 
 * Gemini is used as the first fallback if OpenAI fails, offering good
 * quality results with potentially better pricing.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { OptimizationResult, OptimizationOptions } from '../../types';
import { getProviderConfig } from '../../config/providers';
import getResumeOptimizationPrompt from '@/utils/prompts/resumeOptimizationPrompt';

// Gemini API client
let genAI: GoogleGenerativeAI | null = null;

// Safety settings to ensure appropriate content generation
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Initialize Gemini client with API key
 */
function initializeGemini(): GoogleGenerativeAI {
  if (genAI) return genAI;
  
  try {
    const config = getProviderConfig().gemini;
    
    if (!config.apiKey) {
      throw new Error('Gemini API key is not configured');
    }
    
    genAI = new GoogleGenerativeAI(config.apiKey);
    return genAI;
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    throw new Error('Failed to initialize Gemini client');
  }
}

/**
 * Optimize resume using Gemini
 * 
 * @param resumeText - Original resume text
 * @param language - Language of the resume
 * @param options - Optimization options
 * @returns Optimization result
 */
export async function optimizeWithGemini(
  resumeText: string,
  language: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  try {
    // Initialize Gemini client
    const client = initializeGemini();
    const config = getProviderConfig().gemini;
    
    // Get standardized prompts for Gemini
    const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(
      resumeText,
      'gemini',
      { language, ...options }
    );
    
    // Configuration for the Gemini model generation
    const generationConfig = {
      temperature: config.temperature,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: config.maxTokens,
    };
    
    // Combine prompts for Gemini (as it doesn't have separate system/user)
    const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
    
    console.log(`[Gemini] Optimizing resume with ${config.model}`);
    
    // Execute with retry logic
    const responseText = await withRetry(
      async () => {
        const model = client.getGenerativeModel({ 
          model: config.model,
          generationConfig,
          safetySettings: SAFETY_SETTINGS,
        });
        
        const response = await model.generateContent(combinedPrompt);
        return response.response.text();
      },
      config.retries
    );
    
    // Parse the result
    const optimizationResult = parseGeminiResponse(responseText, resumeText);
    console.log(`[Gemini] Successfully optimized resume`);
    
    return optimizationResult;
  } catch (error: any) {
    console.error('[Gemini] Optimization error:', error);
    throw new Error(`Gemini optimization failed: ${error.message}`);
  }
}

/**
 * Parse the Gemini response into a structured optimization result
 * 
 * @param responseText - Raw response from Gemini
 * @param originalText - Original resume text (for fallback)
 * @returns Parsed optimization result
 */
function parseGeminiResponse(responseText: string, originalText: string): OptimizationResult {
  try {
    // Try direct JSON parsing
    let parsedResult = JSON.parse(responseText);
    
    // Return the parsed result if it has the expected structure
    if (parsedResult && parsedResult.optimizedText) {
      // Ensure suggestions is an array with 1-5 elements
      if (!parsedResult.suggestions || !Array.isArray(parsedResult.suggestions)) {
        parsedResult.suggestions = [];
      } else if (parsedResult.suggestions.length > 5) {
        parsedResult.suggestions = parsedResult.suggestions.slice(0, 5);
      }
      
      // Ensure keywordSuggestions is an array with 1-10 elements
      if (!parsedResult.keywordSuggestions || !Array.isArray(parsedResult.keywordSuggestions)) {
        parsedResult.keywordSuggestions = [];
      } else if (parsedResult.keywordSuggestions.length > 10) {
        parsedResult.keywordSuggestions = parsedResult.keywordSuggestions.slice(0, 10);
      }
      
      // Ensure atsScore is a number between 0-100
      if (typeof parsedResult.atsScore !== 'number' || parsedResult.atsScore < 0 || parsedResult.atsScore > 100) {
        parsedResult.atsScore = 65;
      }
      
      return parsedResult;
    }
  } catch (jsonError) {
    console.error('[Gemini] Failed to parse JSON response:', jsonError);
    
    // Try to extract JSON by finding text between curly braces
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        return parseGeminiResponse(extractedJson, originalText);
      }
    } catch (extractError) {
      console.error('[Gemini] Failed to extract JSON from response:', extractError);
    }
  }
  
  // If all parsing fails, return a minimal valid structure with the original text
  console.warn('[Gemini] Returning fallback result');
  
  return {
    optimizedText: responseText.length > 100 ? responseText : originalText,
    suggestions: [],
    keywordSuggestions: [],
    atsScore: 65,
    provider: 'gemini'
  };
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay before first retry (ms)
 * @returns Result of the function
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // First attempt (attempt = 0) has no delay
      if (attempt > 0) {
        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`[Gemini] Retry ${attempt}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Execute the function
      return await fn();
    } catch (error) {
      console.warn(`[Gemini] Attempt ${attempt} failed:`, error);
      lastError = error;
      
      // Don't wait after the last attempt
      if (attempt === maxRetries) {
        break;
      }
    }
  }
  
  // All attempts failed
  throw lastError;
}