/**
 * Main Optimization Service Orchestrator
 * 
 * This module orchestrates the optimization process across multiple AI providers.
 * It implements a cascading strategy where:
 * 1. OpenAI is tried first (usually best quality)
 * 2. Gemini is used as first fallback
 * 3. Claude is used as second fallback
 * 4. A fallback generator is used if all providers fail
 * 
 * It also provides the reoptimization functionality for applying changes
 * to already optimized resumes.
 */

import { 
  OptimizationResult, 
  OptimizationOptions,
  ReoptimizationParams
} from '../../types';
import { getProviderConfig, isProviderAvailable } from '../../config/providers';
import { optimizeWithOpenAI } from './openai';
import { optimizeWithGemini } from './gemini';
import { optimizeWithClaude } from './claude';
import { generateFallbackOptimization } from './fallback';
import { getAdminClient } from '@/lib/supabase-admin';
import { verifyUserResourceAccess } from '../userMapping';

/**
 * Optimize resume with cascading AI providers
 * 
 * @param resumeText - Resume text to optimize
 * @param language - Detected language
 * @param options - Additional optimization options
 * @returns Optimization result from the first successful provider
 */
export async function optimizeResume(
  resumeText: string,
  language: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  console.log(`Starting resume optimization cascade in ${language}`);
  
  // Try OpenAI first if available
  if (isProviderAvailable('openai')) {
    try {
      console.log("Attempting optimization with OpenAI");
      const openaiResult = await optimizeWithOpenAI(resumeText, language, options);
      return {
        ...openaiResult,
        provider: 'openai'
      };
    } catch (error) {
      console.warn("OpenAI optimization failed:", error);
    }
  } else {
    console.log("OpenAI provider not available, skipping");
  }
  
  // Try Gemini as first fallback
  if (isProviderAvailable('gemini')) {
    try {
      console.log("Attempting optimization with Gemini");
      const geminiResult = await optimizeWithGemini(resumeText, language, options);
      return {
        ...geminiResult,
        provider: 'gemini'
      };
    } catch (error) {
      console.warn("Gemini optimization failed:", error);
    }
  } else {
    console.log("Gemini provider not available, skipping");
  }
  
  // Try Claude as second fallback
  if (isProviderAvailable('claude')) {
    try {
      console.log("Attempting optimization with Claude");
      const claudeResult = await optimizeWithClaude(resumeText, language, options);
      return {
        ...claudeResult,
        provider: 'claude'
      };
    } catch (error) {
      console.warn("Claude optimization failed:", error);
    }
  } else {
    console.log("Claude provider not available, skipping");
  }
  
  // If all providers fail, use fallback generator
  console.log("All AI providers failed, using fallback generator");
  const fallbackResult = generateFallbackOptimization(resumeText, language);
  
  return {
    ...fallbackResult,
    provider: 'fallback'
  };
}

/**
 * Reoptimize a resume with applied changes
 * 
 * @param resumeId - ID of the resume to reoptimize
 * @param userId - User ID making the request
 * @param appliedKeywords - Keywords that have been applied
 * @param appliedSuggestions - Suggestions that have been applied
 * @returns Optimization result with updated content
 */
export async function reoptimizeResume({
  resumeId,
  userId,
  appliedKeywords = [],
  appliedSuggestions = []
}: ReoptimizationParams): Promise<OptimizationResult> {
  console.log(`Reoptimizing resume ${resumeId} for user ${userId}`);
  console.log(`Applied keywords: ${appliedKeywords.length}, Applied suggestions: ${appliedSuggestions.length}`);
  
  // Get Supabase admin client
  const supabaseAdmin = getAdminClient();
  
  // Verify user has access to this resume
  const hasAccess = await verifyUserResourceAccess(
    supabaseAdmin,
    userId,
    resumeId,
    'resumes'
  );
  
  if (!hasAccess) {
    throw new Error("User does not have access to this resume");
  }
  
  // Get the resume from database
  const { data: resume, error } = await supabaseAdmin
    .from('resumes')
    .select(`
      id,
      original_text,
      optimized_text,
      language,
      ats_score,
      ai_provider
    `)
    .eq('id', resumeId)
    .single();
  
  if (error || !resume) {
    throw new Error("Resume not found");
  }
  
  // Get keywords and suggestions from database
  const { data: keywordsData } = await supabaseAdmin
    .from('resume_keywords')
    .select('id, keyword')
    .eq('resume_id', resumeId)
    .in('keyword', appliedKeywords);
  
  const { data: suggestionsData } = await supabaseAdmin
    .from('resume_suggestions')
    .select('id, type, text, impact')
    .eq('resume_id', resumeId)
    .in('id', appliedSuggestions);
  
  // Prepare optimization options
  const options: OptimizationOptions = {
    language: resume.language || 'English',
    // Include applied keywords and suggestions in the instructions
    customInstructions: [
      `Apply these keywords: ${appliedKeywords.join(', ')}`,
      ...suggestionsData.map(s => `Apply this suggestion: ${s.text}`)
    ]
  };
  
  // Choose which text to reoptimize - if only keywords were applied,
  // we can use the existing optimized text rather than starting from scratch
  const textToReoptimize = 
    suggestionsData.length > 0 ? resume.original_text : resume.optimized_text;
  
  // Determine which provider to use
  // Try to use the same provider that generated the original optimization
  const provider = resume.ai_provider || 'openai';
  
  // Call the appropriate provider
  let result: OptimizationResult;
  
  try {
    if (provider === 'openai' && isProviderAvailable('openai')) {
      console.log("Reoptimizing with OpenAI");
      result = await optimizeWithOpenAI(textToReoptimize, resume.language, options);
      result.provider = 'openai';
    } else if (provider === 'gemini' && isProviderAvailable('gemini')) {
      console.log("Reoptimizing with Gemini");
      result = await optimizeWithGemini(textToReoptimize, resume.language, options);
      result.provider = 'gemini';
    } else if (provider === 'claude' && isProviderAvailable('claude')) {
      console.log("Reoptimizing with Claude");
      result = await optimizeWithClaude(textToReoptimize, resume.language, options);
      result.provider = 'claude';
    } else {
      // Fall back to first available provider
      console.log(`Original provider ${provider} not available, using cascade`);
      result = await optimizeResume(textToReoptimize, resume.language, options);
    }
    
    // Update the resume in the database
    const { error: updateError } = await supabaseAdmin
      .from('resumes')
      .update({
        optimized_text: result.optimizedText,
        ats_score: result.atsScore,
        updated_at: new Date().toISOString()
      })
      .eq('id', resumeId);
    
    if (updateError) {
      console.error("Error updating resume:", updateError);
    }
    
    // Update keyword application status
    if (appliedKeywords.length > 0) {
      await supabaseAdmin
        .from('resume_keywords')
        .update({ is_applied: true })
        .eq('resume_id', resumeId)
        .in('keyword', appliedKeywords);
    }
    
    // Update suggestion application status
    if (appliedSuggestions.length > 0) {
      await supabaseAdmin
        .from('resume_suggestions')
        .update({ is_applied: true })
        .eq('resume_id', resumeId)
        .in('id', appliedSuggestions);
    }
    
    // Include the resume ID in the result
    result.resumeId = resumeId;
    
    return result;
  } catch (error) {
    console.error("Error during reoptimization:", error);
    
    // If all providers fail, return the original optimized text
    return {
      optimizedText: resume.optimized_text,
      suggestions: [],
      keywordSuggestions: [],
      atsScore: resume.ats_score,
      provider: 'fallback',
      resumeId: resumeId
    };
  }
}