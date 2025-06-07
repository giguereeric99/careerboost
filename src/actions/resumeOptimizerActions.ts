/**
 * Resume Optimizer Actions - EXTENDED VERSION WITH UPLOADTHING INTEGRATION
 *
 * This module contains all action creators and the reducer for the resume optimizer
 * state machine. It handles all state transitions and business logic.
 * EXTENDED: Now includes comprehensive UploadThing functionality integration
 */

import {
	CVOptimizerState,
	CVOptimizerContext,
	CVOptimizerAction,
	CVOptimizerMachineState,
	UploadedFileInfo,
} from "@/types/resumeOptimizerTypes";
import { OptimizedResumeData, Suggestion, Keyword } from "@/types/resumeTypes";
import {
	VALID_STATE_TRANSITIONS,
	DEFAULT_CONTEXT,
	DEFAULT_ATS_SCORE,
	DEFAULT_SUGGESTION_POINT_IMPACT,
	DEFAULT_KEYWORD_POINT_IMPACT,
	MIN_ATS_SCORE,
	MAX_ATS_SCORE,
	UPLOAD_CONFIG,
	VALIDATION_RULES,
	ERROR_MESSAGES,
	PROCESSING_STATES,
	LOADING_STATES,
	UPLOAD_STATES,
	FILE_PROCESSING_STATES,
	ANALYSIS_STATES,
	shouldHideUploadButton,
	getUploadStatusMessage,
	shouldFreezeUI,
} from "@/constants/resumeOptimizerConstants";

// ===== UTILITY FUNCTIONS - EXTENDED =====

/**
 * Type guard to check if a value is not null or undefined
 */
function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Get display content based on database priority logic
 * Priority: last_saved_text > optimized_text
 */
export const getDisplayContent = (
	resumeData: OptimizedResumeData | null,
	tempContent?: string
): string => {
	if (tempContent) return tempContent;
	if (!resumeData) return "";
	return resumeData.last_saved_text || resumeData.optimized_text || "";
};

/**
 * Get display score based on database priority logic
 * Priority: last_saved_score_ats > ats_score
 */
export const getDisplayScore = (
	resumeData: OptimizedResumeData | null
): number => {
	if (!resumeData) return 0;
	return resumeData.last_saved_score_ats ?? resumeData.ats_score ?? 0;
};

/**
 * Check if a state transition is valid
 */
export const isValidTransition = (
	from: CVOptimizerState,
	to: CVOptimizerState
): boolean => {
	return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
};

/**
 * Create initial context with safe defaults
 */
export const createInitialContext = (): CVOptimizerContext => ({
	...DEFAULT_CONTEXT,
});

/**
 * Calculate if there are unsaved changes
 */
export const calculateUnsavedChanges = (
	context: CVOptimizerContext
): boolean => {
	return (
		context.contentModified ||
		context.scoreModified ||
		context.templateModified ||
		context.hasTempChanges
	);
};

/**
 * Calculate new ATS score based on applied suggestions and keywords
 */
export const calculateUpdatedScore = (
	originalScore: number | null,
	suggestions: Suggestion[],
	keywords: Keyword[]
): number => {
	const baseScore = originalScore || DEFAULT_ATS_SCORE;

	const suggestionPoints = suggestions
		.filter((s) => s.isApplied)
		.reduce(
			(total, s) => total + (s.pointImpact || DEFAULT_SUGGESTION_POINT_IMPACT),
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
};

// ===== EXTENDED: UPLOAD VALIDATION UTILITIES =====

/**
 * Validate file before upload
 * Checks file size, type, and other constraints
 */
export const validateFile = (
	file: File,
	userPlan: string = "basic"
): {
	isValid: boolean;
	error?: string;
} => {
	// Check if file exists
	if (!file) {
		return { isValid: false, error: "No file provided" };
	}

	// Check file size
	if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
		const maxSizeMB = UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
		return {
			isValid: false,
			error: ERROR_MESSAGES.UPLOAD_ERRORS.FILE_TOO_LARGE.replace(
				"{maxSize}",
				maxSizeMB.toString()
			),
		};
	}

	if (file.size < UPLOAD_CONFIG.MIN_FILE_SIZE) {
		return {
			isValid: false,
			error: ERROR_MESSAGES.UPLOAD_ERRORS.FILE_TOO_SMALL.replace(
				"{minSize}",
				UPLOAD_CONFIG.MIN_FILE_SIZE.toString()
			),
		};
	}

	// Check file type
	if (!UPLOAD_CONFIG.SUPPORTED_FILE_TYPES.includes(file.type as any)) {
		const supportedTypes = UPLOAD_CONFIG.SUPPORTED_FILE_TYPES.join(", ");
		return {
			isValid: false,
			error: ERROR_MESSAGES.UPLOAD_ERRORS.INVALID_FILE_TYPE.replace(
				"{supportedTypes}",
				supportedTypes
			),
		};
	}

	// Check filename length and characters
	if (
		file.name.length > VALIDATION_RULES.UPLOAD_VALIDATION.MAX_FILENAME_LENGTH
	) {
		return {
			isValid: false,
			error: ERROR_MESSAGES.UPLOAD_ERRORS.FILENAME_TOO_LONG,
		};
	}

	if (
		VALIDATION_RULES.UPLOAD_VALIDATION.FORBIDDEN_FILENAME_CHARS.test(file.name)
	) {
		return {
			isValid: false,
			error: ERROR_MESSAGES.UPLOAD_ERRORS.INVALID_FILENAME,
		};
	}

	return { isValid: true };
};

/**
 * Validate text content before processing
 * Checks content length and basic format requirements
 */
export const validateTextContent = (
	content: string
): {
	isValid: boolean;
	error?: string;
} => {
	if (!content || content.trim().length === 0) {
		return { isValid: false, error: "No content provided" };
	}

	if (content.length < UPLOAD_CONFIG.MIN_TEXT_LENGTH) {
		return {
			isValid: false,
			error: `Content must be at least ${UPLOAD_CONFIG.MIN_TEXT_LENGTH} characters long`,
		};
	}

	if (content.length > UPLOAD_CONFIG.MAX_TEXT_LENGTH) {
		return {
			isValid: false,
			error: `Content must be less than ${UPLOAD_CONFIG.MAX_TEXT_LENGTH} characters long`,
		};
	}

	return { isValid: true };
};

/**
 * Normalize suggestion object to ensure consistent structure
 * Handles different property naming conventions (camelCase vs snake_case)
 */
export const normalizeSuggestion = (suggestion: any): Suggestion => {
	console.log("🔧 normalizeSuggestion input:", {
		id: suggestion.id,
		is_applied: suggestion.is_applied,
		isApplied: suggestion.isApplied,
		applied: suggestion.applied,
	});

	// FIXED: Check is_applied FIRST (database format), then frontend formats
	const isAppliedValue =
		suggestion.is_applied !== undefined
			? suggestion.is_applied
			: suggestion.isApplied !== undefined
			? suggestion.isApplied
			: suggestion.applied !== undefined
			? suggestion.applied
			: false;

	const result = {
		id: suggestion.id || suggestion.suggestion_id || String(Math.random()),
		text: suggestion.text || suggestion.original_text || "",
		type: suggestion.type || "general",
		impact: suggestion.impact || "This improvement could enhance your resume",
		isApplied: isAppliedValue,
		pointImpact:
			suggestion.pointImpact ||
			suggestion.point_impact ||
			DEFAULT_SUGGESTION_POINT_IMPACT,
	};

	console.log("🔧 normalizeSuggestion output:", {
		id: result.id,
		isApplied: result.isApplied,
	});

	return result;
};

/**
 * Normalize keyword object to ensure consistent structure
 * Handles different property naming conventions and formats
 */
export const normalizeKeyword = (keyword: any): Keyword => {
	// Handle case where keyword is just a string
	if (typeof keyword === "string") {
		return {
			id: String(Math.random()),
			text: keyword,
			isApplied: false,
			relevance: 1,
			pointImpact: DEFAULT_KEYWORD_POINT_IMPACT,
		};
	}

	// FIXED: Check is_applied FIRST (database format), then frontend formats
	const isAppliedValue =
		keyword.is_applied !== undefined
			? keyword.is_applied
			: keyword.isApplied !== undefined
			? keyword.isApplied
			: keyword.applied !== undefined
			? keyword.applied
			: false;

	// Handle keyword as an object with potential varying property names
	return {
		id: keyword.id || keyword.keyword_id || String(Math.random()),
		text: keyword.text || keyword.keyword || "",
		isApplied: isAppliedValue,
		relevance: keyword.relevance || 1,
		pointImpact:
			keyword.pointImpact ||
			keyword.point_impact ||
			DEFAULT_KEYWORD_POINT_IMPACT,
	};
};

// ===== ACTION CREATORS - EXTENDED WITH UPLOADTHING =====

/**
 * Action creators for type-safe action dispatching
 * EXTENDED: Added comprehensive upload-related actions + UploadThing integration
 */
export const actionCreators = {
	// Initialization actions
	initialize: (userId: string | null): CVOptimizerAction => ({
		type: "INITIALIZE",
		payload: { userId },
	}),

	setWelcomeState: (): CVOptimizerAction => ({
		type: "SET_WELCOME_STATE",
	}),

	checkExistingResume: (): CVOptimizerAction => ({
		type: "CHECK_EXISTING_RESUME",
	}),

	resumeFound: (resumeData: OptimizedResumeData): CVOptimizerAction => ({
		type: "RESUME_FOUND",
		payload: { resumeData },
	}),

	noResumeFound: (): CVOptimizerAction => ({
		type: "NO_RESUME_FOUND",
	}),

	// EXTENDED: Upload workflow actions
	startUpload: (): CVOptimizerAction => ({
		type: "START_UPLOAD",
	}),

	selectFile: (file: File): CVOptimizerAction => ({
		type: "SELECT_FILE",
		payload: { file },
	}),

	startFileUpload: (file: File): CVOptimizerAction => ({
		type: "START_FILE_UPLOAD",
		payload: { file },
	}),

	updateUploadProgress: (progress: number): CVOptimizerAction => ({
		type: "UPDATE_UPLOAD_PROGRESS",
		payload: { progress },
	}),

	fileUploadComplete: (fileInfo: UploadedFileInfo): CVOptimizerAction => ({
		type: "FILE_UPLOAD_COMPLETE",
		payload: { fileInfo },
	}),

	startTextUpload: (content: string): CVOptimizerAction => ({
		type: "START_TEXT_UPLOAD",
		payload: { content },
	}),

	startFileProcessing: (): CVOptimizerAction => ({
		type: "START_FILE_PROCESSING",
	}),

	fileProcessingComplete: (extractedText: string): CVOptimizerAction => ({
		type: "FILE_PROCESSING_COMPLETE",
		payload: { extractedText },
	}),

	startAnalysis: (): CVOptimizerAction => ({
		type: "START_ANALYSIS",
	}),

	analysisComplete: (resumeData: OptimizedResumeData): CVOptimizerAction => ({
		type: "ANALYSIS_COMPLETE",
		payload: { resumeData },
	}),

	resumeValidationFailed: (validationErrors: any): CVOptimizerAction => ({
		type: "RESUME_VALIDATION_FAILED",
		payload: { validationErrors },
	}),

	setDragOver: (isDragOver: boolean): CVOptimizerAction => ({
		type: "SET_DRAG_OVER",
		payload: { isDragOver },
	}),

	updateTextContent: (content: string): CVOptimizerAction => ({
		type: "UPDATE_TEXT_CONTENT",
		payload: { content },
	}),

	// NEW: UploadThing specific action creators
	uploadThingBegin: (files: File[]): CVOptimizerAction => ({
		type: "UPLOAD_THING_BEGIN",
		payload: { files },
	}),

	uploadThingComplete: (results: any[]): CVOptimizerAction => ({
		type: "UPLOAD_THING_COMPLETE",
		payload: { results },
	}),

	uploadThingError: (error: Error): CVOptimizerAction => ({
		type: "UPLOAD_THING_ERROR",
		payload: { error },
	}),

	setUploadThingActive: (isActive: boolean): CVOptimizerAction => ({
		type: "SET_UPLOAD_THING_ACTIVE",
		payload: { isActive },
	}),

	// Edit mode actions
	enterEditMode: (
		origin: "manual" | "automatic" = "manual"
	): CVOptimizerAction => ({
		type: "ENTER_EDIT_MODE",
	}),

	exitEditMode: (): CVOptimizerAction => ({
		type: "EXIT_EDIT_MODE",
	}),

	// Content management actions
	updateContent: (content: string): CVOptimizerAction => ({
		type: "UPDATE_CONTENT",
		payload: { content },
	}),

	updateSection: (sectionId: string, content: string): CVOptimizerAction => ({
		type: "UPDATE_SECTION",
		payload: { sectionId, content },
	}),

	// Enhancement actions
	applySuggestion: (
		suggestionId: string,
		applied: boolean
	): CVOptimizerAction => ({
		type: "APPLY_SUGGESTION",
		payload: { suggestionId, applied },
	}),

	applyKeyword: (keywordId: string, applied: boolean): CVOptimizerAction => ({
		type: "APPLY_KEYWORD",
		payload: { keywordId, applied },
	}),

	// Template actions
	updateTemplate: (templateId: string): CVOptimizerAction => ({
		type: "UPDATE_TEMPLATE",
		payload: { templateId },
	}),

	// Save/Reset actions
	startSaving: (): CVOptimizerAction => ({
		type: "START_SAVING",
	}),

	saveSuccess: (resumeData: OptimizedResumeData): CVOptimizerAction => ({
		type: "SAVE_SUCCESS",
		payload: { resumeData },
	}),

	startReset: (): CVOptimizerAction => ({
		type: "START_RESET",
	}),

	resetSuccess: (resumeData: OptimizedResumeData): CVOptimizerAction => ({
		type: "RESET_SUCCESS",
		payload: { resumeData },
	}),

	// UI actions
	switchTab: (tab: "upload" | "preview"): CVOptimizerAction => ({
		type: "SWITCH_TAB",
		payload: { tab },
	}),

	// Data update actions
	updateResumeData: (
		optimizedText: string,
		resumeId: string,
		atsScore: number,
		suggestions: Suggestion[],
		keywords: Keyword[],
		aiResponse?: any
	): CVOptimizerAction => ({
		type: "UPDATE_RESUME_DATA",
		payload: {
			optimizedText,
			resumeId,
			atsScore,
			suggestions,
			keywords,
			aiResponse,
		},
	}),

	// EXTENDED: Enhanced error handling actions
	error: (
		message: string,
		error?: Error,
		errorType?: "upload" | "file_processing" | "analysis" | "save" | "reset",
		context?: {
			operation: string;
			step?: string;
			retryable: boolean;
			userMessage: string;
			technicalDetails?: string;
		}
	): CVOptimizerAction => ({
		type: "ERROR",
		payload: { message, error, errorType, context },
	}),

	clearError: (): CVOptimizerAction => ({
		type: "CLEAR_ERROR",
	}),

	retryLastOperation: (): CVOptimizerAction => ({
		type: "RETRY_LAST_OPERATION",
	}),

	logout: (): CVOptimizerAction => ({
		type: "LOGOUT",
	}),
};

/**
 * Helper function to map operation strings to valid error context operation types
 */
const mapOperationToValidType = (
	operation: string
): "upload" | "file_processing" | "analysis" | "save" | "reset" => {
	// Map specific operations to general categories
	switch (operation) {
		case "file_selection":
		case "file_validation":
		case "uploadthing_begin":
		case "uploadthing_complete":
		case "uploadthing_error":
		case "uploadthing_processing":
			return "upload";

		case "text_processing":
		case "text_validation":
		case "content_extraction":
		case "response_parsing":
		case "response_validation":
			return "file_processing";

		case "debug_simulation":
		case "ai_processing":
		case "unexpected_error":
		case "reducer_crash":
		case "input_validation":
			return "analysis";

		case "processing":
		case "validation":
			return "file_processing";

		// Default mappings
		case "upload":
		case "file_processing":
		case "analysis":
		case "save":
		case "reset":
			return operation as
				| "upload"
				| "file_processing"
				| "analysis"
				| "save"
				| "reset";

		default:
			// Fallback to analysis for unknown operations
			return "analysis";
	}
};

// ===== STATE MACHINE REDUCER - EXTENDED WITH UPLOADTHING =====

/**
 * Main reducer function that handles all state transitions - FULLY REFACTORED WITH GUARDS
 * Ensures only valid transitions occur and maintains data consistency
 *
 * NEW FEATURES:
 * - ✅ Comprehensive guard system to prevent invalid states
 * - ✅ Duplicate action protection
 * - ✅ State consistency validation
 * - ✅ Enhanced logging and debugging
 * - ✅ Recovery path validation
 * - ✅ Processing state protection
 */
export const cvOptimizerReducer = (
	state: CVOptimizerMachineState,
	action: CVOptimizerAction
): CVOptimizerMachineState => {
	// LOGOUT can be triggered from any state
	if (action.type === "LOGOUT") {
		console.log("🚪 LOGOUT - Complete reset from state :", state.current);
		return {
			current: CVOptimizerState.INITIALIZING,
			context: createInitialContext(),
		};
	}

	// ===== HELPER FUNCTIONS FOR GUARDS =====

	/**
	 * Check if an action is an error action
	 */
	const isErrorAction = (action: CVOptimizerAction): boolean => {
		return action.type === "ERROR";
	};

	/**
	 * Check if an action is a success/completion action
	 */
	const isSuccessAction = (action: CVOptimizerAction): boolean => {
		return [
			"ANALYSIS_COMPLETE",
			"SAVE_SUCCESS",
			"RESET_SUCCESS",
			"FILE_UPLOAD_COMPLETE",
			"FILE_PROCESSING_COMPLETE",
			"UPLOAD_THING_COMPLETE",
		].includes(action.type);
	};

	/**
	 * Check if an action starts a new processing operation
	 */
	const isStartProcessingAction = (action: CVOptimizerAction): boolean => {
		return [
			"START_FILE_UPLOAD",
			"START_ANALYSIS",
			"START_FILE_PROCESSING",
			"START_TEXT_UPLOAD",
			"UPLOAD_THING_BEGIN",
		].includes(action.type);
	};

	const isProcessingState = (currentState: CVOptimizerState): boolean => {
		return PROCESSING_STATES.includes(currentState);
	};

	/**
	 * Check if recovery from error state is allowed for this action
	 * FIXED: Proper typing for recoveryPatterns
	 */
	const isRecoveryAllowed = (
		currentState: CVOptimizerState,
		action: CVOptimizerAction
	): boolean => {
		// Allow specific recovery patterns
		const recoveryPatterns: Partial<Record<CVOptimizerState, string[]>> = {
			[CVOptimizerState.FILE_PROCESSING_ERROR]: [
				"ANALYSIS_COMPLETE",
				"START_ANALYSIS",
				"RETRY_LAST_OPERATION",
			],
			[CVOptimizerState.UPLOAD_ERROR]: [
				"ANALYSIS_COMPLETE",
				"FILE_UPLOAD_COMPLETE",
				"RETRY_LAST_OPERATION",
			],
			[CVOptimizerState.ANALYSIS_ERROR]: [
				"ANALYSIS_COMPLETE",
				"RETRY_LAST_OPERATION",
			],
		};

		// FIXED: Safe access to recoveryPatterns
		const allowedActions = recoveryPatterns[currentState];
		return allowedActions ? allowedActions.includes(action.type) : false;
	};

	/**
	 * Check if the current action should be ignored based on state
	 */
	const shouldIgnoreAction = (
		currentState: CVOptimizerState,
		action: CVOptimizerAction
	): boolean => {
		// Ignore duplicate errors of the same type
		if (isErrorState(currentState) && isErrorAction(action)) {
			const errorType = (action as any).payload?.errorType;
			const currentErrorType = currentState.replace("_error", "");

			if (errorType === currentErrorType) {
				return true; // Ignore duplicate error of same type
			}
		}

		// Ignore processing actions when already processing
		if (isProcessingState(currentState) && isStartProcessingAction(action)) {
			return true;
		}

		// Ignore success actions from error states unless recovery is allowed
		if (isErrorState(currentState) && isSuccessAction(action)) {
			if (!isRecoveryAllowed(currentState, action)) {
				return true;
			}
		}

		return false;
	};

	// ===== ENHANCED HELPER FUNCTION FOR STATE CREATION =====

	/**
	 * Create new state with comprehensive validation and logging
	 */
	const createNewState = (
		newState: CVOptimizerState,
		newContext: Partial<CVOptimizerContext> = {}
	): CVOptimizerMachineState => {
		// Validate transition
		if (!isValidTransition(state.current, newState)) {
			console.error(
				`🚫 Invalid transition blocked: ${state.current} -> ${newState} via ${action.type}`
			);
			console.error(`🔍 Action details:`, action);
			return state; // Return current state unchanged
		}

		// Log successful transition for debugging
		console.log(
			`✅ Valid transition: ${state.current} -> ${newState} via ${action.type}`
		);

		// Merge context updates with enhanced validation
		const updatedContext = {
			...state.context,
			...newContext,
			// Always clear error context on successful transitions to non-error states
			...(isErrorState(newState)
				? {}
				: {
						errorMessage: undefined,
						lastError: undefined,
						errorContext: undefined,
				  }),
		};

		// Always recalculate unsaved changes
		updatedContext.hasUnsavedChanges = calculateUnsavedChanges(updatedContext);

		return {
			current: newState,
			context: updatedContext,
		};
	};

	// ===== MAIN GUARD SYSTEM =====

	console.log(
		`🔄 Reducer: Processing ${action.type} in state ${state.current}`
	);

	// Guard 1: Ignore actions that should be blocked
	if (shouldIgnoreAction(state.current, action)) {
		console.warn(`🛡️ Guard: Ignoring ${action.type} in state ${state.current}`);
		return state;
	}

	// Guard 2: Special handling for duplicate UploadThing actions
	if (action.type === "UPLOAD_THING_BEGIN" && state.context.isActiveUpload) {
		console.warn(
			"🛡️ Guard: UploadThing already active, ignoring new begin action"
		);
		return state;
	}

	if (
		action.type === "UPLOAD_THING_COMPLETE" &&
		!state.context.isActiveUpload
	) {
		console.warn("🛡️ Guard: No active upload to complete, ignoring action");
		return state;
	}

	// Guard 3: Validate UploadThing state consistency
	if (action.type.startsWith("UPLOAD_THING_")) {
		const validation = validateUploadThingTransition(
			state.current,
			state.current,
			state.context
		);
		if (!validation.valid) {
			console.warn(
				`🛡️ Guard: UploadThing validation failed: ${validation.reason}`
			);
			// Allow action but log the inconsistency
		}
	}

	// Guard 4: Log recovery attempts
	if (isErrorState(state.current) && isSuccessAction(action)) {
		console.info(
			`🔄 Recovery: Attempting to recover from ${state.current} via ${action.type}`
		);
	}

	// Guard 5: Prevent state machine corruption for context-only updates
	if (action.type === "UPDATE_CONTENT" || action.type === "UPDATE_SECTION") {
		// FIXED: Handle context-only updates properly
		const updatedContext = { ...state.context };

		if (action.type === "UPDATE_CONTENT") {
			updatedContext.tempEditedContent = action.payload.content;
			updatedContext.contentModified = true;
			updatedContext.hasTempChanges = true;
		} else if (action.type === "UPDATE_SECTION") {
			const updatedSections = updatedContext.tempSections.map((section) =>
				section.id === action.payload.sectionId
					? { ...section, content: action.payload.content }
					: section
			);
			updatedContext.tempSections = updatedSections;
			updatedContext.contentModified = true;
			updatedContext.hasTempChanges = true;
		}

		updatedContext.hasUnsavedChanges = calculateUnsavedChanges(updatedContext);
		return { ...state, context: updatedContext };
	}

	// ===== MAIN REDUCER LOGIC WITH ENHANCED ERROR HANDLING =====

	try {
		switch (action.type) {
			// ===== INITIALIZATION ACTIONS =====

			case "INITIALIZE":
				console.log(
					"🚀 INITIALIZE action dispatched with userId:",
					action.payload.userId
				);
				return createNewState(CVOptimizerState.CHECKING_EXISTING_RESUME, {
					userId: action.payload.userId,
					errorMessage: undefined,
					lastError: undefined,
					errorContext: undefined,
				});

			case "SET_WELCOME_STATE":
				return createNewState(CVOptimizerState.WELCOME_NEW_USER, {
					hasExistingResume: false,
					activeTab: "upload",
				});

			case "CHECK_EXISTING_RESUME":
				return createNewState(CVOptimizerState.CHECKING_EXISTING_RESUME);

			case "RESUME_FOUND": {
				const resumeData = action.payload.resumeData;

				// ✅ DEBUG: Log what's actually in resumeData
				console.log("🔍 RESUME_FOUND DEBUG: Raw resumeData structure:", {
					id: resumeData.id,
					suggestionsCount: resumeData.suggestions?.length || 0,
					keywordsCount: resumeData.keywords?.length || 0,
					firstSuggestion: resumeData.suggestions?.[0]
						? {
								id: resumeData.suggestions[0].id,
								isApplied: resumeData.suggestions[0].isApplied,
						  }
						: null,
				});

				// ✅ FIXED: Use the already processed suggestions and keywords from the service
				// Don't normalize again - they're already processed correctly!
				const processedSuggestions = resumeData.suggestions || [];
				const processedKeywords = resumeData.keywords || [];

				// ✅ DEBUG: Confirm what we're using
				console.log("🔧 RESUME_FOUND: Using processed data directly:", {
					suggestionsCount: processedSuggestions.length,
					keywordsCount: processedKeywords.length,
					appliedSuggestions: processedSuggestions.filter((s) => s.isApplied)
						.length,
					appliedKeywords: processedKeywords.filter((k) => k.isApplied).length,
					firstSuggestionApplied: processedSuggestions[0]?.isApplied,
				});

				// Step 3: Determine content to display based on priority
				const displayContent = getDisplayContent(resumeData);

				// Step 4: Determine score to display based on priority
				const displayScore = getDisplayScore(resumeData);

				// Step 5: Extract section titles if available from AI response
				const aiSectionTitles = (resumeData as any).sectionTitles || {};
				const resumeLanguageFromData = resumeData.language || "English";

				return createNewState(CVOptimizerState.EXISTING_RESUME_LOADED, {
					// Core resume data
					resumeData,
					hasExistingResume: true,

					// Content management with proper priority
					originalText: resumeData.optimized_text || "",
					optimizedText: displayContent,
					tempEditedContent: displayContent,

					// Score management with proper priority
					originalAtsScore: resumeData.ats_score || DEFAULT_ATS_SCORE,
					currentAtsScore: displayScore,

					// ✅ FIXED: Use the already processed data from service
					suggestions: processedSuggestions,
					keywords: processedKeywords,

					// Template and UI state
					selectedTemplate: resumeData.selected_template || "basic",
					activeTab: "preview",

					// Multilingual section titles support
					sectionTitles: aiSectionTitles,
					resumeLanguage: resumeLanguageFromData,

					// Reset modification flags since we're loading existing data
					contentModified: false,
					scoreModified: false,
					templateModified: false,
					hasTempChanges: false,
					hasUnsavedChanges: false,

					// Clear any previous errors
					errorMessage: undefined,
					lastError: undefined,
					errorContext: undefined,
				});
			}

			case "NO_RESUME_FOUND":
				return createNewState(CVOptimizerState.AWAITING_UPLOAD, {
					hasExistingResume: false,
					activeTab: "upload",
				});

			// ===== UPLOAD WORKFLOW ACTIONS =====

			case "START_UPLOAD":
				return createNewState(CVOptimizerState.AWAITING_UPLOAD, {
					uploadProgress: 0,
					errorMessage: undefined,
					errorContext: undefined,
				});

			case "SELECT_FILE": {
				const file = action.payload.file;

				console.log("🔄 SELECT_FILE Reducer - Processing file selection:", {
					fileName: file?.name,
					fileSize: file?.size,
					fileType: file?.type,
					currentState: state.current,
					currentSelectedFile: state.context.selectedFile?.name,
					timestamp: new Date().toISOString(),
				});

				// Handle empty file (file deselection)
				if (!file || file.size === 0) {
					console.log("⚪ SELECT_FILE - Clearing file selection");

					return {
						...state,
						context: {
							...state.context,
							selectedFile: null,
							uploadMethod: null,
							errorMessage: undefined,
							errorContext: undefined,
						},
					};
				}

				// Debug file bypass - skip validation for debug files
				const isDebugFile = file.name.startsWith("debug-");

				if (isDebugFile) {
					console.log(
						"🎯 SELECT_FILE - Debug file detected, bypassing validation:",
						file.name
					);
				} else {
					// Run validation for non-debug files
					console.log("🔍 SELECT_FILE - Running file validation");

					const validation = validateFile(file);
					if (!validation.isValid) {
						console.log("❌ SELECT_FILE - File validation failed:", {
							error: validation.error,
							fileName: file.name,
							fileSize: file.size,
							fileType: file.type,
						});

						// Transition to error state with file validation error
						return createNewState(CVOptimizerState.UPLOAD_ERROR, {
							errorMessage: validation.error,
							selectedFile: file, // Keep the file for debugging purposes
							uploadMethod: "file",
							errorContext: {
								operation: "upload",
								step: "file_validation",
								retryable: true,
								userMessage: validation.error || "File validation failed",
								technicalDetails: `File: ${file.name}, Size: ${file.size}, Type: ${file.type}`,
							},
						});
					}

					console.log("✅ SELECT_FILE - File validation passed");
				}

				// Create new context with selected file
				const updatedContext = {
					...state.context,
					selectedFile: file,
					uploadMethod: "file" as const,
					// Clear any previous errors
					errorMessage: undefined,
					errorContext: undefined,
					validationErrors: undefined,
					// Reset upload progress
					uploadProgress: 0,
					isDragOver: false,
				};

				console.log("🔄 SELECT_FILE - Context update:", {
					previousFile: state.context.selectedFile?.name || "none",
					newFile: file.name,
					previousUploadMethod: state.context.uploadMethod || "none",
					newUploadMethod: updatedContext.uploadMethod,
					errorsCleared: !!state.context.errorMessage,
				});

				// Create new state with updated context
				const newState = {
					current: state.current, // Stay in current state
					context: updatedContext,
				};

				// Validation check - ensure file was properly saved
				if (newState.context.selectedFile?.name === file.name) {
					console.log("✅ SELECT_FILE - File successfully saved to context:", {
						fileName: newState.context.selectedFile.name,
						uploadMethod: newState.context.uploadMethod,
						currentState: newState.current,
					});
				} else {
					console.error(
						"🚨 SELECT_FILE - CRITICAL: File was not saved to context!",
						{
							expectedFile: file.name,
							actualFile: newState.context.selectedFile?.name || "null",
							contextKeys: Object.keys(newState.context),
						}
					);
				}

				return newState;
			}

			case "START_FILE_UPLOAD": {
				const file = action.payload.file;
				return createNewState(CVOptimizerState.UPLOADING_FILE, {
					selectedFile: file,
					uploadMethod: "file",
					uploadProgress: 0,
					errorMessage: undefined,
					errorContext: undefined,
				});
			}

			case "UPDATE_UPLOAD_PROGRESS":
				// Context-only update, no state change
				return {
					...state,
					context: {
						...state.context,
						uploadProgress: Math.min(100, Math.max(0, action.payload.progress)),
					},
				};

			case "FILE_UPLOAD_COMPLETE": {
				const fileInfo = action.payload.fileInfo;
				return createNewState(CVOptimizerState.FILE_UPLOAD_COMPLETE, {
					uploadedFileInfo: fileInfo,
					uploadProgress: 100,
				});
			}

			case "START_TEXT_UPLOAD": {
				const content = action.payload.content;
				const validation = validateTextContent(content);

				if (!validation.isValid) {
					return createNewState(CVOptimizerState.UPLOAD_ERROR, {
						errorMessage: validation.error,
						errorContext: {
							operation: "upload",
							step: "text_validation",
							retryable: true,
							userMessage: validation.error || "Text validation failed",
							technicalDetails: `Content length: ${content.length}`,
						},
					});
				}

				return createNewState(CVOptimizerState.ANALYZING_CONTENT, {
					resumeTextContent: content,
					uploadMethod: "text",
					originalText: content, // Set original text for analysis
					errorMessage: undefined,
					errorContext: undefined,
				});
			}

			case "START_FILE_PROCESSING":
				return createNewState(CVOptimizerState.PROCESSING_FILE, {
					errorMessage: undefined,
					errorContext: undefined,
				});

			case "FILE_PROCESSING_COMPLETE": {
				const extractedText = action.payload.extractedText;
				const validation = validateTextContent(extractedText);

				if (!validation.isValid) {
					return createNewState(CVOptimizerState.FILE_PROCESSING_ERROR, {
						errorMessage: validation.error,
						errorContext: {
							operation: "file_processing",
							step: "content_extraction",
							retryable: false,
							userMessage: ERROR_MESSAGES.PROCESSING_ERRORS.CONTENT_TOO_SHORT,
							technicalDetails: `Extracted content length: ${extractedText.length}`,
						},
					});
				}

				return createNewState(CVOptimizerState.ANALYZING_CONTENT, {
					resumeTextContent: extractedText,
					originalText: extractedText,
				});
			}

			case "START_ANALYSIS":
				return createNewState(CVOptimizerState.ANALYZING_CONTENT, {
					errorMessage: undefined,
					errorContext: undefined,
				});

			case "ANALYSIS_COMPLETE": {
				const optimizedResumeData = action.payload.resumeData;
				return createNewState(CVOptimizerState.OPTIMIZATION_COMPLETE, {
					resumeData: optimizedResumeData,
					hasExistingResume: true,
					originalText: optimizedResumeData.optimized_text || "",
					optimizedText: optimizedResumeData.optimized_text || "",
					tempEditedContent: optimizedResumeData.optimized_text || "",
					originalAtsScore: optimizedResumeData.ats_score || DEFAULT_ATS_SCORE,
					currentAtsScore: optimizedResumeData.ats_score || DEFAULT_ATS_SCORE,
					suggestions: optimizedResumeData.suggestions || [],
					keywords: optimizedResumeData.keywords || [],
					selectedTemplate: optimizedResumeData.selected_template || "basic",
					activeTab: "preview",
					sectionTitles: (optimizedResumeData as any).sectionTitles || {},
					resumeLanguage: optimizedResumeData.language || "English",
					// Reset upload-related context
					uploadProgress: 0,
					selectedFile: null,
					uploadedFileInfo: null,
					uploadMethod: null,
					// Reset UploadThing states
					isActiveUpload: false,
					uploadThingInProgress: false,
					uploadThingFiles: [],
				});
			}

			case "SET_DRAG_OVER": {
				// ✅ PROTECTION : Ne traiter le drag over que si nécessaire
				const newIsDragOver = action.payload.isDragOver;

				// Si l'état drag over est identique, ne rien faire
				if (state.context.isDragOver === newIsDragOver) {
					// console.log("🛡️ SET_DRAG_OVER: État identique, skipping");
					return state; // Retourne le même état sans modification
				}

				console.log("🔄 SET_DRAG_OVER: Updating drag state:", newIsDragOver);

				// Context-only update
				return {
					...state,
					context: {
						...state.context,
						isDragOver: newIsDragOver,
					},
				};
			}

			case "UPDATE_TEXT_CONTENT":
				// Context-only update
				return {
					...state,
					context: {
						...state.context,
						resumeTextContent: action.payload.content,
						uploadMethod: "text",
					},
				};

			// ===== UPLOADTHING SPECIFIC ACTIONS =====

			case "UPLOAD_THING_BEGIN": {
				const files = action.payload.files;
				return createNewState(CVOptimizerState.UPLOADING_FILE, {
					isActiveUpload: true,
					uploadThingInProgress: false,
					uploadThingFiles: files,
					selectedFile: files[0] || null,
					uploadMethod: "file",
					uploadProgress: 0,
					errorMessage: undefined,
					errorContext: undefined,
				});
			}

			case "UPLOAD_THING_COMPLETE": {
				const results = action.payload.results;

				console.log("📥 Reducer: Processing UPLOAD_THING_COMPLETE action");
				console.log("📥 Reducer: Received results count:", results?.length);

				// === STEP 1: VALIDATE RESULTS ARRAY ===
				if (!results || !Array.isArray(results) || results.length === 0) {
					console.error(
						"❌ Reducer: Invalid results array in UPLOAD_THING_COMPLETE"
					);
					return createNewState(CVOptimizerState.UPLOAD_ERROR, {
						errorMessage: "Upload completed but no file data received",
						isActiveUpload: false,
						uploadThingInProgress: false,
						uploadThingFiles: [],
						errorContext: {
							operation: "upload",
							step: "uploadthing_complete_validation",
							retryable: true,
							userMessage:
								"Upload failed: No file data received. Please try again.",
							technicalDetails: `Results: ${typeof results}, Length: ${
								results?.length
							}`,
						},
					});
				}

				// === STEP 2: VALIDATE FIRST RESULT ===
				const firstResult = results[0];
				if (!firstResult) {
					console.error("❌ Reducer: First result is null/undefined");
					return createNewState(CVOptimizerState.UPLOAD_ERROR, {
						errorMessage: "Upload completed but first file is empty",
						isActiveUpload: false,
						uploadThingInProgress: false,
						uploadThingFiles: [],
						errorContext: {
							operation: "upload",
							step: "uploadthing_first_result_validation",
							retryable: true,
							userMessage:
								"Upload failed: File data is corrupted. Please try again.",
							technicalDetails: "First result in array is null or undefined",
						},
					});
				}

				// === STEP 3: VALIDATE REQUIRED PROPERTIES ===
				// These properties are essential for file processing
				const requiredProps = ["ufsUrl", "name", "size", "type"];
				for (const prop of requiredProps) {
					if (!firstResult[prop]) {
						console.error(
							`❌ Reducer: Missing required property '${prop}' in upload result`
						);
						console.error(
							"❌ Reducer: Available properties:",
							Object.keys(firstResult)
						);

						return createNewState(CVOptimizerState.UPLOAD_ERROR, {
							errorMessage: `Upload incomplete: missing ${prop}`,
							isActiveUpload: false,
							uploadThingInProgress: false,
							uploadThingFiles: [],
							errorContext: {
								operation: "upload",
								step: "uploadthing_property_validation",
								retryable: false, // Missing props usually indicate config issue
								userMessage: `Upload failed: File ${prop} is missing. Please check file format and try again.`,
								technicalDetails: `Missing property: ${prop}. Available: ${Object.keys(
									firstResult
								).join(", ")}`,
							},
						});
					}
				}

				// === STEP 4: CREATE VALIDATED FILE INFO ===
				// At this point, we know all required properties exist
				const fileInfo: UploadedFileInfo = {
					name: firstResult.name,
					size: firstResult.size,
					type: firstResult.type,
					url: firstResult.url,
				};

				console.log(
					"✅ Reducer: UploadThing completion validated successfully"
				);
				console.log("✅ Reducer: File info created:", {
					name: fileInfo.name,
					size: fileInfo.size,
					type: fileInfo.type,
					urlExists: !!fileInfo.url,
				});

				// === STEP 5: TRANSITION TO FILE_UPLOAD_COMPLETE STATE ===
				// CRITICAL: Set uploadThingInProgress to FALSE because UploadThing is done
				// The actual file processing will be triggered by useEffect in the hook
				return createNewState(CVOptimizerState.FILE_UPLOAD_COMPLETE, {
					// === UPLOADTHING STATE CLEANUP ===
					isActiveUpload: false, // UploadThing upload is complete
					uploadThingInProgress: false, // FIXED: No longer processing upload
					uploadThingFiles: [], // Clear the files array

					// === FILE INFORMATION ===
					uploadedFileInfo: fileInfo, // Store validated file info for processing
					uploadProgress: 100, // Upload is 100% complete

					// === ERROR STATE CLEANUP ===
					errorMessage: undefined, // Clear any previous errors
					errorContext: undefined, // Clear error context
					validationErrors: undefined, // Clear validation errors

					// === UPLOAD METHOD TRACKING ===
					uploadMethod: "file", // Track that this was a file upload
					selectedFile: state.context.selectedFile, // Keep selected file reference
				});
			}

			case "UPLOAD_THING_ERROR": {
				const error = action.payload.error;
				return createNewState(CVOptimizerState.UPLOAD_ERROR, {
					isActiveUpload: false,
					uploadThingInProgress: false,
					uploadThingFiles: [],
					selectedFile: null,
					uploadProgress: 0,
					errorMessage: error.message,
					errorContext: {
						operation: "upload",
						step: "uploadthing_error",
						retryable: true,
						userMessage: "Upload failed. Please try again.",
						technicalDetails: `UploadThing error: ${error.message}`,
					},
				});
			}

			case "SET_UPLOAD_THING_ACTIVE": {
				// Context-only update
				return {
					...state,
					context: {
						...state.context,
						isActiveUpload: action.payload.isActive,
					},
				};
			}

			// ===== VALIDATION ACTIONS =====

			case "RESUME_VALIDATION_FAILED": {
				const validationErrors = action.payload.validationErrors;
				return createNewState(CVOptimizerState.UPLOAD_ERROR, {
					validationErrors: validationErrors,
					errorMessage: "Resume validation failed",
					errorContext: {
						operation: "upload",
						step: "resume_validation",
						retryable: false,
						userMessage: "The uploaded file is not a valid resume format.",
						technicalDetails:
							"File content does not meet resume validation criteria",
					},
					// Reset upload states
					isActiveUpload: false,
					uploadThingInProgress: false,
					uploadThingFiles: [],
				});
			}

			// ===== EDIT MODE ACTIONS =====

			case "ENTER_EDIT_MODE":
				return createNewState(CVOptimizerState.EDIT_MODE, {
					tempEditedContent: state.context.optimizedText,
					hasTempChanges: false,
				});

			case "EXIT_EDIT_MODE":
				return createNewState(CVOptimizerState.PREVIEW_MODE, {
					// Preserve changes when exiting edit mode
					optimizedText: state.context.hasTempChanges
						? state.context.tempEditedContent
						: state.context.optimizedText,
				});

			// Note: UPDATE_CONTENT and UPDATE_SECTION are handled in Guard 5 above

			// ===== ENHANCEMENT ACTIONS =====

			case "APPLY_SUGGESTION": {
				const updatedSuggestions = state.context.suggestions.map((suggestion) =>
					suggestion.id === action.payload.suggestionId
						? { ...suggestion, isApplied: action.payload.applied }
						: suggestion
				);

				// Recalculate score with updated suggestions
				const newScore = calculateUpdatedScore(
					state.context.originalAtsScore,
					updatedSuggestions,
					state.context.keywords
				);

				return {
					...state,
					context: {
						...state.context,
						suggestions: updatedSuggestions,
						currentAtsScore: newScore,
						scoreModified: true,
						contentModified: true,
						hasUnsavedChanges: true,
					},
				};
			}

			case "APPLY_KEYWORD": {
				const updatedKeywords = state.context.keywords.map((keyword) =>
					keyword.id === action.payload.keywordId
						? { ...keyword, isApplied: action.payload.applied }
						: keyword
				);

				// Recalculate score with updated keywords
				const newScore = calculateUpdatedScore(
					state.context.originalAtsScore,
					state.context.suggestions,
					updatedKeywords
				);

				return {
					...state,
					context: {
						...state.context,
						keywords: updatedKeywords,
						currentAtsScore: newScore,
						scoreModified: true,
						contentModified: true,
						hasUnsavedChanges: true,
					},
				};
			}

			// ===== TEMPLATE ACTIONS =====

			case "UPDATE_TEMPLATE":
				// Context-only update
				return {
					...state,
					context: {
						...state.context,
						selectedTemplate: action.payload.templateId,
						templateModified: true,
						hasUnsavedChanges: true,
					},
				};

			// ===== SAVE/RESET ACTIONS =====

			case "START_SAVING":
				return createNewState(CVOptimizerState.SAVING_CHANGES);

			case "SAVE_SUCCESS": {
				console.log("🔍 SAVE_SUCCESS - Current state:", state.current);

				// PROTECTION: Only process if we're actually in SAVING_CHANGES
				if (state.current !== CVOptimizerState.SAVING_CHANGES) {
					console.log(
						"🛡️ Already processed SAVE_SUCCESS, ignoring duplicate call"
					);
					return state; // Return current state unchanged
				}

				console.log("✅ Processing SAVE_SUCCESS - Transitioning to EDIT_MODE");
				const savedResumeData = action.payload.resumeData;

				return createNewState(CVOptimizerState.EDIT_MODE, {
					resumeData: savedResumeData,
					optimizedText: getDisplayContent(savedResumeData),
					currentAtsScore: getDisplayScore(savedResumeData),
					contentModified: false,
					scoreModified: false,
					templateModified: false,
					hasTempChanges: false,
					hasUnsavedChanges: false,
				});
			}

			case "START_RESET":
				return createNewState(CVOptimizerState.RESETTING_CHANGES);

			case "RESET_SUCCESS": {
				const resetResumeData = action.payload.resumeData;
				return createNewState(CVOptimizerState.PREVIEW_MODE, {
					resumeData: resetResumeData,
					optimizedText: resetResumeData.optimized_text || "",
					tempEditedContent: resetResumeData.optimized_text || "",
					currentAtsScore: resetResumeData.ats_score || DEFAULT_ATS_SCORE,
					suggestions: (resetResumeData.suggestions || []).map((s) => ({
						...s,
						isApplied: false,
					})),
					keywords: (resetResumeData.keywords || []).map((k) => ({
						...k,
						isApplied: false,
					})),
					contentModified: false,
					scoreModified: false,
					templateModified: false,
					hasTempChanges: false,
					hasUnsavedChanges: false,
				});
			}

			// ===== UI NAVIGATION ACTIONS =====

			case "SWITCH_TAB":
				// Context-only update
				return {
					...state,
					context: {
						...state.context,
						activeTab: action.payload.tab,
					},
				};

			// ===== DATA UPDATE ACTIONS =====

			case "UPDATE_RESUME_DATA": {
				const {
					optimizedText,
					resumeId,
					atsScore,
					suggestions,
					keywords,
					aiResponse,
				} = action.payload;

				// Handle section titles from AI response
				const sectionTitles = aiResponse?.sectionTitles || {};
				const resumeLanguage = aiResponse?.language || "English";

				// Normalize suggestions and keywords
				const normalizedSuggestions = suggestions.map(normalizeSuggestion);
				const normalizedKeywords = keywords.map(normalizeKeyword);

				return {
					...state,
					context: {
						...state.context,
						originalText: optimizedText,
						optimizedText: optimizedText,
						tempEditedContent: optimizedText,
						originalAtsScore: atsScore,
						currentAtsScore: atsScore,
						suggestions: normalizedSuggestions,
						keywords: normalizedKeywords,
						sectionTitles: sectionTitles,
						resumeLanguage: resumeLanguage,
						contentModified: false,
						scoreModified: false,
						hasTempChanges: false,
						hasUnsavedChanges: false,
						hasExistingResume: true,
						activeTab: "preview",
					},
				};
			}

			// ===== ERROR HANDLING ACTIONS =====

			case "ERROR": {
				const {
					message,
					error,
					errorType,
					context: errorContext,
				} = action.payload;

				const validatedErrorContext = errorContext
					? {
							...errorContext,
							operation: mapOperationToValidType(errorContext.operation),
					  }
					: undefined;

				let errorState: CVOptimizerState;

				switch (errorType) {
					case "upload":
						errorState = CVOptimizerState.UPLOAD_ERROR;
						break;
					case "file_processing":
						errorState = CVOptimizerState.FILE_PROCESSING_ERROR;
						break;
					case "analysis":
						errorState = CVOptimizerState.ANALYSIS_ERROR;
						break;
					case "save":
						errorState = CVOptimizerState.SAVE_ERROR;
						break;
					case "reset":
						errorState = CVOptimizerState.RESET_ERROR;
						break;
					default:
						errorState = CVOptimizerState.ANALYSIS_ERROR;
				}

				return createNewState(errorState, {
					errorMessage: message,
					lastError: error,
					errorContext: validatedErrorContext,
					// Reset UploadThing states on error
					isActiveUpload: false,
					uploadThingInProgress: false,
					uploadThingFiles: [],
				});
			}

			case "CLEAR_ERROR": {
				// Clear errors and transition to appropriate state
				const clearedContext = {
					...state.context,
					errorMessage: undefined,
					lastError: undefined,
					errorContext: undefined,
					validationErrors: undefined,
				};

				// If we're in an error state, transition to a valid state
				if (isErrorState(state.current)) {
					// If user has existing resume, go to preview
					if (clearedContext.hasExistingResume && clearedContext.resumeData) {
						return createNewState(
							CVOptimizerState.PREVIEW_MODE,
							clearedContext
						);
					}
					// Otherwise go back to awaiting upload
					return createNewState(
						CVOptimizerState.AWAITING_UPLOAD,
						clearedContext
					);
				}

				// If not in error state, just update context
				return {
					...state,
					context: clearedContext,
				};
			}

			case "RETRY_LAST_OPERATION": {
				// Reset error state and attempt to return to a recoverable state
				const clearedContext = {
					...state.context,
					errorMessage: undefined,
					lastError: undefined,
					errorContext: undefined,
					validationErrors: undefined,
					// Reset UploadThing states for retry
					isActiveUpload: false,
					uploadThingInProgress: false,
					uploadThingFiles: [],
				};

				// Determine which state to return to based on the current error state
				switch (state.current) {
					case CVOptimizerState.UPLOAD_ERROR:
						return createNewState(
							CVOptimizerState.AWAITING_UPLOAD,
							clearedContext
						);

					case CVOptimizerState.FILE_PROCESSING_ERROR:
						// If we have uploaded file info, try processing again
						if (state.context.uploadedFileInfo) {
							return createNewState(
								CVOptimizerState.PROCESSING_FILE,
								clearedContext
							);
						}
						// Otherwise go back to upload
						return createNewState(
							CVOptimizerState.AWAITING_UPLOAD,
							clearedContext
						);

					case CVOptimizerState.ANALYSIS_ERROR:
						// If we have content to analyze, try analysis again
						if (state.context.resumeTextContent || state.context.originalText) {
							return createNewState(
								CVOptimizerState.ANALYZING_CONTENT,
								clearedContext
							);
						}
						// Otherwise go back to upload
						return createNewState(
							CVOptimizerState.AWAITING_UPLOAD,
							clearedContext
						);

					case CVOptimizerState.SAVE_ERROR:
						return createNewState(CVOptimizerState.EDIT_MODE, clearedContext);

					case CVOptimizerState.RESET_ERROR:
						return createNewState(
							CVOptimizerState.PREVIEW_MODE,
							clearedContext
						);

					default:
						// For any other error state, go back to a safe state
						if (state.context.hasExistingResume) {
							return createNewState(
								CVOptimizerState.PREVIEW_MODE,
								clearedContext
							);
						}
						return createNewState(
							CVOptimizerState.AWAITING_UPLOAD,
							clearedContext
						);
				}
			}

			// ===== DEFAULT CASE WITH ENHANCED LOGGING =====

			default:
				console.warn(`⚠️ Unhandled action type: ${(action as any).type}`);
				console.warn(`📊 Current state: ${state.current}`);
				console.warn(`📝 Action payload:`, (action as any).payload);
				return state;
		}
	} catch (reducerError) {
		// ===== REDUCER ERROR PROTECTION =====
		console.error(
			"💥 Reducer crashed, recovering to safe state:",
			reducerError
		);
		console.error("📊 State at crash:", state.current);
		console.error("🎯 Action at crash:", action.type);

		// Return to error state with crash information
		return createNewState(CVOptimizerState.ANALYSIS_ERROR, {
			errorMessage: "System error occurred",
			lastError: reducerError as Error,
			errorContext: {
				operation: "analysis", // FIXED: Use valid operation type
				step: "reducer_crash",
				retryable: true,
				userMessage: "A system error occurred. Please try again.",
				technicalDetails: `Reducer crash: ${(reducerError as Error).message}`,
			},
		});
	}
};

/**
 * REDUCER EXPLANATION:
 *
 * The reducer follows these principles:
 * 1. All state transitions are validated before execution
 * 2. Context is always properly merged and calculated
 * 3. Error states include proper recovery mechanisms
 * 4. UploadThing integration is fully supported
 * 5. Validation failures are handled gracefully
 * 6. All actions are type-safe and well-documented
 *
 * Key features:
 * - Automatic unsaved changes calculation
 * - Proper error context for debugging
 * - UploadThing state synchronization
 * - Resume validation handling
 * - ATS score recalculation on changes
 * - State transition validation
 */

// ===== HELPER FUNCTIONS FOR STATE VALIDATION - EXTENDED WITH UPLOADTHING =====

/**
 * Helper function to get the next allowed states from current state
 */
export const getNextAllowedStates = (
	currentState: CVOptimizerState
): CVOptimizerState[] => {
	return VALID_STATE_TRANSITIONS[currentState] || [];
};

/**
 * Helper function to check if an action is allowed in current state
 * EXTENDED: Added upload-specific action validation + UploadThing integration
 */
export const isActionAllowed = (
	currentState: CVOptimizerState,
	action: CVOptimizerAction
): boolean => {
	// Map actions to their resulting states to validate
	const actionStateMap: Record<string, CVOptimizerState> = {
		// Edit mode actions
		ENTER_EDIT_MODE: CVOptimizerState.EDIT_MODE,
		EXIT_EDIT_MODE: CVOptimizerState.PREVIEW_MODE,

		// Save/Reset actions
		START_SAVING: CVOptimizerState.SAVING_CHANGES,
		START_RESET: CVOptimizerState.RESETTING_CHANGES,

		// Upload workflow actions - EXTENDED
		START_UPLOAD: CVOptimizerState.AWAITING_UPLOAD,
		START_FILE_UPLOAD: CVOptimizerState.UPLOADING_FILE,
		START_TEXT_UPLOAD: CVOptimizerState.PROCESSING_FILE,
		START_FILE_PROCESSING: CVOptimizerState.PROCESSING_FILE,
		START_ANALYSIS: CVOptimizerState.ANALYZING_CONTENT,

		// NEW: UploadThing actions
		UPLOAD_THING_BEGIN: CVOptimizerState.UPLOADING_FILE,
		UPLOAD_THING_COMPLETE: CVOptimizerState.FILE_UPLOAD_COMPLETE,
	};

	const targetState = actionStateMap[action.type];
	if (!targetState) return true; // Allow actions that don't change state

	return isValidTransition(currentState, targetState);
};

/**
 * Helper function to determine if the current state allows file uploads
 * EXTENDED: Enhanced with UploadThing state management
 */
export const canUploadFile = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): boolean => {
	// Check UploadThing state first
	if (context.isActiveUpload || context.uploadThingInProgress) {
		return false;
	}

	// CRITICAL FIX: Always check authentication for upload functionality
	if (!context.userId) {
		return false; // No uploads allowed without authentication
	}

	// Enhanced: For INITIALIZING state, double-check authentication
	if (currentState === CVOptimizerState.INITIALIZING) {
		return !!context.userId;
	}

	const uploadAllowedStates = [
		CVOptimizerState.WELCOME_NEW_USER,
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.EXISTING_RESUME_LOADED,
		// FIXED: Allow new uploads after optimization is complete
		CVOptimizerState.OPTIMIZATION_COMPLETE,
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.EDIT_MODE,
		// Error states that allow retry
		CVOptimizerState.UPLOAD_ERROR,
		CVOptimizerState.FILE_PROCESSING_ERROR,
		CVOptimizerState.ANALYSIS_ERROR,
	];

	return uploadAllowedStates.includes(currentState);
};

/**
 * Helper function to determine if the current state allows text input
 * EXTENDED: Enhanced with UploadThing state management
 */
export const canInputText = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): boolean => {
	// Check UploadThing state first
	if (context.isActiveUpload || context.uploadThingInProgress) {
		return false;
	}

	// CRITICAL FIX: Always check authentication for text input functionality
	if (!context.userId) {
		return false; // No text input allowed without authentication
	}

	// Enhanced: For INITIALIZING state, double-check authentication
	if (currentState === CVOptimizerState.INITIALIZING) {
		return !!context.userId;
	}

	const textInputAllowedStates = [
		CVOptimizerState.WELCOME_NEW_USER,
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.EXISTING_RESUME_LOADED,
		// FIXED: Allow text input after optimization is complete
		CVOptimizerState.OPTIMIZATION_COMPLETE,
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.EDIT_MODE,
		// Error states that allow retry
		CVOptimizerState.UPLOAD_ERROR,
		CVOptimizerState.ANALYSIS_ERROR,
	];

	return textInputAllowedStates.includes(currentState);
};

/**
 * Helper function to check if the current state is a loading state
 * EXTENDED: Enhanced with UploadThing integration
 */
export const isLoadingState = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): boolean => {
	const loadingStates = [
		CVOptimizerState.INITIALIZING,
		CVOptimizerState.CHECKING_EXISTING_RESUME,
		CVOptimizerState.UPLOADING_FILE,
		CVOptimizerState.PROCESSING_FILE,
		CVOptimizerState.ANALYZING_CONTENT,
		CVOptimizerState.SAVING_CHANGES,
		CVOptimizerState.RESETTING_CHANGES,
	];

	// Check state machine OR UploadThing processing
	return (
		loadingStates.includes(currentState) ||
		context.isActiveUpload ||
		context.uploadThingInProgress
	);
};

/**
 * Helper function to check if the current state is an error state
 * EXTENDED: Comprehensive error state detection
 */
export const isErrorState = (currentState: CVOptimizerState): boolean => {
	const errorStates = [
		CVOptimizerState.UPLOAD_ERROR,
		CVOptimizerState.FILE_PROCESSING_ERROR,
		CVOptimizerState.ANALYSIS_ERROR,
		CVOptimizerState.SAVE_ERROR,
		CVOptimizerState.RESET_ERROR,
	];

	return errorStates.includes(currentState);
};

/**
 * Helper function to get appropriate error message for current state
 * EXTENDED: Contextual error messaging
 */
export const getErrorMessage = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): string => {
	// Return custom error message if available
	if (context.errorMessage) {
		return context.errorMessage;
	}

	// Return contextual error message if available
	if (context.errorContext?.userMessage) {
		return context.errorContext.userMessage;
	}

	// Fall back to default error messages based on state
	switch (currentState) {
		case CVOptimizerState.UPLOAD_ERROR:
			return ERROR_MESSAGES.UPLOAD_ERRORS.UPLOAD_NETWORK_ERROR;
		case CVOptimizerState.FILE_PROCESSING_ERROR:
			return ERROR_MESSAGES.PROCESSING_ERRORS.EXTRACTION_FAILED;
		case CVOptimizerState.ANALYSIS_ERROR:
			return ERROR_MESSAGES.ANALYSIS_ERRORS.AI_SERVICE_UNAVAILABLE;
		case CVOptimizerState.SAVE_ERROR:
			return ERROR_MESSAGES.SAVE_FAILED;
		case CVOptimizerState.RESET_ERROR:
			return ERROR_MESSAGES.RESET_FAILED;
		default:
			return ERROR_MESSAGES.UNKNOWN_ERROR;
	}
};

/**
 * Helper function to determine if an error is retryable
 * EXTENDED: Smart retry logic based on error context
 */
export const isRetryableError = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): boolean => {
	// Check if error context explicitly marks it as retryable
	if (context.errorContext?.retryable !== undefined) {
		return context.errorContext.retryable;
	}

	// Default retry logic based on state
	switch (currentState) {
		case CVOptimizerState.UPLOAD_ERROR:
		case CVOptimizerState.ANALYSIS_ERROR:
		case CVOptimizerState.SAVE_ERROR:
		case CVOptimizerState.RESET_ERROR:
			return true; // These are typically retryable
		case CVOptimizerState.FILE_PROCESSING_ERROR:
			return false; // File format issues are usually not retryable
		default:
			return false;
	}
};

// ===== NEW: UPLOADTHING SPECIFIC HELPER FUNCTIONS =====

/**
 * Helper function to check if UploadThing is currently active
 * Combines both upload and processing states
 */
export const isUploadThingActive = (context: CVOptimizerContext): boolean => {
	return context.isActiveUpload || context.uploadThingInProgress;
};

/**
 * Helper function to determine if new uploads should be prevented
 * Master function that combines all upload prevention logic
 */
export const shouldPreventNewUpload = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): boolean => {
	return (
		shouldHideUploadButton(currentState, context) ||
		isUploadThingActive(context) ||
		shouldFreezeUI(currentState, context)
	);
};

/**
 * Helper function to get current UploadThing status
 * Provides detailed status for debugging and UI display
 */
export const getUploadThingStatus = (
	context: CVOptimizerContext
): {
	status: "idle" | "uploading" | "processing";
	filesCount: number;
	hasUploadedFile: boolean;
} => {
	if (context.isActiveUpload) {
		return {
			status: "uploading",
			filesCount: context.uploadThingFiles.length,
			hasUploadedFile: false,
		};
	}

	if (context.uploadThingInProgress) {
		return {
			status: "processing",
			filesCount: context.uploadThingFiles.length,
			hasUploadedFile: !!context.uploadedFileInfo,
		};
	}

	return {
		status: "idle",
		filesCount: 0,
		hasUploadedFile: !!context.uploadedFileInfo,
	};
};

/**
 * Helper function to validate UploadThing transition
 * Ensures UploadThing states are consistent with state machine
 */
export const validateUploadThingTransition = (
	fromState: CVOptimizerState,
	toState: CVOptimizerState,
	context: CVOptimizerContext
): { valid: boolean; reason?: string } => {
	// During upload, only certain transitions are allowed
	if (context.isActiveUpload) {
		const allowedFromUpload = [
			CVOptimizerState.UPLOADING_FILE,
			CVOptimizerState.FILE_UPLOAD_COMPLETE,
			CVOptimizerState.UPLOAD_ERROR,
		];

		if (!allowedFromUpload.includes(toState)) {
			return {
				valid: false,
				reason: `Cannot transition to ${toState} while UploadThing is active`,
			};
		}
	}

	// During processing, only certain transitions are allowed
	if (context.uploadThingInProgress) {
		const allowedFromProcessing = [
			CVOptimizerState.FILE_UPLOAD_COMPLETE,
			CVOptimizerState.PROCESSING_FILE,
			CVOptimizerState.ANALYZING_CONTENT,
			CVOptimizerState.OPTIMIZATION_COMPLETE,
			CVOptimizerState.FILE_PROCESSING_ERROR,
			CVOptimizerState.ANALYSIS_ERROR,
		];

		if (!allowedFromProcessing.includes(toState)) {
			return {
				valid: false,
				reason: `Cannot transition to ${toState} while UploadThing is processing`,
			};
		}
	}

	return { valid: true };
};

/**
 * Helper function to get the upload method display name
 * EXTENDED: User-friendly upload method descriptions
 */
export const getUploadMethodDisplayName = (
	method: "file" | "text" | null
): string => {
	switch (method) {
		case "file":
			return "File Upload";
		case "text":
			return "Text Input";
		case null:
		default:
			return "Not Selected";
	}
};

/**
 * Helper function to calculate overall progress for the upload workflow
 * EXTENDED: Enhanced progress calculation with UploadThing integration
 */
export const calculateOverallProgress = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): number => {
	// UploadThing specific progress
	if (context.isActiveUpload) {
		return Math.min(25, context.uploadProgress * 0.25);
	}

	switch (currentState) {
		case CVOptimizerState.INITIALIZING:
		case CVOptimizerState.CHECKING_EXISTING_RESUME:
			return 5;

		case CVOptimizerState.WELCOME_NEW_USER:
		case CVOptimizerState.AWAITING_UPLOAD:
			return 10;

		case CVOptimizerState.UPLOADING_FILE:
			// Enhanced with UploadThing progress
			return context.isActiveUpload
				? 10 + context.uploadProgress * 0.15 // 10% to 25%
				: 20;

		case CVOptimizerState.FILE_UPLOAD_COMPLETE:
			return 30;

		case CVOptimizerState.PROCESSING_FILE:
			return 50;

		case CVOptimizerState.ANALYZING_CONTENT:
			return 75;

		case CVOptimizerState.OPTIMIZATION_COMPLETE:
			return 100;

		case CVOptimizerState.PREVIEW_MODE:
		case CVOptimizerState.EDIT_MODE:
			return 100;

		// Error states return progress based on how far we got
		case CVOptimizerState.UPLOAD_ERROR:
			return 15;
		case CVOptimizerState.FILE_PROCESSING_ERROR:
			return 35;
		case CVOptimizerState.ANALYSIS_ERROR:
			return 70;

		default:
			return 0;
	}
};

/**
 * Helper function to get the current step description for user feedback
 * EXTENDED: Enhanced step descriptions with UploadThing integration
 */
export const getCurrentStepDescription = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): string => {
	// UploadThing specific descriptions
	if (context.isActiveUpload) {
		return `Uploading ${context.uploadThingFiles.length} file(s)...`;
	}

	if (context.uploadThingInProgress) {
		return "Processing uploaded file...";
	}

	switch (currentState) {
		case CVOptimizerState.INITIALIZING:
			return "Initializing application...";
		case CVOptimizerState.CHECKING_EXISTING_RESUME:
			return "Checking for existing resume...";
		case CVOptimizerState.WELCOME_NEW_USER:
			return "Ready to upload your resume";
		case CVOptimizerState.AWAITING_UPLOAD:
			return "Waiting for file or text input";
		case CVOptimizerState.UPLOADING_FILE:
			return "Uploading your file...";
		case CVOptimizerState.FILE_UPLOAD_COMPLETE:
			return "File uploaded successfully";
		case CVOptimizerState.PROCESSING_FILE:
			return "Processing file content...";
		case CVOptimizerState.ANALYZING_CONTENT:
			return "AI is analyzing your resume...";
		case CVOptimizerState.OPTIMIZATION_COMPLETE:
			return "Optimization completed successfully!";
		case CVOptimizerState.PREVIEW_MODE:
			return "Viewing optimized resume";
		case CVOptimizerState.EDIT_MODE:
			return "Editing resume content";
		case CVOptimizerState.SAVING_CHANGES:
			return "Saving your changes...";
		case CVOptimizerState.RESETTING_CHANGES:
			return "Resetting to original version...";

		// Error states
		case CVOptimizerState.UPLOAD_ERROR:
			return "Upload failed - please try again";
		case CVOptimizerState.FILE_PROCESSING_ERROR:
			return "File processing failed";
		case CVOptimizerState.ANALYSIS_ERROR:
			return "Analysis failed - please try again";
		case CVOptimizerState.SAVE_ERROR:
			return "Save failed - please try again";
		case CVOptimizerState.RESET_ERROR:
			return "Reset failed - please try again";

		default:
			return "Processing...";
	}
};
