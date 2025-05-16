/**
 * Types related to resume suggestions
 * 
 * This module contains type definitions for AI suggestions and their related features
 * including categorization, impact analysis, and UI component props.
 */

import { LucideIcon } from "lucide-react";
import { ImpactLevel } from '@/services/resumeScoreLogic';

/**
 * Interface for a suggestion type with icon
 * Used for categorizing and displaying suggestions
 */
export interface SuggestionType {
  type: string;         // Type identifier
  title: string;        // Display title
  description: string;  // Description of this type of suggestion
  icon?: LucideIcon;    // Optional icon component
}

/**
 * Individual optimization suggestion from AI
 * Represents an AI-generated recommendation to improve the resume
 */
export interface OptimizationSuggestion {
  id?: string;               // Unique identifier for the suggestion
  type: string;              // Category of suggestion (e.g., "summary", "experience", "skills")
  text: string;              // The actual suggestion content
  impact: string;            // Description of how this improves the resume
  isApplied?: boolean;       // Whether this suggestion has been applied to the resume
  score?: number;            // Impact score (1-10)
  pointImpact?: number;      // Point impact on overall score
  section?: string;          // Target section for this suggestion
}

/**
 * Impact data structure for a suggestion
 * Analysis of how applying a suggestion affects the resume's ATS score
 */
export interface SuggestionImpact {
  newScore: number;          // Projected new score after applying
  pointImpact: number;       // Point impact on score
  description: string;       // Impact description
  level?: ImpactLevel;       // Impact level category
}

/**
 * Props for SuggestionsList component
 * Configuration for the suggestions UI component
 */
export interface SuggestionsListProps {
  suggestions: OptimizationSuggestion[];              // Available suggestions
  isOptimizing: boolean;                              // Whether optimization is in progress
  onApplySuggestion: (index: number) => void;         // Handler for applying suggestions
  resumeContent?: string;                             // Current resume content
  showImpactScore?: boolean;                          // Whether to show impact details
  currentScore?: number;                              // Current ATS score
  simulateSuggestionImpact?: (index: number) => SuggestionImpact;  // Function to simulate impact
  isEditing?: boolean;                                // Whether the resume is in edit mode
  
  // Enhanced props for useResumeScore integration
  cumulativeImpactValues?: any;                       // Score breakdown from useResumeScore
  appliedImprovements?: {                             // Applied improvements details
    suggestionPoints: number;                         // Points from applied suggestions
    keywordPoints: number;                            // Points from applied keywords
    totalPoints: number;                              // Total improvement points
  };
}

/**
 * Cumulative impact data for multiple suggestions
 * Aggregated effect of multiple applied suggestions
 */
export interface CumulativeImpact {
  newScore: number;          // Projected new score
  pointImpact: number;       // Total point impact
  description: string;       // Impact description
  appliedCount: number;      // Number of applied items
  impactLevel?: ImpactLevel; // Overall impact level
}