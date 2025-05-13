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
 * Enhanced with robust error handling and recovery methods
 * 
 * @param responseText - Raw response from OpenAI
 * @param originalText - Original resume text (for fallback)
 * @returns Parsed optimization result
 * @throws Error with 'RETRY_UPLOAD' message when parsing completely fails
 */
function parseOpenAIResponse(responseText: string, originalText: string): OptimizationResult {
  try {
    // Try direct JSON parsing with a try-catch to handle JSON syntax errors
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
      
      // Ensure atsScore is a number between a valid range
      if (typeof parsedResult.atsScore !== 'number' || parsedResult.atsScore < 0 || parsedResult.atsScore > 100) {
        parsedResult.atsScore = 65;
      }
      
      return parsedResult;
    }
  } catch (jsonError) {
    console.error('[OpenAI] Failed to parse JSON response:', jsonError);
    console.error('[OpenAI] Response preview:', responseText.substring(0, 200) + '...');
    
    // ---- ENHANCED RECOVERY ATTEMPT 1: Try to fix common JSON syntax errors ----
    try {
      // Fix common JSON syntax issues
      const fixedJson = fixCommonJsonErrors(responseText);
      if (fixedJson !== responseText) {
        try {
          // Try parsing the fixed JSON
          const fixedResult = JSON.parse(fixedJson);
          if (fixedResult && fixedResult.optimizedText) {
            console.log('[OpenAI] Successfully parsed fixed JSON');
            
            // Ensure proper formatting of recovered fields
            if (!fixedResult.suggestions || !Array.isArray(fixedResult.suggestions)) {
              fixedResult.suggestions = [];
            }
            if (!fixedResult.keywordSuggestions || !Array.isArray(fixedResult.keywordSuggestions)) {
              fixedResult.keywordSuggestions = [];
            }
            if (typeof fixedResult.atsScore !== 'number') {
              fixedResult.atsScore = 65;
            }
            
            return fixedResult;
          }
        } catch (fixError) {
          console.warn('[OpenAI] Failed to parse fixed JSON:', fixError);
        }
      }
    } catch (fixAttemptError) {
      console.error('[OpenAI] Fix JSON attempt failed:', fixAttemptError);
    }
    
    // ---- RECOVERY ATTEMPT 2: Try to extract a valid JSON object ----
    try {
      // Sometimes the AI includes text before or after the JSON
      // This regex tries to find a complete JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        try {
          // Parse the extracted JSON and verify it has the required structure
          const extractedResult = JSON.parse(extractedJson);
          if (extractedResult && extractedResult.optimizedText) {
            console.log('[OpenAI] Successfully extracted valid JSON object');
            // Use our parser again to ensure validation of the extracted result
            return parseOpenAIResponse(extractedJson, originalText);
          }
        } catch (innerError) {
          console.error('[OpenAI] Failed to parse extracted JSON:', innerError);
        }
      }
    } catch (extractError) {
      console.error('[OpenAI] Failed to extract JSON from response:', extractError);
    }
    
    // ---- RECOVERY ATTEMPT 3: Try to balance mismatched brackets ----
    try {
      // Sometimes the JSON is almost valid but has mismatched brackets
      // balanceJsonString attempts to fix this by adding missing closing brackets
      const balancedJson = balanceJsonString(responseText);
      if (balancedJson !== responseText) {
        console.log('[OpenAI] Attempting to parse balanced JSON');
        try {
          const balancedResult = JSON.parse(balancedJson);
          if (balancedResult && balancedResult.optimizedText) {
            console.log('[OpenAI] Successfully parsed balanced JSON');
            // Use our parser again to ensure validation of the balanced result
            return parseOpenAIResponse(JSON.stringify(balancedResult), originalText);
          }
        } catch (balanceError) {
          console.error('[OpenAI] Failed to parse balanced JSON:', balanceError);
        }
      }
    } catch (balanceAttemptError) {
      console.error('[OpenAI] Failed balance attempt:', balanceAttemptError);
    }
    
    // ---- RECOVERY ATTEMPT 4: Extract HTML sections if present ----
    try {
      const sectionPattern = /<section[\s\S]*?<\/section>/g;
      const sectionMatches = responseText.match(sectionPattern);
      
      if (sectionMatches && sectionMatches.length > 0) {
        console.log('[OpenAI] Found HTML sections in response, using directly');
        const htmlContent = sectionMatches.join('\n');
        
        return {
          optimizedText: htmlContent,
          suggestions: [],
          keywordSuggestions: [],
          atsScore: 65,
          provider: 'openai'
        };
      }
    } catch (htmlError) {
      console.error('[OpenAI] Failed to extract HTML sections:', htmlError);
    }
    
    // ---- RECOVERY ATTEMPT 5: If the response looks like a resume, use it directly ----
    // Sometimes the AI just returns the optimized text without JSON structure
    if (responseText.length > 500 && responseText.includes('\n')) {
      console.warn('[OpenAI] Using raw response as optimized text');
      return {
        optimizedText: responseText,
        suggestions: [],
        keywordSuggestions: [],
        atsScore: 65,
        provider: 'openai'
      };
    }
    
    // If all recovery attempts failed and original text is too short, 
    // ask user to retry uploading the file
    if (!originalText || originalText.length < 100) {
      console.error('[OpenAI] Original text too short, requesting retry');
      throw new Error('RETRY_UPLOAD');
    }
  }
  
  // If all parsing attempts have failed but we have usable original text,
  // throw a specific error to indicate the user should try uploading again
  // We use a 75% probability to give the user a chance to try again for better results
  if (Math.random() < 0.75) {
    console.error('[OpenAI] All parsing attempts failed, requesting retry');
    throw new Error('RETRY_UPLOAD');
  }
  
  // As a last resort (25% of cases), return a fallback with the original text
  // This prevents endless retries if there's a persistent issue
  console.warn('[OpenAI] Returning fallback result with original text');
  return {
    optimizedText: originalText,
    suggestions: [],
    keywordSuggestions: [],
    atsScore: 65,
    provider: 'openai'
  };
}

/**
 * Fix common JSON syntax errors
 * This function applies a series of replacements to fix the most common JSON issues
 * 
 * @param json - The potentially malformed JSON string
 * @returns A corrected JSON string that may be parseable
 */
function fixCommonJsonErrors(json: string): string {
  let fixed = json;
  
  // 1. Fix trailing commas (very common error from AI)
  fixed = fixed.replace(/,(\s*[\]}])/g, '$1');
  
  // 2. Fix missing commas between array items and object properties
  fixed = fixed.replace(/}(\s*){/g, '},\n$1{');
  fixed = fixed.replace(/](\s*)\[/g, '],\n$1[');
  
  // 3. Make sure all property names are quoted
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
  
  // 4. Remove any extra comma after the last property in an object
  fixed = fixed.replace(/,(\s*})/g, '$1');
  
  // 5. Fix incorrect escape sequences
  fixed = fixed.replace(/\\([^"\\/bfnrtu])/g, '\\\\$1');
  
  // 6. Fix unescaped quotes within strings
  // This is a complex problem, simplified approach:
  let inString = false;
  let result = '';
  let escaped = false;
  
  try {
    // This is a basic approach that may not catch all issues
    // but should help with some common cases
    for (let i = 0; i < fixed.length; i++) {
      const char = fixed[i];
      
      if (char === '\\' && !escaped) {
        escaped = true;
        result += char;
        continue;
      }
      
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      
      result += char;
      escaped = false;
    }
    
    // If we somehow ended up still in a string, close it
    if (inString) {
      result += '"';
    }
    
    fixed = result;
  } catch (e) {
    // If our string fixing attempt fails, just use the original
    console.error('[OpenAI] String fixing attempt failed:', e);
  }
  
  return fixed;
}

/**
 * Utility function to balance unmatched brackets in malformed JSON
 * 
 * This can fix common JSON errors like missing closing brackets
 * that often occur in AI-generated responses
 * 
 * @param input - Potentially malformed JSON string
 * @returns Balanced JSON string with proper bracket closure
 */
function balanceJsonString(input: string): string {
  try {
    // Arrays of opening and closing brackets we want to balance
    const opens = ['{', '['];
    const closes = ['}', ']'];
    const pairs: Record<string, string> = { '{': '}', '[': ']' };
    
    // Stack to keep track of opening brackets
    const stack: string[] = [];
    
    // Flag to track if we're inside a string (to ignore brackets in strings)
    let inString = false;
    let escaped = false;
    
    // Scan through the input string, tracking opening brackets
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      
      // Handle escape characters
      if (char === '\\' && !escaped) {
        escaped = true;
        continue;
      }
      
      // Handle string boundaries (but only if not escaped)
      if (char === '"' && !escaped) {
        inString = !inString;
      }
      
      // Only process brackets if we're not inside a string
      if (!inString) {
        if (opens.includes(char)) {
          // When we see an opening bracket, push it to the stack
          stack.push(char);
        } else if (closes.includes(char)) {
          // When we see a closing bracket, check if it matches the last opening bracket
          const expected = stack.length > 0 ? pairs[stack[stack.length - 1]] : null;
          if (expected === char) {
            // If it matches, pop the opening bracket from the stack
            stack.pop();
          }
        }
      }
      
      escaped = false;
    }
    
    // Add missing closing brackets in reverse order
    let result = input;
    while (stack.length > 0) {
      const open = stack.pop()!;
      result += pairs[open];
    }
    
    return result;
  } catch (error) {
    console.error('[OpenAI] Error in balanceJsonString:', error);
    return input; // Return the input unchanged if an error occurs
  }
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