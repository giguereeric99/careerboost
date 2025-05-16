/**
 * useResumeOptimizer Hook
 * 
 * Core hook that manages the entire resume optimization workflow including:
 * - Loading resume data from the database via services
 * - Managing optimized content and edited content
 * - Tracking ATS score, suggestions, and keywords
 * - Handling editing state and template selection
 * - Providing save, reset, and update functionality
 * - Properly handling loading states and user feedback
 * - Showing welcome toasts for new and returning users
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  getLatestOptimizedResume,
  saveResumeComplete, // New atomic save function
  resetResumeToOriginal,
  updateResumeTemplate
} from '@/services/resumeService';
import { parseOptimizedText, calculateAtsScore } from '@/services/resumeParser';
import { 
  OptimizedResumeData, 
  Suggestion, 
  Keyword
} from '@/types/resumeTypes';

/**
 * Type guard to check if a value is not null or undefined
 * Used for safer type narrowing in TypeScript
 * 
 * @param value - Value to check
 * @returns Boolean indicating if value is defined (type predicate)
 */
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Normalizes a suggestion object to ensure consistent structure
 * Handles different property naming conventions (camelCase vs snake_case)
 * 
 * @param suggestion - Raw suggestion from API or other source
 * @returns Normalized suggestion with consistent property names
 */
function normalizeSuggestion(suggestion: any): Suggestion {
  return {
    // Generate ID if missing with fallbacks
    id: suggestion.id || suggestion.suggestion_id || String(Math.random()),
    // Ensure basic text properties
    text: suggestion.text || suggestion.original_text || '',
    type: suggestion.type || 'general',
    impact: suggestion.impact || '',
    // Handle both naming conventions for applied state
    isApplied: suggestion.isApplied || suggestion.is_applied || false,
    // Include pointImpact for score calculations
    pointImpact: suggestion.pointImpact || suggestion.point_impact || 2
  };
}

/**
 * Normalizes a keyword object to ensure consistent structure
 * Handles different property naming conventions and formats
 * 
 * @param keyword - Raw keyword from API (string or object)
 * @returns Normalized keyword with consistent property names
 */
function normalizeKeyword(keyword: any): Keyword {
  // Handle case where keyword is just a string
  if (typeof keyword === 'string') {
    return {
      id: String(Math.random()),
      text: keyword,
      isApplied: false,
      relevance: 1,
      pointImpact: 1
    };
  }
  
  // Handle keyword as an object with potential varying property names
  return {
    id: keyword.id || keyword.keyword_id || String(Math.random()),
    text: keyword.text || keyword.keyword || '',
    // Support all possible variations of the applied property
    isApplied: keyword.isApplied || keyword.is_applied || keyword.applied || false,
    relevance: keyword.relevance || 1,
    pointImpact: keyword.pointImpact || keyword.point_impact || 1
  };
}

/**
 * Custom hook for resume optimization management
 * Provides comprehensive state and operations for resume editing workflow
 * 
 * @param userId - The user ID for data fetching
 * @returns Object containing state and methods for resume optimization
 */
export const useResumeOptimizer = (userId?: string) => {
  // ===== STATE MANAGEMENT =====
  
  // Resume content state
  const [resumeData, setResumeData] = useState<OptimizedResumeData | null>(null);
  const [originalText, setOriginalText] = useState<string>(''); // Original optimized text from AI
  const [optimizedText, setOptimizedText] = useState<string>(''); // Current displayed text (either original or edited)
  const [editedText, setEditedText] = useState<string>(''); // User edited content in edit mode
  
  // Scoring and enhancement data
  const [originalAtsScore, setOriginalAtsScore] = useState<number | null>(null); // Original AI score
  const [currentAtsScore, setCurrentAtsScore] = useState<number | null>(null); // Current/edited score
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  
  // UI state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic');
  const [contentModified, setContentModified] = useState<boolean>(false);
  // New state to track whether score has been modified specifically
  const [scoreModified, setScoreModified] = useState<boolean>(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  
  // Resume status
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');
  
  // Track initial load attempt to prevent infinite loops
  const loadAttemptRef = useRef<number>(0);
  const hasLoadedDataRef = useRef<boolean>(false);
  
  // Toast management to prevent duplicates
  const [toastShown, setToastShown] = useState<boolean>(false);
  const welcomeToastDisplayedRef = useRef<boolean>(false);
  const previousLoadingState = useRef<boolean>(true); // Start as true to prevent immediate toast

  /**
   * Convert API data to our standardized format
   * Handles mapping between different property names and ensures consistent structure
   * 
   * @param apiData - Raw data from API
   * @returns Formatted data with proper structure
   */
  const convertApiDataToOptimizedFormat = (apiData: any): OptimizedResumeData => {
    console.log('Converting API data to optimized format:', apiData);
    
    // Convert keywords from API format to application format with enhanced normalization
    const formattedKeywords: Keyword[] = Array.isArray(apiData.keywords) 
      ? apiData.keywords.map(normalizeKeyword)
      : [];
    
    // Convert suggestions from API format to application format with enhanced normalization
    const formattedSuggestions: Suggestion[] = Array.isArray(apiData.suggestions) 
      ? apiData.suggestions.map(normalizeSuggestion)
      : [];

    // Log normalized data for debugging
    console.log('Normalized suggestions:', formattedSuggestions);
    console.log('Normalized keywords:', formattedKeywords);
    
    // Map to our OptimizedResumeData format with correct type handling
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
  };

  /**
   * Load the latest resume for a user
   * Handles both the initial data loading and subsequent refresh requests
   * 
   * @returns The loaded resume data or null if none found
   */
  const loadLatestResume = useCallback(async () => {
    // Don't attempt loading without a user ID
    if (!userId) {
      console.log("No user ID provided, skipping resume load");
      return null;
    }
    
    // Increment load attempt counter to prevent infinite loops
    loadAttemptRef.current += 1;
    
    // Prevent excessive load attempts
    if (loadAttemptRef.current > 3) {
      console.log("Maximum resume load attempts reached");
      return null;
    }
    
    try {
      // Set loading state to true to show loading UI
      setIsLoading(true);
      
      // Fetch latest resume from service
      const { data: apiData, error } = await getLatestOptimizedResume(userId);
      
      if (error) {
        console.error("Error loading resume:", error);
        throw error;
      }
      
      if (apiData) {
        console.log("Resume loaded successfully:", apiData.id);
        
        // Convert API data to standard format
        const optimizedData = convertApiDataToOptimizedFormat(apiData);
        
        // Update resume data state
        setResumeData(optimizedData);
        setHasResume(true);
        hasLoadedDataRef.current = true;
        
        // Store original text from optimized_text for reset functionality
        setOriginalText(optimizedData.optimized_text || '');
        
        // Determine which content to display
        if (optimizedData.last_saved_text) {
          // If there are saved edits, show those
          setOptimizedText(optimizedData.last_saved_text);
          setEditedText(optimizedData.last_saved_text);
        } else {
          // Otherwise show original optimized content
          setOptimizedText(optimizedData.optimized_text || '');
          setEditedText(optimizedData.optimized_text || '');
        }
        
        // Set the original and current scores
        setOriginalAtsScore(optimizedData.ats_score || 65);
        
        // Safely update the current ATS score
        const effectiveScore = isDefined(optimizedData.last_saved_score_ats) 
          ? optimizedData.last_saved_score_ats 
          : optimizedData.ats_score;
        setCurrentAtsScore(effectiveScore);
        
        // Set suggestions and keywords
        setSuggestions(optimizedData.suggestions || []);
        setKeywords(optimizedData.keywords || []);
        
        // Reset modification states initially
        setContentModified(false);
        setScoreModified(false);
        
        // Set template if available
        if (optimizedData.selected_template) {
          setSelectedTemplate(optimizedData.selected_template);
        }
        
        return optimizedData;
      } else {
        // No resume found - this is expected for new users
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
      // Always reset loading state when finished, regardless of outcome
      setIsLoading(false);
    }
  }, [userId]);
  
  /**
   * Save the edited resume content, score, and applied enhancements
   * Updates the database with all current changes via service
   * 
   * @param newContent - Optional content to save instead of current editedText
   * @returns Boolean indicating if save was successful
   */
  const saveResume = useCallback(async (newContent?: string) => {
    // Use provided content or current edited text
    const contentToSave = newContent || editedText;
    
    // Validate required data
    if (!userId || !resumeData?.id || !contentToSave) {
      console.error("Cannot save: Missing data", { userId, resumeId: resumeData?.id, contentLength: contentToSave?.length });
      toast.error("Cannot save: Missing data");
      return false;
    }
    
    try {
      // Set saving state to show loading indicators
      setIsSaving(true);
      
      // Get all applied suggestion IDs
      const appliedSuggestionIds = suggestions
        .filter(s => s.isApplied)
        .map(s => s.id);
      
      // Get all applied keywords
      const appliedKeywords = keywords
        .filter(k => k.isApplied)
        .map(k => k.text);
      
      // Log saving attempt with complete details
      console.log("Saving resume with atomic transaction:", {
        resumeId: resumeData.id,
        contentLength: contentToSave.length,
        atsScore: currentAtsScore || 0,
        appliedSuggestions: appliedSuggestionIds.length,
        appliedKeywords: appliedKeywords.length
      });
      
      // Use the new atomic save function that handles all changes in a single transaction
      const { success, error } = await saveResumeComplete(
        resumeData.id, 
        contentToSave, 
        currentAtsScore || 0,
        appliedSuggestionIds,
        appliedKeywords
      );
      
      // Handle errors from the service
      if (!success) {
        console.error("Error from saveResumeComplete:", error);
        throw error;
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
      // toast.success("All changes saved successfully");
      
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
   * Reset changes to the original optimized version
   * Clears all edits and applied enhancements via service
   * 
   * @returns Boolean indicating if reset was successful
   */
  const resetResume = useCallback(async () => {
    if (!userId || !resumeData?.id) {
      toast.error("Cannot reset: Missing data");
      return false;
    }
    
    try {
      setIsResetting(true);
      
      // Use resumeService to reset resume to original version
      const { success, error } = await resetResumeToOriginal(resumeData.id);
      
      if (!success) throw error;
      
      // Update local state with type safety
      if (resumeData) {
        setResumeData({
          ...resumeData,
          last_saved_text: undefined,
          last_saved_score_ats: undefined
        });
      }
      
      // Reset all content to original
      setOptimizedText(originalText);
      setEditedText(originalText);
      
      // Reset score to original
      setCurrentAtsScore(originalAtsScore);
      
      // Reset suggestions and keywords state
      // Important: Create new arrays to trigger re-render
      setSuggestions(prevSuggestions => 
        prevSuggestions.map(s => ({ ...s, isApplied: false }))
      );
      setKeywords(prevKeywords => 
        prevKeywords.map(k => ({ ...k, isApplied: false, applied: false }))
      );
      
      // Reset editing state
      setIsEditing(false);
      setContentModified(false);
      setScoreModified(false);
      
      toast.success("Resume reset to original version");
      return true;
    } catch (error) {
      console.error("Error resetting resume:", error);
      toast.error("Failed to reset resume");
      return false;
    } finally {
      setIsResetting(false);
    }
  }, [userId, resumeData, originalText, originalAtsScore, suggestions, keywords]);
  
  /**
   * Handle content changes in the editor
   * Tracks modifications and updates edited content
   * 
   * @param newContent - The new content from the editor
   */
  const handleContentEdit = useCallback((newContent: string) => {
    setEditedText(newContent);
    setContentModified(true);
    
    // Re-calculate score based on the new content if needed
    // This is a simplified approach - a real implementation might
    // analyze the content more deeply for accurate scoring
    const currentAppliedSuggestions = suggestions.filter(s => s.isApplied).length;
    const currentAppliedKeywords = keywords.filter(k => k.isApplied).length;
    
    // Simple scoring formula that could be enhanced with real content analysis
    const baseScore = originalAtsScore || 65;
    const suggestionsBonus = currentAppliedSuggestions * 2; // Each suggestion worth 2 points
    const keywordsBonus = currentAppliedKeywords * 1; // Each keyword worth 1 point
    const newScore = Math.min(100, baseScore + suggestionsBonus + keywordsBonus);
    
    // Update the score and mark it as modified if it changed
    if (newScore !== currentAtsScore) {
      setCurrentAtsScore(newScore);
      setScoreModified(true);
    }
  }, [suggestions, keywords, originalAtsScore, currentAtsScore]);
  
  /**
   * Apply or unapply a suggestion - LOCAL STATE ONLY
   * Updates ONLY local suggestion state and recalculates ATS score
   * No longer makes individual API calls - changes will be saved atomically later
   * 
   * @param suggestionId - ID of the suggestion to apply/unapply
   * @param applyState - Optional boolean to force specific state (true/false)
   * @returns Boolean indicating if operation was successful
   */
  const handleApplySuggestion = useCallback((suggestionId: string, applyState?: boolean) => {
    // Log the operation with all details for debugging
    console.log("handleApplySuggestion called with:", { 
      suggestionId, 
      applyState, 
      resumeId: resumeData?.id 
    });
    
    if (!resumeData?.id) {
      console.error("Cannot apply suggestion: No resume data available");
      return false;
    }
    
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId);
    
    // Log the matched suggestion
    console.log("Found matching suggestion:", suggestion);
    
    if (!suggestion) {
      console.error("Suggestion not found with ID:", suggestionId);
      console.log("Available suggestions:", suggestions);
      return false;
    }
    
    // Determine new applied state (toggle if not specified)
    const newIsApplied = applyState !== undefined ? applyState : !suggestion.isApplied;
    
    try {
      // Update local state ONLY - no API call
      setSuggestions(prevSuggestions => 
        prevSuggestions.map(s => 
          s.id === suggestionId ? { ...s, isApplied: newIsApplied } : s
        )
      );
      
      // Update score locally
      const scoreDelta = newIsApplied ? 2 : -2; // Each suggestion is worth 2 points
      setCurrentAtsScore(prevScore => {
        if (!prevScore) return originalAtsScore || 65;
        const newScore = prevScore + scoreDelta;
        return Math.min(100, Math.max(0, newScore)); // Ensure score stays between 0-100
      });
      
      // Mark content and score as modified since applying suggestions is a change
      setContentModified(true);
      setScoreModified(true);
      
      // Success notification is now optional since changes aren't saved yet
      // toast.success(newIsApplied ? "Suggestion applied locally" : "Suggestion removed locally");
      
      return true;
    } catch (error) {
      console.error("Error applying suggestion locally:", error);
      toast.error("Failed to apply suggestion");
      return false;
    }
  }, [resumeData?.id, suggestions, originalAtsScore]);
  
  /**
   * Apply or unapply a keyword - LOCAL STATE ONLY
   * Updates ONLY local keyword state and recalculates ATS score
   * No longer makes individual API calls - changes will be saved atomically later
   * 
   * @param keywordId - ID of the keyword to apply/unapply
   * @param applyState - Optional boolean to force specific state (true/false)
   * @returns Boolean indicating if operation was successful
   */
  const handleKeywordApply = useCallback((keywordId: string, applyState?: boolean) => {
    // Log the operation with all details for debugging
    console.log("handleKeywordApply called with:", { 
      keywordId, 
      applyState, 
      resumeId: resumeData?.id 
    });
    
    if (!resumeData?.id) {
      console.error("Cannot apply keyword: No resume data available");
      return false;
    }
    
    // Find the keyword
    const keyword = keywords.find(k => k.id === keywordId);
    
    // Log the matched keyword
    console.log("Found matching keyword:", keyword);
    
    if (!keyword) {
      console.error("Keyword not found with ID:", keywordId);
      console.log("Available keywords:", keywords);
      return false;
    }
    
    // Determine new applied state (toggle if not specified)
    const newIsApplied = applyState !== undefined ? applyState : !keyword.isApplied;
    
    try {
      // Update local state ONLY - no API call
      setKeywords(prevKeywords => 
        prevKeywords.map(k => 
          k.id === keywordId ? { ...k, isApplied: newIsApplied } : k
        )
      );
      
      // Update score locally
      const scoreDelta = newIsApplied ? 1 : -1; // Each keyword is worth 1 point
      setCurrentAtsScore(prevScore => {
        if (!prevScore) return originalAtsScore || 65;
        const newScore = prevScore + scoreDelta;
        return Math.min(100, Math.max(0, newScore)); // Ensure score stays between 0-100
      });
      
      // Mark content and score as modified since applying keywords is a change
      setContentModified(true);
      setScoreModified(true);
      
      // Success notification is now optional since changes aren't saved yet
      // toast.success(newIsApplied ? "Keyword applied locally" : "Keyword removed locally");
      
      return true;
    } catch (error) {
      console.error("Error applying keyword locally:", error);
      toast.error("Failed to apply keyword");
      return false;
    }
  }, [resumeData?.id, keywords, originalAtsScore]);
  
  /**
   * Update resume state with optimized data from API or upload
   * Used after initial optimization to populate all components
   * 
   * @param optimizedTextContent - The optimized text content
   * @param resumeId - ID of the resume
   * @param scoreValue - ATS score value
   * @param suggestionsData - Array of suggestions
   * @param keywordsData - Array of keywords
   */
  const updateResumeWithOptimizedData = useCallback((
    optimizedTextContent: string,
    resumeId: string,
    scoreValue: number,
    suggestionsData: any[],  // Type any[] to accept different structures
    keywordsData: any[]      // Type any[] to accept different structures
  ) => {
    console.log("Updating resume with optimized data:", {
      resumeId,
      scoreValue,
      suggestionsCount: suggestionsData?.length || 0,
      keywordsCount: keywordsData?.length || 0
    });
    
    // Normalize suggestions to ensure consistent structure
    const normalizedSuggestions = Array.isArray(suggestionsData) 
      ? suggestionsData.map((suggestion, index) => {
          // Log suggestions without IDs for debugging
          if (!suggestion.id) {
            console.warn(`Suggestion without ID detected (index ${index}):`, suggestion);
          }
          return normalizeSuggestion(suggestion);
        })
      : [];
    
    // Normalize keywords to ensure consistent structure
    const normalizedKeywords = Array.isArray(keywordsData)
      ? keywordsData.map((keyword, index) => {
          // Log keywords without IDs for debugging
          if (typeof keyword !== 'string' && !keyword.id) {
            console.warn(`Keyword without ID detected (index ${index}):`, keyword);
          }
          return normalizeKeyword(keyword);
        })
      : [];
    
    console.log("Normalized suggestions:", normalizedSuggestions);
    console.log("Normalized keywords:", normalizedKeywords);
    
    // Update content state
    setOriginalText(optimizedTextContent);
    setOptimizedText(optimizedTextContent);
    setEditedText(optimizedTextContent);
    
    // Update score state
    setOriginalAtsScore(scoreValue);
    setCurrentAtsScore(scoreValue);
    
    // Update enhancements state with normalized data
    setSuggestions(normalizedSuggestions);
    setKeywords(normalizedKeywords);
    
    // Reset modification tracking
    setContentModified(false);
    setScoreModified(false);
    
    // Fetch the complete resume data if not already available
    if (!resumeData || resumeData.id !== resumeId) {
      getLatestOptimizedResume(userId || '')
        .then(({ data: apiData }) => {
          if (apiData) {
            // Convert API data to standard format
            const optimizedData = convertApiDataToOptimizedFormat(apiData);
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
    
    // Mark that we now have resume data
    setHasResume(true);
    hasLoadedDataRef.current = true;
    
    // Switch to preview tab
    setActiveTab('preview');
    
    // Show optimization success toast
    toast.success("Resume optimized successfully!", {
      description: "Your resume has been analyzed and improved by our AI.",
      duration: 5000,
    });
  }, [resumeData, userId]);
  
  /**
   * Update template selection and save to database
   * 
   * @param templateId - ID of the template to select
   * @returns Boolean indicating if operation was successful
   */
  const updateSelectedTemplate = useCallback(async (templateId: string) => {
    if (!resumeData?.id) return false;
    
    try {
      // Call service to update template
      const { success, error } = await updateResumeTemplate(resumeData.id, templateId);
      
      if (!success) throw error;
      
      // Update local state only after successful DB update
      setSelectedTemplate(templateId);
      
      // Also update the resume data template if it exists
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
   * Used to warn users before navigating away
   * 
   * @returns Boolean indicating if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    // Consider both content and score modifications
    return contentModified || scoreModified;
  }, [contentModified, scoreModified]);
  
  /**
   * Get array of applied keywords for templates
   * 
   * @returns Array of applied keyword texts
   */
  const getAppliedKeywords = useCallback(() => {
    return keywords
      .filter(keyword => keyword.isApplied)
      .map(keyword => keyword.text);
  }, [keywords]);
  
  /**
   * Calculate the current completion score
   * Based on applied suggestions and keywords
   * 
   * @returns Score between 0-100
   */
  const calculateCompletionScore = useCallback(() => {
    if (!suggestions.length && !keywords.length) return 0;
    
    const appliedSuggestions = suggestions.filter(s => s.isApplied).length;
    const appliedKeywords = keywords.filter(k => k.isApplied).length;
    
    const totalItems = suggestions.length + keywords.length;
    const appliedItems = appliedSuggestions + appliedKeywords;
    
    return Math.round((appliedItems / totalItems) * 100);
  }, [suggestions, keywords]);
  
  // Check for session storage welcome toast on mount
  useEffect(() => {
    // Check if a toast was shown recently
    try {
      const lastToastTime = sessionStorage.getItem('welcomeToastTime');
      
      if (lastToastTime) {
        const lastTime = parseInt(lastToastTime, 10);
        const currentTime = Date.now();
        
        // If a toast was shown in the last 15 minutes, 
        // mark it as already displayed
        if (currentTime - lastTime < 15 * 60 * 1000) { // 15 minutes in ms
          welcomeToastDisplayedRef.current = true;
          setToastShown(true);
        }
      }
    } catch (e) {
      // Ignore session storage errors
    }
    
    return () => {
      // On unmount, save the toast time if a toast has been displayed
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
  
  // Improved effect for welcome toasts that handles loading transitions correctly
  useEffect(() => {
    // Skip if toast has already been shown in this component instance
    if (toastShown) {
      return;
    }
    
    // The key logic: Only show toast when loading transitions from true to false
    const wasLoading = previousLoadingState.current;
    previousLoadingState.current = isLoading;
    
    // If we weren't loading before and we're still not loading now, skip
    // Or if we're still loading, skip
    if ((!wasLoading && !isLoading) || isLoading) {
      return;
    }
    
    // At this point, we know:
    // 1. Toast has not been shown yet in this session/component
    // 2. We just finished loading (transition from loading=true to loading=false)
    // 3. We know whether the user has a resume or not
    
    // Skip if we still don't know resume status
    if (hasResume === null) {
      return;
    }
    
    // Mark toast as shown
    setToastShown(true);
    welcomeToastDisplayedRef.current = true;
    
    // Save toast time to session storage
    try {
      sessionStorage.setItem('welcomeToastTime', Date.now().toString());
    } catch (e) {
      // Ignore session storage errors
    }
    
  }, [hasResume, isLoading, toastShown]);

  /**
   * Checks if the save button should be enabled
   * Called by UI components to determine button state
   * 
   * @returns Boolean indicating if save button should be enabled
   */
  const shouldEnableSaveButton = useCallback(() => {
    // Enable save button if either content or score is modified
    return contentModified || scoreModified;
  }, [contentModified, scoreModified]);
  
  // Return the hook interface with all state values and functions
  return {
    // State
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
    
    // Direct state setters (use with caution)
    setOptimizedText,        // Make sure this is included
    setCurrentAtsScore,
    setSuggestions,
    setKeywords,
    setContentModified,
    setScoreModified
  };
};

export default useResumeOptimizer;