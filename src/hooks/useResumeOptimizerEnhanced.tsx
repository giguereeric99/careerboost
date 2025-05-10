/**
 * Enhanced Resume Optimizer Hook
 * 
 * This hook extends the base useResumeOptimizer with:
 * - UI notifications and feedback
 * - Improved error handling
 * - Enhanced caching and performance optimizations
 * - Score management and simulation
 * - Additional content processing features
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';
import { useResumeScoreManager } from '@/hooks/useResumeScoreManager';
import { prepareOptimizedTextForEditor } from '@/utils/htmlProcessor';
import { normalizeHtmlContent } from '@/utils/resumeUtils';
import { toast } from 'sonner';
import { generateOptimizationMetrics, downloadOptimizationReport, exportFormats } from '@/services/resumeMetricsExporter';
import { ResumeData, Suggestion } from '@/types/resume';

// Configuration constants
const MAX_LOAD_ATTEMPTS = 2;
const API_TIMEOUT = 10000;
const SAFETY_TIMEOUT = 8000;
const DEFAULT_SCORE = 65;

/**
 * Enhanced Resume Optimizer Hook
 * Extends the base hook with UI feedback and improved features
 * 
 * @param userId - User ID for loading saved resumes
 * @param shouldLoadOnInit - Whether to load resume on initialization (default: true)
 * @returns Enhanced resume optimizer state and methods
 */
export function useResumeOptimizerEnhanced(userId?: string | null, shouldLoadOnInit: boolean = true) {
  // Get the base resume optimizer hook with all required functionality
  const resumeOptimizer = useResumeOptimizer(userId);
  
  // Validate that hook was properly initialized
  if (!resumeOptimizer) {
    console.error("[Hook] Base resume optimizer hook not properly initialized");
    throw new Error("Resume optimizer initialization failed");
  }
  
  // Destructure values from the base hook
  const {
    // Standard data
    optimizedText, 
    editedText, 
    suggestions, 
    keywords, 
    optimizationScore, 
    resumeId,
    resumeData,
    
    // Status states
    isLoading, 
    isUploading, 
    isParsing, 
    isOptimizing,
    isResetting,
    needsRegeneration,
    
    // Actions
    resetResume: baseResetResume,
    toggleKeyword: baseToggleKeyword,
    applySuggestion: baseApplySuggestion,
    loadLatestResume: baseLoadLatestResume,
    handleFileUpload: baseHandleFileUpload,
    optimizeResumeData: baseOptimizeResumeData,
    applyTemplateToResume: baseApplyTemplateToResume,
    
    // Data state
    selectedFile,
    optimizedData,
    improvementsSummary,
    
    // Setters - explicitly destructure all required setters
    setSelectedFile,
    setResumeData,
    setOptimizedData,
    setOptimizedText,
    setEditedText,
    setOptimizationScore: baseSetOptimizationScore,
    setResumeId,
    setSuggestions: baseSetSuggestions,
    setKeywords: baseSetKeywords
  } = resumeOptimizer;
  
  // -------------------------------------------------------------------------
  // Local State
  // -------------------------------------------------------------------------
  
  // UI State
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [abortLoading, setAbortLoading] = useState(false);
  
  // Data tracking state
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  const [appliedKeywords, setAppliedKeywords] = useState<string[]>([]);
  const [optimizationMetrics, setOptimizationMetrics] = useState<any>(null);

  // Local state that can be directly updated by components
  const [localOptimizationScore, setLocalOptimizationScore] = useState<number>(optimizationScore);
  const [localResumeId, setLocalResumeId] = useState<string | null>(resumeId);
  const [localSuggestions, setLocalSuggestions] = useState<any[]>(suggestions || []);
  const [localKeywords, setLocalKeywords] = useState<any[]>(keywords || []);
  
  // -------------------------------------------------------------------------
  // Refs
  // -------------------------------------------------------------------------
  
  // Session and performance tracking refs
  const sessionIdRef = useRef<string>(Date.now().toString());
  const startTimeRef = useRef<Date>(new Date());
  
  // State tracking refs
  const appliedSuggestionsRef = useRef<number[]>([]);
  const appliedKeywordsRef = useRef<string[]>([]);
  const isUpdatingContentRef = useRef(false);
  const isUpdatingTrackingRef = useRef(false);
  const lastProcessedContentRef = useRef<string>('');
  
  // Safety refs
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingAttemptsRef = useRef(0);
  const scoreUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Score tracking refs
  const highestScoreRef = useRef<number>(optimizationScore || DEFAULT_SCORE);
  const hasReceivedApiScoreRef = useRef<boolean>(false);
  
  // User state refs
  const userCheckedRef = useRef<boolean>(false);
  const toastShownRef = useRef<boolean>(false);
  
  // -------------------------------------------------------------------------
  // Score Manager Integration
  // -------------------------------------------------------------------------
  
  // Initialize advanced score manager if available
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
      console.log("[Hook] Score manager updated:", newScore);
      
      // Protect against regression if we've received an API score
      if (hasReceivedApiScoreRef.current && newScore < highestScoreRef.current) {
        console.log(`[Hook] Protecting against score manager downgrade: ${newScore} < ${highestScoreRef.current}`);
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
  // Enhanced API Calls with Improved Error Handling
  // -------------------------------------------------------------------------
  
  /**
   * Load suggestions for a resume with proper API format and error handling
   * 
   * @param resumeId - ID of the resume to load suggestions for
   * @returns Array of suggestions or empty array if error
   */
  const loadSuggestions = useCallback(async (resumeId: string) => {
    try {
      console.log(`[Hook] Loading suggestions for resume ${resumeId}`);
      
      // Use the correct URL format that matches your API
      const response = await fetch(`/api/resumes/suggestions?resumeId=${resumeId}`);
      
      if (!response.ok) {
        console.warn(`[Hook] Failed to load suggestions: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      // Check the response structure according to your API
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.log("[Hook] No suggestions found or invalid format");
        return [];
      }
      
      console.log(`[Hook] Successfully loaded ${data.data.length} suggestions`);
      return data.data;
    } catch (error) {
      console.error("[Hook] Error loading suggestions:", error);
      return [];
    }
  }, []);
  
  /**
   * Load keywords for a resume with proper API format and error handling
   * 
   * @param resumeId - ID of the resume to load keywords for
   * @returns Array of keywords or empty array if error
   */
  const loadKeywords = useCallback(async (resumeId: string) => {
    try {
      console.log(`[Hook] Loading keywords for resume ${resumeId}`);
      
      // Use the correct URL format that matches your API
      const response = await fetch(`/api/resumes/keywords?resumeId=${resumeId}`);
      
      if (!response.ok) {
        console.warn(`[Hook] Failed to load keywords: ${response.status} ${response.statusText}`);
        return [];
      }
      
      const data = await response.json();
      
      // Check the response structure according to your API
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.log("[Hook] No keywords found or invalid format");
        return [];
      }
      
      console.log(`[Hook] Successfully loaded ${data.data.length} keywords`);
      return data.data;
    } catch (error) {
      console.error("[Hook] Error loading keywords:", error);
      return [];
    }
  }, []);
  
  // -------------------------------------------------------------------------
  // Enhanced Version of Base Hook Functions with UI Feedback
  // -------------------------------------------------------------------------
  
  /**
   * Enhanced version of handleFileUpload with UI notifications
   * 
   * @param file - File to upload
   * @returns Parsed resume data or null on failure
   */
  const handleFileUpload = async (file: File) => {
    try {
      // Call base hook function
      const result = await baseHandleFileUpload(file);
      
      if (result) {
        // Success notification
        toast.message(
          "Resume uploaded successfully", {
          description: "Your resume has been analyzed and is ready for optimization."
        });
      }
      
      return result;
    } catch (error: any) {
      // Error notification
      toast.error(
        "Error processing resume", {
        description: error.message || "An unexpected error occurred while processing your resume."
      });
      
      return null;
    }
  };
  
  /**
   * Enhanced version of optimizeResumeData with UI notifications
   * 
   * @param data - Resume data to optimize
   * @returns Optimization results or null on failure
   */
  const optimizeResumeData = async (data?: ResumeData) => {
    try {
      // Call base hook function
      const result = await baseOptimizeResumeData(data);
      
      if (result) {
        // Success notification
        toast.message(
          "Resume optimized", {
          description: `Your resume has been optimized with an ATS score of ${result.atsScore}/100.`
        });
      }
      
      return result;
    } catch (error: any) {
      // Error notification
      toast.error(
        "Error optimizing resume", {
        description: error.message || "An unexpected error occurred during optimization."
      });
      
      return null;
    }
  };
  
  /**
   * Enhanced version of loadLatestResume with UI notifications,
   * API format corrections, and improved error handling
   * 
   * @param userId - ID of the user to load resume for
   * @param skipToast - Whether to skip showing toast notifications
   * @returns Resume data or null if not found
   */
  const enhancedLoadLatestResume = useCallback(async (userId: string, skipToast: boolean = false) => {
    // Check cache first
    const userHasNoResume = localStorage.getItem(`user_${userId}_no_resume`) === 'true';
    if (userHasNoResume) {
      console.log("[Hook] User has no resumes (from cache)");
      return null;
    }

    // Add a loading flag check to prevent multiple simultaneous calls
    if (internalLoading) {
      console.log("[Hook] Already loading resume, skipping duplicate request");
      return null;
    }

    // Check attempts
    if (loadingAttemptsRef.current >= MAX_LOAD_ATTEMPTS) {
      console.log(`[Hook] Max load attempts (${MAX_LOAD_ATTEMPTS}) reached`);
      return null;
    }

    // Increment attempts
    loadingAttemptsRef.current += 1;
    
    // Check abort flag
    if (abortLoading) {
      console.log("[Hook] Loading aborted");
      return null;
    }
    
    // Set loading state
    setInternalLoading(true);
    
    // Create timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      console.log(`[Hook] Loading resume for user ${userId}`);
      
      // Call base hook function with silent option to avoid double toasts
      const resumeData = await baseLoadLatestResume(userId, { silent: true });
      clearTimeout(timeoutId);
      
      // Handle no resume
      if (!resumeData) {
        console.log("[Hook] No resume found");
        localStorage.setItem(`user_${userId}_no_resume`, 'true');
        
        // Only show welcome message if we're not skipping toasts
        if (!skipToast && !toastShownRef.current) {
          toastShownRef.current = true;
          toast.message(
            "Welcome to CareerBoost", {
            description: "Upload your resume to get started with AI optimization."
          });
        }
        
        return null;
      }

      // Reset attempts on success
      loadingAttemptsRef.current = 0;

      // Update resume data if not already set
      if (typeof setResumeData === 'function' && (!resumeData || !resumeData.parsed)) {
        setResumeData(resumeData);
      }
      
      // Update other state
      setOptimizedData(resumeData);
      setOptimizedText(resumeData.optimized_text || resumeData.optimizedText || "");
      setLocalResumeId(resumeData.id);
      setResumeId(resumeData.id);
      
      // Load related data using the enhanced API-compatible functions
      if (resumeData.id) {
        try {
          // Load suggestions with proper API format
          const suggestionsResult = await loadSuggestions(resumeData.id);
          if (suggestionsResult?.length > 0) {
            setSuggestions(suggestionsResult);
            
            // Set applied suggestions
            const appliedSugs = suggestionsResult
              .filter(s => s.is_applied || s.isApplied)
              .map((_, i) => i) || [];
            
            setAppliedSuggestions(appliedSugs);
          }
        } catch (error) {
          console.warn("[Hook] Error loading suggestions, continuing:", error);
        }
        
        try {
          // Load keywords with proper API format
          const keywordsResult = await loadKeywords(resumeData.id);
          if (keywordsResult?.length > 0) {
            setKeywords(keywordsResult);
            
            // Set applied keywords
            const appliedKeys = keywordsResult
              .filter(k => k.is_applied || k.applied)
              .map(k => k.keyword || k.text) || [];
            
            setAppliedKeywords(appliedKeys);
          }
        } catch (error) {
          console.warn("[Hook] Error loading keywords, continuing:", error);
        }
        
        // Set score if available
        if (resumeData.ats_score || resumeData.atsScore) {
          const score = resumeData.ats_score || resumeData.atsScore;
          forceScoreUpdate(score);
        }
      }

      // Show success toast if not skipped and not already shown
      if (!skipToast && !toastShownRef.current) {
        toastShownRef.current = true;
        toast.message(
          "Resume loaded", {
          description: "Your previous optimized resume has been loaded."
        });
      }

      return resumeData;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle abort error
      if (error.name === 'AbortError') {
        console.log("[Hook] Resume load timeout");
        setAbortLoading(true);
        toast.error("Loading timed out");
      } else {
        console.error("[Hook] Error loading resume:", error);
        
        // Only show error toast if not skipping toasts
        if (!skipToast) {
          toast.error(
            "Error loading resume", {
            description: error.message || "An unexpected error occurred while loading your resume."
          });
        }
      }
      
      return null;
    } finally {
      setInternalLoading(false);
    }
  }, [
    baseLoadLatestResume,
    setResumeData,
    setOptimizedData,
    setOptimizedText,
    setResumeId,
    loadSuggestions,
    loadKeywords,
    abortLoading,
    forceScoreUpdate,
    internalLoading,
    setSuggestions,
    setKeywords
  ]);
  
  /**
   * Enhanced version of applyTemplateToResume with UI notifications
   * 
   * @param templateId - ID of the template to apply
   */
  const applyTemplateToResume = useCallback((templateId: string) => {
    // Call base hook function
    baseApplyTemplateToResume(templateId);
    
    // Success notification
    toast.message(
      "Template applied", {
      description: `The ${templateId} template has been applied to your resume.`
    });
  }, [baseApplyTemplateToResume]);
  
  /**
   * Apply suggestion with UI notifications and proper API format
   * 
   * @param index - Index of the suggestion to apply
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
      console.log(`[Hook] Updating suggestion status: ${suggestion.id} to ${newAppliedState ? 'applied' : 'not applied'}`);
      
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
        toast.error("Failed to update suggestion");
      });
    } else {
      // Use the base function when API data is not available
      baseApplySuggestion(index);
    }
    
    // Success notification
    toast.message(
      suggestion.isApplied ? "Suggestion removed" : "Suggestion applied", {
      description: suggestion.isApplied 
        ? "The suggestion has been removed from your resume."
        : "The suggestion has been applied to your resume."
    });
  }, [localSuggestions, scoreManager, localResumeId, baseApplySuggestion]);
  
  /**
   * Apply keyword with UI notifications and proper API format
   * 
   * @param index - Index of the keyword to apply
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
      console.log(`[Hook] Updating keyword status: ${keyword.text} to ${newAppliedState ? 'applied' : 'not applied'}`);
      
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
        toast.error("Failed to update keyword");
      });
    } else {
      // Use the base function when API data is not available
      baseToggleKeyword(index);
    }
    
    // Success notification
    toast.message(
      newAppliedState ? "Keyword added" : "Keyword removed", {
      description: `"${keyword.text}" has been ${newAppliedState ? 'added to' : 'removed from'} your resume.`
    });
  }, [localKeywords, scoreManager, localResumeId, baseToggleKeyword]);
  
  /**
   * Reset resume with UI notifications
   * 
   * @returns Promise resolving to true if successful, false otherwise
   */
  const handleReset = useCallback(async (): Promise<boolean> => {
    try {
      // Call base hook function
      const resetResult = await baseResetResume();
      
      if (resetResult) {
        // Reset suggestions
        setLocalSuggestions(prev => prev.map(s => ({...s, isApplied: false})));
        
        // Reset keywords
        setLocalKeywords(prev => prev.map(k => ({...k, applied: false})));
        
        // Reset score manager
        if (scoreManager?.resetAllChanges) {
          scoreManager.resetAllChanges();
        }
        
        // Success notification
        toast.success('Resume reset to original optimized version');
      }
      
      return resetResult;
    } catch (error) {
      console.error('[Hook] Reset error:', error);
      
      // Error notification
      toast.error("Failed to reset resume");
      
      return false;
    }
  }, [baseResetResume, scoreManager]);
  
  // -------------------------------------------------------------------------
  // Additional Enhanced Features
  // -------------------------------------------------------------------------
  
  /**
   * Force update score across all components
   * 
   * @param scoreValue - New score value to set
   */
  const forceScoreUpdate = useCallback((scoreValue: number) => {
    if (!scoreValue || isNaN(scoreValue) || scoreValue <= 0 || scoreValue > 100) {
      console.warn("[Hook] Invalid score value:", scoreValue);
      return;
    }
    
    console.log(`[Hook] Updating score to: ${scoreValue}`);
    
    // Mark that we've received a valid API score
    hasReceivedApiScoreRef.current = true;
    
    // Update highest score if needed
    if (scoreValue > highestScoreRef.current) {
      highestScoreRef.current = scoreValue;
    }
    
    // Update local state
    setLocalOptimizationScore(scoreValue);
    
    // Update base optimizer
    if (baseSetOptimizationScore) {
      baseSetOptimizationScore(scoreValue);
    }
    
    // Update score manager
    if (scoreManager && typeof scoreManager.updateBaseScore === 'function') {
      scoreManager.updateBaseScore(scoreValue);
    }
  }, [baseSetOptimizationScore, scoreManager]);
  
  /**
   * Generate metrics for optimization
   * 
   * @returns Generated metrics object or null if generation failed
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
   * Export optimization report
   * 
   * @param format - Format to export report in (json, csv, markdown)
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
      toast.success(`Report exported as ${filename}`);
    } catch (error) {
      console.error("[Hook] Export error:", error);
      toast.error("Failed to export report");
    }
  }, [scoreManager, generateMetrics]);
  
  /**
   * Handle content changes in preview
   * 
   * @param html - HTML content from the editor
   */
  const handlePreviewContentChange = useCallback((html: string) => {
    if (html === lastProcessedContentRef.current) return;
    
    lastProcessedContentRef.current = html;
    setProcessedHtml(html);
    
    if (setEditedText) {
      setEditedText(html);
    }
    
    if (scoreManager) {
      scoreManager.updateContent(html);
    }
  }, [setEditedText, scoreManager]);
  
  /**
   * Save resume changes
   * 
   * @param content - Resume content to save
   * @returns Promise resolving to true if save was successful, false otherwise
   */
  const handleSave = useCallback(async (content: string): Promise<boolean> => {
    if (isUpdatingContentRef.current) {
      console.log("[Hook] Save already in progress");
      return false;
    }
    
    try {
      // Validate
      if (!content || typeof content !== 'string') {
        throw new Error("Invalid content");
      }
      
      if (content.length < 50) {
        toast.error("Content too short");
        return false;
      }
      
      if (!localResumeId) {
        toast.error("No resume ID found");
        return false;
      }
      
      // Get best score
      let currentScore = highestScoreRef.current;
      
      if (scoreManager?.getCurrentScore) {
        const managerScore = scoreManager.getCurrentScore();
        if (managerScore > currentScore) {
          currentScore = managerScore;
        }
      } else if (localOptimizationScore > currentScore) {
        currentScore = localOptimizationScore;
      }
      
      // Save to API
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: localResumeId,
          content,
          userId,
          atsScore: currentScore,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Save failed");
      }
      
      // Update state
      if (setEditedText) {
        setEditedText(content);
      }
      
      setProcessedHtml(content);
      lastProcessedContentRef.current = content;
      
      if (scoreManager) {
        scoreManager.updateContent(content);
        scoreManager.saveState();
      }
      
      toast.success("Resume saved");
      return true;
    } catch (error: any) {
      console.error("[Hook] Save error:", error);
      toast.error("Save failed: " + (error.message || "Unknown error"));
      return false;
    }
  }, [localResumeId, userId, setEditedText, scoreManager, localOptimizationScore]);
  
  /**
   * Simulate suggestion impact
   * 
   * @param index - Index of the suggestion to simulate
   * @returns Impact simulation result
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
   * Simulate keyword impact
   * 
   * @param index - Index of the keyword to simulate
   * @returns Impact simulation result
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
  // Effects for State Management
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
      console.log("[Hook] New session:", newSessionId);
      
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
      if (scoreUpdateTimeoutRef.current) clearTimeout(scoreUpdateTimeoutRef.current);
    };
  }, []);
  
  /**
   * Clear cache for user changes and reset UI flags
   */
  useEffect(() => {
    if (userId) {
      loadingAttemptsRef.current = 0;
      userCheckedRef.current = false;
      toastShownRef.current = false;  // Reset toast shown flag when user changes
      
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
        console.log("[Hook] Safety timeout triggered");
        setInternalLoading(false);
        toast.warning("Loading timed out");
      }, SAFETY_TIMEOUT);
    }

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [internalLoading]);
  
  /**
   * Initial data loading
   */
  useEffect(() => {
    if (userCheckedRef.current || !shouldLoadOnInit || !userId) return;
    
    const userHasNoResume = localStorage.getItem(`user_${userId}_no_resume`) === 'true';
    if (userHasNoResume) {
      console.log("[Hook] User has no resumes (from cache)");
      userCheckedRef.current = true;
      return;
    }
    
    const loadData = async () => {
      setInternalLoading(true);
      try {
        // Pass skipToast=true to avoid showing toasts during initial load
        const result = await enhancedLoadLatestResume(userId, true);
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
  }, [userId, shouldLoadOnInit, enhancedLoadLatestResume]);
  
  /**
   * Sync score with protection against regression
   */
  useEffect(() => {
    if (!isNaN(optimizationScore) && optimizationScore > 0) {
      if (localOptimizationScore > optimizationScore) {
        console.log(`[Hook] Ignoring score downgrade: ${localOptimizationScore} to ${optimizationScore}`);
        return;
      }
      
      setLocalOptimizationScore(optimizationScore);
      
      if (optimizationScore > highestScoreRef.current) {
        highestScoreRef.current = optimizationScore;
        hasReceivedApiScoreRef.current = true;
      }
    }
  }, [optimizationScore, localOptimizationScore]);
  
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
   * Process text content
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
  // Set up local states for components that might use them
  // -------------------------------------------------------------------------
  
  /**
   * Set suggestions with validation
   */
  const setSuggestions = useCallback((newSuggestions: any[]) => {
    if (!newSuggestions || !Array.isArray(newSuggestions)) {
      console.warn("[Hook] Invalid suggestions format");
      return;
    }
    
    try {
      // Format suggestions
      const formattedSuggestions = newSuggestions.map(suggestion => ({
        id: suggestion.id || String(Math.random()),
        type: suggestion.type || 'general',
        text: suggestion.text || '',
        impact: suggestion.impact || 'This suggestion may improve your resume.',
        isApplied: suggestion.isApplied || suggestion.is_applied || false
      }));
      
      // Update local state
      setLocalSuggestions(formattedSuggestions);
      
      // Update base state if setter is available
      if (baseSetSuggestions && typeof baseSetSuggestions === 'function') {
        baseSetSuggestions(formattedSuggestions);
      }
    } catch (error) {
      console.error("[Hook] Error setting suggestions:", error);
    }
  }, [baseSetSuggestions]);
  
  /**
   * Set keywords with validation
   */
  const setKeywords = useCallback((newKeywords: any[]) => {
    if (!newKeywords || !Array.isArray(newKeywords)) {
      console.warn("[Hook] Invalid keywords format");
      return;
    }
    
    try {
      // Format keywords
      const formattedKeywords = newKeywords.map(keyword => {
        if (typeof keyword === 'string') {
          return { text: keyword, applied: false };
        }
        
        return {
          text: keyword.text || keyword.keyword || '',
          applied: keyword.applied || keyword.is_applied || false,
          impact: keyword.impact || 0.5,
          category: keyword.category || 'general'
        };
      });
      
      // Update local state
      setLocalKeywords(formattedKeywords);
      
      // Update base state if setter is available
      if (baseSetKeywords && typeof baseSetKeywords === 'function') {
        baseSetKeywords(formattedKeywords);
      }
    } catch (error) {
      console.error("[Hook] Error setting keywords:", error);
    }
  }, [baseSetKeywords]);
  
  // -------------------------------------------------------------------------
  // Return Enhanced Hook
  // -------------------------------------------------------------------------
  
  return {
    ...resumeOptimizer,  // Include all base functionality
    
    // Override with enhanced functions
    handleFileUpload,
    optimizeResumeData,
    applyTemplateToResume,
    // Rename loadLatestResume to make it clear this is the enhanced version
    loadLatestResume: enhancedLoadLatestResume,
    
    // Enhanced UI interactions
    handleReset,
    handleApplySuggestion,
    handleKeywordApply,
    handleSave,
    handlePreviewContentChange,
    
    // Additional state
    processedHtml,
    isEditing,
    setIsEditing,
    appliedSuggestions,
    appliedKeywords,
    optimizationMetrics,
    scoreManager,
    
    // Local state overrides
    suggestions: localSuggestions,
    keywords: localKeywords,
    optimizationScore: localOptimizationScore,
    resumeId: localResumeId,
    
    // Combined loading state
    isLoading: isLoading || internalLoading,
    
    // State setters
    setOptimizationScore: setLocalOptimizationScore,
    setResumeId: setLocalResumeId,
    setSuggestions,
    setKeywords,
    
    // Additional utility functions
    generateMetrics,
    exportReport,
    forceScoreUpdate,
    
    // Simulation functions
    simulateSuggestionImpact,
    simulateKeywordImpact,
  };
}