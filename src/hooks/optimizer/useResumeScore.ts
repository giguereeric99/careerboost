/**
 * useResumeScore Hook
 * 
 * This hook manages everything related to resume ATS scoring:
 * - Calculating scores for suggestions and keywords
 * - Managing score state (original, current, modified)
 * - Providing impact analysis for suggestions and keywords
 * - Calculating potential improvements
 * - Generating detailed score breakdowns
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  analyzeSuggestionImpact, 
  calculateSuggestionPointImpact,
  analyzeKeywordImpact,
  calculateKeywordPointImpact,
  ScoreBreakdown,
  ImpactLevel,
  SECTION_WEIGHTS
} from '@/services/resumeScoreLogic';
// Import the correct types
import { Keyword } from '@/types/keywordTypes';
import { OptimizationSuggestion as Suggestion } from '@/types/suggestionTypes';

/**
 * Adapts the Keyword type from keywordTypes to match the format expected by resumeScoreLogic
 * This helper function ensures compatibility between the two different Keyword definitions
 * 
 * @param keyword - Keyword from keywordTypes
 * @returns Keyword compatible with resumeScoreLogic
 */
const adaptKeywordForScoring = (keyword: Keyword): any => {
  return {
    ...keyword,
    // Add the 'applied' property expected by resumeScoreLogic
    applied: keyword.isApplied || keyword.applied || false,
    // Ensure category and impact properties exist
    category: keyword.category || 'general',
    impact: keyword.impact !== undefined ? keyword.impact : 0.5
  };
};

/**
 * Interface for score impact simulation results
 */
export interface ImpactSimulationResult {
  newScore: number;
  pointImpact: number;
  description: string;
  level?: ImpactLevel;
}

/**
 * Interface for the useResumeScore hook parameters
 */
interface UseResumeScoreParams {
  initialScore?: number;           // Initial score after AI optimization
  resumeContent?: string;          // Current resume content for analysis
  suggestions?: Suggestion[];      // Available suggestions
  keywords?: Keyword[];            // Available keywords
  onScoreChange?: (newScore: number) => void; // Callback when score changes
}

/**
 * Custom hook for managing resume ATS scoring
 * Handles all score-related calculations and state
 */
const useResumeScore = ({
  initialScore = 65,
  resumeContent = '',
  suggestions = [],
  keywords = [],
  onScoreChange
}: UseResumeScoreParams) => {
  // ===== STATE MANAGEMENT =====
  
  // Score state
  const [originalScore, setOriginalScore] = useState<number>(initialScore);
  const [currentScore, setCurrentScore] = useState<number>(initialScore);
  const [scoreModified, setScoreModified] = useState<boolean>(false);
  
  /**
   * Sets a new base score (after initial AI optimization)
   * Used when loading resume data or after new optimization
   * 
   * @param score - New base score to set
   */
  const setBaseScore = useCallback((score: number) => {
    setOriginalScore(score);
    setCurrentScore(score);
    setScoreModified(false);
  }, []);

  /**
   * Updates the current score and tracks modification state
   * 
   * @param newScore - New score value to set
   * @param markAsModified - Whether to mark the score as modified
   */
  const updateScore = useCallback((newScore: number, markAsModified = true) => {
    // Ensure score is within valid range
    const validScore = Math.min(100, Math.max(0, newScore));
    
    // Only update if the score has actually changed
    if (validScore !== currentScore) {
      setCurrentScore(validScore);
      
      // Mark as modified if requested and actually different from original
      if (markAsModified && validScore !== originalScore) {
        setScoreModified(true);
      }
      
      // Call the onChange callback if provided
      if (onScoreChange) {
        onScoreChange(validScore);
      }
    }
  }, [currentScore, originalScore, onScoreChange]);

  /**
   * Resets the score to its original value
   * Used when cancelling edits or resetting the resume
   */
  const resetScore = useCallback(() => {
    setCurrentScore(originalScore);
    setScoreModified(false);
  }, [originalScore]);

  /**
   * Calculate impact of applying a suggestion on the ATS score
   * 
   * @param suggestion - The suggestion to analyze
   * @param isApplied - Whether the suggestion is being applied or removed
   * @returns The point impact (positive if applying, negative if removing)
   */
  const calculateSuggestionImpact = useCallback((suggestion: Suggestion, isApplied: boolean): number => {
    // Calculate impact using the imported function or use existing value
    const pointImpact = suggestion.pointImpact || calculateSuggestionPointImpact(suggestion);
    
    // Return positive value if applying, negative if removing
    return isApplied ? pointImpact : -pointImpact;
  }, []);

  /**
   * Calculate impact of applying a keyword on the ATS score
   * 
   * @param keyword - The keyword to analyze
   * @param isApplied - Whether the keyword is being applied or removed
   * @returns The point impact (positive if applying, negative if removing)
   */
  const calculateKeywordImpact = useCallback((keyword: Keyword, isApplied: boolean): number => {
    // Adapt keyword to match the format expected by resumeScoreLogic
    const adaptedKeyword = adaptKeywordForScoring(keyword);
    
    // Calculate impact using the imported function or use existing value
    const pointImpact = keyword.pointImpact || 
      calculateKeywordPointImpact(adaptedKeyword, resumeContent);
    
    // Return positive value if applying, negative if removing
    return isApplied ? pointImpact : -pointImpact;
  }, [resumeContent]);

  /**
   * Updates score when a suggestion is applied or removed
   * 
   * @param suggestion - The suggestion being applied/removed
   * @param isApplied - Whether the suggestion is being applied (true) or removed (false)
   */
  const applySuggestionScore = useCallback((suggestion: Suggestion, isApplied: boolean) => {
    // Calculate the impact of this suggestion
    const scoreDelta = calculateSuggestionImpact(suggestion, isApplied);
    
    // Update the score with this delta
    updateScore(currentScore + scoreDelta);
  }, [calculateSuggestionImpact, currentScore, updateScore]);

  /**
   * Updates score when a keyword is applied or removed
   * 
   * @param keyword - The keyword being applied/removed
   * @param isApplied - Whether the keyword is being applied (true) or removed (false)
   */
  const applyKeywordScore = useCallback((keyword: Keyword, isApplied: boolean) => {
    // Calculate the impact of this keyword
    const scoreDelta = calculateKeywordImpact(keyword, isApplied);
    
    // Update the score with this delta
    updateScore(currentScore + scoreDelta);
  }, [calculateKeywordImpact, currentScore, updateScore]);

  /**
   * Simulate the impact of applying a suggestion
   * Used to show preview impact before actually applying
   * 
   * @param suggestionIndex - Index of the suggestion in the suggestions array
   * @returns Impact simulation result object
   */
  const simulateSuggestionImpact = useCallback((suggestionIndex: number): ImpactSimulationResult => {
    // Default impact values for fallback
    const defaultResult: ImpactSimulationResult = {
      newScore: Math.min(100, currentScore + 2),
      pointImpact: 2,
      description: "This suggestion will improve your resume's clarity and impact.",
      level: ImpactLevel.MEDIUM
    };
    
    // Check if index is valid
    if (suggestionIndex < 0 || suggestionIndex >= suggestions.length) {
      return defaultResult;
    }
    
    // Get the actual suggestion
    const suggestion = suggestions[suggestionIndex];
    
    // Calculate real impact using scoring logic
    const score = suggestion.score || analyzeSuggestionImpact(suggestion);
    const pointImpact = suggestion.pointImpact || 
      calculateSuggestionPointImpact({...suggestion, score});
    
    // Calculate new potential score
    const newScore = Math.min(100, currentScore + pointImpact);
    
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
  }, [suggestions, currentScore]);

  /**
   * Simulate the impact of applying a keyword
   * Used to show preview impact before actually applying
   * 
   * @param keywordIndex - Index of the keyword in the keywords array
   * @returns Impact simulation result object
   */
  const simulateKeywordImpact = useCallback((keywordIndex: number): ImpactSimulationResult => {
    // Default impact values for fallback
    const defaultResult: ImpactSimulationResult = {
      newScore: Math.min(100, currentScore + 1),
      pointImpact: 1,
      description: "Adding this keyword will improve your ATS compatibility score.",
      level: ImpactLevel.LOW
    };
    
    // Check if index is valid
    if (keywordIndex < 0 || keywordIndex >= keywords.length) {
      return defaultResult;
    }
    
    // Get the actual keyword
    const keyword = keywords[keywordIndex];
    
    // Adapt keyword to match the format expected by resumeScoreLogic
    const adaptedKeyword = adaptKeywordForScoring(keyword);
    
    // Calculate impact using resumeScoreLogic or use existing value
    let impact: number;
    let category: string;
    
    if (adaptedKeyword.impact !== undefined && adaptedKeyword.category) {
      impact = adaptedKeyword.impact;
      category = adaptedKeyword.category;
    } else {
      const analysis = analyzeKeywordImpact(keyword.text, resumeContent);
      impact = analysis.impact;
      category = analysis.category;
    }
    
    // Calculate point impact
    const pointImpact = keyword.pointImpact || 
      calculateKeywordPointImpact({...adaptedKeyword, impact, category}, resumeContent);
    
    // Calculate new potential score
    const newScore = Math.min(100, currentScore + pointImpact);
    
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
  }, [keywords, currentScore, resumeContent]);

  /**
   * Get impact level from numeric value
   * 
   * @param impact - Impact value between 0 and 1
   * @returns Impact level enum value
   */
  const getImpactLevel = useCallback((impact: number): ImpactLevel => {
    if (impact >= 0.8) return ImpactLevel.CRITICAL;
    if (impact >= 0.6) return ImpactLevel.HIGH;
    if (impact >= 0.4) return ImpactLevel.MEDIUM;
    return ImpactLevel.LOW;
  }, []);

  /**
   * Calculate total applied improvements points
   * 
   * @returns Object with points from suggestions and keywords
   */
  const calculateAppliedImprovements = useCallback(() => {
    // Calculate points from applied suggestions
    const suggestionPoints = suggestions
      .filter(s => s.isApplied)
      .reduce((sum, s) => sum + (s.pointImpact || calculateSuggestionPointImpact(s)), 0);
    
    // Calculate points from applied keywords
    const keywordPoints = keywords
      .filter(k => k.isApplied || k.applied)
      .reduce((sum, k) => sum + (k.pointImpact || calculateKeywordPointImpact(adaptKeywordForScoring(k), resumeContent)), 0);
    
    return {
      suggestionPoints,
      keywordPoints,
      totalPoints: suggestionPoints + keywordPoints
    };
  }, [suggestions, keywords, resumeContent]);

  /**
   * Calculate potential additional points if all suggestions and keywords were applied
   * 
   * @returns Potential additional points
   */
  const calculatePotentialImprovements = useCallback(() => {
    // Calculate potential from unapplied suggestions
    const potentialSuggestionPoints = suggestions
      .filter(s => !s.isApplied)
      .reduce((sum, s) => sum + (s.pointImpact || calculateSuggestionPointImpact(s)), 0);
    
    // Calculate potential from unapplied keywords
    const potentialKeywordPoints = keywords
      .filter(k => !(k.isApplied || k.applied))
      .reduce((sum, k) => sum + (k.pointImpact || calculateKeywordPointImpact(adaptKeywordForScoring(k), resumeContent)), 0);
    
    // Apply diminishing returns for large numbers of improvements
    const totalImprovements = suggestions.length + keywords.length;
    const diminishingFactor = 1 / (1 + (totalImprovements / 20));
    
    const totalPotentialPoints = (potentialSuggestionPoints + potentialKeywordPoints) * diminishingFactor;
    
    return {
      suggestionPoints: potentialSuggestionPoints,
      keywordPoints: potentialKeywordPoints,
      totalPoints: Math.round(totalPotentialPoints)
    };
  }, [suggestions, keywords, resumeContent]);

  /**
   * Generate a detailed score breakdown
   * Used for displaying in ScoreCard component
   * 
   * @returns ScoreBreakdown object with all score components
   */
  const generateScoreBreakdown = useCallback((): ScoreBreakdown => {
    // Get points from applied improvements
    const { suggestionPoints, keywordPoints } = calculateAppliedImprovements();
    
    // Get potential additional points
    const { totalPoints: potentialPoints } = calculatePotentialImprovements();
    
    // Calculate total score (capped at 100)
    const total = Math.min(100, originalScore + suggestionPoints + keywordPoints);
    
    // Calculate potential maximum score
    const potential = Math.min(100, total + potentialPoints);
    
    // Generate placeholder section scores
    // In a real implementation, you'd analyze the content for each section
    const sectionScores: Record<string, number> = {};
    
    // For each section defined in SECTION_WEIGHTS, calculate a score
    Object.keys(SECTION_WEIGHTS).forEach(sectionId => {
      // Simple placeholder logic - in a real implementation, 
      // you would analyze the content for each section
      const hasSection = resumeContent.includes(`id="${sectionId}"`) || 
                         resumeContent.includes(`data-section="${sectionId}"`);
      
      // Assign a basic score if the section exists
      sectionScores[sectionId] = hasSection ? 70 : 0;
    });
    
    return {
      base: originalScore,
      suggestions: suggestionPoints,
      keywords: keywordPoints,
      total,
      potential,
      sectionScores
    };
  }, [originalScore, resumeContent, calculateAppliedImprovements, calculatePotentialImprovements]);

  /**
   * Calculate improvement metrics for display
   * Shows how much the score has improved from the original
   * 
   * @returns Object with improvement metrics
   */
  const getImprovementMetrics = useMemo(() => {
    // Calculate improvement from original score
    const improvementPoints = Math.round((currentScore - originalScore) * 10) / 10;
    
    // Calculate potential remaining improvement
    const { totalPoints: potentialPoints } = calculatePotentialImprovements();
    const remainingPotential = Math.round(potentialPoints * 10) / 10;
    
    return {
      improvementPoints,
      remainingPotential,
      isImproved: improvementPoints > 0
    };
  }, [currentScore, originalScore, calculatePotentialImprovements]);

  // Return the hook interface with all state values and functions
  return {
    // Score state
    originalScore,
    currentScore,
    scoreModified,
    
    // Score actions
    setBaseScore,
    updateScore,
    resetScore,
    applySuggestionScore,
    applyKeywordScore,
    
    // Impact analysis
    simulateSuggestionImpact,
    simulateKeywordImpact,
    calculateSuggestionImpact,
    calculateKeywordImpact,
    
    // Detailed scoring
    generateScoreBreakdown,
    getImprovementMetrics,
    calculatePotentialImprovements,
    calculateAppliedImprovements,
    
    // Helpers
    getImpactLevel,
    setScoreModified
  };
};

export default useResumeScore;