// hooks/resume/useResumeActions.ts

import { useCallback } from 'react';
import { ResumeState } from './useResumeState';
import { calculateSuggestionPointImpact, calculateKeywordPointImpact } from '@/services/resumeScoreLogic';
import { OptimizationSuggestion as Suggestion } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';

/**
 * Hook for resume content actions
 * Contains all logic for modifying the resume content and related states
 */
export function useResumeActions(
  state: ResumeState,
  updateState: (updates: Partial<ResumeState>) => void
) {
  /**
   * Update content and mark as modified
   */
  const handleContentEdit = useCallback((newContent: string) => {
    updateState({
      editedText: newContent,
      contentModified: true
    });
  }, [updateState]);

  /**
   * Apply or unapply a suggestion
   * Updates suggestion state and score
   */
  const handleApplySuggestion = useCallback((suggestionId: string, applyState?: boolean) => {
    const suggestion = state.suggestions.find(s => s.id === suggestionId);
    
    if (!suggestion) {
      console.error("Suggestion not found with ID:", suggestionId);
      return false;
    }
    
    const newIsApplied = applyState !== undefined ? applyState : !suggestion.isApplied;
    
    // Update suggestions array
    const updatedSuggestions = state.suggestions.map(s => 
      s.id === suggestionId ? { ...s, isApplied: newIsApplied } : s
    );
    
    // Calculate score impact
    const pointImpact = suggestion.pointImpact || calculateSuggestionPointImpact(suggestion);
    const scoreDelta = newIsApplied ? pointImpact : -pointImpact;
    const newScore = Math.min(100, Math.max(0, state.currentScore + scoreDelta));
    
    // Update state with new suggestions and score
    updateState({
      suggestions: updatedSuggestions,
      currentScore: newScore,
      contentModified: true,
      scoreModified: true
    });
    
    return true;
  }, [state.suggestions, state.currentScore, updateState]);

  /**
   * Apply or unapply a keyword
   * Updates keyword state and score
   */
  const handleKeywordApply = useCallback((keywordId: string, applyState?: boolean) => {
    const keyword = state.keywords.find(k => k.id === keywordId);
    
    if (!keyword) {
      console.error("Keyword not found with ID:", keywordId);
      return false;
    }
    
    const newIsApplied = applyState !== undefined ? applyState : !keyword.isApplied;
    
    // Update keywords array
    const updatedKeywords = state.keywords.map(k => 
      k.id === keywordId ? { ...k, isApplied: newIsApplied } : k
    );
    
    // Calculate score impact
    const pointImpact = keyword.pointImpact || 
      calculateKeywordPointImpact(keyword, state.editedText);
    const scoreDelta = newIsApplied ? pointImpact : -pointImpact;
    const newScore = Math.min(100, Math.max(0, state.currentScore + scoreDelta));
    
    // Update state with new keywords and score
    updateState({
      keywords: updatedKeywords,
      currentScore: newScore,
      contentModified: true,
      scoreModified: true
    });
    
    return true;
  }, [state.keywords, state.currentScore, state.editedText, updateState]);

  /**
   * Update selected template
   */
  const updateSelectedTemplate = useCallback((templateId: string) => {
    updateState({
      selectedTemplate: templateId
    });
  }, [updateState]);

  /**
   * Set edit mode state
   */
  const setEditMode = useCallback((isEditing: boolean) => {
    updateState({ isEditing });
  }, [updateState]);

  /**
   * Set active tab
   */
  const setActiveTab = useCallback((activeTab: string) => {
    updateState({ activeTab });
  }, [updateState]);

  /**
   * Update resume with optimized data from AI or database
   */
  const updateResumeWithOptimizedData = useCallback((
    optimizedTextContent: string,
    resumeId: string,
    scoreValue: number,
    suggestionsData: Suggestion[],
    keywordsData: Keyword[]
  ) => {
    updateState({
      originalText: optimizedTextContent,
      optimizedText: optimizedTextContent,
      editedText: optimizedTextContent,
      originalScore: scoreValue,
      currentScore: scoreValue,
      suggestions: suggestionsData,
      keywords: keywordsData,
      contentModified: false,
      scoreModified: false,
      hasResume: true,
      activeTab: 'preview',
      isOptimizing: false
    });
  }, [updateState]);

  return {
    handleContentEdit,
    handleApplySuggestion,
    handleKeywordApply,
    updateSelectedTemplate,
    setEditMode,
    setActiveTab,
    updateResumeWithOptimizedData
  };
}