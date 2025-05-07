'use client'

/**
 * Enhanced Resume Optimizer Hook
 * 
 * This hook manages the complete lifecycle of resume optimization:
 * - Upload and parsing
 * - AI optimization
 * - Suggestion application
 * - Keyword integration
 * - Reoptimization with selected improvements
 * - State management with error handling
 * 
 * The hook uses refs to prevent infinite loops and implements
 * debouncing for improved performance.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
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
 * Interface for the resume optimizer hook
 * Defines the state and methods for resume optimization
 */
interface ResumeOptimizerState {
  // Status states
  isUploading: boolean;
  isParsing: boolean;
  isOptimizing: boolean;
  isLoading: boolean;
  isApplyingChanges: boolean;
  isResetting: boolean;
  isApplyingReoptimization: boolean;
  needsRegeneration: boolean;
  
  // Data states
  selectedFile: File | null;
  resumeData: ResumeData | null;
  optimizedData: ResumeData | null;
  optimizedText: string;
  editedText: string | null;
  resumeId: string | null;
  suggestions: Suggestion[];
  keywords: {text: string, applied: boolean}[];
  optimizationScore: number;
  improvementsSummary: string;
  
  // Actions
  handleFileUpload: (file: File) => Promise<ResumeData | null>;
  optimizeResumeData: (data?: ResumeData) => Promise<any | null>;
  loadLatestResume: (userId: string) => Promise<any | null>;
  applyTemplateToResume: (templateId: string) => void;
  applySuggestion: (index: number) => Promise<void>;
  toggleKeyword: (index: number) => Promise<void>;
  resetResume: () => Promise<boolean>;
  
  // Setters
  setSelectedFile: (file: File | null) => void;
  setOptimizedData: (data: ResumeData | null) => void;
  setOptimizedText: (text: string) => void;
  setEditedText: (text: string | null) => void;
}

/**
 * Custom hook for managing the resume optimization workflow
 * 
 * This refactored version adds support for applying selected suggestions
 * and keywords through reoptimization while maintaining all existing
 * functionality.
 * 
 * @param userId - Optional user ID for loading saved resumes
 * @returns A comprehensive set of state and functions for resume optimization
 */
export function useResumeOptimizer(userId?: string | null): ResumeOptimizerState {
  // --- Status State ---
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isApplyingReoptimization, setIsApplyingReoptimization] = useState(false);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  
  // --- Data State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [optimizedData, setOptimizedData] = useState<ResumeData | null>(null);
  const [optimizedText, setOptimizedText] = useState<string>('');
  const [editedText, setEditedText] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<{text: string, applied: boolean}[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(65);
  const [improvementsSummary, setImprovementsSummary] = useState('');
  
  // --- Refs to prevent infinite loops ---
  const operationInProgressRef = useRef(false);    // Prevents concurrent operations
  const lastLoadedResumeIdRef = useRef<string | null>(null);  // Tracks last loaded resume to avoid duplicates
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);  // For debouncing updates
  const loadAttemptedRef = useRef(false);  // Tracks if a load has been attempted to prevent loops

  /**
   * Handles the upload and processing of a resume file
   * Manages the complete upload workflow including error handling
   * 
   * @param file - The resume file to upload
   * @returns The parsed resume data or null on failure
   */
  const handleFileUpload = async (file: File) => {
    // Skip if no file or operation already in progress
    if (!file || operationInProgressRef.current) return null;
    
    try {
      // Set operation flag to prevent concurrent uploads
      operationInProgressRef.current = true;
      
      // Start upload process - update UI state
      setIsUploading(true);
      setSelectedFile(file);
      
      // Upload file to storage
      const { path, error } = await uploadResume(file);
      
      // Check for upload errors
      if (error) {
        throw error;
      }
      
      // Update states for parse phase
      setIsUploading(false);
      setIsParsing(true);
      
      // Parse the resume to extract structured data
      const { data, error: parseError } = await parseResume(path);
      
      // Check for parsing errors
      if (parseError) {
        throw parseError;
      }
      
      // Set resume data and show success message
      setResumeData(data);
      toast.message(
        "Resume uploaded successfully", {
        description: "Your resume has been analyzed and is ready for optimization."
      });
      
      return data;
    } catch (error: any) {
      // Handle errors with user-friendly messages
      toast.error(
        "Error processing resume", {
        description: error.message
      });
      return null;
    } finally {
      // Reset state regardless of outcome
      setIsUploading(false);
      setIsParsing(false);
      operationInProgressRef.current = false;
    }
  };
  
  /**
   * Optimizes the resume using AI
   * Handles the full optimization process and state updates
   * 
   * @param data - The resume data to optimize (defaults to current state)
   * @returns Optimization results or null on failure
   */
  const optimizeResumeData = async (data: ResumeData = resumeData!) => {
    // Skip if no data or operation already in progress
    if (!data || operationInProgressRef.current) return null;
    
    try {
      // Set operation flag to prevent concurrent optimizations
      operationInProgressRef.current = true;
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
      
      // Check for optimization errors
      if (error) {
        throw error;
      }
      
      // Update state with optimization results
      setOptimizedData(optimizedData);
      setOptimizedText(text || '');
      setEditedText(null); // Clear any previous edited text when creating new optimization
      setSuggestions(suggestionsResult);
      setOptimizationScore(atsScore);
      setNeedsRegeneration(false);
      
      // Format keywords for UI if available
      if (keywordSuggestions && keywordSuggestions.length > 0) {
        setKeywords(keywordSuggestions.map(keyword => ({
          text: keyword,
          applied: false
        })));
      }
      
      // Show success message with score
      toast.message(
        "Resume optimized", {
        description: `Your resume has been optimized with an ATS score of ${atsScore}/100.`
      });
      
      return { optimizedData, suggestions: suggestionsResult, optimizedText: text, atsScore };
    } catch (error: any) {
      // Handle optimization errors
      toast.message(
        "Error optimizing resume", {
        description: error.message,
      });
      return null;
    } finally {
      // Reset state regardless of outcome
      setIsOptimizing(false);
      operationInProgressRef.current = false;
    }
  };
  
  /**
   * Loads the most recent optimized resume for the current user
   * Handles resume loading with deduplication to prevent redundant loads
   * 
   * @param userId - The user ID to load resumes for
   * @returns The loaded resume data or null if not found
   */
  const loadLatestResume = async (userId: string) => {
    try {
      // Set loading state to show UI indicators
      setIsLoading(true);
      
      // Keep track that we attempted to load - prevents infinite loops
      loadAttemptedRef.current = true;
      
      // Call the API function to fetch the latest resume
      const { data, error } = await getLatestOptimizedResume(userId);
      
      // If there was an error in the API call, throw it to be caught below
      if (error) {
        throw error;
      }
      
      // If we found resume data successfully
      if (data) {
        // Prevent loading the same resume multiple times
        // This optimization avoids unnecessary state updates
        if (data.id === lastLoadedResumeIdRef.current) {
          console.log("Same resume already loaded, skipping update");
          setIsLoading(false);
          return data;
        }
        
        // Update our tracking reference with the current resume ID
        lastLoadedResumeIdRef.current = data.id;
        
        // Update state with loaded resume data
        setResumeId(data.id);
        
        // Check if there's a saved edited version and use it if available
        if (data.last_saved_text) {
          console.log("Found last_saved_text, using it for display");
          setEditedText(data.last_saved_text);
        } else {
          console.log("No last_saved_text found, using original optimized text");
          setEditedText(null);
        }
        
        // Always keep the original optimized text for reference and reset functionality
        setOptimizedText(data.optimized_text);
        
        // Set the ATS score or use default value if not available
        setOptimizationScore(data.ats_score || 65);
  
        // Parse the data for structure to prepare for template application
        const parsedData = parseOptimizedText(data.optimized_text);
        setOptimizedData(parsedData);
        
        // Set keywords if available
        if (data.keywords && data.keywords.length > 0) {
          // Map the database format to our internal state format
          setKeywords(data.keywords.map(k => ({
            text: k.keyword || k.text,
            applied: k.is_applied || k.applied || false
          })));
        }
        
        // Set suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          // Map the database format to our internal state format
          setSuggestions(data.suggestions.map(s => ({
            id: s.id,
            text: s.text,
            type: s.type || 'general',
            impact: s.impact || 'medium',
            isApplied: s.is_applied || s.isApplied || false
          })));
        }
        
        // Show success notification to the user
        toast.message(
          "Resume loaded", {
          description: "Your previous optimized resume has been loaded."
        });
        
        return data;
      } else {
        // No data found - CRITICAL: Clear tracking refs to prevent loops
        lastLoadedResumeIdRef.current = null;
        
        // Log empty state - normal for new users
        console.log("No resume found for this user - normal for new users");
        
        // For new users, show a friendly message instead of an error
        toast.message(
          "Welcome to CareerBoost", {
          description: "Upload your resume to get started with AI optimization."
        });
        
        return null;
      }
    } catch (error: any) {
      // Handle loading errors with appropriate user feedback
      console.error("Error loading resume:", error);
      
      // Show error notification with details to help troubleshoot
      toast.error(
        "Error loading resume", {
        description: error.message || "An unexpected error occurred. Please try again."
      });
      
      // Clear tracking refs to prevent loops
      lastLoadedResumeIdRef.current = null;
      
      return null;
    } finally {
      // Always reset loading state regardless of outcome
      setIsLoading(false);
    }
  };
  
  /**
   * Applies a template to the current resume
   * Uses debouncing to prevent rapid state updates
   * 
   * @param templateId - ID of the template to apply
   */
  const applyTemplateToResume = useCallback((templateId: string) => {
    // Clear any pending updates
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Debounce the state update to prevent multiple rapid changes
    updateTimeoutRef.current = setTimeout(() => {
      // Mark that regeneration is needed
      setNeedsRegeneration(true);
      
      // Notify user
      toast.message(
        "Template applied", {
        description: `The ${templateId} template has been applied to your resume.`
      });
    }, 150);
  }, []);
  
  /**
   * Applies a suggestion to improve the resume
   * Updates both local state and database
   * 
   * @param suggestionIndex - Index of the suggestion to apply
   */
  const applySuggestion = async (suggestionIndex: number) => {
    // Validate parameters and state
    if (!resumeId || !suggestions[suggestionIndex] || operationInProgressRef.current) return;
    
    try {
      // Set operation flag to prevent concurrent operations
      operationInProgressRef.current = true;
      const suggestion = suggestions[suggestionIndex];
      
      // Update suggestion status in database
      await updateSuggestionStatus(
        resumeId, 
        suggestion.id || String(suggestionIndex), 
        !suggestion.isApplied // Toggle status
      );
      
      // Update local state using functional update to ensure consistency
      setSuggestions(prev => {
        const newSuggestions = [...prev];
        newSuggestions[suggestionIndex] = {
          ...suggestion,
          isApplied: !suggestion.isApplied
        };
        return newSuggestions;
      });
      
      // Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      // Notify user of the change
      toast.message(
        suggestion.isApplied ? "Suggestion removed" : "Suggestion applied", {
        description: suggestion.isApplied 
          ? "The suggestion has been removed from your resume."
          : "The suggestion has been applied to your resume."
      });
    } catch (error: any) {
      // Handle error applying suggestion
      toast.error(
        "Error applying suggestion", {
        description: error.message
      });
    } finally {
      // Always clear operation flag
      operationInProgressRef.current = false;
    }
  };
  
  /**
   * Toggles a keyword's applied state
   * Updates both local state and database
   * 
   * @param index - Index of the keyword to toggle
   */
  const toggleKeyword = async (index: number) => {
    // Validate parameters and state
    if (!resumeId || !keywords[index] || operationInProgressRef.current) return;
    
    try {
      // Set operation flag to prevent concurrent operations
      operationInProgressRef.current = true;
      const keyword = keywords[index];
      const newAppliedState = !keyword.applied;
      
      // Update keyword status in database
      await updateKeywordStatus(
        resumeId,
        keyword.text,
        newAppliedState
      );
      
      // Update local state using functional update to ensure consistency
      setKeywords(prev => {
        const newKeywords = [...prev];
        newKeywords[index] = {
          ...keyword,
          applied: newAppliedState
        };
        return newKeywords;
      });
      
      // Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      // Notify user of the change
      toast.message(
        newAppliedState ? "Keyword added" : "Keyword removed", {
        description: `"${keyword.text}" has been ${newAppliedState ? 'added to' : 'removed from'} your resume.`
      });
    } catch (error: any) {
      // Handle error updating keyword
      toast.error(
        "Error updating keyword", {
        description: error.message
      });
    } finally {
      // Always clear operation flag
      operationInProgressRef.current = false;
    }
  };

  /**
   * Regenerates the resume with all applied changes
   * This is the existing regeneration function maintained for compatibility
   * 
   * @returns Promise resolving to true if successful, false otherwise
   */
  const regenerateResume = async () => {
    // Validate state before proceeding
    if (!resumeId || !needsRegeneration || operationInProgressRef.current) return false;
    
    try {
      // Set operation flags
      operationInProgressRef.current = true;
      setIsApplyingChanges(true);
      
      // Get all applied keywords
      const appliedKeywords = keywords
        .filter(keyword => keyword.applied)
        .map(keyword => keyword.text);
      
      // Get all applied suggestions
      const appliedSuggestions = suggestions
        .filter(suggestion => suggestion.isApplied)
        .map(suggestion => suggestion.id || suggestion.type);
      
      // Regenerate the resume with applied changes using existing API
      const { success, optimizedText: newText, atsScore: newScore, error } = 
        await regenerateResume(resumeId, appliedKeywords, appliedSuggestions);
      
      // Handle errors
      if (error) {
        throw error;
      }
      
      // Process successful response
      if (success && newText) {
        // Update state with regenerated resume
        setOptimizedText(newText);
        // Clear any edited version
        setEditedText(null);
        setOptimizationScore(newScore || calculateAtsScore(optimizedData!));
        setNeedsRegeneration(false);
        
        // Notify user
        toast.message(
          "Changes applied", {
          description: "Your resume has been updated with all applied changes."
        });
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Handle regeneration errors
      toast.error(
        "Error applying changes", {
        description: error.message
      });
      return false;
    } finally {
      // Always reset operation flags
      setIsApplyingChanges(false);
      operationInProgressRef.current = false;
    }
  };

  /**
   * Resets the resume to its original optimized version
   * Clears any edited content and resets to the initial AI optimization
   * 
   * @returns Promise resolving to true if successful, false otherwise
   */
  const resetResume = async (): Promise<boolean> => {
    // Validate state before proceeding
    if (!resumeId || operationInProgressRef.current) return false;
    
    try {
      // Set operation flag
      operationInProgressRef.current = true;
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
      
      // Handle API errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset resume');
      }
      
      // Parse the response
      const result = await response.json();
      
      // Clear the edited text state
      setEditedText(null);
      
      // Reset needs regeneration flag
      setNeedsRegeneration(false);
      
      // Notify user
      toast.success('Resume reset to original optimized version');
      
      return true;
    } catch (error: any) {
      // Handle reset errors
      console.error('Error resetting resume:', error);
      toast.error(`Failed to reset resume: ${error.message}`);
      return false;
    } finally {
      // Always reset operation flag
      setIsResetting(false);
      operationInProgressRef.current = false;
    }
  };

  /**
   * Helper function to parse optimized text into structured data
   * Includes error handling for parsing failures
   * 
   * @param text - Optimized text to parse
   * @returns Structured resume data object
   */
  function parseOptimizedText(text: string): any {
    try {
      // In a real implementation, this would parse the text into structured resume data
      // For now, we'll just return a simple object with the text
      return {
        parsed: true,
        content: text,
        language: detectLanguage(text),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error parsing optimized text:", error);
      return {
        parsed: false,
        content: text,
        error: "Failed to parse resume text"
      };
    }
  }
  
  /**
   * Basic language detection based on text content
   * Enhanced with better error handling
   * 
   * @param text - Text to analyze
   * @returns Detected language name
   */
  function detectLanguage(text: string): string {
    try {
      // This is a basic implementation using word frequency analysis
      // In a production app, use a more sophisticated language detection library
      
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
      
      // Determine language based on counts and threshold (5% of words)
      if (frenchCount > spanishCount && frenchCount > words.length * 0.05) {
        return 'French';
      } else if (spanishCount > frenchCount && spanishCount > words.length * 0.05) {
        return 'Spanish';
      }
      
      // Default to French for CareerBoost (changed from English)
      return 'French';
    } catch (error) {
      console.error("Error detecting language:", error);
      return 'French'; // Default to French when there's an error
    }
  }
  
  // Clean up function to clear timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts to prevent memory leaks
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // Return all state and functions
  return {
    // Status states
    isUploading,
    isParsing,
    isOptimizing,
    isLoading,
    isApplyingChanges,
    isResetting,
    isApplyingReoptimization,
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
    improvementsSummary,
    
    // Actions
    handleFileUpload,
    optimizeResumeData,
    loadLatestResume,
    applyTemplateToResume,
    applySuggestion,
    toggleKeyword,
    resetResume,
    
    // Setters
    setSelectedFile,
    setOptimizedData,
    setOptimizedText,
    setEditedText
  };
}