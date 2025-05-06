/**
 * Type definitions for the resume optimization system
 * 
 * This file contains all shared types used across the optimization services.
 * Centralizing types helps maintain consistency and makes refactoring easier.
 */

/**
 * Result of text extraction process
 */
export interface ExtractionResult {
  text: string;              // Extracted text content
  tempFilePath: string | null; // Path to temporary file (to be cleaned up)
  fileSize: number | null;   // Size of file in bytes
  error: Error | null;       // Any error that occurred during extraction
}

/**
 * Core optimization result returned by all AI providers
 */
export interface OptimizationResult {
  optimizedText: string;             // The AI-optimized resume content
  suggestions: Suggestion[];         // Suggestions for improvement
  keywordSuggestions: string[];      // Suggested keywords to include
  atsScore: number;                  // ATS compatibility score (0-100)
  provider: string;                  // Which AI service provided the optimization
  resumeId?: string;                 // Database ID of the saved resume (if saved)
  language?: string;                 // Detected language of the resume
}

/**
 * Suggestion for resume improvement
 */
export interface Suggestion {
  type: string;              // Category of suggestion (e.g., "structure", "content", "skills")
  text: string;              // The actual suggestion content
  impact: string;            // Description of how this improves the resume
  score?: number;            // Impact score (1-10) - optional
}

/**
 * Options for optimization requests
 */
export interface OptimizationOptions {
  language?: string;                 // Resume language
  targetRole?: string;               // Target job role
  maxSuggestions?: number;           // Maximum number of suggestions to return
  maxKeywords?: number;              // Maximum number of keywords to return
  includeAtsInstructions?: boolean;  // Whether to include ATS-specific instructions
  customInstructions?: string[];     // Additional instructions to include
}

/**
 * AI provider configuration
 */
export interface ProviderConfig {
  apiKey: string;            // API key for the service
  enabled: boolean;          // Whether this provider is enabled
  model: string;             // Model to use (e.g., "gpt-4", "claude-3-opus")
  maxTokens: number;         // Maximum tokens to generate
  temperature: number;       // Temperature for generation (creativity)
  timeout: number;           // Timeout in milliseconds
  retries: number;           // Number of retries on failure
}

/**
 * Provider-specific configuration
 */
export interface ProvidersConfig {
  openai: ProviderConfig;
  gemini: ProviderConfig;
  claude: ProviderConfig;
}

/**
 * Reoptimization parameters
 */
export interface ReoptimizationParams {
  resumeId: string;                  // ID of the resume to reoptimize
  userId: string;                    // User ID
  appliedKeywords: string[];         // Keywords that have been applied
  appliedSuggestions: string[];      // Suggestions that have been applied
}

/**
 * Parameters for generating fallback optimization
 */
export interface FallbackParams {
  resumeText: string;                // Original resume text
  language: string;                  // Detected language
}