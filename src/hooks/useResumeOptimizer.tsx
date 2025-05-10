/**
 * Resume Optimizer Hook
 * 
 * A comprehensive hook for managing resume optimization:
 * - Upload and parsing
 * - AI optimization
 * - Suggestions and keywords management
 * - ATS score calculation and tracking
 * - UI state management and notifications
 * 
 * @author CareerBoost Team
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  uploadResume,
  parseResume, 
  optimizeResume, 
  getLatestOptimizedResume,
  updateKeywordStatus,
  updateSuggestionStatus,
  calculateAtsScore
} from '@/services/resumeService';
import { ResumeData, Suggestion } from '@/types/resume';
import { toast } from 'sonner';
import { useResumeScoreManager } from '@/hooks/useResumeScoreManager';
import { prepareOptimizedTextForEditor } from '@/utils/htmlProcessor';
import { normalizeHtmlContent } from '@/utils/resumeUtils';
import { generateOptimizationMetrics, downloadOptimizationReport, exportFormats } from '@/services/resumeMetricsExporter';

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const MAX_LOAD_ATTEMPTS = 2;
const API_TIMEOUT = 10000;
const SAFETY_TIMEOUT = 8000;
const DEFAULT_SCORE = 65;

// -------------------------------------------------------------------------
// Type Definitions
// -------------------------------------------------------------------------

/**
 * Options for customizing hook behavior
 */
interface ResumeOptimizerOptions {
  /** Load resume on initialization (default: true) */
  loadOnInit?: boolean;
  /** Show toast notifications (default: true) */
  showToasts?: boolean;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

/**
 * Complete interface for the resume optimizer hook
 */
interface ResumeOptimizerState {
  // Status states
  isUploading: boolean;
  isParsing: boolean;
  isOptimizing: boolean;
  isLoading: boolean;
  isResetting: boolean;
  needsRegeneration: boolean;
  isEditing: boolean;
  
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
  
  // Enhanced states
  processedHtml: string;
  appliedSuggestions: number[];
  appliedKeywords: string[];
  optimizationMetrics: any;
  scoreManager: any;
  
  // Actions
  handleFileUpload: (file: File) => Promise<ResumeData | null>;
  optimizeResumeData: (data?: ResumeData) => Promise<any | null>;
  loadLatestResume: (userId: string, options?: { silent?: boolean }) => Promise<any | null>;
  applyTemplateToResume: (templateId: string) => void;
  applySuggestion: (index: number) => Promise<void>;
  toggleKeyword: (index: number) => Promise<void>;
  resetResume: () => Promise<boolean>;
  
  // Enhanced actions
  handleApplySuggestion: (index: number) => void;
  handleKeywordApply: (index: number) => void;
  handleReset: () => Promise<boolean>;
  handleSave: (content: string) => Promise<boolean>;
  handlePreviewContentChange: (html: string) => void;
  generateMetrics: () => any;
  exportReport: (format?: 'json' | 'csv' | 'markdown') => void;
  simulateSuggestionImpact: (index: number) => any;
  simulateKeywordImpact: (index: number) => any;
  forceScoreUpdate: (score: number) => void;
  
  // Setters
  setSelectedFile: (file: File | null) => void;
  setResumeData: (data: ResumeData | null) => void;
  setOptimizedData: (data: ResumeData | null) => void;
  setOptimizedText: (text: string) => void;
  setEditedText: (text: string | null) => void;
  setResumeId: (id: string | null) => void;
  setOptimizationScore: (score: number) => void;
  setSuggestions: (suggestions: Suggestion[]) => void;
  setKeywords: (keywords: {text: string, applied: boolean}[]) => void;
  setIsEditing: (isEditing: boolean) => void;
}

/**
 * Main Resume Optimizer Hook
 * 
 * @param userId - User ID for loading saved resumes
 * @param options - Configuration options
 * @returns Complete resume optimizer state and methods
 */
export function useResumeOptimizer(
  userId?: string | null, 
  options: ResumeOptimizerOptions & { user?: any } = {}
): ResumeOptimizerState {
  // Process options with defaults
  const { user } = options;
  const {
    loadOnInit = true,
    showToasts = true,
    verbose = false
  } = options;
  
  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------
  
  // --- Status State ---
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [abortLoading, setAbortLoading] = useState(false);
  
  // --- Data State ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [optimizedData, setOptimizedData] = useState<ResumeData | null>(null);
  const [optimizedText, setOptimizedText] = useState<string>('');
  const [editedText, setEditedText] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<{text: string, applied: boolean}[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(DEFAULT_SCORE);
  const [improvementsSummary, setImprovementsSummary] = useState('');
  
  // --- Enhanced UI State ---
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  const [appliedKeywords, setAppliedKeywords] = useState<string[]>([]);
  const [optimizationMetrics, setOptimizationMetrics] = useState<any>(null);
  const [localSuggestions, setLocalSuggestions] = useState<any[]>(suggestions || []);
  const [localKeywords, setLocalKeywords] = useState<any[]>(keywords || []);
  const [localOptimizationScore, setLocalOptimizationScore] = useState<number>(optimizationScore);
  const [localResumeId, setLocalResumeId] = useState<string | null>(resumeId);
  
  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------
  
  // Operation flags
  const operationInProgressRef = useRef(false);
  const currentLoadRequestUserIdRef = useRef<string | null>(null);
  const isUpdatingContentRef = useRef(false);
  const isUpdatingTrackingRef = useRef(false);
  
  // Tracking state
  const lastLoadedResumeIdRef = useRef<string | null>(null);
  const resumeFoundRef = useRef(false);
  const loadAttemptsRef = useRef(0);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedContentRef = useRef<string>('');
  
  // UI state
  const toastShownRef = useRef(false);
  const welcomeMessageShownRef = useRef(false);
  const userCheckedRef = useRef(false);
  
  // Score tracking
  const highestScoreRef = useRef<number>(optimizationScore || DEFAULT_SCORE);
  const hasReceivedApiScoreRef = useRef<number>(false);
  
  // Performance
  const sessionIdRef = useRef<string>(Date.now().toString());
  const startTimeRef = useRef<Date>(new Date());
  const appliedSuggestionsRef = useRef<number[]>([]);
  const appliedKeywordsRef = useRef<string[]>([]);
  
  // -------------------------------------------------------------------------
  // Integration with Score Manager
  // -------------------------------------------------------------------------
  
  // Initialize score manager if available
  const scoreManager = useResumeScoreManager ? useResumeScoreManager({
    initialScore: highestScoreRef.current || optimizationScore || DEFAULT_SCORE,
    resumeContent: optimizedText || editedText || '',
    initialSuggestions: localSuggestions.map(s => ({
      id: s.id,
      type: s.type || 'general',
      text: s.text,
      impact: s.impact || 'medium',
      isApplied: s.isApplied || false
    })),
    initialKeywords: localKeywords.map(k => ({
      text: k.text,
      applied: k.applied
    })),
    resumeId: localResumeId,
    onScoreChange: (newScore) => {
      if (verbose) console.log("[Hook] Score manager updated:", newScore);
      
      // Protect against regression if we've received an API score
      if (hasReceivedApiScoreRef.current && newScore < highestScoreRef.current) {
        if (verbose) console.log(`[Hook] Protecting against score manager downgrade: ${newScore} < ${highestScoreRef.current}`);
        return;
      }
      
      // Update local score when score manager changes it
      setLocalOptimizationScore(newScore);
      
      // Update highest score if needed
      if (newScore > highestScoreRef.current) {
        highestScoreRef.current = newScore;
      }
    }
  }) : null;
  
  // -------------------------------------------------------------------------
  // Notification Helper
  // -------------------------------------------------------------------------
  
  /**
   * Display a notification based on configuration
   */
  const notify = useCallback((
    message: string, 
    description?: string, 
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    if (showToasts) {
      switch (type) {
        case 'success':
          toast.success(message, { description });
          break;
        case 'error':
          toast.error(message, { description });
          break;
        case 'warning':
          toast.warning(message, { description });
          break;
        default:
          toast.message(message, { description });
      }
    }
    
    if (verbose || !showToasts) {
      console.log(`[Hook] ${type.toUpperCase()}: ${message}${description ? ` - ${description}` : ''}`);
    }
  }, [showToasts, verbose]);
  
  // -------------------------------------------------------------------------
  // Core API Functions
  // -------------------------------------------------------------------------
  
  /**
   * Load suggestions for a resume
   */
  const loadSuggestions = useCallback(async (resumeId: string) => {
    try {
      if (verbose) console.log(`[Hook] Loading suggestions for resume ${resumeId}`);
      
      // Use the correct URL format that matches your API
      const response = await fetch(`/api/resumes/suggestions?resumeId=${resumeId}`);
      
      if (!response.ok) {
        if (verbose) console.warn(`[Hook] Failed to load suggestions: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      // Check the response structure according to your API
      if (!data || !data.data || !Array.isArray(data.data)) {
        if (verbose) console.log("[Hook] No suggestions found or invalid format");
        return [];
      }
      
      if (verbose) console.log(`[Hook] Successfully loaded ${data.data.length} suggestions`);
      return data.data;
    } catch (error) {
      console.error("[Hook] Error loading suggestions:", error);
      return [];
    }
  }, [verbose]);
  
  /**
   * Load keywords for a resume
   */
  const loadKeywords = useCallback(async (resumeId: string) => {
    try {
      if (verbose) console.log(`[Hook] Loading keywords for resume ${resumeId}`);
      
      // Use the correct URL format that matches your API
      const response = await fetch(`/api/resumes/keywords?resumeId=${resumeId}`);
      
      if (!response.ok) {
        if (verbose) console.warn(`[Hook] Failed to load keywords: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      // Check the response structure according to your API
      if (!data || !data.data || !Array.isArray(data.data)) {
        if (verbose) console.log("[Hook] No keywords found or invalid format");
        return [];
      }
      
      if (verbose) console.log(`[Hook] Successfully loaded ${data.data.length} keywords`);
      return data.data;
    } catch (error) {
      console.error("[Hook] Error loading keywords:", error);
      return [];
    }
  }, [verbose]);
  
  // -------------------------------------------------------------------------
  // Force Update Score (needed early for dependencies)
  // -------------------------------------------------------------------------
  
  /**
   * Force update score across all components
   */
  const forceScoreUpdate = useCallback((scoreValue: number) => {
    if (!scoreValue || isNaN(scoreValue) || scoreValue <= 0 || scoreValue > 100) {
      console.warn("[Hook] Invalid score value:", scoreValue);
      return;
    }
    
    if (verbose) console.log(`[Hook] Updating score to: ${scoreValue}`);
    
    // Mark that we've received a valid API score
    hasReceivedApiScoreRef.current = true;
    
    // Update highest score if needed
    if (scoreValue > highestScoreRef.current) {
      highestScoreRef.current = scoreValue;
    }
    
    // Update local state
    setLocalOptimizationScore(scoreValue);
    setOptimizationScore(scoreValue);
    
    // Update score manager
    if (scoreManager && typeof scoreManager.updateBaseScore === 'function') {
      scoreManager.updateBaseScore(scoreValue);
    }
  }, [scoreManager, verbose]);
  
  // -------------------------------------------------------------------------
  // Core Actions
  // -------------------------------------------------------------------------
  
  /**
   * Handles the upload and processing of a resume file
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
      
      // Set resume data
      setResumeData(data);
      
      // Show success message
      notify(
        "Resume uploaded successfully", 
        "Your resume has been analyzed and is ready for optimization.", 
        "success"
      );
      
      return data;
    } catch (error: any) {
      // Handle errors with user-friendly messages
      notify(
        "Error processing resume", 
        error.message || "An unexpected error occurred while processing your resume.", 
        "error"
      );
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
   * Enhanced with handling for RETRY_UPLOAD errors
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
      setLocalSuggestions(suggestionsResult);
      setOptimizationScore(atsScore);
      setLocalOptimizationScore(atsScore);
      setNeedsRegeneration(false);  // Reset regeneration flag since we have fresh content
      
      // Format keywords for UI if available
      if (keywordSuggestions && keywordSuggestions.length > 0) {
        const formattedKeywords = keywordSuggestions.map(keyword => ({
          text: keyword,
          applied: false  // Initially none are applied
        }));
        setKeywords(formattedKeywords);
        setLocalKeywords(formattedKeywords);
      }
      
      // Show success message with score
      notify(
        "Resume optimized", 
        `Your resume has been optimized with an ATS score of ${atsScore}/100.`,
        "success"
      );
      
      return { optimizedData, suggestions: suggestionsResult, optimizedText: text, atsScore };
    } catch (error: any) {
      // Check for special RETRY_UPLOAD error or API response with this error
      if (
        error.message === 'RETRY_UPLOAD' || 
        (error.response && error.response.data && error.response.data.error === 'RETRY_UPLOAD') ||
        (typeof error.message === 'string' && error.message.includes('parse JSON'))
      ) {
        console.log("[Hook] Detected RETRY_UPLOAD error, prompting user to upload again");
        
        // Show user-friendly message
        notify(
          "Error analyzing resume", 
          "Please try uploading the file again. If the problem persists, try using a different format (PDF or DOCX).",
          "error"
        );
        
        // Reset state to allow for a new upload
        setSelectedFile(null);
        setResumeData(null);
        
        // Reset parsing state if the function exists
        if (typeof setIsParsing === 'function') {
          setIsParsing(false);
        }
        
        return null;
      }
      
      // For other errors, show generic error message
      notify(
        "Error optimizing resume", 
        error.message || "An unexpected error occurred during optimization.",
        "error"
      );
      return null;
    } finally {
      // Reset state regardless of outcome
      setIsOptimizing(false);
      operationInProgressRef.current = false;
    }
  };
  
  /**
   * Loads the most recent optimized resume for a user
   * Improved with better caching behavior and localStorage backup
   */
  const loadLatestResume = useCallback(async (userId: string, options = { silent: false }) => {
    // Skip if invalid userId
    if (!userId) {
      console.log("No userId provided, skipping resume load");
      return null;
    }
    
    // Prevent multiple simultaneous calls
    if (internalLoading) {
      console.log("Already loading resume, skipping duplicate request");
      return null;
    }
    
    // Set loading state
    setIsLoading(true);
    setInternalLoading(true);
    
    try {
      console.log("Fetching latest resume for user:", userId);
      
      // Call API to get latest resume
      const { data, error } = await getLatestOptimizedResume(userId);
      
      // Handle API errors
      if (error) {
        console.error("Error from resume service:", error);
        
        if (!options.silent) {
          toast.error("Error loading resume", {
            description: error.message || "An unexpected error occurred."
          });
        }
        
        return null;
      }
      
      // Handle case where data is found
      if (data) {
        console.log("Resume found for user:", data.id);
        
        // Update resume ID
        setResumeId(data.id);
        
        // PRIORITY LOGIC: Use last_saved_text if available, otherwise use optimized_text
        if (data.last_saved_text) {
          console.log("Using last_saved_text for display");
          setEditedText(data.last_saved_text);
        } else {
          console.log("No last_saved_text, using optimized_text");
          setEditedText(null);
        }
        
        // Always keep original text for reference and reset
        setOptimizedText(data.optimized_text || '');
        
        // PRIORITY LOGIC for score: Use last_saved_score_ats if available, otherwise use ats_score
        const score = data.last_saved_score_ats || data.ats_score || DEFAULT_SCORE;
        setOptimizationScore(score);
        setLocalOptimizationScore(score);
        forceScoreUpdate(score);
        
        // Parse data structure
        try {
          const parsedData = parseOptimizedText(data.optimized_text);
          setOptimizedData(parsedData);
          setResumeData(parsedData);
        } catch (parseError) {
          console.error("Error parsing optimized text:", parseError);
        }
        
        // Load related data
        if (data.id) {
          Promise.all([
            // Load suggestions
            loadSuggestions(data.id).then(suggestionsResult => {
              if (suggestionsResult?.length > 0) {
                setSuggestions(suggestionsResult);
                
                const appliedSugs = suggestionsResult
                  .filter(s => s.is_applied || s.isApplied)
                  .map((_, i) => i) || [];
                
                setAppliedSuggestions(appliedSugs);
              }
            }).catch(e => console.warn("Error loading suggestions:", e)),
            
            // Load keywords
            loadKeywords(data.id).then(keywordsResult => {
              if (keywordsResult?.length > 0) {
                const formattedKeywords = keywordsResult.map(k => ({
                  text: k.keyword || k.text,
                  applied: k.is_applied || k.applied || false
                }));
                
                setKeywords(formattedKeywords);
                
                const appliedKeys = keywordsResult
                  .filter(k => k.is_applied || k.applied)
                  .map(k => k.keyword || k.text) || [];
                
                setAppliedKeywords(appliedKeys);
              }
            }).catch(e => console.warn("Error loading keywords:", e))
          ]);
        }
        
        // Check if any suggestions or keywords are applied
        const hasAppliedChanges = 
          (data.keywords && data.keywords.some(k => k.is_applied || k.applied)) ||
          (data.suggestions && data.suggestions.some(s => s.is_applied || s.isApplied));
        
        // Need regeneration only if changes are applied but not saved
        setNeedsRegeneration(hasAppliedChanges && !data.last_saved_text);
        
        // Success toast if not silent
        if (!options.silent) {
          toast.success("Resume loaded", {
            description: "Your previous resume has been loaded."
          });
        }
        
        return data;
      } else {
        // No resume found - normal for new users
        console.log("No resume found for user - expected for new users");
        
        // Show welcome message if not silent
        if (!options.silent) {
          toast.message("Welcome to CareerBoost", {
            description: "Upload your resume to get started with AI optimization."
          });
        }
        
        return null;
      }
    } catch (error) {
      // Handle unexpected errors
      console.error("Error loading resume:", error);
      
      if (!options.silent) {
        toast.error("Error loading resume", {
          description: error.message || "An unexpected error occurred."
        });
      }
      
      return null;
    } finally {
      // Always reset loading state
      setIsLoading(false);
      setInternalLoading(false);
    }
  }, [
    internalLoading,
    loadSuggestions,
    loadKeywords,
    forceScoreUpdate
  ]);
  
  /**
   * Applies a template to the current resume
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
      notify(
        "Template applied", 
        `The ${templateId} template has been applied to your resume.`,
        "success"
      );
    }, 150);  // 150ms debounce timer
  }, [notify]);
  
  /**
   * Apply suggestion with optimized database updates
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
      
      // Also update enhanced state
      setLocalSuggestions(prev => {
        const newSuggestions = [...prev];
        newSuggestions[suggestionIndex] = {
          ...suggestion,
          isApplied: !suggestion.isApplied
        };
        return newSuggestions;
      });
      
      // Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      // Update applied suggestions tracking
      // Update applied suggestions tracking
      const newIsApplied = !suggestion.isApplied;
      if (newIsApplied) {
        setAppliedSuggestions(prev => [...prev, suggestionIndex]);
      } else {
        setAppliedSuggestions(prev => prev.filter(idx => idx !== suggestionIndex));
      }
      
      // Notify user of the change
      notify(
        suggestion.isApplied ? "Suggestion removed" : "Suggestion applied", 
        suggestion.isApplied 
          ? "The suggestion has been removed from your resume."
          : "The suggestion has been applied to your resume.",
        "success"
      );
    } catch (error: any) {
      // Handle error applying suggestion
      notify(
        "Error applying suggestion", 
        error.message || "Failed to update suggestion status.",
        "error"
      );
    } finally {
      // Always clear operation flag
      operationInProgressRef.current = false;
    }
  };
  
  /**
   * Toggle keyword with optimized database updates
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
      
      // Also update enhanced state
      setLocalKeywords(prev => {
        const newKeywords = [...prev];
        newKeywords[index] = {
          ...keyword,
          applied: newAppliedState
        };
        return newKeywords;
      });
      
      // Mark that changes need to be regenerated
      setNeedsRegeneration(true);
      
      // Update applied keywords tracking
      if (newAppliedState) {
        setAppliedKeywords(prev => [...prev, keyword.text]);
      } else {
        setAppliedKeywords(prev => prev.filter(text => text !== keyword.text));
      }
      
      // Notify user of the change
      notify(
        newAppliedState ? "Keyword added" : "Keyword removed", 
        `"${keyword.text}" has been ${newAppliedState ? 'added to' : 'removed from'} your resume.`,
        "success"
      );
    } catch (error: any) {
      // Handle error updating keyword
      notify(
        "Error updating keyword", 
        error.message || "Failed to update keyword status.",
        "error"
      );
    } finally {
      // Always clear operation flag
      operationInProgressRef.current = false;
    }
  };

  /**
   * Resets the resume to its original optimized version
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
      setLocalSuggestions(prev => prev.map(s => ({...s, isApplied: false})));
      
      // Reset keywords (all to unapplied)
      setKeywords(prev => prev.map(k => ({...k, applied: false})));
      setLocalKeywords(prev => prev.map(k => ({...k, applied: false})));
      
      // Reset applied items tracking
      setAppliedSuggestions([]);
      setAppliedKeywords([]);
      
      // Reset score manager if available
      if (scoreManager?.resetAllChanges) {
        scoreManager.resetAllChanges();
      }
      
      // Reset needs regeneration flag
      setNeedsRegeneration(false);
      
      // Notify user
      notify('Resume reset to original optimized version', undefined, 'success');
      
      return true;
    } catch (error: any) {
      // Handle reset errors
      console.error('Error resetting resume:', error);
      notify(
        "Failed to reset resume", 
        error.message || 'An unexpected error occurred',
        "error"
      );
      return false;
    } finally {
      // Always reset operation flag
      setIsResetting(false);
      operationInProgressRef.current = false;
    }
  };
  
  // -------------------------------------------------------------------------
  // Enhanced Actions (UI Friendly Versions)
  // -------------------------------------------------------------------------
  
  /**
   * Enhanced version of applySuggestion with UI improvements
   */
  const handleApplySuggestion = useCallback((index: number) => {
    if (index < 0 || index >= localSuggestions.length) return;
    
    const suggestion = localSuggestions[index];
    const newAppliedState = !suggestion.isApplied;
    
    // Update score manager state if available
    if (scoreManager) {
      scoreManager.applySuggestion(index);
    }
    
    // Update local state
    setLocalSuggestions(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isApplied: newAppliedState
      };
      return updated;
    });
    
    // Call the API with the correct URL format if we have valid data
    if (localResumeId && suggestion.id) {
      if (verbose) console.log(`[Hook] Updating suggestion status: ${suggestion.id} to ${newAppliedState ? 'applied' : 'not applied'}`);
      
      fetch('/api/resumes/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId: localResumeId,
          suggestionId: suggestion.id,
          applied: newAppliedState
        })
      }).catch(error => {
        console.error("[Hook] Error updating suggestion status:", error);
        notify("Failed to update suggestion", undefined, "error");
      });
    } else {
      // Use the core function when API data is not available
      applySuggestion(index);
    }
  }, [localSuggestions, scoreManager, localResumeId, applySuggestion, notify, verbose]);
  
  /**
   * Enhanced version of toggleKeyword with UI improvements
   */
  const handleKeywordApply = useCallback((index: number) => {
    if (index < 0 || index >= localKeywords.length) return;
    
    const keyword = localKeywords[index];
    const newAppliedState = !keyword.applied;
    
    // Update score manager state if available
    if (scoreManager) {
      scoreManager.applyKeyword(index);
    }
    
    // Update local state
    setLocalKeywords(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        applied: newAppliedState
      };
      return updated;
    });
    
    // Call the API with the correct URL format if we have valid data
    if (localResumeId && keyword.text) {
      if (verbose) console.log(`[Hook] Updating keyword status: ${keyword.text} to ${newAppliedState ? 'applied' : 'not applied'}`);
      
      fetch('/api/resumes/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId: localResumeId,
          keywords: [{ 
            text: keyword.text, 
            applied: newAppliedState 
          }]
        })
      }).catch(error => {
        console.error("[Hook] Error updating keyword status:", error);
        notify("Failed to update keyword", undefined, "error");
      });
    } else {
      // Use the core function when API data is not available
      toggleKeyword(index);
    }
  }, [localKeywords, scoreManager, localResumeId, toggleKeyword, notify, verbose]);
  
  /**
   * Enhanced version of resetResume
   */
  const handleReset = useCallback(async (): Promise<boolean> => {
    try {
      return await resetResume();
    } catch (error) {
      console.error('[Hook] Reset error:', error);
      notify("Failed to reset resume", undefined, "error");
      return false;
    }
  }, [resetResume, notify]);
  
  /**
   * Handle content changes in preview
   */
  const handlePreviewContentChange = useCallback((html: string) => {
    if (html === lastProcessedContentRef.current) return;
    
    lastProcessedContentRef.current = html;
    setProcessedHtml(html);
    
    setEditedText(html);
    
    if (scoreManager) {
      scoreManager.updateContent(html);
    }
  }, [scoreManager]);
  
  /**
   * Save resume changes
   */
  /**
 * Handle save operation for resume content
 * Saves content to database and maintains local cache in localStorage
 * 
 * @param content - HTML content of the resume to save
 * @returns Promise resolving to success status
 */
  const handleSave = useCallback(async (content: string): Promise<boolean> => {
    if (isUpdatingContentRef.current) {
      console.log("Save already in progress");
      return false;
    }
    
    isUpdatingContentRef.current = true;
    
    try {
      // Validate content
      if (!content || typeof content !== 'string') {
        throw new Error("Invalid content");
      }
      
      if (content.length < 50) {
        toast.error("Content too short", {
          description: "Resume content must be at least 50 characters long."
        });
        return false;
      }
      
      if (!resumeId) {
        toast.error("No resume ID found", {
          description: "Cannot save resume without an ID."
        });
        return false;
      }
      
      // Get best score
      let currentScore = optimizationScore;
      if (scoreManager?.getCurrentScore) {
        currentScore = scoreManager.getCurrentScore();
      }
      
      // Save to API
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId,
          content,
          userId,
          atsScore: currentScore,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Save failed");
      }
      
      // Update local state
      setEditedText(content);
      setProcessedHtml(content);
      lastProcessedContentRef.current = content;
      
      // Update score manager if available
      if (scoreManager) {
        scoreManager.updateContent(content);
        scoreManager.saveState();
      }
      
      toast.success("Resume saved successfully");
      return true;
    } catch (error) {
      console.error("Save error:", error);
      
      toast.error("Failed to save resume", {
        description: error.message || "Please try again"
      });
      
      return false;
    } finally {
      isUpdatingContentRef.current = false;
    }
  }, [
    resumeId, 
    userId,
    optimizationScore,
    scoreManager
  ]);
  
  // -------------------------------------------------------------------------
  // Advanced Features
  // -------------------------------------------------------------------------
  
  /**
   * Generate metrics for optimization report
   */
  const generateMetrics = useCallback(() => {
    if (!generateOptimizationMetrics) return null;

    try {
      // Get scores
      const initialScore = highestScoreRef.current || optimizationScore || DEFAULT_SCORE;
      const currentScore = scoreManager?.currentScore || localOptimizationScore || initialScore;
      
      // Get applied items
      const appliedSugs = localSuggestions.filter((s, i) => appliedSuggestions.includes(i));
      const appliedKeys = localKeywords.filter(k => appliedKeywords.includes(k.text));

      // Generate metrics
      const metrics = generateOptimizationMetrics(
        initialScore,
        currentScore,
        appliedSugs,
        appliedKeys,
        startTimeRef.current
      );

      setOptimizationMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error("[Hook] Error generating metrics:", error);
      return null;
    }
  }, [
    optimizationScore, 
    localOptimizationScore,
    localSuggestions, 
    localKeywords, 
    appliedSuggestions, 
    appliedKeywords, 
    scoreManager
  ]);
  
  /**
   * Export optimization report to file
   */
  const exportReport = useCallback((format: 'json' | 'csv' | 'markdown' = 'markdown') => {
    try {
      if (scoreManager?.exportReport) {
        scoreManager.exportReport(format);
        return;
      }

      const metrics = generateMetrics();
      if (!metrics || !downloadOptimizationReport || !exportFormats) return;

      let content: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = exportFormats.toJSON(metrics);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'csv':
          content = exportFormats.toCSV(metrics);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'markdown':
        default:
          content = exportFormats.toMarkdown(metrics);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `resume-optimization-${timestamp}.${extension}`;

      downloadOptimizationReport(content, filename, mimeType);
      notify(`Report exported as ${filename}`, undefined, "success");
    } catch (error) {
      console.error("[Hook] Export error:", error);
      notify("Failed to export report", undefined, "error");
    }
  }, [scoreManager, generateMetrics, notify]);
  
  /**
   * Simulate suggestion impact on score
   */
  const simulateSuggestionImpact = useCallback((index: number) => {
    if (!scoreManager?.simulateSuggestionImpact) {
      return {
        newScore: localOptimizationScore,
        pointImpact: 0,
        description: "Impact simulation not available"
      };
    }
    
    return scoreManager.simulateSuggestionImpact(index);
  }, [scoreManager, localOptimizationScore]);
  
  /**
   * Simulate keyword impact on score
   */
  const simulateKeywordImpact = useCallback((index: number) => {
    if (!scoreManager?.simulateKeywordImpact) {
      return {
        newScore: localOptimizationScore,
        pointImpact: 0,
        description: "Impact simulation not available"
      };
    }
    
    return scoreManager.simulateKeywordImpact(index);
  }, [scoreManager, localOptimizationScore]);
  
  // -------------------------------------------------------------------------
  // Helper Functions
  // -------------------------------------------------------------------------
  
  /**
   * Helper function to parse optimized text into structured data
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
  
  // -------------------------------------------------------------------------
  // Lifecycle Effects
  // -------------------------------------------------------------------------
  
  /**
   * Initialize session and clear stale cache
   */
  useEffect(() => {
    const newSessionId = Date.now().toString();
    sessionIdRef.current = newSessionId;
    
    const sessionKey = 'resume_optimizer_session';
    const currentSessionId = localStorage.getItem(sessionKey);
    
    if (!currentSessionId || currentSessionId !== newSessionId) {
      if (verbose) console.log("[Hook] New session:", newSessionId);
      
      // Clear old cache
      const cacheKeys = Object.keys(localStorage);
      const noResumeKeys = cacheKeys.filter(key => key.includes('_no_resume'));
      noResumeKeys.forEach(key => localStorage.removeItem(key));
      
      // Set session ID
      localStorage.setItem(sessionKey, newSessionId);
    }
    
    // Cleanup timeouts
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      if (scoreUpdateTimeoutRef.current) clearTimeout(scoreUpdateTimeoutRef.current);
    };
  }, [verbose]);
  
  /**
   * Reset state when user ID changes
   */
  useEffect(() => {
    if (userId) {
      // Reset loading state
      loadAttemptsRef.current = 0;
      userCheckedRef.current = false;
      toastShownRef.current = false;
      welcomeMessageShownRef.current = false;
      
      // Only clear in new sessions
      const isNewSession = localStorage.getItem('resume_optimizer_session') === sessionIdRef.current;
      if (isNewSession) {
        localStorage.removeItem(`user_${userId}_no_resume`);
      }
    }
  }, [userId]);
  
  /**
   * Safety timeout for loading states
   */
  useEffect(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    if (internalLoading) {
      loadTimeoutRef.current = setTimeout(() => {
        if (verbose) console.log("[Hook] Safety timeout triggered");
        setInternalLoading(false);
        notify("Loading timed out", "Request took too long and was aborted.", "warning");
      }, SAFETY_TIMEOUT);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [internalLoading, notify, verbose]);
  
  /**
   * Initial data loading
   */
  useEffect(() => {
    if (userCheckedRef.current || !loadOnInit || !userId) return;
    
    const userHasNoResume = localStorage.getItem(`user_${userId}_no_resume`) === 'true';
    if (userHasNoResume) {
      if (verbose) console.log("[Hook] User has no resumes (from cache)");
      userCheckedRef.current = true;
      return;
    }
    
    const loadData = async () => {
      setInternalLoading(true);
      try {
        // Use silent mode to avoid showing toasts during initial load
        const result = await loadLatestResume(userId, { silent: true });
        if (!result) {
          localStorage.setItem(`user_${userId}_no_resume`, 'true');
        }
      } catch (error) {
        console.error("[Hook] Initial load error:", error);
        localStorage.setItem(`user_${userId}_no_resume`, 'true');
      } finally {
        setInternalLoading(false);
        userCheckedRef.current = true;
      }
    };
    
    loadData();
  }, [userId, loadOnInit, loadLatestResume, verbose]);
  
  /**
   * Sync optimization score
   */
  useEffect(() => {
    if (!isNaN(optimizationScore) && optimizationScore > 0) {
      if (localOptimizationScore > optimizationScore) {
        if (verbose) console.log(`[Hook] Ignoring score downgrade: ${localOptimizationScore} to ${optimizationScore}`);
        return;
      }
      
      setLocalOptimizationScore(optimizationScore);
      
      if (optimizationScore > highestScoreRef.current) {
        highestScoreRef.current = optimizationScore;
        hasReceivedApiScoreRef.current = true;
      }
    }
  }, [optimizationScore, localOptimizationScore, verbose]);
  
  /**
   * Sync resumeId
   */
  useEffect(() => {
    setLocalResumeId(resumeId);
  }, [resumeId]);
  
  /**
   * Sync suggestions
   */
  useEffect(() => {
    if (suggestions?.length > 0) {
      setLocalSuggestions(suggestions);
    }
  }, [suggestions]);
  
  /**
   * Sync keywords
   */
  useEffect(() => {
    if (keywords?.length > 0) {
      setLocalKeywords(keywords);
    }
  }, [keywords]);
  
  /**
   * Process text content for the editor
   */
  useEffect(() => {
    if (isUpdatingContentRef.current || isLoading || internalLoading) return;
    
    const textToProcess = editedText || optimizedText;
    if (!textToProcess || textToProcess === lastProcessedContentRef.current) return;
    
    const processContent = async () => {
      isUpdatingContentRef.current = true;
      
      try {
        const normalizedText = normalizeHtmlContent(textToProcess);
        const processedContent = prepareOptimizedTextForEditor(normalizedText);
        
        if (processedContent !== lastProcessedContentRef.current) {
          setProcessedHtml(processedContent);
          lastProcessedContentRef.current = processedContent;
          
          if (scoreManager) {
            scoreManager.updateContent(processedContent);
          }
        }
      } catch (error) {
        console.error("[Hook] Text processing error:", error);
        setProcessedHtml(textToProcess);
        lastProcessedContentRef.current = textToProcess;
      } finally {
        isUpdatingContentRef.current = false;
      }
    };
    
    const timeoutId = setTimeout(processContent, 50);
    return () => clearTimeout(timeoutId);
  }, [optimizedText, editedText, isLoading, internalLoading, scoreManager]);
  
  /**
   * Track applied items
   */
  useEffect(() => {
    if (isUpdatingTrackingRef.current) return;
    
    const updateTracking = () => {
      isUpdatingTrackingRef.current = true;
      
      try {
        let updated = false;
        
        // Track suggestions
        if (localSuggestions?.length > 0) {
          const newApplied = localSuggestions
            .map((s, i) => s.isApplied ? i : -1)
            .filter(i => i !== -1);
          
          if (JSON.stringify(newApplied) !== JSON.stringify(appliedSuggestionsRef.current)) {
            appliedSuggestionsRef.current = newApplied;
            setAppliedSuggestions(newApplied);
            updated = true;
          }
        }
        
        // Track keywords
        if (localKeywords?.length > 0) {
          const newApplied = localKeywords
            .filter(k => k.applied)
            .map(k => k.text);
          
          if (JSON.stringify(newApplied) !== JSON.stringify(appliedKeywordsRef.current)) {
            appliedKeywordsRef.current = newApplied;
            setAppliedKeywords(newApplied);
            updated = true;
          }
        }
        
        // Update metrics if needed
        if (updated) {
          generateMetrics();
        }
      } finally {
        isUpdatingTrackingRef.current = false;
      }
    };
    
    const timeoutId = setTimeout(updateTracking, 100);
    return () => clearTimeout(timeoutId);
  }, [localSuggestions, localKeywords, generateMetrics]);
  
  // -------------------------------------------------------------------------
  // Return Complete Hook Interface
  // -------------------------------------------------------------------------
  
  return {
    // Status states
    isUploading,
    isParsing,
    isOptimizing,
    isLoading: isLoading || internalLoading,
    isResetting,
    needsRegeneration,
    isEditing,
    
    // Data states
    selectedFile,
    resumeData,
    optimizedData,
    optimizedText,
    editedText,
    resumeId: localResumeId,
    suggestions: localSuggestions,
    keywords: localKeywords,
    optimizationScore: localOptimizationScore,
    improvementsSummary,
    
    // Enhanced states
    processedHtml,
    appliedSuggestions,
    appliedKeywords,
    optimizationMetrics,
    scoreManager,
    
    // Core actions
    handleFileUpload,
    optimizeResumeData,
    loadLatestResume,
    applyTemplateToResume,
    applySuggestion,
    toggleKeyword,
    resetResume,
    
    // Enhanced actions
    handleApplySuggestion,
    handleKeywordApply,
    handleReset,
    handleSave,
    handlePreviewContentChange,
    generateMetrics,
    exportReport,
    simulateSuggestionImpact,
    simulateKeywordImpact,
    forceScoreUpdate,
    
    // Setters
    setSelectedFile,
    setResumeData,
    setOptimizedData,
    setOptimizedText,
    setEditedText,
    setResumeId: setLocalResumeId,
    setOptimizationScore: setLocalOptimizationScore,
    setSuggestions: setLocalSuggestions,
    setKeywords: setLocalKeywords,
    setIsEditing
  };
}