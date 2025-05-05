/**
 * Enhanced SuggestionsList Component
 * 
 * This component displays AI-generated suggestions for improving the resume
 * with advanced impact analysis and real-time feedback on score improvement.
 * It maintains the same UI appearance while adding enhanced functionality.
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Check, AlertTriangle, TrendingUp, BarChart2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Import scoring logic (if available)
import { analyzeSuggestionImpact, calculateSuggestionPointImpact, ImpactLevel } from '@/services/resumeScoreLogic';

// Define suggestion types with descriptions for better user context
const SUGGESTION_TYPES = {
  "structure": {
    title: "Structure & Layout",
    description: "Suggestions to improve organization and formatting",
    icon: BarChart2
  },
  "content": {
    title: "Content Enhancement",
    description: "Suggestions to improve the quality of your content",
    icon: Sparkles
  },
  "keyword": {
    title: "Add industry keywords",
    description: "Including these terms will increase visibility with ATS systems",
    icon: TrendingUp
  },
  "achievement": {
    title: "Quantify achievements",
    description: "Add metrics to demonstrate the impact of your work",
    icon: TrendingUp
  },
  "format": {
    title: "Improve formatting",
    description: "Structure changes to enhance readability and visual appeal",
    icon: BarChart2
  },
  "language": {
    title: "Enhance language",
    description: "Power words and action verbs to strengthen descriptions",
    icon: Sparkles
  },
  "skills": {
    title: "Skills Highlighting",
    description: "Better showcase your technical and soft skills",
    icon: Check
  },
  "ats": {
    title: "ATS Optimization", 
    description: "Improvements specifically for ATS compatibility",
    icon: AlertTriangle
  }
};

// Fallback suggestion types for when real data isn't available
const FALLBACK_SUGGESTION_TYPES = [
  {
    type: "keyword",
    title: "Add industry keywords",
    description: "Including these terms will increase visibility with ATS systems."
  },
  {
    type: "achievement",
    title: "Quantify achievements",
    description: "Add metrics to demonstrate the impact of your work."
  },
  {
    type: "format",
    title: "Improve formatting",
    description: "Structure changes to enhance readability and visual appeal."
  },
  {
    type: "language",
    title: "Enhance language",
    description: "Power words and action verbs to strengthen descriptions."
  }
];

export interface OptimizationSuggestion {
  id?: string;
  type: string;
  text: string;
  impact: string;
  isApplied?: boolean;
  score?: number;
  pointImpact?: number;
  section?: string;
}

interface SuggestionsListProps {
  suggestions: OptimizationSuggestion[];
  isOptimizing: boolean;
  onApplySuggestion: (index: number) => void;
  resumeContent?: string;
  showImpactScore?: boolean;
}

/**
 * Determines the impact level color based on impact score
 * 
 * @param score - Numerical impact score (1-10)
 * @returns CSS color class
 */
const getImpactColor = (score: number): string => {
  if (score >= 8) return "text-red-600 bg-red-50 border-red-200";
  if (score >= 6) return "text-orange-600 bg-orange-50 border-orange-200";
  if (score >= 4) return "text-blue-600 bg-blue-50 border-blue-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
};

/**
 * Gets a descriptive label for the impact level
 * 
 * @param score - Numerical impact score (1-10)
 * @returns Impact level label
 */
const getImpactLabel = (score: number): string => {
  if (score >= 8) return "Critical";
  if (score >= 6) return "High";
  if (score >= 4) return "Medium";
  return "Low";
};

/**
 * SuggestionsList component displays AI-generated suggestions
 * for improving the resume with impact analysis
 */
const SuggestionsList: React.FC<SuggestionsListProps> = ({ 
  suggestions, 
  isOptimizing,
  onApplySuggestion,
  resumeContent = "",
  showImpactScore = true
}) => {
  // Process suggestions to add impact scores if not already present
  const [processedSuggestions, setProcessedSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  // Process suggestions to add impact scores
  useEffect(() => {
    if (!suggestions || suggestions.length === 0) return;
    
    try {
      // Enhanced suggestions with impact analysis
      const enhanced = suggestions.map(suggestion => {
        // Calculate impact score if not already present
        let score = suggestion.score;
        let pointImpact = suggestion.pointImpact;
        
        // Only calculate if we have the analyzeSuggestionImpact function
        if (typeof analyzeSuggestionImpact === 'function' && !score) {
          score = analyzeSuggestionImpact(suggestion);
        }
        
        // Only calculate if we have the calculateSuggestionPointImpact function
        if (typeof calculateSuggestionPointImpact === 'function' && !pointImpact && score) {
          pointImpact = calculateSuggestionPointImpact({...suggestion, score});
        }
        
        return {
          ...suggestion,
          score: score || 5, // Default to medium impact if calculation not available
          pointImpact: pointImpact || 1.0 // Default to 1 point if calculation not available
        };
      });
      
      // Sort by impact score (highest first) if scores are available
      if (enhanced[0].score) {
        enhanced.sort((a, b) => (b.score || 0) - (a.score || 0));
      }
      
      setProcessedSuggestions(enhanced);
    } catch (error) {
      console.error("Error processing suggestions:", error);
      setProcessedSuggestions(suggestions);
    }
  }, [suggestions, resumeContent]);

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h3 className="font-medium">AI Suggestions</h3>
      </div>
      
      {isOptimizing ? (
        <p className="text-sm text-gray-500">Generating suggestions...</p>
      ) : processedSuggestions && processedSuggestions.length > 0 ? (
        <ul className="space-y-3 text-sm">
          {processedSuggestions.map((suggestion, index) => {
            // Get appropriate impact styling
            const impactScore = suggestion.score || 5;
            const impactColor = getImpactColor(impactScore);
            const impactLabel = getImpactLabel(impactScore);
            const pointImpact = suggestion.pointImpact?.toFixed(1) || "1.0";
            
            // Get suggestion type details
            const typeInfo = SUGGESTION_TYPES[suggestion.type as keyof typeof SUGGESTION_TYPES] || {
              title: suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1),
              description: "Improve your resume",
              icon: Sparkles
            };
            
            const TypeIcon = typeInfo.icon;
            
            return (
              <li 
                key={index} 
                className={`p-3 border-l-2 ${suggestion.isApplied ? 'border-green-500 bg-green-50' : 'border-brand-400 bg-white'} rounded transition-all duration-200`}
              >
                {/* Suggestion Header with Type and Impact */}
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1">
                    <TypeIcon className="h-4 w-4 text-brand-600" />
                    <span className="font-medium text-xs text-gray-500">{typeInfo.title}</span>
                  </div>
                  
                  {showImpactScore && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            className={`text-xs py-0 px-2 ${impactColor}`}
                            variant="outline"
                          >
                            {impactLabel} Impact (+{pointImpact})
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Applying this suggestion will improve your ATS score by approximately {pointImpact} points</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                {/* Suggestion Content */}
                <p className="font-medium">{suggestion.text}</p>
                
                {/* Impact Description */}
                <p className="text-gray-600 mt-1">
                  {suggestion.impact}
                </p>
                
                {/* Action Button */}
                <div className="mt-2 flex justify-between items-center">
                  <Button 
                    variant={suggestion.isApplied ? "default" : "outline"} 
                    size="sm" 
                    className={suggestion.isApplied ? "bg-green-600 hover:bg-green-700" : ""} 
                    onClick={() => onApplySuggestion(index)}
                  >
                    {suggestion.isApplied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Applied
                      </>
                    ) : (
                      'Apply Suggestion'
                    )}
                  </Button>
                  
                  {/* Show section target if available */}
                  {suggestion.section && (
                    <span className="text-xs text-gray-500">
                      Section: {suggestion.section}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        // Fallback suggestions when no real suggestions are available
        <ul className="space-y-3 text-sm">
          {FALLBACK_SUGGESTION_TYPES.map((suggestion, index) => (
            <li key={index} className="p-2 border-l-2 border-brand-400 bg-white rounded">
              <p className="font-medium">{suggestion.title}</p>
              <p className="text-gray-600">{suggestion.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SuggestionsList;