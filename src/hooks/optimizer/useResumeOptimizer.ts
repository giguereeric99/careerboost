/**
 * useResumeOptimizer Hook
 * 
 * Main hook for the resume optimization workflow. Manages the main state and operations
 * for the resume optimization process including loading, saving, and resetting resumes.
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createClientComponentClient } from '@/lib/supabase-client';
import { getLatestOptimizedResume, updateKeywordStatus, updateSuggestionStatus } from '@/services/resumeService';
import { parseOptimizedText, calculateAtsScore } from '@/services/resumeParser';
import { ResumeData, Suggestion, Keyword } from '@/types/resume';

/**
 * Custom hook for resume optimization management
 * @param userId - The user ID for data fetching
 */
export const useResumeOptimizer = (userId?: string) => {
  // Initialize Supabase client
  const supabase = createClientComponentClient();
  
  // Resume data state
  const [resumeData, setResumeData] = useState<any | null>(null);
  const [optimizedText, setOptimizedText] = useState<string>('');
  const [editedText, setEditedText] = useState<string>('');
  const [atsScore, setAtsScore] = useState<number | null>(null);
  
  // Optimization results state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  
  // UI state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic');
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  
  // Resume status
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');

  /**
   * Load the latest resume for a user
   * Uses the resumeService to fetch data from the server
   */
  const loadLatestResume = useCallback(async () => {
    if (!userId) return null;
    
    try {
      setIsLoading(true);
      
      // Fetch latest resume from service
      const { data: resumeData, error } = await getLatestOptimizedResume(userId);
      
      if (error) throw error;
      
      if (resumeData) {
        // Update resume data state
        setResumeData(resumeData);
        setHasResume(true);
        
        // Set the text based on availability
        if (resumeData.last_saved_text) {
          setEditedText(resumeData.last_saved_text);
          setOptimizedText(resumeData.optimized_text || '');
        } else if (resumeData.optimized_text) {
          setOptimizedText(resumeData.optimized_text);
        }
        
        // Set the score
        setAtsScore(resumeData.last_saved_score_ats || resumeData.ats_score);
        
        // Set suggestions and keywords
        setSuggestions(Array.isArray(resumeData.suggestions) ? resumeData.suggestions : []);
        setKeywords(Array.isArray(resumeData.keywords) ? resumeData.keywords : []);
        
        return resumeData;
      } else {
        // No resume found
        setHasResume(false);
        return null;
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      toast.error("Failed to load resume");
      setHasResume(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);
  
  /**
   * Save the edited resume content and update score
   */
  const saveResume = useCallback(async () => {
    if (!userId || !resumeData?.id || !editedText) {
      toast.error("Cannot save: Missing data");
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Update the resume in the database
      const { error } = await supabase
        .from('resumes')
        .update({
          last_saved_text: editedText,
          last_saved_score_ats: atsScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', resumeData.id);
      
      if (error) throw error;
      
      // Update local state
      setResumeData({
        ...resumeData,
        last_saved_text: editedText,
        last_saved_score_ats: atsScore
      });
      
      // Exit edit mode
      setIsEditing(false);
      
      toast.success("Changes saved successfully");
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [userId, resumeData, editedText, atsScore, supabase]);
  
  /**
   * Reset changes to the original optimized version
   */
  const resetResume = useCallback(async () => {
    if (!userId || !resumeData?.id) {
      toast.error("Cannot reset: Missing data");
      return;
    }
    
    try {
      setIsResetting(true);
      
      // Update the resume in the database
      const { error } = await supabase
        .from('resumes')
        .update({
          last_saved_text: null,
          last_saved_score_ats: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', resumeData.id);
      
      if (error) throw error;
      
      // Reset suggestions and keywords to not applied
      await supabase
        .from('resume_suggestions')
        .update({ is_applied: false })
        .eq('resume_id', resumeData.id);
      
      await supabase
        .from('resume_keywords')
        .update({ is_applied: false })
        .eq('resume_id', resumeData.id);
      
      // Update local state
      setResumeData({
        ...resumeData,
        last_saved_text: null,
        last_saved_score_ats: null
      });
      
      // Clear edited text
      setEditedText('');
      
      // Reset suggestions and keywords state
      setSuggestions(suggestions.map(s => ({ ...s, is_applied: false })));
      setKeywords(keywords.map(k => ({ ...k, is_applied: false })));
      
      // Exit edit mode
      setIsEditing(false);
      
      toast.success("Resume reset to original version");
    } catch (error) {
      console.error("Error resetting resume:", error);
      toast.error("Failed to reset resume");
    } finally {
      setIsResetting(false);
    }
  }, [userId, resumeData, supabase, suggestions, keywords]);
  
  /**
   * Handle content changes in the preview editor
   */
  const handleContentEdit = useCallback((newContent: string) => {
    setEditedText(newContent);
  }, []);
  
  /**
   * Apply or unapply a suggestion
   */
  const handleApplySuggestion = useCallback(async (suggestionId: string) => {
    if (!resumeData?.id) return;
    
    // Find the suggestion
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    
    // Toggle the applied state
    const newIsApplied = !suggestion.is_applied;
    
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
      
      // Update score (simplified for now)
      const scoreDelta = newIsApplied ? 2 : -2;
      setAtsScore(prevScore => prevScore ? prevScore + scoreDelta : 70);
      
      toast.success(newIsApplied ? "Suggestion applied" : "Suggestion removed");
    } catch (error) {
      console.error("Error applying suggestion:", error);
      toast.error("Failed to apply suggestion");
    }
  }, [resumeData?.id, suggestions]);
  
  /**
   * Apply or unapply a keyword
   */
  const handleKeywordApply = useCallback(async (keywordId: string) => {
    if (!resumeData?.id) return;
    
    // Find the keyword
    const keyword = keywords.find(k => k.id === keywordId);
    if (!keyword) return;
    
    // Toggle the applied state
    const newIsApplied = !keyword.is_applied;
    
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
      
      // Update score (simplified for now)
      const scoreDelta = newIsApplied ? 1 : -1;
      setAtsScore(prevScore => prevScore ? prevScore + scoreDelta : 70);
      
      toast.success(newIsApplied ? "Keyword applied" : "Keyword removed");
    } catch (error) {
      console.error("Error applying keyword:", error);
      toast.error("Failed to apply keyword");
    }
  }, [resumeData?.id, keywords]);
  
  /**
   * Update resume state with optimized data from API
   */
  const updateResumeWithOptimizedData = useCallback((
    optimizedTextContent: string,
    resumeId: string,
    scoreValue: number,
    suggestionsData: Suggestion[],
    keywordsData: Keyword[]
  ) => {
    // Update local state with optimized data
    setOptimizedText(optimizedTextContent);
    setAtsScore(scoreValue);
    setSuggestions(suggestionsData);
    setKeywords(keywordsData);
    
    // Parse the optimized text to extract structured data
    const parsedData = parseOptimizedText(optimizedTextContent);
    
    // Calculate ATS score if not provided
    const calculatedScore = scoreValue || calculateAtsScore(parsedData);
    
    // Fetch the resume data if not already available
    if (!resumeData) {
      supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single()
        .then(({ data }) => {
          if (data) {
            setResumeData(data);
            setHasResume(true);
          }
        })
        .catch(error => console.error("Error fetching resume data:", error));
    }
    
    // Switch to preview tab
    setActiveTab('preview');
  }, [resumeData, supabase]);
  
  // Load resume on initial mount if userId is available
  useEffect(() => {
    if (userId && hasResume === null) {
      loadLatestResume();
    }
  }, [userId, hasResume, loadLatestResume]);
  
  return {
    // State
    resumeData,
    optimizedText,
    editedText,
    atsScore,
    suggestions,
    keywords,
    isEditing,
    selectedTemplate,
    isLoading,
    isSaving,
    isResetting,
    hasResume,
    activeTab,
    
    // Actions
    setActiveTab,
    setIsEditing,
    setSelectedTemplate,
    loadLatestResume,
    saveResume,
    resetResume,
    handleContentEdit,
    handleApplySuggestion,
    handleKeywordApply,
    updateResumeWithOptimizedData,
    
    // Setters for direct updates from API
    setOptimizedText,
    setAtsScore,
    setSuggestions,
    setKeywords
  };
};

export default useResumeOptimizer;