/**
 * Enhanced SuggestionsList Component
 * 
 * This component displays AI-generated suggestions for improving the resume
 * with advanced impact analysis, real-time score previews, and detailed feedback.
 * 
 * Features:
 * - Real-time score impact preview
 * - Categorized suggestions by type
 * - Interactive suggestion application
 * - Visual feedback on impact levels
 * - Animation and transitions for better UX
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, Check, AlertTriangle, TrendingUp, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ImpactLevel } from '@/services/resumeScoreLogic';
import ImpactPreview from './impactPreview';

// Define suggestion types with descriptions for better user context
const SUGGESTION_TYPES = {
  "structure": {
    title: "Structure & Mise en page",
    description: "Suggestions pour améliorer l'organisation et le formatage",
    icon: BarChart2
  },
  "content": {
    title: "Amélioration du contenu",
    description: "Suggestions pour améliorer la qualité de votre contenu",
    icon: Sparkles
  },
  "keyword": {
    title: "Mots-clés d'industrie",
    description: "L'inclusion de ces termes augmentera la visibilité avec les systèmes ATS",
    icon: TrendingUp
  },
  "achievement": {
    title: "Quantifier les réalisations",
    description: "Ajouter des métriques pour démontrer l'impact de votre travail",
    icon: TrendingUp
  },
  "format": {
    title: "Améliorer le formatage",
    description: "Changements de structure pour améliorer la lisibilité et l'apparence visuelle",
    icon: BarChart2
  },
  "language": {
    title: "Améliorer le langage",
    description: "Mots d'action et verbes puissants pour renforcer les descriptions",
    icon: Sparkles
  },
  "skills": {
    title: "Mise en valeur des compétences",
    description: "Mieux présenter vos compétences techniques et humaines",
    icon: Check
  },
  "ats": {
    title: "Optimisation ATS", 
    description: "Améliorations spécifiques pour la compatibilité ATS",
    icon: AlertTriangle
  }
};

// Fallback suggestion types for when real data isn't available
const FALLBACK_SUGGESTION_TYPES = [
  {
    type: "keyword",
    title: "Ajouter des mots-clés d'industrie",
    description: "L'inclusion de ces termes augmentera la visibilité avec les systèmes ATS."
  },
  {
    type: "achievement",
    title: "Quantifier les réalisations",
    description: "Ajoutez des métriques pour démontrer l'impact de votre travail."
  },
  {
    type: "format",
    title: "Améliorer le formatage",
    description: "Changements de structure pour améliorer la lisibilité et l'apparence visuelle."
  },
  {
    type: "language",
    title: "Améliorer le langage",
    description: "Mots d'action et verbes puissants pour renforcer les descriptions."
  }
];

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

interface SuggestionImpact {
  newScore: number;
  pointImpact: number;
  description: string;
}

interface SuggestionsListProps {
  suggestions: OptimizationSuggestion[];              // Available suggestions
  isOptimizing: boolean;                              // Whether optimization is in progress
  onApplySuggestion: (index: number) => void;         // Handler for applying suggestions
  resumeContent?: string;                             // Current resume content
  showImpactScore?: boolean;                          // Whether to show impact details
  currentScore?: number;                              // Current ATS score
  simulateSuggestionImpact?: (index: number) => SuggestionImpact;  // Function to simulate impact
}

/**
 * SuggestionsList component displays AI-generated suggestions
 * for improving the resume with impact analysis
 */
const SuggestionsList: React.FC<SuggestionsListProps> = ({ 
  suggestions, 
  isOptimizing,
  onApplySuggestion,
  resumeContent = "",
  showImpactScore = true,
  currentScore = 0,
  simulateSuggestionImpact
}) => {
  // State for tracking expanded suggestions
  const [expandedSuggestions, setExpandedSuggestions] = useState<number[]>([]);
  // State for tracking suggestion impacts
  const [suggestionImpacts, setSuggestionImpacts] = useState<SuggestionImpact[]>([]);
  
  // Calculate suggestion impacts on mount and when dependencies change
  useEffect(() => {
    if (!simulateSuggestionImpact || suggestions.length === 0) return;
    
    // Pre-calculate impacts for all suggestions
    const impacts = suggestions.map((_, index) => 
      simulateSuggestionImpact(index)
    );
    
    setSuggestionImpacts(impacts);
  }, [suggestions, simulateSuggestionImpact]);
  
  /**
   * Toggle expanded state for a suggestion
   */
  const toggleExpand = useCallback((index: number) => {
    setExpandedSuggestions(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  }, []);
  
  /**
   * Map numeric impact score to impact level enum
   */
  const getImpactLevel = useCallback((score: number): ImpactLevel => {
    if (score >= 8) return ImpactLevel.CRITICAL;
    if (score >= 6) return ImpactLevel.HIGH;
    if (score >= 4) return ImpactLevel.MEDIUM;
    return ImpactLevel.LOW;
  }, []);
  
  /**
   * Group suggestions by type for better organization
   */
  const groupedSuggestions = suggestions.reduce<Record<string, OptimizationSuggestion[]>>(
    (groups, suggestion) => {
      const type = suggestion.type || 'general';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(suggestion);
      return groups;
    }, 
    {}
  );
  
  // Sort groups by priority (structure and content first)
  const priorityOrder = [
    'structure', 'content', 'ats', 'skills', 
    'keyword', 'language', 'achievement', 'format'
  ];
  
  const sortedGroupKeys = Object.keys(groupedSuggestions).sort((a, b) => {
    const indexA = priorityOrder.indexOf(a);
    const indexB = priorityOrder.indexOf(b);
    
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h3 className="font-medium">Suggestions IA</h3>
      </div>
      
      {isOptimizing ? (
        <p className="text-sm text-gray-500">Génération des suggestions...</p>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="space-y-4">
          {/* Group suggestions by type */}
          {sortedGroupKeys.map(groupKey => {
            const groupSuggestions = groupedSuggestions[groupKey];
            // Get type info for the group
            const typeInfo = SUGGESTION_TYPES[groupKey as keyof typeof SUGGESTION_TYPES] || {
              title: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
              description: "Suggestions pour améliorer votre CV",
              icon: Sparkles
            };
            
            const TypeIcon = typeInfo.icon;
            
            return (
              <div key={groupKey} className="bg-white rounded-lg border overflow-hidden">
                {/* Group header */}
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className="h-4 w-4 text-brand-600" />
                    <h4 className="font-medium text-sm">{typeInfo.title}</h4>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{typeInfo.description}</p>
                </div>
                
                {/* Group suggestions */}
                <div className="divide-y">
                  {groupSuggestions.map((suggestion, groupIndex) => {
                    const suggestionIndex = suggestions.findIndex(s => 
                      s.id === suggestion.id || 
                      (s.text === suggestion.text && s.type === suggestion.type)
                    );
                    
                    const isExpanded = expandedSuggestions.includes(suggestionIndex);
                    const impact = suggestionImpacts[suggestionIndex];
                    
                    // Get impact level from score or calculate it
                    const impactScore = suggestion.score || (impact?.pointImpact ? impact.pointImpact * 5 : 5);
                    const impactLevel = getImpactLevel(impactScore);
                    
                    return (
                      <div key={groupIndex} className="px-4 py-3">
                        {/* Suggestion with Collapsible */}
                        <Collapsible
                          open={isExpanded}
                          onOpenChange={(open) => {
                            if (open) {
                              setExpandedSuggestions(prev => [...prev, suggestionIndex]);
                            } else {
                              setExpandedSuggestions(prev => prev.filter(i => i !== suggestionIndex));
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {suggestion.isApplied && (
                                  <span className="text-green-600 mr-1">✓</span>
                                )}
                                {suggestion.text}
                              </p>
                            </div>
                            
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          
                          <CollapsibleContent>
                            <div className="mt-2 pt-2 border-t">
                              {/* Impact details */}
                              <p className="text-sm text-gray-600 mb-3">
                                {suggestion.impact}
                              </p>
                              
                              {/* Impact preview */}
                              {showImpactScore && impact && currentScore > 0 && (
                                <ImpactPreview
                                  currentScore={currentScore}
                                  newScore={impact.newScore}
                                  pointImpact={impact.pointImpact}
                                  impactLevel={impactLevel}
                                  description={impact.description}
                                  isApplied={!!suggestion.isApplied}
                                  onApply={() => onApplySuggestion(suggestionIndex)}
                                />
                              )}
                              
                              {/* Apply button (fallback if impact preview not available) */}
                              {(!showImpactScore || !impact || currentScore === 0) && (
                                <Button 
                                  variant={suggestion.isApplied ? "default" : "outline"} 
                                  size="sm" 
                                  className={suggestion.isApplied ? "bg-green-600 hover:bg-green-700" : ""} 
                                  onClick={() => onApplySuggestion(suggestionIndex)}
                                >
                                  {suggestion.isApplied ? (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Appliqué
                                    </>
                                  ) : (
                                    'Appliquer la suggestion'
                                  )}
                                </Button>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
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