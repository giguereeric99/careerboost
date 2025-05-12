import { 
  Sparkles, 
  Check, 
  AlertTriangle, 
  TrendingUp, 
  BarChart2,
  MessageSquare,
  Code,
  Tag 
} from "lucide-react";
import { SuggestionType } from '@/types/suggestions';

/**
 * Define suggestion types with descriptions for better user context
 */
export const SUGGESTION_TYPES: Record<string, SuggestionType> = {
  "structure": {
    type: "structure",
    title: "Structure & Layout",
    description: "Suggestions to improve organization and formatting",
    icon: BarChart2
  },
  "content": {
    type: "content",
    title: "Content Improvement",
    description: "Suggestions to improve the quality of your content",
    icon: Sparkles
  },
  "keyword": {
    type: "keyword",
    title: "Industry Keywords",
    description: "Including these terms will increase visibility with ATS systems",
    icon: TrendingUp
  },
  "achievement": {
    type: "achievement",
    title: "Quantify Achievements",
    description: "Add metrics to demonstrate the impact of your work",
    icon: TrendingUp
  },
  "format": {
    type: "format",
    title: "Improve Formatting",
    description: "Structural changes to improve readability and visual appearance",
    icon: BarChart2
  },
  "language": {
    type: "language",
    title: "Improve Language",
    description: "Action words and powerful verbs to strengthen descriptions",
    icon: Sparkles
  },
  "skills": {
    type: "skills",
    title: "Skills Highlighting",
    description: "Better present your technical and soft skills",
    icon: Check
  },
  "ats": {
    type: "ats",
    title: "ATS Optimization", 
    description: "Specific improvements for ATS compatibility",
    icon: AlertTriangle
  }
};

/**
 * Fallback suggestion types for when real data isn't available
 */
export const FALLBACK_SUGGESTION_TYPES: SuggestionType[] = [
  {
    type: "keyword",
    title: "Add Industry Keywords",
    description: "Including these terms will increase visibility with ATS systems."
  },
  {
    type: "achievement",
    title: "Quantify Achievements",
    description: "Add metrics to demonstrate the impact of your work."
  },
  {
    type: "format",
    title: "Improve Formatting",
    description: "Structural changes to improve readability and visual appearance."
  },
  {
    type: "language",
    title: "Improve Language",
    description: "Action words and powerful verbs to strengthen descriptions."
  }
];

/**
 * Keyword categories with icons and descriptions
 */
export const KEYWORD_CATEGORIES: Record<string, SuggestionType> = {
  "technical": {
    type: "technical",
    title: "Technical Skill",
    description: "Technical abilities, tools, or programming languages",
    icon: Code
  },
  "soft-skill": {
    type: "soft-skill",
    title: "Soft Skill",
    description: "Interpersonal abilities and character traits",
    icon: MessageSquare
  },
  "industry-specific": {
    type: "industry-specific",
    title: "Industry Term",
    description: "Specialized terminology for your industry",
    icon: Tag
  },
  "action-verb": {
    type: "action-verb",
    title: "Action Verb",
    description: "Dynamic verbs that demonstrate accomplishments",
    icon: TrendingUp
  },
  "general": {
    type: "general",
    title: "General Keyword",
    description: "General terms relevant to your field",
    icon: Sparkles
  }
};

/**
 * Priority order for suggestion types
 * Used for sorting in the UI
 */
export const SUGGESTION_PRIORITY_ORDER = [
  'structure', 'content', 'ats', 'skills', 
  'keyword', 'language', 'achievement', 'format'
];

/**
 * Priority order for keyword categories
 * Used for sorting in the UI
 */
export const KEYWORD_PRIORITY_ORDER = [
  'technical', 'industry-specific', 'soft-skill', 'action-verb', 'general'
];