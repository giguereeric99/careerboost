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
  
  /**
   * Initialize the score service with current values
   */
  const initializeScoreService = useCallback(() => {
    // Create score service with configuration
    scoreServiceRef.current = new ResumeScoreService(
      initialScore,
      resumeContent,
      initialSuggestions,
      initialKeywords,
      { 
        onScoreChange: (score) => {
          // Debounce score changes
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
      setSuggestions(initialSuggestions);
      setKeywords(initialKeywords);
      
      // Generate initial metrics
      generateMetrics();
    }
    
    isInitializedRef.current = true;
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords, onScoreChange]);
  
  /**
   * Initialize on mount and when key dependencies change
   */
  useEffect(() => {
    // Only re-initialize when necessary dependencies change
    if (!isInitializedRef.current || 
        initialScore !== scoreServiceRef.current?.getBaseScore()) {
      initializeScoreService();
    } else if (scoreServiceRef.current) {
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
      setSuggestions(initialSuggestions);
      setKeywords(initialKeywords);
      
      // Regenerate metrics
      generateMetrics();
    }
    
    // Clean up on unmount
    return () => {
      if (scoreChangeTimeoutRef.current) {
        clearTimeout(scoreChangeTimeoutRef.current);
      }
    };
  }, [initialScore, resumeContent, initialSuggestions, initialKeywords, initializeScoreService]);
  
  /**
   * Generate metrics with error handling
   */
  const generateMetrics = useCallback(() => {
    if (!generateOptimizationMetrics || !scoreServiceRef.current) return null;

    try {
      const service = scoreServiceRef.current;
      const initialScoreVal = service.getBaseScore();
      const currentScoreVal = service.getCurrentScore();
      const appliedSugs = service.getAppliedSuggestions();
      const appliedKeys = service.getAppliedKeywords();

      const metrics = generateOptimizationMetrics(
        initialScoreVal,
        currentScoreVal,
        appliedSugs,
        appliedKeys,
        startTimeRef.current
      );

      setMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error("Error generating metrics:", error);
      return null;
    }
  }, []);
  
  /**
   * Apply or unapply a suggestion
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
      
      // Update suggestions array for UI
      setSuggestions(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          isApplied: !updated[index].isApplied
        };
        return updated;
      });
      
      // Regenerate metrics
      generateMetrics();
    } catch (error) {
      console.error("Error applying suggestion:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Apply or unapply a keyword
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
      
      // Update keywords array for UI
      setKeywords(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          applied: !updated[index].applied
        };
        return updated;
      });
      
      // Regenerate metrics
      generateMetrics();
    } catch (error) {
      console.error("Error applying keyword:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Update resume content
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
      
      // Regenerate metrics
      generateMetrics();
    } catch (error) {
      console.error("Error updating content:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Reset all changes
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
      
      // Update UI state
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: false })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: false })));
      
      // Regenerate metrics
      generateMetrics();
    } catch (error) {
      console.error("Error resetting changes:", error);
    }
  }, [generateMetrics]);
  
  /**
   * Apply all suggestions and keywords
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
      
      // Update UI state
      setSuggestions(prev => prev.map(s => ({ ...s, isApplied: true })));
      setKeywords(prev => prev.map(k => ({ ...k, applied: true })));
      
      // Regenerate metrics
      generateMetrics();
    } catch (error) {
      console.error("Error applying all changes:", error);
    } finally {
      setIsApplyingChanges(false);
    }
  }, [generateMetrics]);
  
  /**
   * Simulate applying a suggestion without actually applying it
   */
  const simulateSuggestionImpact = useCallback((index: number) => {
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    return scoreServiceRef.current.simulateSuggestionImpact(index);
  }, [currentScore]);
  
  /**
   * Simulate applying a keyword without actually applying it
   */
  const simulateKeywordImpact = useCallback((index: number) => {
    if (!scoreServiceRef.current) {
      return { newScore: currentScore, pointImpact: 0, description: "Not initialized" };
    }
    
    return scoreServiceRef.current.simulateKeywordImpact(index);
  }, [currentScore]);
  
  /**
   * Export optimization report
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