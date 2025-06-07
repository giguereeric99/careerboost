/**
 * useResumeOptimizer Hook - REFACTORED AND SIMPLIFIED VERSION
 *
 * This hook provides the main interface for resume optimization functionality.
 * MAJOR IMPROVEMENTS:
 * - Fixed UploadThing double processing issue
 * - Simplified UI state management
 * - Added auto-processing useEffect
 * - Reduced complexity and redundancy
 * - Enhanced error handling and debugging
 */

import { useReducer, useCallback, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

// Import separated concerns
import {
	CVOptimizerState,
	UseResumeOptimizerReturn,
	UploadedFileInfo,
	CVOptimizerAction,
} from "@/types/resumeOptimizerTypes";
import {
	TOAST_CONFIGURATIONS,
	LOADING_STATES,
	PROCESSING_STATES,
	EDIT_ALLOWED_STATES,
	SAVE_ALLOWED_STATES,
	RESET_ALLOWED_STATES,
	PREVIEW_TAB_STATES,
	UPLOAD_TAB_STATES,
	UPLOAD_STATES,
	FILE_PROCESSING_STATES,
	ANALYSIS_STATES,
	TIMING_CONFIG,
} from "@/constants/resumeOptimizerConstants";
import {
	cvOptimizerReducer,
	actionCreators,
	createInitialContext,
	isErrorState,
	getErrorMessage,
	isRetryableError,
	calculateOverallProgress,
	getCurrentStepDescription,
	canUploadFile,
	canInputText,
	isLoadingState,
	validateFile,
	validateTextContent,
	normalizeSuggestion,
	normalizeKeyword,
} from "@/actions/resumeOptimizerActions";

// Import services for database operations
import {
	getLatestOptimizedResume,
	saveResumeComplete,
	resetResumeToOriginal,
} from "@/services/resumeService";

// Import utility functions
import {
	parseHtmlIntoSections,
	getSectionName,
	SECTION_NAMES,
	SECTION_ORDER,
	ensureAllStandardSections,
} from "@/utils/resumeUtils";

// Import existing types
import {
	OptimizedResumeData,
	Suggestion,
	Keyword,
	Section,
} from "@/types/resumeTypes";

/**
 * Main hook that provides the resume optimization interface
 * SIMPLIFIED: Reduced complexity and eliminated redundancy
 */
export const useResumeOptimizer = (
	userId?: string
): UseResumeOptimizerReturn => {
	// Get authenticated user info from Clerk for upload operations
	const { user } = useUser();

	// Initialize state machine with separated reducer
	const [{ current: state, context }, dispatch] = useReducer(
		cvOptimizerReducer,
		{
			current: CVOptimizerState.INITIALIZING,
			context: createInitialContext(),
		}
	);

	// Refs for optimization and tracking
	const hasInitialized = useRef(false);
	const initializationComplete = useRef(false);
	const logProtection = useRef({
		lastLogTime: 0,
		lastLogState: null as CVOptimizerState | null,
		logCount: 0,
	});
	const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const retryCountRef = useRef<number>(0);
	const lastOperationRef = useRef<string | null>(null);
	const lastProcessedUserIdRef = useRef<string | null>(null);

	// Debug action history ref
	type ActionHistoryEntry = {
		action: CVOptimizerAction;
		fromState: CVOptimizerState;
		toState: CVOptimizerState;
		timestamp: Date;
		success: boolean;
		error?: string | null;
	};

	const actionHistoryRef = useRef<ActionHistoryEntry[]>([]);

	// ===== SIMPLIFIED COMPUTED VALUES =====

	// Basic UI states derived from current state
	const uiStates = useMemo(
		() => ({
			isLoading: LOADING_STATES.includes(state),
			isSaving: state === CVOptimizerState.SAVING_CHANGES,
			isResetting: state === CVOptimizerState.RESETTING_CHANGES,
			isEditing: EDIT_ALLOWED_STATES.includes(state),
			hasResume: context.hasExistingResume,
			activeTab: context.activeTab,
			isUploading: UPLOAD_STATES.includes(state),
			isProcessingFile: FILE_PROCESSING_STATES.includes(state),
			isAnalyzing: ANALYSIS_STATES.includes(state),
			canUpload: canUploadFile(state, context),
			canInputText: canInputText(state, context),
			isInErrorState: isErrorState(state),
			isRetryable: isRetryableError(state, context),
		}),
		[state, context.hasExistingResume, context.activeTab]
	);

	// SIMPLIFIED: Single upload UI state function
	const uploadUIStates = useMemo(() => {
		// MASTER LOGIC: Centralized button control
		const shouldHideButton =
			LOADING_STATES.includes(state) ||
			PROCESSING_STATES.includes(state) ||
			context.isActiveUpload ||
			context.uploadThingInProgress;

		const isUIFrozen =
			shouldHideButton ||
			state === CVOptimizerState.SAVING_CHANGES ||
			state === CVOptimizerState.RESETTING_CHANGES;

		return {
			shouldHideUploadButton: shouldHideButton,
			isUIFrozen: isUIFrozen,
			canInteractWithUI: !isUIFrozen,
			allowNewUpload: uiStates.canUpload && !shouldHideButton,
			allowTextInput: uiStates.canInputText && !isUIFrozen,
			showUploadingAnimation: context.isActiveUpload || uiStates.isUploading,
			showProcessingAnimation:
				context.uploadThingInProgress || uiStates.isProcessingFile,
			showGeneralLoadingAnimation: uiStates.isLoading,
			shouldReallyHideUploadButton: shouldHideButton,
			isUploadThingActive:
				context.isActiveUpload || context.uploadThingInProgress,
			isInActiveProcessing:
				PROCESSING_STATES.includes(state) || uiStates.isProcessingFile,
		};
	}, [state, context, uiStates]);

	// Current display content based on state and editing mode
	const currentDisplayContent = useMemo(() => {
		if (uiStates.isEditing && context.tempEditedContent) {
			return context.tempEditedContent;
		}
		return context.optimizedText;
	}, [uiStates.isEditing, context.tempEditedContent, context.optimizedText]);

	// Current sections for editing
	const currentSections = useMemo(() => {
		console.log("🔧 PARSING HTML - Triggers:", {
			isEditing: uiStates.isEditing,
			tempSectionsLength: context.tempSections.length,
			hasContent: !!currentDisplayContent,
			contentLength: currentDisplayContent?.length || 0,
		});
		if (uiStates.isEditing && context.tempSections.length > 0) {
			return context.tempSections;
		}

		if (currentDisplayContent) {
			try {
				const parsedSections = parseHtmlIntoSections(
					currentDisplayContent,
					getSectionName,
					SECTION_NAMES,
					SECTION_ORDER
				);
				return ensureAllStandardSections(parsedSections);
			} catch (error) {
				console.error("Error parsing sections:", error);
				return [];
			}
		}

		return [];
	}, [uiStates.isEditing, context.tempSections, currentDisplayContent]);

	// Tab accessibility
	const permissions = useMemo(
		() => ({
			canAccessUpload: true, // Always accessible
			canAccessPreview: PREVIEW_TAB_STATES.includes(state),
			canEdit: EDIT_ALLOWED_STATES.includes(state),
			canSave: SAVE_ALLOWED_STATES.includes(state),
			canReset: RESET_ALLOWED_STATES.includes(state),
			isInLoadingState: LOADING_STATES.includes(state),
			isInProcessingState: PROCESSING_STATES.includes(state),
			isInErrorState: isErrorState(state),
		}),
		[state]
	);

	// Upload status and progress
	const uploadStatus = useMemo(() => {
		return {
			overallProgress: calculateOverallProgress(state, context),
			currentStep: getCurrentStepDescription(state, context),
			errorMessage: uiStates.isInErrorState
				? getErrorMessage(state, context)
				: undefined,
			canRetry: uiStates.isRetryable,
			isInUploadPhase: context.isActiveUpload || UPLOAD_STATES.includes(state),
			isInProcessingPhase:
				context.uploadThingInProgress || uiStates.isProcessingFile,
			isInAnalysisPhase: uiStates.isAnalyzing,
			primaryMessage: getCurrentStepDescription(state, context),
			secondaryMessage: context.errorMessage || "Ready to upload",
		};
	}, [state, context, uiStates.isInErrorState, uiStates.isRetryable]);

	// ===== DATABASE OPERATIONS =====

	/**
	 * Load latest resume from database
	 */
	const loadLatestResume =
		useCallback(async (): Promise<OptimizedResumeData | null> => {
			if (!userId) return null;

			try {
				const { data: apiData, error } = await getLatestOptimizedResume(userId);

				if (error) {
					dispatch(
						actionCreators.error("Failed to load resume", error, "analysis")
					);
					return null;
				}

				if (apiData) {
					console.log("Resume loaded successfully:", apiData.id);

					const completeResumeData: OptimizedResumeData = {
						id: apiData.id,
						user_id: userId,
						original_text: apiData.original_text || "",
						optimized_text: apiData.optimized_text || "",
						last_saved_text: apiData.last_saved_text ?? null,
						last_saved_score_ats: apiData.last_saved_score_ats ?? null,
						language: apiData.language || "English",
						file_name: apiData.file_name || "",
						file_type: apiData.file_type || "",
						file_size: apiData.file_size,
						file_url: (apiData as any).file_url,
						ats_score: apiData.ats_score || 0,
						selected_template: (apiData as any).selected_template,
						created_at: (apiData as any).created_at,
						updated_at: (apiData as any).updated_at,

						// ✅ FIXED: Use the processed data directly from the service
						// The service already processed these correctly!
						suggestions: apiData.suggestions || [],
						keywords: apiData.keywords || [],
					};

					dispatch(actionCreators.resumeFound(completeResumeData));
					return completeResumeData;
				} else {
					console.log("No resume found for user");
					dispatch(actionCreators.noResumeFound());
					return null;
				}
			} catch (error) {
				console.error("Error loading resume:", error);
				dispatch(
					actionCreators.error(
						"Error loading resume",
						error as Error,
						"analysis"
					)
				);
				return null;
			}
		}, [userId]);

	/**
	 * Save resume with all changes atomically
	 */
	const saveResume = useCallback(
		async (newContent?: string, templateId?: string): Promise<boolean> => {
			console.log("🔥 saveResume CALLED - Start");
			const contentToSave =
				newContent ||
				(uiStates.isEditing
					? context.tempEditedContent
					: context.optimizedText);
			const templateToSave = templateId || context.selectedTemplate;

			if (!userId || !context.resumeData?.id || !contentToSave) {
				console.error("Cannot save: Missing data");
				toast.error("Cannot save: Missing data");
				return false;
			}

			try {
				dispatch(actionCreators.startSaving());
				lastOperationRef.current = "save";

				const appliedSuggestionIds = context.suggestions
					.filter((s) => s.isApplied)
					.map((s) => s.id);

				const appliedKeywords = context.keywords
					.filter((k) => k.isApplied)
					.map((k) => k.text);

				console.log("Saving resume with atomic transaction:", {
					resumeId: context.resumeData.id,
					contentLength: contentToSave.length,
					atsScore: context.currentAtsScore || 0,
					appliedSuggestions: appliedSuggestionIds.length,
					appliedKeywords: appliedKeywords.length,
					template: templateToSave,
				});

				const { success, error } = await saveResumeComplete(
					context.resumeData.id,
					contentToSave,
					context.currentAtsScore || 0,
					appliedSuggestionIds,
					appliedKeywords,
					templateToSave
				);

				if (!success) {
					console.log("🔥 saveResume - FAILED, dispatching error");
					dispatch(
						actionCreators.error(
							"Failed to save changes",
							error || new Error("Unknown save error"),
							"save"
						)
					);
					return false;
				}

				const updatedResumeData = {
					...context.resumeData,
					last_saved_text: contentToSave,
					last_saved_score_ats: context.currentAtsScore,
					selected_template: templateToSave,
				};
				console.log("🔥 saveResume - SUCCESS, dispatching saveSuccess");
				dispatch(actionCreators.saveSuccess(updatedResumeData));
				console.log("🔥 saveResume CALLED - End");
				return true;
			} catch (error) {
				console.error("Error saving resume:", error);
				dispatch(
					actionCreators.error("Failed to save changes", error as Error, "save")
				);
				return false;
			}
		},
		[userId, context, uiStates.isEditing]
	);

	/**
	 * Reset resume to original version
	 */
	const resetResume = useCallback(async (): Promise<boolean> => {
		if (!userId || !context.resumeData?.id) {
			toast.error("Cannot reset: Missing data");
			return false;
		}

		try {
			dispatch(actionCreators.startReset());
			lastOperationRef.current = "reset";

			const { success, error } = await resetResumeToOriginal(
				context.resumeData.id
			);

			if (!success) {
				dispatch(
					actionCreators.error(
						"Failed to reset resume",
						error || new Error("Unknown reset error"),
						"reset"
					)
				);
				return false;
			}

			const resetResumeData = {
				...context.resumeData,
				last_saved_text: null,
				last_saved_score_ats: null,
			};

			dispatch(actionCreators.resetSuccess(resetResumeData));
			toast.success("Resume reset to original version");
			return true;
		} catch (error) {
			console.error("Error resetting resume:", error);
			dispatch(
				actionCreators.error("Failed to reset resume", error as Error, "reset")
			);
			return false;
		}
	}, [userId, context.resumeData]);

	// ===== UPLOAD OPERATIONS =====

	/**
	 * Process uploaded file (extract content and analyze)
	 * ENHANCED: Better integration with UploadThing workflow
	 */
	const processUploadedFile = useCallback(
		async (fileInfo: UploadedFileInfo): Promise<boolean> => {
			console.log(
				"🚀 processUploadedFile: Starting processing for file:",
				fileInfo.name
			);

			// CRITICAL: Anti-duplication guard - Check if already completed
			if (
				(state as string) === CVOptimizerState.OPTIMIZATION_COMPLETE ||
				(state as string) === CVOptimizerState.PREVIEW_MODE ||
				(state as string) === CVOptimizerState.EDIT_MODE
			) {
				console.log(
					"⚠️ processUploadedFile: Already in OPTIMIZATION_COMPLETE state, skipping API call"
				);
				return true; // Return success to avoid error states
			}

			// Input validation
			if (!fileInfo || !user?.id) {
				console.error("❌ processUploadedFile: Missing file info or user ID");

				if (state !== CVOptimizerState.FILE_PROCESSING_ERROR) {
					dispatch(
						actionCreators.error(
							"Cannot process file: Missing required information",
							new Error("Missing fileInfo or user.id"),
							"file_processing",
							{
								operation: "file_processing",
								step: "input_validation",
								retryable: false,
								userMessage:
									"Unable to process the uploaded file. Please try uploading again.",
								technicalDetails: `FileInfo: ${!!fileInfo}, UserId: ${!!user?.id}`,
							}
						)
					);
				}
				return false;
			}

			// State guard - prevent processing if already in error
			if (isErrorState(state)) {
				console.warn(
					"⚠️ processUploadedFile: Already in error state, aborting processing"
				);
				return false;
			}

			// CRITICAL: Additional guard - prevent processing if in completion states
			const completionStates = [
				CVOptimizerState.OPTIMIZATION_COMPLETE,
				CVOptimizerState.PREVIEW_MODE,
				CVOptimizerState.EDIT_MODE,
			];

			if (completionStates.includes(state)) {
				console.log(
					"⚠️ processUploadedFile: Already in completion state, skipping processing:",
					state
				);
				return true; // Return success to avoid error states
			}

			// Dispatch start processing
			dispatch(actionCreators.startFileProcessing());
			lastOperationRef.current = "file_processing";

			try {
				console.log("📤 processUploadedFile: Preparing API request");

				const formData = new FormData();
				formData.append("fileUrl", fileInfo.url);
				formData.append("fileName", fileInfo.name);
				formData.append("fileType", fileInfo.type);
				formData.append("userId", user.id);
				formData.append("resetLastSavedText", "true");

				console.log("🌐 processUploadedFile: Calling optimization API");

				const optimizeResponse = await fetch("/api/optimize", {
					method: "POST",
					body: formData,
				});

				// CRITICAL: Check again before processing response
				if (
					(state as string) === CVOptimizerState.OPTIMIZATION_COMPLETE ||
					(state as string) === CVOptimizerState.PREVIEW_MODE ||
					(state as string) === CVOptimizerState.EDIT_MODE
				) {
					console.log(
						"⚠️ processUploadedFile: State changed to OPTIMIZATION_COMPLETE during API call, discarding result"
					);
					return true; // Discard result but return success
				}

				// Parse response
				let optimizeResult;
				try {
					optimizeResult = await optimizeResponse.json();
					console.log(
						"📥 processUploadedFile: API response parsed successfully"
					);
				} catch (parseError) {
					console.error("❌ processUploadedFile: Failed to parse API response");

					dispatch(
						actionCreators.error(
							"Invalid response from server",
							parseError as Error,
							"file_processing",
							{
								operation: "file_processing",
								step: "response_parsing",
								retryable: true,
								userMessage: "Server response was invalid. Please try again.",
								technicalDetails: `Parse error: ${
									(parseError as Error).message
								}`,
							}
						)
					);
					return false;
				}

				// Handle 422 validation errors
				if (optimizeResponse.status === 422 && optimizeResult.validation) {
					console.log("📋 processUploadedFile: Resume validation failed");
					dispatch(
						actionCreators.resumeValidationFailed(optimizeResult.validation)
					);
					return false;
				}

				// Handle other HTTP errors
				if (!optimizeResponse.ok) {
					console.error(
						`❌ processUploadedFile: API Error ${optimizeResponse.status}`
					);

					const errorMessage =
						optimizeResult?.error || `API Error: ${optimizeResponse.status}`;
					const isRetryable =
						optimizeResponse.status >= 500 || optimizeResponse.status === 429;

					dispatch(
						actionCreators.error(
							"File processing failed",
							new Error(errorMessage),
							"file_processing",
							{
								operation: "file_processing",
								step: "api_call",
								retryable: isRetryable,
								userMessage: isRetryable
									? "Server is temporarily busy. Please try again."
									: "Unable to process the file. Please check the file format and try again.",
								technicalDetails: `Status: ${optimizeResponse.status}, Error: ${errorMessage}`,
							}
						)
					);
					return false;
				}

				// Validate success response
				if (!optimizeResult?.optimizedText || !optimizeResult?.resumeId) {
					console.error(
						"❌ processUploadedFile: Invalid optimization response"
					);

					dispatch(
						actionCreators.error(
							"Invalid response from server",
							new Error("Missing optimized text or resume ID"),
							"file_processing",
							{
								operation: "file_processing",
								step: "response_validation",
								retryable: true,
								userMessage: "Server response was invalid. Please try again.",
								technicalDetails:
									"Missing optimizedText or resumeId in response",
							}
						)
					);
					return false;
				}

				// CRITICAL: Final guard before dispatching result
				if (
					(state as string) === CVOptimizerState.OPTIMIZATION_COMPLETE ||
					(state as string) === CVOptimizerState.PREVIEW_MODE ||
					(state as string) === CVOptimizerState.EDIT_MODE
				) {
					console.log(
						"⚠️ processUploadedFile: State changed to OPTIMIZATION_COMPLETE, discarding API result"
					);
					return true; // Discard result but return success
				}

				// Build resume data object
				console.log("✅ processUploadedFile: Building resume data object");

				const resumeData: OptimizedResumeData = {
					id: optimizeResult.resumeId,
					user_id: user.id,
					original_text: "",
					optimized_text: optimizeResult.optimizedText,
					last_saved_text: null,
					last_saved_score_ats: null,
					language: optimizeResult.language || "English",
					file_name: fileInfo.name,
					file_type: fileInfo.type,
					file_size: fileInfo.size,
					file_url: fileInfo.url,
					ats_score: optimizeResult.atsScore || 65,
					selected_template: "basic",
					keywords: optimizeResult.keywords
						? optimizeResult.keywords.map(normalizeKeyword)
						: [],
					suggestions: optimizeResult.suggestions
						? optimizeResult.suggestions.map(normalizeSuggestion)
						: [],
				};

				console.log(
					"🎉 processUploadedFile: Processing completed successfully"
				);
				dispatch(actionCreators.analysisComplete(resumeData));
				return true;
			} catch (error) {
				console.error("💥 processUploadedFile: Unexpected error:", error);

				if (!isErrorState(state)) {
					dispatch(
						actionCreators.error(
							"File processing failed",
							error as Error,
							"file_processing",
							{
								operation: "file_processing",
								step: "unexpected_error",
								retryable: true,
								userMessage: "An unexpected error occurred. Please try again.",
								technicalDetails: `File: ${fileInfo.name}, Error: ${
									(error as Error).message
								}`,
							}
						)
					);
				}
				return false;
			}
		},
		[user?.id, state, dispatch] // IMPORTANT: Add state to dependencies
	);

	/**
	 * NEW: Handle UploadThing completion callback - SIMPLIFIED VERSION
	 * This is called by UploadThing's onClientUploadComplete callback
	 *
	 * ARCHITECTURE:
	 * - This function ONLY updates the state machine
	 * - The actual file processing is triggered by useEffect when state changes
	 * - This prevents duplicate processing and keeps responsibilities clear
	 */
	const handleUploadThingComplete = useCallback(
		async (results: any[]) => {
			console.log("📥 Hook: UploadThing completion callback triggered");
			console.log("📥 Hook: Results received:", {
				type: typeof results,
				isArray: Array.isArray(results),
				length: results?.length,
				firstResultExists: !!results?.[0],
			});

			// Basic validation - detailed validation happens in the reducer
			if (!results) {
				console.error("❌ Hook: UploadThing results is null/undefined");
				dispatch(
					actionCreators.uploadThingError(
						new Error("Upload completed but no results provided by UploadThing")
					)
				);
				return;
			}

			if (!Array.isArray(results)) {
				console.error(
					"❌ Hook: UploadThing results is not an array:",
					typeof results
				);
				dispatch(
					actionCreators.uploadThingError(
						new Error("Upload completed but results format is invalid")
					)
				);
				return;
			}

			if (results.length === 0) {
				console.error("❌ Hook: UploadThing results array is empty");
				dispatch(
					actionCreators.uploadThingError(
						new Error(
							"Upload completed but no file data returned. Check UploadThing configuration."
						)
					)
				);
				return;
			}

			const firstResult = results[0];
			if (!firstResult) {
				console.error("❌ Hook: First result in array is null/undefined");
				dispatch(
					actionCreators.uploadThingError(
						new Error("Upload completed but first result is empty")
					)
				);
				return;
			}

			console.log("✅ Hook: UploadThing validation passed");
			console.log("✅ Hook: First result summary:", {
				name: firstResult.name || "MISSING",
				size: firstResult.size || "MISSING",
				type: firstResult.type || "MISSING",
				hasUrl: !!firstResult.ufsUrl,
				hasKey: !!firstResult.key,
			});

			try {
				// CRITICAL: This is the ONLY action we take here
				// The reducer will handle detailed validation and state transition
				// The useEffect will detect the state change and trigger file processing
				console.log("📤 Hook: Dispatching UPLOAD_THING_COMPLETE action");
				dispatch(actionCreators.uploadThingComplete(results));

				console.log("✅ Hook: Action dispatched successfully");
				console.log(
					"✅ Hook: State machine will handle file processing automatically"
				);
			} catch (error) {
				console.error(
					"💥 Hook: Error dispatching UploadThing completion:",
					error
				);
				dispatch(actionCreators.uploadThingError(error as Error));
			}
		},
		[dispatch]
	);

	/**
	 * NEW: Handle UploadThing error callback
	 */
	const handleUploadThingError = useCallback((error: Error) => {
		console.error("❌ UploadThing error:", error);
		dispatch(actionCreators.uploadThingError(error));
		lastOperationRef.current = "uploadthing_error";
	}, []);

	/**
	 * NEW: Handle UploadThing begin callback
	 */
	const handleUploadThingBegin = useCallback((files: File[]) => {
		console.log("UploadThing begin with files:", files);
		dispatch(actionCreators.uploadThingBegin(files));
		lastOperationRef.current = "uploadthing_begin";
	}, []);

	/**
	 * NEW: Set UploadThing active state
	 */
	const setUploadThingActive = useCallback((isActive: boolean) => {
		dispatch(actionCreators.setUploadThingActive(isActive));
	}, []);

	/**
	 * Handle file selection with validation
	 */
	const handleFileSelect = useCallback((file: File | null) => {
		if (!file) {
			dispatch(actionCreators.selectFile(new File([], "")));
			return;
		}

		const validation = validateFile(file);
		if (!validation.isValid) {
			dispatch(
				actionCreators.error(
					validation.error || "File validation failed",
					undefined,
					"upload",
					{
						operation: "file_selection",
						step: "validation",
						retryable: true,
						userMessage: validation.error || "Please select a valid file",
						technicalDetails: `File: ${file.name}, Size: ${file.size}, Type: ${file.type}`,
					}
				)
			);
			return;
		}

		dispatch(actionCreators.selectFile(file));
	}, []);

	/**
	 * Handle file upload - for processing already uploaded files
	 */
	const handleFileUpload = useCallback(
		async (fileInfo: UploadedFileInfo): Promise<boolean> => {
			if (!fileInfo || !user?.id) {
				console.error("Cannot process file: Missing file info or user ID");
				return false;
			}

			try {
				lastOperationRef.current = "file_processing";
				return await processUploadedFile(fileInfo);
			} catch (error) {
				console.error("Error processing uploaded file:", error);
				dispatch(
					actionCreators.error(
						"File processing failed",
						error as Error,
						"upload",
						{
							operation: "file_processing",
							step: "processing",
							retryable: true,
							userMessage: "Failed to process uploaded file. Please try again.",
							technicalDetails: `File: ${fileInfo.name}, Error: ${
								(error as Error).message
							}`,
						}
					)
				);
				return false;
			}
		},
		[user?.id, processUploadedFile]
	);

	/**
	 * Handle text content changes
	 */
	const handleTextContentChange = useCallback((content: string) => {
		dispatch(actionCreators.updateTextContent(content));
	}, []);

	/**
	 * Handle text upload and processing
	 */
	const handleTextUpload = useCallback(async (): Promise<boolean> => {
		const content = context.resumeTextContent;

		if (!content || !user?.id) {
			console.error("Cannot process text: Missing content or user ID");
			return false;
		}

		try {
			dispatch(actionCreators.startTextUpload(content));
			lastOperationRef.current = "text_upload";

			// The reducer will validate the content and transition to processing
			// Then we start the analysis directly
			return await handleAnalysis(content);
		} catch (error) {
			console.error("Error processing text:", error);
			dispatch(
				actionCreators.error(
					"Text processing failed",
					error as Error,
					"upload",
					{
						operation: "text_processing",
						step: "validation",
						retryable: true,
						userMessage: "Failed to process text content. Please try again.",
						technicalDetails: `Content length: ${content.length}`,
					}
				)
			);
			return false;
		}
	}, [context.resumeTextContent, user?.id]);

	/**
	 * Handle drag and drop state
	 */
	const handleDragOver = useCallback((isDragOver: boolean) => {
		dispatch(actionCreators.setDragOver(isDragOver));
	}, []);

	/**
	 * Handle AI analysis of resume content
	 */
	const handleAnalysis = useCallback(
		async (content: string): Promise<boolean> => {
			if (!content || !user?.id) {
				console.error("Cannot analyze: Missing content or user ID");
				return false;
			}

			try {
				dispatch(actionCreators.startAnalysis());
				lastOperationRef.current = "analysis";

				const formData = new FormData();
				formData.append("rawText", content);
				formData.append("userId", user.id);
				formData.append("resetLastSavedText", "true");

				const analysisResponse = await fetch("/api/optimize", {
					method: "POST",
					body: formData,
				});

				if (!analysisResponse.ok) {
					throw new Error("Analysis failed");
				}

				const analysisResult = await analysisResponse.json();

				if (!analysisResult?.optimizedText) {
					throw new Error("Invalid analysis response");
				}

				const resumeData: OptimizedResumeData = {
					id: analysisResult.resumeId || "",
					user_id: user.id,
					original_text: content,
					optimized_text: analysisResult.optimizedText,
					last_saved_text: null,
					last_saved_score_ats: null,
					language: analysisResult.language || "English",
					file_name: context.selectedFile?.name || "text-input.txt",
					file_type: context.selectedFile?.type || "text/plain",
					file_size: context.selectedFile?.size,
					file_url: context.uploadedFileInfo?.url,
					ats_score: analysisResult.atsScore || 65,
					selected_template: "basic",
					keywords: analysisResult.keywords
						? analysisResult.keywords.map(normalizeKeyword)
						: [],
					suggestions: analysisResult.suggestions
						? analysisResult.suggestions.map(normalizeSuggestion)
						: [],
				};

				dispatch(actionCreators.analysisComplete(resumeData));
				return true;
			} catch (error) {
				console.error("Error during analysis:", error);
				dispatch(
					actionCreators.error("Analysis failed", error as Error, "analysis", {
						operation: "analysis",
						step: "ai_processing",
						retryable: true,
						userMessage: "AI analysis failed. Please try again.",
						technicalDetails: `Content length: ${content.length}, Error: ${
							(error as Error).message
						}`,
					})
				);
				return false;
			}
		},
		[user?.id, context.selectedFile, context.uploadedFileInfo]
	);

	/**
	 * Retry the last failed operation
	 */
	const retryLastOperation = useCallback(async () => {
		const operation = lastOperationRef.current;

		if (!operation || !uiStates.isRetryable) {
			console.warn("No retryable operation available");
			return;
		}

		dispatch(actionCreators.retryLastOperation());
		retryCountRef.current += 1;

		try {
			switch (operation) {
				case "uploadthing_begin":
				case "uploadthing_error":
					setUploadThingActive(false);
					break;
				case "file_processing":
					if (context.uploadedFileInfo) {
						await processUploadedFile(context.uploadedFileInfo);
					}
					break;
				case "text_upload":
					await handleTextUpload();
					break;
				case "analysis":
					const contentToAnalyze =
						context.resumeTextContent || context.originalText;
					if (contentToAnalyze) {
						await handleAnalysis(contentToAnalyze);
					}
					break;
				case "save":
					await saveResume();
					break;
				case "reset":
					await resetResume();
					break;
				default:
					console.warn(`Unknown operation to retry: ${operation}`);
			}
		} catch (error) {
			console.error(`Retry failed for operation ${operation}:`, error);
		}
	}, [
		uiStates.isRetryable,
		context.uploadedFileInfo,
		context.resumeTextContent,
		context.originalText,
		processUploadedFile,
		handleTextUpload,
		handleAnalysis,
		saveResume,
		resetResume,
		setUploadThingActive,
	]);

	// ===== EDIT MODE AND CONTENT MANAGEMENT =====

	/**
	 * Toggle edit mode with toast notifications
	 */
	const toggleEditMode = useCallback(() => {
		if (uiStates.isEditing) {
			dispatch(actionCreators.exitEditMode());
		} else {
			dispatch(actionCreators.enterEditMode());
		}
	}, [uiStates.isEditing]);

	/**
	 * Handle content editing
	 */
	const handleContentEdit = useCallback((content: string) => {
		dispatch(actionCreators.updateContent(content));
	}, []);

	/**
	 * Handle section-specific editing
	 */
	const handleSectionEdit = useCallback(
		(sectionId: string, content: string) => {
			dispatch(actionCreators.updateSection(sectionId, content));
		},
		[]
	);

	/**
	 * Handle suggestion application
	 */
	const handleApplySuggestion = useCallback(
		(suggestionId: string, applied: boolean): boolean => {
			if (!context.resumeData?.id) {
				console.error("Cannot apply suggestion: No resume data available");
				return false;
			}

			dispatch(actionCreators.applySuggestion(suggestionId, applied));
			return true;
		},
		[context.resumeData]
	);

	/**
	 * Handle keyword application
	 */
	const handleKeywordApply = useCallback(
		(keywordId: string, applied: boolean): boolean => {
			if (!context.resumeData?.id) {
				console.error("Cannot apply keyword: No resume data available");
				return false;
			}

			dispatch(actionCreators.applyKeyword(keywordId, applied));
			return true;
		},
		[context.resumeData]
	);

	/**
	 * Update selected template
	 */
	const updateSelectedTemplate = useCallback((templateId: string): boolean => {
		dispatch(actionCreators.updateTemplate(templateId));
		return true;
	}, []);

	/**
	 * Update resume with optimized data from API
	 */
	const updateResumeWithOptimizedData = useCallback(
		(
			optimizedText: string,
			resumeId: string,
			atsScore: number,
			suggestions: Suggestion[],
			keywords: Keyword[],
			aiResponse?: any
		) => {
			dispatch(
				actionCreators.updateResumeData(
					optimizedText,
					resumeId,
					atsScore,
					suggestions,
					keywords,
					aiResponse
				)
			);
		},
		[]
	);

	/**
	 * Set active tab
	 */
	const setActiveTab = useCallback((tab: "upload" | "preview") => {
		dispatch(actionCreators.switchTab(tab));
	}, []);

	// ===== UTILITY FUNCTIONS =====

	/**
	 * Get array of applied keywords
	 */
	const getAppliedKeywords = useCallback((): string[] => {
		return context.keywords
			.filter((keyword) => keyword.isApplied)
			.map((keyword) => keyword.text);
	}, [context.keywords]);

	/**
	 * Check if there are unsaved changes
	 */
	const hasUnsavedChanges = useCallback((): boolean => {
		return context.hasUnsavedChanges;
	}, [context.hasUnsavedChanges]);

	/**
	 * Calculate completion score based on applied suggestions and keywords
	 */
	const calculateCompletionScore = useCallback((): number => {
		if (!context.suggestions.length && !context.keywords.length) return 0;

		const appliedSuggestions = context.suggestions.filter(
			(s) => s.isApplied
		).length;
		const appliedKeywords = context.keywords.filter((k) => k.isApplied).length;

		const totalItems = context.suggestions.length + context.keywords.length;
		const appliedItems = appliedSuggestions + appliedKeywords;

		return Math.round((appliedItems / totalItems) * 100);
	}, [context.suggestions, context.keywords]);

	/**
	 * Check if save button should be enabled
	 */
	const shouldEnableSaveButton = useCallback((): boolean => {
		return context.hasUnsavedChanges;
	}, [context.hasUnsavedChanges]);

	// ===== LEGACY SETTERS (kept for compatibility) =====

	const setOptimizedText = useCallback((text: string) => {
		dispatch(actionCreators.updateContent(text));
	}, []);

	const setCurrentAtsScore = useCallback((score: number) => {
		console.warn("Direct score setting should be handled through actions");
	}, []);

	const setSuggestions = useCallback((suggestions: Suggestion[]) => {
		console.warn(
			"Direct suggestions setting should be handled through actions"
		);
	}, []);

	const setKeywords = useCallback((keywords: Keyword[]) => {
		console.warn("Direct keywords setting should be handled through actions");
	}, []);

	const setContentModified = useCallback((modified: boolean) => {
		console.warn(
			"Content modification is now handled automatically by the state machine"
		);
	}, []);

	const setScoreModified = useCallback((modified: boolean) => {
		console.warn(
			"Score modification is now handled automatically by the state machine"
		);
	}, []);

	const setSelectedTemplate = useCallback((template: string) => {
		dispatch(actionCreators.updateTemplate(template));
	}, []);

	const setTemplateModified = useCallback((modified: boolean) => {
		console.warn(
			"Template modification is now handled automatically by the state machine"
		);
	}, []);

	const setSectionTitles = useCallback((titles: Record<string, string>) => {
		console.warn(
			"Section titles should be set through updateResumeWithOptimizedData"
		);
	}, []);

	const setResumeLanguage = useCallback((language: string) => {
		console.warn(
			"Resume language should be set through updateResumeWithOptimizedData"
		);
	}, []);

	// Helper function to determine authentication status
	const isUserAuthenticated = useCallback(() => {
		if (user?.id) return true;
		if (context.userId) return true;
		return false;
	}, [user?.id, context.userId]);

	// ===== EFFECTS =====

	// PROTECTED LOGGING: Prevent duplicate logs
	const now = Date.now();
	const timeSinceLastLog = now - logProtection.current.lastLogTime;
	const isSameState = logProtection.current.lastLogState === state;

	// Only log if it's been more than 1 second OR different state
	if (!isSameState || timeSinceLastLog > 1000) {
		console.log("🔧 Debug Initialize:", {
			userId,
			hasInitialized: hasInitialized.current,
			currentState: state,
			logCount: ++logProtection.current.logCount,
		});

		logProtection.current.lastLogTime = now;
		logProtection.current.lastLogState = state;
	}

	// Initialize the hook - handles both authenticated and unauthenticated users
	useEffect(() => {
		// ULTIMATE GUARD: Only run once per userId change
		const currentUserId = userId || "anonymous";

		if (lastProcessedUserIdRef.current === currentUserId) {
			return; // Already processed this userId
		}

		// ANTI-DUPLICATION: Check if already initialized
		if (initializationComplete.current && hasInitialized.current) {
			return;
		}

		console.log("🚀 Initialize Effect Triggered (OPTIMIZED):", {
			userId: currentUserId,
			lastProcessedUserId: lastProcessedUserIdRef.current,
			hasInitialized: hasInitialized.current,
			currentState: state,
		});

		// Mark as processed immediately
		lastProcessedUserIdRef.current = currentUserId;

		if (!hasInitialized.current) {
			if (userId) {
				console.log("✅ FIRST TIME: Dispatching initialize action");
				dispatch(actionCreators.initialize(userId));
			} else {
				console.log("ℹ️ FIRST TIME: User not authenticated");
				dispatch(actionCreators.setWelcomeState());
			}
			hasInitialized.current = true;
			initializationComplete.current = true;
		}
	}, [userId]);

	// Handle automatic resume loading
	useEffect(() => {
		if (state === CVOptimizerState.CHECKING_EXISTING_RESUME && userId) {
			loadLatestResume();
		}
	}, [state, userId, loadLatestResume]);

	// ===== CRITICAL: AUTO-PROCESSING EFFECT FOR UPLOADTHING COMPLETION =====
	/**
	 * CRITICAL EFFECT: Auto-trigger file processing after UploadThing completion
	 *
	 * PURPOSE:
	 * - Bridges the gap between UploadThing upload and file processing
	 * - Maintains clean separation of concerns (upload vs processing)
	 * - Ensures automatic flow without user intervention
	 *
	 * TRIGGER CONDITIONS:
	 * - State is FILE_UPLOAD_COMPLETE (set by reducer after UPLOAD_THING_COMPLETE)
	 * - Valid uploadedFileInfo exists in context
	 * - No ongoing UploadThing processing
	 * - User is authenticated
	 */
	useEffect(() => {
		// console.log("🔄 AutoProcess useEffect triggered");
		// console.log("🔄 Current state:", state);
		// console.log("🔄 Has uploadedFileInfo:", !!context.uploadedFileInfo);
		// console.log("🔄 UploadThing in progress:", context.uploadThingInProgress);
		// console.log("🔄 User authenticated:", !!userId);

		// Guard: Check target state
		if (state !== CVOptimizerState.FILE_UPLOAD_COMPLETE) {
			console.log(
				"🔄 AutoProcess: Not in FILE_UPLOAD_COMPLETE state, skipping"
			);
			return;
		}

		// Guard: Check file info exists
		if (!context.uploadedFileInfo) {
			console.warn(
				"⚠️ AutoProcess: FILE_UPLOAD_COMPLETE state but no uploadedFileInfo"
			);
			return;
		}

		// Guard: Check UploadThing not still processing
		if (context.uploadThingInProgress) {
			console.log("🔄 AutoProcess: UploadThing still in progress, waiting...");
			return;
		}

		// Guard: Check user authentication
		if (!userId) {
			console.error(
				"❌ AutoProcess: Cannot process file without authenticated user"
			);
			dispatch(
				actionCreators.error(
					"Authentication required for file processing",
					new Error("User not authenticated during auto-processing"),
					"file_processing",
					{
						operation: "file_processing",
						step: "auto_processing_auth_check",
						retryable: false,
						userMessage: "Please sign in to process uploaded files",
						technicalDetails: "userId is null during auto-processing trigger",
					}
				)
			);
			return;
		}

		// Guard: Prevent duplicate processing
		if (PROCESSING_STATES.includes(state)) {
			console.log("🔄 AutoProcess: Already in processing state, skipping");
			return;
		}

		// Main processing trigger
		console.log(
			"🚀 AutoProcess: All guards passed, triggering file processing"
		);
		// console.log("🚀 AutoProcess: File details:", {
		// 	name: context.uploadedFileInfo.name,
		// 	size: context.uploadedFileInfo.size,
		// 	type: context.uploadedFileInfo.type,
		// 	hasUrl: !!context.uploadedFileInfo.url,
		// });

		// Async processing execution
		const executeAutoProcessing = async () => {
			try {
				console.log("📤 AutoProcess: Calling processUploadedFile");

				// CRITICAL: This is the single point where file processing is triggered
				const success = await processUploadedFile(context.uploadedFileInfo!);

				if (success) {
					console.log("✅ AutoProcess: File processing completed successfully");
				} else {
					console.error("❌ AutoProcess: File processing returned false");

					toast.error("File processing failed", {
						description:
							"Please try uploading again or use text input instead.",
						duration: 6000,
					});
				}
			} catch (error) {
				console.error(
					"💥 AutoProcess: Unexpected error during file processing:",
					error
				);

				dispatch(
					actionCreators.error(
						"Auto-processing failed unexpectedly",
						error as Error,
						"file_processing",
						{
							operation: "file_processing",
							step: "auto_processing_execution",
							retryable: true,
							userMessage:
								"File processing failed unexpectedly. Please try again.",
							technicalDetails: `Auto-processing error: ${
								(error as Error).message
							}, File: ${context.uploadedFileInfo?.name}`,
						}
					)
				);
			}
		};

		// Execute the async processing
		executeAutoProcessing();
	}, [
		state,
		context.uploadedFileInfo,
		context.uploadThingInProgress,
		userId,
		processUploadedFile,
		dispatch,
	]);

	// ===== UPLOADTHING STATE CLEANUP EFFECT =====
	/**
	 * CLEANUP EFFECT: Reset UploadThing states when leaving upload flow
	 */
	useEffect(() => {
		const isInUploadFlow = [
			CVOptimizerState.AWAITING_UPLOAD,
			CVOptimizerState.UPLOADING_FILE,
			CVOptimizerState.FILE_UPLOAD_COMPLETE,
			CVOptimizerState.PROCESSING_FILE,
			CVOptimizerState.ANALYZING_CONTENT,
		].includes(state);

		const isInUploadErrorState = [
			CVOptimizerState.UPLOAD_ERROR,
			CVOptimizerState.FILE_PROCESSING_ERROR,
			CVOptimizerState.ANALYSIS_ERROR,
		].includes(state);

		const isInSuccessState = [
			CVOptimizerState.OPTIMIZATION_COMPLETE,
			CVOptimizerState.PREVIEW_MODE,
			CVOptimizerState.EDIT_MODE,
		].includes(state);

		// Cleanup UploadThing states when appropriate
		if (isInSuccessState || (!isInUploadFlow && !isInUploadErrorState)) {
			const needsCleanup =
				context.isActiveUpload ||
				context.uploadThingInProgress ||
				context.uploadThingFiles.length > 0;

			if (needsCleanup) {
				console.log(
					"🧹 Cleanup: Resetting UploadThing states for state:",
					state
				);

				if (context.isActiveUpload) {
					dispatch(actionCreators.setUploadThingActive(false));
				}
			}
		}

		if (isInUploadErrorState) {
			if (context.isActiveUpload || context.uploadThingInProgress) {
				dispatch(actionCreators.setUploadThingActive(false));
			}
		}
	}, [
		state,
		context.isActiveUpload,
		context.uploadThingInProgress,
		context.uploadThingFiles.length,
		dispatch,
	]);

	// Add refs for toast protection
	const toastProtectionRef = useRef<{
		lastToastState: CVOptimizerState | null;
		lastToastTime: number;
		currentToastId: string | null;
	}>({
		lastToastState: null,
		lastToastTime: 0,
		currentToastId: null,
	});

	// Handle state transitions for notifications using constants
	useEffect(() => {
		console.log(`🔄 Toast Effect: State changed to: ${state}`);

		const toastConfig = TOAST_CONFIGURATIONS[state];

		if (!toastConfig) {
			console.log(
				`🔄 Toast Effect: No toast config for state ${state}, skipping`
			);
			return;
		}

		console.log(`🎯 Toast Effect: Found toast config for ${state}:`, {
			type: toastConfig.type,
			title: toastConfig.title,
			description: toastConfig.description,
			condition: toastConfig.condition,
		});

		// Protection: Prevent duplicate toasts
		const now = Date.now();
		const timeSinceLastToast = now - toastProtectionRef.current.lastToastTime;

		if (
			toastProtectionRef.current.lastToastState === state &&
			timeSinceLastToast < 2000
		) {
			console.log(
				`🛡️ Toast Protection: Preventing duplicate toast for state ${state}`,
				{
					lastState: toastProtectionRef.current.lastToastState,
					timeSinceLastToast,
					threshold: 2000,
				}
			);
			return;
		}

		// Conditional logic: Check if toast should be shown
		let shouldShowToast = true;

		if (toastConfig.condition) {
			switch (toastConfig.condition) {
				case "unauthenticated":
					shouldShowToast = !isUserAuthenticated();
					console.log(
						`🔍 Toast Condition: unauthenticated = ${shouldShowToast}`
					);
					break;
				case "authenticated_no_resume":
					shouldShowToast = isUserAuthenticated() && !context.hasExistingResume;
					console.log(
						`🔍 Toast Condition: authenticated_no_resume = ${shouldShowToast}`,
						{
							isAuthenticated: isUserAuthenticated(),
							hasResume: context.hasExistingResume,
						}
					);
					break;
				default:
					shouldShowToast = true;
					console.log(`🔍 Toast Condition: default = true`);
			}
		} else {
			console.log(`🔍 Toast Condition: no condition, showing toast`);
		}

		if (!shouldShowToast) {
			console.log(
				`🚫 Toast Effect: Condition not met, skipping toast for ${state}`
			);
			return;
		}

		// Dismiss previous toast
		if (toastProtectionRef.current.currentToastId) {
			console.log(
				`🗑️ Toast Effect: Dismissing previous toast:`,
				toastProtectionRef.current.currentToastId
			);
			toast.dismiss();
		}

		// Show toast based on type
		let toastId: string | null = null;

		console.log(
			`🎬 Toast Effect: About to show ${toastConfig.type} toast for ${state}`
		);

		switch (toastConfig.type) {
			case "info":
				toastId = String(
					toast.info(toastConfig.title, {
						description: toastConfig.description,
						duration: toastConfig.duration,
					})
				);
				console.log(`ℹ️ Toast Effect: Showed INFO toast:`, {
					id: toastId,
					title: toastConfig.title,
					duration: toastConfig.duration,
				});
				break;
			case "success":
				toastId = String(
					toast.success(toastConfig.title, {
						description: toastConfig.description,
						duration: toastConfig.duration,
					})
				);
				console.log(`✅ Toast Effect: Showed SUCCESS toast:`, {
					id: toastId,
					title: toastConfig.title,
					duration: toastConfig.duration,
				});
				break;
			case "loading":
				toastId = String(
					toast.loading(toastConfig.title, {
						description: toastConfig.description,
					})
				);
				console.log(`⏳ Toast Effect: Showed LOADING toast:`, {
					id: toastId,
					title: toastConfig.title,
					description: toastConfig.description,
					note: "Loading toasts have infinite duration until dismissed",
				});
				break;
			case "error":
				toastId = String(
					toast.error(toastConfig.title, {
						description: toastConfig.description,
						duration: toastConfig.duration,
					})
				);
				console.log(`❌ Toast Effect: Showed ERROR toast:`, {
					id: toastId,
					title: toastConfig.title,
					duration: toastConfig.duration,
				});
				break;
			case "message":
				toastId = String(toast.message(toastConfig.title));
				console.log(`💬 Toast Effect: Showed MESSAGE toast:`, {
					id: toastId,
					title: toastConfig.title,
				});
				break;
			default:
				console.warn(
					`⚠️ Toast Effect: Unknown toast type: ${toastConfig.type}`
				);
		}

		// Update protection state
		toastProtectionRef.current = {
			lastToastState: state,
			lastToastTime: now,
			currentToastId: toastId,
		};

		console.log(`🔒 Toast Protection: Updated protection state:`, {
			lastToastState: state,
			lastToastTime: now,
			currentToastId: toastId,
			protectionActive: true,
		});
	}, [
		state,
		context.userId,
		context.hasExistingResume,
		user?.id,
		isUserAuthenticated,
	]);

	// Handle upload timeouts and cleanup
	useEffect(() => {
		if (
			UPLOAD_STATES.includes(state) ||
			FILE_PROCESSING_STATES.includes(state) ||
			ANALYSIS_STATES.includes(state)
		) {
			const timeoutDuration = ANALYSIS_STATES.includes(state)
				? TIMING_CONFIG.ANALYSIS_TIMEOUT
				: FILE_PROCESSING_STATES.includes(state)
				? TIMING_CONFIG.FILE_PROCESSING_TIMEOUT
				: TIMING_CONFIG.UPLOAD_TIMEOUT;

			uploadTimeoutRef.current = setTimeout(() => {
				const errorType = ANALYSIS_STATES.includes(state)
					? "analysis"
					: FILE_PROCESSING_STATES.includes(state)
					? "file_processing"
					: "upload";

				dispatch(
					actionCreators.error(
						`${errorType} timeout`,
						new Error("Operation timed out"),
						errorType,
						{
							operation: errorType,
							step: "timeout",
							retryable: true,
							userMessage: `${errorType} timed out. Please try again.`,
							technicalDetails: `Timeout after ${timeoutDuration}ms`,
						}
					)
				);
			}, timeoutDuration);
		}

		return () => {
			if (uploadTimeoutRef.current) {
				clearTimeout(uploadTimeoutRef.current);
				uploadTimeoutRef.current = null;
			}
		};
	}, [state]);

	// Reset retry count on successful operations
	useEffect(() => {
		if (
			state === CVOptimizerState.OPTIMIZATION_COMPLETE ||
			state === CVOptimizerState.PREVIEW_MODE
		) {
			retryCountRef.current = 0;
			lastOperationRef.current = null;
		}
	}, [state]);

	// Handle user sign out - reset to unauthenticated state
	useEffect(() => {
		if (!userId && hasInitialized.current && context.userId) {
			console.log("🚪 User signed out, triggering logout action");
			dispatch(actionCreators.logout());
			hasInitialized.current = false;
		}
	}, [userId, context.userId]);

	// Cleanup effect
	useEffect(() => {
		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
			if (uploadTimeoutRef.current) {
				clearTimeout(uploadTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		console.log("🔍 Hook State Update - selectedFile changed:", {
			hasFile: !!context.selectedFile,
			fileName: context.selectedFile?.name || "none",
			fileSize: context.selectedFile?.size || 0,
			uploadMethod: context.uploadMethod || "none",
			currentState: state,
			timestamp: new Date().toISOString(),
		});
	}, [context.selectedFile, context.uploadMethod, state]);

	// Update action history with final states
	useEffect(() => {
		if (actionHistoryRef.current.length > 0) {
			const lastEntry =
				actionHistoryRef.current[actionHistoryRef.current.length - 1];
			if (lastEntry.toState !== state) {
				actionHistoryRef.current[actionHistoryRef.current.length - 1] = {
					...lastEntry,
					toState: state,
				};
			}
		}
	}, [state]);

	// ===== DEBUG FUNCTIONS =====

	/**
	 * Complete simulateActionForDebug function - WITH PUBLIC FILE SOLUTION
	 *
	 * This function simulates all debug actions using real local files in public/test-files/
	 * This approach allows the API to download real files instead of mock URLs.
	 */
	const simulateActionForDebug = useCallback(
		(actionType: string, payload?: any) => {
			console.log(`🎯 Debug Simulation: ${actionType}`, payload);

			// Log current state before dispatch
			console.log("🎯 Debug: State BEFORE dispatch:", {
				currentState: state,
				isEditing: uiStates.isEditing,
				hasUnsavedChanges: hasUnsavedChanges(),
				contentModified: context.contentModified,
				scoreModified: context.scoreModified,
				templateModified: context.templateModified,
				selectedFile: context.selectedFile?.name || "none",
				uploadMethod: context.uploadMethod || "none",
				hasUploadedFileInfo: !!context.uploadedFileInfo,
				timestamp: new Date().toISOString(),
			});

			// ✅ SOLUTION: Helper function to get local file URLs
			const getDebugFileUrl = (fileType: string, fileName: string): string => {
				const baseUrl =
					process.env.NODE_ENV === "development"
						? "http://localhost:3000/test-files"
						: "/test-files"; // For production, if needed

				// Determine file extension based on type
				switch (fileType) {
					case "text/plain":
						return `${baseUrl}/debug-resume.txt`;
					case "application/pdf":
						return `${baseUrl}/debug-resume.pdf`;
					case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
						return `${baseUrl}/debug-resume.docx`;
					case "application/msword":
						return `${baseUrl}/debug-resume.doc`;
					default:
						return `${baseUrl}/debug-resume.txt`; // Default to text file
				}
			};

			// Create realistic mock file content (this won't be used since we use real files)
			const createRealisticResumeContent = () => {
				return `John Doe
Senior Software Developer

CONTACT INFORMATION
Email: john.doe@email.com
Phone: (555) 123-4567
Location: Montreal, QC, Canada
LinkedIn: linkedin.com/in/johndoe
GitHub: github.com/johndoe

PROFESSIONAL SUMMARY
Experienced Full-Stack Developer with 5+ years of expertise in modern web technologies. 
Proven track record of building scalable applications using React, Node.js, and TypeScript. 
Strong problem-solving skills and passion for clean, efficient code. Demonstrated ability 
to lead development teams and deliver high-quality software solutions on time.

TECHNICAL SKILLS
• Frontend Technologies: React, Vue.js, Angular, TypeScript, JavaScript, HTML5, CSS3, SASS
• Backend Technologies: Node.js, Express.js, Python, Django, RESTful APIs, GraphQL
• Databases: PostgreSQL, MongoDB, MySQL, Redis, Elasticsearch
• Cloud & DevOps: AWS (EC2, S3, Lambda), Docker, Kubernetes, Jenkins, CI/CD
• Development Tools: Git, Webpack, Babel, Jest, Cypress, VS Code
• Project Management: Agile, Scrum, Jira, Confluence

PROFESSIONAL EXPERIENCE

Senior Full-Stack Developer | TechCorp Inc. | Montreal, QC | 2021 - Present
• Led development of customer-facing web application serving 100,000+ active users
• Implemented microservices architecture reducing system latency by 40%
• Mentored team of 3 junior developers and conducted code reviews
• Collaborated with product managers and UX designers to define technical requirements
• Increased application performance by 50% through code optimization and caching strategies
• Technologies: React, Node.js, PostgreSQL, AWS, Docker

Full-Stack Developer | StartupXYZ | Montreal, QC | 2019 - 2021
• Built responsive web applications using React and Redux for state management
• Developed and maintained RESTful APIs serving mobile and web clients
• Designed and implemented database schemas for complex business logic
• Improved application performance by 35% through query optimization
• Participated in agile development process and sprint planning
• Implemented automated testing suite increasing code coverage to 85%
• Technologies: React, Express.js, MongoDB, Docker, Jest

Software Developer | WebSolutions Ltd. | Montreal, QC | 2018 - 2019
• Developed frontend components using modern JavaScript frameworks
• Fixed critical bugs and implemented new features in legacy applications
• Collaborated with senior developers to learn best practices
• Participated in code reviews and technical discussions
• Improved user experience through responsive design implementation
• Technologies: JavaScript, HTML5, CSS3, jQuery, Bootstrap, Git

EDUCATION
Bachelor of Science in Computer Science
University of Montreal | Montreal, QC | 2014 - 2018
• Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems
• Senior Project: E-commerce platform with payment integration
• GPA: 3.7/4.0
• Dean's List: Fall 2016, Spring 2017, Fall 2017

PROJECTS

E-Commerce Platform | Personal Project | 2023
• Built full-stack e-commerce solution with payment integration and inventory management
• Implemented user authentication, shopping cart, and order processing
• Used Next.js for server-side rendering and improved SEO
• Integrated Stripe API for secure payment processing
• Technologies: Next.js, React, Node.js, PostgreSQL, Stripe API

Task Management Application | Team Project | 2022
• Created collaborative task management application with real-time updates
• Implemented user roles, project organization, and notification system
• Used WebSocket for real-time collaboration features
• Deployed using Docker containers on AWS
• Technologies: React, Node.js, Socket.io, MongoDB, Docker, AWS

Real Estate Portal | Freelance Project | 2021
• Developed property listing and search platform for local real estate agency
• Implemented advanced search filters and interactive map integration
• Created admin panel for property management
• Optimized for mobile devices and search engines
• Technologies: Vue.js, Laravel, MySQL, Google Maps API

CERTIFICATIONS
• AWS Certified Developer Associate | Amazon Web Services | 2023
• React Developer Certification | Meta | 2022
• Node.js Certified Developer | OpenJS Foundation | 2021
• Scrum Master Certification | Scrum Alliance | 2020

ACHIEVEMENTS
• Led team that won "Best Innovation" award at TechCorp hackathon 2023
• Increased team productivity by 30% through implementation of code review process
• Reduced customer support tickets by 25% through improved error handling
• Contributed to open-source projects with over 1,000 GitHub stars

LANGUAGES
• English (Native)
• French (Fluent)
• Spanish (Conversational)

VOLUNTEER EXPERIENCE
Code Mentor | Girls Who Code Montreal | 2020 - Present
• Mentor young women interested in technology careers
• Teach programming fundamentals and web development
• Organize coding workshops and career guidance sessions

INTERESTS
• Open Source Contribution
• Tech Blogging
• Photography
• Hiking and Outdoor Activities
• Continuous Learning and Professional Development`;
			};

			// Create mock file based on action type
			const mockFileContent =
				actionType === "SIMULATE_FILE_SELECT"
					? new Blob([createRealisticResumeContent()], { type: "text/plain" })
					: new Blob([createRealisticResumeContent()], {
							type: "application/pdf",
					  });

			const mockFile = new File(
				[mockFileContent],
				actionType === "SIMULATE_FILE_SELECT"
					? "debug-resume.txt"
					: "debug-resume.pdf",
				{
					type:
						actionType === "SIMULATE_FILE_SELECT"
							? "text/plain"
							: "application/pdf",
					lastModified: Date.now(),
				}
			);

			// Log file creation details
			if (actionType === "SIMULATE_FILE_SELECT") {
				console.log("🎯 Debug: Creating realistic mock file:", {
					name: mockFile.name,
					size: mockFile.size,
					type: mockFile.type,
					sizeInKB: Math.round(mockFile.size / 1024),
					isRealisticSize: mockFile.size > 1000,
				});
			}

			// ✅ CRITICAL: Use real local file URLs instead of mock URLs
			const mockFileInfo: UploadedFileInfo = {
				name: mockFile.name,
				size: mockFile.size,
				type: mockFile.type,
				// ✅ SOLUTION: Use local file URL that actually exists
				url: getDebugFileUrl(mockFile.type, mockFile.name),
			};

			// Log the URL that will be used
			console.log("🎯 Debug: File URL for API:", {
				url: mockFileInfo.url,
				accessible: "Should be accessible via browser",
				note: "Make sure public/test-files/debug-resume.txt exists",
			});

			// Create comprehensive mock resume data for analysis completion
			const mockResumeData: OptimizedResumeData = {
				id: `debug-resume-${Date.now()}`,
				user_id: userId || "mock-user-id",
				original_text: createRealisticResumeContent(),
				optimized_text: `
<div class="resume-content">
	<header class="resume-header">
		<h1>John Doe</h1>
		<h2>Senior Software Developer</h2>
		<div class="contact-info">
			<p>Email: john.doe@email.com | Phone: (555) 123-4567</p>
			<p>Location: Montreal, QC, Canada</p>
			<p>LinkedIn: linkedin.com/in/johndoe | GitHub: github.com/johndoe</p>
		</div>
	</header>

	<section class="resume-section">
		<h3>Professional Summary</h3>
		<p>Experienced Full-Stack Developer with 5+ years of expertise in modern web technologies. Proven track record of building scalable applications using React, Node.js, and TypeScript. Strong problem-solving skills and passion for clean, efficient code. Demonstrated ability to lead development teams and deliver high-quality software solutions on time.</p>
	</section>

	<section class="resume-section">
		<h3>Technical Skills</h3>
		<div class="skills-grid">
			<div class="skill-category">
				<h4>Frontend Technologies</h4>
				<ul>
					<li>React, Vue.js, Angular</li>
					<li>TypeScript, JavaScript</li>
					<li>HTML5, CSS3, SASS</li>
				</ul>
			</div>
			<div class="skill-category">
				<h4>Backend Technologies</h4>
				<ul>
					<li>Node.js, Express.js</li>
					<li>Python, Django</li>
					<li>RESTful APIs, GraphQL</li>
				</ul>
			</div>
			<div class="skill-category">
				<h4>Databases & Cloud</h4>
				<ul>
					<li>PostgreSQL, MongoDB</li>
					<li>AWS, Docker, Kubernetes</li>
					<li>CI/CD, Jenkins</li>
				</ul>
			</div>
		</div>
	</section>

	<section class="resume-section">
		<h3>Professional Experience</h3>
		
		<div class="job-entry">
			<h4>Senior Full-Stack Developer</h4>
			<div class="job-details">
				<span class="company">TechCorp Inc.</span>
				<span class="location">Montreal, QC</span>
				<span class="duration">2021 - Present</span>
			</div>
			<ul class="achievements">
				<li>Led development of customer-facing web application serving 100,000+ active users</li>
				<li>Implemented microservices architecture reducing system latency by 40%</li>
				<li>Mentored team of 3 junior developers and conducted code reviews</li>
				<li>Collaborated with product managers and UX designers to define technical requirements</li>
				<li>Increased application performance by 50% through code optimization and caching strategies</li>
			</ul>
			<p class="technologies"><strong>Technologies:</strong> React, Node.js, PostgreSQL, AWS, Docker</p>
		</div>

		<div class="job-entry">
			<h4>Full-Stack Developer</h4>
			<div class="job-details">
				<span class="company">StartupXYZ</span>
				<span class="location">Montreal, QC</span>
				<span class="duration">2019 - 2021</span>
			</div>
			<ul class="achievements">
				<li>Built responsive web applications using React and Redux for state management</li>
				<li>Developed and maintained RESTful APIs serving mobile and web clients</li>
				<li>Designed and implemented database schemas for complex business logic</li>
				<li>Improved application performance by 35% through query optimization</li>
				<li>Implemented automated testing suite increasing code coverage to 85%</li>
			</ul>
			<p class="technologies"><strong>Technologies:</strong> React, Express.js, MongoDB, Docker, Jest</p>
		</div>
	</section>

	<section class="resume-section">
		<h3>Education</h3>
		<div class="education-entry">
			<h4>Bachelor of Science in Computer Science</h4>
			<div class="education-details">
				<span class="school">University of Montreal</span>
				<span class="location">Montreal, QC</span>
				<span class="duration">2014 - 2018</span>
			</div>
			<p><strong>GPA:</strong> 3.7/4.0</p>
			<p><strong>Relevant Coursework:</strong> Data Structures, Algorithms, Software Engineering, Database Systems</p>
		</div>
	</section>

	<section class="resume-section">
		<h3>Projects</h3>
		
		<div class="project-entry">
			<h4>E-Commerce Platform</h4>
			<span class="project-year">2023</span>
			<p>Built full-stack e-commerce solution with payment integration and inventory management</p>
			<p><strong>Technologies:</strong> Next.js, React, Node.js, PostgreSQL, Stripe API</p>
		</div>

		<div class="project-entry">
			<h4>Task Management Application</h4>
			<span class="project-year">2022</span>
			<p>Created collaborative task management application with real-time updates</p>
			<p><strong>Technologies:</strong> React, Node.js, Socket.io, MongoDB, Docker, AWS</p>
		</div>
	</section>

	<section class="resume-section">
		<h3>Certifications</h3>
		<ul>
			<li>AWS Certified Developer Associate (2023)</li>
			<li>React Developer Certification - Meta (2022)</li>
			<li>Node.js Certified Developer (2021)</li>
			<li>Scrum Master Certification (2020)</li>
		</ul>
	</section>
</div>
		`.trim(),
				last_saved_text: undefined,
				last_saved_score_ats: undefined,
				language: "English",
				file_name: mockFile.name,
				file_type: mockFile.type,
				file_size: mockFile.size,
				ats_score: 87, // Higher realistic score
				selected_template: "basic",
				keywords: [
					{
						id: "debug-keyword-1",
						text: "React",
						isApplied: false,
						relevance: 1,
						pointImpact: 2,
					},
					{
						id: "debug-keyword-2",
						text: "TypeScript",
						isApplied: false,
						relevance: 1,
						pointImpact: 2,
					},
					{
						id: "debug-keyword-3",
						text: "Node.js",
						isApplied: false,
						relevance: 1,
						pointImpact: 2,
					},
					{
						id: "debug-keyword-4",
						text: "AWS",
						isApplied: false,
						relevance: 1,
						pointImpact: 2,
					},
					{
						id: "debug-keyword-5",
						text: "PostgreSQL",
						isApplied: false,
						relevance: 1,
						pointImpact: 1,
					},
					{
						id: "debug-keyword-6",
						text: "Docker",
						isApplied: false,
						relevance: 1,
						pointImpact: 1,
					},
					{
						id: "debug-keyword-7",
						text: "Microservices",
						isApplied: false,
						relevance: 1,
						pointImpact: 2,
					},
					{
						id: "debug-keyword-8",
						text: "Full-Stack",
						isApplied: false,
						relevance: 1,
						pointImpact: 2,
					},
				],
				suggestions: [
					{
						id: "debug-suggestion-1",
						text: "Add more quantifiable achievements to demonstrate measurable impact",
						type: "improvement",
						impact:
							"Including specific numbers and metrics will make your resume more impactful for ATS systems and hiring managers. Quantified achievements show concrete value.",
						isApplied: false,
						pointImpact: 3,
					},
					{
						id: "debug-suggestion-2",
						text: "Include relevant industry keywords for better ATS matching",
						type: "addition",
						impact:
							"Adding more industry-specific keywords can improve your resume's visibility in applicant tracking systems and help match job requirements more effectively.",
						isApplied: false,
						pointImpact: 2,
					},
					{
						id: "debug-suggestion-3",
						text: "Highlight leadership and mentoring experience more prominently",
						type: "restructure",
						impact:
							"Emphasizing leadership skills and team management experience will make you stand out for senior and lead developer positions.",
						isApplied: false,
						pointImpact: 2,
					},
					{
						id: "debug-suggestion-4",
						text: "Add a skills section with proficiency levels and years of experience",
						type: "addition",
						impact:
							"A detailed skills section with proficiency indicators helps recruiters quickly assess your technical capabilities and experience depth.",
						isApplied: false,
						pointImpact: 2,
					},
					{
						id: "debug-suggestion-5",
						text: "Include links to your portfolio projects and GitHub repositories",
						type: "enhancement",
						impact:
							"Direct links to your work provide tangible proof of your skills and allow employers to review your coding style and project quality.",
						isApplied: false,
						pointImpact: 1,
					},
				],
			};

			let action: CVOptimizerAction;

			// Create actions based on simulation type
			switch (actionType) {
				// ===== UPLOAD WORKFLOW ACTIONS =====
				case "SIMULATE_FILE_SELECT":
					action = actionCreators.selectFile(mockFile);
					console.log(
						"🎯 Debug: About to dispatch SELECT_FILE with realistic mock file:",
						{
							fileName: mockFile.name,
							fileSize: mockFile.size,
							fileSizeKB: Math.round(mockFile.size / 1024),
							fileType: mockFile.type,
							isValidSize: mockFile.size > 1000,
							currentState: state,
						}
					);
					break;

				case "SIMULATE_UPLOAD_START":
					action = actionCreators.uploadThingBegin([mockFile]);
					console.log("🎯 Debug: Starting UploadThing simulation with files:", [
						mockFile.name,
					]);
					break;

				case "SIMULATE_UPLOAD_COMPLETE":
					action = actionCreators.uploadThingComplete([
						{
							name: mockFileInfo.name,
							size: mockFileInfo.size,
							type: mockFileInfo.type,
							ufsUrl: mockFileInfo.url, // This will be the local file URL
							key: `debug-file-key-${Date.now()}`,
							url: mockFileInfo.url,
						},
					]);
					console.log(
						"🎯 Debug: Completing UploadThing simulation with file info:",
						{
							name: mockFileInfo.name,
							url: mockFileInfo.url,
							accessible: "Should be downloadable by API",
						}
					);
					break;

				case "SIMULATE_PROCESSING_START":
					action = actionCreators.startFileProcessing();
					console.log("🎯 Debug: Starting file processing simulation");
					break;

				case "SIMULATE_PROCESSING_COMPLETE":
					const extractedContent = createRealisticResumeContent();
					action = actionCreators.fileProcessingComplete(extractedContent);
					console.log(
						"🎯 Debug: Completing file processing with extracted content length:",
						extractedContent.length
					);
					break;

				case "SIMULATE_ANALYSIS_START":
					action = actionCreators.startAnalysis();
					console.log("🎯 Debug: Starting AI analysis simulation");
					break;

				case "SIMULATE_ANALYSIS_COMPLETE":
					action = actionCreators.analysisComplete(mockResumeData);
					console.log(
						"🎯 Debug: Completing analysis with comprehensive resume data:",
						{
							resumeId: mockResumeData.id,
							atsScore: mockResumeData.ats_score,
							keywordsCount: mockResumeData.keywords?.length || 0,
							suggestionsCount: mockResumeData.suggestions?.length || 0,
							contentLength: mockResumeData.optimized_text.length,
						}
					);
					break;

				// ===== EDIT MODE ACTIONS =====
				case "SIMULATE_ENTER_EDIT_MODE":
					action = actionCreators.enterEditMode();
					console.log("🎯 Debug: Entering edit mode");
					break;

				case "SIMULATE_EXIT_EDIT_MODE":
					action = actionCreators.exitEditMode();
					console.log("🎯 Debug: Exiting edit mode");
					break;

				// ===== SAVE WORKFLOW ACTIONS =====
				case "SIMULATE_START_SAVING":
					action = actionCreators.startSaving();
					console.log("🎯 Debug: Starting save operation");
					break;

				case "SIMULATE_SAVE_SUCCESS":
					// Use existing resume data or create mock data for save success
					const saveResumeData = context.resumeData || mockResumeData;
					const updatedSaveData = {
						...saveResumeData,
						last_saved_text: saveResumeData.optimized_text,
						last_saved_score_ats: 92, // Simulate improved score after save
						selected_template: context.selectedTemplate || "basic",
					};
					action = actionCreators.saveSuccess(updatedSaveData);
					console.log(
						"🎯 Debug: Simulating successful save with updated data:",
						{
							resumeId: updatedSaveData.id,
							lastSavedScore: updatedSaveData.last_saved_score_ats,
							template: updatedSaveData.selected_template,
						}
					);
					break;

				case "SIMULATE_SAVE_ERROR":
					action = actionCreators.error(
						"Simulated save error for testing",
						new Error("Mock save operation failed"),
						"save",
						{
							operation: "save",
							step: "simulate_save_error",
							retryable: true,
							userMessage:
								"Failed to save changes. This is a simulated error for testing.",
							technicalDetails:
								"Debug simulation save error - not a real issue",
						}
					);
					console.log("🎯 Debug: Simulating save error");
					break;

				// ===== RESET WORKFLOW ACTIONS =====
				case "SIMULATE_START_RESET":
					action = actionCreators.startReset();
					console.log("🎯 Debug: Starting reset operation");
					break;

				case "SIMULATE_RESET_SUCCESS":
					// Use existing resume data or create mock data for reset success
					const resetResumeData = context.resumeData || mockResumeData;
					const resetData = {
						...resetResumeData,
						last_saved_text: null, // Clear saved changes
						last_saved_score_ats: null, // Clear saved score
						// Reset all suggestions and keywords to unapplied
						suggestions:
							resetResumeData.suggestions?.map((s) => ({
								...s,
								isApplied: false,
							})) || [],
						keywords:
							resetResumeData.keywords?.map((k) => ({
								...k,
								isApplied: false,
							})) || [],
					};
					action = actionCreators.resetSuccess(resetData);
					console.log(
						"🎯 Debug: Simulating successful reset to original state:",
						{
							resumeId: resetData.id,
							clearedSavedText: resetData.last_saved_text === null,
							clearedSavedScore: resetData.last_saved_score_ats === null,
						}
					);
					break;

				case "SIMULATE_RESET_ERROR":
					action = actionCreators.error(
						"Simulated reset error for testing",
						new Error("Mock reset operation failed"),
						"reset",
						{
							operation: "reset",
							step: "simulate_reset_error",
							retryable: true,
							userMessage:
								"Failed to reset resume. This is a simulated error for testing.",
							technicalDetails:
								"Debug simulation reset error - not a real issue",
						}
					);
					console.log("🎯 Debug: Simulating reset error");
					break;

				// ===== SUGGESTION ACTIONS =====
				case "SIMULATE_APPLY_SUGGESTION":
					// Apply the first available suggestion
					const firstSuggestion = context.suggestions?.[0];
					if (firstSuggestion) {
						action = actionCreators.applySuggestion(
							firstSuggestion.id,
							!firstSuggestion.isApplied
						);
						console.log("🎯 Debug: Toggling suggestion application:", {
							suggestionId: firstSuggestion.id,
							newState: !firstSuggestion.isApplied,
							suggestionText: firstSuggestion.text.substring(0, 50) + "...",
						});
					} else {
						console.warn("🎯 Debug: No suggestions available to apply");
						return;
					}
					break;

				// ===== KEYWORD ACTIONS =====
				case "SIMULATE_APPLY_KEYWORD":
					// Apply the first available keyword
					const firstKeyword = context.keywords?.[0];
					if (firstKeyword) {
						action = actionCreators.applyKeyword(
							firstKeyword.id,
							!firstKeyword.isApplied
						);
						console.log("🎯 Debug: Toggling keyword application:", {
							keywordId: firstKeyword.id,
							newState: !firstKeyword.isApplied,
							keywordText: firstKeyword.text,
						});
					} else {
						console.warn("🎯 Debug: No keywords available to apply");
						return;
					}
					break;

				// ===== CONTENT UPDATE ACTIONS =====
				case "SIMULATE_UPDATE_CONTENT":
					const mockContent = `<div class="resume-content">
					<h2>UPDATED CONTENT - Debug Simulation</h2>
					<p>This content was updated via debug simulation at ${new Date().toISOString()}</p>
					${context.optimizedText || mockResumeData.optimized_text}
				</div>`;
					action = actionCreators.updateContent(mockContent);
					console.log(
						"🎯 Debug: Updating resume content with simulated changes"
					);
					break;

				case "SIMULATE_UPDATE_SECTION":
					const mockSectionContent = `<h3>Updated Section</h3><p>This section was updated via debug simulation at ${new Date().toISOString()}</p>`;
					action = actionCreators.updateSection(
						"resume-summary",
						mockSectionContent
					);
					console.log(
						"🎯 Debug: Updating resume-summary section with simulated content"
					);
					break;

				// ===== TEMPLATE ACTIONS =====
				case "SIMULATE_UPDATE_TEMPLATE":
					const currentTemplate = context.selectedTemplate || "basic";
					const newTemplate =
						currentTemplate === "basic" ? "professional" : "basic";
					action = actionCreators.updateTemplate(newTemplate);
					console.log("🎯 Debug: Switching template:", {
						from: currentTemplate,
						to: newTemplate,
					});
					break;

				// ===== ERROR AND UTILITY ACTIONS =====
				case "SIMULATE_ERROR":
					action = actionCreators.error(
						"Simulated error for testing purposes",
						new Error("This is a simulated error for debug testing"),
						"analysis",
						{
							operation: "debug_simulation",
							step: "simulate_error",
							retryable: true,
							userMessage: "This is a simulated error for testing purposes",
							technicalDetails: "Debug simulation error - not a real issue",
						}
					);
					console.log("🎯 Debug: Simulating error state");
					break;

				case "SIMULATE_CLEAR_ERROR":
					action = actionCreators.clearError();
					console.log("🎯 Debug: Clearing error state");
					break;

				case "SIMULATE_RESET":
					action = actionCreators.logout();
					console.log("🎯 Debug: Resetting to initial state");
					break;

				// ===== TAB SWITCHING ACTIONS =====
				case "SIMULATE_SWITCH_TO_UPLOAD":
					action = actionCreators.switchTab("upload");
					console.log("🎯 Debug: Switching to upload tab");
					break;

				case "SIMULATE_SWITCH_TO_PREVIEW":
					action = actionCreators.switchTab("preview");
					console.log("🎯 Debug: Switching to preview tab");
					break;

				default:
					console.warn(`Unknown simulation action: ${actionType}`);
					return;
			}

			// Create action history entry
			const historyEntry = {
				action,
				fromState: state,
				toState: state,
				timestamp: new Date(),
				success: true,
				error: undefined,
			};

			try {
				console.log("🎯 Debug: Dispatching action:", action.type);

				// Dispatch the action
				dispatch(action);

				// Update action history
				actionHistoryRef.current.push(historyEntry);

				// Keep history size manageable
				if (actionHistoryRef.current.length > 20) {
					actionHistoryRef.current = actionHistoryRef.current.slice(-20);
				}

				console.log(`✅ Debug simulation ${actionType} completed successfully`);

				// Special logging for file selection
				if (actionType === "SIMULATE_FILE_SELECT") {
					console.log(
						"🎯 Debug: SELECT_FILE action dispatched, check useEffect logs for state update"
					);
				}

				// Special logging for upload complete with URL info
				if (actionType === "SIMULATE_UPLOAD_COMPLETE") {
					console.log(
						"🎯 Debug: UPLOAD_COMPLETE action dispatched with local file URL"
					);
					console.log(
						"🎯 Debug: API should now be able to download from:",
						mockFileInfo.url
					);
					console.log(
						"🎯 Debug: Verify file exists at: public/test-files/debug-resume.txt"
					);
				}

				// Special logging for edit mode changes
				if (actionType.includes("EDIT_MODE")) {
					console.log(
						"🎯 Debug: Edit mode state change - check UI for accordion sections"
					);
				}

				// Special logging for save operations
				if (actionType.includes("SAVE")) {
					console.log(
						"🎯 Debug: Save operation - check modification flags and content state"
					);
				}

				// Special logging for reset operations
				if (actionType.includes("RESET")) {
					console.log(
						"🎯 Debug: Reset operation - check suggestions/keywords reset state"
					);
				}
			} catch (error) {
				historyEntry.success = false;
				(historyEntry as { error?: string }).error = (error as Error).message;
				actionHistoryRef.current.push(historyEntry);
				console.error(`❌ Debug simulation ${actionType} failed:`, error);
			}
		},
		[state, userId, context, uiStates.isEditing, hasUnsavedChanges, dispatch]
	);

	// ===== RETURN INTERFACE =====

	return {
		// Core state
		resumeData: context.resumeData,
		optimizedText: context.optimizedText,
		originalAtsScore: context.originalAtsScore,
		currentAtsScore: context.currentAtsScore,
		suggestions: context.suggestions,
		keywords: context.keywords,
		selectedTemplate: context.selectedTemplate,
		hasResume: context.hasExistingResume,
		activeTab: context.activeTab,

		// Multilingual section titles support
		sectionTitles: context.sectionTitles,
		resumeLanguage: context.resumeLanguage,

		// Editing state
		isEditing: uiStates.isEditing,
		tempEditedContent: context.tempEditedContent,
		tempSections: context.tempSections,
		hasTempChanges: context.hasTempChanges,

		// Computed state
		currentDisplayContent,
		currentSections,

		// Modification flags
		contentModified: context.contentModified,
		scoreModified: context.scoreModified,
		templateModified: context.templateModified,

		// Upload state - enhanced with UploadThing
		selectedFile: context.selectedFile,
		uploadedFileInfo: context.uploadedFileInfo,
		resumeTextContent: context.resumeTextContent,
		uploadProgress: context.uploadProgress,
		isDragOver: context.isDragOver,
		uploadMethod: context.uploadMethod,

		// UploadThing integration states
		isActiveUpload: context.isActiveUpload,
		uploadThingInProgress: context.uploadThingInProgress,
		uploadThingFiles: context.uploadThingFiles,

		// Validation state
		validationErrors: context.validationErrors,
		showValidationDialog: !!context.validationErrors,

		// Loading states - granular
		isLoading: uiStates.isLoading,
		isSaving: uiStates.isSaving,
		isResetting: uiStates.isResetting,
		isUploading: uiStates.isUploading,
		isProcessingFile: uiStates.isProcessingFile,
		isAnalyzing: uiStates.isAnalyzing,

		// SIMPLIFIED: Upload UI states
		uploadUIStates: uploadUIStates,

		// State-calculated permissions
		canAccessUpload: permissions.canAccessUpload,
		canAccessPreview: permissions.canAccessPreview,
		canEdit: permissions.canEdit,
		canSave: permissions.canSave,
		canReset: permissions.canReset,
		isInLoadingState: permissions.isInLoadingState,
		isInProcessingState: permissions.isInProcessingState,
		isInErrorState: permissions.isInErrorState,

		// Direct state access
		currentState: state,

		// Upload actions - fully integrated
		handleFileSelect,
		handleFileUpload,
		handleTextContentChange,
		handleTextUpload,
		handleDragOver,
		processUploadedFile,
		retryLastOperation,

		// UploadThing integration actions
		handleUploadThingBegin,
		handleUploadThingComplete,
		handleUploadThingError,
		setUploadThingActive,

		// Validation actions
		clearValidationErrors: useCallback(() => {
			dispatch(actionCreators.clearError());
		}, []),

		// Upload status
		uploadStatus: uploadStatus,

		// Legacy properties for backward compatibility
		canUploadFile: uploadUIStates.allowNewUpload,
		canInputText: uploadUIStates.allowTextInput,
		isRetryable: uiStates.isRetryable,

		// Core actions
		setActiveTab,
		toggleEditMode,
		loadLatestResume,
		saveResume,
		resetResume,

		// Editing actions
		handleContentEdit,
		handleSectionEdit,
		handleApplySuggestion,
		handleKeywordApply,
		updateResumeWithOptimizedData,
		updateSelectedTemplate,

		// Utility functions
		getAppliedKeywords,
		hasUnsavedChanges,
		calculateCompletionScore,
		shouldEnableSaveButton,

		// Legacy setters (with warnings)
		setOptimizedText,
		setCurrentAtsScore,
		setSuggestions,
		setKeywords,
		setContentModified,
		setScoreModified,
		setSelectedTemplate,
		setTemplateModified,
		setSectionTitles,
		setResumeLanguage,

		// Debug/development helpers - enhanced with step-by-step
		debug: {
			currentState: state,
			context: context,
			isValidTransition: (to: CVOptimizerState) => {
				const allowedTransitions: Partial<
					Record<CVOptimizerState, CVOptimizerState[]>
				> = {
					[CVOptimizerState.INITIALIZING]: [
						CVOptimizerState.CHECKING_EXISTING_RESUME,
						CVOptimizerState.WELCOME_NEW_USER,
					],
					[CVOptimizerState.CHECKING_EXISTING_RESUME]: [
						CVOptimizerState.EXISTING_RESUME_LOADED,
						CVOptimizerState.AWAITING_UPLOAD,
					],
					[CVOptimizerState.WELCOME_NEW_USER]: [
						CVOptimizerState.AWAITING_UPLOAD,
					],
					[CVOptimizerState.EXISTING_RESUME_LOADED]: [
						CVOptimizerState.PREVIEW_MODE,
					],
					[CVOptimizerState.AWAITING_UPLOAD]: [
						CVOptimizerState.UPLOADING_FILE,
						CVOptimizerState.ANALYZING_CONTENT,
					],
					[CVOptimizerState.UPLOADING_FILE]: [
						CVOptimizerState.FILE_UPLOAD_COMPLETE,
						CVOptimizerState.UPLOAD_ERROR,
					],
					[CVOptimizerState.FILE_UPLOAD_COMPLETE]: [
						CVOptimizerState.PROCESSING_FILE,
					],
					[CVOptimizerState.PROCESSING_FILE]: [
						CVOptimizerState.ANALYZING_CONTENT,
						CVOptimizerState.FILE_PROCESSING_ERROR,
					],
					[CVOptimizerState.ANALYZING_CONTENT]: [
						CVOptimizerState.OPTIMIZATION_COMPLETE,
						CVOptimizerState.ANALYSIS_ERROR,
					],
					[CVOptimizerState.OPTIMIZATION_COMPLETE]: [
						CVOptimizerState.PREVIEW_MODE,
					],
					[CVOptimizerState.PREVIEW_MODE]: [
						CVOptimizerState.EDIT_MODE,
						CVOptimizerState.RESETTING_CHANGES,
					],
					[CVOptimizerState.EDIT_MODE]: [
						CVOptimizerState.PREVIEW_MODE,
						CVOptimizerState.SAVING_CHANGES,
					],
					[CVOptimizerState.SAVING_CHANGES]: [
						CVOptimizerState.EDIT_MODE,
						CVOptimizerState.PREVIEW_MODE,
						CVOptimizerState.SAVE_ERROR,
					],
					[CVOptimizerState.RESETTING_CHANGES]: [
						CVOptimizerState.PREVIEW_MODE,
						CVOptimizerState.RESET_ERROR,
					],
					[CVOptimizerState.UPLOAD_ERROR]: [CVOptimizerState.AWAITING_UPLOAD],
					[CVOptimizerState.FILE_PROCESSING_ERROR]: [
						CVOptimizerState.AWAITING_UPLOAD,
					],
					[CVOptimizerState.ANALYSIS_ERROR]: [CVOptimizerState.AWAITING_UPLOAD],
					[CVOptimizerState.SAVE_ERROR]: [
						CVOptimizerState.EDIT_MODE,
						CVOptimizerState.PREVIEW_MODE,
					],
					[CVOptimizerState.RESET_ERROR]: [CVOptimizerState.PREVIEW_MODE],
				};

				return allowedTransitions[state]?.includes(to) || false;
			},
			stateHistory: actionHistoryRef.current.map((entry) => entry.fromState),
			uploadStatus,
			uploadUIStates: uploadUIStates,
			canRetry: uiStates.isRetryable,
			lastOperation: lastOperationRef.current,
			retryCount: retryCountRef.current,

			// UploadThing specific debug info
			uploadThingStatus: {
				status: context.isActiveUpload
					? "uploading"
					: context.uploadThingInProgress
					? "processing"
					: "idle",
				filesCount: context.uploadThingFiles.length,
				hasUploadedFile: !!context.uploadedFileInfo,
			},
			uploadThingValidation: {
				valid: true, // Simplified validation
				reason: "State machine managed",
			},
			shouldPreventUpload: uploadUIStates.shouldHideUploadButton,
			uploadThingRetryCount: 0, // Simplified

			// Validation debug info
			validationState: {
				hasValidationErrors: !!context.validationErrors,
				validationErrorsCount: context.validationErrors
					? Object.keys(context.validationErrors).length
					: 0,
				showDialog: !!context.validationErrors,
			},

			// Enhanced error debugging
			errorState: {
				hasError: permissions.isInErrorState,
				errorMessage: context.errorMessage,
				errorType: context.errorContext?.operation,
				isRetryable: uiStates.isRetryable,
				lastError: context.lastError?.message,
			},

			// Debug simulation functions for step-by-step testing
			dispatch: dispatch,
			actionHistory: actionHistoryRef.current,
			simulateAction: simulateActionForDebug,

			// Pre-built simulation functions for easy debug
			simulateActions: {
				selectFile: () => simulateActionForDebug("SIMULATE_FILE_SELECT"),
				startUpload: () => simulateActionForDebug("SIMULATE_UPLOAD_START"),
				completeUpload: () =>
					simulateActionForDebug("SIMULATE_UPLOAD_COMPLETE"),
				startProcessing: () =>
					simulateActionForDebug("SIMULATE_PROCESSING_START"),
				completeProcessing: () =>
					simulateActionForDebug("SIMULATE_PROCESSING_COMPLETE"),
				startAnalysis: () => simulateActionForDebug("SIMULATE_ANALYSIS_START"),
				completeAnalysis: () =>
					simulateActionForDebug("SIMULATE_ANALYSIS_COMPLETE"),
				simulateError: () => simulateActionForDebug("SIMULATE_ERROR"),
				resetToInitial: () => simulateActionForDebug("SIMULATE_RESET"),
				enterEditMode: () => simulateActionForDebug("SIMULATE_ENTER_EDIT_MODE"),
				exitEditMode: () => simulateActionForDebug("SIMULATE_EXIT_EDIT_MODE"),
			},

			// Validation functions for testing
			validateCurrentState: () => {
				const issues: string[] = [];

				// Check state-context consistency
				if (context.hasExistingResume && !context.resumeData) {
					issues.push("hasExistingResume is true but resumeData is null");
				}

				if (context.isActiveUpload && !context.uploadThingFiles.length) {
					issues.push("isActiveUpload is true but no files tracked");
				}

				if (context.uploadThingInProgress && !context.uploadedFileInfo) {
					issues.push("uploadThingInProgress but no file info");
				}

				// Check UI state consistency
				if (
					uploadUIStates.shouldHideUploadButton !==
					(LOADING_STATES.includes(state) ||
						PROCESSING_STATES.includes(state) ||
						context.isActiveUpload ||
						context.uploadThingInProgress)
				) {
					issues.push("uploadUIStates.shouldHideUploadButton inconsistent");
				}

				return {
					isValid: issues.length === 0,
					issues,
					timestamp: new Date().toISOString(),
				};
			},

			// Transition testing
			getNextValidStates: () => {
				const validStates = [
					CVOptimizerState.AWAITING_UPLOAD,
					CVOptimizerState.UPLOADING_FILE,
					CVOptimizerState.PROCESSING_FILE,
					CVOptimizerState.ANALYZING_CONTENT,
					CVOptimizerState.OPTIMIZATION_COMPLETE,
					CVOptimizerState.PREVIEW_MODE,
					CVOptimizerState.EDIT_MODE,
				];

				return validStates.map((nextState) => ({
					state: nextState,
					canTransition: true, // Simplified validation
					description: getCurrentStepDescription(nextState, context),
				}));
			},
		},
	};
};

export default useResumeOptimizer;
