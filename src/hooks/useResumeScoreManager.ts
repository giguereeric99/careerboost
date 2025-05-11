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
 * - API score priority to ensure correct display of ATS scores
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
  
  // Actions
  applySuggestion: (index: number) => void; // Apply/unapply a suggestion
  applyKeyword: (index: number) => void;    // Apply/unapply a keyword
  updateContent: (newContent: string) => void; // Update resume content
  resetAllChanges: () => void;      // Reset all to initial state
  applyAllChanges: () => void;      // Apply all suggestions and keywords
  forceUpdateScore: (score: number) => void; // Force update the score (from API)
  
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
  
  // API score override tracking - Used to prioritize API-provided scores
  const directScoreUpdateRef = useRef<number | null>(null);
  const apiScoreRef = useRef<number | null>(null);
  
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
      
      // IMPORTANT: Si le currentScore est déjà défini et supérieur à initialScore,
      // utiliser currentScore pour éviter de revenir à un score inférieur
      const finalScoreToUse = Math.max(scoreToUse, initialScore);
      console.log(`Final score used for initialization: ${finalScoreToUse}`);
      
      // Update reference values to track changes for future comparisons
      prevInitialScoreRef.current = initialScore;
      prevResumeContentRef.current = resumeContent;
      prevSuggestionsRef.current = initialSuggestions;
      prevKeywordsRef.current = initialKeywords;
      
      // Create score service with configuration and debounced callback
      scoreServiceRef.current = new ResumeScoreService(
        finalScoreToUse,  // Use actual current score instead of initial value
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
        notifyScoreChange(finalScoreToUse);
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
      
      // Prioritize API-provided scores over other values
      // This ensures score from API always takes precedence
      const scoreToUse = apiScoreRef.current || directScoreUpdateRef.current || currentScore || initialScore;
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
      
      // Clear the reference values after use
      apiScoreRef.current = null;
      directScoreUpdateRef.current = null;
      
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

  /**
   * Ensure API scores take priority over internal scores
   * This effect monitors for API score changes and ensures they are applied
   */
  useEffect(() => {
    // If an API score has been set and it's different from current score
    if (apiScoreRef.current && apiScoreRef.current !== currentScore) {
      console.log(`API score override: ${apiScoreRef.current} differs from current (${currentScore})`);
      
      // Use forceUpdateScore to update the score immediately
      forceUpdateScore(apiScoreRef.current);
      
      // Clear the API score reference to prevent repeated updates
      apiScoreRef.current = null;
    }
  }, [currentScore]); // Only depend on currentScore to prevent unnecessary triggers
  
  // =========================================================================
  // Direct Score Update Methods
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
    
    // Store the API score for initialization/update methods to use
    apiScoreRef.current = score;
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
    } else {
      // If service not initialized yet, just update state
      // The API score ref will be used during initialization
      console.log("Service not initialized yet, updating state directly");
      notifyScoreChange(score);
    }
  }, [resumeContent, initialSuggestions, initialKeywords, notifyScoreChange]);
  
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

  /**
   * Force update the base score directly
   * This method is used to ensure the score from API is properly applied
   * It bypasses normal score calculation to ensure API score is honored
   * 
   * @param newScore - The new score from API
   */
  const forceUpdateScore = useCallback((newScore: number) => {
    // Validate input
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      console.warn("Invalid score value for forceUpdateScore:", newScore);
      return;
    }
    
    console.log("FORCE UPDATE: Setting score directly to", newScore);
    
    // Update internal state immediately
    setCurrentScore(newScore);
    
    // Store the API score for future use
    apiScoreRef.current = newScore;
    
    // If score service exists, update it directly
    if (scoreServiceRef.current && typeof scoreServiceRef.current.updateBaseScore === 'function') {
      console.log("Forcing score update in service to:", newScore);
      scoreServiceRef.current.updateBaseScore(newScore);
      
      // Update breakdown to ensure UI consistency
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
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
    } catch (error) {
      console.error("Error applying suggestion:", error);
    }
  }, [notifyScoreChange]);
  
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
    } catch (error) {
      console.error("Error applying keyword:", error);
    }
  }, [notifyScoreChange]);
  
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
    } catch (error) {
      console.error("Error updating content:", error);
    }
  }, [notifyScoreChange]);
  
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
    } catch (error) {
      console.error("Error resetting changes:", error);
    }
  }, [notifyScoreChange]);
  
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
    } catch (error) {
      console.error("Error applying all changes:", error);
    } finally {
      // Reset applying changes flag regardless of outcome
      setIsApplyingChanges(false);
    }
  }, [notifyScoreChange]);
  
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
    try {
      console.log("Saving optimization state");
      
      // Simple implementation without external dependencies
      if (resumeId) {
        // Save state in localStorage as fallback
        const state = {
          resumeId,
          initialScore,
          currentScore,
          appliedSuggestions: suggestions.filter(s => s.isApplied),
          appliedKeywords: keywords.filter(k => k.applied),
          scoreBreakdown,
          lastUpdated: new Date().toISOString()
        };
        
        // Save to localStorage as fallback
        localStorage.setItem(`resume_score_state_${resumeId}`, JSON.stringify(state));
        return true;
      }
      
      return false;
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
    
    // Actions for modifying resume and score
    applySuggestion,
    applyKeyword,
    updateContent,
    resetAllChanges,
    applyAllChanges,
    forceUpdateScore,  // Direct score update function
    
    // Impact simulation for previews
    simulateSuggestionImpact,
    simulateKeywordImpact,
    
    // Export and reporting utilities
    getSuggestionImpact,
    getKeywordImpact,
    saveState
  };
}