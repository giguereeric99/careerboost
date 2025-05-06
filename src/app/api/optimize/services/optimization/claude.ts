/**
 * Claude Optimization Service
 * 
 * This service handles resume optimization using Anthropic's Claude models.
 * It manages:
 * 1. Prompt construction specific to Claude
 * 2. Response parsing and validation
 * 3. Error handling and retry logic
 * 
 * Claude is used as the second fallback if both OpenAI and Gemini fail,
 * still providing high-quality results.
 */

import Anthropic from '@anthropic-ai/sdk';
import { OptimizationResult, OptimizationOptions } from '../../types';
import { getProviderConfig } from '../../config/providers';
import getResumeOptimizationPrompt from '@/utils/prompts/resumeOptimizationPrompt';

// Claude API client
let anthropic: Anthropic | null = null;

/**
 * Initialize Claude client with API key
 */
function initializeClaude(): Anthropic {
  if (anthropic) return anthropic;
  
  try {
    const config = getProviderConfig().claude;
    
    if (!config.apiKey) {
      throw new Error('Claude API key is not configured');
    }
    
    anthropic = new Anthropic({
      apiKey: config.apiKey
    });
    
    return anthropic;
  } catch (error) {
    console.error('Failed to initialize Claude client:', error);
    throw new Error('Failed to initialize Claude client');
  }
}

/**
 * Optimize resume using Claude
 * 
 * @param resumeText - Original resume text
 * @param language - Language of the resume
 * @param options - Optimization options
 * @returns Optimization result
 */
export async function optimizeWithClaude(
  resumeText: string,
  language: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  try {
    // Initialize Claude client
    const client = initializeClaude();
    const config = getProviderConfig().claude;
    
    // Get standardized prompts for Claude
    const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(
      resumeText,
      'claude',
      { language, ...options }
    );
    
    console.log(`[Claude] Optimizing resume with ${config.model}`);
    
    // Execute with retry logic
    const responseText = await withRetry(
      async () => {
        const response = await client.messages.create({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        });
        
        // Extract the text content from the response
        return response.content[0].text;
      },
      config.retries
    );
    
    // Parse the result
    const optimizationResult = parseClaudeResponse(responseText, resumeText);
    console.log(`[Claude] Successfully optimized resume`);
    
    return optimizationResult;
  } catch (error: any) {
    console.error('[Claude] Optimization error:', error);
    throw new Error(`Claude optimization failed: ${error.message}`);
  }
}

/**
 * Parse the Claude response into a structured optimization result
 * 
 * @param responseText - Raw response from Claude
 * @param originalText - Original resume text (for fallback)
 * @returns Parsed optimization result
 */
function parseClaudeResponse(responseText: string, originalText: string): OptimizationResult {
  try {
    // Remove markdown code block formatting if present
    let jsonContent = responseText.trim();
    
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    // Try direct JSON parsing
    let parsedResult = JSON.parse(jsonContent);
    
    // Return the parsed result if it has the expected structure
    if (parsedResult && parsedResult.optimizedText) {
      // Ensure optimized text is substantial
      if (parsedResult.optimizedText.length < 200) {
        console.warn("[Claude] Optimized text is too short, using fallback");
        parsedResult.optimizedText = originalText;
      }
      
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
    console.error("[Claude] Failed to parse JSON response:", jsonError);
    
    // Try to extract JSON with regex if direct parsing fails
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        return parseClaudeResponse(extractedJson, originalText);
      }
    } catch (extractError) {
      console.error("[Claude] Failed to extract JSON from response:", extractError);
    }
  }
  
  // If all parsing fails, use the response as the optimized text
  console.warn("[Claude] Returning raw text with generated suggestions");
  
  return {
    optimizedText: responseText.length > 200 ? responseText : originalText,
    suggestions: [],
    keywordSuggestions: [],
    atsScore: 65,
    provider: 'claude'
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
  maxRetries: number = 1,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // First attempt (attempt = 0) has no delay
      if (attempt > 0) {
        // Calculate delay with exponential backoff
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`[Claude] Retry ${attempt}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Execute the function
      return await fn();
    } catch (error) {
      console.warn(`[Claude] Attempt ${attempt} failed:`, error);
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