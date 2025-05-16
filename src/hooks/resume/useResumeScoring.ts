// hooks/resume/useResumeScoring.ts

import { useMemo, useCallback } from 'react';
import { 
  analyzeSuggestionImpact, 
  calculateSuggestionPointImpact,
  analyzeKeywordImpact,
  calculateKeywordPointImpact,
  ScoreBreakdown,
  ImpactLevel,
  SECTION_WEIGHTS
} from '@/services/resumeScoreLogic';
import { ResumeState } from './useResumeState';

/**
 * Hook for all resume scoring logic
 * Provides impact calculations and score breakdowns
 */
export function useResumeScoring(state: ResumeState) {
  /**
   * Simulate the impact of applying a suggestion
   */
  const simulateSuggestionImpact = useCallback((index: number) => {
    // Default impact values for fallback
    const defaultResult = {
      newScore: Math.min(100, state.currentScore + 2),
      pointImpact: 2,
      description: "This suggestion will improve your resume's clarity and impact.",
      level: ImpactLevel.MEDIUM
    };
    
    // Check if index is valid
    if (index < 0 || index >= state.suggestions.length) {
      return defaultResult;
    }
    
    // Get the actual suggestion
    const suggestion = state.suggestions[index];
    
    // Calculate real impact using scoring logic
    const score = suggestion.score || analyzeSuggestionImpact(suggestion);
    const pointImpact = suggestion.pointImpact || 
      calculateSuggestionPointImpact({...suggestion, score});
    
    // Calculate new potential score
    const newScore = Math.min(100, state.currentScore + pointImpact);
    
    // Determine impact level based on point impact
    let level: ImpactLevel;
    if (pointImpact >= 3) level = ImpactLevel.CRITICAL;
    else if (pointImpact >= 2) level = ImpactLevel.HIGH;
    else if (pointImpact >= 1) level = ImpactLevel.MEDIUM;
    else level = ImpactLevel.LOW;
    
    // Create appropriate description based on impact level
    let description: string;
    switch (level) {
      case ImpactLevel.CRITICAL:
        description = `Critical improvement that will significantly enhance your resume's ATS compatibility (+${pointImpact} points)`;
        break;
      case ImpactLevel.HIGH:
        description = `Important improvement that will notably enhance your resume (+${pointImpact} points)`;
        break;
      case ImpactLevel.MEDIUM:
        description = `Good improvement that will enhance your resume's clarity (+${pointImpact} points)`;
        break;
      default:
        description = `Minor improvement to your resume (+${pointImpact} points)`;
    }
    
    return {
      newScore,
      pointImpact,
      description,
      level
    };
  }, [state.suggestions, state.currentScore]);
  
  /**
   * Simulate the impact of applying a keyword
   */
  const simulateKeywordImpact = useCallback((index: number) => {
    // Default impact values for fallback
    const defaultResult = {
      newScore: Math.min(100, state.currentScore + 1),
      pointImpact: 1,
      description: "Adding this keyword will improve your ATS compatibility score.",
      level: ImpactLevel.LOW
    };
    
    // Check if index is valid
    if (index < 0 || index >= state.keywords.length) {
      return defaultResult;
    }
    
    // Get the actual keyword
    const keyword = state.keywords[index];
    
    // Calculate impact using resumeScoreLogic or use existing value
    let impact: number;
    let category: string;
    
    if (keyword.impact !== undefined && keyword.category) {
      impact = keyword.impact;
      category = keyword.category;
    } else {
      const analysis = analyzeKeywordImpact(keyword.text, state.editedText);
      impact = analysis.impact;
      category = analysis.category;
    }
    
    // Calculate point impact
    const pointImpact = keyword.pointImpact || 
      calculateKeywordPointImpact({...keyword, impact, category}, state.editedText);
    
    // Calculate new potential score
    const newScore = Math.min(100, state.currentScore + pointImpact);
    
    // Determine impact level
    const level = getImpactLevel(impact);
    
    // Create appropriate description based on category and impact
    let description: string;
    
    if (category === "technical" || category === "industry-specific") {
      description = `This industry-specific keyword will significantly improve your resume's ATS score (+${pointImpact} points)`;
    } else if (category === "soft-skill") {
      description = `This skill keyword will improve your resume's ATS compatibility (+${pointImpact} points)`;
    } else if (category === "action-verb") {
      description = `This action verb will enhance your resume's effectiveness (+${pointImpact} points)`;
    } else {
      description = `This keyword will improve your resume's ATS compatibility (+${pointImpact} points)`;
    }
    
    return {
      newScore,
      pointImpact,
      description,
      level
    };
  }, [state.keywords, state.currentScore, state.editedText]);
  
  /**
   * Get impact level from numeric value
   */
  const getImpactLevel = useCallback((impact: number): ImpactLevel => {
    if (impact >= 0.8) return ImpactLevel.CRITICAL;
    if (impact >= 0.6) return ImpactLevel.HIGH;
    if (impact >= 0.4) return ImpactLevel.MEDIUM;
    return ImpactLevel.LOW;
  }, []);
  
  /**
   * Calculate applied improvements points
   */
  const calculateAppliedImprovements = useMemo(() => {
    // Calculate points from applied suggestions
    const suggestionPoints = state.suggestions
      .filter(s => s.isApplied)
      .reduce((sum, s) => sum + (s.pointImpact || calculateSuggestionPointImpact(s)), 0);
    
    // Calculate points from applied keywords
    const keywordPoints = state.keywords
      .filter(k => k.isApplied)
      .reduce((sum, k) => sum + (k.pointImpact || calculateKeywordPointImpact(k, state.editedText)), 0);
    
    return {
      suggestionPoints,
      keywordPoints,
      totalPoints: suggestionPoints + keywordPoints
    };
  }, [state.suggestions, state.keywords, state.editedText]);
  
  /**
   * Calculate potential additional points
   */
  const calculatePotentialImprovements = useMemo(() => {
    // Calculate potential from unapplied suggestions
    const potentialSuggestionPoints = state.suggestions
      .filter(s => !s.isApplied)
      .reduce((sum, s) => sum + (s.pointImpact || calculateSuggestionPointImpact(s)), 0);
    
    // Calculate potential from unapplied keywords
    const potentialKeywordPoints = state.keywords
      .filter(k => !k.isApplied)
      .reduce((sum, k) => sum + (k.pointImpact || calculateKeywordPointImpact(k, state.editedText)), 0);
    
    // Apply diminishing returns for large numbers of improvements
    const totalImprovements = state.suggestions.length + state.keywords.length;
    const diminishingFactor = 1 / (1 + (totalImprovements / 20));
    
    const totalPotentialPoints = (potentialSuggestionPoints + potentialKeywordPoints) * diminishingFactor;
    
    return {
      suggestionPoints: potentialSuggestionPoints,
      keywordPoints: potentialKeywordPoints,
      totalPoints: Math.round(totalPotentialPoints)
    };
  }, [state.suggestions, state.keywords, state.editedText]);
  
  /**
   * Generate a detailed score breakdown
   */
  const generateScoreBreakdown = useMemo((): ScoreBreakdown => {
    // Get points from applied improvements
    const { suggestionPoints, keywordPoints } = calculateAppliedImprovements;
    
    // Get potential additional points
    const { totalPoints: potentialPoints } = calculatePotentialImprovements;
    
    // Calculate total score (capped at 100)
    const total = Math.min(100, state.originalScore + suggestionPoints + keywordPoints);
    
    // Calculate potential maximum score
    const potential = Math.min(100, total + potentialPoints);
    
    // Generate section scores
    const sectionScores: Record<string, number> = {};
    
    // For each section defined in SECTION_WEIGHTS, calculate a score
    Object.keys(SECTION_WEIGHTS).forEach(sectionId => {
      const hasSection = state.editedText.includes(`id="${sectionId}"`) || 
                        state.editedText.includes(`data-section="${sectionId}"`);
      
      sectionScores[sectionId] = hasSection ? 70 : 0;
    });
    
    return {
      base: state.originalScore,
      suggestions: suggestionPoints,
      keywords: keywordPoints,
      total,
      potential,
      sectionScores
    };
  }, [
    state.originalScore, 
    state.editedText, 
    calculateAppliedImprovements, 
    calculatePotentialImprovements
  ]);
  
  /**
   * Get improvement metrics for display
   */
  const getImprovementMetrics = useMemo(() => {
    // Calculate improvement from original score
    const improvementPoints = Math.round((state.currentScore - state.originalScore) * 10) / 10;
    
    // Calculate potential remaining improvement
    const { totalPoints: potentialPoints } = calculatePotentialImprovements;
    const remainingPotential = Math.round(potentialPoints * 10) / 10;
    
    return {
      improvementPoints,
      remainingPotential,
      isImproved: improvementPoints > 0
    };
  }, [state.currentScore, state.originalScore, calculatePotentialImprovements]);
  
  return {
    simulateSuggestionImpact,
    simulateKeywordImpact,
    getImpactLevel,
    generateScoreBreakdown,
    getImprovementMetrics,
    calculateAppliedImprovements,
    calculatePotentialImprovements
  };
}