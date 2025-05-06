/**
 * useResumeScoreManager Hook
 * 
 * Custom React hook for managing resume optimization scores with real-time feedback.
 * This hook provides a clean React interface to the ResumeScoreService.
 * 
 * Features:
 * - Real-time score updates when suggestions or keywords are applied
 * - Debouncing to prevent excessive updates
 * - Clean separation of UI state and business logic
 * - Cache mechanism to prevent unnecessary recalculations
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
  
  // Refs to track previous values and avoid unnecessary updates
  const prevInitialScoreRef = useRef<number>(initialScore);
  const prevResumeContentRef = useRef<string>(resumeContent);
  const prevSuggestionsRef = useRef<Suggestion[]>(initialSuggestions);
  const prevKeywordsRef = useRef<Keyword[]>(initialKeywords);
  
  // Ref to track update in progress to prevent recursive updates
  const isUpdatingRef = useRef<boolean>(false);
  
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
   */
  const initializeScoreService = useCallback(() => {
    // Prevent concurrent initialization
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    
    try {
      // Update reference values to track changes
      prevInitialScoreRef.current = initialScore;
      prevResumeContentRef.current = resumeContent;
      prevSuggestionsRef.current = initialSuggestions;
      prevKeywordsRef.current = initialKeywords;
      
      // Create score service with configuration and debounced callback
      scoreServiceRef.current = new ResumeScoreService(
        initialScore,
        resumeContent,
        initialSuggestions,
        initialKeywords,
        { 
          onScoreChange: (score) => {
            // Debounce score changes to prevent rapid updates
            if (scoreChangeTimeoutRef.current) {
              clearTimeout(scoreChangeTimeoutRef.current);
            }
            
            scoreChangeTimeoutRef.current = setTimeout(() => {
              setCurrentScore(score);
              
              // Call external callback if provided
              if (onScoreChange) {
                onScoreChange(score);
              }
            }, 50);
          }
        }
      );
      
      // Get initial score breakdown
      if (scoreServiceRef.current) {
        const breakdown = scoreServiceRef.current.getScoreBreakdown();
        setScoreBreakdown(breakdown);
        
        // Set current score from calculation
        setCurrentScore(scoreServiceRef.current.getCurrentScore());
        
        // Initialize suggestions and keywords with processed versions
        // Create new arrays to avoid reference equality issues
        setSuggestions([...initialSuggestions]);
        setKeywords([...initialKeywords]);
      }
      
      isInitializedRef.current = true;
      
      // Generate initial metrics after a short delay
      // This prevents metrics generation during initialization which can cause loops
      setTimeout(() => {
        generateMetrics();
      }, 100);
    } finally {
      // Always reset the update flag
      isUpdatingRef.current = false;
    }
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords, onScoreChange]);
  
  /**
   * Safe wrapper for updating content that prevents loops
   */
  const safeUpdateService = useCallback(() => {
    // Prevent concurrent updates
    if (isUpdatingRef.current || !scoreServiceRef.current) return;
    isUpdatingRef.current = true;
    
    try {
      // Update reference values
      prevInitialScoreRef.current = initialScore;
      prevResumeContentRef.current = resumeContent;
      prevSuggestionsRef.current = initialSuggestions;
      prevKeywordsRef.current = initialKeywords;
      
      // Update service state without full reinitialization
      scoreServiceRef.current.updateState(
        initialScore,
        resumeContent,
        initialSuggestions,
        initialKeywords
      );
      
      // Update local state from service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      setCurrentScore(scoreServiceRef.current.getCurrentScore());
      
      // Only update UI state if necessary
      setSuggestions(prev => {
        if (prev.length !== initialSuggestions.length) {
          return [...initialSuggestions];
        }
        return prev;
      });
      
      setKeywords(prev => {
        if (prev.length !== initialKeywords.length) {
          return [...initialKeywords];
        }
        return prev;
      });
      
      // Regenerate metrics after delay
      setTimeout(() => {
        generateMetrics();
      }, 100);
    } finally {
      // Always reset the update flag
      isUpdatingRef.current = false;
    }
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords]);
  
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
   */
  const generateMetrics = useCallback(() => {
    if (!generateOptimizationMetrics || !scoreServiceRef.current) return null;

    try {
      const service = scoreServiceRef.current;
      const initialScoreVal = service.getBaseScore();
      const currentScoreVal = service.getCurrentScore();
      const appliedSugs = service.getAppliedSuggestions();
      const appliedKeys = service.getAppliedKeywords();

      const newMetrics = generateOptimizationMetrics(
        initialScoreVal,
        currentScoreVal,
        appliedSugs,
        appliedKeys,
        startTimeRef.current
      );

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
   */
  const applySuggestion = useCallback((index: number) => {
    if (!scoreServiceRef.current) return;
    
    try {
      // Apply suggestion in the service
      const newScore = scoreServiceRef.current.applySuggestion(index);
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      setCurrentScore(newScore);
      
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
      setTimeout(() => {
        generateMetrics();
      }, 50);
    } catch (error) {
      console.error("Error applying suggestion:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Apply or unapply a keyword
   * Updates both the service state and UI state
   */
  const applyKeyword = useCallback((index: number) => {
    if (!scoreServiceRef.current) return;
    
    try {
      // Apply keyword in the service
      const newScore = scoreServiceRef.current.applyKeyword(index);
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      setCurrentScore(newScore);
      
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
      setTimeout(() => {
        generateMetrics();
      }, 50);
    } catch (error) {
      console.error("Error applying keyword:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Update resume content
   * Updates both the service state and score calculation
   */
  const updateContent = useCallback((newContent: string) => {
    if (!scoreServiceRef.current) return;
    
    try {
      // Update content in the service
      const newScore = scoreServiceRef.current.updateContent(newContent);
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      setCurrentScore(newScore);
      
      // Update reference to track content changes
      prevResumeContentRef.current = newContent;
      
      // Regenerate metrics after delay
      setTimeout(() => {
        generateMetrics();
      }, 100);
    } catch (error) {
      console.error("Error updating content:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Reset all changes
   * Reverts all suggestions and keywords to their initial state
   */
  const resetAllChanges = useCallback(() => {
    if (!scoreServiceRef.current) return;
    
    try {
      // Reset in the service
      const newScore = scoreServiceRef.current.resetAllChanges();
      
      // Update state from the service
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      setScoreBreakdown(breakdown);
      setCurrentScore(newScore);
      
      // Update UI state with immutable update pattern
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: false })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: false })));
      
      // Regenerate metrics after delay
      setTimeout(() => {
        generateMetrics();
      }, 50);
    } catch (error) {
      console.error("Error resetting changes:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Apply all suggestions and keywords
   * Updates all suggestions and keywords to applied state
   */
  const applyAllChanges = useCallback(() => {
    if (!scoreServiceRef.current) return;
    
    setIsApplyingChanges(true);
    
    try {
      // Apply all in the service
      scoreServiceRef.current.applyAllSuggestions();
      scoreServiceRef.current.applyAllKeywords();
      
      // Get the new score and breakdown
      const newScore = scoreServiceRef.current.getCurrentScore();
      const breakdown = scoreServiceRef.current.getScoreBreakdown();
      
      // Update state
      setScoreBreakdown(breakdown);
      setCurrentScore(newScore);
      
      // Update UI state with immutable update pattern
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: true })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: true })));
      
      // Regenerate metrics after delay
      setTimeout(() => {
        generateMetrics();
      }, 50);
    } catch (error) {
      console.error("Error applying all changes:", error);
    } finally {
      setIsApplyingChanges(false);
    }
  }, [generateMetrics]);
  
  /**
   * Simulate applying a suggestion without actually applying it
   * Used for impact preview features
   */
  const simulateSuggestionImpact = useCallback((index: number) => {
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    return scoreServiceRef.current.simulateSuggestionImpact(index);
  }, [currentScore]);
  
  /**
   * Simulate applying a keyword without actually applying it
   * Used for impact preview features
   */
  const simulateKeywordImpact = useCallback((index: number) => {
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    return scoreServiceRef.current.simulateKeywordImpact(index);
  }, [currentScore]);
  
  /**
   * Export optimization report
   * Generates and downloads a report in the specified format
   */
  const exportReport = useCallback((format: 'json' | 'csv' | 'markdown' = 'markdown') => {
    try {
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
    } catch (error) {
      console.error("Error exporting report:", error);
    }
  }, [metrics]);
  
  /**
   * Get detailed impact information for a suggestion
   * Used for displaying impact details in the UI
   */
  const getSuggestionImpact = useCallback((suggestion: Suggestion, index: number) => {
    if (!scoreServiceRef.current) {
      const score = suggestion.score || 5;
      const points = suggestion.pointImpact || 1.0;
      const level = getImpactLevel(score / 10);
      
      return { 
        points, 
        level,
        description: `Impact: +${points} points`
      };
    }
    
    const impact = scoreServiceRef.current.getSuggestionImpactDetails(index);
    
    return {
      points: impact.pointImpact,
      level: impact.level,
      description: impact.description
    };
  }, []);
  
  /**
   * Get detailed impact information for a keyword
   * Used for displaying impact details in the UI
   */
  const getKeywordImpact = useCallback((keyword: Keyword, index: number) => {
    if (!scoreServiceRef.current) {
      const impact = keyword.impact || 0.5;
      const points = keyword.pointImpact || impact * 2;
      const level = getImpactLevel(impact);
      
      return { 
        points, 
        level,
        description: `Impact: +${points} points`
      };
    }
    
    const impact = scoreServiceRef.current.getKeywordImpactDetails(index);
    
    return {
      points: impact.pointImpact,
      level: impact.level,
      description: impact.description
    };
  }, []);
  
  /**
   * Save current state
   * Persists the current optimization state for later retrieval
   */
  const saveState = useCallback(() => {
    if (!scoreBreakdown || !saveOptimizationState) return false;
    
    const state = {
      resumeId,
      initialScore,
      currentScore,
      appliedSuggestions: suggestions.filter(s => s.isApplied),
      appliedKeywords: keywords.filter(k => k.applied),
      scoreBreakdown,
      lastUpdated: new Date().toISOString()
    };
    
    return saveOptimizationState(state);
  }, [resumeId, initialScore, currentScore, suggestions, keywords, scoreBreakdown]);
  
  /**
   * Save state when component unmounts
   * This ensures the state is persisted when the user navigates away
   */
  useEffect(() => {
    return () => {
      saveState();
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