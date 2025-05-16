/**
 * Enhanced SuggestionsList Component
 *
 * This component displays AI-generated suggestions for improving the resume
 * with advanced impact analysis, real-time score previews, and detailed feedback.
 *
 * Features:
 * - Simplified view with single impact preview
 * - Categorized suggestions by type
 * - Interactive suggestion application (edit mode only)
 * - Visual feedback on impact levels
 * - Updated to work with atomic save approach (local changes until explicit save)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, BarChart2, Lock, Save } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ImpactLevel } from "@/services/resumeScoreLogic";
import ImpactPreview from "./impactPreview";

// Import types and constants from centralized files
import {
  OptimizationSuggestion,
  SuggestionImpact,
  SuggestionsListProps,
  CumulativeImpact,
} from "@/types/suggestionTypes";
import {
  SUGGESTION_TYPES,
  FALLBACK_SUGGESTION_TYPES,
  SUGGESTION_PRIORITY_ORDER,
} from "@/constants/suggestions";

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
  simulateSuggestionImpact,
  isEditing = false, // Default to false if not provided
}) => {
  // State for tracking suggestion impacts
  const [suggestionImpacts, setSuggestionImpacts] = useState<
    SuggestionImpact[]
  >([]);

  // Calculate suggestion impacts on mount and when dependencies change
  useEffect(() => {
    if (!simulateSuggestionImpact || suggestions.length === 0) return;

    // Pre-calculate impacts for all suggestions
    const impacts = suggestions.map((_, index) =>
      simulateSuggestionImpact(index)
    );

    setSuggestionImpacts(impacts);
  }, [suggestions, simulateSuggestionImpact]);

  // Calculate cumulative impact of all applied suggestions
  const cumulativeImpact = useMemo<CumulativeImpact | null>(() => {
    if (!suggestionImpacts.length) return null;

    const appliedSuggestions = suggestions
      .map((s, index) => ({
        suggestion: s,
        index,
        impact: suggestionImpacts[index],
      }))
      .filter((item) => item.suggestion.isApplied);

    if (appliedSuggestions.length === 0) return null;

    // Sum up the impact of all applied suggestions
    const totalPointImpact = appliedSuggestions.reduce(
      (sum, item) => sum + (item.impact?.pointImpact || 0),
      0
    );

    // Calculate the new score
    const newScore = Math.min(100, currentScore + totalPointImpact);

    return {
      newScore,
      pointImpact: totalPointImpact,
      description: `Applying ${appliedSuggestions.length} suggestion${
        appliedSuggestions.length !== 1 ? "s" : ""
      } improves your resume's ATS compatibility.`,
      appliedCount: appliedSuggestions.length,
    };
  }, [suggestions, suggestionImpacts, currentScore]);

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
   * Handle applying a suggestion (with edit mode check)
   * Updates only local state - changes will be saved atomically later
   */
  const handleApplySuggestion = useCallback(
    (index: number) => {
      // Only allow applying suggestions in edit mode
      if (isEditing) {
        onApplySuggestion(index);
      }
    },
    [isEditing, onApplySuggestion]
  );

  /**
   * Group suggestions by type for better organization
   */
  const groupedSuggestions = suggestions.reduce<
    Record<string, OptimizationSuggestion[]>
  >((groups, suggestion) => {
    const type = suggestion.type || "general";
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(suggestion);
    return groups;
  }, {});

  // Sort groups by priority order from constants
  const sortedGroupKeys = Object.keys(groupedSuggestions).sort((a, b) => {
    const indexA = SUGGESTION_PRIORITY_ORDER.indexOf(a);
    const indexB = SUGGESTION_PRIORITY_ORDER.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;

    return indexA - indexB;
  });

  // Get applied suggestions count
  const appliedSuggestionsCount = suggestions.filter((s) => s.isApplied).length;

  // Check if there are any unsaved applied suggestions
  const hasUnsavedSuggestions = appliedSuggestionsCount > 0;

  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h3 className="font-medium">AI Suggestions</h3>
        </div>

        {/* Edit mode indicator and applied count */}
        <div className="flex items-center gap-2">
          {appliedSuggestionsCount > 0 && (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-600 border-green-200"
            >
              {appliedSuggestionsCount} applied
            </Badge>
          )}

          {/* Show lock indicator when not in edit mode */}
          {!isEditing && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center text-xs text-gray-500">
                  <Lock className="h-3 w-3 mr-1" />
                  <span>Edit mode required</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Click "Edit" button on the resume to apply suggestions
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Integrated impact preview */}
      {showImpactScore &&
        cumulativeImpact &&
        cumulativeImpact.appliedCount > 0 && (
          <div className="mb-4 bg-white border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-brand-600" />
              <h4 className="text-sm font-medium">Suggestions Impact</h4>
            </div>

            <ImpactPreview
              currentScore={currentScore}
              newScore={cumulativeImpact.newScore}
              pointImpact={cumulativeImpact.pointImpact}
              impactLevel={getImpactLevel(cumulativeImpact.pointImpact / 10)}
              description={cumulativeImpact.description}
              isApplied={true}
              // No button needed since this shows cumulative impact
              showApplyButton={false}
            />

            {/* New notice about saving changes */}
            <div className="mt-2 text-xs text-amber-600 flex items-center">
              <Save className="h-3 w-3 mr-1" />
              <span>Click "Save Changes" to update your resume.</span>
            </div>
          </div>
        )}

      {isOptimizing ? (
        <p className="text-sm text-gray-500">Generating suggestions...</p>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="space-y-4">
          {/* Group suggestions by type */}
          {sortedGroupKeys.map((groupKey) => {
            const groupSuggestions = groupedSuggestions[groupKey];
            // Get type info for the group
            const typeInfo = SUGGESTION_TYPES[groupKey] || {
              type: groupKey,
              title: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
              description: "Suggestions to improve your resume",
              icon: Sparkles,
            };

            const TypeIcon = typeInfo.icon || Sparkles;

            return (
              <div
                key={groupKey}
                className="bg-white rounded-lg border overflow-hidden"
              >
                {/* Group header */}
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <div className="flex items-center gap-1.5">
                    <TypeIcon className="h-4 w-4 text-brand-600" />
                    <h4 className="font-medium text-sm">{typeInfo.title}</h4>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {typeInfo.description}
                  </p>
                </div>

                {/* Group suggestions - simplified list without collapsibles */}
                <div className="divide-y">
                  {groupSuggestions.map((suggestion, groupIndex) => {
                    const suggestionIndex = suggestions.findIndex(
                      (s) =>
                        s.id === suggestion.id ||
                        (s.text === suggestion.text &&
                          s.type === suggestion.type)
                    );

                    const impact = suggestionImpacts[suggestionIndex];

                    // Get impact level from score or calculate it
                    const impactScore =
                      suggestion.score ||
                      (impact?.pointImpact ? impact.pointImpact * 5 : 5);
                    const impactLevel = getImpactLevel(impactScore);

                    return (
                      <div key={groupIndex} className="px-4 py-3">
                        <div className="flex justify-between items-start">
                          {/* Suggestion text and impact description */}
                          <div className="flex-1 pr-4">
                            <p className="font-medium text-sm mb-1">
                              {suggestion.isApplied && (
                                <span className="text-green-600 mr-1">✓</span>
                              )}
                              {suggestion.text}
                            </p>
                            <p className="text-xs text-gray-600">
                              {suggestion.impact}
                            </p>

                            {/* Impact badge */}
                            {showImpactScore && impact && (
                              <Badge
                                variant="outline"
                                className={`mt-2 text-xs ${
                                  impactLevel === ImpactLevel.CRITICAL
                                    ? "bg-red-50 text-red-600 border-red-200"
                                    : impactLevel === ImpactLevel.HIGH
                                    ? "bg-orange-50 text-orange-600 border-orange-200"
                                    : impactLevel === ImpactLevel.MEDIUM
                                    ? "bg-blue-50 text-blue-600 border-blue-200"
                                    : "bg-gray-50 text-gray-600 border-gray-200"
                                }`}
                              >
                                +{impact.pointImpact.toFixed(1)} points
                              </Badge>
                            )}
                          </div>

                          {/* Apply button */}
                          <Button
                            variant={
                              suggestion.isApplied ? "default" : "outline"
                            }
                            size="sm"
                            className={
                              suggestion.isApplied
                                ? "bg-green-600 hover:bg-green-700"
                                : ""
                            }
                            onClick={() =>
                              handleApplySuggestion(suggestionIndex)
                            }
                            disabled={!isEditing && !suggestion.isApplied} // Disable when not in edit mode and not applied
                          >
                            {suggestion.isApplied ? (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Applied
                              </>
                            ) : (
                              "Apply"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* New notice about atomic saving for applied suggestions */}
          {hasUnsavedSuggestions && isEditing && (
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <div className="flex items-start">
                <Save className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                <div>
                  <p className="mt-1">
                    Click "Save Changes" to permanently save all applied
                    suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Fallback suggestions when no real suggestions are available
        <ul className="space-y-3 text-sm">
          {FALLBACK_SUGGESTION_TYPES.map((suggestion, index) => (
            <li
              key={index}
              className="p-2 border-l-2 border-brand-400 bg-white rounded"
            >
              <p className="font-medium">{suggestion.title}</p>
              <p className="text-gray-600">{suggestion.description}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Instructions when not in edit mode */}
      {!isEditing && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
          Click the "Edit" button on the resume to apply suggestions. Your
          changes will be saved once you click "Save Changes".
        </div>
      )}
    </div>
  );
};

export default SuggestionsList;
