/**
 * Resume Score Service
 * 
 * This service centralizes all score management operations for the resume optimizer.
 * It provides a clean API for calculating, updating, and simulating ATS scores.
 * 
 * The service uses the core calculations from resumeScoreLogic.ts but adds
 * state management and business logic on top.
 */

import * as ScoreLogic from './resumeScoreLogic';
import { Suggestion, Keyword, ScoreBreakdown, ImpactLevel } from './resumeScoreLogic';

/**
 * Configuration interface for score manager
 */
export interface ScoreManagerConfig {
  // Optional callback when score changes
  onScoreChange?: (score: number) => void;
  
  // Whether to log detailed debug information
  debug?: boolean;
}

/**
 * Resume Score Manager Service
 * 
 * This class provides a centralized service for managing resume score calculations,
 * suggestion and keyword impact, and score simulations.
 */
export class ResumeScoreService {
  // Current state
  private baseScore: number;
  private currentScore: number;
  private resumeContent: string;
  private suggestions: Suggestion[];
  private keywords: Keyword[];
  private scoreBreakdown: ScoreBreakdown | null = null;
  
  // Configuration
  private config: ScoreManagerConfig;
  
  /**
   * Constructor
   * 
   * @param baseScore - Initial ATS score (before any optimizations)
   * @param resumeContent - Current resume HTML content
   * @param suggestions - List of available suggestions
   * @param keywords - List of available keywords
   * @param config - Optional configuration
   */
  constructor(
    baseScore: number, 
    resumeContent: string, 
    suggestions: Suggestion[] = [], 
    keywords: Keyword[] = [],
    config: ScoreManagerConfig = {}
  ) {
    this.baseScore = baseScore;
    this.currentScore = baseScore;
    this.resumeContent = resumeContent;
    this.suggestions = this.processSuggestions(suggestions);
    this.keywords = this.processKeywords(keywords);
    this.config = config;
    
    // Calculate initial score breakdown
    this.recalculateScore();
    
    if (this.config.debug) {
      console.log('ResumeScoreService initialized with:', {
        baseScore,
        currentScore: this.currentScore,
        suggestionsCount: suggestions.length,
        keywordsCount: keywords.length
      });
    }
  }
  
  /**
   * Pre-process suggestions to calculate their impact scores and point values
   * 
   * @param suggestions - Raw suggestions array
   * @returns Processed suggestions with impact scores and point values
   */
  private processSuggestions(suggestions: Suggestion[]): Suggestion[] {
    return ScoreLogic.processSuggestions(suggestions);
  }
  
  /**
   * Pre-process keywords to calculate their impact values
   * 
   * @param keywords - Raw keywords array
   * @returns Processed keywords with impact values
   */
  private processKeywords(keywords: Keyword[]): Keyword[] {
    return ScoreLogic.processKeywords(keywords, this.resumeContent);
  }
  
  /**
   * Recalculate the current score based on applied suggestions and keywords
   */
  private recalculateScore(): void {
    this.scoreBreakdown = ScoreLogic.calculateDetailedAtsScore(
      this.baseScore,
      this.suggestions,
      this.keywords,
      this.resumeContent
    );
    
    this.currentScore = this.scoreBreakdown.total;
    
    // Trigger callback if provided
    if (this.config.onScoreChange) {
      this.config.onScoreChange(this.currentScore);
    }
    
    if (this.config.debug) {
      console.log('Score recalculated:', {
        baseScore: this.baseScore,
        currentScore: this.currentScore,
        suggestionPoints: this.scoreBreakdown.suggestions,
        keywordPoints: this.scoreBreakdown.keywords,
        potential: this.scoreBreakdown.potential
      });
    }
  }
  
  /**
   * Update the service state with new data
   * 
   * @param baseScore - New base score
   * @param resumeContent - New resume content
   * @param suggestions - New suggestions array
   * @param keywords - New keywords array
   */
  public updateState(
    baseScore?: number,
    resumeContent?: string,
    suggestions?: Suggestion[],
    keywords?: Keyword[]
  ): void {
    let stateChanged = false;
    
    if (baseScore !== undefined && baseScore !== this.baseScore) {
      this.baseScore = baseScore;
      stateChanged = true;
    }
    
    if (resumeContent !== undefined && resumeContent !== this.resumeContent) {
      this.resumeContent = resumeContent;
      stateChanged = true;
    }
    
    if (suggestions !== undefined) {
      this.suggestions = this.processSuggestions(suggestions);
      stateChanged = true;
    }
    
    if (keywords !== undefined) {
      this.keywords = this.processKeywords(keywords);
      stateChanged = true;
    }
    
    if (stateChanged) {
      this.recalculateScore();
    }
  }
  
  /**
   * Get the current score breakdown
   * 
   * @returns Detailed score breakdown or null if not calculated
   */
  public getScoreBreakdown(): ScoreBreakdown | null {
    return this.scoreBreakdown;
  }
  
  /**
   * Get the current ATS score
   * 
   * @returns Current score (0-100)
   */
  public getCurrentScore(): number {
    return this.currentScore;
  }
  
  /**
   * Get the base score (before optimizations)
   * 
   * @returns Base score (0-100)
   */
  public getBaseScore(): number {
    return this.baseScore;
  }
  
  /**
   * Get the potential maximum score if all suggestions and keywords were applied
   * 
   * @returns Potential maximum score (0-100)
   */
  public getPotentialScore(): number {
    return this.scoreBreakdown?.potential || this.currentScore;
  }
  
  /**
   * Apply or unapply a suggestion
   * 
   * @param index - Index of the suggestion in the suggestions array
   * @returns New score after applying the suggestion
   */
  public applySuggestion(index: number): number {
    if (index < 0 || index >= this.suggestions.length) {
      if (this.config.debug) {
        console.warn(`Invalid suggestion index: ${index}`);
      }
      return this.currentScore;
    }
    
    // Toggle the suggestion's applied state
    this.suggestions[index] = {
      ...this.suggestions[index],
      isApplied: !this.suggestions[index].isApplied
    };
    
    // Recalculate the score
    this.recalculateScore();
    
    return this.currentScore;
  }
  
  /**
   * Apply or unapply a keyword
   * 
   * @param index - Index of the keyword in the keywords array
   * @returns New score after applying the keyword
   */
  public applyKeyword(index: number): number {
    if (index < 0 || index >= this.keywords.length) {
      if (this.config.debug) {
        console.warn(`Invalid keyword index: ${index}`);
      }
      return this.currentScore;
    }
    
    // Toggle the keyword's applied state
    this.keywords[index] = {
      ...this.keywords[index],
      applied: !this.keywords[index].applied
    };
    
    // Recalculate the score
    this.recalculateScore();
    
    return this.currentScore;
  }
  
  /**
   * Calculate the impact of applying a specific suggestion without actually applying it
   * 
   * @param index - Index of the suggestion in the suggestions array
   * @returns Simulated score and point impact
   */
  public simulateSuggestionImpact(index: number): { 
    newScore: number; 
    pointImpact: number;
    description: string;
  } {
    if (index < 0 || index >= this.suggestions.length) {
      return { newScore: this.currentScore, pointImpact: 0, description: 'Invalid suggestion' };
    }
    
    const suggestion = this.suggestions[index];
    
    // Don't simulate if already applied
    if (suggestion.isApplied) {
      return { 
        newScore: this.currentScore, 
        pointImpact: 0,
        description: 'Already applied' 
      };
    }
    
    // Get point impact for this suggestion
    const pointImpact = suggestion.pointImpact || 
      ScoreLogic.calculateSuggestionPointImpact(suggestion);
    
    // Create a temporary copy of suggestions with this one applied
    const tempSuggestions = [...this.suggestions];
    tempSuggestions[index] = { ...suggestion, isApplied: true };
    
    // Calculate simulated score
    const simulatedBreakdown = ScoreLogic.calculateDetailedAtsScore(
      this.baseScore,
      tempSuggestions,
      this.keywords,
      this.resumeContent
    );
    
    // Get impact description
    const description = ScoreLogic.getSuggestionImpactDescription(suggestion);
    
    return {
      newScore: simulatedBreakdown.total,
      pointImpact,
      description
    };
  }
  
  /**
   * Calculate the impact of applying a specific keyword without actually applying it
   * 
   * @param index - Index of the keyword in the keywords array
   * @returns Simulated score and point impact
   */
  public simulateKeywordImpact(index: number): { 
    newScore: number; 
    pointImpact: number;
    description: string;
  } {
    if (index < 0 || index >= this.keywords.length) {
      return { newScore: this.currentScore, pointImpact: 0, description: 'Invalid keyword' };
    }
    
    const keyword = this.keywords[index];
    
    // Don't simulate if already applied
    if (keyword.applied) {
      return { 
        newScore: this.currentScore, 
        pointImpact: 0,
        description: 'Already applied' 
      };
    }
    
    // Get point impact for this keyword
    const pointImpact = keyword.pointImpact || 
      ScoreLogic.calculateKeywordPointImpact(keyword, this.resumeContent);
    
    // Create a temporary copy of keywords with this one applied
    const tempKeywords = [...this.keywords];
    tempKeywords[index] = { ...keyword, applied: true };
    
    // Calculate simulated score
    const simulatedBreakdown = ScoreLogic.calculateDetailedAtsScore(
      this.baseScore,
      this.suggestions,
      tempKeywords,
      this.resumeContent
    );
    
    // Get impact description
    const description = ScoreLogic.getKeywordImpactDescription(keyword, this.resumeContent);
    
    return {
      newScore: simulatedBreakdown.total,
      pointImpact,
      description
    };
  }
  
  /**
   * Apply all suggestions at once
   * 
   * @returns New score after applying all suggestions
   */
  public applyAllSuggestions(): number {
    // Set all suggestions to applied
    this.suggestions = this.suggestions.map(suggestion => ({
      ...suggestion,
      isApplied: true
    }));
    
    // Recalculate the score
    this.recalculateScore();
    
    return this.currentScore;
  }
  
  /**
   * Apply all keywords at once
   * 
   * @returns New score after applying all keywords
   */
  public applyAllKeywords(): number {
    // Set all keywords to applied
    this.keywords = this.keywords.map(keyword => ({
      ...keyword,
      applied: true
    }));
    
    // Recalculate the score
    this.recalculateScore();
    
    return this.currentScore;
  }
  
  /**
   * Reset all suggestions and keywords to unapplied
   * 
   * @returns New score after resetting all optimizations
   */
  public resetAllChanges(): number {
    // Set all suggestions to unapplied
    this.suggestions = this.suggestions.map(suggestion => ({
      ...suggestion,
      isApplied: false
    }));
    
    // Set all keywords to unapplied
    this.keywords = this.keywords.map(keyword => ({
      ...keyword,
      applied: false
    }));
    
    // Recalculate the score
    this.recalculateScore();
    
    return this.currentScore;
  }
  
  /**
   * Get all applied suggestions
   * 
   * @returns Array of applied suggestions
   */
  public getAppliedSuggestions(): Suggestion[] {
    return this.suggestions.filter(suggestion => suggestion.isApplied);
  }
  
  /**
   * Get all applied keywords
   * 
   * @returns Array of applied keywords
   */
  public getAppliedKeywords(): Keyword[] {
    return this.keywords.filter(keyword => keyword.applied);
  }
  
  /**
   * Get detailed impact information for a specific suggestion
   * 
   * @param index - Index of the suggestion in the suggestions array
   * @returns Detailed impact information
   */
  public getSuggestionImpactDetails(index: number): {
    score: number;
    pointImpact: number;
    level: ImpactLevel;
    description: string;
  } {
    if (index < 0 || index >= this.suggestions.length) {
      return {
        score: 0,
        pointImpact: 0,
        level: ImpactLevel.LOW,
        description: 'Invalid suggestion'
      };
    }
    
    const suggestion = this.suggestions[index];
    const impactScore = suggestion.score || ScoreLogic.analyzeSuggestionImpact(suggestion);
    const pointImpact = suggestion.pointImpact || 
      ScoreLogic.calculateSuggestionPointImpact({ ...suggestion, score: impactScore });
    
    // Convert score (1-10) to impact level (0.0-1.0)
    const normalizedImpact = impactScore / 10;
    const level = ScoreLogic.getImpactLevel(normalizedImpact);
    
    // Get description
    const description = ScoreLogic.getSuggestionImpactDescription(suggestion);
    
    return {
      score: impactScore,
      pointImpact,
      level,
      description
    };
  }
  
  /**
   * Get detailed impact information for a specific keyword
   * 
   * @param index - Index of the keyword in the keywords array
   * @returns Detailed impact information
   */
  public getKeywordImpactDetails(index: number): {
    impact: number;
    pointImpact: number;
    level: ImpactLevel;
    description: string;
    category: string;
  } {
    if (index < 0 || index >= this.keywords.length) {
      return {
        impact: 0,
        pointImpact: 0,
        level: ImpactLevel.LOW,
        description: 'Invalid keyword',
        category: 'unknown'
      };
    }
    
    const keyword = this.keywords[index];
    
    // Get or calculate impact
    let impact: number;
    let category: string;
    
    if (keyword.impact !== undefined && keyword.category !== undefined) {
      impact = keyword.impact;
      category = keyword.category;
    } else {
      const analysis = ScoreLogic.analyzeKeywordImpact(keyword.text, this.resumeContent);
      impact = analysis.impact;
      category = analysis.category;
    }
    
    const pointImpact = keyword.pointImpact || 
      ScoreLogic.calculateKeywordPointImpact({ ...keyword, impact, category }, this.resumeContent);
    
    const level = ScoreLogic.getImpactLevel(impact);
    const description = ScoreLogic.getKeywordImpactDescription(
      { ...keyword, impact, category },
      this.resumeContent
    );
    
    return {
      impact,
      pointImpact,
      level,
      description,
      category
    };
  }
  
  /**
   * Get all suggestions with their impact details
   * 
   * @returns Array of suggestions with impact details
   */
  public getSuggestionsWithImpact(): Array<Suggestion & {
    level: ImpactLevel;
    description: string;
  }> {
    return this.suggestions.map((suggestion, index) => {
      const { level, description } = this.getSuggestionImpactDetails(index);
      return {
        ...suggestion,
        level,
        description
      };
    });
  }
  
  /**
   * Get all keywords with their impact details
   * 
   * @returns Array of keywords with impact details
   */
  public getKeywordsWithImpact(): Array<Keyword & {
    level: ImpactLevel;
    description: string;
  }> {
    return this.keywords.map((keyword, index) => {
      const { level, description } = this.getKeywordImpactDetails(index);
      return {
        ...keyword,
        level,
        description
      };
    });
  }
  
  /**
   * Update the resume content and recalculate scores
   * 
   * @param content - New resume content
   * @returns New score after updating content
   */
  public updateContent(content: string): number {
    if (content === this.resumeContent) {
      return this.currentScore; // No change
    }
    
    this.resumeContent = content;
    
    // Recalculate keyword impacts since they depend on content
    this.keywords = this.processKeywords(this.keywords);
    
    // Recalculate the score
    this.recalculateScore();
    
    return this.currentScore;
  }

  /**
   * Update the base score directly
   * This method allows direct updating of the base score from an external source (like API)
   * It should be used when a specific score value needs to take precedence over calculated values
   * 
   * @param newBaseScore - The new base score to use
   * @returns The new current score after update
   */
  public updateBaseScore(newBaseScore: number): number {
    // Validate input to prevent invalid scores
    if (isNaN(newBaseScore) || newBaseScore < 0 || newBaseScore > 100) {
      console.warn("Invalid base score value:", newBaseScore);
      return this.currentScore;
    }
    
    console.log(`Directly updating base score from ${this.baseScore} to ${newBaseScore}`);
    
    // Update the base score
    this.baseScore = newBaseScore;

    // IMPORTANT: Update the current score directly to match the new base score
    // This ensures the API score takes precedence
    this.currentScore = newBaseScore;
    
    // Recalculate the current score with the new base score
    // This ensures all suggestion and keyword effects are still applied
    this.recalculateScore();
    
    // Return the new current score
    return this.currentScore;
  }
}