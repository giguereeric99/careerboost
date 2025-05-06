/**
 * Resume Score Logic Module
 * 
 * This module provides core calculation functions for the resume ATS score system.
 * It contains pure functions that don't depend on React state or UI components.
 * 
 * Key features:
 * - Impact analysis for suggestions and keywords
 * - Score calculation algorithms
 * - Impact level definitions and categorization
 */

// Define types for optimization elements
export interface Suggestion {
  id?: string;           // Database ID if available
  type: string;          // Type of suggestion (structure, content, etc.)
  text: string;          // The suggestion text
  impact: string;        // Description of the impact
  isApplied?: boolean;   // Whether the suggestion has been applied
  score?: number;        // Impact score (1-10)
  section?: string;      // Target section for the suggestion
  pointImpact?: number;  // Calculated point impact on ATS score
}

export interface Keyword {
  text: string;          // The keyword text
  applied: boolean;      // Whether the keyword has been applied
  impact?: number;       // Impact score (0.0-1.0)
  category?: string;     // Category (technical, soft skill, industry-specific)
  pointImpact?: number;  // Calculated point impact on ATS score
}

export interface ScoreBreakdown {
  base: number;          // Base score from initial AI assessment
  suggestions: number;   // Points from applied suggestions
  keywords: number;      // Points from applied keywords
  total: number;         // Total calculated score
  potential: number;     // Maximum possible score with all items applied
  sectionScores: {       // Individual scores for each resume section
    [key: string]: number;
  };
}

/**
 * Impact level definitions for suggestions and keywords
 */
export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Maps impact words in suggestion descriptions to numerical values
 */
const IMPACT_KEYWORDS = {
  'critical': 10,
  'crucial': 9,
  'essential': 9,
  'significant': 8,
  'substantial': 8,
  'major': 7,
  'important': 7,
  'considerable': 6,
  'notable': 6,
  'moderate': 5,
  'helpful': 4,
  'useful': 4,
  'minor': 3,
  'small': 2,
  'slight': 1,
  'minimal': 1
};

/**
 * Weight factors for different suggestion types
 * These determine how much each suggestion type impacts the overall score
 */
const SUGGESTION_TYPE_WEIGHTS = {
  'structure': 0.8,   // Structure suggestions have high impact
  'content': 0.7,     // Content suggestions have medium-high impact
  'skills': 0.9,      // Skills suggestions have very high impact
  'formatting': 0.5,  // Formatting suggestions have medium impact
  'language': 0.4,    // Language suggestions have lower-medium impact
  'keywords': 0.8,    // Keyword suggestions have high impact
  'ats': 0.9          // Direct ATS improvements have very high impact
};

/**
 * Weight factors for different keyword categories
 */
const KEYWORD_CATEGORY_WEIGHTS = {
  'technical': 0.9,         // Technical skills have highest impact
  'industry-specific': 0.8, // Industry terms have high impact
  'soft-skill': 0.6,        // Soft skills have medium impact
  'action-verb': 0.5,       // Action verbs have medium impact
  'general': 0.4            // General terms have lower impact
};

/**
 * Sections with their importance weight for ATS scoring
 * Different sections have different impacts on the overall ATS score
 */
export const SECTION_WEIGHTS = {
  'resume-experience': 0.30,    // Experience is typically most important
  'resume-skills': 0.25,        // Skills are highly relevant
  'resume-education': 0.15,     // Education is important but less than experience
  'resume-summary': 0.10,       // Professional summary sets the tone
  'resume-projects': 0.07,      // Projects demonstrate practical skills
  'resume-certifications': 0.05, // Certifications validate skills
  'resume-languages': 0.03,     // Languages can be important in global positions
  'resume-awards': 0.02,        // Awards demonstrate excellence
  'resume-publications': 0.01,  // Publications show expertise in some fields
  'resume-volunteering': 0.01,  // Volunteering shows character
  'resume-additional': 0.005,   // Additional information can be relevant
  'resume-interests': 0.005     // Interests are less important for ATS
};

/**
 * Analyzes a suggestion's impact description to determine a numerical score
 * 
 * @param suggestion - The suggestion object
 * @returns Impact score from 1-10
 */
export function analyzeSuggestionImpact(suggestion: Suggestion): number {
  // Default score based on suggestion type
  const typeWeight = SUGGESTION_TYPE_WEIGHTS[suggestion.type] || 0.6;
  let baseScore = Math.round(typeWeight * 10);
  
  // Check the impact text for keywords that indicate importance
  const impactText = suggestion.impact.toLowerCase();
  
  // Look for impact keywords in the description
  for (const [keyword, value] of Object.entries(IMPACT_KEYWORDS)) {
    if (impactText.includes(keyword)) {
      // Adjust base score based on the keyword found
      const adjustment = (value - baseScore) * 0.5;
      baseScore += adjustment;
      // We found a keyword, no need to continue checking
      break;
    }
  }
  
  // Check for quantifiable metrics which indicate high impact
  if (/\d+%|\d+ percent|doubles|triples|increases by \d+/i.test(impactText)) {
    baseScore += 1;
  }
  
  // Check for ATS-specific mentions which are important
  if (/ats|applicant tracking|parser|algorithm|scan/i.test(impactText)) {
    baseScore += 1;
  }
  
  // Return score clamped to valid range
  return Math.max(1, Math.min(10, Math.round(baseScore)));
}

/**
 * Categorizes a keyword and determines its impact value
 * 
 * @param keyword - The keyword text
 * @param resumeContent - Current resume content
 * @returns Object with category and impact value
 */
export function analyzeKeywordImpact(
  keyword: string, 
  resumeContent: string
): { category: string; impact: number } {
  // Check if keyword already exists in resume (case insensitive)
  const keywordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const keywordExists = keywordRegex.test(resumeContent);
  
  // Determine keyword category
  let category = 'general';
  
  // Technical skills often include technical terms, programming languages, tools
  if (/\b(api|sdk|framework|language|programming|software|hardware|tool|platform|database|system|algorithm|analysis|design|development|engineering|implementation|integration|interface|methodology|application|architecture|automation)\b/i.test(keyword)) {
    category = 'technical';
  } 
  // Soft skills focus on interpersonal and character traits
  else if (/\b(communication|leadership|teamwork|collaboration|problem.solving|adaptability|creativity|critical.thinking|time.management|flexibility|organization|attention.to.detail|interpersonal|management|coordination|facilitation)\b/i.test(keyword)) {
    category = 'soft-skill';
  }
  // Action verbs typically start sentences in bullet points
  else if (/\b(managed|developed|created|implemented|designed|led|coordinated|achieved|improved|increased|decreased|reduced|launched|delivered|established|generated|negotiated|resolved|transformed)\b/i.test(keyword)) {
    category = 'action-verb';
  }
  // Industry-specific terms often include specific domain knowledge
  else if (/\b(compliance|regulation|protocol|industry.standard|certification|methodology|framework|best.practice)\b/i.test(keyword)) {
    category = 'industry-specific';
  }
  
  // Calculate impact based on category and existence
  const categoryWeight = KEYWORD_CATEGORY_WEIGHTS[category] || 0.5;
  const existingPenalty = keywordExists ? 0.3 : 0.0; // Lower impact if already exists
  
  const impact = Math.min(1.0, Math.max(0.1, categoryWeight - existingPenalty));
  
  return { category, impact };
}

/**
 * Maps a numerical impact score to a descriptive impact level
 * 
 * @param impactScore - Numerical impact score
 * @returns Impact level enum value
 */
export function getImpactLevel(impactScore: number): ImpactLevel {
  if (impactScore >= 0.8) return ImpactLevel.CRITICAL;
  if (impactScore >= 0.6) return ImpactLevel.HIGH;
  if (impactScore >= 0.4) return ImpactLevel.MEDIUM;
  return ImpactLevel.LOW;
}

/**
 * Calculates the point impact a suggestion will have on ATS score when applied
 * 
 * @param suggestion - The suggestion object
 * @returns Number of points the suggestion will add to ATS score
 */
export function calculateSuggestionPointImpact(suggestion: Suggestion): number {
  // Calculate impact score if not already present
  const impactScore = suggestion.score || analyzeSuggestionImpact(suggestion);
  
  // Calculate base point value (0.1 to 3.0)
  const basePoints = (impactScore / 10) * 3;
  
  // Get weight based on suggestion type
  const typeWeight = SUGGESTION_TYPE_WEIGHTS[suggestion.type] || 0.6;
  
  // Calculate final points with diminishing returns formula
  return Math.round((basePoints * typeWeight * 10)) / 10;
}

/**
 * Calculates the point impact a keyword will have on ATS score when applied
 * 
 * @param keyword - The keyword object or string
 * @param resumeContent - Current resume content
 * @returns Number of points the keyword will add to ATS score
 */
export function calculateKeywordPointImpact(
  keyword: Keyword | string, 
  resumeContent: string
): number {
  // Handle both string and object formats
  const keywordText = typeof keyword === 'string' ? keyword : keyword.text;
  
  // Get impact value, either from object or by analyzing
  let impact: number;
  if (typeof keyword === 'string' || keyword.impact === undefined) {
    impact = analyzeKeywordImpact(keywordText, resumeContent).impact;
  } else {
    impact = keyword.impact;
  }
  
  // Calculate point impact (0.1 to 2.0 points per keyword)
  return Math.round((impact * 2) * 10) / 10;
}

/**
 * Evaluates sections in resume content to determine section-based scores
 * 
 * @param resumeContent - HTML content of the resume
 * @returns Object with scores for each section
 */
export function evaluateResumeSections(resumeContent: string): { [key: string]: number } {
  const sectionScores: { [key: string]: number } = {};
  
  // If we're in a browser environment, use DOMParser
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(resumeContent, 'text/html');
    
    // Evaluate each section based on common section IDs
    Object.keys(SECTION_WEIGHTS).forEach((sectionId) => {
      const section = doc.getElementById(sectionId);
      if (!section) {
        // Section doesn't exist
        sectionScores[sectionId] = 0;
        return;
      }
      
      const content = section.textContent || '';
      
      // Base score just for having the section
      let sectionScore = 50;
      
      // Content length factors into quality (up to a point)
      const contentLength = content.length;
      if (contentLength > 500) sectionScore += 15;
      else if (contentLength > 200) sectionScore += 10;
      else if (contentLength > 100) sectionScore += 5;
      
      // Check for bullet points which are good for ATS
      const bulletPoints = (section.querySelectorAll('li').length > 0);
      if (bulletPoints) sectionScore += 10;
      
      // Check for quantifiable achievements (numbers, percentages)
      const hasMetrics = /\d+%|\$\d+|\d+ percent|\d+ times/i.test(content);
      if (hasMetrics) sectionScore += 15;
      
      // Cap at 100
      sectionScores[sectionId] = Math.min(100, sectionScore);
    });
  } else {
    // Server-side or non-browser environment
    // Simply set default values based on presence of section titles
    Object.entries(SECTION_WEIGHTS).forEach(([sectionId, weight]) => {
      // Check if the section ID appears in the content as a marker
      const sectionExists = resumeContent.includes(`id="${sectionId}"`) || 
                           resumeContent.includes(`data-section="${sectionId}"`);
      
      sectionScores[sectionId] = sectionExists ? 70 : 0; // Default score if section exists
    });
  }
  
  return sectionScores;
}

/**
 * Calculates the potential increase in ATS score based on remaining suggestions and keywords
 * 
 * @param suggestions - Array of suggestions
 * @param keywords - Array of keywords
 * @param resumeContent - Current resume content
 * @returns Potential additional points if all items were applied
 */
export function calculatePotentialPoints(
  suggestions: Suggestion[],
  keywords: Keyword[],
  resumeContent: string
): number {
  let potentialPoints = 0;
  
  // Calculate potential from unapplied suggestions
  suggestions.forEach(suggestion => {
    if (!suggestion.isApplied) {
      potentialPoints += calculateSuggestionPointImpact(suggestion);
    }
  });
  
  // Calculate potential from unapplied keywords
  keywords.forEach(keyword => {
    if (!keyword.applied) {
      potentialPoints += calculateKeywordPointImpact(keyword, resumeContent);
    }
  });
  
  // Apply diminishing returns for large numbers of improvements
  const totalImprovements = suggestions.length + keywords.length;
  const diminishingFactor = 1 / (1 + (totalImprovements / 20));
  
  return Math.round(potentialPoints * diminishingFactor);
}

/**
 * Processes suggestions array to ensure all have impact scores
 * and are properly evaluated
 * 
 * @param suggestions - Array of suggestions
 * @returns Processed suggestions with impact scores
 */
export function processSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return suggestions.map(suggestion => {
    const score = suggestion.score || analyzeSuggestionImpact(suggestion);
    const pointImpact = suggestion.pointImpact || calculateSuggestionPointImpact({
      ...suggestion,
      score
    });
    
    return {
      ...suggestion,
      score,
      pointImpact
    };
  });
}

/**
 * Processes keywords array to ensure all have impact values and categories
 * 
 * @param keywords - Array of keywords
 * @param resumeContent - Current resume content
 * @returns Processed keywords with impact values and categories
 */
export function processKeywords(
  keywords: Keyword[], 
  resumeContent: string
): Keyword[] {
  return keywords.map(keyword => {
    if (keyword.impact !== undefined && keyword.category !== undefined && keyword.pointImpact !== undefined) {
      return keyword;
    }
    
    const { impact, category } = keyword.impact !== undefined && keyword.category !== undefined
      ? { impact: keyword.impact, category: keyword.category }
      : analyzeKeywordImpact(keyword.text, resumeContent);
    
    const pointImpact = keyword.pointImpact || calculateKeywordPointImpact({
      ...keyword,
      impact,
      category
    }, resumeContent);
    
    return {
      ...keyword,
      impact,
      category,
      pointImpact
    };
  });
}

/**
 * Calculates a detailed ATS score breakdown based on all factors
 * This is the core scoring function that brings together all aspects
 * 
 * @param baseScore - Initial ATS score from AI
 * @param suggestions - Array of suggestions (applied and unapplied)
 * @param keywords - Array of keywords (applied and unapplied)
 * @param resumeContent - Current resume content
 * @returns Detailed score breakdown object
 */
export function calculateDetailedAtsScore(
  baseScore: number,
  suggestions: Suggestion[],
  keywords: Keyword[],
  resumeContent: string
): ScoreBreakdown {
  // Process suggestions and keywords to ensure they have impact scores
  const processedSuggestions = processSuggestions(suggestions);
  const processedKeywords = processKeywords(keywords, resumeContent);
  
  // Calculate points from applied suggestions
  let suggestionPoints = 0;
  processedSuggestions.forEach(suggestion => {
    if (suggestion.isApplied) {
      const pointImpact = suggestion.pointImpact || calculateSuggestionPointImpact(suggestion);
      suggestionPoints += pointImpact;
    }
  });
  
  // Calculate points from applied keywords
  let keywordPoints = 0;
  processedKeywords.forEach(keyword => {
    if (keyword.applied) {
      const pointImpact = keyword.pointImpact || calculateKeywordPointImpact(keyword, resumeContent);
      keywordPoints += pointImpact;
    }
  });
  
  // Calculate potential additional points
  const unappliedSuggestions = processedSuggestions.filter(s => !s.isApplied);
  const unappliedKeywords = processedKeywords.filter(k => !k.applied);
  const potentialPoints = calculatePotentialPoints(
    unappliedSuggestions,
    unappliedKeywords,
    resumeContent
  );
  
  // Evaluate sections
  const sectionScores = evaluateResumeSections(resumeContent);
  
  // Apply diminishing returns for higher scores
  // The closer to 100, the harder it is to improve further
  const diminishingFactor = Math.max(0.1, 1 - (baseScore / 120));
  
  // Round suggestion and keyword points for cleaner display
  const roundedSuggestionPoints = Math.round(suggestionPoints * diminishingFactor);
  const roundedKeywordPoints = Math.round(keywordPoints * diminishingFactor);
  
  // Calculate total score with ceiling at 100
  const totalScore = Math.min(100, Math.round(
    baseScore + roundedSuggestionPoints + roundedKeywordPoints
  ));
  
  // Calculate potential maximum score
  const potentialScore = Math.min(100, totalScore + potentialPoints);
  
  return {
    base: baseScore,
    suggestions: roundedSuggestionPoints,
    keywords: roundedKeywordPoints,
    total: totalScore,
    potential: potentialScore,
    sectionScores
  };
}

/**
 * Get a description of what impact applying a suggestion would have
 * 
 * @param suggestion - The suggestion object
 * @returns String description of the suggestion's impact
 */
export function getSuggestionImpactDescription(suggestion: Suggestion): string {
  const impactScore = suggestion.score || analyzeSuggestionImpact(suggestion);
  const points = suggestion.pointImpact || calculateSuggestionPointImpact({
    ...suggestion,
    score: impactScore
  });
  
  if (impactScore >= 8) {
    return `Critical improvement (+${points} points)`;
  } else if (impactScore >= 6) {
    return `Major improvement (+${points} points)`;
  } else if (impactScore >= 4) {
    return `Good improvement (+${points} points)`;
  } else {
    return `Minor improvement (+${points} points)`;
  }
}

/**
 * Get a description of what impact applying a keyword would have
 * 
 * @param keyword - The keyword object
 * @param resumeContent - Current resume content
 * @returns String description of the keyword's impact
 */
export function getKeywordImpactDescription(
  keyword: Keyword,
  resumeContent: string
): string {
  // Get impact value, either from object or by analyzing
  let impact: number;
  if (keyword.impact === undefined) {
    impact = analyzeKeywordImpact(keyword.text, resumeContent).impact;
  } else {
    impact = keyword.impact;
  }
  
  const points = keyword.pointImpact || calculateKeywordPointImpact(keyword, resumeContent);
  const level = getImpactLevel(impact);
  
  switch (level) {
    case ImpactLevel.CRITICAL:
      return `Essential keyword (+${points} points)`;
    case ImpactLevel.HIGH:
      return `High-impact keyword (+${points} points)`;
    case ImpactLevel.MEDIUM:
      return `Helpful keyword (+${points} points)`;
    case ImpactLevel.LOW:
      return `Minor keyword (+${points} points)`;
  }
}