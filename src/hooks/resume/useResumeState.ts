// hooks/resume/useResumeState.ts

import { useState, useCallback } from 'react';
import { OptimizedResumeData } from '@/types/resumeTypes';
import { Suggestion } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';

/**
 * Central state for resume data
 * Single source of truth for resume state
 */
export interface ResumeState {
  // Resume content
  resumeData: OptimizedResumeData | null;
  originalText: string;
  optimizedText: string;
  editedText: string;
  
  // Enhancement data
  suggestions: Suggestion[];
  keywords: Keyword[];
  
  // Scores
  originalScore: number;
  currentScore: number;
  
  // UI state
  isEditing: boolean;
  selectedTemplate: string;
  activeTab: string;
  
  // Modification flags
  contentModified: boolean;
  scoreModified: boolean;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isResetting: boolean;
  isOptimizing: boolean;
  
  // Status
  hasResume: boolean | null;
}

/**
 * Initial state with safe default values
 */
const initialState: ResumeState = {
  resumeData: null,
  originalText: '',
  optimizedText: '',
  editedText: '',
  
  suggestions: [],
  keywords: [],
  
  originalScore: 65,
  currentScore: 65,
  
  isEditing: false,
  selectedTemplate: 'basic',
  activeTab: 'upload',
  
  contentModified: false,
  scoreModified: false,
  
  isLoading: false,
  isSaving: false,
  isResetting: false,
  isOptimizing: false,
  
  hasResume: null
};

/**
 * Hook for centralized resume state management
 * Provides typed access to all resume state with controlled setters
 */
export function useResumeState(initialData?: Partial<ResumeState>) {
  // State is initialized with safe defaults merged with any provided values
  const [state, setState] = useState<ResumeState>({
    ...initialState,
    ...initialData
  });
  
  /**
   * Update state with type checking and merge support
   * Can update multiple properties in a single atomic update
   */
  const updateState = useCallback((updates: Partial<ResumeState>) => {
    setState(current => ({
      ...current,
      ...updates
    }));
  }, []);
  
  /**
   * Reset the entire state back to initial values
   * Useful when completely refreshing the application
   */
  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Set a specific resume data object and update all derived states
   * Preserves loading state to prevent UI flicker if requested
   */
  const setResumeData = useCallback((data: OptimizedResumeData | null, preserveLoading = false) => {
    if (!data) {
      updateState({
        resumeData: null,
        hasResume: false,
        // Only update isLoading if not preserving
        ...(preserveLoading ? {} : { isLoading: false })
      });
      return;
    }
    
    // Update all related state based on the new resume data
    updateState({
      resumeData: data,
      originalText: data.original_text || '',
      optimizedText: data.last_saved_text || data.optimized_text || '',
      editedText: data.last_saved_text || data.optimized_text || '',
      originalScore: data.ats_score || 65,
      currentScore: data.last_saved_score_ats !== undefined && 
      data.last_saved_score_ats !== null ? 
      data.last_saved_score_ats : data.ats_score || 65,
      suggestions: data.suggestions || [],
      keywords: data.keywords || [],
      selectedTemplate: data.selected_template || 'basic',
      hasResume: true,
      contentModified: false,
      scoreModified: false,
      // Only update isLoading if not preserving
      ...(preserveLoading ? {} : { isLoading: false })
    });
  }, [updateState]);
  
  // Return the state and update methods
  return {
    ...state,
    updateState,
    resetState,
    setResumeData
  };
}

// Export types for use in other hooks
export type { ResumeState };