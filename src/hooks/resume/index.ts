// hooks/resume/index.ts

import { useCallback } from 'react';
import { useResumeState } from './useResumeState';
import { useResumeActions } from './useResumeActions';
import { useResumeScoring } from './useResumeScoring';
import { useResumeSync } from './useResumeSync';
import { useResumeUpload } from './useResumeUpload';
import { 
  normalizeSuggestion, 
  normalizeKeyword, 
  normalizeApiData 
} from '@/utils/dataNormalizers'; // Importer les fonctions de normalisation
import { OptimizationSuggestion as Suggestion } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';

/**
 * Main hook that combines all resume functionality
 * Provides a unified interface to all resume operations
 */
export function useResume(userId?: string) {
  // Get base state from useResumeState
  const { 
    updateState, 
    resetState, 
    setResumeData,
    ...state 
  } = useResumeState();
  
  // Get resume actions
  const actions = useResumeActions(state, updateState);
  
  // Get scoring functionality
  const scoring = useResumeScoring(state);
  
  // Get database sync operations
  const sync = useResumeSync(state, updateState, setResumeData, userId);
  
  // Define callback for when optimization completes
  const handleOptimizationComplete = useCallback((
    optimizedText: string,
    resumeId: string,
    atsScore: number,
    suggestionsData: Suggestion[],
    keywordsData: Keyword[]
  ) => {
    // Normaliser les données avant de les passer à updateResumeWithOptimizedData
    const normalizedSuggestions = suggestionsData.map(s => normalizeSuggestion(s));
    const normalizedKeywords = keywordsData.map(k => normalizeKeyword(k));
    
    // Update state with the optimization results
    actions.updateResumeWithOptimizedData(
      optimizedText,
      resumeId,
      atsScore,
      normalizedSuggestions,
      normalizedKeywords
    );
    
    // Change tab after processing is complete
    actions.setActiveTab('preview');
  }, [actions]);
  
  // Get upload functionality
  const upload = useResumeUpload(handleOptimizationComplete);
  
  // Return a unified API
  return {
    // State
    ...state,
    
    // Actions
    ...actions,
    
    // Scoring
    ...scoring,
    
    // Database sync
    ...sync,
    
    // Upload
    ...upload,
    
    // Direct state access
    updateState,
    
    // Reset all state
    reset: resetState,
    
    // Expose normalizers for direct use if needed
    normalizers: {
      normalizeSuggestion,
      normalizeKeyword,
      normalizeApiData
    }
  };
}

// Re-export individual hooks for advanced usage
export { 
  useResumeState, 
  useResumeActions, 
  useResumeScoring, 
  useResumeSync, 
  useResumeUpload 
};