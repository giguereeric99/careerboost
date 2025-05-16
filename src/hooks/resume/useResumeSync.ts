// hooks/resume/useResumeSync.ts

import { useCallback } from 'react';
import { ResumeState } from './useResumeState';
import { 
  getLatestOptimizedResume, 
  saveResumeContent, 
  resetResumeToOriginal,
  updateResumeTemplate,
  updateKeywordStatus,
  updateSuggestionStatus
} from '@/services/resumeService';
import { 
  normalizeApiData, 
  normalizeSuggestion, 
  normalizeKeyword 
} from '@/utils/dataNormalizers';
import { toast } from 'sonner';

/**
 * Hook for database synchronization operations
 * Handles loading, saving and resetting resume data
 */
export function useResumeSync(
  state: ResumeState,
  updateState: (updates: Partial<ResumeState>) => void,
  setResumeData: (data: any, preserveLoading?: boolean) => void,
  userId?: string
) {
  /**
   * Load the latest resume for a user
   * Now using data normalizers for consistent format
   */
  const loadLatestResume = useCallback(async () => {
    if (!userId) {
      console.log("No user ID provided, skipping resume load");
      updateState({ 
        isLoading: false,
        hasResume: false 
      });
      return null;
    }
    
    try {
      // Set loading state
      updateState({ isLoading: true });
      console.log(`Loading latest resume for user: ${userId}`);
      
      const { data: apiData, error } = await getLatestOptimizedResume(userId);
      
      if (error) {
        console.error("Error loading resume:", error);
        throw error;
      }
      
      if (apiData) {
        console.log(`Resume loaded successfully: ${apiData.id}`);
        
        // Normalize the data from API
        const normalizedData = normalizeApiData(apiData);
        
        // Update all state with the normalized data
        setResumeData(normalizedData);
        
        return normalizedData;
      } else {
        console.log("No resume found for user");
        updateState({ 
          hasResume: false,
          isLoading: false 
        });
        
        return null;
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      toast.error("Error loading resume");
      updateState({ 
        hasResume: false,
        isLoading: false 
      });
      return null;
    } finally {
      // Always ensure isLoading is reset
      updateState({ isLoading: false });
    }
  }, [userId, updateState, setResumeData]);
  
  /**
   * Special initialization function that handles the complete initialization flow
   * Including welcome toasts and tab management
   */
  const initializeResume = useCallback(async () => {
    if (!userId) {
      console.log("No user ID for initialization, showing new user experience");
      updateState({ 
        isLoading: false,
        hasResume: false,
        activeTab: 'upload'
      });
      
      // Toast for new users
      toast.info("Welcome to CareerBoost!", {
        description: "Upload your resume to start AI optimization.",
        duration: 7000,
      });
      
      return null;
    }
    
    try {
      // Set loading state
      updateState({ isLoading: true });
      console.log(`Initializing resume for user: ${userId}`);
      
      const { data: apiData, error } = await getLatestOptimizedResume(userId);
      
      if (error) {
        console.error("Error loading resume during initialization:", error);
        throw error;
      }
      
      if (apiData) {
        console.log(`Resume loaded during initialization: ${apiData.id}`);
        
        // Update all state with the loaded data
        setResumeData(apiData);
        
        // Set the active tab to preview since we have data
        updateState({ activeTab: 'preview' });
        
        // Toast for existing users
        toast.success("Welcome to CareerBoost!", {
          description: "Your resume has been loaded. You can continue optimizing it.",
          duration: 5000,
        });
        
        return apiData;
      } else {
        console.log("No resume found during initialization");
        updateState({ 
          hasResume: false,
          isLoading: false,
          activeTab: 'upload'
        });
        
        // Toast for users without a resume
        toast.info("Welcome to CareerBoost!", {
          description: "Upload your resume to start AI optimization.",
          duration: 7000,
        });
        
        return null;
      }
    } catch (error) {
      console.error("Error during resume initialization:", error);
      toast.error("Error during initial loading");
      updateState({ 
        hasResume: false,
        isLoading: false,
        activeTab: 'upload'
      });
      return null;
    } finally {
      // Always ensure isLoading is reset
      updateState({ isLoading: false });
    }
  }, [userId, updateState, setResumeData]);
  
  /**
   * Save the edited resume content, score, and applied enhancements
   * Uses an atomic approach to ensure data consistency
   */
  const saveResume = useCallback(async (newContent?: string) => {
    const contentToSave = newContent || state.editedText;
    
    if (!userId || !state.resumeData?.id || !contentToSave) {
      console.error("Cannot save: Missing data", { 
        userId, 
        resumeId: state.resumeData?.id, 
        contentLength: contentToSave?.length 
      });
      toast.error("Cannot save: Missing data");
      return false;
    }
    
    try {
      updateState({ isSaving: true });
      
      console.log("Saving resume:", {
        resumeId: state.resumeData.id,
        contentLength: contentToSave.length,
        atsScore: state.currentScore
      });
      
      // Save the resume content and score
      const saveResult = await saveResumeContent(
        state.resumeData.id, 
        contentToSave, 
        state.currentScore
      );
      
      if (!saveResult.success) {
        throw new Error(saveResult.error?.message || "Failed to save content");
      }
      
      // Update state to reflect saved state
      updateState({
        editedText: contentToSave,
        contentModified: false,
        scoreModified: false,
        isSaving: false
      });
      
      // Update resume data with new saved values
      if (state.resumeData) {
        setResumeData({
          ...state.resumeData,
          last_saved_text: contentToSave,
          last_saved_score_ats: state.currentScore
        });
      }
      
      toast.success("Changes saved successfully");
      return true;
    } catch (error: any) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save changes");
      return false;
    } finally {
      updateState({ isSaving: false });
    }
  }, [
    userId, 
    state.resumeData, 
    state.editedText, 
    state.currentScore, 
    updateState,
    setResumeData
  ]);
  
  /**
   * Reset resume to original AI-optimized version
   */
  const resetResume = useCallback(async () => {
    if (!userId || !state.resumeData?.id) {
      console.error("Cannot reset: Missing required data", { 
        userId, 
        resumeId: state.resumeData?.id 
      });
      toast.error("Cannot reset: Missing data");
      return false;
    }
    
    try {
      updateState({ isResetting: true });
      
      console.log(`Initiating resume reset for ID: ${state.resumeData.id}`);
      
      const { success, error } = await resetResumeToOriginal(state.resumeData.id);
      
      if (!success) {
        console.error("Reset failed with API error:", error);
        throw error;
      }
      
      // After successful reset, reload the data
      await loadLatestResume();
      
      toast.success("Resume reset to original version");
      
      return true;
    } catch (error) {
      console.error("Error in resetResume function:", error);
      toast.error("Failed to reset resume");
      return false;
    } finally {
      updateState({ isResetting: false });
    }
  }, [userId, state.resumeData, updateState, loadLatestResume]);
  
  /**
   * Update template selection
   */
  const changeTemplate = useCallback(async (templateId: string) => {
    if (!state.resumeData?.id) return false;
    
    try {
      const { success, error } = await updateResumeTemplate(
        state.resumeData.id, 
        templateId
      );
      
      if (!success) throw error;
      
      updateState({ selectedTemplate: templateId });
      
      if (state.resumeData) {
        setResumeData({
          ...state.resumeData,
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
  }, [state.resumeData, updateState, setResumeData]);

  return {
    loadLatestResume,
    saveResume,
    resetResume,
    changeTemplate,
    initializeResume  // Expose the new function
  };
}