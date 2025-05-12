import { IconType } from "lucide-react";
import { ImpactLevel } from '@/services/resumeScoreLogic';

/**
 * Interface for a suggestion type with icon
 */
export interface SuggestionType {
  type: string;         // Type identifier
  title: string;        // Display title
  description: string;  // Description of this type of suggestion
  icon?: IconType;      // Optional icon component
}

/**
 * Individual optimization suggestion from AI
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
 */
export interface SuggestionImpact {
  newScore: number;          // Projected new score after applying
  pointImpact: number;       // Point impact on score
  description: string;       // Impact description
}

/**
 * Props for SuggestionsList component
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
}

/**
 * Cumulative impact data for multiple suggestions
 */
export interface CumulativeImpact {
  newScore: number;          // Projected new score
  pointImpact: number;       // Total point impact
  description: string;       // Impact description
  appliedCount: number;      // Number of applied items
}