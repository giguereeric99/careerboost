/**
 * Resume Optimizer Constants - EXTENDED VERSION WITH UPLOADTHING INTEGRATION
 *
 * This module contains all constants used by the resume optimizer state machine.
 * It defines valid state transitions, default values, configuration settings,
 * and UI state mappings for the CareerBoost resume optimization system.
 * EXTENDED: Now includes UploadThing integration support, enhanced error handling, and UI state constants
 */

import {
	CVOptimizerState,
	CVOptimizerContext,
} from "@/types/resumeOptimizerTypes";

// ===== STATE MACHINE TRANSITIONS - EXTENDED =====

/**
 * Valid state transitions for the resume optimizer state machine
 * Each state can only transition to specific allowed states
 * This ensures proper workflow and prevents invalid state combinations
 * EXTENDED: Added upload workflow transitions
 */
export const VALID_STATE_TRANSITIONS: Record<
	CVOptimizerState,
	CVOptimizerState[]
> = {
	// ===== INITIALIZATION STATES =====
	[CVOptimizerState.INITIALIZING]: [
		CVOptimizerState.CHECKING_EXISTING_RESUME,
		CVOptimizerState.WELCOME_NEW_USER,
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.ANALYSIS_ERROR,
	],

	[CVOptimizerState.CHECKING_EXISTING_RESUME]: [
		CVOptimizerState.EXISTING_RESUME_LOADED,
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.ANALYSIS_ERROR,
	],

	// ===== USER ONBOARDING STATES =====
	[CVOptimizerState.WELCOME_NEW_USER]: [
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.UPLOADING_FILE,
		CVOptimizerState.CHECKING_EXISTING_RESUME, // Allow checking again
	],

	// ===== EXISTING RESUME LOADED STATE =====
	[CVOptimizerState.EXISTING_RESUME_LOADED]: [
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.EDIT_MODE,
		CVOptimizerState.AWAITING_UPLOAD, // Allow new upload over existing
		CVOptimizerState.UPLOADING_FILE,
		CVOptimizerState.ANALYZING_CONTENT,
		CVOptimizerState.SAVING_CHANGES,
		CVOptimizerState.RESETTING_CHANGES,
		CVOptimizerState.SAVE_ERROR,
		CVOptimizerState.RESET_ERROR,
	],

	// ===== UPLOAD WORKFLOW STATES =====
	[CVOptimizerState.AWAITING_UPLOAD]: [
		CVOptimizerState.UPLOADING_FILE,
		CVOptimizerState.FILE_UPLOAD_COMPLETE,
		CVOptimizerState.PROCESSING_FILE, // Direct text processing
		CVOptimizerState.ANALYZING_CONTENT, // Skip upload for text input
		CVOptimizerState.UPLOAD_ERROR,
		CVOptimizerState.EXISTING_RESUME_LOADED, // If user loads existing resume
	],

	[CVOptimizerState.UPLOADING_FILE]: [
		CVOptimizerState.FILE_UPLOAD_COMPLETE,
		CVOptimizerState.UPLOAD_ERROR,
		CVOptimizerState.AWAITING_UPLOAD, // Allow going back to upload
	],

	[CVOptimizerState.FILE_UPLOAD_COMPLETE]: [
		CVOptimizerState.PROCESSING_FILE,
		CVOptimizerState.ANALYZING_CONTENT, // FIXED: Direct analysis if file processing is skipped
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Direct completion for simple files
		CVOptimizerState.FILE_PROCESSING_ERROR,
		CVOptimizerState.AWAITING_UPLOAD, // Allow re-upload
	],

	// FIXED: Enhanced processing file transitions
	[CVOptimizerState.PROCESSING_FILE]: [
		CVOptimizerState.ANALYZING_CONTENT, // Standard flow: processing -> analysis
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Direct completion when API handles everything
		CVOptimizerState.FILE_PROCESSING_ERROR,
		CVOptimizerState.AWAITING_UPLOAD, // Allow re-upload on processing issues
	],

	// FIXED: Enhanced analyzing content transitions
	[CVOptimizerState.ANALYZING_CONTENT]: [
		CVOptimizerState.OPTIMIZATION_COMPLETE,
		CVOptimizerState.PROCESSING_FILE, // FIXED: Allow going back if analysis needs more processing
		CVOptimizerState.ANALYSIS_ERROR,
		CVOptimizerState.AWAITING_UPLOAD, // Allow re-upload during analysis
	],

	[CVOptimizerState.OPTIMIZATION_COMPLETE]: [
		CVOptimizerState.OPTIMIZATION_COMPLETE, //Debug remove eventually
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.EDIT_MODE,
		CVOptimizerState.AWAITING_UPLOAD, // Allow new upload after optimization
		CVOptimizerState.UPLOADING_FILE, // Allow new upload
		CVOptimizerState.ANALYZING_CONTENT, // Allow re-analysis
		CVOptimizerState.PROCESSING_FILE, // FIXED: Allow going back to processing
	],

	// ===== MAIN APPLICATION STATES =====
	[CVOptimizerState.PREVIEW_MODE]: [
		CVOptimizerState.EDIT_MODE,
		CVOptimizerState.AWAITING_UPLOAD, // Allow new upload from preview
		CVOptimizerState.UPLOADING_FILE,
		CVOptimizerState.ANALYZING_CONTENT,
		CVOptimizerState.PROCESSING_FILE, // FIXED: Allow going back to processing
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Allow returning to optimization state
		CVOptimizerState.RESETTING_CHANGES,
		CVOptimizerState.RESET_ERROR,
	],

	[CVOptimizerState.EDIT_MODE]: [
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.SAVING_CHANGES,
		CVOptimizerState.RESETTING_CHANGES,
		CVOptimizerState.AWAITING_UPLOAD, // Allow new upload from edit mode
		CVOptimizerState.UPLOADING_FILE,
		CVOptimizerState.PROCESSING_FILE, // FIXED: Allow going back to processing
		CVOptimizerState.ANALYZING_CONTENT, // FIXED: Allow re-analysis from edit mode
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Allow returning to optimization state
		CVOptimizerState.SAVE_ERROR,
		CVOptimizerState.RESET_ERROR,
	],

	// ===== ACTION STATES =====
	[CVOptimizerState.SAVING_CHANGES]: [
		CVOptimizerState.EDIT_MODE,
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.SAVE_ERROR,
	],

	[CVOptimizerState.RESETTING_CHANGES]: [
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.EDIT_MODE,
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Reset can go back to optimization state
		CVOptimizerState.RESET_ERROR,
	],

	// ===== ERROR STATES - ENHANCED WITH RECOVERY OPTIONS =====
	[CVOptimizerState.UPLOAD_ERROR]: [
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.UPLOADING_FILE, // Allow retry
		CVOptimizerState.WELCOME_NEW_USER,
		CVOptimizerState.EXISTING_RESUME_LOADED, // If user has existing resume
		CVOptimizerState.PROCESSING_FILE, // FIXED: Recovery from upload error to processing
	],

	[CVOptimizerState.FILE_PROCESSING_ERROR]: [
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.UPLOADING_FILE, // Allow re-upload
		CVOptimizerState.PROCESSING_FILE, // Allow retry processing
		CVOptimizerState.ANALYZING_CONTENT, // FIXED: Recovery to analysis
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Recovery to completion
		CVOptimizerState.WELCOME_NEW_USER,
	],

	[CVOptimizerState.ANALYSIS_ERROR]: [
		CVOptimizerState.AWAITING_UPLOAD,
		CVOptimizerState.UPLOADING_FILE,
		CVOptimizerState.ANALYZING_CONTENT, // Allow retry analysis
		CVOptimizerState.PROCESSING_FILE, // Go back to processing
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Recovery to completion
		CVOptimizerState.WELCOME_NEW_USER,
		CVOptimizerState.CHECKING_EXISTING_RESUME,
	],

	[CVOptimizerState.SAVE_ERROR]: [
		CVOptimizerState.EDIT_MODE,
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.SAVING_CHANGES, // Allow retry
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Recovery to optimization state
	],

	[CVOptimizerState.RESET_ERROR]: [
		CVOptimizerState.EDIT_MODE,
		CVOptimizerState.PREVIEW_MODE,
		CVOptimizerState.RESETTING_CHANGES, // Allow retry
		CVOptimizerState.OPTIMIZATION_COMPLETE, // FIXED: Recovery to optimization state
	],
};

// ===== DEFAULT VALUES AND CONFIGURATION - EXTENDED WITH UPLOADTHING =====

/**
 * Default context values for the state machine
 * Provides safe defaults for all context properties
 * EXTENDED: Added upload-related defaults + UploadThing integration
 */
export const DEFAULT_CONTEXT: CVOptimizerContext = {
	// User & Resume Data
	userId: null,
	resumeData: null,

	// Content management
	originalText: "",
	optimizedText: "",
	tempEditedContent: "",

	// Scores & enhancements
	originalAtsScore: null,
	currentAtsScore: null,
	suggestions: [],
	keywords: [],

	// UI states
	activeTab: "upload",
	selectedTemplate: "basic",

	// Section management
	tempSections: [],
	currentSections: [],

	// Modification tracking
	contentModified: false,
	scoreModified: false,
	templateModified: false,
	hasTempChanges: false,

	// EXTENDED: Upload-related defaults
	selectedFile: null,
	uploadedFileInfo: null,
	resumeTextContent: "",
	uploadProgress: 0,
	isDragOver: false,
	uploadMethod: null,

	// NEW: UploadThing integration defaults
	isActiveUpload: false,
	uploadThingInProgress: false,
	uploadThingFiles: [],

	// Multilingual support
	sectionTitles: {},
	resumeLanguage: "English",

	// Computed flags
	hasExistingResume: null,
	hasUnsavedChanges: false,

	// Error handling - EXTENDED
	errorMessage: undefined,
	lastError: undefined,
	errorContext: undefined,
};

/**
 * Default ATS score when no score is available
 * Used as baseline for score calculations
 */
export const DEFAULT_ATS_SCORE = 65;

/**
 * Point impact values for suggestions and keywords
 * Used in ATS score calculations
 */
export const DEFAULT_SUGGESTION_POINT_IMPACT = 2;
export const DEFAULT_KEYWORD_POINT_IMPACT = 1;

/**
 * ATS score boundaries
 * Ensures scores stay within valid range
 */
export const MIN_ATS_SCORE = 0;
export const MAX_ATS_SCORE = 100;

// ===== UPLOAD CONFIGURATION - NEW =====

/**
 * File upload configuration and limits
 * Controls what files can be uploaded and processing limits
 */
export const UPLOAD_CONFIG = {
	// Supported file types for resume upload
	SUPPORTED_FILE_TYPES: [
		"application/pdf",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"text/plain",
		"text/rtf",
		"application/rtf",
	] as const,

	// File size limits (in bytes)
	MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
	MIN_FILE_SIZE: 100, // 100 bytes

	// Text content limits
	MIN_TEXT_LENGTH: 50,
	MAX_TEXT_LENGTH: 50000,

	// Upload progress configuration
	PROGRESS_UPDATE_INTERVAL: 100, // milliseconds
	SIMULATED_UPLOAD_DURATION: 2000, // milliseconds for progress simulation

	// File type display names
	FILE_TYPE_NAMES: {
		"application/pdf": "PDF",
		"application/msword": "Word Document",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			"Word Document",
		"text/plain": "Text File",
		"text/rtf": "RTF Document",
		"application/rtf": "RTF Document",
	} as const,
} as const;

// ===== NEW: UPLOADTHING SPECIFIC CONSTANTS =====

/**
 * UploadThing processing states
 * Tracks the different phases of UploadThing operations
 */
export const UPLOADTHING_PROCESSING_STATES = {
	BEFORE_UPLOAD: "before_upload",
	UPLOADING: "uploading",
	UPLOAD_COMPLETE: "upload_complete",
	PROCESSING: "processing",
	ERROR: "error",
} as const;

/**
 * Conditions where UploadThing button should be disabled/hidden
 * Critical for preventing multiple uploads and UI conflicts
 */
export const UPLOADTHING_BUTTON_DISABLED_CONDITIONS = {
	STATE_MACHINE_PROCESSING: "state_machine_processing",
	UPLOADTHING_ACTIVE: "uploadthing_active",
	UI_FROZEN: "ui_frozen",
	FILE_ALREADY_SELECTED: "file_selected",
} as const;

/**
 * Combined conditions for hiding upload button
 * This is the master logic that determines button visibility
 */
export const SHOULD_HIDE_UPLOAD_BUTTON_CONDITIONS = {
	STATE_MACHINE_BUSY: "state_machine_processing",
	UPLOADTHING_ACTIVE: "uploadthing_active",
	UI_FROZEN: "ui_frozen",
	FILE_SELECTED: "file_already_selected",
} as const;

// ===== UI STATE MAPPINGS - EXTENDED WITH UPLOADTHING =====

/**
 * States where the application is loading or processing
 * Used to show loading indicators and disable interactions
 * EXTENDED: Added upload-specific loading states
 */
export const LOADING_STATES: CVOptimizerState[] = [
	CVOptimizerState.CHECKING_EXISTING_RESUME,
	CVOptimizerState.UPLOADING_FILE,
	CVOptimizerState.PROCESSING_FILE, // NEW
	CVOptimizerState.ANALYZING_CONTENT,
];

/**
 * States where processing is actively happening
 * Used for more specific loading indicators
 * EXTENDED: More granular processing states
 */
export const PROCESSING_STATES: CVOptimizerState[] = [
	CVOptimizerState.UPLOADING_FILE,
	CVOptimizerState.PROCESSING_FILE, // NEW
	CVOptimizerState.ANALYZING_CONTENT,
	CVOptimizerState.SAVING_CHANGES,
	CVOptimizerState.RESETTING_CHANGES,
];

/**
 * States where upload is actively happening
 * Used for upload-specific UI indicators
 */
export const UPLOAD_STATES: CVOptimizerState[] = [
	CVOptimizerState.UPLOADING_FILE,
];

/**
 * States where file processing is happening
 * Used for file processing indicators
 */
export const FILE_PROCESSING_STATES: CVOptimizerState[] = [
	CVOptimizerState.PROCESSING_FILE,
];

/**
 * States where AI analysis is happening
 * Used for analysis-specific indicators
 */
export const ANALYSIS_STATES: CVOptimizerState[] = [
	CVOptimizerState.ANALYZING_CONTENT,
];

// ===== ENHANCED: UI STATE MAPPINGS FOR UPLOAD COMPONENTS WITH UPLOADTHING =====

/**
 * States where the upload button should be hidden immediately
 * This prevents users from uploading multiple files during processing
 * CRITICAL: Enhanced with UploadThing integration
 */
export const UPLOAD_BUTTON_HIDDEN_STATES: CVOptimizerState[] = [
	CVOptimizerState.UPLOADING_FILE,
	CVOptimizerState.FILE_UPLOAD_COMPLETE, // CRITICAL: This state prevents the gap
	CVOptimizerState.PROCESSING_FILE,
	CVOptimizerState.ANALYZING_CONTENT,
	CVOptimizerState.SAVING_CHANGES,
	CVOptimizerState.RESETTING_CHANGES,
];

/**
 * States where the entire UI should be frozen (no interactions allowed)
 * Used to prevent user actions during critical transitions
 * ENHANCED: Better coverage of critical states
 */
export const UI_FROZEN_STATES: CVOptimizerState[] = [
	CVOptimizerState.UPLOADING_FILE,
	CVOptimizerState.FILE_UPLOAD_COMPLETE, // CRITICAL: Prevents interaction during gap
	CVOptimizerState.PROCESSING_FILE,
	CVOptimizerState.ANALYZING_CONTENT,
	CVOptimizerState.SAVING_CHANGES,
];

/**
 * States where upload loading animation should be shown
 * Provides specific feedback for upload-related operations
 */
export const UPLOAD_ANIMATION_STATES: CVOptimizerState[] = [
	CVOptimizerState.UPLOADING_FILE,
];

/**
 * States where processing animation should be shown
 * Provides specific feedback for processing operations
 */
export const PROCESSING_ANIMATION_STATES: CVOptimizerState[] = [
	CVOptimizerState.PROCESSING_FILE,
	CVOptimizerState.ANALYZING_CONTENT,
];

/**
 * States where general loading animation should be shown
 * Used for non-specific loading indicators
 */
export const GENERAL_LOADING_ANIMATION_STATES: CVOptimizerState[] = [
	CVOptimizerState.CHECKING_EXISTING_RESUME,
	CVOptimizerState.SAVING_CHANGES,
	CVOptimizerState.RESETTING_CHANGES,
];

// ===== EXISTING UI STATE MAPPINGS (PRESERVED) =====

/**
 * States where edit mode is allowed
 * User can modify content in these states
 */
export const EDIT_ALLOWED_STATES: CVOptimizerState[] = [
	CVOptimizerState.EDIT_MODE,
];

/**
 * States where save operations are allowed
 * User can save changes in these states
 */
export const SAVE_ALLOWED_STATES: CVOptimizerState[] = [
	CVOptimizerState.EDIT_MODE,
];

/**
 * States where reset operations are allowed
 * User can reset to original content in these states
 */
export const RESET_ALLOWED_STATES: CVOptimizerState[] = [
	CVOptimizerState.PREVIEW_MODE,
	CVOptimizerState.EDIT_MODE,
];

/**
 * States where the preview tab should be accessible
 * User can access the preview tab in these states
 * EXTENDED: Added new completion states
 */
export const PREVIEW_TAB_STATES: CVOptimizerState[] = [
	CVOptimizerState.EXISTING_RESUME_LOADED,
	CVOptimizerState.OPTIMIZATION_COMPLETE,
	CVOptimizerState.PREVIEW_MODE,
	CVOptimizerState.EDIT_MODE,
	CVOptimizerState.SAVING_CHANGES,
	CVOptimizerState.RESETTING_CHANGES,
	CVOptimizerState.SAVE_ERROR,
	CVOptimizerState.RESET_ERROR,
];

/**
 * States where the upload tab should be accessible
 * User can access the upload tab in these states
 * EXTENDED: Added new upload workflow states
 */
export const UPLOAD_TAB_STATES: CVOptimizerState[] = [
	CVOptimizerState.INITIALIZING,
	CVOptimizerState.WELCOME_NEW_USER,
	CVOptimizerState.AWAITING_UPLOAD,
	CVOptimizerState.UPLOADING_FILE,
	CVOptimizerState.FILE_UPLOAD_COMPLETE, // NEW
	CVOptimizerState.PROCESSING_FILE, // NEW
	CVOptimizerState.ANALYZING_CONTENT,
	CVOptimizerState.OPTIMIZATION_COMPLETE,
	CVOptimizerState.PREVIEW_MODE,
	CVOptimizerState.EDIT_MODE,
	CVOptimizerState.UPLOAD_ERROR,
	CVOptimizerState.FILE_PROCESSING_ERROR, // NEW
	CVOptimizerState.ANALYSIS_ERROR,
];

// ===== TOAST NOTIFICATIONS CONFIGURATION - EXTENDED =====
/**
 * Toast configuration interface
 */
interface ToastConfiguration {
	type: "info" | "success" | "error" | "message" | "loading";
	title: string;
	description?: string;
	duration?: number;
	condition?: "unauthenticated" | "authenticated_no_resume" | boolean;
}

/**
 * Toast notification configurations for different states
 * Defines what notifications to show for each state transition
 * EXTENDED: Added upload-specific notifications + UploadThing integration
 */
export const TOAST_CONFIGURATIONS: Partial<
	Record<CVOptimizerState, ToastConfiguration>
> = {
	[CVOptimizerState.WELCOME_NEW_USER]: {
		type: "info",
		title: "Welcome to CareerBoost!",
		description: "You need to authenticate first.",
		duration: 5000,
		condition: "unauthenticated", // NEW: Conditional toast
	},

	// ENHANCED: Welcome back for users with existing resume
	[CVOptimizerState.EXISTING_RESUME_LOADED]: {
		type: "success",
		title: "Welcome back!",
		description: "Your resume has been loaded successfully.",
		duration: 5000,
	},

	// NEW: Get started toast for authenticated users without resume
	[CVOptimizerState.AWAITING_UPLOAD]: {
		type: "info",
		title: "Get started!",
		description:
			"Upload your resume to get started with AI-powered optimization.",
		duration: 5000,
		condition: "authenticated_no_resume", // NEW: Conditional toast
	},

	// FIXED: Sequential workflow for toasts - each step transitions smoothly to the next
	[CVOptimizerState.UPLOADING_FILE]: {
		type: "loading",
		title: "Uploading file...",
		description: "Your file is being uploaded to our servers.",
	},

	[CVOptimizerState.FILE_UPLOAD_COMPLETE]: {
		type: "success",
		title: "Upload complete!",
		description: "Starting file processing...",
		duration: 2000, // Shorter duration to transition quickly
	},

	[CVOptimizerState.PROCESSING_FILE]: {
		type: "loading",
		title: "Processing file...",
		description: "Extracting and analyzing content from your resume.",
	},

	[CVOptimizerState.ANALYZING_CONTENT]: {
		type: "loading",
		title: "AI analysis in progress...",
		description: "Our AI is optimizing your resume with smart suggestions.",
	},

	// FIXED: Final success toast that properly concludes the workflow
	[CVOptimizerState.OPTIMIZATION_COMPLETE]: {
		type: "success",
		title: "🎉 Optimization completed!",
		description: "Your resume has been successfully analyzed and optimized.",
		duration: 4000,
	},

	[CVOptimizerState.EDIT_MODE]: {
		type: "message",
		title: "📝 Entering edit mode...",
		duration: 2000,
	},

	[CVOptimizerState.SAVING_CHANGES]: {
		type: "loading",
		title: "Saving all changes...",
		description: "Saving resume content, applied keywords, and suggestions...",
	},

	[CVOptimizerState.SAVE_SUCCESS]: {
		type: "success",
		title: "All changes saved successfully!",
		description: "Resume content, keywords, and suggestions have been updated.",
		duration: 4000,
	},

	[CVOptimizerState.PREVIEW_MODE]: {
		type: "message",
		title: "👁️ Exiting to preview mode...",
		duration: 2000,
	},

	// EXTENDED: Upload error notifications
	[CVOptimizerState.UPLOAD_ERROR]: {
		type: "error",
		title: "Upload failed",
		description: "There was an error uploading your file. Please try again.",
		duration: 8000,
	},

	[CVOptimizerState.FILE_PROCESSING_ERROR]: {
		type: "error",
		title: "Processing failed",
		description:
			"Unable to process the file. Please check the format and try again.",
		duration: 8000,
	},

	[CVOptimizerState.ANALYSIS_ERROR]: {
		type: "error",
		title: "Analysis failed",
		description: "There was an error analyzing your resume. Please try again.",
		duration: 8000,
	},

	[CVOptimizerState.SAVE_ERROR]: {
		type: "error",
		title: "Save failed",
		description: "There was an error saving your changes. Please try again.",
		duration: 8000,
	},

	[CVOptimizerState.RESET_ERROR]: {
		type: "error",
		title: "Reset failed",
		description: "There was an error resetting your resume. Please try again.",
		duration: 8000,
	},
};

// ===== FEATURE FLAGS AND LIMITS =====

/**
 * Feature availability by subscription plan
 * Controls what features are available to different user tiers
 * EXTENDED: Added upload-specific limits per plan
 */
export const PLAN_FEATURES = {
	basic: {
		templatesAvailable: 1,
		cvOptimizationsPerMonth: 1,
		jobSearchEnabled: false,
		aiInterviewEnabled: false,
		prioritySupport: false,
		maxFileSizeMB: 5, // NEW: File size limit per plan
		allowedFileTypes: ["application/pdf", "text/plain"], // NEW: Restricted file types
	},
	pro: {
		templatesAvailable: 6,
		cvOptimizationsPerMonth: -1, // Unlimited
		jobSearchEnabled: true,
		aiInterviewEnabled: false,
		prioritySupport: true,
		maxFileSizeMB: 10, // NEW: Higher file size limit
		allowedFileTypes: UPLOAD_CONFIG.SUPPORTED_FILE_TYPES, // NEW: All supported types
	},
	expert: {
		templatesAvailable: 6,
		cvOptimizationsPerMonth: -1, // Unlimited
		jobSearchEnabled: true,
		aiInterviewEnabled: true,
		prioritySupport: true,
		maxFileSizeMB: 15, // NEW: Highest file size limit
		allowedFileTypes: UPLOAD_CONFIG.SUPPORTED_FILE_TYPES, // NEW: All supported types
	},
} as const;

/**
 * Timing configurations for various operations
 * Controls debouncing, timeouts, and delays
 * EXTENDED: Added upload-specific timing + UploadThing integration
 */
export const TIMING_CONFIG = {
	// Debounce delay for content updates (milliseconds)
	CONTENT_UPDATE_DEBOUNCE: 300,

	// Auto-save delay after content changes (milliseconds)
	AUTO_SAVE_DELAY: 5000,

	// EXTENDED: Upload-specific timing
	UPLOAD_TIMEOUT: 300000, // 30 seconds timeout for uploads
	FILE_PROCESSING_TIMEOUT: 150000, // 15 seconds for file processing
	ANALYSIS_TIMEOUT: 600000, // 60 seconds for AI analysis

	// NEW: UploadThing specific timeouts
	UPLOADTHING_TIMEOUTS: {
		UPLOAD_START_TIMEOUT: 500000, // 5s for upload to start
		UPLOAD_COMPLETE_TIMEOUT: 3000000, // 30s for upload to complete
		PROCESSING_TIMEOUT: 150000, // 15s for file processing
		STATE_SYNC_TIMEOUT: 200000, // 2s for state synchronization
	},

	// Toast display duration for different types (milliseconds)
	TOAST_DURATION: {
		info: 5000,
		success: 4000,
		error: 8000,
		warning: 6000,
		loading: -1, // Loading toasts don't auto-dismiss
	},

	// Loading state minimum display time to prevent flickering
	MIN_LOADING_TIME: 500,

	// Progress update intervals
	PROGRESS_UPDATE_INTERVAL: 100,
} as const;

/**
 * Validation rules for content and operations
 * Defines minimum requirements and limits
 * EXTENDED: Added upload validation rules
 */
export const VALIDATION_RULES = {
	// Minimum content length for saving
	MIN_CONTENT_LENGTH: 50,

	// Maximum content length to prevent performance issues
	MAX_CONTENT_LENGTH: 50000,

	// Maximum number of suggestions to display
	MAX_SUGGESTIONS_DISPLAY: 20,

	// Maximum number of keywords to display
	MAX_KEYWORDS_DISPLAY: 30,

	// Required sections for a complete resume
	REQUIRED_SECTIONS: ["resume-header", "resume-summary"],

	// EXTENDED: Upload validation rules
	UPLOAD_VALIDATION: {
		// File name validation
		MAX_FILENAME_LENGTH: 255,
		FORBIDDEN_FILENAME_CHARS: /[<>:"/\\|?*]/g,

		// Content validation after extraction
		MIN_EXTRACTED_CONTENT_LENGTH: 50,
		MAX_EXTRACTED_CONTENT_LENGTH: 100000,

		// File structure validation
		MAX_PAGES_PDF: 10, // Maximum pages for PDF files
		MAX_WORDS: 5000, // Maximum word count
	},
} as const;

/**
 * Error messages for different scenarios
 * Centralized error message definitions
 * EXTENDED: Added upload-specific error messages
 */
export const ERROR_MESSAGES = {
	// General errors
	INVALID_TRANSITION: "Invalid state transition attempted",
	MISSING_USER_ID: "User ID is required for this operation",
	CONTENT_TOO_SHORT: "Resume content must be at least 50 characters long",
	CONTENT_TOO_LONG: "Resume content is too long. Please reduce the length.",
	SAVE_FAILED: "Failed to save changes. Please try again.",
	RESET_FAILED: "Failed to reset resume. Please try again.",
	NETWORK_ERROR: "Network error. Please check your connection and try again.",
	UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",

	// EXTENDED: Upload-specific error messages
	UPLOAD_ERRORS: {
		FILE_TOO_LARGE: "File is too large. Maximum size allowed is {maxSize}MB.",
		FILE_TOO_SMALL: "File is too small. Minimum size is {minSize} bytes.",
		INVALID_FILE_TYPE:
			"Invalid file type. Supported formats: {supportedTypes}.",
		UPLOAD_TIMEOUT:
			"Upload timed out. Please check your connection and try again.",
		UPLOAD_NETWORK_ERROR: "Network error during upload. Please try again.",
		FILE_CORRUPTED:
			"File appears to be corrupted. Please try a different file.",
		FILENAME_TOO_LONG:
			"Filename is too long. Please rename the file and try again.",
		INVALID_FILENAME:
			"Invalid filename. Please remove special characters and try again.",
		UPLOADTHING_ERROR: "UploadThing service error. Please try again later.",
		MULTIPLE_UPLOADS:
			"Multiple uploads detected. Please wait for current upload to complete.",
	},

	PROCESSING_ERRORS: {
		EXTRACTION_FAILED:
			"Failed to extract text from the file. Please try a different format.",
		CONTENT_TOO_SHORT:
			"Extracted content is too short. Please provide a longer resume.",
		CONTENT_TOO_LONG:
			"Extracted content is too long. Please provide a shorter resume.",
		UNSUPPORTED_FORMAT: "File format is not supported or file is corrupted.",
		PROCESSING_TIMEOUT: "File processing timed out. Please try a smaller file.",
	},

	ANALYSIS_ERRORS: {
		AI_SERVICE_UNAVAILABLE:
			"AI analysis service is temporarily unavailable. Please try again later.",
		ANALYSIS_TIMEOUT: "Analysis timed out. Please try again.",
		INVALID_CONTENT:
			"Content format is not suitable for analysis. Please check your resume.",
		QUOTA_EXCEEDED:
			"You have exceeded your monthly analysis quota. Please upgrade your plan.",
	},
} as const;

/**
 * Success messages for different operations
 * Centralized success message definitions
 * EXTENDED: Added upload-specific success messages + UploadThing integration
 */
export const SUCCESS_MESSAGES = {
	// General success messages
	SAVE_SUCCESS: "All changes saved successfully!",
	RESET_SUCCESS: "Resume reset to original version",
	TEMPLATE_CHANGED: "Template updated successfully",

	// EXTENDED: Upload success messages with UploadThing integration
	UPLOAD_SUCCESS: "File uploaded successfully",
	FILE_PROCESSED: "File processed successfully",
	ANALYSIS_SUCCESS: "Resume optimization completed successfully!",
	TEXT_UPLOAD_SUCCESS: "Resume content uploaded successfully",
	KEYWORD_APPLIED: "Keyword applied successfully",
	SUGGESTION_APPLIED: "Suggestion applied successfully",

	// NEW: UploadThing specific messages
	UPLOAD_MESSAGES: {
		UPLOADTHING_BEGIN: "Starting file upload...",
		UPLOADTHING_PROGRESS: "Uploading file...",
		UPLOADTHING_COMPLETE: "File uploaded successfully",
		PROCESSING_START: "Processing uploaded file...",
		ANALYSIS_START: "AI analyzing your resume...",
		STATE_SYNCHRONIZED: "Upload state synchronized successfully",
	},
} as const;

/**
 * Debug configuration
 * Controls debug logging and development features
 * EXTENDED: Added upload-specific debug options + UploadThing integration
 */
export const DEBUG_CONFIG = {
	// Enable detailed state transition logging
	LOG_STATE_TRANSITIONS: process.env.NODE_ENV === "development",

	// Enable performance monitoring
	PERFORMANCE_MONITORING: process.env.NODE_ENV === "development",

	// Enable debug panel in UI
	SHOW_DEBUG_PANEL: process.env.NODE_ENV === "development",

	// Log all actions and state changes
	VERBOSE_LOGGING: false,

	// EXTENDED: Upload-specific debug options
	LOG_UPLOAD_PROGRESS: process.env.NODE_ENV === "development",
	LOG_FILE_PROCESSING: process.env.NODE_ENV === "development",
	SIMULATE_UPLOAD_DELAY: process.env.NODE_ENV === "development",
	MOCK_UPLOAD_ERRORS: false, // For testing error scenarios

	// NEW: UploadThing specific debug options
	LOG_UPLOADTHING_EVENTS: process.env.NODE_ENV === "development",
	LOG_STATE_SYNCHRONIZATION: process.env.NODE_ENV === "development",
	UPLOADTHING_VERBOSE_LOGGING: false,
	TRACK_UPLOAD_PERFORMANCE: process.env.NODE_ENV === "development",
} as const;

// ===== RETRY CONFIGURATION - ENHANCED WITH UPLOADTHING =====

/**
 * Configuration for retry mechanisms
 * Defines how many times and with what delays operations should be retried
 * ENHANCED: Added UploadThing specific retry logic
 */
export const RETRY_CONFIG = {
	// Maximum retry attempts for different operations
	MAX_RETRIES: {
		UPLOAD: 3,
		FILE_PROCESSING: 2,
		ANALYSIS: 2,
		SAVE: 3,
		RESET: 2,
		UPLOADTHING_UPLOAD: 2, // NEW: UploadThing specific retries
		UPLOADTHING_PROCESSING: 1, // NEW: UploadThing processing retries
	},

	// Retry delays (in milliseconds) - exponential backoff
	RETRY_DELAYS: {
		UPLOAD: [1000, 2000, 4000], // 1s, 2s, 4s
		FILE_PROCESSING: [500, 1000], // 0.5s, 1s
		ANALYSIS: [2000, 5000], // 2s, 5s
		SAVE: [500, 1000, 2000], // 0.5s, 1s, 2s
		RESET: [500, 1000], // 0.5s, 1s
		UPLOADTHING_UPLOAD: [1000, 3000], // NEW: 1s, 3s for UploadThing
		UPLOADTHING_PROCESSING: [2000], // NEW: 2s for UploadThing processing
	},

	// Conditions under which retries should be attempted
	RETRYABLE_CONDITIONS: {
		NETWORK_ERRORS: true,
		TIMEOUT_ERRORS: true,
		TEMPORARY_SERVER_ERRORS: true,
		RATE_LIMIT_ERRORS: true,
		FILE_LOCKED_ERRORS: true,
		UPLOADTHING_SERVER_ERRORS: true, // NEW: UploadThing specific retryable errors
		UPLOADTHING_TIMEOUT_ERRORS: true, // NEW: UploadThing timeout retries
	},
} as const;

// ===== NEW: UPLOADTHING INTEGRATION HELPER FUNCTIONS =====

/**
 * Helper function to determine if upload button should be hidden
 * Combines state machine logic with UploadThing state
 * CRITICAL: This is the master function that prevents multiple uploads
 */
export const shouldHideUploadButton = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): boolean => {
	// State machine is processing
	if (UPLOAD_BUTTON_HIDDEN_STATES.includes(currentState)) {
		return true;
	}

	// UploadThing is active
	if (context.isActiveUpload || context.uploadThingInProgress) {
		return true;
	}

	// UI is frozen
	if (UI_FROZEN_STATES.includes(currentState)) {
		return true;
	}

	// File is already selected and being processed
	if (
		context.selectedFile &&
		context.uploadProgress > 0 &&
		context.uploadProgress < 100
	) {
		return true;
	}

	return false;
};

/**
 * Helper function to get current upload status message
 * Provides user-friendly messages based on current state and UploadThing status
 */
export const getUploadStatusMessage = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): { primary: string; secondary: string } => {
	// UploadThing specific states
	if (context.isActiveUpload) {
		return {
			primary: "Uploading...",
			secondary: "Your file is being uploaded to our servers",
		};
	}

	if (context.uploadThingInProgress) {
		return {
			primary: "Processing upload...",
			secondary: "Upload completed, now processing file content",
		};
	}

	// State machine states
	switch (currentState) {
		case CVOptimizerState.UPLOADING_FILE:
			return {
				primary: "Uploading file...2",
				secondary: `Progress: ${context.uploadProgress}%`,
			};

		case CVOptimizerState.FILE_UPLOAD_COMPLETE:
			return {
				primary: "Upload complete!",
				secondary: "Starting file processing...",
			};

		case CVOptimizerState.PROCESSING_FILE:
			return {
				primary: "Processing file...",
				secondary: "Extracting content from your resume",
			};

		case CVOptimizerState.ANALYZING_CONTENT:
			return {
				primary: "AI analyzing...",
				secondary: "Our AI is optimizing your resume",
			};

		default:
			return {
				primary: "Ready",
				secondary: "Ready to upload your resume",
			};
	}
};

/**
 * Helper function to determine if UI should be frozen
 * Prevents user interactions during critical operations
 */
export const shouldFreezeUI = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): boolean => {
	// State machine freeze conditions
	if (UI_FROZEN_STATES.includes(currentState)) {
		return true;
	}

	// UploadThing freeze conditions
	if (context.isActiveUpload || context.uploadThingInProgress) {
		return true;
	}

	return false;
};

/**
 * Helper function to validate UploadThing integration state
 * Ensures consistency between UploadThing and state machine
 */
export const validateUploadThingState = (
	context: CVOptimizerContext
): { isValid: boolean; issues: string[] } => {
	const issues: string[] = [];

	// Check for conflicting states
	if (context.isActiveUpload && context.uploadThingFiles.length === 0) {
		issues.push("UploadThing is active but no files tracked");
	}

	if (!context.isActiveUpload && context.uploadThingFiles.length > 0) {
		issues.push("Files tracked but UploadThing not active");
	}

	if (context.uploadThingInProgress && !context.uploadedFileInfo) {
		issues.push("UploadThing processing but no file info available");
	}

	// Check for timeout conditions
	if (context.isActiveUpload) {
		// In a real implementation, you'd check timestamps here
		// For now, we'll assume validation passes
	}

	return {
		isValid: issues.length === 0,
		issues,
	};
};

/**
 * Helper function to calculate combined upload progress
 * Combines UploadThing progress with state machine progress
 */
export const calculateCombinedUploadProgress = (
	currentState: CVOptimizerState,
	context: CVOptimizerContext
): number => {
	// UploadThing phase (0-30%)
	if (context.isActiveUpload) {
		return Math.min(30, context.uploadProgress * 0.3);
	}

	// File upload complete (30%)
	if (currentState === CVOptimizerState.FILE_UPLOAD_COMPLETE) {
		return 30;
	}

	// File processing (30-60%)
	if (currentState === CVOptimizerState.PROCESSING_FILE) {
		return 45;
	}

	// AI analysis (60-100%)
	if (currentState === CVOptimizerState.ANALYZING_CONTENT) {
		return 80;
	}

	// Complete
	if (currentState === CVOptimizerState.OPTIMIZATION_COMPLETE) {
		return 100;
	}

	return context.uploadProgress;
};
