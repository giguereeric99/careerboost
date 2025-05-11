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
import { parseOptimizedText, calculateAtsScore } from '@/services/resumeParser';
import { 
  OptimizedResumeData, 
  Suggestion, 
  Keyword
} from '@/types/resume';

// Type guard to check if a value is not null or undefined
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Custom hook for resume optimization management
 * @param userId - The user ID for data fetching
 * @returns Object containing state and methods for resume optimization
 */
export const useResumeOptimizer = (userId?: string) => {
  // ===== STATE MANAGEMENT =====
  
  // Resume content state
  const [resumeData, setResumeData] = useState<OptimizedResumeData | null>(null);
  const [originalText, setOriginalText] = useState<string>(''); // Original optimized text from AI
  const [optimizedText, setOptimizedText] = useState<string>(''); // Current display text (either original or edited)
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

  /**
   * Convert API data to our standardized format
   * Handles mapping between different property names
   * 
   * @param apiData - Raw data from API
   * @returns Formatted data with proper structure
   */
  const convertApiDataToOptimizedFormat = (apiData: any): OptimizedResumeData => {
    // Convert keywords from API format to application format
    const formattedKeywords: Keyword[] = Array.isArray(apiData.keywords) 
      ? apiData.keywords.map((k: any): Keyword => ({
          id: k.id || k.keyword_id || String(Math.random()),
          text: k.keyword || k.text || '',
          isApplied: k.is_applied || false,
          relevance: k.relevance || 1,
          pointImpact: k.point_impact || 1
        }))
      : [];
    
    // Convert suggestions from API format to application format
    const formattedSuggestions: Suggestion[] = Array.isArray(apiData.suggestions) 
      ? apiData.suggestions.map((s: any): Suggestion => ({
          id: s.id || s.suggestion_id || String(Math.random()),
          text: s.text || '',
          type: s.type || 'general',
          impact: s.impact || '',
          isApplied: s.is_applied || false,
          pointImpact: s.point_impact || 2
        }))
      : [];
    
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
        
        // Set content as not modified initially
        setContentModified(false);
        
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
    
    if (!userId || !resumeData?.id || !contentToSave) {
      toast.error("Cannot save: Missing data");
      return false;
    }
    
    try {
      setIsSaving(true);
      
      // Use resumeService to save content and score
      const { success, error } = await saveResumeContent(
        resumeData.id, 
        contentToSave, 
        currentAtsScore || 0
      );
      
      if (!success) throw error;
      
      // Update local state with type safety
      if (resumeData) {
        setResumeData({
          ...resumeData,
          last_saved_text: contentToSave,
          last_saved_score_ats: currentAtsScore
        });
      }
      
      // Update optimized text to show the saved content
      setOptimizedText(contentToSave);
      
      // Mark content as no longer modified since we just saved
      setContentModified(false);
      
      toast.success("Changes saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save changes");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId, resumeData, editedText, currentAtsScore]);
  
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
      setSuggestions(suggestions.map(s => ({ ...s, isApplied: false })));
      setKeywords(keywords.map(k => ({ ...k, isApplied: false })));
      
      // Reset editing state
      setIsEditing(false);
      setContentModified(false);
      
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
    
    setCurrentAtsScore(newScore);
  }, [suggestions, keywords, originalAtsScore]);
  
  /**
   * Apply or unapply a suggestion
   * Updates suggestion state and recalculates ATS score
   * 
   * @param suggestionId - ID of the suggestion to apply/unapply
   * @param applyState - Optional boolean to force specific state (true/false)
   * @returns Boolean indicating if operation was successful
   */
  const handleApplySuggestion = useCallback(async (suggestionId: string, applyState?: boolean) => {
    if (!resumeData?.id) return false;
    
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return false;
    
    // Determine new applied state (toggle if not specified)
    const newIsApplied = applyState !== undefined ? applyState : !suggestion.isApplied;
    
    try {
      // Update suggestion status through service
      const { success, error } = await updateSuggestionStatus(
        resumeData.id,
        suggestionId,
        newIsApplied
      );
      
      if (!success) throw error;
      
      // Update local state
      setSuggestions(suggestions.map(s => 
        s.id === suggestionId ? { ...s, isApplied: newIsApplied } : s
      ));
      
      // Update score 
      const scoreDelta = newIsApplied ? 2 : -2; // Each suggestion is worth 2 points
      setCurrentAtsScore(prevScore => {
        if (!prevScore) return originalAtsScore || 65;
        const newScore = prevScore + scoreDelta;
        return Math.min(100, Math.max(0, newScore)); // Ensure score stays between 0-100
      });
      
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
  }, [resumeData?.id, suggestions, originalAtsScore]);
  
  /**
   * Apply or unapply a keyword
   * Updates keyword state and recalculates ATS score
   * 
   * @param keywordId - ID of the keyword to apply/unapply
   * @param applyState - Optional boolean to force specific state (true/false)
   * @returns Boolean indicating if operation was successful
   */
  const handleKeywordApply = useCallback(async (keywordId: string, applyState?: boolean) => {
    if (!resumeData?.id) return false;
    
    // Find the keyword
    const keyword = keywords.find(k => k.id === keywordId);
    if (!keyword) return false;
    
    // Determine new applied state (toggle if not specified)
    const newIsApplied = applyState !== undefined ? applyState : !keyword.isApplied;
    
    try {
      // Update keyword status through service
      const { success, error } = await updateKeywordStatus(
        resumeData.id,
        keyword.text,
        newIsApplied
      );
      
      if (!success) throw error;
      
      // Update local state
      setKeywords(keywords.map(k => 
        k.id === keywordId ? { ...k, isApplied: newIsApplied } : k
      ));
      
      // Update score
      const scoreDelta = newIsApplied ? 1 : -1; // Each keyword is worth 1 point
      setCurrentAtsScore(prevScore => {
        if (!prevScore) return originalAtsScore || 65;
        const newScore = prevScore + scoreDelta;
        return Math.min(100, Math.max(0, newScore)); // Ensure score stays between 0-100
      });
      
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
    suggestionsData: Suggestion[],
    keywordsData: Keyword[]
  ) => {
    // Update content state
    setOriginalText(optimizedTextContent);
    setOptimizedText(optimizedTextContent);
    setEditedText(optimizedTextContent);
    
    // Update score state
    setOriginalAtsScore(scoreValue);
    setCurrentAtsScore(scoreValue);
    
    // Update enhancements state
    setSuggestions(suggestionsData);
    setKeywords(keywordsData);
    
    // Reset modification tracking
    setContentModified(false);
    
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
    return contentModified;
  }, [contentModified]);
  
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
  
  // Load resume on initial mount if userId is available
  useEffect(() => {
    if (userId && hasResume === null && !hasLoadedDataRef.current) {
      loadLatestResume();
    }
  }, [userId, hasResume, loadLatestResume]);
  
  return {
    // State
    resumeData,
    originalText,          // Original AI-optimized text (for reset)
    optimizedText,         // Current displayed text (either original or edited)
    editedText,            // Text being edited in edit mode
    originalAtsScore,      // Original AI score (for reset)
    currentAtsScore,       // Current/edited score
    suggestions,
    keywords,
    isEditing,
    selectedTemplate,
    contentModified,       // Whether there are unsaved changes
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
    
    // Direct state setters (use with caution)
    setOptimizedText,
    setCurrentAtsScore,
    setSuggestions,
    setKeywords,
    setContentModified
  };
};

export default useResumeOptimizer;