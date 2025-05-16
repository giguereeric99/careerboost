/**
 * Types related to resume keywords
 * 
 * This module contains type definitions for keywords and their related features
 * including categorization, impact analysis, and UI component props.
 */

import { LucideIcon } from "lucide-react";
import { ImpactLevel } from '@/services/resumeScoreLogic';

/**
 * Keyword data structure
 * Represents a skill, technology, or term that enhances resume relevance
 */
export interface Keyword {
  id?: string;            // Unique identifier for the keyword
  text: string;           // The keyword text
  isApplied?: boolean;    // Whether the keyword has been applied
  applied?: boolean;      // Alternative field for compatibility with existing code
  impact?: number;        // Impact score (0.0-1.0)
  category?: string;      // Category (technical, soft skill, industry-specific)
  pointImpact?: number;   // Point impact on overall score
  relevance?: number;     // Relevance score (0.0-1.0)
}

/**
 * Keyword category definition
 * Used for grouping and displaying keywords by type
 */
export interface KeywordCategory {
  type: string;           // Category identifier
  title: string;          // Display title
  description: string;    // Description of this category
  icon?: LucideIcon;      // Optional icon component
}

/**
 * Keyword impact data
 * Analysis of how applying a keyword affects the resume's ATS score
 */
export interface KeywordImpact {
  newScore: number;       // Projected new score
  pointImpact: number;    // Point impact
  description: string;    // Impact description
  level?: ImpactLevel;    // Impact level category
}

/**
 * Props for KeywordsList component
 * Configuration for the keywords UI component
 */
export interface KeywordsListProps {
  keywords: Keyword[];                           // Available keywords
  onKeywordApply: (index: number) => void;       // Handler for applying keywords
  resumeContent?: string;                        // Current resume content
  showImpactDetails?: boolean;                   // Whether to show detailed impact info
  needsRegeneration?: boolean;                   // Whether changes need regeneration
  currentScore?: number;                         // Current ATS score
  isEditing?: boolean;                           // Whether the resume is in edit mode
  simulateKeywordImpact?: (index: number) => KeywordImpact; // Function to simulate impact
  
  // Enhanced props for useResumeScore integration
  appliedKeywordPoints?: number;                 // Total points from applied keywords
  potentialKeywordPoints?: number;               // Total potential points from all keywords
  cumulativeImpactValues?: any;                  // Score breakdown from useResumeScore
}