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
import { ResumeData, Suggestion, Keyword } from '@/types/resume';

/**
 * Custom hook for resume optimization management
 * @param userId - The user ID for data fetching
 */
export const useResumeOptimizer = (userId?: string) => {
  // ===== STATE MANAGEMENT =====
  
  // Resume content state
  const [resumeData, setResumeData] = useState<any | null>(null);
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
   * Load the latest resume for a user
   * Handles both the initial data loading and subsequent refresh requests
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
      const { data: resumeData, error } = await getLatestOptimizedResume(userId);
      
      if (error) {
        console.error("Error loading resume:", error);
        throw error;
      }
      
      if (resumeData) {
        console.log("Resume loaded successfully:", resumeData.id);
        
        // Update resume data state
        setResumeData(resumeData);
        setHasResume(true);
        hasLoadedDataRef.current = true;
        
        // Store original text from optimized_text for reset functionality
        setOriginalText(resumeData.optimized_text || '');
        
        // Determine which content to display
        if (resumeData.last_saved_text) {
          // If there are saved edits, show those
          setOptimizedText(resumeData.last_saved_text);
          setEditedText(resumeData.last_saved_text);
        } else {
          // Otherwise show original optimized content
          setOptimizedText(resumeData.optimized_text || '');
          setEditedText(resumeData.optimized_text || '');
        }
        
        // Set the original and current scores
        setOriginalAtsScore(resumeData.ats_score || 65);
        setCurrentAtsScore(resumeData.last_saved_score_ats !== null ? 
          resumeData.last_saved_score_ats : 
          resumeData.ats_score);
        
        // Prepare suggestions and keywords with proper structure
        const formattedSuggestions = Array.isArray(resumeData.suggestions) 
          ? resumeData.suggestions.map((s: any) => ({
              id: s.id || s.suggestion_id || String(Math.random()),
              text: s.text || '',
              type: s.type || 'general',
              impact: s.impact || '',
              is_applied: s.is_applied || false
            }))
          : [];
          
        const formattedKeywords = Array.isArray(resumeData.keywords)
          ? resumeData.keywords.map((k: any) => ({
              id: k.id || k.keyword_id || String(Math.random()),
              text: k.keyword || k.text || '',
              is_applied: k.is_applied || false
            }))
          : [];
        
        setSuggestions(formattedSuggestions);
        setKeywords(formattedKeywords);
        
        // Set content as not modified initially
        setContentModified(false);
        
        // Set template if available
        if (resumeData.selected_template) {
          setSelectedTemplate(resumeData.selected_template);
        }
        
        return resumeData;
      } else {
        // No resume found - this is expected for new users
        console.log("No resume found for user");
        setHasResume(false);
        hasLoadedDataRef.current = true;
        return null;
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      toast.error("Erreur lors du chargement du CV");
      setHasResume(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  
  /**
   * Save the edited resume content, score, and applied enhancements
   * Updates the database with all current changes via service
   */
  const saveResume = useCallback(async (newContent?: string) => {
    // Use provided content or current edited text
    const contentToSave = newContent || editedText;
    
    if (!userId || !resumeData?.id || !contentToSave) {
      toast.error("Impossible de sauvegarder: Données manquantes");
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
      
      // Update local state
      setResumeData({
        ...resumeData,
        last_saved_text: contentToSave,
        last_saved_score_ats: currentAtsScore
      });
      
      // Update optimized text to show the saved content
      setOptimizedText(contentToSave);
      
      // Mark content as no longer modified since we just saved
      setContentModified(false);
      
      toast.success("Modifications sauvegardées avec succès");
      return true;
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Échec de la sauvegarde des modifications");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [userId, resumeData, editedText, currentAtsScore]);
  
  /**
   * Reset changes to the original optimized version
   * Clears all edits and applied enhancements via service
   */
  const resetResume = useCallback(async () => {
    if (!userId || !resumeData?.id) {
      toast.error("Impossible de réinitialiser: Données manquantes");
      return;
    }
    
    try {
      setIsResetting(true);
      
      // Use resumeService to reset resume to original version
      const { success, error } = await resetResumeToOriginal(resumeData.id);
      
      if (!success) throw error;
      
      // Update local state
      setResumeData({
        ...resumeData,
        last_saved_text: null,
        last_saved_score_ats: null
      });
      
      // Reset all content to original
      setOptimizedText(originalText);
      setEditedText(originalText);
      
      // Reset score to original
      setCurrentAtsScore(originalAtsScore);
      
      // Reset suggestions and keywords state
      setSuggestions(suggestions.map(s => ({ ...s, is_applied: false })));
      setKeywords(keywords.map(k => ({ ...k, is_applied: false })));
      
      // Reset editing state
      setIsEditing(false);
      setContentModified(false);
      
      toast.success("CV réinitialisé à la version originale");
    } catch (error) {
      console.error("Error resetting resume:", error);
      toast.error("Échec de la réinitialisation du CV");
    } finally {
      setIsResetting(false);
    }
  }, [userId, resumeData, originalText, originalAtsScore, suggestions, keywords]);
  
  /**
   * Handle content changes in the editor
   * Tracks modifications and updates edited content
   */
  const handleContentEdit = useCallback((newContent: string) => {
    setEditedText(newContent);
    setContentModified(true);
    
    // Re-calculate score based on the new content if needed
    // This is a simplified approach - a real implementation might
    // analyze the content more deeply for accurate scoring
    const currentAppliedSuggestions = suggestions.filter(s => s.is_applied).length;
    const currentAppliedKeywords = keywords.filter(k => k.is_applied).length;
    
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
   */
  const handleApplySuggestion = useCallback(async (suggestionId: string, applyState?: boolean) => {
    if (!resumeData?.id) return;
    
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    // Determine new applied state (toggle if not specified)
    const newIsApplied = applyState !== undefined ? applyState : !suggestion.is_applied;
    
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
        s.id === suggestionId ? { ...s, is_applied: newIsApplied } : s
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
        "Suggestion appliquée" : 
        "Suggestion retirée"
      );
    } catch (error) {
      console.error("Error applying suggestion:", error);
      toast.error("Échec de l'application de la suggestion");
    }
  }, [resumeData?.id, suggestions, originalAtsScore]);
  
  /**
   * Apply or unapply a keyword
   * Updates keyword state and recalculates ATS score
   */
  const handleKeywordApply = useCallback(async (keywordId: string, applyState?: boolean) => {
    if (!resumeData?.id) return;
    
    // Find the keyword
    const keyword = keywords.find(k => k.id === keywordId);
    if (!keyword) return;
    
    // Determine new applied state (toggle if not specified)
    const newIsApplied = applyState !== undefined ? applyState : !keyword.is_applied;
    
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
        k.id === keywordId ? { ...k, is_applied: newIsApplied } : k
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
        "Mot-clé appliqué" : 
        "Mot-clé retiré"
      );
    } catch (error) {
      console.error("Error applying keyword:", error);
      toast.error("Échec de l'application du mot-clé");
    }
  }, [resumeData?.id, keywords, originalAtsScore]);
  
  /**
   * Update resume state with optimized data from API or upload
   * Used after initial optimization to populate all components
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
        .then(({ data }) => {
          if (data) {
            setResumeData(data);
            setHasResume(true);
            
            // Set template if available
            if (data.selected_template) {
              setSelectedTemplate(data.selected_template);
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
   */
  const updateSelectedTemplate = useCallback(async (templateId: string) => {
    if (!resumeData?.id) return;
    
    try {
      // Call service to update template
      const { success, error } = await updateResumeTemplate(resumeData.id, templateId);
      
      if (!success) throw error;
      
      // Update local state only after successful DB update
      setSelectedTemplate(templateId);
      
      toast.success("Template mis à jour avec succès");
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Échec de la mise à jour du template");
    }
  }, [resumeData]);
  
  /**
   * Check if there are unsaved changes
   * Used to warn users before navigating away
   */
  const hasUnsavedChanges = useCallback(() => {
    return contentModified;
  }, [contentModified]);
  
  /**
   * Get array of applied keywords for templates
   */
  const getAppliedKeywords = useCallback(() => {
    return keywords
      .filter(keyword => keyword.is_applied)
      .map(keyword => keyword.text);
  }, [keywords]);
  
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
    
    // Direct state setters (use with caution)
    setOptimizedText,
    setCurrentAtsScore,
    setSuggestions,
    setKeywords,
    setContentModified
  };
};

export default useResumeOptimizer;