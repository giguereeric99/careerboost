/**
 * Enhanced Resume Optimizer Hook
 * 
 * This hook manages the complete lifecycle of resume optimization:
 * - Upload and parsing
 * - AI optimization
 * - Suggestion application
 * - Keyword integration
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
  calculateAtsScore,
  isValidNoResumeState
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
  isResetting: boolean;
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
 * @param userId - Optional user ID for loading saved resumes
 * @returns A comprehensive set of state and functions for resume optimization
 */
export function useResumeOptimizer(userId?: string | null): ResumeOptimizerState {
  // --- Status State ---
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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
  const currentLoadRequestUserIdRef = useRef<string | null>(null); // Track current load request
  const lastLoadedResumeIdRef = useRef<string | null>(null);  // Track last loaded resume ID
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);  // For debouncing updates
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);  // For timed resume loading
  const welcomeMessageShownRef = useRef(false);    // Track if welcome message shown
  const resumeFoundRef = useRef(false);           // Track if a resume was found for the user
  const loadAttemptsRef = useRef(0);             // Count load attempts to prevent infinite loops
  const MAX_LOAD_ATTEMPTS = 2;                    // Maximum number of load attempts
  
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
   * Optimizes the resume using AI
   * Handles the full optimization process and state updates
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
      setEditedText(null);  // Clear any previous edited text when creating new optimization
      setSuggestions(suggestionsResult);
      setOptimizationScore(atsScore);
      setNeedsRegeneration(false);  // Reset regeneration flag since we have fresh content
      
      // Format keywords for UI if available
      if (keywordSuggestions && keywordSuggestions.length > 0) {
        setKeywords(keywordSuggestions.map(keyword => ({
          text: keyword,
          applied: false  // Initially none are applied
        })));
      }
      
      // Show success message with score
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
   * Loads the most recent optimized resume for a user
   * Implements safeguards against multiple concurrent loads and infinite loops
   * 
   * @param userId - The user ID to load resume for
   * @returns The resume data or null if not found
   */
  const loadLatestResume = useCallback(async (userId: string) => {
    // Skip if invalid userId or operation already in progress
    if (!userId) {
      console.log("No userId provided, skipping resume load");
      return null;
    }
    
    // Check load attempts to prevent infinite loops
    if (loadAttemptsRef.current >= MAX_LOAD_ATTEMPTS) {
      console.log(`Maximum load attempts (${MAX_LOAD_ATTEMPTS}) reached for user ${userId}, skipping to prevent loops`);
      return null;
    }
    
    // If we're already loading for this userId, don't start another request
    if (currentLoadRequestUserIdRef.current === userId && isLoading) {
      console.log(`Already loading resume for ${userId}, skipping duplicate request`);
      return null;
    }
    
    // Skip if we've already found a resume for this user in this session
    if (resumeFoundRef.current && lastLoadedResumeIdRef.current && resumeId) {
      console.log(`Already found resume ${resumeId} for user ${userId}, returning cached data`);
      return {
        id: resumeId,
        optimized_text: optimizedText,
        last_saved_text: editedText
      };
    }
    
    // Increment load attempts counter
    loadAttemptsRef.current++;
    
    // Set loading state and track that we're loading for this userId
    setIsLoading(true);
    currentLoadRequestUserIdRef.current = userId;
    
    try {
      console.log("Fetching latest resume for user:", userId);
      
      // Call API to get latest resume
      const { data, error } = await getLatestOptimizedResume(userId);
      
      // Handle API errors
      if (error) {
        console.error("Error from resume service:", error);
        return null;
      }
      
      // Handle case where data is found
      if (data) {
        console.log("Resume found for user:", data.id);
        
        // Update tracking state
        lastLoadedResumeIdRef.current = data.id;
        resumeFoundRef.current = true;
        loadAttemptsRef.current = 0; // Reset counter on success
        
        // Update component state with resume data
        setResumeId(data.id);
        
        // PRIORITY LOGIC: Use last_saved_text if available, otherwise use optimized_text
        if (data.last_saved_text) {
          console.log("Found last_saved_text, using it for display");
          setEditedText(data.last_saved_text);
        } else {
          console.log("No last_saved_text found, using original optimized text");
          setEditedText(null);
        }
        
        // Always keep the original optimized text for reference and reset functionality
        setOptimizedText(data.optimized_text || '');
        
        // Set ATS score or use default value if not available
        setOptimizationScore(data.ats_score || 65);
  
        // Parse the data for structure to prepare for template application
        try {
          const parsedData = parseOptimizedText(data.optimized_text);
          setOptimizedData(parsedData);
        } catch (parseError) {
          console.error("Error parsing optimized text:", parseError);
          // Continue even if parsing fails - original text is still usable
        }
        
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
            id: s.id || String(Math.random()),
            text: s.text,
            type: s.type || 'general',
            impact: s.impact || 'medium',
            isApplied: s.is_applied || s.isApplied || false
          })));
        }
        
        // Check if any changes need regeneration
        const hasAppliedChanges = 
          (data.keywords && data.keywords.some(k => k.is_applied || k.applied)) ||
          (data.suggestions && data.suggestions.some(s => s.is_applied || s.isApplied));
        
        setNeedsRegeneration(hasAppliedChanges && !data.last_saved_text);
        
        // Success toast
        toast.message(
          "Resume loaded", {
          description: "Your previous optimized resume has been loaded."
        });
        
        return data;
      } else {
        // No resume found - expected for new users
        console.log("No resume found for user - expected for new users");
        
        // Clear tracking refs to ensure future attempts are allowed
        lastLoadedResumeIdRef.current = null;
        resumeFoundRef.current = false;
        
        // Show welcome message only once
        if (!welcomeMessageShownRef.current) {
          welcomeMessageShownRef.current = true;
          toast.message(
            "Welcome to CareerBoost", {
            description: "Upload your resume to get started with AI optimization."
          });
        }
        
        return null;
      }
    } catch (error: any) {
      // Handle unexpected errors
      console.error("Error or timeout loading resume:", error);
      
      // Only show toast message if this is not an automatic load
      toast.error(
        "Error loading resume", {
        description: error.message || "An unexpected error occurred while loading your resume."
      });
      
      // Clear tracking refs on error to allow future attempts
      lastLoadedResumeIdRef.current = null;
      resumeFoundRef.current = false;
      
      return null;
    } finally {
      // Always reset loading state
      setIsLoading(false);
      currentLoadRequestUserIdRef.current = null;
    }
  }, [isLoading, resumeId, optimizedText, editedText]);
  
  /**
   * Applies a template to the current resume
   * Uses debouncing to prevent rapid state updates
   * 
   * @param templateId - ID of the template to apply
   */
  const applyTemplateToResume = useCallback((templateId: string) => {
    // Clear any pending updates to prevent rapid changes
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Debounce the state update to prevent multiple rapid changes
    updateTimeoutRef.current = setTimeout(() => {
      // Mark that regeneration is needed after template change
      setNeedsRegeneration(true);
      
      // Notify user of template application
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
        !suggestion.isApplied  // Toggle status
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
      
      // Update local state
      // Clear the edited text state
      setEditedText(null);
      
      // Reset suggestions (all to unapplied)
      setSuggestions(prev => prev.map(s => ({...s, isApplied: false})));
      
      // Reset keywords (all to unapplied)
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
        return 'French'; // Default to French if insufficient text
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
      
      // Default to French for CareerBoost
      return 'French';
    } catch (error) {
      console.error("Error detecting language:", error);
      return 'French'; // Default to French when there's an error
    }
  }
  
  // Effect to load resume when component mounts if userId is available
  // This is kept separate from loadLatestResume to prevent infinite loops
  useEffect(() => {
    // Only attempt to load a resume if we have a userId and aren't already loading
    if (userId && !isLoading && currentLoadRequestUserIdRef.current === null && loadAttemptsRef.current < MAX_LOAD_ATTEMPTS) {
      // Use a timeout to ensure we don't start loading immediately
      // This prevents loops in case of rapid component re-renders
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      loadTimeoutRef.current = setTimeout(() => {
        loadLatestResume(userId);
      }, 100);
    }
    
    // Clean up function to clear timeout if component unmounts
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [userId, isLoading, loadLatestResume]);
  
  // Effect to cleanup on component unmount - clear all timeouts
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);
  
  // Return hook interface
  return {
    // Status states
    isUploading,
    isParsing,
    isOptimizing,
    isLoading,
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