/**
 * useResumeScoreManager Hook
 * 
 * Custom React hook for managing resume optimization scores with real-time feedback.
 * This hook provides a clean React interface to the ResumeScoreService.
 * 
 * Features:
 * - Real-time score updates when suggestions or keywords are applied
 * - Improved score calculation and state synchronization
 * - Clean separation of UI state and business logic
 * - Cache mechanism to prevent unnecessary recalculations
 * - Enhanced event propagation for score changes
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ResumeScoreService } from '@/services/resumeScoreService';
import { 
  Suggestion, 
  Keyword, 
  ScoreBreakdown,
  ImpactLevel,
  getImpactLevel
} from '@/services/resumeScoreLogic';
import { 
  generateOptimizationMetrics,
  saveOptimizationState,
  loadOptimizationState,
  exportFormats,
  downloadOptimizationReport,
  OptimizationMetrics
} from '@/services/resumeMetricsExporter';

/**
 * Props for the score manager hook
 * Defines the required and optional inputs for the hook
 */
interface ResumeScoreManagerProps {
  initialScore: number;             // Base ATS score from initial AI assessment
  resumeContent: string;            // Current HTML content of the resume
  initialSuggestions: Suggestion[]; // Available suggestions from AI
  initialKeywords: Keyword[];       // Available keywords from AI
  resumeId?: string;                // Optional resume ID for persistence
  onScoreChange?: (score: number) => void; // Optional callback when score changes
}

/**
 * Return type of the hook
 * Defines the complete API exposed by the hook
 */
interface ResumeScoreManagerResult {
  // Current state
  currentScore: number;             // Current calculated ATS score
  scoreBreakdown: ScoreBreakdown | null; // Detailed score breakdown
  suggestions: Suggestion[];        // Current suggestions with state
  keywords: Keyword[];              // Current keywords with state
  isApplyingChanges: boolean;       // Whether changes are being applied
  metrics: OptimizationMetrics | null; // Optimization metrics for reporting
  
  // Actions
  applySuggestion: (index: number) => void; // Apply/unapply a suggestion
  applyKeyword: (index: number) => void;    // Apply/unapply a keyword
  updateContent: (newContent: string) => void; // Update resume content
  resetAllChanges: () => void;      // Reset all to initial state
  applyAllChanges: () => void;      // Apply all suggestions and keywords
  
  // Impact simulation
  simulateSuggestionImpact: (index: number) => { 
    newScore: number; 
    pointImpact: number; 
    description: string;
  };
  simulateKeywordImpact: (index: number) => {
    newScore: number;
    pointImpact: number;
    description: string;
  };
  
  // Export and reporting
  exportReport: (format: 'json' | 'csv' | 'markdown') => void;
  getSuggestionImpact: (suggestion: Suggestion, index: number) => { 
    points: number; 
    level: ImpactLevel;
    description: string;
  };
  getKeywordImpact: (keyword: Keyword, index: number) => { 
    points: number;
    level: ImpactLevel;
    description: string;
  };
  saveState: () => boolean;
}

/**
 * Custom hook that manages resume score, suggestions, and keywords
 * with real-time updates as changes are applied.
 * Enhanced with improved score calculation and update propagation.
 * 
 * @param props - Configuration options for the score manager
 * @returns An object containing the current state and functions to manipulate it
 */
export function useResumeScoreManager({
  initialScore,
  resumeContent,
  initialSuggestions,
  initialKeywords,
  resumeId,
  onScoreChange
}: ResumeScoreManagerProps): ResumeScoreManagerResult {
  // =========================================================================
  // State Management
  // =========================================================================
  
  // Primary state values - These are the main values tracked by the hook
  const [currentScore, setCurrentScore] = useState<number>(initialScore);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isApplyingChanges, setIsApplyingChanges] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  
  // =========================================================================
  // Refs for Performance Optimization and State Tracking
  // =========================================================================
  
  // Time tracking - Used for metrics calculation
  const startTimeRef = useRef<Date>(new Date());
  
  // Debouncing refs - Used to prevent too frequent updates
  const scoreChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Service and initialization refs - Track the score service instance
  const scoreServiceRef = useRef<ResumeScoreService | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const lastScoreUpdateRef = useRef<number>(initialScore);
  
  // Dependency tracking refs - Used to detect significant changes to inputs
  const prevInitialScoreRef = useRef<number>(initialScore);
  const prevResumeContentRef = useRef<string>(resumeContent);
  const prevSuggestionsRef = useRef<Suggestion[]>(initialSuggestions);
  const prevKeywordsRef = useRef<Keyword[]>(initialKeywords);
  
  // Update tracking refs - Used to prevent recursive updates
  const isUpdatingRef = useRef<boolean>(false);
  const pendingScoreUpdatesRef = useRef<boolean>(false);
  
  // =========================================================================
  // Score Change Notification
  // =========================================================================
  
  /**
   * Forward score changes to parent with enhanced debouncing
   * This ensures all score updates are properly propagated without causing
   * excessive re-renders or update loops
   * 
   * @param score - The new score value to propagate
   */
  const notifyScoreChange = useCallback((score: number) => {
    // Skip if score hasn't actually changed to prevent unnecessary updates
    if (score === lastScoreUpdateRef.current) {
      return;
    }
    
    // Update last score value for comparison in future calls
    lastScoreUpdateRef.current = score;
    
    // Update internal state immediately for fast UI feedback
    setCurrentScore(score);
    
    // Debounce external callback to prevent rapid multiple updates
    if (scoreChangeTimeoutRef.current) {
      clearTimeout(scoreChangeTimeoutRef.current);
    }
    
    // Only call external callback if provided
    if (onScoreChange) {
      scoreChangeTimeoutRef.current = setTimeout(() => {
        console.log("Score manager notifying parent of score change:", score);
        onScoreChange(score);
      }, 50); // Short timeout to batch updates
    }
  }, [onScoreChange]);
  
  // =========================================================================
  // Dependency Change Detection
  // =========================================================================
  
  /**
   * Check if dependencies have changed significantly enough to require reinitialization
   * This prevents unnecessary re-renders and potential infinite loops by only
   * triggering updates when inputs have meaningfully changed
   * 
   * @returns Boolean indicating if important dependencies have changed
   */
  const haveDependenciesChanged = useCallback(() => {
    // Check if initial score has changed (important for initialization)
    if (prevInitialScoreRef.current !== initialScore) {
      return true;
    }
    
    // Check if content length has changed significantly
    // This is a quick way to detect content changes without deep comparison
    // Using a threshold of 10 characters to avoid trivial changes
    if (Math.abs(prevResumeContentRef.current.length - resumeContent.length) > 10) {
      return true;
    }
    
    // Check if suggestions or keywords count has changed
    // This indicates new data has been loaded or significant changes made
    if (prevSuggestionsRef.current.length !== initialSuggestions.length ||
        prevKeywordsRef.current.length !== initialKeywords.length) {
      return true;
    }
    
    // If no significant changes detected, return false
    return false;
  }, [initialScore, initialSuggestions, initialKeywords, resumeContent]);
  
  // =========================================================================
  // Score Service Initialization and Updates
  // =========================================================================
  
  /**
   * Initialize the score service with current values
   * This is the core setup function that creates and configures the score service
   * with the latest values from state and props
   */
  const initializeScoreService = useCallback(() => {
    // Prevent concurrent initialization to avoid race conditions
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    try {
      // Use the current score value from state instead of the initial prop
      // This ensures API-provided scores are properly used (e.g., 78 instead of default 65)
      const scoreToUse = currentScore || initialScore;
      
      console.log("Initializing score service with score:", scoreToUse, "instead of default:", initialScore);
      
      // Update reference values to track changes for future comparisons
      prevInitialScoreRef.current = initialScore;
      prevResumeContentRef.current = resumeContent;
      prevSuggestionsRef.current = initialSuggestions;
      prevKeywordsRef.current = initialKeywords;
      
      // Create score service with configuration and debounced callback
      scoreServiceRef.current = new ResumeScoreService(
        scoreToUse,  // Use actual current score instead of initial value
        resumeContent,
        initialSuggestions,
        initialKeywords,
        { 
          onScoreChange: (score) => {
            // Forward score change notifications through our handler
            notifyScoreChange(score);
          },
          debug: true // Enable debug mode for better logging
        }
      );
      
      // Get initial score breakdown and update state
      if (scoreServiceRef.current) {
        const breakdown = scoreServiceRef.current.getScoreBreakdown();
        setScoreBreakdown(breakdown);
        
        // Ensure UI correctly shows the initial score
        notifyScoreChange(scoreToUse);
      }
      
      // Mark as initialized to avoid unnecessary reinitializations
      isInitializedRef.current = true;
      
      // Initialize UI state with data from service
      setSuggestions(initialSuggestions);
      setKeywords(initialKeywords);
      
    } catch (error) {
      console.error("Error initializing score service:", error);
    } finally {
      // Always reset the update flag, even if an error occurs
      isUpdatingRef.current = false;
    }
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords, notifyScoreChange, currentScore]);
  
  /**
   * Safe wrapper for updating service that prevents loops
   * This function handles updating the service when dependencies change
   * without requiring a complete reinitialization
   */
  const safeUpdateService = useCallback(() => {
    // Prevent concurrent updates and check service exists
    if (isUpdatingRef.current || !scoreServiceRef.current) return;
    isUpdatingRef.current = true;
    
    try {
      console.log("Safely updating score service");
      
      // Use the current score from state instead of the initial prop
      // This ensures the latest score value is maintained during updates
      const scoreToUse = currentScore || initialScore;
      console.log("Using score for update:", scoreToUse);
      
      // Update reference values for future change detection
      prevInitialScoreRef.current = initialScore;
      prevResumeContentRef.current = resumeContent;
      prevSuggestionsRef.current = initialSuggestions;
      prevKeywordsRef.current = initialKeywords;
      
      // Update service state without full reinitialization
      // This is more efficient than recreating the service
      scoreServiceRef.current.updateState(
        scoreToUse,  // Use current score instead of initialScore
        resumeContent,
        initialSuggestions,
        initialKeywords
      );
      
      // Update state from the service to ensure UI and state are in sync
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Ensure the score is properly propagated
      notifyScoreChange(scoreToUse);
      
      // Update UI state with new data
      setSuggestions(initialSuggestions);
      setKeywords(initialKeywords);
      
    } catch (error) {
      console.error("Error updating score service:", error);
    } finally {
      // Always reset the update flag, even if an error occurs
      isUpdatingRef.current = false;
    }
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords, notifyScoreChange, currentScore]);
  
  // =========================================================================
  // Lifecycle Effect - Initialization & Dependency Changes
  // =========================================================================
  
  /**
   * Initialize on mount and react to significant dependency changes
   * This effect is responsible for initializing and updating the score service
   * based on prop changes throughout the component lifecycle
   */
  useEffect(() => {
    // Skip effect if an update is already in progress to prevent loops
    if (isUpdatingRef.current) return;
    
    // Initialize on first run
    if (!isInitializedRef.current) {
      initializeScoreService();
      return;
    }
    
    // Check if important dependencies have changed
    if (haveDependenciesChanged()) {
      safeUpdateService();
    }
    
    // Clean up on unmount
    return () => {
      if (scoreChangeTimeoutRef.current) {
        clearTimeout(scoreChangeTimeoutRef.current);
      }
    };
  }, [
    initializeScoreService, 
    safeUpdateService, 
    haveDependenciesChanged
  ]);

  // =========================================================================
  // Direct Score Update Methods (NEW)
  // =========================================================================
  
  /**
   * Update the base score directly
   * This method is used when receiving a score from API to ensure it takes priority
   * 
   * @param score - The new base score to use
   */
  const updateBaseScore = useCallback((score: number) => {
    // Validate input
    if (!score || isNaN(score) || score < 0 || score > 100) {
      console.warn("Invalid score value for updateBaseScore:", score);
      return;
    }
    
    console.log("DIRECT BASE SCORE UPDATE:", score);
    
    // Store the direct update score for initialization/update methods to use
    directScoreUpdateRef.current = score;
    
    // If score service is already initialized, update it directly
    if (scoreServiceRef.current) {
      // Use the service's updateBaseScore method if available
      if (typeof scoreServiceRef.current.updateBaseScore === 'function') {
        console.log("Using service.updateBaseScore() method");
        scoreServiceRef.current.updateBaseScore(score);
      } else {
        // Otherwise, update using updateState method
        console.log("Using service.updateState() method");
        scoreServiceRef.current.updateState(
          score,
          resumeContent,
          initialSuggestions,
          initialKeywords
        );
      }
      
      // Update state from the service to ensure UI consistency
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Notify about the score change
      notifyScoreChange(score);
      
      // Clear the direct update ref after use
      directScoreUpdateRef.current = null;
    } else {
      // If service not initialized yet, just update state
      // The direct update ref will be used during initialization
      console.log("Service not initialized yet, updating state directly");
      notifyScoreChange(score);
    }
    
    // Generate new metrics with the updated score
    pendingScoreUpdatesRef.current = true;
    setTimeout(() => {
      if (pendingScoreUpdatesRef.current) {
        generateMetrics();
        pendingScoreUpdatesRef.current = false;
      }
    }, 50);
  }, [resumeContent, initialSuggestions, initialKeywords, notifyScoreChange, generateMetrics]);
  
  /**
   * Get the current base score
   * Provides access to the underlying base score from the score service
   * 
   * @returns The current base score from the service, or current state if service not available
   */
  const getBaseScore = useCallback((): number => {
    if (scoreServiceRef.current && typeof scoreServiceRef.current.getBaseScore === 'function') {
      return scoreServiceRef.current.getBaseScore();
    }
    return currentScore;
  }, [currentScore]);
  
  // =========================================================================
  // Metrics Generation
  // =========================================================================
  
  /**
   * Generate metrics with error handling
   * Calculates and updates optimization metrics for reporting and analytics
   * 
   * @returns The newly generated metrics or null if generation fails
   */
  const generateMetrics = useCallback(() => {
    // Validate required dependencies and service
    if (!generateOptimizationMetrics || !scoreServiceRef.current) return null;

    try {
      // Get current data from service for consistent metrics calculation
      const service = scoreServiceRef.current;
      const initialScoreVal = service.getBaseScore();
      const currentScoreVal = service.getCurrentScore();
      const appliedSugs = service.getAppliedSuggestions();
      const appliedKeys = service.getAppliedKeywords();

      // Generate metrics using the metrics exporter service
      const newMetrics = generateOptimizationMetrics(
        initialScoreVal,
        currentScoreVal,
        appliedSugs,
        appliedKeys,
        startTimeRef.current
      );

      // Log metrics for debugging
      console.log("Generated optimization metrics:", {
        initialScore: initialScoreVal,
        currentScore: currentScoreVal,
        improvement: currentScoreVal - initialScoreVal,
        appliedSuggestions: appliedSugs.length,
        appliedKeywords: appliedKeys.length
      });

      // Update metrics state with new data
      setMetrics(newMetrics);
      return newMetrics;
    } catch (error) {
      console.error("Error generating metrics:", error);
      return null;
    }
  }, []);
  
  // =========================================================================
  // Core Score Manipulation Functions
  // =========================================================================
  
  /**
   * Apply or unapply a suggestion
   * Updates both the service state and UI state when a suggestion is toggled
   * 
   * @param index - Index of the suggestion in the suggestions array
   */
  const applySuggestion = useCallback((index: number) => {
    // Validate service exists
    if (!scoreServiceRef.current) return;
    
    try {
      console.log(`Applying suggestion at index ${index}`);
      
      // Apply suggestion in the service - this calculates the score impact
      const newScore = scoreServiceRef.current.applySuggestion(index);
      
      // Update state from the service to ensure UI consistency
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update suggestions array for UI with immutable update pattern
      // This ensures React properly re-renders the affected components
      setSuggestions(prev => {
        const updated = [...prev];
        if (index >= 0 && index < updated.length) {
          updated[index] = {
            ...updated[index],
            isApplied: !updated[index].isApplied
          };
        }
        return updated;
      });
      
      // Regenerate metrics after change with debouncing
      // This prevents excessive metric calculations for rapid changes
      pendingScoreUpdatesRef.current = true;
      setTimeout(() => {
        if (pendingScoreUpdatesRef.current) {
          generateMetrics();
          pendingScoreUpdatesRef.current = false;
        }
      }, 50);
    } catch (error) {
      console.error("Error applying suggestion:", error);
    }
  }, [notifyScoreChange, generateMetrics]);
  
  /**
   * Apply or unapply a keyword
   * Updates both the service state and UI state when a keyword is toggled
   * 
   * @param index - Index of the keyword in the keywords array
   */
  const applyKeyword = useCallback((index: number) => {
    // Validate service exists
    if (!scoreServiceRef.current) return;
    
    try {
      console.log(`Applying keyword at index ${index}`);
      
      // Apply keyword in the service - this calculates the score impact
      const newScore = scoreServiceRef.current.applyKeyword(index);
      
      // Update state from the service to ensure UI consistency
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update keywords array for UI with immutable update pattern
      // This ensures React properly re-renders the affected components
      setKeywords(prev => {
        const updated = [...prev];
        if (index >= 0 && index < updated.length) {
          updated[index] = {
            ...updated[index],
            applied: !updated[index].applied
          };
        }
        return updated;
      });
      
      // Regenerate metrics after change with debouncing
      // This prevents excessive metric calculations for rapid changes
      pendingScoreUpdatesRef.current = true;
      setTimeout(() => {
        if (pendingScoreUpdatesRef.current) {
          generateMetrics();
          pendingScoreUpdatesRef.current = false;
        }
      }, 50);
    } catch (error) {
      console.error("Error applying keyword:", error);
    }
  }, [notifyScoreChange, generateMetrics]);
  
  /**
   * Update resume content
   * Recalculates score based on new content and updates state
   * 
   * @param newContent - New HTML content of the resume
   */
  const updateContent = useCallback((newContent: string) => {
    // Validate service exists
    if (!scoreServiceRef.current) return;
    
    try {
      // Validate content is substantial enough to calculate
      if (!newContent || newContent.length < 10) {
        console.warn("Content too short for score calculation");
        return;
      }
      
      console.log("Updating resume content for score calculation");
      
      // Update content in the service - this recalculates scores
      const newScore = scoreServiceRef.current.updateContent(newContent);
      
      // Update state from the service to ensure UI consistency
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update reference to track content changes for later comparisons
      prevResumeContentRef.current = newContent;
      
      // Regenerate metrics after a slightly longer delay
      // Content changes can be more intensive, so use a longer timeout
      pendingScoreUpdatesRef.current = true;
      setTimeout(() => {
        if (pendingScoreUpdatesRef.current) {
          generateMetrics();
          pendingScoreUpdatesRef.current = false;
        }
      }, 100);
    } catch (error) {
      console.error("Error updating content:", error);
    }
  }, [notifyScoreChange, generateMetrics]);
  
  /**
   * Reset all changes
   * Reverts all suggestions and keywords to their initial state
   * 
   * @returns The new score after reset
   */
  const resetAllChanges = useCallback(() => {
    // Validate service exists
    if (!scoreServiceRef.current) return;
    
    try {
      console.log("Resetting all score changes");
      
      // Reset in the service - this resets all optimizations
      const newScore = scoreServiceRef.current.resetAllChanges();
      
      // Update state from the service to ensure UI consistency
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update UI state with immutable update pattern
      // Mark all suggestions and keywords as unapplied
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: false })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: false })));
      
      // Regenerate metrics after change
      pendingScoreUpdatesRef.current = true;
      setTimeout(() => {
        if (pendingScoreUpdatesRef.current) {
          generateMetrics();
          pendingScoreUpdatesRef.current = false;
        }
      }, 50);
    } catch (error) {
      console.error("Error resetting changes:", error);
    }
  }, [notifyScoreChange, generateMetrics]);
  
  /**
   * Apply all suggestions and keywords
   * Updates all suggestions and keywords to applied state
   * 
   * @returns The new score after applying all changes
   */
  const applyAllChanges = useCallback(() => {
    // Validate service exists
    if (!scoreServiceRef.current) return;
    
    // Set applying changes flag for UI feedback
    // This can be used to show a loading state in the UI
    setIsApplyingChanges(true);
    
    try {
      console.log("Applying all suggestions and keywords");
      
      // Apply all in the service
      scoreServiceRef.current.applyAllSuggestions();
      scoreServiceRef.current.applyAllKeywords();
      
      // Get the new score and breakdown
      const newScore = scoreServiceRef.current.getCurrentScore();
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      
      // Update state
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update UI state with immutable update pattern
      // Mark all suggestions and keywords as applied
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: true })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: true })));
      
      // Regenerate metrics after change
      pendingScoreUpdatesRef.current = true;
      setTimeout(() => {
        if (pendingScoreUpdatesRef.current) {
          generateMetrics();
          pendingScoreUpdatesRef.current = false;
        }
      }, 50);
    } catch (error) {
      console.error("Error applying all changes:", error);
    } finally {
      // Reset applying changes flag regardless of outcome
      setIsApplyingChanges(false);
    }
  }, [notifyScoreChange, generateMetrics]);
  
  // =========================================================================
  // Impact Simulation Functions
  // =========================================================================
  
  /**
   * Simulate applying a suggestion without actually applying it
   * Used for impact preview features and "what if" scenarios
   * 
   * @param index - Index of the suggestion to simulate
   * @returns Object containing new score, point impact, and description
   */
  const simulateSuggestionImpact = useCallback((index: number) => {
    // Provide fallback if service not available
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    try {
      // Simulate impact with service
      const result = scoreServiceRef.current.simulateSuggestionImpact(index);
      return result;
    } catch (error) {
      console.error("Error simulating suggestion impact:", error);
      // Return fallback values on error
      return { newScore: currentScore, pointImpact: 0, description: "Error calculating impact" };
    }
  }, [currentScore]);
  
  /**
   * Simulate applying a keyword without actually applying it
   * Used for impact preview features and "what if" scenarios
   * 
   * @param index - Index of the keyword to simulate
   * @returns Object containing new score, point impact, and description
   */
  const simulateKeywordImpact = useCallback((index: number) => {
    // Provide fallback if service not available
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    try {
      // Simulate impact with service
      const result = scoreServiceRef.current.simulateKeywordImpact(index);
      return result;
    } catch (error) {
      console.error("Error simulating keyword impact:", error);
      // Return fallback values on error
      return { newScore: currentScore, pointImpact: 0, description: "Error calculating impact" };
    }
  }, [currentScore]);
  
  // =========================================================================
  // Reporting and Export Functions
  // =========================================================================
  
  /**
   * Export optimization report
   * Generates and downloads a report in the specified format
   * 
   * @param format - Format to export: 'json', 'csv', or 'markdown'
   */
  const exportReport = useCallback((format: 'json' | 'csv' | 'markdown' = 'markdown') => {
    try {
      // Validate required functions and data
      if (!metrics || !downloadOptimizationReport || !exportFormats) {
        console.error("Missing required data or functions for export");
        return;
      }

      // Determine export format and content type
      let content: string;
      let mimeType: string;
      let extension: string;

      // Configure export parameters based on requested format
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

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `resume-optimization-${timestamp}.${extension}`;

      // Trigger download
      downloadOptimizationReport(content, filename, mimeType);
      console.log(`Exported report as ${filename}`);
    } catch (error) {
      console.error("Error exporting report:", error);
    }
  }, [metrics]);
  
  // =========================================================================
  // Impact Detail Functions for UI
  // =========================================================================
  
  /**
   * Get detailed impact information for a suggestion
   * Used for displaying impact details in the UI components
   * 
   * @param suggestion - The suggestion object
   * @param index - Index of the suggestion in the array
   * @returns Object with points, impact level, and description
   */
  const getSuggestionImpact = useCallback((suggestion: Suggestion, index: number) => {
    // Provide fallback if service not available
    if (!scoreServiceRef.current) {
      // Basic calculation based on suggestion properties
      const score = suggestion.score || 5;
      const points = suggestion.pointImpact || 1.0;
      const level = getImpactLevel(score / 10);
      
      return { 
        points, 
        level,
        description: `Impact: +${points} points`
      };
    }
    
    try {
      // Get impact details from service
      const impact = scoreServiceRef.current.getSuggestionImpactDetails(index);
      
      return {
        points: impact.pointImpact,
        level: impact.level,
        description: impact.description
      };
    } catch (error) {
      console.error("Error getting suggestion impact:", error);
      // Return fallback values on error
      return {
        points: suggestion.pointImpact || 1.0,
        level: ImpactLevel.MEDIUM,
        description: "Impact calculation failed"
      };
    }
  }, []);
  
  /**
   * Get detailed impact information for a keyword
   * Used for displaying impact details in the UI components
   * 
   * @param keyword - The keyword object
   * @param index - Index of the keyword in the array
   * @returns Object with points, impact level, and description
   */
  const getKeywordImpact = useCallback((keyword: Keyword, index: number) => {
    // Provide fallback if service not available
    if (!scoreServiceRef.current) {
      // Basic calculation based on keyword properties
      const impact = keyword.impact || 0.5;
      const points = keyword.pointImpact || impact * 2;
      const level = getImpactLevel(impact);
      
      return { 
        points, 
        level,
        description: `Impact: +${points} points`
      };
    }
    
    try {
      // Get impact details from service
      const impact = scoreServiceRef.current.getKeywordImpactDetails(index);
      
      return {
        points: impact.pointImpact,
        level: impact.level,
        description: impact.description
      };
    } catch (error) {
      console.error("Error getting keyword impact:", error);
      // Return fallback values on error
      return {
        points: keyword.pointImpact || 1.0,
        level: ImpactLevel.MEDIUM,
        description: "Impact calculation failed"
      };
    }
  }, []);
  
  // =========================================================================
  // State Persistence
  // =========================================================================
  
  /**
   * Save current state
   * Persists the current optimization state for later retrieval
   * 
   * @returns Boolean indicating success
   */
  const saveState = useCallback(() => {
    // Skip if missing required data or functions
    if (!scoreBreakdown || !saveOptimizationState) {
      console.warn("Cannot save state: missing required data or functions");
      return false;
    }
    
    try {
      console.log("Saving optimization state");
      
      // Create state object with current values from all relevant state
      // This data structure matches what loadOptimizationState expects
      const state = {
        resumeId,
        initialScore,
        currentScore,
        appliedSuggestions: suggestions.filter(s => s.isApplied),
        appliedKeywords: keywords.filter(k => k.applied),
        scoreBreakdown,
        lastUpdated: new Date().toISOString()
      };
      
      // Save state and return result
      return saveOptimizationState(state);
    } catch (error) {
      console.error("Error saving optimization state:", error);
      return false;
    }
  }, [resumeId, initialScore, currentScore, suggestions, keywords, scoreBreakdown]);
  
  /**
   * Save state when component unmounts
   * This ensures the state is persisted when the user navigates away
   * or when the component is otherwise removed from the UI
   */
  useEffect(() => {
    return () => {
      // Try to save state on unmount
      saveState();
      
      // Clean up timeouts to prevent memory leaks
      if (scoreChangeTimeoutRef.current) {
        clearTimeout(scoreChangeTimeoutRef.current);
      }
    };
  }, [saveState]);
  
  // =========================================================================
  // Return the complete hook API
  // =========================================================================
  
  return {
    // Current state values
    currentScore,
    scoreBreakdown,
    suggestions,
    keywords,
    isApplyingChanges,
    metrics,
    
    // Actions for modifying resume and score
    applySuggestion,
    applyKeyword,
    updateContent,
    resetAllChanges,
    applyAllChanges,
    
    // Impact simulation for previews
    simulateSuggestionImpact,
    simulateKeywordImpact,
    
    // Export and reporting utilities
    exportReport,
    getSuggestionImpact,
    getKeywordImpact,
    saveState
  };
}

/**
 * Default export for compatibility with various import styles
 * Allows both named and default imports:
 * import { useResumeScoreManager } from './useResumeScoreManager';
 * import useResumeScoreManager from './useResumeScoreManager';
 */
export default useResumeScoreManager;