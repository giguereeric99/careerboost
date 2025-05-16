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
import { OptimizationSuggestion as Suggestion } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';
import useResumeScore from './useResumeScore';

// Import the centralized data normalizers
import {
  normalizeApiData,
  normalizeSuggestions,
  normalizeKeywords,
  normalizeSuggestion,
  normalizeKeyword
} from '@/utils/dataNormalizers';

/**
 * Type guard to check if a value is not null or undefined
 * Used for safer type narrowing in TypeScript
 */
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Custom hook for resume optimization management
 * Provides comprehensive state and operations for resume editing workflow
 * Uses useResumeScore for all score-related functionality
 * 
 * @param userId - Optional user ID for loading user-specific data
 * @returns Complete resume optimization state and actions
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
   * Load the latest resume for a user
   * Fetches resume data from the API and updates local state
   * 
   * @returns Promise resolving to the loaded resume data or null
   */
  const loadLatestResume = useCallback(async () => {
    // Skip if no user ID is provided
    if (!userId) {
      console.log("No user ID provided, skipping resume load");
      return null;
    }
    
    // Track load attempts to prevent infinite loops
    loadAttemptRef.current += 1;
    
    // Limit maximum load attempts
    if (loadAttemptRef.current > 3) {
      console.log("Maximum resume load attempts reached");
      return null;
    }
    
    try {
      // Set loading state for UI feedback
      setIsLoading(true);
      
      // Fetch resume data from API
      const { data: apiData, error } = await getLatestOptimizedResume(userId);
      
      // Handle API errors
      if (error) {
        console.error("Error loading resume:", error);
        throw error;
      }
      
      // Process valid resume data
      if (apiData) {
        console.log("Resume loaded successfully:", apiData.id);
        
        // Use centralized normalizer to standardize API data
        const optimizedData = normalizeApiData(apiData);
        
        // Update resume data state
        setResumeData(optimizedData);
        setHasResume(true);
        hasLoadedDataRef.current = true;
        
        // Set text content states
        setOriginalText(optimizedData.optimized_text || '');
        
        // Prioritize last saved text if available
        if (optimizedData.last_saved_text) {
          setOptimizedText(optimizedData.last_saved_text);
          setEditedText(optimizedData.last_saved_text);
        } else {
          setOptimizedText(optimizedData.optimized_text || '');
          setEditedText(optimizedData.optimized_text || '');
        }
        
        // Set ATS score
        const baseScore = optimizedData.ats_score || 65;
        setBaseScore(baseScore);
        
        // Update current score if saved score exists
        if (isDefined(optimizedData.last_saved_score_ats)) {
          updateScore(optimizedData.last_saved_score_ats, false);
        }
        
        // Set suggestions and keywords
        setSuggestions(optimizedData.suggestions || []);
        setKeywords(optimizedData.keywords || []);
        
        // Reset modification flags for fresh load
        setContentModified(false);
        setScoreModified(false);
        
        // Set template if available
        if (optimizedData.selected_template) {
          setSelectedTemplate(optimizedData.selected_template);
        }
        
        return optimizedData;
      } else {
        // Handle case when no resume is found
        console.log("No resume found for user");
        setHasResume(false);
        hasLoadedDataRef.current = true;
        
        return null;
      }
    } catch (error) {
      // Handle and log errors
      console.error("Error loading resume:", error);
      toast.error("Error loading resume");
      setHasResume(false);
      return null;
    } finally {
      // Always reset loading state when done
      setIsLoading(false);
    }
  }, [userId, setBaseScore, updateScore]);
  
  /**
   * Save the edited resume content, score, and applied enhancements
   * Uses an atomic approach to ensure data consistency
   * 
   * @param newContent - Optional new content to save, defaults to current edited text
   * @returns Promise resolving to success status
   */
  const saveResume = useCallback(async (newContent?: string) => {
    // Use provided content or current edited text
    const contentToSave = newContent || editedText;
    
    // Validate required data is available
    if (!userId || !resumeData?.id || !contentToSave) {
      console.error("Cannot save: Missing data", { 
        userId, 
        resumeId: resumeData?.id, 
        contentLength: contentToSave?.length 
      });
      toast.error("Cannot save: Missing data");
      return false;
    }
    
    try {
      // Set saving state for UI feedback
      setIsSaving(true);
      
      // Log saving attempt for debugging
      console.log("Saving resume:", {
        resumeId: resumeData.id,
        contentLength: contentToSave.length,
        atsScore: currentAtsScore || 0
      });
      
      // Create an array of all save operations to execute them together
      const savePromises = [];
      
      // 1. Save the resume content and score
      savePromises.push(
        saveResumeContent(resumeData.id, contentToSave, currentAtsScore || 0)
      );
      
      // 2. Save all suggestion states
      for (const suggestion of suggestions) {
        // Ensure suggestion has valid ID
        if (!suggestion.id) {
          console.warn("Suggestion without ID during save:", suggestion);
          continue;
        }
        
        savePromises.push(
          updateSuggestionStatus(
            resumeData.id, 
            suggestion.id,
            Boolean(suggestion.isApplied) // Ensure boolean type
          )
        );
      }
      
      // 3. Save all keyword states
      for (const keyword of keywords) {
        // Skip keywords without text
        if (!keyword.text) {
          console.warn("Keyword without text during save:", keyword);
          continue;
        }
        
        savePromises.push(
          updateKeywordStatus(
            resumeData.id, 
            keyword.text,
            Boolean(keyword.isApplied) // Ensure boolean type
          )
        );
      }
      
      // Execute all save operations in parallel
      const results = await Promise.all(savePromises);
      
      // Check if all operations were successful
      const allSuccessful = results.every(result => result.success);
      
      // Handle partial failures
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
      
      // Provide user feedback
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
   * Handles the complete resume reset workflow including:
   * - API call to reset database records
   * - Reloading fresh data from the server
   * - Updating all local state to reflect original content
   * 
   * @returns Promise resolving to success status
   */
  const resetResume = useCallback(async () => {
    // Validate required data is available
    if (!userId || !resumeData?.id) {
      console.error("Cannot reset: Missing required data", { 
        userId, 
        resumeId: resumeData?.id 
      });
      toast.error("Cannot reset: Missing data");
      return false;
    }
    
    try {
      // Set loading state for UI feedback
      setIsResetting(true);
      
      // Log reset attempt for debugging
      console.log(`Initiating resume reset for ID: ${resumeData.id}`);
      
      // 1. Call API to reset database records
      const { success, error } = await resetResumeToOriginal(resumeData.id);
      
      // Handle API call failures
      if (!success) {
        console.error("Reset failed with API error:", error);
        throw error;
      }
      
      // 2. After successful database reset, reload fresh data from server
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
      
      // 3. Normalize data using centralized normalizers
      const normalizedData = normalizeApiData(freshData);
      
      // 4. Update all local state with fresh data from server
      
      // Update core resume data
      setResumeData(normalizedData);
      
      // Update text content states
      setOriginalText(normalizedData.optimized_text || '');
      setOptimizedText(normalizedData.optimized_text || '');
      setEditedText(normalizedData.optimized_text || '');
      
      // Reset ATS score to original value
      setBaseScore(normalizedData.ats_score || 65);
      
      // Reset all suggestions to not applied state
      const resetSuggestions = normalizedData.suggestions?.map(s => ({
        ...s,
        isApplied: false // Ensure all suggestions are marked as not applied
      })) || [];
      setSuggestions(resetSuggestions);
      
      // Reset all keywords to not applied state
      const resetKeywords = normalizedData.keywords?.map(k => ({
        ...k,
        isApplied: false, // Ensure all keywords are marked as not applied
        applied: false // Support both naming conventions
      })) || [];
      setKeywords(resetKeywords);
      
      // Exit edit mode to show the reset preview
      setIsEditing(false);
      
      // Clear all modification flags
      setContentModified(false);
      setScoreModified(false);
      
      // Notify user of successful reset
      toast.success("Resume reset to original version");
      
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
  }, [userId, resumeData, setBaseScore, resetResumeToOriginal, getLatestOptimizedResume]);
  
  /**
   * Handle content changes in the editor
   * Updates edited text state and marks content as modified
   * 
   * @param newContent - New content from the editor
   */
  const handleContentEdit = useCallback((newContent: string) => {
    setEditedText(newContent);
    setContentModified(true);
  }, []);
  
  /**
   * Apply or unapply a suggestion
   * Updates local state only, not database, until save is called
   * 
   * @param suggestionId - ID of the suggestion to apply/unapply
   * @param applyState - Optional explicit state to set (true/false), defaults to toggling current state
   * @returns Promise resolving to success status
   */
  const handleApplySuggestion = useCallback(async (suggestionId: string, applyState?: boolean) => {
    console.log("handleApplySuggestion called with:", { 
      suggestionId, 
      applyState, 
      resumeId: resumeData?.id 
    });
    
    // Validate resume data is available
    if (!resumeData?.id) {
      console.error("Cannot apply suggestion: No resume data available");
      return false;
    }
    
    // Find the suggestion by ID
    const suggestion = suggestions.find(s => s.id === suggestionId);
    
    console.log("Found matching suggestion:", suggestion);
    
    // Validate suggestion exists
    if (!suggestion) {
      console.error("Suggestion not found with ID:", suggestionId);
      console.log("Available suggestions:", suggestions);
      return false;
    }
    
    // Determine new applied state (toggle current if not explicitly provided)
    const newIsApplied = applyState !== undefined ? applyState : !suggestion.isApplied;
    
    try {
      // Update local state only - database updates happen on save
      setSuggestions(prevSuggestions => 
        prevSuggestions.map(s => 
          s.id === suggestionId ? { ...s, isApplied: newIsApplied } : s
        )
      );
      
      // Update score management
      applySuggestionScore(suggestion, newIsApplied);
      
      // Mark content as modified since applying suggestions is a change
      setContentModified(true);
      
      // Provide user feedback
      toast.success(newIsApplied ? 
        "Suggestion applied" : 
        "Suggestion removed"
      );
      
      return true;
    } catch (error) {
      // Handle errors
      console.error("Error applying suggestion:", error);
      toast.error("Failed to apply suggestion");
      return false;
    }
  }, [resumeData?.id, suggestions, applySuggestionScore, setContentModified]);
  
  /**
   * Apply or unapply a keyword
   * Updates local state only, not database, until save is called
   * 
   * @param keywordId - ID of the keyword to apply/unapply
   * @param applyState - Optional explicit state to set (true/false), defaults to toggling current state
   * @returns Promise resolving to success status
   */
  const handleKeywordApply = useCallback(async (keywordId: string, applyState?: boolean) => {
    console.log("handleKeywordApply called with:", { 
      keywordId, 
      applyState, 
      resumeId: resumeData?.id 
    });
    
    // Validate resume data is available
    if (!resumeData?.id) {
      console.error("Cannot apply keyword: No resume data available");
      return false;
    }
    
    // Find the keyword by ID
    const keyword = keywords.find(k => k.id === keywordId);
    
    console.log("Found matching keyword:", keyword);
    
    // Validate keyword exists
    if (!keyword) {
      console.error("Keyword not found with ID:", keywordId);
      console.log("Available keywords:", keywords);
      return false;
    }
    
    // Determine new applied state (toggle current if not explicitly provided)
    const newIsApplied = applyState !== undefined ? applyState : !keyword.isApplied;
    
    try {
      // Update local state only - database updates happen on save
      setKeywords(prevKeywords => 
        prevKeywords.map(k => 
          k.id === keywordId ? { 
            ...k, 
            isApplied: newIsApplied,
            applied: newIsApplied // Update both properties for compatibility
          } : k
        )
      );
      
      // Update score management
      applyKeywordScore(keyword, newIsApplied);
      
      // Mark content as modified since applying keywords is a change
      setContentModified(true);
      
      // Provide user feedback
      toast.success(newIsApplied ? 
        "Keyword applied" : 
        "Keyword removed"
      );
      
      return true;
    } catch (error) {
      // Handle errors
      console.error("Error applying keyword:", error);
      toast.error("Failed to apply keyword");
      return false;
    }
  }, [resumeData?.id, keywords, applyKeywordScore, setContentModified]);
  
  /**
   * Update resume state with optimized data from API or upload
   * Sets all relevant state for newly optimized content
   * 
   * @param optimizedTextContent - Optimized text content
   * @param resumeId - ID of the resume
   * @param scoreValue - ATS score value
   * @param suggestionsData - Suggestions data from optimization
   * @param keywordsData - Keywords data from optimization
   */
  const updateResumeWithOptimizedData = useCallback((
    optimizedTextContent: string,
    resumeId: string,
    scoreValue: number,
    suggestionsData: any[],
    keywordsData: any[]
  ) => {
    // Use centralized normalizers for consistent data structure
    const normalizedSuggestions = normalizeSuggestions(suggestionsData);
    const normalizedKeywords = normalizeKeywords(keywordsData);
    
    // Update text content states
    setOriginalText(optimizedTextContent);
    setOptimizedText(optimizedTextContent);
    setEditedText(optimizedTextContent);
    
    // Set ATS score
    setBaseScore(scoreValue);
    
    // Update suggestions and keywords with normalized data
    setSuggestions(normalizedSuggestions);
    setKeywords(normalizedKeywords);
    
    // Reset modification flags for fresh optimization
    setContentModified(false);
    
    // Reload complete resume data if ID changed or no data exists yet
    if (!resumeData || resumeData.id !== resumeId) {
      getLatestOptimizedResume(userId || '')
        .then(({ data: apiData }) => {
          if (apiData) {
            // Use centralized normalizer for API data
            const optimizedData = normalizeApiData(apiData);
            
            // Update resume data and status
            setResumeData(optimizedData);
            setHasResume(true);
            
            // Set template if available
            if (optimizedData.selected_template) {
              setSelectedTemplate(optimizedData.selected_template);
            }
          }
        })
        .catch(error => console.error("Error fetching resume data:", error));
    }
    
    // Update resume status
    setHasResume(true);
    hasLoadedDataRef.current = true;
    
    // Switch to preview tab
    setActiveTab('preview');
    
    // Provide user feedback
    toast.success("Resume optimized successfully!", {
      description: "Your resume has been analyzed and improved by our AI.",
      duration: 5000,
    });
  }, [resumeData, userId, setBaseScore, setActiveTab]);
  
  /**
   * Update template selection and save to database
   * 
   * @param templateId - ID of the template to select
   * @returns Promise resolving to success status
   */
  const updateSelectedTemplate = useCallback(async (templateId: string) => {
    // Validate resume data is available
    if (!resumeData?.id) return false;
    
    try {
      // Call API to update template
      const { success, error } = await updateResumeTemplate(resumeData.id, templateId);
      
      // Handle API errors
      if (!success) throw error;
      
      // Update local state
      setSelectedTemplate(templateId);
      
      // Update resume data if available
      if (resumeData) {
        setResumeData({
          ...resumeData,
          selected_template: templateId
        });
      }
      
      // Provide user feedback
      toast.success("Template updated successfully");
      return true;
    } catch (error) {
      // Handle errors
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
      return false;
    }
  }, [resumeData]);
  
  /**
   * Check if there are unsaved changes
   * Used to determine if save button should be enabled
   * 
   * @returns Boolean indicating if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    return contentModified || scoreModified;
  }, [contentModified, scoreModified]);
  
  /**
   * Get array of applied keywords for templates
   * 
   * @returns Array of applied keyword text strings
   */
  const getAppliedKeywords = useCallback(() => {
    return keywords
      .filter(keyword => keyword.isApplied || keyword.applied)
      .map(keyword => keyword.text);
  }, [keywords]);
  
  /**
   * Calculate the current completion score
   * Represents the percentage of suggestions and keywords applied
   * 
   * @returns Completion percentage (0-100)
   */
  const calculateCompletionScore = useCallback(() => {
    // Return 0 if no items to calculate
    if (!suggestions.length && !keywords.length) return 0;
    
    // Count applied items
    const appliedSuggestions = suggestions.filter(s => s.isApplied).length;
    const appliedKeywords = keywords.filter(k => k.isApplied || k.applied).length;
    
    // Calculate total items and applied ratio
    const totalItems = suggestions.length + keywords.length;
    const appliedItems = appliedSuggestions + appliedKeywords;
    
    // Return percentage
    return Math.round((appliedItems / totalItems) * 100);
  }, [suggestions, keywords]);
  
  /**
   * Check if save button should be enabled
   * 
   * @returns Boolean indicating if save button should be enabled
   */
  const shouldEnableSaveButton = useCallback(() => {
    return contentModified || scoreModified;
  }, [contentModified, scoreModified]);
  
  // Effects for welcome toast and data loading
  
  /**
   * Effect to check for session storage welcome toast on mount
   * Prevents showing welcome toast multiple times in the same session
   */
  useEffect(() => {
    try {
      const lastToastTime = sessionStorage.getItem('welcomeToastTime');
      
      if (lastToastTime) {
        const lastTime = parseInt(lastToastTime, 10);
        const currentTime = Date.now();
        
        // Consider toast shown if it was displayed in the last 15 minutes
        if (currentTime - lastTime < 15 * 60 * 1000) {
          welcomeToastDisplayedRef.current = true;
          setToastShown(true);
        }
      }
    } catch (e) {
      // Ignore session storage errors
    }
    
    // Save toast timestamp when component unmounts
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
  
  /**
   * Effect to load resume on initial mount if userId is available
   * Only loads if no data exists yet and not previously loaded
   */
  useEffect(() => {
    if (userId && hasResume === null && !hasLoadedDataRef.current) {
      loadLatestResume();
    }
  }, [userId, hasResume, loadLatestResume]);
  
  /**
   * Improved effect for welcome toasts
   * Shows toast when loading completes and resume status is determined
   */
  useEffect(() => {
    // Skip if toast already shown
    if (toastShown) return;
    
    // Track loading state changes
    const wasLoading = previousLoadingState.current;
    previousLoadingState.current = isLoading;
    
    // Only proceed when loading completes
    if ((!wasLoading && !isLoading) || isLoading) return;
    
    // Wait for resume status to be determined
    if (hasResume === null) return;
    
    // Mark toast as shown
    setToastShown(true);
    welcomeToastDisplayedRef.current = true;
    
    // Save toast timestamp to session storage
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