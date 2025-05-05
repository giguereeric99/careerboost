/**
 * Enhanced KeywordList Component
 * 
 * This component displays recommended keywords to improve resume ATS compatibility
 * with advanced impact analysis and categorization. It maintains the same UI appearance
 * while adding enhanced functionality for better user experience.
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  CheckCircle, 
  TrendingUp, 
  Tag, 
  Code, 
  MessageSquare 
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Import scoring logic (if available)
import { 
  analyzeKeywordImpact, 
  calculateKeywordPointImpact, 
  getImpactLevel, 
  ImpactLevel 
} from '@/services/resumeScoreLogic';

// Define keyword categories with icons and descriptions
const KEYWORD_CATEGORIES = {
  "technical": {
    title: "Technical Skill",
    description: "Technical abilities, tools, or programming languages",
    icon: Code
  },
  "soft-skill": {
    title: "Soft Skill",
    description: "Interpersonal abilities and character traits",
    icon: MessageSquare
  },
  "industry-specific": {
    title: "Industry Term",
    description: "Specialized terminology for your industry",
    icon: Tag
  },
  "action-verb": {
    title: "Action Verb",
    description: "Dynamic verbs that demonstrate accomplishments",
    icon: TrendingUp
  },
  "general": {
    title: "General Keyword",
    description: "General terms relevant to your field",
    icon: Sparkles
  }
};

export interface Keyword {
  text: string;
  applied: boolean;
  impact?: number;
  category?: string;
  pointImpact?: number;
}

interface KeywordListProps {
  keywords: Keyword[];
  onKeywordApply: (index: number) => void;
  resumeContent?: string;
  showImpactDetails?: boolean;
}

/**
 * Determines the impact level color based on impact value
 * 
 * @param impact - Impact value (0.0-1.0)
 * @returns CSS color class
 */
const getImpactColor = (impact: number): string => {
  if (impact >= 0.8) return "bg-red-100 text-red-700 border-red-200";
  if (impact >= 0.6) return "bg-orange-100 text-orange-700 border-orange-200";
  if (impact >= 0.4) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
};

/**
 * KeywordList component displays recommended keywords
 * with impact analysis and categorization
 */
const KeywordList: React.FC<KeywordListProps> = ({ 
  keywords, 
  onKeywordApply, 
  resumeContent = "",
  showImpactDetails = false
}) => {
  // Process keywords to add impact analysis
  const [processedKeywords, setProcessedKeywords] = useState<Keyword[]>([]);

  // Process keywords when they change
  useEffect(() => {
    if (!keywords || keywords.length === 0) return;
    
    try {
      // Enhanced keywords with impact analysis
      const enhanced = keywords.map(keyword => {
        // Skip processing if already processed
        if (keyword.impact !== undefined && keyword.category !== undefined) {
          return keyword;
        }
        
        // Calculate impact if analysis function is available
        let impact: number;
        let category: string;
        let pointImpact: number;
        
        if (typeof analyzeKeywordImpact === 'function') {
          const analysis = analyzeKeywordImpact(keyword.text, resumeContent);
          impact = analysis.impact;
          category = analysis.category;
        } else {
          // Default values if functions not available
          impact = 0.5;
          category = 'general';
        }
        
        // Calculate point impact if function is available
        if (typeof calculateKeywordPointImpact === 'function') {
          pointImpact = calculateKeywordPointImpact(
            { ...keyword, impact, category },
            resumeContent
          );
        } else {
          // Default value if function not available
          pointImpact = impact * 2;
        }
        
        return {
          ...keyword,
          impact,
          category,
          pointImpact
        };
      });
      
      // Sort by impact (highest first)
      enhanced.sort((a, b) => (b.impact || 0.5) - (a.impact || 0.5));
      
      setProcessedKeywords(enhanced);
    } catch (error) {
      console.error("Error processing keywords:", error);
      setProcessedKeywords(keywords);
    }
  }, [keywords, resumeContent]);

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h3 className="font-medium">Recommended Keywords</h3>
      </div>
      
      {processedKeywords.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {processedKeywords.map((keyword, index) => {
            // Get impact details
            const impact = keyword.impact || 0.5;
            const impactColor = getImpactColor(impact);
            const pointImpact = keyword.pointImpact?.toFixed(1) || "1.0";
            const category = keyword.category || 'general';
            
            // Get category info
            const categoryInfo = KEYWORD_CATEGORIES[category as keyof typeof KEYWORD_CATEGORIES] || 
              KEYWORD_CATEGORIES.general;
            
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={keyword.applied ? "default" : "outline"} 
                      size="sm"
                      className={keyword.applied ? "bg-brand-600" : ""}
                      onClick={() => onKeywordApply(index)}
                    >
                      {keyword.text}
                      {keyword.applied && <CheckCircle className="h-3 w-3 ml-1" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs p-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        {React.createElement(categoryInfo.icon, { className: "h-4 w-4" })}
                        <span className="font-medium">{categoryInfo.title}</span>
                      </div>
                      <p className="text-xs">{categoryInfo.description}</p>
                      
                      {showImpactDetails && (
                        <div className="mt-1 pt-1 border-t border-gray-200">
                          <Badge 
                            className={`text-xs py-0 px-2 mt-1 ${impactColor}`}
                            variant="outline"
                          >
                            {typeof getImpactLevel === 'function' 
                              ? getImpactLevel(impact) 
                              : impact >= 0.8 ? 'Critical' : impact >= 0.6 ? 'High' : impact >= 0.4 ? 'Medium' : 'Low'} 
                            Impact (+{pointImpact})
                          </Badge>
                          <p className="text-xs mt-1">
                            Adding this keyword could improve your ATS score by approximately {pointImpact} points.
                          </p>
                        </div>
                      )}
                      
                      {keyword.applied ? (
                        <p className="text-xs text-green-600 mt-1">✓ Applied to your resume</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Click to add to your resume</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No keywords available.</p>
      )}
    </div>
  );
};

export default KeywordList;