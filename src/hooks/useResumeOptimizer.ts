/**
 * Enhanced Resume Optimizer Hook
 * 
 * A comprehensive React hook for managing the entire resume optimization lifecycle:
 * - Resume upload and parsing
 * - AI-driven optimization and enhancement
 * - Suggestion management and application
 * - Keyword integration and tracking
 * - Score calculation and improvement metrics
 * - State management with error prevention
 * 
 * This hook forms the core of the resume optimization feature in CareerBoost,
 * implementing safeguards against infinite loops and state inconsistencies.
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
  calculateAtsScore,
  shouldAttemptResumeLoad,
  isValidNoResumeState
} from '@/services/resumeService';
import { ResumeData, Suggestion } from '@/types/resume';
import { toast } from "sonner";

/**
 * Interface defining the state and methods for resume optimization
 * Comprehensive type definition for the hook's return value
 */
interface ResumeOptimizerState {
  // Status states - track various processing operations
  isUploading: boolean;
  isParsing: boolean;
  isOptimizing: boolean;
  isLoading: boolean;
  isApplyingChanges: boolean;
  isResetting: boolean;
  isApplyingReoptimization: boolean;
  needsRegeneration: boolean;
  
  // Data states - store resume content and metadata
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
  
  // Action methods - operations that can be performed
  handleFileUpload: (file: File) => Promise<ResumeData | null>;
  optimizeResumeData: (data?: ResumeData) => Promise<any | null>;
  loadLatestResume: (userId: string) => Promise<any | null>;
  applyTemplateToResume: (templateId: string) => void;
  applySuggestion: (index: number) => Promise<void>;
  toggleKeyword: (index: number) => Promise<void>;
  resetResume: () => Promise<boolean>;
  
  // Setter methods - update specific state values
  setSelectedFile: (file: File | null) => void;
  setOptimizedData: (data: ResumeData | null) => void;
  setOptimizedText: (text: string) => void;
  setEditedText: (text: string | null) => void;
}

/**
 * Custom hook for managing the complete resume optimization workflow
 * 
 * This hook centralizes all resume-related state and operations, providing
 * a clean interface for components to interact with the optimization process.
 * It includes safeguards against state inconsistencies and infinite loops.
 * 
 * @param userId - Optional user ID for loading saved resumes
 * @returns A comprehensive set of state values and functions for resume optimization
 */
export function useResumeOptimizer(userId?: string | null): ResumeOptimizerState {
  // --- Status State Management ---
  // These states track the loading and processing status for different operations
  const [isUploading, setIsUploading] = useState(false);     // File upload in progress
  const [isParsing, setIsParsing] = useState(false);         // Resume parsing in progress
  const [isOptimizing, setIsOptimizing] = useState(false);   // AI optimization in progress
  const [isLoading, setIsLoading] = useState(false);         // General data loading in progress
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);  // Applying suggestions/keywords
  const [isResetting, setIsResetting] = useState(false);     // Resetting to original version
  const [isApplyingReoptimization, setIsApplyingReoptimization] = useState(false);  // Reoptimizing
  const [needsRegeneration, setNeedsRegeneration] = useState(false);  // Changes need to be applied
  
  // --- Data State Management ---
  // These states store the actual resume data and metadata
  const [selectedFile, setSelectedFile] = useState<File | null>(null);  // Uploaded file
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);  // Parsed resume structure
  const [optimizedData, setOptimizedData] = useState<ResumeData | null>(null);  // Optimized structure
  const [optimizedText, setOptimizedText] = useState<string>('');  // Original optimized HTML content
  const [editedText, setEditedText] = useState<string | null>(null);  // User-edited content
  const [resumeId, setResumeId] = useState<string | null>(null);  // Database ID of the resume
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);  // Improvement suggestions
  const [keywords, setKeywords] = useState<{text: string, applied: boolean}[]>([]);  // Keyword suggestions
  const [optimizationScore, setOptimizationScore] = useState(65);  // ATS compatibility score (0-100)
  const [improvementsSummary, setImprovementsSummary] = useState('');  // Summary of improvements
  
  // --- Reference Values ---
  // These refs help prevent infinite loops and track operation state
  const operationInProgressRef = useRef(false);  // Prevents concurrent operations
  const lastLoadedResumeIdRef = useRef<string | null>(null);  // Tracks last loaded resume
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);  // For debouncing updates
  const loadAttemptedRef = useRef(false);  // Tracks if a load has been attempted
  const loadAttemptsRef = useRef(0);  // Number of load attempts for current user
  const MAX_LOAD_ATTEMPTS = 2;  // Maximum number of load attempts to prevent loops

  /**
   * Handles the complete upload and processing of a resume file
   * Manages the workflow: upload → parse → prepare for optimization
   * 
   * @param file - The resume file to upload (PDF, DOCX, etc.)
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
      
      // 1. Upload file to storage
      const { path, error } = await uploadResume(file);
      
      // Check for upload errors
      if (error) {
        throw error;
      }
      
      // 2. Update states for parse phase
      setIsUploading(false);
      setIsParsing(true);
      
      // 3. Parse the resume to extract structured data
      const { data, error: parseError } = await parseResume(path);
      
      // Check for parsing errors
      if (parseError) {
        throw parseError;
      }
      
      // 4. Set resume data and show success message
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
        description: error.message || "An unexpected error occurred while processing your resume."
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
   * Optimizes the resume using AI processing
   * Transforms structured resume data into an improved version with suggestions
   * 
   * @param data - The resume data to optimize (defaults to current state)
   * @returns Optimization results or null on failure
   */
  const optimizeResumeData = async (data: ResumeData = resumeData!) => {
    // Validate input: Skip if no data or operation already in progress
    if (!data || operationInProgressRef.current) return null;
    
    try {
      // Set operation flag to prevent concurrent optimizations
      operationInProgressRef.current = true;
      setIsOptimizing(true);
      
      // 1. Call the optimization service
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
      
      // 2. Update state with optimization results
      setOptimizedData(optimizedData);
      setOptimizedText(text || '');
      setEditedText(null);  // Clear any previous edited text when creating new optimization
      setSuggestions(suggestionsResult);
      setOptimizationScore(atsScore);
      setNeedsRegeneration(false);  // Reset regeneration flag since we have fresh content
      
      // 3. Format keywords for UI if available
      if (keywordSuggestions && keywordSuggestions.length > 0) {
        setKeywords(keywordSuggestions.map(keyword => ({
          text: keyword,
          applied: false  // Initially none are applied
        })));
      }
      
      // 4. Show success message with score
      toast.message(
        "Resume optimized", {
        description: `Your resume has been optimized with an ATS score of ${atsScore}/100.`
      });
      
      return { optimizedData, suggestions: suggestionsResult, optimizedText: text, atsScore };
    } catch (error: any) {
      // Handle optimization errors with user feedback
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
   * Loads the most recent optimized resume for the current user
   * Handles loading with safeguards against redundant loads
   * 
   * @param userId - The user ID to load resumes for
   * @returns The loaded resume data or null if not found
   */
  const loadLatestResume = async (userId: string) => {
    // 1. Validate input and check loading conditions
    if (!userId) {
      console.warn("Cannot load resume: No user ID provided");
      return null;
    }
    
    // 2. Check if we should attempt loading (prevents infinite loops)
    if (!shouldAttemptResumeLoad(userId, loadAttemptsRef.current, MAX_LOAD_ATTEMPTS)) {
      console.log(`Skipping resume load for user ${userId}: Maximum attempts reached`);
      return null;
    }
    
    // 3. Increment load attempt counter
    loadAttemptsRef.current += 1;
    
    try {
      // 4. Set loading state to show UI indicators
      setIsLoading(true);
      
      // 5. Mark that we attempted to load - prevents infinite loops
      loadAttemptedRef.current = true;
      
      // 6. Call the API function to fetch the latest resume
      const response = await fetch(`/api/resumes?userId=${encodeURIComponent(userId)}`);
      const result = await response.json();
      
      // 7. Check response status
      if (!response.ok) {
        // True error case - API returned an error
        throw new Error(result.error || "Failed to load resume from server");
      }
      
      // 8. Handle the "no resume" case - important for preventing loops
      if (isValidNoResumeState(response, result)) {
        console.log("No resume found for this user - normal for new users");
        
        // Clear any tracking references to prevent loops
        lastLoadedResumeIdRef.current = null;
        
        // Show a friendly message for new users
        toast.message(
          "Welcome to CareerBoost", {
          description: "Upload your resume to get started with AI optimization."
        });
        
        return null;
      }
      
      // 9. Process successful resume data response
      if (result.data) {
        // Prevent loading the same resume multiple times
        // This optimization avoids unnecessary state updates
        if (result.data.id === lastLoadedResumeIdRef.current) {
          console.log("Same resume already loaded, skipping update");
          setIsLoading(false);
          return result.data;
        }
        
        // Update tracking reference with current resume ID
        lastLoadedResumeIdRef.current = result.data.id;
        
        // 10. Update state with loaded resume data
        setResumeId(result.data.id);
        
        // Check if there's a saved edited version and use it if available
        if (result.data.last_saved_text) {
          console.log("Found last_saved_text, using it for display");
          setEditedText(result.data.last_saved_text);
        } else {
          console.log("No last_saved_text found, using original optimized text");
          setEditedText(null);
        }
        
        // Always keep the original optimized text for reference and reset functionality
        setOptimizedText(result.data.optimized_text || '');
        
        // Set ATS score or use default value if not available
        setOptimizationScore(result.data.ats_score || 65);
  
        // Parse the data for structure to prepare for template application
        try {
          const parsedData = parseOptimizedText(result.data.optimized_text);
          setOptimizedData(parsedData);
        } catch (parseError) {
          console.error("Error parsing optimized text:", parseError);
          // Continue even if parsing fails - original text is still usable
        }
        
        // 11. Set keywords if available
        if (result.data.keywords && result.data.keywords.length > 0) {
          // Map the database format to our internal state format
          setKeywords(result.data.keywords.map(k => ({
            text: k.keyword || k.text,
            applied: k.is_applied || k.applied || false
          })));
        }
        
        // 12. Set suggestions if available
        if (result.data.suggestions && result.data.suggestions.length > 0) {
          // Map the database format to our internal state format
          setSuggestions(result.data.suggestions.map(s => ({
            id: s.id || String(Math.random()),
            text: s.text,
            type: s.type || 'general',
            impact: s.impact || 'medium',
            isApplied: s.is_applied || s.isApplied || false
          })));
        }
        
        // 13. Check if any changes need regeneration
        const hasAppliedChanges = 
          (result.data.keywords && result.data.keywords.some(k => k.is_applied || k.applied)) ||
          (result.data.suggestions && result.data.suggestions.some(s => s.is_applied || s.isApplied));
        
        setNeedsRegeneration(hasAppliedChanges && !result.data.last_saved_text);
        
        // 14. Show success notification to the user
        toast.message(
          "Resume loaded", {
          description: "Your previous optimized resume has been loaded."
        });
        
        // 15. Reset load attempt counter on success
        loadAttemptsRef.current = 0;
        
        return result.data;
      }
      
      // This should be unreachable given the isValidNoResumeState check above
      return null;
    } catch (error: any) {
      // 16. Handle loading errors with appropriate user feedback
      console.error("Error loading resume:", error);
      
      // Show error notification with details to help troubleshoot
      toast.error(
        "Error loading resume", {
        description: error.message || "An unexpected error occurred. Please try again."
      });
      
      // Clear tracking refs to prevent loops on error
      lastLoadedResumeIdRef.current = null;
      
      return null;
    } finally {
      // 17. Always reset loading state regardless of outcome
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
    // 1. Clear any pending updates to prevent rapid changes
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // 2. Debounce the state update to prevent multiple rapid changes
    updateTimeoutRef.current = setTimeout(() => {
      // 3. Mark that regeneration is needed after template change
      setNeedsRegeneration(true);
      
      // 4. Notify user of template application
      toast.message(
        "Template applied", {
        description: `The ${templateId} template has been applied to your resume.`
      });
    }, 150);  // 150ms debounce timer
  }, []);
  
  /**
   * Applies a suggestion to improve the resume
   * Updates both local state and database
   * 
   * @param suggestionIndex - Index of the suggestion to apply
   */
  const applySuggestion = async (suggestionIndex: number) => {
    // 1. Validate parameters and state
    if (!resumeId || !suggestions[suggestionIndex] || operationInProgressRef.current) return;
    
    try {
      // 2. Set operation flag to prevent concurrent operations
      operationInProgressRef.current = true;
      const suggestion = suggestions[suggestionIndex];
      
      // 3. Update suggestion status in database
      await updateSuggestionStatus(
        resumeId, 
        suggestion.id || String(suggestionIndex), 
        !suggestion.isApplied  // Toggle status
      );
      
      // 4. Update local state using functional update to ensure consistency
      setSuggestions(prev => {
        const newSuggestions = [...prev];
        newSuggestions[suggestionIndex] = {
          ...suggestion,
          isApplied: !suggestion.isApplied
        };
        return newSuggestions;
      });
      
      // 5. Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      // 6. Notify user of the change
      toast.message(
        suggestion.isApplied ? "Suggestion removed" : "Suggestion applied", {
        description: suggestion.isApplied 
          ? "The suggestion has been removed from your resume."
          : "The suggestion has been applied to your resume."
      });
    } catch (error: any) {
      // 7. Handle error applying suggestion
      toast.error(
        "Error applying suggestion", {
        description: error.message || "Failed to update suggestion status."
      });
    } finally {
      // 8. Always clear operation flag
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
    // 1. Validate parameters and state
    if (!resumeId || !keywords[index] || operationInProgressRef.current) return;
    
    try {
      // 2. Set operation flag to prevent concurrent operations
      operationInProgressRef.current = true;
      const keyword = keywords[index];
      const newAppliedState = !keyword.applied;
      
      // 3. Update keyword status in database
      await updateKeywordStatus(
        resumeId,
        keyword.text,
        newAppliedState
      );
      
      // 4. Update local state using functional update to ensure consistency
      setKeywords(prev => {
        const newKeywords = [...prev];
        newKeywords[index] = {
          ...keyword,
          applied: newAppliedState
        };
        return newKeywords;
      });
      
      // 5. Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      // 6. Notify user of the change
      toast.message(
        newAppliedState ? "Keyword added" : "Keyword removed", {
        description: `"${keyword.text}" has been ${newAppliedState ? 'added to' : 'removed from'} your resume.`
      });
    } catch (error: any) {
      // 7. Handle error updating keyword
      toast.error(
        "Error updating keyword", {
        description: error.message || "Failed to update keyword status."
      });
    } finally {
      // 8. Always clear operation flag
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
    // 1. Validate state before proceeding
    if (!resumeId || operationInProgressRef.current) return false;
    
    try {
      // 2. Set operation flag
      operationInProgressRef.current = true;
      setIsResetting(true);
      
      // 3. Call the API to reset the resume
      const response = await fetch('/api/resumes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId,
          action: 'reset'
        })
      });
      
      // 4. Handle API errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset resume');
      }
      
      // 5. Parse the response
      const result = await response.json();
      
      // 6. Update local state
      // 6.1. Clear the edited text state
      setEditedText(null);
      
      // 6.2. Reset suggestions (all to unapplied)
      setSuggestions(prev => prev.map(s => ({...s, isApplied: false})));
      
      // 6.3. Reset keywords (all to unapplied)
      setKeywords(prev => prev.map(k => ({...k, applied: false})));
      
      // 6.4. Reset needs regeneration flag
      setNeedsRegeneration(false);
      
      // 7. Notify user
      toast.success('Resume reset to original optimized version');
      
      return true;
    } catch (error: any) {
      // 8. Handle reset errors
      console.error('Error resetting resume:', error);
      toast.error(`Failed to reset resume: ${error.message || 'An unexpected error occurred'}`);
      return false;
    } finally {
      // 9. Always reset operation flag
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
  
  /**
   * Effect to handle cleanup when component unmounts
   * Ensures all timeouts are cleared to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      // Clear any pending timeouts to prevent memory leaks
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // Return the complete state and methods interface
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