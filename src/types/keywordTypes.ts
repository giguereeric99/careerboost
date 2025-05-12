/**
 * Types related to resume keywords
 */

import { IconType } from "lucide-react";

/**
 * Keyword data structure
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
 */
export interface KeywordCategory {
  type: string;           // Category identifier
  title: string;          // Display title
  description: string;    // Description of this category
  icon?: IconType;        // Optional icon component
}

/**
 * Keyword impact data
 */
export interface KeywordImpact {
  newScore: number;       // Projected new score
  pointImpact: number;    // Point impact
  description: string;    // Impact description
}