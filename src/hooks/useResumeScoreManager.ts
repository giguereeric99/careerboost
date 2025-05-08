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
 */
export function useResumeScoreManager({
  initialScore,
  resumeContent,
  initialSuggestions,
  initialKeywords,
  resumeId,
  onScoreChange
}: ResumeScoreManagerProps): ResumeScoreManagerResult {
  // State for tracking current values
  const [currentScore, setCurrentScore] = useState<number>(initialScore);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [isApplyingChanges, setIsApplyingChanges] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  
  // References to prevent loops and manage debouncing
  const startTimeRef = useRef<Date>(new Date());
  const scoreChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreServiceRef = useRef<ResumeScoreService | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const lastScoreUpdateRef = useRef<number>(initialScore);
  
  // Refs to track previous values and avoid unnecessary updates
  const prevInitialScoreRef = useRef<number>(initialScore);
  const prevResumeContentRef = useRef<string>(resumeContent);
  const prevSuggestionsRef = useRef<Suggestion[]>(initialSuggestions);
  const prevKeywordsRef = useRef<Keyword[]>(initialKeywords);
  
  // Ref to track update in progress to prevent recursive updates
  const isUpdatingRef = useRef<boolean>(false);
  const pendingScoreUpdatesRef = useRef<boolean>(false);
  
  /**
   * Forward score changes to parent with enhanced debouncing
   * Ensures all score updates are properly propagated
   */
  const notifyScoreChange = useCallback((score: number) => {
    // Skip if score hasn't actually changed
    if (score === lastScoreUpdateRef.current) {
      return;
    }
    
    // Update last score value for comparison
    lastScoreUpdateRef.current = score;
    
    // Update internal state immediately
    setCurrentScore(score);
    
    // Debounce external callback
    if (scoreChangeTimeoutRef.current) {
      clearTimeout(scoreChangeTimeoutRef.current);
    }
    
    // Only call external callback if provided
    if (onScoreChange) {
      scoreChangeTimeoutRef.current = setTimeout(() => {
        console.log("Score manager notifying parent of score change:", score);
        onScoreChange(score);
      }, 50);
    }
  }, [onScoreChange]);
  
  /**
   * Check if dependencies have changed significantly enough to require reinitialization
   * This prevents unnecessary re-renders and potential infinite loops
   */
  const haveDependenciesChanged = useCallback(() => {
    // Check if initial score has changed
    if (prevInitialScoreRef.current !== initialScore) {
      return true;
    }
    
    // Check if content length has changed significantly
    // This is a quick way to detect content changes without deep comparison
    if (Math.abs(prevResumeContentRef.current.length - resumeContent.length) > 10) {
      return true;
    }
    
    // Check if suggestions or keywords count has changed
    if (prevSuggestionsRef.current.length !== initialSuggestions.length ||
        prevKeywordsRef.current.length !== initialKeywords.length) {
      return true;
    }
    
    // If no significant changes detected, return false
    return false;
  }, [initialScore, initialSuggestions, initialKeywords, resumeContent]);
  
  /**
   * Initialize the score service with current values
   * This function is wrapped in useCallback to prevent unnecessary recreation
   * Enhanced with better error handling and state updates
   */
  const initializeScoreService = useCallback(() => {
    // Prevent concurrent initialization
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    try {
      // CORRECTION: Utilisez la valeur actuelle de l'état plutôt que initialScore
      // Le score ATS reçu de l'API est stocké dans currentScore à ce stade
      const scoreToUse = currentScore || initialScore;
      
      console.log("Initializing score service with score:", scoreToUse, "instead of default:", initialScore);
      
      // Update reference values to track changes
      prevInitialScoreRef.current = initialScore;
      prevResumeContentRef.current = resumeContent;
      prevSuggestionsRef.current = initialSuggestions;
      prevKeywordsRef.current = initialKeywords;
      
      // Create score service with configuration and debounced callback
      scoreServiceRef.current = new ResumeScoreService(
        scoreToUse,  // Utilisez le score actuel plutôt que initialScore
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
      
      // [reste du code inchangé]
    } catch (error) {
      console.error("Error initializing score service:", error);
    } finally {
      // Always reset the update flag
      isUpdatingRef.current = false;
    }
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords, notifyScoreChange, currentScore]);
  
  /**
   * Safe wrapper for updating service that prevents loops
   * Enhanced with improved state synchronization
   */
  const safeUpdateService = useCallback(() => {
    // Prevent concurrent updates
    if (isUpdatingRef.current || !scoreServiceRef.current) return;
    isUpdatingRef.current = true;
    
    try {
      console.log("Safely updating score service");
      
      // CORRECTION: Utilisez la valeur actuelle de currentScore au lieu de initialScore
      const scoreToUse = currentScore || initialScore;
      console.log("Using score for update:", scoreToUse);
      
      // Update reference values
      prevInitialScoreRef.current = initialScore;
      prevResumeContentRef.current = resumeContent;
      prevSuggestionsRef.current = initialSuggestions;
      prevKeywordsRef.current = initialKeywords;
      
      // Update service state without full reinitialization
      scoreServiceRef.current.updateState(
        scoreToUse,  // Utilisez currentScore au lieu de initialScore
        resumeContent,
        initialSuggestions,
        initialKeywords
      );
      
      // [reste du code inchangé]
    } catch (error) {
      console.error("Error updating score service:", error);
    } finally {
      // Always reset the update flag
      isUpdatingRef.current = false;
    }
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords, notifyScoreChange, currentScore]);
  
  /**
   * Initialize on mount and react to significant dependency changes
   * This effect is responsible for initializing and updating the score service
   */
  useEffect(() => {
    // Skip effect if an update is already in progress
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
  
  /**
   * Generate metrics with error handling
   * This is used to calculate and update optimization metrics for reporting
   * Enhanced with better validation and error handling
   */
  const generateMetrics = useCallback(() => {
    if (!generateOptimizationMetrics || !scoreServiceRef.current) return null;

    try {
      // Get current data from service
      const service = scoreServiceRef.current;
      const initialScoreVal = service.getBaseScore();
      const currentScoreVal = service.getCurrentScore();
      const appliedSugs = service.getAppliedSuggestions();
      const appliedKeys = service.getAppliedKeywords();

      // Generate metrics
      const newMetrics = generateOptimizationMetrics(
        initialScoreVal,
        currentScoreVal,
        appliedSugs,
        appliedKeys,
        startTimeRef.current
      );

      console.log("Generated optimization metrics:", {
        initialScore: initialScoreVal,
        currentScore: currentScoreVal,
        improvement: currentScoreVal - initialScoreVal,
        appliedSuggestions: appliedSugs.length,
        appliedKeywords: appliedKeys.length
      });

      // Update metrics state
      setMetrics(newMetrics);
      return newMetrics;
    } catch (error) {
      console.error("Error generating metrics:", error);
      return null;
    }
  }, []);
  
  /**
   * Apply or unapply a suggestion
   * Updates both the service state and UI state
   * Enhanced with improved score calculation and state updates
   */
  const applySuggestion = useCallback((index: number) => {
    if (!scoreServiceRef.current) return;
    
    try {
      console.log(`Applying suggestion at index ${index}`);
      
      // Apply suggestion in the service
      const newScore = scoreServiceRef.current.applySuggestion(index);
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update suggestions array for UI with immutable update pattern
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
      
      // Regenerate metrics after change
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
   * Updates both the service state and UI state
   * Enhanced with improved score calculation and state updates
   */
  const applyKeyword = useCallback((index: number) => {
    if (!scoreServiceRef.current) return;
    
    try {
      console.log(`Applying keyword at index ${index}`);
      
      // Apply keyword in the service
      const newScore = scoreServiceRef.current.applyKeyword(index);
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update keywords array for UI with immutable update pattern
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
      
      // Regenerate metrics after change
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
   * Updates both the service state and score calculation
   * Enhanced with better validation and error handling
   */
  const updateContent = useCallback((newContent: string) => {
    if (!scoreServiceRef.current) return;
    
    try {
      // Validate content
      if (!newContent || newContent.length < 10) {
        console.warn("Content too short for score calculation");
        return;
      }
      
      console.log("Updating resume content for score calculation");
      
      // Update content in the service
      const newScore = scoreServiceRef.current.updateContent(newContent);
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update reference to track content changes
      prevResumeContentRef.current = newContent;
      
      // Regenerate metrics after delay
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
   * Enhanced with improved state cleanup
   */
  const resetAllChanges = useCallback(() => {
    if (!scoreServiceRef.current) return;
    
    try {
      console.log("Resetting all score changes");
      
      // Reset in the service
      const newScore = scoreServiceRef.current.resetAllChanges();
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      
      // Update score with the new value
      notifyScoreChange(newScore);
      
      // Update UI state with immutable update pattern
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: false })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: false })));
      
      // Regenerate metrics after delay
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
   * Enhanced with improved progress tracking
   */
  const applyAllChanges = useCallback(() => {
    if (!scoreServiceRef.current) return;
    
    // Set applying changes flag for UI feedback
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
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: true })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: true })));
      
      // Regenerate metrics after delay
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
      // Reset applying changes flag
      setIsApplyingChanges(false);
    }
  }, [notifyScoreChange, generateMetrics]);
  
  /**
   * Simulate applying a suggestion without actually applying it
   * Used for impact preview features
   * Enhanced with better validation and fallbacks
   */
  const simulateSuggestionImpact = useCallback((index: number) => {
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    try {
      // Simulate impact with service
      const result = scoreServiceRef.current.simulateSuggestionImpact(index);
      return result;
    } catch (error) {
      console.error("Error simulating suggestion impact:", error);
      return { newScore: currentScore, pointImpact: 0, description: "Error calculating impact" };
    }
  }, [currentScore]);
  
  /**
   * Simulate applying a keyword without actually applying it
   * Used for impact preview features
   * Enhanced with better validation and fallbacks
   */
  const simulateKeywordImpact = useCallback((index: number) => {
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    try {
      // Simulate impact with service
      const result = scoreServiceRef.current.simulateKeywordImpact(index);
      return result;
    } catch (error) {
      console.error("Error simulating keyword impact:", error);
      return { newScore: currentScore, pointImpact: 0, description: "Error calculating impact" };
    }
  }, [currentScore]);
  
  /**
   * Export optimization report
   * Generates and downloads a report in the specified format
   * Enhanced with improved validation and error handling
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
  
  /**
   * Get detailed impact information for a suggestion
   * Used for displaying impact details in the UI
   * Enhanced with better fallbacks and type safety
   */
  const getSuggestionImpact = useCallback((suggestion: Suggestion, index: number) => {
    if (!scoreServiceRef.current) {
      // Fallback calculation if service not available
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
   * Used for displaying impact details in the UI
   * Enhanced with better fallbacks and type safety
   */
  const getKeywordImpact = useCallback((keyword: Keyword, index: number) => {
    if (!scoreServiceRef.current) {
      // Fallback calculation if service not available
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
  
  /**
   * Save current state
   * Persists the current optimization state for later retrieval
   * Enhanced with better validation
   */
  const saveState = useCallback(() => {
    // Skip if missing required data or functions
    if (!scoreBreakdown || !saveOptimizationState) {
      console.warn("Cannot save state: missing required data or functions");
      return false;
    }
    
    try {
      console.log("Saving optimization state");
      
      // Create state object with current values
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
   */
  useEffect(() => {
    return () => {
      saveState();
      
      // Clean up timeouts
      if (scoreChangeTimeoutRef.current) {
        clearTimeout(scoreChangeTimeoutRef.current);
      }
    };
  }, [saveState]);
  
  return {
    // State
    currentScore,
    scoreBreakdown,
    suggestions,
    keywords,
    isApplyingChanges,
    metrics,
    
    // Actions
    applySuggestion,
    applyKeyword,
    updateContent,
    resetAllChanges,
    applyAllChanges,
    
    // Impact simulation
    simulateSuggestionImpact,
    simulateKeywordImpact,
    
    // Export and reporting
    exportReport,
    getSuggestionImpact,
    getKeywordImpact,
    saveState
  };
}

export default useResumeScoreManager;