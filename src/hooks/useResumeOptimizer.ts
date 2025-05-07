/**
 * Enhanced Resume Optimizer Hook
 * 
 * A comprehensive React hook for managing the complete resume optimization workflow:
 * - Resume upload and parsing
 * - AI-driven optimization and enhancement
 * - Suggestion management and application
 * - Keyword integration and tracking
 * - Score calculation and improvement metrics
 * - State management with robustness against infinite loops
 * 
 * This hook serves as the central state management system for the resume optimization
 * feature in CareerBoost, providing a clean interface for components to interact with.
 */

'use client'

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
  hasResume: boolean | null;  // Whether user has a resume
  
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
  checkIfUserHasResume: () => Promise<void>;
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
 * This hook provides a centralized interface for all resume-related operations
 * with improved state management to prevent infinite loops and duplicate messages.
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
  const [hasResume, setHasResume] = useState<boolean | null>(null);  // Track if user has a resume
  
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
  
  // --- Refs to prevent infinite loops and track state ---
  const operationInProgressRef = useRef(false);    // Prevents concurrent operations
  const lastLoadedResumeIdRef = useRef<string | null>(null);  // Tracks last loaded resume
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);  // For debouncing updates
  const loadAttemptedRef = useRef(false);  // Tracks if a load has been attempted
  const loadAttemptsRef = useRef(0);  // Number of load attempts for current user
  const welcomeMessageShownRef = useRef(false);  // Track if welcome message was shown
  const MAX_LOAD_ATTEMPTS = 2;  // Maximum number of load attempts to prevent loops

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
        description: error.message || "An unexpected error occurred during processing."
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
        description: error.message || "An unexpected error occurred during optimization."
      });
      return null;
    } finally {
      // Reset state regardless of outcome
      setIsOptimizing(false);
      operationInProgressRef.current = false;
    }
  };

  /**
   * Check if user has any resumes in the database
   * Called on component mount and when user changes
   * IMPORTANT: This function should NOT be included in useEffect dependencies
   * to prevent infinite loops
   */
  const checkIfUserHasResume = useCallback(async () => {
    // Prevent checking if already loading or no user
    if (!userId || operationInProgressRef.current) return;
    
    try {
      console.log("Checking if user has resume...");
      
      // Increment attempt counter
      loadAttemptsRef.current += 1;
      
      // Check if we've exceeded maximum attempts
      if (loadAttemptsRef.current > MAX_LOAD_ATTEMPTS) {
        console.log(`Maximum load attempts (${MAX_LOAD_ATTEMPTS}) reached for user ${userId}`);
        return;
      }
      
      // Mark as loading to prevent concurrent checks
      operationInProgressRef.current = true;
      setIsLoading(true);
      
      // Call API to check if user has a resume
      const { data, error } = await getLatestOptimizedResume(userId);
      
      if (error) {
        console.error("Error checking for resume:", error);
        setHasResume(false);
        return;
      }
      
      // Update state based on result
      if (data) {
        console.log("User has a resume:", data.id);
        setHasResume(true);
        
        // Proceed to load complete resume data
        lastLoadedResumeIdRef.current = data.id;
        setResumeId(data.id);
        
        // Update state with resume data
        if (data.last_saved_text) {
          setEditedText(data.last_saved_text);
        } else {
          setEditedText(null);
        }
        
        setOptimizedText(data.optimized_text || '');
        setOptimizationScore(data.ats_score || 65);
        
        // Process structured data if available
        try {
          const parsedData = parseOptimizedText(data.optimized_text);
          setOptimizedData(parsedData);
        } catch (parseError) {
          console.error("Error parsing optimized text:", parseError);
          // Continue despite parsing error - content still available
        }
        
        // Process keywords if available
        if (data.keywords && data.keywords.length > 0) {
          setKeywords(data.keywords.map(k => ({
            text: k.keyword || k.text,
            applied: k.is_applied || k.applied || false
          })));
        }
        
        // Process suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions.map(s => ({
            id: s.id || String(Math.random()),
            text: s.text,
            type: s.type || 'general',
            impact: s.impact || 'medium',
            isApplied: s.is_applied || s.isApplied || false
          })));
        }
        
        // Check if suggestions or keywords need regeneration
        const hasAppliedChanges = 
          (data.keywords && data.keywords.some(k => k.is_applied || k.applied)) ||
          (data.suggestions && data.suggestions.some(s => s.is_applied || s.isApplied));
        
        setNeedsRegeneration(hasAppliedChanges && !data.last_saved_text);
        
        // Reset load attempt counter on success
        loadAttemptsRef.current = 0;
      } else {
        console.log("User has no resume");
        setHasResume(false);
        
        // Show welcome message ONLY if not already shown
        if (!welcomeMessageShownRef.current) {
          toast.message(
            "Welcome to CareerBoost", {
            description: "Upload your resume to get started with AI optimization."
          });
          welcomeMessageShownRef.current = true;
        }
      }
    } catch (error: any) {
      console.error("Error checking for resume:", error);
      setHasResume(false);
    } finally {
      setIsLoading(false);
      operationInProgressRef.current = false;
    }
  }, [userId]);
  
  /**
   * Loads the most recent optimized resume for the current user
   * Uses checkIfUserHasResume to prevent duplicate messages
   * 
   * @param userId - The user ID to load resumes for
   * @returns The loaded resume data or null if not found
   */
  const loadLatestResume = async (userId: string) => {
    // Skip if no user ID or operation in progress
    if (!userId || operationInProgressRef.current) return null;
    
    // If resume already loaded, return existing data
    if (resumeId && resumeId === lastLoadedResumeIdRef.current) {
      console.log("Resume already loaded, returning existing data");
      return {
        id: resumeId,
        optimizedText: optimizedText
      };
    }
    
    // Use checkIfUserHasResume to verify and load the resume
    await checkIfUserHasResume();
    
    // If a resume was loaded, construct a result object
    if (resumeId) {
      return {
        id: resumeId,
        optimizedText: optimizedText
      };
    }
    
    return null;
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
        description: error.message || "Failed to update suggestion status."
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
        description: error.message || "Failed to update keyword status."
      });
    } finally {
      // Always clear operation flag
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
      
      // Reset suggestions to all unapplied
      setSuggestions(prev => prev.map(s => ({...s, isApplied: false})));
      
      // Reset keywords to all unapplied
      setKeywords(prev => prev.map(k => ({...k, applied: false})));
      
      // Reset needs regeneration flag
      setNeedsRegeneration(false);
      
      // Notify user
      toast.success('Resume reset to original optimized version');
      
      return true;
    } catch (error: any) {
      // Handle reset errors
      console.error('Error resetting resume:', error);
      toast.error(`Failed to reset resume: ${error.message || 'An unexpected error occurred'}`);
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
      
      // Skip empty text
      if (!text || text.length < 20) {
        return 'French'; // Default if insufficient text
      }
      
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
  
  // Effect to check for resume when userId changes
  useEffect(() => {
    if (userId && !loadAttemptedRef.current) {
      loadAttemptedRef.current = true;
      checkIfUserHasResume();
    }
  }, [userId, checkIfUserHasResume]);
  
  // Effect to cleanup on component unmount
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
    hasResume,
    
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
    checkIfUserHasResume,
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