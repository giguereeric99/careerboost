/**
 * Resume Optimizer State Machine Types - EXTENDED VERSION WITH UPLOADTHING INTEGRATION
 *
 * These types are specific to the state machine used in the resume optimizer.
 * They complement the existing resume types and focus on state management.
 * EXTENDED: Now includes UploadThing state integration for proper upload flow control
 */

import {
	OptimizedResumeData,
	Suggestion,
	Keyword,
	Section,
} from "./resumeTypes";

/**
 * File upload information structure
 * Used to track uploaded file metadata during the upload process
 */
export interface UploadedFileInfo {
	name: string;
	size: number;
	type: string;
	url: string;
}

/**
 * All possible states for the CV Optimizer application
 * Each state represents exactly where the user is in their workflow
 * EXTENDED: Added upload-specific states for better flow control
 */
export enum CVOptimizerState {
	// Initialization states
	INITIALIZING = "initializing",
	CHECKING_EXISTING_RESUME = "checking_existing_resume",
	WELCOME_NEW_USER = "welcome_new_user",
	EXISTING_RESUME_LOADED = "existing_resume_loaded",

	// Upload workflow states - EXTENDED
	AWAITING_UPLOAD = "awaiting_upload",
	UPLOADING_FILE = "uploading_file",
	FILE_UPLOAD_COMPLETE = "file_upload_complete", // NEW: File uploaded but not processed yet
	PROCESSING_FILE = "processing_file", // NEW: File is being parsed/processed
	ANALYZING_CONTENT = "analyzing_content", // Content is being analyzed by AI
	OPTIMIZATION_COMPLETE = "optimization_complete",

	// Main application states
	PREVIEW_MODE = "preview_mode",
	EDIT_MODE = "edit_mode",

	// Action states
	SAVING_CHANGES = "saving_changes",
	RESETTING_CHANGES = "resetting_changes",

	// Error states
	UPLOAD_ERROR = "upload_error",
	FILE_PROCESSING_ERROR = "file_processing_error", // NEW: Specific to file processing errors
	ANALYSIS_ERROR = "analysis_error",
	SAVE_ERROR = "save_error",
	RESET_ERROR = "reset_error",
}

/**
 * Context data that accompanies the state machine
 * Contains all the data needed for the current state
 * EXTENDED: Added upload-related context fields + UploadThing integration
 */
export interface CVOptimizerContext {
	// User & Resume Data (aligned with database structure)
	userId: string | null;
	resumeData: OptimizedResumeData | null;

	// Content management with priority logic
	originalText: string;
	optimizedText: string;
	tempEditedContent: string;

	// Scores & enhancements
	originalAtsScore: number | null;
	currentAtsScore: number | null;
	suggestions: Suggestion[];
	keywords: Keyword[];

	// UI states
	activeTab: "upload" | "preview";
	selectedTemplate: string;

	// Section management for editing
	tempSections: Section[];
	currentSections: Section[];

	// Modification tracking
	contentModified: boolean;
	scoreModified: boolean;
	templateModified: boolean;
	hasTempChanges: boolean;

	// EXTENDED: Upload-specific context fields
	selectedFile: File | null;
	uploadedFileInfo: UploadedFileInfo | null;
	resumeTextContent: string; // For direct text input
	uploadProgress: number; // Upload progress percentage (0-100)
	isDragOver: boolean; // Drag and drop state
	uploadMethod: "file" | "text" | null; // Track which upload method is being used

	// NEW: UploadThing integration states
	isActiveUpload: boolean; // UploadThing active state (critical for button hiding)
	uploadThingInProgress: boolean; // UploadThing processing state
	uploadThingFiles: File[]; // Files currently being processed by UploadThing

	// Multilingual support
	sectionTitles: Record<string, string>;
	resumeLanguage: string;

	// Computed flags
	hasExistingResume: boolean | null;
	hasUnsavedChanges: boolean;

	// Error handling - EXTENDED with more context
	errorMessage?: string;
	lastError?: Error;
	errorContext?: {
		operation: "upload" | "file_processing" | "analysis" | "save" | "reset";
		step?: string;
		retryable: boolean;
		userMessage: string;
		technicalDetails?: string;
	};

	// FIXED: Added missing validation errors property
	validationErrors?: any; // For 422 resume validation errors
}

/**
 * All possible actions that can trigger state transitions
 * EXTENDED: Added upload-related actions + UploadThing integration
 */
export type CVOptimizerAction =
	// ===== INITIALIZATION ACTIONS =====

	/** Initialize the optimizer with user ID */
	| { type: "INITIALIZE"; payload: { userId: string | null } }

	/** Start checking for existing resume in database */
	| { type: "CHECK_EXISTING_RESUME" }

	/** Resume found in database - load existing data */
	| { type: "RESUME_FOUND"; payload: { resumeData: OptimizedResumeData } }

	/** No resume found - show welcome screen for new user */
	| { type: "NO_RESUME_FOUND" }

	// ===== UPLOAD WORKFLOW ACTIONS =====

	/** Start the upload process */
	| { type: "START_UPLOAD" }

	/** User selects a file for upload */
	| { type: "SELECT_FILE"; payload: { file: File } }

	/** Begin file upload process */
	| { type: "START_FILE_UPLOAD"; payload: { file: File } }

	/** Update upload progress percentage (0-100) */
	| { type: "UPDATE_UPLOAD_PROGRESS"; payload: { progress: number } }

	/** File upload completed successfully */
	| { type: "FILE_UPLOAD_COMPLETE"; payload: { fileInfo: UploadedFileInfo } }

	/** User starts text upload (paste content) */
	| { type: "START_TEXT_UPLOAD"; payload: { content: string } }

	/** Begin processing uploaded file */
	| { type: "START_FILE_PROCESSING" }

	/** File processing completed - text extracted */
	| { type: "FILE_PROCESSING_COMPLETE"; payload: { extractedText: string } }

	/** Start AI analysis of resume content */
	| { type: "START_ANALYSIS" }

	/** AI analysis completed successfully */
	| { type: "ANALYSIS_COMPLETE"; payload: { resumeData: OptimizedResumeData } }

	/** Set drag over state for drag & drop UI */
	| { type: "SET_DRAG_OVER"; payload: { isDragOver: boolean } }

	/** Update text content in textarea */
	| { type: "UPDATE_TEXT_CONTENT"; payload: { content: string } }

	// ===== UPLOADTHING SPECIFIC ACTIONS =====

	/** UploadThing upload begins - triggers button hiding */
	| { type: "UPLOAD_THING_BEGIN"; payload: { files: File[] } }

	/** UploadThing upload completed - file(s) uploaded to cloud */
	| { type: "UPLOAD_THING_COMPLETE"; payload: { results: any[] } }

	/** UploadThing encountered an error during upload */
	| { type: "UPLOAD_THING_ERROR"; payload: { error: Error } }

	/** Manually set UploadThing active state */
	| { type: "SET_UPLOAD_THING_ACTIVE"; payload: { isActive: boolean } }

	// ===== VALIDATION ACTIONS =====

	/** Resume validation failed - file is not a valid resume */
	| { type: "RESUME_VALIDATION_FAILED"; payload: { validationErrors: any } }

	// ===== EDIT MODE ACTIONS =====

	/** Enter edit mode - allow content modification */
	| { type: "ENTER_EDIT_MODE" }

	/** Exit edit mode - return to preview */
	| { type: "EXIT_EDIT_MODE" }

	/** Update resume content during editing */
	| { type: "UPDATE_CONTENT"; payload: { content: string } }

	/** Update specific section content during editing */
	| { type: "UPDATE_SECTION"; payload: { sectionId: string; content: string } }

	// ===== ENHANCEMENT ACTIONS =====

	/** Apply or unapply a suggestion */
	| {
			type: "APPLY_SUGGESTION";
			payload: { suggestionId: string; applied: boolean };
	  }

	/** Apply or unapply a keyword */
	| { type: "APPLY_KEYWORD"; payload: { keywordId: string; applied: boolean } }

	// ===== TEMPLATE ACTIONS =====

	/** Update selected resume template */
	| { type: "UPDATE_TEMPLATE"; payload: { templateId: string } }

	// ===== SAVE/RESET ACTIONS =====

	/** Start saving changes to database */
	| { type: "START_SAVING" }

	/** Save operation completed successfully */
	| { type: "SAVE_SUCCESS"; payload: { resumeData: OptimizedResumeData } }

	/** Start resetting resume to original version */
	| { type: "START_RESET" }

	/** Reset operation completed successfully */
	| { type: "RESET_SUCCESS"; payload: { resumeData: OptimizedResumeData } }

	// ===== UI NAVIGATION ACTIONS =====

	/** Switch between upload and preview tabs */
	| { type: "SWITCH_TAB"; payload: { tab: "upload" | "preview" } }

	// ===== DATA UPDATE ACTIONS =====

	/** Update resume data with optimization results */
	| {
			type: "UPDATE_RESUME_DATA";
			payload: {
				optimizedText: string;
				resumeId: string;
				atsScore: number;
				suggestions: Suggestion[];
				keywords: Keyword[];
				aiResponse?: any;
			};
	  }

	// ===== ERROR HANDLING ACTIONS =====

	/** General error occurred - with enhanced context */
	| {
			type: "ERROR";
			payload: {
				message: string;
				error?: Error;
				errorType?:
					| "upload"
					| "file_processing"
					| "analysis"
					| "save"
					| "reset";
				context?: {
					operation: string;
					step?: string;
					retryable: boolean;
					userMessage: string;
					technicalDetails?: string;
				};
			};
	  }

	/** Clear current error state */
	| { type: "CLEAR_ERROR" }

	/** Retry the last failed operation */
	| { type: "RETRY_LAST_OPERATION" }

	/** Logout */
	| { type: "LOGOUT" }

	/** Set welcome state */
	| { type: "SET_WELCOME_STATE" };

/**
 * ACTION CATEGORIES EXPLANATION:
 *
 * INITIALIZATION: Set up the optimizer and check for existing data
 * UPLOAD WORKFLOW: Handle file/text upload and processing pipeline
 * UPLOADTHING: Specific actions for UploadThing cloud upload integration
 * VALIDATION: Handle resume content validation (when file is not a resume)
 * EDIT MODE: Actions for entering/exiting edit mode and content modification
 * ENHANCEMENT: Apply/unapply AI suggestions and keywords
 * TEMPLATE: Template selection and management
 * SAVE/RESET: Persist changes or revert to original
 * UI NAVIGATION: Tab switching and navigation
 * DATA UPDATE: Update state with new data from API
 * ERROR HANDLING: Manage errors and retry mechanisms
 *
 * Each action is designed to trigger specific state transitions
 * and maintain data consistency across the application.
 */

/**
 * State machine state and context container
 */
export interface CVOptimizerMachineState {
	current: CVOptimizerState;
	context: CVOptimizerContext;
}

/**
 * Upload UI states interface - ENHANCED WITH UPLOADTHING INTEGRATION
 * Centralizes all UI state calculations to eliminate component logic
 */
export interface UploadUIStates {
	/** CRITICAL: Replaces isAnyProcessing - prevents upload button from reappearing during transitions */
	shouldHideUploadButton: boolean;

	/** NEW: Enhanced version that includes UploadThing state */
	shouldReallyHideUploadButton: boolean;

	/** NEW: Whether UploadThing is actively uploading (critical for button hiding) */
	isUploadThingActive: boolean;

	/** Prevents all UI interactions during critical state transitions */
	isUIFrozen: boolean;

	/** Show upload-specific animation (uploading file) */
	showUploadingAnimation: boolean;

	/** Show processing-specific animation (processing file, AI analysis) */
	showProcessingAnimation: boolean;

	/** Show general loading animation (initializing, saving, etc.) */
	showGeneralLoadingAnimation: boolean;

	/** Combined state indicating any active processing */
	isInActiveProcessing: boolean;

	/** Whether user can interact with the UI */
	canInteractWithUI: boolean;

	/** Whether new file upload is allowed */
	allowNewUpload: boolean;

	/** Whether text input is allowed */
	allowTextInput: boolean;
}

/**
 * Enhanced upload status interface - EXTENDED
 * Provides comprehensive status information for upload operations
 */
export interface UploadStatus {
	/** Overall progress across all upload steps (0-100) */
	overallProgress: number;

	/** User-friendly description of current step */
	currentStep: string;

	/** Error message if in error state */
	errorMessage?: string;

	/** Whether the current error is retryable */
	canRetry: boolean;

	// NEW: More specific status information
	/** Whether currently in upload phase */
	isInUploadPhase: boolean;

	/** Whether currently in file processing phase */
	isInProcessingPhase: boolean;

	/** Whether currently in AI analysis phase */
	isInAnalysisPhase: boolean;

	/** Primary status message for main UI display */
	primaryMessage: string;

	/** Secondary status message for detailed feedback */
	secondaryMessage: string;

	// FIXED: Added missing properties that are used in the hook
	uploadState?: any;
	uploadActions?: any;
}

/**
 * Hook return interface for type safety
 * EXTENDED: Added UploadThing integration and enhanced upload functionality
 */
export interface UseResumeOptimizerReturn {
	// ===== CORE STATE =====
	resumeData: OptimizedResumeData | null;
	optimizedText: string;
	originalAtsScore: number | null;
	currentAtsScore: number | null;
	suggestions: Suggestion[];
	keywords: Keyword[];
	selectedTemplate: string;
	hasResume: boolean | null;
	activeTab: "upload" | "preview";

	// ===== MULTILINGUAL SECTION TITLES SUPPORT =====
	sectionTitles: Record<string, string>;
	resumeLanguage: string;

	// ===== EDITING STATE =====
	isEditing: boolean;
	tempEditedContent: string;
	tempSections: Section[];
	hasTempChanges: boolean;

	// ===== COMPUTED STATE =====
	currentDisplayContent: string;
	currentSections: Section[];

	// ===== MODIFICATION FLAGS =====
	contentModified: boolean;
	scoreModified: boolean;
	templateModified: boolean;

	// ===== UPLOAD STATE - ENHANCED WITH UPLOADTHING =====
	selectedFile: File | null;
	uploadedFileInfo: UploadedFileInfo | null;
	resumeTextContent: string;
	uploadProgress: number;
	isDragOver: boolean;
	uploadMethod: "file" | "text" | null;

	// NEW: UploadThing integration states
	isActiveUpload: boolean;
	uploadThingInProgress: boolean;
	uploadThingFiles: File[];

	// ===== VALIDATION STATE - NEW FOR 422 HANDLING =====
	validationErrors: any;
	showValidationDialog: boolean;

	// ===== LOADING STATES - SIMPLIFIED WITH CALCULATED UI STATES =====
	isLoading: boolean;
	isSaving: boolean;
	isResetting: boolean;
	isUploading: boolean;
	isProcessingFile: boolean;
	isAnalyzing: boolean;

	// ===== ENHANCED: UPLOAD UI STATES - WITH UPLOADTHING INTEGRATION =====
	uploadUIStates: UploadUIStates;

	// ===== STATE-BASED PERMISSIONS - ELIMINATES COMPLEX CONDITIONS =====
	canAccessUpload: boolean; // Replaces: complex upload tab logic
	canAccessPreview: boolean; // Replaces: isLoading || isUploading || isAnalyzing
	canEdit: boolean; // Replaces: hasData && !isLoading && !processing
	canSave: boolean; // Replaces: contentModified || scoreModified
	canReset: boolean; // Replaces: hasData && !isProcessing

	// ===== STATE TYPE CHECKS - SINGLE SOURCE OF TRUTH =====
	isInLoadingState: boolean; // Replaces: isLoading || isUploading || isProcessing
	isInProcessingState: boolean; // Replaces: isUploading || isAnalyzing || isSaving
	isInErrorState: boolean; // Replaces: uploadError || analysisError || saveError

	// ===== DIRECT STATE ACCESS =====
	currentState: CVOptimizerState; // Direct access to current state for advanced logic

	// ===== UPLOAD ACTIONS - FULLY INTEGRATED =====
	handleFileSelect: (file: File | null) => void;
	handleFileUpload: (fileInfo: UploadedFileInfo) => Promise<boolean>;
	handleTextContentChange: (content: string) => void;
	handleTextUpload: () => Promise<boolean>;
	handleDragOver: (isDragOver: boolean) => void;
	processUploadedFile: (fileInfo: UploadedFileInfo) => Promise<boolean>;
	retryLastOperation: () => void;

	// NEW: UploadThing integration actions
	handleUploadThingBegin: (files: File[]) => void;
	handleUploadThingComplete: (results: any[]) => void;
	handleUploadThingError: (error: Error) => void;
	setUploadThingActive: (isActive: boolean) => void;

	// ===== VALIDATION ACTIONS - NEW FOR 422 HANDLING =====
	clearValidationErrors: () => void;

	// ===== UPLOAD STATUS AND UTILITIES =====
	uploadStatus: UploadStatus;

	// Legacy properties for backward compatibility
	canUploadFile: boolean; // Whether file upload is allowed in current state
	canInputText: boolean; // Whether text input is allowed in current state
	isRetryable: boolean; // Whether current error state allows retry

	// ===== CORE ACTIONS =====
	setActiveTab: (tab: "upload" | "preview") => void;
	toggleEditMode: () => void;
	loadLatestResume: () => Promise<OptimizedResumeData | null>;
	saveResume: (content?: string, templateId?: string) => Promise<boolean>;
	resetResume: () => Promise<boolean>;

	// ===== EDITING ACTIONS =====
	handleContentEdit: (content: string) => void;
	handleSectionEdit: (sectionId: string, content: string) => void;
	handleApplySuggestion: (suggestionId: string, applied: boolean) => boolean;
	handleKeywordApply: (keywordId: string, applied: boolean) => boolean;
	updateResumeWithOptimizedData: (
		optimizedText: string,
		resumeId: string,
		atsScore: number,
		suggestions: Suggestion[],
		keywords: Keyword[],
		aiResponse?: any
	) => void;
	updateSelectedTemplate: (templateId: string) => boolean;

	// ===== UTILITY FUNCTIONS =====
	getAppliedKeywords: () => string[];
	hasUnsavedChanges: () => boolean;
	calculateCompletionScore: () => number;
	shouldEnableSaveButton: () => boolean;

	// ===== LEGACY SETTERS (with warnings) =====
	setOptimizedText: (text: string) => void;
	setCurrentAtsScore: (score: number) => void;
	setSuggestions: (suggestions: Suggestion[]) => void;
	setKeywords: (keywords: Keyword[]) => void;
	setContentModified: (modified: boolean) => void;
	setScoreModified: (modified: boolean) => void;
	setSelectedTemplate: (template: string) => void;
	setTemplateModified: (modified: boolean) => void;
	setSectionTitles: (titles: Record<string, string>) => void;
	setResumeLanguage: (language: string) => void;

	// ===== DEBUG/DEVELOPMENT HELPERS =====
	debug: {
		currentState: CVOptimizerState;
		context: CVOptimizerContext;
		isValidTransition: (to: CVOptimizerState) => boolean;
		stateHistory: CVOptimizerState[];
		uploadStatus: UploadStatus;
		uploadUIStates: UploadUIStates;
		canRetry: boolean;
		lastOperation: string | null;
		retryCount: number;

		uploadThingStatus: any;
		uploadThingValidation: any;
		shouldPreventUpload: boolean;
		uploadThingRetryCount: number;
		validationState: {
			hasValidationErrors: boolean;
			validationErrorsCount: number;
			showDialog: boolean;
		};
		errorState: {
			hasError: boolean;
			errorMessage?: string;
			errorType?: string;
			isRetryable: boolean;
			lastError?: string;
		};
		dispatch: any;
		actionHistory: any[];
		simulateAction: (actionType: string, payload?: any) => void;
		simulateActions: {
			selectFile: () => void;
			startUpload: () => void;
			completeUpload: () => void;
			startProcessing: () => void;
			completeProcessing: () => void;
			startAnalysis: () => void;
			completeAnalysis: () => void;
			simulateError: () => void;
			resetToInitial: () => void;
			enterEditMode: () => void;
			exitEditMode: () => void;
		};
		validateCurrentState: () => any;
		getNextValidStates: () => any[];
	};
}

/**
 * Transition validation function type
 */
export type TransitionValidator = (
	from: CVOptimizerState,
	to: CVOptimizerState
) => boolean;

/**
 * State reducer function type
 */
export type CVOptimizerReducer = (
	state: CVOptimizerMachineState,
	action: CVOptimizerAction
) => CVOptimizerMachineState;

/**
 * Upload section props interface - SIMPLIFIED
 * Now uses grouped props from the unified state machine
 * This replaces the complex 15+ individual props interface
 */
export interface UploadSectionProps {
	/** Upload state from unified hook - replaces 8+ individual state props */
	uploadState: {
		isUploading: boolean;
		isProcessingFile: boolean;
		isAnalyzing: boolean;
		selectedFile: File | null;
		resumeTextContent: string;
		uploadProgress: number;
		isDragOver: boolean;
		canUploadFile: boolean;
		canInputText: boolean;
		// NEW: UploadThing integration states
		isActiveUpload: boolean;
		uploadThingInProgress: boolean;
		uploadThingFiles: File[];
		validationErrors: any;
		uploadMethod: "file" | "text" | null;
	};

	/** Upload actions from unified hook - replaces multiple callback props */
	uploadActions: {
		onFileSelect: (file: File | null) => void;
		onFileUpload: (fileInfo: UploadedFileInfo) => Promise<boolean>;
		onTextContentChange: (content: string) => void;
		onTextUpload: () => Promise<boolean>;
		onDragOver: (isDragOver: boolean) => void;
		// NEW: UploadThing integration actions
		onUploadThingBegin: (files: File[]) => void;
		onUploadThingComplete: (results: any[]) => void;
		onUploadThingError: (error: Error) => void;
		onSetUploadThingActive: (isActive: boolean) => void;
		clearValidationErrors: () => void;
	};

	/** Upload status from unified hook - replaces progress tracking */
	uploadStatus: UploadStatus;

	/** Upload UI states - ENHANCED with UploadThing integration */
	uploadUIStates: UploadUIStates;

	/** Navigation callback - optional */
	onTabSwitch?: (tab: "upload" | "preview") => void;

	/** Global loading states - simplified */
	isInLoadingState: boolean;
	isInErrorState: boolean;
}

/**
 * Component state interface for components that need minimal state access
 * Provides a simplified view of the state machine for basic components
 */
export interface ComponentState {
	currentState: CVOptimizerState;
	isLoading: boolean;
	isProcessing: boolean;
	hasError: boolean;
	canInteract: boolean;
}

/**
 * Error context interface for enhanced error handling
 */
export interface ErrorContext {
	operation: "upload" | "file_processing" | "analysis" | "save" | "reset";
	step?: string;
	retryable: boolean;
	userMessage: string;
	technicalDetails?: string;
	timestamp?: Date;
	attemptCount?: number;
}

/**
 * State transition event interface for logging and debugging
 */
export interface StateTransitionEvent {
	from: CVOptimizerState;
	to: CVOptimizerState;
	action: CVOptimizerAction;
	timestamp: Date;
	success: boolean;
	error?: string;
}

/**
 * Performance metrics interface for monitoring state machine operations
 */
export interface PerformanceMetrics {
	stateTransitionCount: number;
	averageTransitionTime: number;
	errorCount: number;
	retryCount: number;
	lastOperationDuration: number;
	uploadMetrics?: {
		totalUploads: number;
		successfulUploads: number;
		averageUploadTime: number;
		averageFileSize: number;
	};
}
