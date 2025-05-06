/**
 * OpenAI Optimization Service
 * 
 * This service handles resume optimization using OpenAI's models.
 * It manages:
 * 1. Model selection (GPT-4 or GPT-3.5-turbo based on availability)
 * 2. Prompt construction for resume optimization
 * 3. Response parsing and validation
 * 4. Retry logic for transient errors
 * 
 * OpenAI typically produces the highest quality results but may be
 * more expensive than other providers.
 */

import { OpenAI } from 'openai';
import { OptimizationResult, OptimizationOptions } from '../../types';
import { getProviderConfig } from '../../config/providers';
import getResumeOptimizationPrompt from '@/utils/prompts/resumeOptimizationPrompt';

// OpenAI API client
let openai: OpenAI | null = null;

// Initialize OpenAI client
function initializeOpenAI(): OpenAI {
  if (openai) return openai;
  
  try {
    const config = getProviderConfig().openai;
    
    if (!config.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    openai = new OpenAI({
      apiKey: config.apiKey
    });
    
    return openai;
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    throw new Error('Failed to initialize OpenAI client');
  }
}

/**
 * Optimize resume using OpenAI
 * 
 * @param resumeText - Original resume text
 * @param language - Language of the resume
 * @param options - Optimization options
 * @returns Optimization result
 */
export async function optimizeWithOpenAI(
  resumeText: string,
  language: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  try {
    // Initialize OpenAI client
    const client = initializeOpenAI();
    const config = getProviderConfig().openai;
    
    // Get standardized prompts for OpenAI
    const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(
      resumeText,
      'openai',
      { language, ...options }
    );
    
    console.log(`[OpenAI] Optimizing resume with ${config.model}`);
    
    // Execute with retry logic
    const result = await withRetry(
      async () => {
        const completion = await client.chat.completions.create({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens
        });
        
        return completion.choices[0].message.content || '';
      },
      config.retries
    );
    
    // Parse the result
    const optimizationResult = parseOpenAIResponse(result, resumeText);
    console.log(`[OpenAI] Successfully optimized resume`);
    
    return optimizationResult;
  } catch (error: any) {
    console.error('[OpenAI] Optimization error:', error);
    throw new Error(`OpenAI optimization failed: ${error.message}`);
  }
}

/**
 * Parse the OpenAI response into a structured optimization result
 * 
 * @param responseText - Raw response from OpenAI
 * @param originalText - Original resume text (for fallback)
 * @returns Parsed optimization result
 */
function parseOpenAIResponse(responseText: string, originalText: string): OptimizationResult {
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
    console.error('[OpenAI] Failed to parse JSON response:', jsonError);
    
    // Try to extract JSON by finding text between curly braces
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        return parseOpenAIResponse(extractedJson, originalText);
      }
    } catch (extractError) {
      console.error('[OpenAI] Failed to extract JSON from response:', extractError);
    }
  }
  
  // If all parsing fails, return a minimal valid structure with the original text
  console.warn('[OpenAI] Returning fallback result');
  
  return {
    optimizedText: responseText.length > 100 ? responseText : originalText,
    suggestions: [],
    keywordSuggestions: [],
    atsScore: 65,
    provider: 'openai'
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
        console.log(`[OpenAI] Retry ${attempt}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Execute the function
      return await fn();
    } catch (error) {
      console.warn(`[OpenAI] Attempt ${attempt} failed:`, error);
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