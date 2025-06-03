/**
 * useResumeData Hook - Specialized Resume Data Management
 *
 * This hook handles ONLY resume data operations:
 * - Loading resume from database
 * - Saving resume changes
 * - Resetting resume to original
 * - Managing suggestions and keywords
 * - ATS score calculations
 *
 * RESPONSIBILITIES:
 * - Database CRUD operations
 * - Resume content management
 * - Suggestions/keywords state
 * - Score calculations
 *
 * DOES NOT HANDLE:
 * - Upload operations
 * - UI permissions
 * - Edit mode state
 * - Debug features
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";

// Import types
import { OptimizedResumeData, Suggestion, Keyword } from "@/types/resumeTypes";

// Import services
import {
	getLatestOptimizedResume,
	saveResumeComplete,
	resetResumeToOriginal,
} from "@/services/resumeService";

// Import utility functions
import {
	normalizeSuggestion,
	normalizeKeyword,
} from "@/actions/resumeOptimizerActions";

/**
 * Resume data state for internal management
 */
interface ResumeDataState {
	resumeData: OptimizedResumeData | null;
	isLoading: boolean;
	isSaving: boolean;
	isResetting: boolean;
	hasUnsavedChanges: boolean;
	errorMessage: string | null;
}

/**
 * Hook interface for type safety
 */
interface UseResumeDataReturn {
	// Core resume data
	resumeData: OptimizedResumeData | null;
	hasResume: boolean;

	// Content data
	optimizedText: string;
	originalText: string;
	currentAtsScore: number;
	originalAtsScore: number;

	// Enhancement data
	suggestions: Suggestion[];
	keywords: Keyword[];
	selectedTemplate: string;

	// Multilingual support
	sectionTitles: Record<string, string>;
	resumeLanguage: string;

	// State flags
	isLoading: boolean;
	isSaving: boolean;
	isResetting: boolean;
	hasUnsavedChanges: boolean;
	contentModified: boolean;
	scoreModified: boolean;
	templateModified: boolean;

	// Error handling
	errorMessage: string | null;

	// Actions
	loadLatestResume: () => Promise<OptimizedResumeData | null>;
	saveResume: (content?: string, templateId?: string) => Promise<boolean>;
	resetResume: () => Promise<boolean>;

	// Enhancement actions
	applySuggestion: (suggestionId: string, applied: boolean) => boolean;
	applyKeyword: (keywordId: string, applied: boolean) => boolean;
	updateTemplate: (templateId: string) => void;

	// Content management
	updateResumeContent: (content: string) => void;
	setResumeData: (data: OptimizedResumeData) => void;

	// Utility functions
	getAppliedKeywords: () => string[];
	getAppliedSuggestions: () => string[];
	calculateCompletionScore: () => number;

	// Clear functions
	clearError: () => void;
	markAsUnmodified: () => void;
}

/**
 * Default values for ATS scores and point impacts
 */
const DEFAULT_ATS_SCORE = 65;
const DEFAULT_SUGGESTION_POINT_IMPACT = 2;
const DEFAULT_KEYWORD_POINT_IMPACT = 1;
const MIN_ATS_SCORE = 0;
const MAX_ATS_SCORE = 100;

/**
 * Main resume data hook
 */
export const useResumeData = (userId?: string): UseResumeDataReturn => {
	// ===== CORE STATE =====
	const [state, setState] = useState<ResumeDataState>({
		resumeData: null,
		isLoading: false,
		isSaving: false,
		isResetting: false,
		hasUnsavedChanges: false,
		errorMessage: null,
	});

	// Modification tracking
	const [contentModified, setContentModified] = useState<boolean>(false);
	const [scoreModified, setScoreModified] = useState<boolean>(false);
	const [templateModified, setTemplateModified] = useState<boolean>(false);

	// Refs for tracking initial values
	const initialScoreRef = useRef<number | null>(null);
	const initialTemplateRef = useRef<string>("basic");
	const lastSaveContentRef = useRef<string>("");

	// ===== COMPUTED VALUES =====

	const hasResume = !!state.resumeData;

	// Content with priority logic: last_saved_text > optimized_text
	const optimizedText = useMemo(() => {
		if (!state.resumeData) return "";
		return (
			state.resumeData.last_saved_text || state.resumeData.optimized_text || ""
		);
	}, [state.resumeData]);

	const originalText = state.resumeData?.original_text || "";

	// Score with priority logic: last_saved_score_ats > ats_score
	const currentAtsScore = useMemo(() => {
		if (!state.resumeData) return 0;
		return (
			state.resumeData.last_saved_score_ats ?? state.resumeData.ats_score ?? 0
		);
	}, [state.resumeData]);

	const originalAtsScore = state.resumeData?.ats_score ?? 0;

	// Enhancement data with safe defaults
	const suggestions = state.resumeData?.suggestions || [];
	const keywords = state.resumeData?.keywords || [];
	const selectedTemplate = state.resumeData?.selected_template || "basic";

	// Multilingual support
	const sectionTitles = (state.resumeData as any)?.sectionTitles || {};
	const resumeLanguage = state.resumeData?.language || "English";

	// Combined unsaved changes flag
	const hasUnsavedChanges =
		contentModified || scoreModified || templateModified;

	// ===== UTILITY FUNCTIONS =====

	/**
	 * Update state safely with partial updates
	 */
	const updateState = useCallback((updates: Partial<ResumeDataState>) => {
		setState((prevState) => ({ ...prevState, ...updates }));
	}, []);

	/**
	 * Set error message and clear loading states
	 */
	const setError = useCallback(
		(message: string) => {
			console.error("❌ Resume data error:", message);
			updateState({
				errorMessage: message,
				isLoading: false,
				isSaving: false,
				isResetting: false,
			});

			// Show toast notification
			toast.error("Resume Error", {
				description: message,
				duration: 6000,
			});
		},
		[updateState]
	);

	/**
	 * Clear error message
	 */
	const clearError = useCallback(() => {
		updateState({ errorMessage: null });
	}, [updateState]);

	/**
	 * Calculate updated ATS score based on applied suggestions and keywords
	 */
	const calculateUpdatedScore = useCallback(
		(
			baseScore: number,
			suggestions: Suggestion[],
			keywords: Keyword[]
		): number => {
			const suggestionPoints = suggestions
				.filter((s) => s.isApplied)
				.reduce(
					(total, s) =>
						total + (s.pointImpact || DEFAULT_SUGGESTION_POINT_IMPACT),
					0
				);

			const keywordPoints = keywords
				.filter((k) => k.isApplied)
				.reduce(
					(total, k) => total + (k.pointImpact || DEFAULT_KEYWORD_POINT_IMPACT),
					0
				);

			const newScore = baseScore + suggestionPoints + keywordPoints;
			return Math.min(MAX_ATS_SCORE, Math.max(MIN_ATS_SCORE, newScore));
		},
		[]
	);

	/**
	 * Mark all modifications as saved
	 */
	const markAsUnmodified = useCallback(() => {
		setContentModified(false);
		setScoreModified(false);
		setTemplateModified(false);
	}, []);

	// ===== DATABASE OPERATIONS =====

	/**
	 * Load latest resume from database
	 */
	const loadLatestResume =
		useCallback(async (): Promise<OptimizedResumeData | null> => {
			if (!userId) {
				console.warn("⚠️ Cannot load resume: No user ID provided");
				return null;
			}

			console.log("📥 Loading latest resume for user:", userId);

			updateState({ isLoading: true, errorMessage: null });

			try {
				const { data: apiData, error } = await getLatestOptimizedResume(userId);

				if (error) {
					setError("Failed to load resume from database");
					return null;
				}

				if (!apiData) {
					console.log("ℹ️ No resume found for user");
					updateState({
						isLoading: false,
						resumeData: null,
					});
					return null;
				}

				console.log("✅ Resume loaded successfully:", apiData.id);

				// Build complete resume data with normalized suggestions and keywords
				const completeResumeData: OptimizedResumeData = {
					id: apiData.id,
					user_id: userId,
					original_text: apiData.original_text || "",
					optimized_text: apiData.optimized_text || "",
					last_saved_text: apiData.last_saved_text ?? undefined,
					last_saved_score_ats:
						(apiData as any).last_saved_score_ats ?? undefined,
					language: apiData.language || "English",
					file_name: apiData.file_name || "",
					file_type: apiData.file_type || "",
					file_size: apiData.file_size || 0,
					file_url: (apiData as any).file_url,
					ats_score: apiData.ats_score || DEFAULT_ATS_SCORE,
					selected_template: (apiData as any).selected_template || "basic",
					created_at: (apiData as any).created_at,
					updated_at: (apiData as any).updated_at,

					// Normalize keywords with proper structure
					keywords: apiData.keywords
						? apiData.keywords.map((k: any) => normalizeKeyword(k))
						: [],

					// Normalize suggestions with proper structure
					suggestions: apiData.suggestions
						? apiData.suggestions.map((s: any) => normalizeSuggestion(s))
						: [],
				};

				// Set initial tracking values
				initialScoreRef.current = completeResumeData.ats_score;
				initialTemplateRef.current =
					completeResumeData.selected_template || "basic";
				lastSaveContentRef.current =
					completeResumeData.last_saved_text ||
					completeResumeData.optimized_text ||
					"";

				// Update state
				updateState({
					resumeData: completeResumeData,
					isLoading: false,
				});

				// Reset modification flags
				markAsUnmodified();

				return completeResumeData;
			} catch (error) {
				console.error("💥 Error loading resume:", error);
				setError(
					error instanceof Error ? error.message : "Failed to load resume"
				);
				return null;
			}
		}, [userId, updateState, setError, markAsUnmodified]);

	/**
	 * Save resume with all changes atomically
	 */
	const saveResume = useCallback(
		async (newContent?: string, templateId?: string): Promise<boolean> => {
			console.log("💾 Saving resume changes");

			// Validate prerequisites
			if (!userId) {
				setError("User not authenticated");
				return false;
			}

			if (!state.resumeData?.id) {
				setError("No resume data to save");
				return false;
			}

			// Determine content to save
			const contentToSave = newContent || optimizedText;
			if (!contentToSave) {
				setError("No content to save");
				return false;
			}

			// Determine template to save
			const templateToSave = templateId || selectedTemplate;

			updateState({ isSaving: true, errorMessage: null });

			try {
				// Get applied suggestions and keywords for atomic save
				const appliedSuggestionIds = suggestions
					.filter((s) => s.isApplied)
					.map((s) => s.id);

				const appliedKeywords = keywords
					.filter((k) => k.isApplied)
					.map((k) => k.text);

				// Calculate current score for save
				const scoreToSave = calculateUpdatedScore(
					originalAtsScore,
					suggestions,
					keywords
				);

				console.log("💾 Saving with atomic transaction:", {
					resumeId: state.resumeData.id,
					contentLength: contentToSave.length,
					atsScore: scoreToSave,
					appliedSuggestions: appliedSuggestionIds.length,
					appliedKeywords: appliedKeywords.length,
					template: templateToSave,
				});

				// Call atomic save service
				const { success, error } = await saveResumeComplete(
					state.resumeData.id,
					contentToSave,
					scoreToSave,
					appliedSuggestionIds,
					appliedKeywords,
					templateToSave
				);

				if (!success) {
					setError(error?.message || "Failed to save changes");
					return false;
				}

				// Update local data with saved values
				const updatedResumeData: OptimizedResumeData = {
					...state.resumeData,
					last_saved_text: contentToSave,
					last_saved_score_ats: scoreToSave,
					selected_template: templateToSave,
				};

				// Update state
				updateState({
					resumeData: updatedResumeData,
					isSaving: false,
				});

				// Update tracking refs
				lastSaveContentRef.current = contentToSave;

				// Reset modification flags
				markAsUnmodified();

				console.log("✅ Resume saved successfully");

				// Show success notification
				toast.success("Resume saved successfully", {
					description: "All changes have been saved",
					duration: 4000,
				});

				return true;
			} catch (error) {
				console.error("💥 Error saving resume:", error);
				setError(
					error instanceof Error ? error.message : "Failed to save resume"
				);
				return false;
			}
		},
		[
			userId,
			state.resumeData,
			optimizedText,
			selectedTemplate,
			suggestions,
			keywords,
			originalAtsScore,
			calculateUpdatedScore,
			updateState,
			setError,
			markAsUnmodified,
		]
	);

	/**
	 * Reset resume to original version
	 */
	const resetResume = useCallback(async (): Promise<boolean> => {
		console.log("🔄 Resetting resume to original");

		// Validate prerequisites
		if (!userId) {
			setError("User not authenticated");
			return false;
		}

		if (!state.resumeData?.id) {
			setError("No resume data to reset");
			return false;
		}

		updateState({ isResetting: true, errorMessage: null });

		try {
			// Call reset service
			const { success, error } = await resetResumeToOriginal(
				state.resumeData.id
			);

			if (!success) {
				setError(error?.message || "Failed to reset resume");
				return false;
			}

			// Update local data with reset values
			const resetResumeData: OptimizedResumeData = {
				...state.resumeData,
				last_saved_text: undefined,
				last_saved_score_ats: undefined,
				// Reset suggestions and keywords to unapplied
				suggestions: suggestions.map((s) => ({ ...s, isApplied: false })),
				keywords: keywords.map((k) => ({ ...k, isApplied: false })),
			};

			// Update state
			updateState({
				resumeData: resetResumeData,
				isResetting: false,
			});

			// Reset tracking refs
			lastSaveContentRef.current = resetResumeData.optimized_text || "";

			// Reset modification flags
			markAsUnmodified();

			console.log("✅ Resume reset successfully");

			// Show success notification
			toast.success("Resume reset successfully", {
				description: "Resume has been reset to original version",
				duration: 4000,
			});

			return true;
		} catch (error) {
			console.error("💥 Error resetting resume:", error);
			setError(
				error instanceof Error ? error.message : "Failed to reset resume"
			);
			return false;
		}
	}, [
		userId,
		state.resumeData,
		suggestions,
		keywords,
		updateState,
		setError,
		markAsUnmodified,
	]);

	// ===== ENHANCEMENT ACTIONS =====

	/**
	 * Apply or unapply a suggestion
	 */
	const applySuggestion = useCallback(
		(suggestionId: string, applied: boolean): boolean => {
			if (!state.resumeData) {
				console.error("❌ Cannot apply suggestion: No resume data");
				return false;
			}

			// Find and update the suggestion
			const updatedSuggestions = suggestions.map((suggestion) =>
				suggestion.id === suggestionId
					? { ...suggestion, isApplied: applied }
					: suggestion
			);

			// Check if suggestion was found
			const suggestionFound = updatedSuggestions.some(
				(s) => s.id === suggestionId
			);
			if (!suggestionFound) {
				console.error("❌ Suggestion not found:", suggestionId);
				return false;
			}

			// Calculate new score
			const newScore = calculateUpdatedScore(
				originalAtsScore,
				updatedSuggestions,
				keywords
			);

			// Update resume data
			const updatedResumeData: OptimizedResumeData = {
				...state.resumeData,
				suggestions: updatedSuggestions,
				ats_score: newScore,
			};

			updateState({ resumeData: updatedResumeData });
			setScoreModified(true);

			console.log(
				`✅ Suggestion ${applied ? "applied" : "unapplied"}:`,
				suggestionId
			);

			return true;
		},
		[
			state.resumeData,
			suggestions,
			keywords,
			originalAtsScore,
			calculateUpdatedScore,
			updateState,
		]
	);

	/**
	 * Apply or unapply a keyword
	 */
	const applyKeyword = useCallback(
		(keywordId: string, applied: boolean): boolean => {
			if (!state.resumeData) {
				console.error("❌ Cannot apply keyword: No resume data");
				return false;
			}

			// Find and update the keyword
			const updatedKeywords = keywords.map((keyword) =>
				keyword.id === keywordId ? { ...keyword, isApplied: applied } : keyword
			);

			// Check if keyword was found
			const keywordFound = updatedKeywords.some((k) => k.id === keywordId);
			if (!keywordFound) {
				console.error("❌ Keyword not found:", keywordId);
				return false;
			}

			// Calculate new score
			const newScore = calculateUpdatedScore(
				originalAtsScore,
				suggestions,
				updatedKeywords
			);

			// Update resume data
			const updatedResumeData: OptimizedResumeData = {
				...state.resumeData,
				keywords: updatedKeywords,
				ats_score: newScore,
			};

			updateState({ resumeData: updatedResumeData });
			setScoreModified(true);

			console.log(
				`✅ Keyword ${applied ? "applied" : "unapplied"}:`,
				keywordId
			);

			return true;
		},
		[
			state.resumeData,
			suggestions,
			keywords,
			originalAtsScore,
			calculateUpdatedScore,
			updateState,
		]
	);

	/**
	 * Update selected template
	 */
	const updateTemplate = useCallback(
		(templateId: string) => {
			if (!state.resumeData) {
				console.error("❌ Cannot update template: No resume data");
				return;
			}

			// Update resume data
			const updatedResumeData: OptimizedResumeData = {
				...state.resumeData,
				selected_template: templateId,
			};

			updateState({ resumeData: updatedResumeData });
			setTemplateModified(templateId !== initialTemplateRef.current);

			console.log("✅ Template updated:", templateId);
		},
		[state.resumeData, updateState]
	);

	// ===== CONTENT MANAGEMENT =====

	/**
	 * Update resume content
	 */
	const updateResumeContent = useCallback(
		(content: string) => {
			if (!state.resumeData) {
				console.error("❌ Cannot update content: No resume data");
				return;
			}

			// Update resume data with new content
			const updatedResumeData: OptimizedResumeData = {
				...state.resumeData,
				optimized_text: content,
			};

			updateState({ resumeData: updatedResumeData });
			setContentModified(content !== lastSaveContentRef.current);

			console.log("✅ Resume content updated");
		},
		[state.resumeData, updateState]
	);

	/**
	 * Set complete resume data (for external updates)
	 */
	const setResumeData = useCallback(
		(data: OptimizedResumeData) => {
			console.log("📝 Setting resume data:", data.id);

			// Normalize the data
			const normalizedData: OptimizedResumeData = {
				...data,
				keywords: data.keywords?.map(normalizeKeyword) || [],
				suggestions: data.suggestions?.map(normalizeSuggestion) || [],
			};

			// Update state
			updateState({ resumeData: normalizedData });

			// Update tracking refs
			initialScoreRef.current = normalizedData.ats_score || DEFAULT_ATS_SCORE;
			initialTemplateRef.current = normalizedData.selected_template || "basic";
			lastSaveContentRef.current =
				normalizedData.last_saved_text || normalizedData.optimized_text || "";

			// Reset modification flags
			markAsUnmodified();
		},
		[updateState, markAsUnmodified]
	);

	// ===== UTILITY FUNCTIONS =====

	/**
	 * Get array of applied keywords
	 */
	const getAppliedKeywords = useCallback((): string[] => {
		return keywords
			.filter((keyword) => keyword.isApplied)
			.map((keyword) => keyword.text);
	}, [keywords]);

	/**
	 * Get array of applied suggestion IDs
	 */
	const getAppliedSuggestions = useCallback((): string[] => {
		return suggestions
			.filter((suggestion) => suggestion.isApplied)
			.map((suggestion) => suggestion.id);
	}, [suggestions]);

	/**
	 * Calculate completion score based on applied suggestions and keywords
	 */
	const calculateCompletionScore = useCallback((): number => {
		if (!suggestions.length && !keywords.length) return 0;

		const appliedSuggestions = suggestions.filter((s) => s.isApplied).length;
		const appliedKeywords = keywords.filter((k) => k.isApplied).length;

		const totalItems = suggestions.length + keywords.length;
		const appliedItems = appliedSuggestions + appliedKeywords;

		return Math.round((appliedItems / totalItems) * 100);
	}, [suggestions, keywords]);

	// ===== EFFECTS =====

	// Auto-load resume when userId becomes available
	useEffect(() => {
		if (userId && !state.resumeData && !state.isLoading) {
			console.log("🔄 Auto-loading resume for new user ID");
			loadLatestResume();
		}
	}, [userId, state.resumeData, state.isLoading, loadLatestResume]);

	// ===== RETURN INTERFACE =====

	return {
		// Core resume data
		resumeData: state.resumeData,
		hasResume,

		// Content data
		optimizedText,
		originalText,
		currentAtsScore,
		originalAtsScore,

		// Enhancement data
		suggestions,
		keywords,
		selectedTemplate,

		// Multilingual support
		sectionTitles,
		resumeLanguage,

		// State flags
		isLoading: state.isLoading,
		isSaving: state.isSaving,
		isResetting: state.isResetting,
		hasUnsavedChanges,
		contentModified,
		scoreModified,
		templateModified,

		// Error handling
		errorMessage: state.errorMessage,

		// Actions
		loadLatestResume,
		saveResume,
		resetResume,

		// Enhancement actions
		applySuggestion,
		applyKeyword,
		updateTemplate,

		// Content management
		updateResumeContent,
		setResumeData,

		// Utility functions
		getAppliedKeywords,
		getAppliedSuggestions,
		calculateCompletionScore,

		// Clear functions
		clearError,
		markAsUnmodified,
	};
};
