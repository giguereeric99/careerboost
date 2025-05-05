/**
 * useResumeScoreManager.ts
 * 
 * Custom hook for managing resume optimization score and suggestions
 * with real-time updates and detailed impact analysis.
 * 
 * Refactored to prevent infinite loops by:
 * 1. Using refs for state transitions
 * 2. Adding debouncing for score recalculation
 * 3. Simplifying effect dependencies
 * 4. Removing circular dependencies
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  analyzeSuggestionImpact,
  analyzeKeywordImpact,
  calculateDetailedAtsScore,
  calculateSuggestionPointImpact,
  calculateKeywordPointImpact,
  Suggestion,
  Keyword,
  ScoreBreakdown,
  getImpactLevel,
  ImpactLevel
} from '@/services/resumeScoreLogic';

import {
  generateOptimizationMetrics,
  saveOptimizationState,
  loadOptimizationState,
  exportFormats,
  downloadOptimizationReport,
  OptimizationMetrics
} from '@/services/resumeMetricsExporter';

interface ResumeScoreManagerProps {
  initialScore: number;
  resumeContent: string;
  initialSuggestions: Suggestion[];
  initialKeywords: Keyword[];
  resumeId?: string;
  onScoreChange?: (score: number) => void;
}

interface ResumeScoreManagerResult {
  // Current state
  currentScore: number;
  scoreBreakdown: ScoreBreakdown | null;
  suggestions: Suggestion[];
  keywords: Keyword[];
  isApplyingChanges: boolean;
  metrics: OptimizationMetrics | null;
  
  // Actions
  applySuggestion: (index: number) => void;
  applyKeyword: (index: number) => void;
  updateContent: (newContent: string) => void;
  resetAllChanges: () => void;
  applyAllChanges: () => void;
  
  // Export and reporting
  exportReport: (format: 'json' | 'csv' | 'markdown') => void;
  getSuggestionImpact: (suggestion: Suggestion) => { 
    points: number; 
    level: ImpactLevel;
    description: string;
  };
  getKeywordImpact: (keyword: Keyword) => { 
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
  const [content, setContent] = useState<string>(resumeContent);
  const [isApplyingChanges, setIsApplyingChanges] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  
  // References to prevent loops
  const startTimeRef = useRef<Date>(new Date());
  const isCalculatingRef = useRef(false);
  const scoreChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCalculatedContentRef = useRef<string>('');
  const lastInitialScoreRef = useRef<number>(initialScore);
  
  /**
   * Debounced callback for onScoreChange to prevent loops
   */
  const debouncedOnScoreChange = useCallback((score: number) => {
    if (scoreChangeTimeoutRef.current) {
      clearTimeout(scoreChangeTimeoutRef.current);
    }
    
    scoreChangeTimeoutRef.current = setTimeout(() => {
      if (onScoreChange) {
        onScoreChange(score);
      }
    }, 100);
  }, [onScoreChange]);

  /**
   * Initialize with processed suggestions and keywords
   * Only run once on mount
   */
  useEffect(() => {
    // Process suggestions to add impact scores
    const processedSuggestions = initialSuggestions.map(suggestion => {
      const score = suggestion.score || analyzeSuggestionImpact(suggestion);
      const pointImpact = calculateSuggestionPointImpact({...suggestion, score});
      
      return {
        ...suggestion,
        score,
        pointImpact,
        isApplied: suggestion.isApplied || false
      };
    });
    
    // Sort suggestions by impact (highest first)
    processedSuggestions.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    setSuggestions(processedSuggestions);
    
    // Process keywords to add impact analysis
    const processedKeywords = initialKeywords.map(keyword => {
      // Get impact value if not already present
      let impact, category;
      if (keyword.impact === undefined || keyword.category === undefined) {
        const analysis = analyzeKeywordImpact(keyword.text, resumeContent);
        impact = analysis.impact;
        category = analysis.category;
      } else {
        impact = keyword.impact;
        category = keyword.category || 'general';
      }
      
      const pointImpact = calculateKeywordPointImpact(
        { text: keyword.text, applied: keyword.applied || false, impact, category },
        resumeContent
      );
      
      return {
        ...keyword,
        impact,
        category,
        pointImpact,
        applied: keyword.applied || false
      };
    });
    
    // Sort keywords by impact (highest first)
    processedKeywords.sort((a, b) => (b.impact || 0) - (a.impact || 0));
    
    setKeywords(processedKeywords);
    
    // Try to load saved state
    const savedState = loadOptimizationState(resumeId);
    if (savedState && savedState.currentScore) {
      setCurrentScore(savedState.currentScore);
    }
    
    // Set initial content
    setContent(resumeContent);
  }, []); // Empty dependency array - only run once on mount
  
  /**
   * Calculate score whenever relevant state changes
   * Uses debouncing and refs to prevent infinite loops
   */
  useEffect(() => {
    // Prevent concurrent calculations
    if (isCalculatingRef.current) return;
    
    // Skip if no content or suggestions/keywords not loaded yet
    if (!content || !suggestions.length || !keywords.length) return;
    
    // Create a key to check if calculation is needed
    const calculationKey = `${content}-${initialScore}-${JSON.stringify(suggestions.map(s => s.isApplied))}-${JSON.stringify(keywords.map(k => k.applied))}`;
    
    // Skip if we've already calculated this combination
    if (calculationKey === lastCalculatedContentRef.current && initialScore === lastInitialScoreRef.current) {
      return;
    }
    
    const calculateScore = () => {
      isCalculatingRef.current = true;
      
      try {
        // Calculate detailed score
        const breakdown = calculateDetailedAtsScore(
          initialScore,
          suggestions,
          keywords,
          content
        );
        
        // Update state
        setScoreBreakdown(breakdown);
        setCurrentScore(breakdown.total);
        
        // Call callback if provided (debounced)
        debouncedOnScoreChange(breakdown.total);
        
        // Update metrics
        const appliedSuggestions = suggestions.filter(s => s.isApplied);
        const appliedKeywords = keywords.filter(k => k.applied);
        
        const newMetrics = generateOptimizationMetrics(
          initialScore,
          breakdown.total,
          appliedSuggestions,
          appliedKeywords,
          startTimeRef.current
        );
        
        setMetrics(newMetrics);
        
        // Update refs to prevent unnecessary calculations
        lastCalculatedContentRef.current = calculationKey;
        lastInitialScoreRef.current = initialScore;
      } catch (error) {
        console.error("Error calculating score:", error);
      } finally {
        isCalculatingRef.current = false;
      }
    };
    
    // Debounce the calculation
    const timeoutId = setTimeout(calculateScore, 100);
    
    return () => clearTimeout(timeoutId);
  }, [content, suggestions, keywords, initialScore, debouncedOnScoreChange]);
  
  /**
   * Apply or unapply a suggestion
   */
  const applySuggestion = useCallback((index: number) => {
    setSuggestions(prev => {
      // Ensure index is valid
      if (index < 0 || index >= prev.length) return prev;
      
      // Create a copy with the suggestion toggled
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isApplied: !updated[index].isApplied
      };
      
      return updated;
    });
  }, []);
  
  /**
   * Apply or unapply a keyword
   */
  const applyKeyword = useCallback((index: number) => {
    setKeywords(prev => {
      // Ensure index is valid
      if (index < 0 || index >= prev.length) return prev;
      
      // Create a copy with the keyword toggled
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        applied: !updated[index].applied
      };
      
      return updated;
    });
  }, []);
  
  /**
   * Update resume content
   */
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);
  
  /**
   * Reset all changes
   */
  const resetAllChanges = useCallback(() => {
    // Reset suggestions
    setSuggestions(prev => prev.map(s => ({ ...s, isApplied: false })));
    
    // Reset keywords
    setKeywords(prev => prev.map(k => ({ ...k, applied: false })));
    
    // Reset content to original
    setContent(resumeContent);
  }, [resumeContent]);
  
  /**
   * Apply all suggested changes
   */
  const applyAllChanges = useCallback(() => {
    setIsApplyingChanges(true);
    
    // Apply all suggestions
    setSuggestions(prev => prev.map(s => ({ ...s, isApplied: true })));
    
    // Apply all keywords
    setKeywords(prev => prev.map(k => ({ ...k, applied: true })));
    
    // In a real implementation, you would generate new content here
    // based on all applied suggestions and keywords
    
    setIsApplyingChanges(false);
  }, []);
  
  /**
   * Export optimization report
   */
  const exportReport = useCallback((format: 'json' | 'csv' | 'markdown' = 'json') => {
    if (!metrics) return;
    
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
  }, [metrics]);
  
  /**
   * Get impact details for a suggestion
   */
  const getSuggestionImpact = useCallback((suggestion: Suggestion) => {
    const score = suggestion.score || analyzeSuggestionImpact(suggestion);
    const points = calculateSuggestionPointImpact({...suggestion, score});
    const level = getImpactLevel(score / 10);
    
    let description = '';
    
    switch (level) {
      case ImpactLevel.CRITICAL:
        description = `Critical improvement (+${points} points)`;
        break;
      case ImpactLevel.HIGH:
        description = `Major improvement (+${points} points)`;
        break;
      case ImpactLevel.MEDIUM:
        description = `Good improvement (+${points} points)`;
        break;
      case ImpactLevel.LOW:
        description = `Minor improvement (+${points} points)`;
        break;
    }
    
    return { points, level, description };
  }, []);
  
  /**
   * Get impact details for a keyword
   */
  const getKeywordImpact = useCallback((keyword: Keyword) => {
    // Get impact value if not already present
    let impact;
    if (keyword.impact === undefined) {
      impact = analyzeKeywordImpact(keyword.text, content).impact;
    } else {
      impact = keyword.impact;
    }
    
    const points = calculateKeywordPointImpact(keyword, content);
    const level = getImpactLevel(impact);
    
    let description = '';
    
    switch (level) {
      case ImpactLevel.CRITICAL:
        description = `Essential keyword (+${points} points)`;
        break;
      case ImpactLevel.HIGH:
        description = `High-impact keyword (+${points} points)`;
        break;
      case ImpactLevel.MEDIUM:
        description = `Helpful keyword (+${points} points)`;
        break;
      case ImpactLevel.LOW:
        description = `Minor keyword (+${points} points)`;
        break;
    }
    
    return { points, level, description };
  }, [content]);
  
  /**
   * Save current state
   */
  const saveState = useCallback(() => {
    if (!scoreBreakdown) return false;
    
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
  
  // Save state when component unmounts
  useEffect(() => {
    return () => {
      saveState();
    };
  }, [saveState]);
  
  // Cleanup function to clear timeouts
  useEffect(() => {
    return () => {
      if (scoreChangeTimeoutRef.current) {
        clearTimeout(scoreChangeTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    currentScore,
    scoreBreakdown,
    suggestions,
    keywords,
    isApplyingChanges,
    metrics,
    applySuggestion,
    applyKeyword,
    updateContent,
    resetAllChanges,
    applyAllChanges,
    exportReport,
    getSuggestionImpact,
    getKeywordImpact,
    saveState
  };
}

export default useResumeScoreManager;