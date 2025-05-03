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
import { toast } from "sonner";

/**
 * Custom hook for managing the resume optimization workflow
 * Provides state and functions for the complete resume optimization process:
 * uploading, parsing, optimizing, applying changes, and resetting to original
 * 
 * Introduces support for saving edits to last_saved_text and resetting to original optimized version
 */
export function useResumeOptimizer() {
  // --- State for tracking operation status ---
  const [isUploading, setIsUploading] = useState(false);        // File upload in progress
  const [isParsing, setIsParsing] = useState(false);            // Resume parsing in progress
  const [isOptimizing, setIsOptimizing] = useState(false);      // AI optimization in progress
  const [isLoading, setIsLoading] = useState(false);            // General loading state
  const [isApplyingChanges, setIsApplyingChanges] = useState(false); // Applying AI changes
  const [isResetting, setIsResetting] = useState(false);        // Resetting to original version
  
  // --- State for resume data ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Currently selected file
  const [resumeData, setResumeData] = useState<ResumeData | null>(null); // Parsed resume data
  const [optimizedData, setOptimizedData] = useState<ResumeData | null>(null); // Optimized data
  const [optimizedText, setOptimizedText] = useState<string>(''); // Original AI-optimized text
  const [editedText, setEditedText] = useState<string | null>(null); // User-edited text from last_saved_text
  const [resumeId, setResumeId] = useState<string | null>(null); // Database ID of the resume
  
  // --- State for optimization results ---
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]); // AI suggestions
  const [keywords, setKeywords] = useState<{text: string, applied: boolean}[]>([]); // AI keywords
  const [optimizationScore, setOptimizationScore] = useState(65); // ATS compatibility score
  const [needsRegeneration, setNeedsRegeneration] = useState(false); // Whether changes need regeneration

  /**
   * Handles the upload and processing of a resume file
   * Uploads the file, parses it, and prepares it for optimization
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
      toast.message(
        "Resume uploaded successfully", {
        description: "Your resume has been analyzed and is ready for optimization."
      });
      
      return data;
    } catch (error: any) {
      toast.error(
        "Error processing resume", {
        description: error.message
      });
      return null;
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };
  
  /**
   * Optimizes the resume using AI
   * Sends resume data to AI services and processes the optimization results
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
      setEditedText(null); // Clear any previous edited text when creating new optimization
      setSuggestions(suggestionsResult);
      setOptimizationScore(atsScore);
      
      // Format keywords for UI
      if (keywordSuggestions && keywordSuggestions.length > 0) {
        setKeywords(keywordSuggestions.map(keyword => ({
          text: keyword,
          applied: false
        })));
      }
      
      toast.message(
        "Resume optimized", {
        description: `Your resume has been optimized with an ATS score of ${atsScore}/100.`
      });
      
      return { optimizedData, suggestions: suggestionsResult, optimizedText: text, atsScore };
    } catch (error: any) {
      toast.message(
        "Error optimizing resume", {
        description: error.message,
      });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };
  
  /**
   * Loads the most recent optimized resume for the current user
   * Includes support for edited content stored in last_saved_text
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
        
        // Check if there's a saved edited version
        if (data.last_saved_text) {
          console.log("Found last_saved_text, using it for display");
          setEditedText(data.last_saved_text);
        } else {
          console.log("No last_saved_text found, using original optimized text");
          setEditedText(null);
        }
        
        // Always keep the original optimized text
        setOptimizedText(data.optimized_text);
        setOptimizationScore(data.ats_score || 65);

        // Parse the data
        const parsedData = parseOptimizedText(data.optimized_text);
        setOptimizedData(parsedData);
        
        // Set keywords if available
        if (data.keywords && data.keywords.length > 0) {
          setKeywords(data.keywords.map(k => ({
            text: k.keyword || k.text,
            applied: k.is_applied || k.applied || false
          })));
        }
        
        // Set suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions.map(s => ({
            id: s.id,
            text: s.text,
            type: s.type || 'general',
            impact: s.impact || 'medium',
            isApplied: s.is_applied || s.isApplied || false
          })));
        }
        
        toast.message(
          "Resume loaded", {
          description: "Your previous optimized resume has been loaded."
        });
        
        return data;
      } else {
        toast.message(
          "No resume found", {
          description: "You don't have any previously optimized resumes."
        });
        return null;
      }
    } catch (error: any) {
      toast.error(
        "Error loading resume", {
        description: error.message
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
    
    toast.message(
      "Template applied", {
      description: `The ${templateId} template has been applied to your resume.`
    });
  }, []);
  
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
      
      toast.message(
        "Suggestion applied", {
        description: "Your resume has been updated with the suggestion."
      });
    } catch (error: any) {
      toast.error(
        "Error applying suggestion", {
        description: error.message
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
      
      toast.message(
        newAppliedState ? "Keyword added" : "Keyword removed", {
        description: `"${keyword.text}" has been ${newAppliedState ? 'added to' : 'removed from'} your resume.`
      });
    } catch (error: any) {
      toast.error(
        "Error updating keyword", {
        description: error.message
      });
    }
  };
  
  /**
   * Regenerates the resume with all applied changes
   * Applies all pending suggestions and keywords
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
        // Clear any edited version
        setEditedText(null);
        setOptimizationScore(newScore || calculateAtsScore(optimizedData!));
        setNeedsRegeneration(false);
        
        toast.message(
          "Changes applied", {
          description: "Your resume has been updated with all applied changes."
        });
      }
    } catch (error: any) {
      toast.error(
        "Error applying changes", {
        description: error.message
      });
    } finally {
      setIsApplyingChanges(false);
    }
  };

  /**
   * Resets the resume to its original optimized version
   * Clears the last_saved_text field in the database
   * 
   * @returns Promise resolving to boolean indicating success/failure
   */
  const resetResume = async (): Promise<boolean> => {
    if (!resumeId) return false;
    
    try {
      setIsResetting(true);
      
      // Call the API to reset the resume
      const response = await fetch('/api/resumes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId,
          action: 'reset'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset resume');
      }
      
      // Parse the response
      const result = await response.json();
      
      // Clear the edited text state
      setEditedText(null);
      
      toast.success('Resume reset to original optimized version');
      
      return true;
    } catch (error: any) {
      console.error('Error resetting resume:', error);
      toast.error(`Failed to reset resume: ${error.message}`);
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  /**
   * Helper function to parse optimized text into structured data
   * 
   * @param text - The optimized text to parse
   * @returns Structured resume data
   */
  function parseOptimizedText(text: string): any {
    // In a real implementation, this would parse the text into structured resume data
    // For now, we'll just return a simple object with the text
    return {
      parsed: true,
      content: text,
      language: detectLanguage(text)
    };
  }
  
  /**
   * Basic language detection based on text content
   * 
   * @param text - Text to analyze
   * @returns Detected language
   */
  function detectLanguage(text: string): string {
    // This is a very basic implementation
    // In a real app, you would use a more sophisticated approach
    
    // Common French words
    const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'pour', 'dans', 'avec', 'sur'];
    
    // Common Spanish words
    const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'para', 'en', 'con', 'sobre'];
    
    // Count word occurrences
    const words = text.toLowerCase().split(/\s+/);
    let frenchCount = 0;
    let spanishCount = 0;
    
    words.forEach(word => {
      if (frenchWords.includes(word)) frenchCount++;
      if (spanishWords.includes(word)) spanishCount++;
    });
    
    // Determine language based on counts
    if (frenchCount > spanishCount && frenchCount > words.length * 0.05) {
      return 'French';
    } else if (spanishCount > frenchCount && spanishCount > words.length * 0.05) {
      return 'Spanish';
    }
    
    // Default to English
    return 'English';
  }
  
  // Return all state and functions
  return {
    // Status states
    isUploading,
    isParsing,
    isOptimizing,
    isLoading,
    isApplyingChanges,
    isResetting,
    needsRegeneration,
    
    // Data states
    selectedFile,
    resumeData,
    optimizedData,
    optimizedText,
    editedText,
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
    resetResume,
    
    // Setters
    setSelectedFile,
    setOptimizedData,
    setOptimizedText,
    setEditedText
  };
}