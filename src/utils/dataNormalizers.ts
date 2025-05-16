/**
 * Data Normalizers Module
 * 
 * This module provides centralized functions for normalizing data structures
 * across the CareerBoost application, ensuring consistent formats for:
 * - Suggestions from AI optimization
 * - Keywords for resume enhancement
 * - Various data transformations between API and frontend
 * 
 * Using these normalizers eliminates duplication and ensures data consistency
 * throughout the application lifecycle.
 */

import crypto from 'crypto';
import { OptimizationSuggestion } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';
import { OptimizedResumeData, ResumeApiData } from '@/types/resumeTypes';

/**
 * Creates a deterministic ID based on text content
 * This ensures the same content always gets the same ID for consistent references
 * 
 * @param prefix - Prefix to use for the ID (e.g., 'suggestion', 'keyword')
 * @param text - Text content to derive the ID from
 * @returns Deterministic ID string that will be consistent for the same input
 */
export function createDeterministicId(prefix: string, text: string): string {
  // Create a simple hash from the text
  let hash = 0;
  if (!text || text.length === 0) return `${prefix}-empty-${Date.now()}`;
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash as part of the ID - ensure it's positive
  return `${prefix}-${Math.abs(hash)}`;
}

/**
 * Generate a random UUID using crypto
 * Alternative to using external UUID libraries
 * 
 * @returns A random UUID string
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * Normalizes a suggestion object to ensure consistent structure
 * Handles different property naming conventions and ensures IDs exist
 * 
 * @param suggestion - Raw suggestion object from any source
 * @returns Normalized suggestion with consistent property names and structure
 */
export function normalizeSuggestion(suggestion: any): OptimizationSuggestion {
  // Handle null or undefined input
  if (!suggestion) {
    return {
      id: generateUuid(),
      text: '',
      type: 'general',
      impact: '',
      isApplied: false,
      pointImpact: 0
    };
  }

  // Get text from the suggestion for ID generation
  const text = suggestion.text || suggestion.original_text || '';
  
  // Generate deterministic ID if text is available
  const deterministicId = text ? createDeterministicId('suggestion', text) : null;
  
  // Log warning for suggestions without ID for debugging
  if (!suggestion.id && !suggestion.suggestion_id && process.env.NODE_ENV !== 'production') {
    console.warn('Suggestion without ID during normalization:', suggestion);
  }
  
  return {
    // Ensure ID exists with fallbacks in priority order
    id: suggestion.id || suggestion.suggestion_id || deterministicId || generateUuid(),
    
    // Use text with fallbacks
    text: text,
    
    // Provide defaults for optional properties
    type: suggestion.type || 'general',
    impact: suggestion.impact || '',
    
    // Handle both naming conventions for applied status
    isApplied: suggestion.isApplied || suggestion.is_applied || false,
    
    // Include properties for score calculations with defaults
    pointImpact: suggestion.pointImpact || suggestion.point_impact || 2,
    
    // Preserve score if present for impact calculations
    score: suggestion.score !== undefined ? suggestion.score : undefined,
    
    // Include section target if present
    section: suggestion.section || undefined
  };
}

/**
 * Normalizes a keyword object to ensure consistent structure
 * Handles different property naming conventions, formats, and edge cases
 * 
 * @param keyword - Raw keyword object or string from any source
 * @returns Normalized keyword with consistent property names and structure
 */
export function normalizeKeyword(keyword: any): Keyword {
  // Handle case where keyword is just a string
  if (typeof keyword === 'string') {
    // Create a deterministic ID based on the text content
    const deterministicId = createDeterministicId('keyword', keyword);
    
    return {
      id: deterministicId,
      text: keyword,
      isApplied: false,
      applied: false,
      relevance: 1,
      pointImpact: 1,
      category: 'general',
      impact: 0.5
    };
  }
  
  // Handle null or undefined input with sensible defaults
  if (!keyword) {
    return {
      id: generateUuid(),
      text: '',
      isApplied: false,
      applied: false,
      relevance: 1,
      pointImpact: 0,
      category: 'general',
      impact: 0
    };
  }
  
  // Get text from the keyword object for ID generation
  const text = keyword.text || keyword.keyword || '';
  
  // Create a deterministic ID if text is available
  const deterministicId = text ? createDeterministicId('keyword', text) : null;
  
  // Log warning for keywords without ID for debugging
  if (!keyword.id && !keyword.keyword_id && process.env.NODE_ENV !== 'production') {
    console.warn('Keyword without ID during normalization:', keyword);
  }
  
  // Process the applied status with support for both naming conventions
  const isApplied = keyword.isApplied || keyword.is_applied || keyword.applied || false;
  
  // Handle keyword as an object with potential varying property names
  return {
    // Use deterministic ID if possible, fall back to other options
    id: keyword.id || keyword.keyword_id || deterministicId || generateUuid(),
    
    text: text,
    
    // Set both isApplied and applied fields for maximum compatibility
    isApplied: isApplied,
    applied: isApplied,
    
    // Handle optional relevance with fallback
    relevance: keyword.relevance !== undefined ? keyword.relevance : 1,
    
    // Handle optional pointImpact with fallback
    pointImpact: keyword.pointImpact || keyword.point_impact || 1,
    
    // Handle optional category with fallback
    category: keyword.category || 'general',
    
    // Handle optional impact with fallback (used for score calculation)
    impact: keyword.impact !== undefined ? keyword.impact : 0.5
  };
}

/**
 * Normalizes an array of suggestions
 * 
 * @param suggestions - Array of raw suggestion objects
 * @returns Array of normalized suggestions with consistent structure
 */
export function normalizeSuggestions(suggestions: any[]): OptimizationSuggestion[] {
  if (!Array.isArray(suggestions)) return [];
  return suggestions.map(normalizeSuggestion);
}

/**
 * Normalizes an array of keywords
 * 
 * @param keywords - Array of raw keyword objects or strings
 * @returns Array of normalized keywords with consistent structure
 */
export function normalizeKeywords(keywords: any[]): Keyword[] {
  if (!Array.isArray(keywords)) return [];
  return keywords.map(normalizeKeyword);
}

/**
 * Converts API data format to application data format
 * Comprehensive normalization of all resume data from API
 * 
 * @param apiData - Raw API response data
 * @returns Normalized OptimizedResumeData for application use
 */
export function normalizeApiData(apiData: ResumeApiData): OptimizedResumeData {
  // Handle null or undefined input
  if (!apiData) {
    return {
      id: '',
      original_text: '',
      optimized_text: '',
      last_saved_text: null,
      last_saved_score_ats: null,
      language: 'English',
      file_name: '',
      file_type: '',
      ats_score: 0,
      keywords: [],
      suggestions: []
    };
  }
  
  // Convert keywords from API format to application format
  const formattedKeywords = normalizeKeywords(apiData.keywords || []);
  
  // Convert suggestions from API format to application format
  const formattedSuggestions = normalizeSuggestions(apiData.suggestions || []);
  
  return {
    id: apiData.id || '',
    original_text: apiData.original_text || '',
    optimized_text: apiData.optimized_text || '',
    last_saved_text: apiData.last_saved_text || null,
    last_saved_score_ats: apiData.last_saved_score_ats || null,
    language: apiData.language || 'English',
    file_name: apiData.file_name || '',
    file_type: apiData.file_type || '',
    file_size: apiData.file_size,
    ats_score: apiData.ats_score || 65, // Default to 65 if not provided
    selected_template: apiData.selected_template || 'basic',
    keywords: formattedKeywords,
    suggestions: formattedSuggestions
  };
}

/**
 * Calculates a content hash for optimized change detection
 * Useful for determining if content has meaningfully changed
 * 
 * @param content - Text content to hash
 * @returns Short hash of the content
 */
export function calculateContentHash(content: string): string {
  if (!content) return 'empty';
  
  // Remove whitespace and convert to lowercase to ignore formatting changes
  const normalizedContent = content.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Use crypto to create a short hash
  return crypto
    .createHash('sha256')
    .update(normalizedContent)
    .digest('hex')
    .substring(0, 8); // First 8 characters is enough for comparison
}

/**
 * Prepares resume data for API submission
 * Transforms application data format to API-compatible format
 * 
 * @param resumeData - Application resume data
 * @returns API-compatible data structure
 */
export function prepareResumeForApi(resumeData: OptimizedResumeData): any {
  return {
    id: resumeData.id,
    optimized_text: resumeData.optimized_text,
    last_saved_text: resumeData.last_saved_text,
    last_saved_score_ats: resumeData.last_saved_score_ats,
    suggestions: (resumeData.suggestions || []).map(suggestion => ({
      id: suggestion.id,
      text: suggestion.text,
      type: suggestion.type,
      impact: suggestion.impact,
      is_applied: suggestion.isApplied
    })),
    keywords: (resumeData.keywords || []).map(keyword => ({
      id: keyword.id,
      keyword: keyword.text,
      is_applied: keyword.isApplied || keyword.applied
    }))
  };
}