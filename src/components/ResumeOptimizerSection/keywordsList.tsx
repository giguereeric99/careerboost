/**
 * Enhanced KeywordsList Component
 *
 * This component displays recommended keywords to improve resume ATS compatibility
 * with advanced impact analysis, categorization, and real-time score preview.
 *
 * Features:
 * - Categorized keywords by type (technical, soft skills, etc.)
 * - Single impact preview integrated within the component
 * - Disabled keyword application when not in edit mode
 * - Visual indicators for applied keywords
 * - Tooltip descriptions for each keyword category
 * - Updated to work with atomic save approach (local changes until explicit save)
 */

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle, BarChart2, Lock, Save } from "lucide-react";
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
import { Keyword } from "@/types/keywordTypes";
import {
	KEYWORD_CATEGORIES,
	KEYWORD_PRIORITY_ORDER,
} from "@/constants/suggestions";

/**
 * Props interface for KeywordsList component
 */
interface KeywordsListProps {
	keywords: Keyword[]; // Available keywords from AI optimization
	onKeywordApply: (index: number) => void; // Handler for applying keywords locally
	resumeContent?: string; // Current resume content for analysis
	showImpactDetails?: boolean; // Whether to show detailed impact information
	needsRegeneration?: boolean; // Whether changes need regeneration
	currentScore?: number; // Current ATS score for impact calculation
	isEditing?: boolean; // Whether the resume is in edit mode
	// FIXED: Added missing simulateKeywordImpact function
	simulateKeywordImpact?: (
		keywordText: string,
		resumeContent: string,
		currentScore: number
	) => {
		newScore: number;
		pointImpact: number;
		description: string;
	};
}

/**
 * KeywordsList component displays recommended keywords
 * with impact analysis and categorization
 */
const KeywordsList: React.FC<KeywordsListProps> = ({
	keywords,
	onKeywordApply,
	resumeContent = "",
	showImpactDetails = false,
	needsRegeneration = false,
	currentScore = 0,
	isEditing = false,
}) => {
	// Define impact data structure for type safety
	interface ImpactData {
		newScore: number;
		pointImpact: number;
		description: string;
	}

	// State for keyword impacts - pre-calculated for performance
	const [keywordImpacts, setKeywordImpacts] = useState<ImpactData[]>([]);

	/**
	 * Calculate cumulative impact of all applied keywords
	 * This shows the total effect of all applied keywords combined
	 */
	const cumulativeImpact = useMemo(() => {
		// Find all keywords that have been applied
		const appliedKeywords = keywords.filter((k) => k.isApplied || k.applied);

		// If no keywords have been applied, return null
		if (appliedKeywords.length === 0) {
			// console.log("❌ No applied keywords, returning null");
			return null;
		}

		// Calculate total point impact from applied keywords
		const totalPointImpact = appliedKeywords.reduce(
			(sum, keyword) => sum + (keyword.pointImpact || 1), // Default 1 point per keyword
			0
		);

		// Calculate the new score, capped at 100
		const newScore = Math.min(100, currentScore + totalPointImpact);

		// Return the cumulative impact data
		const result = {
			newScore,
			pointImpact: totalPointImpact,
			description: `Applying ${appliedKeywords.length} keyword${
				appliedKeywords.length !== 1 ? "s" : ""
			} improves your resume's ATS compatibility.`,
			appliedCount: appliedKeywords.length,
		};

		console.log("✅ KEYWORDS CUMULATIVE IMPACT RESULT:", result);
		return result;
	}, [keywords, currentScore]);

	/**
	 * Map numeric impact score to impact level enum
	 * Converts a raw impact score (0.0-1.0) to a categorical level
	 *
	 * @param impact - Impact score between 0.0 and 1.0
	 * @returns ImpactLevel enum value
	 */
	const getImpactLevel = (impact: number): ImpactLevel => {
		if (impact >= 6) return ImpactLevel.CRITICAL;
		if (impact >= 4) return ImpactLevel.HIGH;
		if (impact >= 2) return ImpactLevel.MEDIUM;
		return ImpactLevel.LOW;
	};

	/**
	 * Gets the appropriate color class for an impact level
	 * Used for visual indicators throughout the component
	 *
	 * @param level - Impact level or numeric score
	 * @returns CSS class string for the impact level
	 */
	const getImpactColor = (level: ImpactLevel | number): string => {
		// Convert numeric impact to level if needed
		const impactLevel =
			typeof level === "number" ? getImpactLevel(level) : level;

		// Return the appropriate color class based on the impact level
		switch (impactLevel) {
			case ImpactLevel.CRITICAL:
				return "text-red-600 bg-red-50 border-red-200";
			case ImpactLevel.HIGH:
				return "text-orange-600 bg-orange-50 border-orange-200";
			case ImpactLevel.MEDIUM:
				return "text-blue-600 bg-blue-50 border-blue-200";
			case ImpactLevel.LOW:
			default:
				return "text-gray-600 bg-gray-50 border-gray-200";
		}
	};

	/**
	 * Handle clicking a keyword button
	 * Only applies the keyword locally if in edit mode
	 * Changes are saved atomically later
	 *
	 * @param index - Index of the keyword to apply
	 */
	const handleKeywordClick = (index: number) => {
		// Only allow applying keywords in edit mode
		if (isEditing) {
			onKeywordApply(index);
		}
	};

	/**
	 * Group keywords by category for better organization
	 * Creates a dictionary with category keys and arrays of keywords
	 */
	const groupedKeywords = keywords.reduce<Record<string, Keyword[]>>(
		(groups, keyword) => {
			// Use the keyword's category or default to 'general'
			const category = keyword.category || "general";

			// Initialize the category array if it doesn't exist
			if (!groups[category]) {
				groups[category] = [];
			}

			// Add the keyword to its category group
			groups[category].push(keyword);
			return groups;
		},
		{}
	);

	/**
	 * Sort group keys by priority order
	 * This ensures the most important categories appear first
	 */
	const sortedGroupKeys = Object.keys(groupedKeywords).sort((a, b) => {
		// Get the priority index for each category
		const indexA = KEYWORD_PRIORITY_ORDER.indexOf(a);
		const indexB = KEYWORD_PRIORITY_ORDER.indexOf(b);

		// Handle categories not in the priority list
		if (indexA === -1 && indexB === -1) return a.localeCompare(b);
		if (indexA === -1) return 1;
		if (indexB === -1) return -1;

		// Sort by priority index
		return indexA - indexB;
	});

	// If no keywords available, show a message
	if (keywords.length === 0) {
		return (
			<div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
				<div className="flex items-center gap-2 mb-3">
					<Sparkles className="h-5 w-5 text-brand-600" />
					<h3 className="font-medium">Recommended Keywords</h3>
				</div>
				<p className="text-sm text-gray-500">No keywords available.</p>
			</div>
		);
	}

	// Get applied keywords count for the badge
	const appliedKeywordsCount = keywords.filter(
		(k) => k.isApplied || k.applied
	).length;

	// Check if there are any unsaved applied keywords
	const hasUnsavedKeywords = appliedKeywordsCount > 0;

	return (
		<div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
			{/* Header with title and applied count */}
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					<Sparkles className="h-5 w-5 text-brand-600" />
					<h3 className="font-medium">Recommended Keywords</h3>
				</div>

				{/* Edit mode indicator and applied count */}
				<div className="flex items-center gap-2">
					{/* Badge showing number of applied keywords */}
					{appliedKeywordsCount > 0 && (
						<Badge
							variant="outline"
							className="bg-green-50 text-green-600 border-green-200"
						>
							{appliedKeywordsCount} applied
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
									Click "Edit" button on the resume to apply keywords
								</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>

			{/* Integrated impact preview - shows the cumulative effect of all applied keywords */}
			{showImpactDetails &&
				cumulativeImpact &&
				cumulativeImpact.appliedCount > 0 && (
					<div className="mb-4 bg-white border rounded-lg p-3">
						<div className="flex items-center gap-2 mb-2">
							<BarChart2 className="h-4 w-4 text-brand-600" />
							<h4 className="text-sm font-medium">Keywords Impact</h4>
						</div>

						<ImpactPreview
							currentScore={currentScore}
							newScore={cumulativeImpact.newScore}
							pointImpact={cumulativeImpact.pointImpact}
							impactLevel={getImpactLevel(cumulativeImpact.pointImpact)}
							description={cumulativeImpact.description}
							isApplied={true}
							// No button needed since this shows cumulative impact
							showApplyButton={false}
						/>

						{/* New notice about saving changes */}
						<div className="mt-2 text-xs text-amber-600 flex items-center">
							<Save className="h-3 w-3 mr-1" />
							<span>
								Keywords applied locally. Click "Save All Changes" to update
								your resume.
							</span>
						</div>
					</div>
				)}

			{/* Group keywords by category for better organization */}
			<div className="space-y-4">
				{sortedGroupKeys.map((category) => {
					// Get all keywords in this category
					const categoryKeywords = groupedKeywords[category];

					// Get category info from the predefined categories or use default
					const categoryInfo =
						KEYWORD_CATEGORIES[category] || KEYWORD_CATEGORIES.general;

					// Get the icon component for this category
					const CategoryIcon = categoryInfo.icon || Sparkles;

					return (
						<div
							key={category}
							className="bg-white rounded-lg border overflow-hidden"
						>
							{/* Category header with icon and description */}
							<div className="bg-gray-50 px-3 py-2 border-b">
								<div className="flex items-center gap-1.5">
									<CategoryIcon className="h-4 w-4 text-brand-600" />
									<h4 className="font-medium text-sm">{categoryInfo.title}</h4>
								</div>
								<p className="text-xs text-gray-600">
									{categoryInfo.description}
								</p>
							</div>

							{/* Category keywords display as buttons */}
							<div className="p-3 flex flex-wrap gap-2">
								{categoryKeywords.map((keyword, categoryIndex) => {
									// Find the global index of this keyword for consistent reference
									const keywordIndex = keywords.findIndex(
										(k) =>
											k.text === keyword.text &&
											(k.id === keyword.id || k.category === keyword.category)
									);

									// Get pre-calculated impact for this keyword
									const impact = keywordImpacts[keywordIndex];

									// Normalize applied state (supports both isApplied and applied fields)
									const isKeywordApplied = keyword.isApplied || keyword.applied;

									// Get impact level from keyword or calculate it
									const impactValue =
										keyword.impact ||
										(impact?.pointImpact ? impact.pointImpact / 2 : 0.5);
									const impactLevel = getImpactLevel(impactValue);

									return (
										<div key={categoryIndex} className="relative">
											{/* Keyword button with tooltip */}
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant={isKeywordApplied ? "default" : "outline"}
															size="sm"
															className={`${
																isKeywordApplied ? "bg-brand-600" : ""
															} relative`}
															onClick={() => handleKeywordClick(keywordIndex)}
															// Disable button style when not in edit mode and not applied
															disabled={!isEditing && !isKeywordApplied}
														>
															{/* Keyword text */}
															{keyword.text}

															{/* Show checkmark if applied */}
															{isKeywordApplied && (
																<CheckCircle className="h-3 w-3 ml-1" />
															)}

															{/* Show point impact indicator for unapplied keywords */}
															{!isKeywordApplied &&
																impact &&
																showImpactDetails &&
																isEditing && (
																	<span
																		className={`absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-[10px] rounded-full font-bold ${getImpactColor(
																			impactLevel
																		).replace("border-", "bg-")}`}
																	>
																		+
																	</span>
																)}
														</Button>
													</TooltipTrigger>

													{/* Keyword tooltip with detailed information */}
													<TooltipContent side="top" className="max-w-xs p-3">
														<div className="flex flex-col gap-1">
															{/* Category info */}
															<div className="flex items-center gap-1">
																<CategoryIcon className="h-4 w-4" />
																<span className="font-medium">
																	{categoryInfo.title}
																</span>
															</div>
															<p className="text-xs">
																{categoryInfo.description}
															</p>

															{/* Impact details section */}
															{showImpactDetails && impact && (
																<div className="mt-1 pt-1 border-t border-gray-200">
																	<Badge
																		className={`text-xs py-0 px-2 mt-1 ${getImpactColor(
																			impactLevel
																		)}`}
																		variant="outline"
																	>
																		{impactLevel.charAt(0).toUpperCase() +
																			impactLevel.slice(1)}
																		Impact (+{impact.pointImpact.toFixed(1)})
																	</Badge>
																	<p className="text-xs mt-1">
																		Adding this keyword can improve your ATS
																		score by approximately{" "}
																		{impact.pointImpact.toFixed(1)} points.
																	</p>
																</div>
															)}

															{/* Applied status indicator - updated for atomic save approach */}
															{isKeywordApplied ? (
																<div className="text-xs text-green-600 mt-1 flex flex-col gap-1">
																	<p>✓ Applied to your resume locally</p>
																	<p className="text-amber-600 flex items-center gap-1">
																		<Save className="h-3 w-3" />
																		<span>
																			Don't forget to "Save All Changes"
																		</span>
																	</p>
																</div>
															) : isEditing ? (
																<p className="text-xs text-gray-500 mt-1">
																	Click to add to your resume
																</p>
															) : (
																<p className="text-xs text-gray-500 mt-1">
																	Enter edit mode to apply
																</p>
															)}
														</div>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}

				{/* New notice about atomic saving for applied keywords */}
				{hasUnsavedKeywords && isEditing && (
					<div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
						<div className="flex items-start">
							<Save className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
							<div>
								<p className="mt-1">
									Click "Save Changes" to permanently save all applied keywords.
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Instructions when not in edit mode - updated for atomic save */}
			{!isEditing && (
				<div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
					Click the "Edit" button on the resume to modify and apply keywords.
					Your changes will be saved once you click "Save Changes".
				</div>
			)}
		</div>
	);
};

export default KeywordsList;
