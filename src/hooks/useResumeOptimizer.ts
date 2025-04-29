'use client'

import { useState, useCallback } from 'react';
import { 
  uploadResume, 
  parseResume, 
  optimizeResume, 
  getLatestOptimizedResume,
  updateKeywordStatus,
  updateSuggestionStatus,
  regenerateResume,
  calculateAtsScore
} from '@/services/resumeService';
import { ResumeData, Suggestion } from '@/types/resume';
import { useToast } from './useToast';

/**
 * Custom hook for managing the resume optimization workflow
 * Provides state and functions for the complete resume optimization process:
 * uploading, parsing, optimizing, and applying changes
 */
export function useResumeOptimizer() {
  // State for tracking operation status
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  
  // State for resume data
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [optimizedData, setOptimizedData] = useState<ResumeData | null>(null);
  const [optimizedText, setOptimizedText] = useState<string>('');
  const [resumeId, setResumeId] = useState<string | null>(null);
  
  // State for optimization results
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<{text: string, applied: boolean}[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(65);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  
  // Get toast function from useToast hook
  const { toast } = useToast();

  /**
   * Handles the upload and processing of a resume file
   * 
   * @param file - The resume file to upload
   * @returns The parsed resume data or null if the operation failed
   */
  const handleFileUpload = async (file: File) => {
    if (!file) return null;
    
    try {
      // Start upload process
      setIsUploading(true);
      setSelectedFile(file);
      
      // Upload file to storage
      const { path, error } = await uploadResume(file);
      
      if (error) {
        throw error;
      }
      
      setIsUploading(false);
      setIsParsing(true);
      
      // Parse the resume to extract structured data
      const { data, error: parseError } = await parseResume(path);
      
      if (parseError) {
        throw parseError;
      }
      
      setResumeData(data);
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been analyzed and is ready for optimization."
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error processing resume",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };
  
  /**
   * Optimizes the resume using AI
   * 
   * @param data - Resume data to optimize (defaults to current resumeData)
   * @returns The optimization results or null if the operation failed
   */
  const optimizeResumeData = async (data: ResumeData = resumeData!) => {
    if (!data) return null;
    
    try {
      setIsOptimizing(true);
      
      // Call the optimization service
      const { 
        optimizedData, 
        optimizedText: text, 
        suggestions: suggestionsResult, 
        keywordSuggestions,
        atsScore,
        error 
      } = await optimizeResume(data);
      
      if (error) {
        throw error;
      }
      
      // Update state with optimization results
      setOptimizedData(optimizedData);
      setOptimizedText(text || '');
      setSuggestions(suggestionsResult);
      setOptimizationScore(atsScore);
      
      // Format keywords for UI
      if (keywordSuggestions && keywordSuggestions.length > 0) {
        setKeywords(keywordSuggestions.map(keyword => ({
          text: keyword,
          applied: false
        })));
      }
      
      toast({
        title: "Resume optimized",
        description: `Your resume has been optimized with an ATS score of ${atsScore}/100.`
      });
      
      return { optimizedData, suggestions: suggestionsResult, optimizedText: text, atsScore };
    } catch (error: any) {
      toast({
        title: "Error optimizing resume",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };
  
  /**
   * Loads the most recent optimized resume for the current user
   * 
   * @param userId - The ID of the user
   * @returns The loaded resume data or null if not found
   */
  const loadLatestResume = async (userId: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await getLatestOptimizedResume(userId);
      
      if (error) {
        throw error;
      }
      
      if (!error && data) {
        // Update state with loaded resume data
        setResumeId(data.id);
        setOptimizedText(data.optimized_text);
        setOptimizationScore(data.ats_score || 65);

        const parsedData = parseOptimizedText(data.optimized_text);
        setOptimizedData(parsedData);
        
        // Set keywords if available
        if (data.keywords && data.keywords.length > 0) {
          setKeywords(data.keywords);
        }
        
        // Set suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
        
        toast({
          title: "Resume loaded",
          description: "Your previous optimized resume has been loaded."
        });
        
        return data;
      } else {
        toast({
          title: "No resume found",
          description: "You don't have any previously optimized resumes."
        });
        return null;
      }
    } catch (error: any) {
      toast({
        title: "Error loading resume",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Applies a template to the current resume
   * 
   * @param templateId - ID of the template to apply
   */
  const applyTemplateToResume = useCallback((templateId: string) => {
    setNeedsRegeneration(true);
    
    toast({
      title: "Template applied",
      description: `The ${templateId} template has been applied to your resume.`
    });
  }, [toast]);
  
  /**
   * Applies a suggestion to improve the resume
   * 
   * @param suggestionIndex - Index of the suggestion to apply
   */
  const applySuggestion = async (suggestionIndex: number) => {
    if (!resumeId || !suggestions[suggestionIndex]) return;
    
    try {
      const suggestion = suggestions[suggestionIndex];
      
      // Update suggestion status in database
      await updateSuggestionStatus(
        resumeId, 
        suggestion.id || String(suggestionIndex), 
        true
      );
      
      // Update local state
      const newSuggestions = [...suggestions];
      newSuggestions[suggestionIndex] = {
        ...suggestion,
        isApplied: true
      };
      setSuggestions(newSuggestions);
      
      // Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      toast({
        title: "Suggestion applied",
        description: "Your resume has been updated with the suggestion."
      });
    } catch (error: any) {
      toast({
        title: "Error applying suggestion",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  /**
   * Toggles a keyword's applied state
   * 
   * @param index - Index of the keyword to toggle
   */
  const toggleKeyword = async (index: number) => {
    if (!resumeId || !keywords[index]) return;
    
    try {
      const keyword = keywords[index];
      const newAppliedState = !keyword.applied;
      
      // Update keyword status in database
      await updateKeywordStatus(
        resumeId,
        keyword.text,
        newAppliedState
      );
      
      // Update local state
      const newKeywords = [...keywords];
      newKeywords[index] = {
        ...keyword,
        applied: newAppliedState
      };
      setKeywords(newKeywords);
      
      // Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      toast({
        title: newAppliedState ? "Keyword added" : "Keyword removed",
        description: `"${keyword.text}" has been ${newAppliedState ? 'added to' : 'removed from'} your resume.`
      });
    } catch (error: any) {
      toast({
        title: "Error updating keyword",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  /**
   * Regenerates the resume with all applied changes
   */
  const applyChanges = async () => {
    if (!resumeId || !needsRegeneration) return;
    
    try {
      setIsApplyingChanges(true);
      
      // Get all applied keywords
      const appliedKeywords = keywords
        .filter(keyword => keyword.applied)
        .map(keyword => keyword.text);
      
      // Get all applied suggestions
      const appliedSuggestions = suggestions
        .filter(suggestion => suggestion.isApplied)
        .map(suggestion => suggestion.id || suggestion.type);
      
      // Regenerate the resume with applied changes
      const { success, optimizedText: newText, atsScore: newScore, error } = 
        await regenerateResume(resumeId, appliedKeywords, appliedSuggestions);
      
      if (error) {
        throw error;
      }
      
      if (success && newText) {
        // Update state with regenerated resume
        setOptimizedText(newText);
        setOptimizationScore(newScore || calculateAtsScore(optimizedData!));
        setNeedsRegeneration(false);
        
        toast({
          title: "Changes applied",
          description: "Your resume has been updated with all applied changes."
        });
      }
    } catch (error: any) {
      toast({
        title: "Error applying changes",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsApplyingChanges(false);
    }
  };
  
  return {
    // Status states
    isUploading,
    isParsing,
    isOptimizing,
    isLoading,
    isApplyingChanges,
    needsRegeneration,
    
    // Data states
    selectedFile,
    resumeData,
    optimizedData,
    optimizedText,
    resumeId,
    suggestions,
    keywords,
    optimizationScore,
    
    // Actions
    handleFileUpload,
    optimizeResumeData,
    loadLatestResume,
    applyTemplateToResume,
    applySuggestion,
    toggleKeyword,
    applyChanges,
    setSelectedFile
  };
}