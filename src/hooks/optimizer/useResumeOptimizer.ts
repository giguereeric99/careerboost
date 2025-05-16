/**
 * useResumeOptimizer Hook
 * 
 * Core hook that manages the entire resume optimization workflow including:
 * - Loading resume data from the database via services
 * - Managing optimized content and edited content
 * - Handling editing state and template selection
 * - Providing save, reset, and update functionality
 * - Properly handling loading states and user feedback
 * - Showing welcome toasts for new and returning users
 * 
 * This hook delegates score management to useResumeScore for cleaner separation of concerns
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  getLatestOptimizedResume, 
  updateKeywordStatus, 
  updateSuggestionStatus,
  saveResumeContent,
  resetResumeToOriginal,
  updateResumeTemplate
} from '@/services/resumeService';
import { parseOptimizedText } from '@/services/resumeParser';
import { OptimizedResumeData } from '@/types/resumeTypes';
// Import correct types from their respective files
import { OptimizationSuggestion as Suggestion } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';
import useResumeScore from './useResumeScore';

/**
 * Type guard to check if a value is not null or undefined
 * Used for safer type narrowing in TypeScript
 */
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Normalizes a suggestion object to ensure consistent structure
 * Handles different property naming conventions (camelCase vs snake_case)
 */
function normalizeSuggestion(suggestion: any): Suggestion {
  return {
    id: suggestion.id || suggestion.suggestion_id || String(Math.random()),
    text: suggestion.text || suggestion.original_text || '',
    type: suggestion.type || 'general',
    impact: suggestion.impact || '',
    isApplied: suggestion.isApplied || suggestion.is_applied || false,
    pointImpact: suggestion.pointImpact || suggestion.point_impact || 2,
    score: suggestion.score || undefined
  };
}

/**
 * Normalizes a keyword object to ensure consistent structure
 * Handles different property naming conventions and formats
 */
function normalizeKeyword(keyword: any): Keyword {
  if (typeof keyword === 'string') {
    return {
      id: String(Math.random()),
      text: keyword,
      isApplied: false,
      relevance: 1,
      pointImpact: 1,
      category: 'general',
      impact: 0.5
    };
  }
  
  return {
    id: keyword.id || keyword.keyword_id || String(Math.random()),
    text: keyword.text || keyword.keyword || '',
    isApplied: keyword.isApplied || keyword.is_applied || keyword.applied || false,
    relevance: keyword.relevance || 1,
    pointImpact: keyword.pointImpact || keyword.point_impact || 1,
    category: keyword.category || 'general',
    impact: keyword.impact || 0.5
  };
}

/**
 * Custom hook for resume optimization management
 * Provides comprehensive state and operations for resume editing workflow
 * Uses useResumeScore for all score-related functionality
 */
export const useResumeOptimizer = (userId?: string) => {
  // Resume content state
  const [resumeData, setResumeData] = useState<OptimizedResumeData | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const [optimizedText, setOptimizedText] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  
  // Enhancement data
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  
  // UI state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic');
  const [contentModified, setContentModified] = useState<boolean>(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  
  // Resume status
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');
  
  // References for tracking state
  const loadAttemptRef = useRef<number>(0);
  const hasLoadedDataRef = useRef<boolean>(false);
  const [toastShown, setToastShown] = useState<boolean>(false);
  const welcomeToastDisplayedRef = useRef<boolean>(false);
  const previousLoadingState = useRef<boolean>(true);

  // Integrate the score management hook
  const {
    // Score state
    originalScore: originalAtsScore,
    currentScore: currentAtsScore,
    scoreModified,
    
    // Score actions
    setBaseScore,
    updateScore,
    resetScore,
    applySuggestionScore,
    applyKeywordScore,
    
    // Impact analysis
    simulateSuggestionImpact,
    simulateKeywordImpact,
    
    // Detailed scoring
    generateScoreBreakdown,
    getImprovementMetrics,
    
    // Helpers
    setScoreModified
  } = useResumeScore({
    initialScore: 65,
    resumeContent: editedText,
    suggestions,
    keywords,
    onScoreChange: (newScore) => {
      console.log('Score updated:', newScore);
    }
  });

  /**
   * Convert API data to standardized format with normalized suggestions and keywords
   */
  const convertApiDataToOptimizedFormat = useCallback((apiData: any): OptimizedResumeData => {
    const formattedKeywords = Array.isArray(apiData.keywords) 
      ? apiData.keywords.map(normalizeKeyword)
      : [];
    
    const formattedSuggestions = Array.isArray(apiData.suggestions) 
      ? apiData.suggestions.map(normalizeSuggestion)
      : [];
    
    return {
      id: apiData.id,
      original_text: apiData.original_text,
      optimized_text: apiData.optimized_text,
      last_saved_text: apiData.last_saved_text ?? undefined,
      last_saved_score_ats: apiData.last_saved_score_ats ?? undefined,
      language: apiData.language,
      file_name: apiData.file_name,
      file_type: apiData.file_type,
      file_size: apiData.file_size,
      ats_score: apiData.ats_score,
      selected_template: apiData.selected_template,
      keywords: formattedKeywords,
      suggestions: formattedSuggestions
    };
  }, []);

  /**
   * Load the latest resume for a user
   */
  const loadLatestResume = useCallback(async () => {
    if (!userId) {
      console.log("No user ID provided, skipping resume load");
      return null;
    }
    
    loadAttemptRef.current += 1;
    
    if (loadAttemptRef.current > 3) {
      console.log("Maximum resume load attempts reached");
      return null;
    }
    
    try {
      setIsLoading(true);
      
      const { data: apiData, error } = await getLatestOptimizedResume(userId);
      
      if (error) {
        console.error("Error loading resume:", error);
        throw error;
      }
      
      if (apiData) {
        console.log("Resume loaded successfully:", apiData.id);
        
        const optimizedData = convertApiDataToOptimizedFormat(apiData);
        
        setResumeData(optimizedData);
        setHasResume(true);
        hasLoadedDataRef.current = true;
        
        setOriginalText(optimizedData.optimized_text || '');
        
        if (optimizedData.last_saved_text) {
          setOptimizedText(optimizedData.last_saved_text);
          setEditedText(optimizedData.last_saved_text);
        } else {
          setOptimizedText(optimizedData.optimized_text || '');
          setEditedText(optimizedData.optimized_text || '');
        }
        
        const baseScore = optimizedData.ats_score || 65;
        setBaseScore(baseScore);
        
        if (isDefined(optimizedData.last_saved_score_ats)) {
          updateScore(optimizedData.last_saved_score_ats, false);
        }
        
        setSuggestions(optimizedData.suggestions || []);
        setKeywords(optimizedData.keywords || []);
        
        setContentModified(false);
        setScoreModified(false);
        
        if (optimizedData.selected_template) {
          setSelectedTemplate(optimizedData.selected_template);
        }
        
        return optimizedData;
      } else {
        console.log("No resume found for user");
        setHasResume(false);
        hasLoadedDataRef.current = true;
        
        return null;
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      toast.error("Error loading resume");
      setHasResume(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId, convertApiDataToOptimizedFormat, setBaseScore, updateScore]);
  
  /**
   * Save the edited resume content, score, and applied enhancements
   * Now using an atomic approach to ensure data consistency
   */
  const saveResume = useCallback(async (newContent?: string) => {
    const contentToSave = newContent || editedText;
    
    if (!userId || !resumeData?.id || !contentToSave) {
      console.error("Cannot save: Missing data", { userId, resumeId: resumeData?.id, contentLength: contentToSave?.length });
      toast.error("Cannot save: Missing data");
      return false;
    }
    
    try {
      // Set saving state to show loading indicators
      setIsSaving(true);
      
      // Log saving attempt
      console.log("Saving resume:", {
        resumeId: resumeData.id,
        contentLength: contentToSave.length,
        atsScore: currentAtsScore || 0
      });
      
      // MODIFICATION: Create an array of all save operations to execute them together
      const savePromises = [];
      
      // Save the resume content and score
      savePromises.push(
        saveResumeContent(resumeData.id, contentToSave, currentAtsScore || 0)
      );
      
      // Save all suggestion states with type checking
      for (const [index, suggestion] of suggestions.entries()) {
        savePromises.push(
          updateSuggestionStatus(
            resumeData.id, 
            suggestion.id || `suggestion-${index}-${Date.now()}`, // Add fallback for ID
            suggestion.isApplied || false // Ensure boolean type
          )
        );
      }
      
      // Save all keyword states with type checking
      for (const [index, keyword] of keywords.entries()) {
        savePromises.push(
          updateKeywordStatus(
            resumeData.id, 
            keyword.text || '', // Ensure non-empty string
            keyword.isApplied || false // Ensure boolean type
          )
        );
      }
      
      // Execute all save operations in parallel
      const results = await Promise.all(savePromises);
      
      // Check if all operations were successful
      const allSuccessful = results.every(result => result.success);
      
      if (!allSuccessful) {
        const errors = results.filter(r => !r.success).map(r => r.error);
        console.error("Some save operations failed:", errors);
        throw new Error("Some save operations failed");
      }
      
      // Update local state with the saved data
      setResumeData({
        ...resumeData,
        last_saved_text: contentToSave,
        last_saved_score_ats: currentAtsScore
      });
      
      // Update optimized text to reflect the saved content
      setOptimizedText(contentToSave);
      
      // Mark content and score as no longer modified since they were just saved
      setContentModified(false);
      setScoreModified(false);
      
      // Display success toast
      toast.success("Changes saved successfully");
      
      return true;
    } catch (error) {
      // Handle and display errors
      console.error("Error saving resume:", error);
      toast.error("Failed to save changes");
      return false;
    } finally {
      // Always reset the saving state when done
      setIsSaving(false);
    }
  }, [userId, resumeData, editedText, currentAtsScore, suggestions, keywords]);
  
  /**
   * Reset resume to original AI-optimized version
   * This function handles the complete resume reset workflow including:
   * - API call to reset database records
   * - Reloading fresh data from the server
   * - Updating all local state to reflect original content
   * - Resetting all UI elements and modification flags
   * 
   * @returns Promise<boolean> - Success status of the reset operation
   */
  const resetResume = useCallback(async () => {
    // Validate required data before proceeding
    if (!userId || !resumeData?.id) {
      console.error("Cannot reset: Missing required data", { userId, resumeId: resumeData?.id });
      toast.error("Cannot reset: Missing data");
      return false;
    }
    
    try {
      // Set loading state to show UI indicators
      setIsResetting(true);
      
      // Log reset attempt for debugging
      console.log(`Initiating resume reset for ID: ${resumeData.id}`);
      
      // Call API to reset database records
      const { success, error } = await resetResumeToOriginal(resumeData.id);
      
      // Handle API call failures
      if (!success) {
        console.error("Reset failed with API error:", error);
        throw error;
      }
      
      // After successful database reset, reload fresh data from server
      // This ensures we have the latest state consistent with the database
      console.log("Database reset successful, now reloading fresh data");
      const { data: freshData, error: loadError } = await getLatestOptimizedResume(userId);
      
      // Handle data reload failures
      if (loadError) {
        console.error("Error reloading resume data after reset:", loadError);
        throw loadError;
      }
      
      // Verify we received valid data
      if (!freshData) {
        console.error("No data returned when reloading after reset");
        throw new Error("Failed to reload resume data after reset");
      }
      
      // Log successful data retrieval for debugging
      console.log("Fresh data loaded successfully after reset:", {
        id: freshData.id,
        hasOptimizedText: !!freshData.optimized_text,
        hasLastSavedText: !!freshData.last_saved_text,
        textLength: freshData.optimized_text?.length || 0
      });
      
      // Update all local state with fresh data from server
      // This ensures the UI reflects the reset database state
      
      // 1. Update core resume data
      setResumeData(freshData);
      
      // 2. Update text content states
      setOriginalText(freshData.optimized_text || '');
      setOptimizedText(freshData.optimized_text || '');
      setEditedText(freshData.optimized_text || '');
      
      // 3. Reset ATS score to original value
      setBaseScore(freshData.ats_score || 65);
      
      // 4. Reset all suggestions to not applied state
      const resetSuggestions = Array.isArray(freshData.suggestions)
        ? freshData.suggestions.map(s => ({
            ...s,
            isApplied: false // Ensure all suggestions are marked as not applied
          }))
        : [];
      setSuggestions(resetSuggestions);
      
      // 5. Reset all keywords to not applied state
      const resetKeywords = Array.isArray(freshData.keywords)
        ? freshData.keywords.map(k => ({
            ...k,
            isApplied: false, // Ensure all keywords are marked as not applied
            applied: false // Support both naming conventions
          }))
        : [];
      setKeywords(resetKeywords);
      
      // 6. Exit edit mode to show the reset preview
      setIsEditing(false);
      
      // 7. Clear all modification flags
      setContentModified(false);
      setScoreModified(false);
      
      // 8. Notify user of successful reset
      toast.success("Resume reset to original version");
      
      // Return success
      return true;
    } catch (error) {
      // Comprehensive error handling
      console.error("Error in resetResume function:", error);
      toast.error(error instanceof Error 
        ? `Reset failed: ${error.message}` 
        : "Failed to reset resume");
      return false;
    } finally {
      // Always reset loading state when done
      setIsResetting(false);
    }
  }, [
    // Dependencies
    userId, 
    resumeData, 
    setBaseScore, 
    resetResumeToOriginal, 
    getLatestOptimizedResume
  ]);
  /**
   * Handle content changes in the editor
   */
  const handleContentEdit = useCallback((newContent: string) => {
    setEditedText(newContent);
    setContentModified(true);
  }, []);
  
  /**
   * Apply or unapply a suggestion
   * Modified to update only local state, not database, until save is called
   */
  const handleApplySuggestion = useCallback(async (suggestionId: string, applyState?: boolean) => {
    console.log("handleApplySuggestion called with:", { 
      suggestionId, 
      applyState, 
      resumeId: resumeData?.id 
    });
    
    if (!resumeData?.id) {
      console.error("Cannot apply suggestion: No resume data available");
      return false;
    }
    
    const suggestion = suggestions.find(s => s.id === suggestionId);
    
    console.log("Found matching suggestion:", suggestion);
    
    if (!suggestion) {
      console.error("Suggestion not found with ID:", suggestionId);
      console.log("Available suggestions:", suggestions);
      return false;
    }
    
    const newIsApplied = applyState !== undefined ? applyState : !suggestion.isApplied;
    
    try {
      // MODIFICATION: Only update local state, not database
      // We'll save all changes at once when the user clicks Save
      
      // Update local state
      setSuggestions(prevSuggestions => 
        prevSuggestions.map(s => 
          s.id === suggestionId ? { ...s, isApplied: newIsApplied } : s
        )
      );
      
      // Update score management
      applySuggestionScore(suggestion, newIsApplied);
      
      // Mark content as modified since applying suggestions is a change
      setContentModified(true);
      
      toast.success(newIsApplied ? 
        "Suggestion applied" : 
        "Suggestion removed"
      );
      
      return true;
    } catch (error) {
      console.error("Error applying suggestion:", error);
      toast.error("Failed to apply suggestion");
      return false;
    }
  }, [resumeData?.id, suggestions, applySuggestionScore, setContentModified]);
  
  /**
   * Apply or unapply a keyword
   * Modified to update only local state, not database, until save is called
   */
  const handleKeywordApply = useCallback(async (keywordId: string, applyState?: boolean) => {
    console.log("handleKeywordApply called with:", { 
      keywordId, 
      applyState, 
      resumeId: resumeData?.id 
    });
    
    if (!resumeData?.id) {
      console.error("Cannot apply keyword: No resume data available");
      return false;
    }
    
    const keyword = keywords.find(k => k.id === keywordId);
    
    console.log("Found matching keyword:", keyword);
    
    if (!keyword) {
      console.error("Keyword not found with ID:", keywordId);
      console.log("Available keywords:", keywords);
      return false;
    }
    
    const newIsApplied = applyState !== undefined ? applyState : !keyword.isApplied;
    
    try {
      // MODIFICATION: Only update local state, not database
      // We'll save all changes at once when the user clicks Save
      
      // Update local state
      setKeywords(prevKeywords => 
        prevKeywords.map(k => 
          k.id === keywordId ? { ...k, isApplied: newIsApplied } : k
        )
      );
      
      // Update score management
      applyKeywordScore(keyword, newIsApplied);
      
      // Mark content as modified since applying keywords is a change
      setContentModified(true);
      
      toast.success(newIsApplied ? 
        "Keyword applied" : 
        "Keyword removed"
      );
      
      return true;
    } catch (error) {
      console.error("Error applying keyword:", error);
      toast.error("Failed to apply keyword");
      return false;
    }
  }, [resumeData?.id, keywords, applyKeywordScore, setContentModified]);
  
  /**
   * Update resume state with optimized data from API or upload
   */
  const updateResumeWithOptimizedData = useCallback((
    optimizedTextContent: string,
    resumeId: string,
    scoreValue: number,
    suggestionsData: any[],
    keywordsData: any[]
  ) => {
    const normalizedSuggestions = Array.isArray(suggestionsData) 
      ? suggestionsData.map(normalizeSuggestion)
      : [];
    
    const normalizedKeywords = Array.isArray(keywordsData)
      ? keywordsData.map(normalizeKeyword)
      : [];
    
    setOriginalText(optimizedTextContent);
    setOptimizedText(optimizedTextContent);
    setEditedText(optimizedTextContent);
    
    setBaseScore(scoreValue);
    
    setSuggestions(normalizedSuggestions);
    setKeywords(normalizedKeywords);
    
    setContentModified(false);
    
    if (!resumeData || resumeData.id !== resumeId) {
      getLatestOptimizedResume(userId || '')
        .then(({ data: apiData }) => {
          if (apiData) {
            const optimizedData = convertApiDataToOptimizedFormat(apiData);
            setResumeData(optimizedData);
            setHasResume(true);
            
            if (optimizedData.selected_template) {
              setSelectedTemplate(optimizedData.selected_template);
            }
          }
        })
        .catch(error => console.error("Error fetching resume data:", error));
    }
    
    setHasResume(true);
    hasLoadedDataRef.current = true;
    
    setActiveTab('preview');
    
    toast.success("Resume optimized successfully!", {
      description: "Your resume has been analyzed and improved by our AI.",
      duration: 5000,
    });
  }, [resumeData, userId, convertApiDataToOptimizedFormat, setBaseScore, setActiveTab]);
  
  /**
   * Update template selection and save to database
   */
  const updateSelectedTemplate = useCallback(async (templateId: string) => {
    if (!resumeData?.id) return false;
    
    try {
      const { success, error } = await updateResumeTemplate(resumeData.id, templateId);
      
      if (!success) throw error;
      
      setSelectedTemplate(templateId);
      
      if (resumeData) {
        setResumeData({
          ...resumeData,
          selected_template: templateId
        });
      }
      
      toast.success("Template updated successfully");
      return true;
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
      return false;
    }
  }, [resumeData]);
  
  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    return contentModified || scoreModified;
  }, [contentModified, scoreModified]);
  
  /**
   * Get array of applied keywords for templates
   */
  const getAppliedKeywords = useCallback(() => {
    return keywords
      .filter(keyword => keyword.isApplied)
      .map(keyword => keyword.text);
  }, [keywords]);
  
  /**
   * Calculate the current completion score
   */
  const calculateCompletionScore = useCallback(() => {
    if (!suggestions.length && !keywords.length) return 0;
    
    const appliedSuggestions = suggestions.filter(s => s.isApplied).length;
    const appliedKeywords = keywords.filter(k => k.isApplied).length;
    
    const totalItems = suggestions.length + keywords.length;
    const appliedItems = appliedSuggestions + appliedKeywords;
    
    return Math.round((appliedItems / totalItems) * 100);
  }, [suggestions, keywords]);
  
  /**
   * Check if save button should be enabled
   */
  const shouldEnableSaveButton = useCallback(() => {
    return contentModified || scoreModified;
  }, [contentModified, scoreModified]);
  
  // Effects for welcome toast and data loading
  
  // Check for session storage welcome toast on mount
  useEffect(() => {
    try {
      const lastToastTime = sessionStorage.getItem('welcomeToastTime');
      
      if (lastToastTime) {
        const lastTime = parseInt(lastToastTime, 10);
        const currentTime = Date.now();
        
        if (currentTime - lastTime < 15 * 60 * 1000) {
          welcomeToastDisplayedRef.current = true;
          setToastShown(true);
        }
      }
    } catch (e) {
      // Ignore session storage errors
    }
    
    return () => {
      if (welcomeToastDisplayedRef.current) {
        try {
          sessionStorage.setItem('welcomeToastTime', Date.now().toString());
        } catch (e) {
          // Ignore session storage errors
        }
      }
    };
  }, []);
  
  // Load resume on initial mount if userId is available
  useEffect(() => {
    if (userId && hasResume === null && !hasLoadedDataRef.current) {
      loadLatestResume();
    }
  }, [userId, hasResume, loadLatestResume]);
  
  // Improved effect for welcome toasts
  useEffect(() => {
    if (toastShown) return;
    
    const wasLoading = previousLoadingState.current;
    previousLoadingState.current = isLoading;
    
    if ((!wasLoading && !isLoading) || isLoading) return;
    
    if (hasResume === null) return;
    
    setToastShown(true);
    welcomeToastDisplayedRef.current = true;
    
    try {
      sessionStorage.setItem('welcomeToastTime', Date.now().toString());
    } catch (e) {
      // Ignore session storage errors
    }
  }, [hasResume, isLoading, toastShown]);

  // Return the hook interface with all states and functions
  return {
    // States
    resumeData,
    originalText,
    optimizedText,
    editedText,
    originalAtsScore,
    currentAtsScore,
    suggestions,
    keywords,
    isEditing,
    selectedTemplate,
    contentModified,
    scoreModified,
    isLoading,
    isSaving,
    isResetting,
    hasResume,
    activeTab,
    
    // Actions
    setActiveTab,
    setIsEditing,
    loadLatestResume,
    saveResume,
    resetResume,
    handleContentEdit,
    handleApplySuggestion,
    handleKeywordApply,
    updateResumeWithOptimizedData,
    updateSelectedTemplate,
    getAppliedKeywords,
    hasUnsavedChanges,
    calculateCompletionScore,
    shouldEnableSaveButton,
    
    // Score-related functionality
    simulateSuggestionImpact,
    simulateKeywordImpact,
    generateScoreBreakdown,
    getImprovementMetrics,
    
    // Direct state setters (use with caution)
    setOptimizedText,
    setCurrentAtsScore: updateScore,
    setSuggestions,
    setKeywords,
    setContentModified,
    setScoreModified
  };
};

export default useResumeOptimizer;