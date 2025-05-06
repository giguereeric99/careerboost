/**
 * Service Index
 * 
 * This file exports all optimization services in a centralized location.
 * It simplifies imports and provides a clean API for accessing all
 * optimization-related functionality.
 */

// File handling
export { extractTextFromFile, extractText } from './extraction';
export { cleanupTempFile, createTempFilePath, isSupportedFileType } from './fileHandler';

// Language detection
export { detectLanguage } from './language';

// User mapping
export { 
  getSupabaseUuid, 
  getUserResources, 
  verifyUserResourceAccess 
} from './userMapping';

// Optimization services
export { 
  optimizeResume,
  reoptimizeResume
} from './optimization';

// Provider-specific optimization
export { optimizeWithOpenAI } from './optimization/openai';
export { optimizeWithGemini } from './optimization/gemini';
export { optimizeWithClaude } from './optimization/claude';
export { generateFallbackOptimization } from './optimization/fallback';