/**
 * Enhanced KeywordList Component
 * 
 * This component displays recommended keywords to improve resume ATS compatibility
 * with advanced impact analysis, categorization, and real-time score preview.
 * 
 * Features:
 * - Categorized keywords by type (technical, soft skills, etc.)
 * - Visual impact indicators
 * - Real-time score preview when applying keywords
 * - Detailed tooltips with impact explanations
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
import { ImpactLevel } from '@/services/resumeScoreLogic';
import ImpactPreview from './impactPreview';

// Define keyword categories with icons and descriptions
const KEYWORD_CATEGORIES = {
  "technical": {
    title: "Compétence Technique",
    description: "Compétences techniques, outils ou langages de programmation",
    icon: Code
  },
  "soft-skill": {
    title: "Compétence Humaine",
    description: "Capacités interpersonnelles et traits de caractère",
    icon: MessageSquare
  },
  "industry-specific": {
    title: "Terme d'Industrie",
    description: "Terminologie spécialisée pour votre secteur",
    icon: Tag
  },
  "action-verb": {
    title: "Verbe d'Action",
    description: "Verbes dynamiques qui démontrent des accomplissements",
    icon: TrendingUp
  },
  "general": {
    title: "Mot-clé Général",
    description: "Termes généraux pertinents pour votre domaine",
    icon: Sparkles
  }
};

export interface Keyword {
  text: string;            // The keyword text
  applied: boolean;        // Whether the keyword has been applied
  impact?: number;         // Impact score (0.0-1.0)
  category?: string;       // Category (technical, soft skill, industry-specific)
  pointImpact?: number;    // Point impact on overall score
}

interface KeywordListProps {
  keywords: Keyword[];                                // Available keywords
  onKeywordApply: (index: number) => void;            // Handler for applying keywords
  resumeContent?: string;                             // Current resume content
  showImpactDetails?: boolean;                        // Whether to show detailed impact info
  needsRegeneration?: boolean;                        // Whether changes need regeneration
  currentScore?: number;                              // Current ATS score
  simulateKeywordImpact?: (index: number) => {        // Function to simulate impact
    newScore: number;                                 // Projected new score
    pointImpact: number;                              // Point impact
    description: string;                              // Impact description
  };
}

/**
 * KeywordList component displays recommended keywords
 * with impact analysis and categorization
 */
const KeywordList: React.FC<KeywordListProps> = ({ 
  keywords, 
  onKeywordApply, 
  resumeContent = "",
  showImpactDetails = false,
  needsRegeneration = false,
  currentScore = 0,
  simulateKeywordImpact
}) => {
  // State for impact previews
  const [showPreview, setShowPreview] = useState<number | null>(null);
  // State for keyword impacts
  const [keywordImpacts, setKeywordImpacts] = useState<
    Array<{newScore: number; pointImpact: number; description: string}>
  >([]);
  
  // Calculate keyword impacts on mount and when dependencies change
  useEffect(() => {
    if (!simulateKeywordImpact || keywords.length === 0) return;
    
    // Pre-calculate impacts for all keywords
    const impacts = keywords.map((_, index) => 
      simulateKeywordImpact(index)
    );
    
    setKeywordImpacts(impacts);
  }, [keywords, simulateKeywordImpact]);
  
  /**
   * Map numeric impact score to impact level enum
   */
  const getImpactLevel = (impact: number): ImpactLevel => {
    if (impact >= 0.8) return ImpactLevel.CRITICAL;
    if (impact >= 0.6) return ImpactLevel.HIGH;
    if (impact >= 0.4) return ImpactLevel.MEDIUM;
    return ImpactLevel.LOW;
  };
  
  /**
   * Gets the appropriate color for an impact level
   */
  const getImpactColor = (level: ImpactLevel | number): string => {
    // Convert numeric impact to level if needed
    const impactLevel = typeof level === 'number' ? getImpactLevel(level) : level;
    
    switch (impactLevel) {
      case ImpactLevel.CRITICAL:
        return 'text-red-600 bg-red-50 border-red-200';
      case ImpactLevel.HIGH:
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case ImpactLevel.MEDIUM:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case ImpactLevel.LOW:
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  /**
   * Handle clicking a keyword button
   */
  const handleKeywordClick = (index: number) => {
    // Apply the keyword
    onKeywordApply(index);
    // Hide any active preview
    setShowPreview(null);
  };
  
  /**
   * Group keywords by category for better organization
   */
  const groupedKeywords = keywords.reduce<Record<string, Keyword[]>>(
    (groups, keyword) => {
      const category = keyword.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(keyword);
      return groups;
    }, 
    {}
  );
  
  // Sort groups by priority (technical first, then industry-specific, etc.)
  const priorityOrder = [
    'technical', 'industry-specific', 'soft-skill', 'action-verb', 'general'
  ];
  
  const sortedGroupKeys = Object.keys(groupedKeywords).sort((a, b) => {
    const indexA = priorityOrder.indexOf(a);
    const indexB = priorityOrder.indexOf(b);
    
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });
  
  // If no keywords available, show a message
  if (keywords.length === 0) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h3 className="font-medium">Mots-clés Recommandés</h3>
        </div>
        <p className="text-sm text-gray-500">Aucun mot-clé disponible.</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h3 className="font-medium">Mots-clés Recommandés</h3>
        </div>
        
        {needsRegeneration && (
          <Badge 
            variant="outline" 
            className="text-xs bg-amber-50 text-amber-700 border-amber-200"
          >
            Régénération requise
          </Badge>
        )}
      </div>
      
      {/* Group keywords by category */}
      <div className="space-y-4">
        {sortedGroupKeys.map(category => {
          const categoryKeywords = groupedKeywords[category];
          // Get category info
          const categoryInfo = KEYWORD_CATEGORIES[category as keyof typeof KEYWORD_CATEGORIES] || 
            KEYWORD_CATEGORIES.general;
          
          const CategoryIcon = categoryInfo.icon;
          
          return (
            <div key={category} className="bg-white rounded-lg border overflow-hidden">
              {/* Category header */}
              <div className="bg-gray-50 px-3 py-2 border-b">
                <div className="flex items-center gap-1.5">
                  <CategoryIcon className="h-4 w-4 text-brand-600" />
                  <h4 className="font-medium text-sm">{categoryInfo.title}</h4>
                </div>
                <p className="text-xs text-gray-600">{categoryInfo.description}</p>
              </div>
              
              {/* Category keywords */}
              <div className="p-3 flex flex-wrap gap-2">
                {categoryKeywords.map((keyword, categoryIndex) => {
                  // Find the global index of this keyword
                  const keywordIndex = keywords.findIndex(k => 
                    k.text === keyword.text && k.category === keyword.category
                  );
                  
                  const impact = keywordImpacts[keywordIndex];
                  
                  // Get impact level from keyword or calculate it
                  const impactValue = keyword.impact || (impact?.pointImpact ? impact.pointImpact / 2 : 0.5);
                  const impactLevel = getImpactLevel(impactValue);
                  const isShowingPreview = showPreview === keywordIndex;
                  
                  return (
                    <div key={categoryIndex} className="relative">
                      {/* Keyword button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant={keyword.applied ? "default" : "outline"} 
                              size="sm"
                              className={`${keyword.applied ? "bg-brand-600" : ""} relative`}
                              onClick={() => handleKeywordClick(keywordIndex)}
                              onMouseEnter={() => setShowPreview(keywordIndex)}
                              onMouseLeave={() => setShowPreview(null)}
                            >
                              {keyword.text}
                              {keyword.applied && <CheckCircle className="h-3 w-3 ml-1" />}
                              
                              {/* Show point impact indicator on hover */}
                              {!keyword.applied && impact && showImpactDetails && (
                                <span 
                                  className={`absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-[10px] rounded-full font-bold ${
                                    getImpactColor(impactLevel).replace('border-', 'bg-')
                                  }`}
                                >
                                  +
                                </span>
                              )}
                            </Button>
                          </TooltipTrigger>
                          
                          {/* Keyword tooltip */}
                          <TooltipContent 
                            side="top" 
                            className="max-w-xs p-3"
                            onPointerDownOutside={() => setShowPreview(null)}
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <CategoryIcon className="h-4 w-4" />
                                <span className="font-medium">{categoryInfo.title}</span>
                              </div>
                              <p className="text-xs">{categoryInfo.description}</p>
                              
                              {showImpactDetails && impact && (
                                <div className="mt-1 pt-1 border-t border-gray-200">
                                  <Badge 
                                    className={`text-xs py-0 px-2 mt-1 ${getImpactColor(impactLevel)}`}
                                    variant="outline"
                                  >
                                    {impactLevel.charAt(0).toUpperCase() + impactLevel.slice(1)} 
                                    Impact (+{impact.pointImpact.toFixed(1)})
                                  </Badge>
                                  <p className="text-xs mt-1">
                                    L'ajout de ce mot-clé peut améliorer votre score ATS d'environ {impact.pointImpact.toFixed(1)} points.
                                  </p>
                                </div>
                              )}
                              
                              {keyword.applied ? (
                                <p className="text-xs text-green-600 mt-1">✓ Appliqué à votre CV</p>
                              ) : (
                                <p className="text-xs text-gray-500 mt-1">Cliquez pour ajouter à votre CV</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Show impact preview popup on hover */}
                      {isShowingPreview && impact && currentScore > 0 && !keyword.applied && (
                        <div 
                          className="absolute z-10 -bottom-[110px] left-1/2 transform -translate-x-1/2 w-[250px]"
                          onMouseEnter={() => setShowPreview(keywordIndex)}
                          onMouseLeave={() => setShowPreview(null)}
                        >
                          <ImpactPreview
                            currentScore={currentScore}
                            newScore={impact.newScore}
                            pointImpact={impact.pointImpact}
                            impactLevel={impactLevel}
                            description={impact.description}
                            isApplied={keyword.applied}
                            onApply={() => onKeywordApply(keywordIndex)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeywordList;