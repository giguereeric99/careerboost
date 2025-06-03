/**
 * useUIPermissions Hook - Specialized UI State Management
 *
 * This hook handles ONLY UI state and permissions:
 * - Edit mode state management
 * - Tab access permissions
 * - Button visibility states
 * - Loading and processing states
 * - User interaction permissions
 *
 * RESPONSIBILITIES:
 * - Edit mode toggle
 * - Tab navigation state
 * - UI permission calculations
 * - Button state management
 *
 * DOES NOT HANDLE:
 * - Upload operations
 * - Resume data management
 * - Database operations
 * - Debug features
 */

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";

/**
 * Tab type for navigation
 */
type TabType = "upload" | "preview";

/**
 * UI permission state interface
 */
interface UIPermissionState {
	isEditing: boolean;
	activeTab: TabType;
	hasUnsavedChanges: boolean;
}

/**
 * Loading and processing states input
 */
interface ProcessingStates {
	isUploading: boolean;
	isProcessing: boolean;
	isAnalyzing: boolean;
	isSaving: boolean;
	isResetting: boolean;
	isLoading: boolean;
}

/**
 * User authentication state
 */
interface AuthState {
	isAuthenticated: boolean;
	userId?: string;
}

/**
 * Resume availability state
 */
interface ResumeState {
	hasResume: boolean;
	hasContent: boolean;
	hasOptimizedContent: boolean;
}

/**
 * Hook interface for type safety
 */
interface UseUIPermissionsReturn {
	// Current UI state
	isEditing: boolean;
	activeTab: TabType;
	hasUnsavedChanges: boolean;

	// Tab permissions
	canAccessUpload: boolean;
	canAccessPreview: boolean;

	// Action permissions
	canEdit: boolean;
	canSave: boolean;
	canReset: boolean;
	canDownload: boolean;

	// Upload permissions
	canUploadFile: boolean;
	canInputText: boolean;
	shouldHideUploadButton: boolean;

	// UI interaction states
	isUIFrozen: boolean;
	canInteractWithUI: boolean;
	showLoadingState: boolean;

	// Loading state categorization
	isInLoadingState: boolean;
	isInProcessingState: boolean;
	isInErrorState: boolean;

	// Actions
	setActiveTab: (tab: TabType) => void;
	enterEditMode: () => void;
	exitEditMode: () => void;
	toggleEditMode: () => void;
	setHasUnsavedChanges: (hasChanges: boolean) => void;

	// Tab switching with validation
	switchToUpload: () => void;
	switchToPreview: () => void;

	// Permission helpers
	checkPermission: (action: string) => boolean;
	getDisabledReason: (action: string) => string | null;
}

/**
 * Permission action types for validation
 */
type PermissionAction =
	| "edit"
	| "save"
	| "reset"
	| "download"
	| "upload_file"
	| "input_text"
	| "switch_tab"
	| "apply_suggestion"
	| "apply_keyword";

/**
 * Main UI permissions hook
 */
export const useUIPermissions = (
	processingStates: ProcessingStates,
	authState: AuthState,
	resumeState: ResumeState,
	errorState?: { isInErrorState: boolean; errorMessage?: string }
): UseUIPermissionsReturn => {
	// ===== CORE UI STATE =====
	const [uiState, setUIState] = useState<UIPermissionState>({
		isEditing: false,
		activeTab: "upload",
		hasUnsavedChanges: false,
	});

	// ===== COMPUTED PERMISSION STATES =====

	/**
	 * Determine if any processing operation is active
	 */
	const isAnyProcessing = useMemo(() => {
		return (
			processingStates.isUploading ||
			processingStates.isProcessing ||
			processingStates.isAnalyzing ||
			processingStates.isSaving ||
			processingStates.isResetting ||
			processingStates.isLoading
		);
	}, [processingStates]);

	/**
	 * Determine if UI should be frozen (no interactions allowed)
	 */
	const isUIFrozen = useMemo(() => {
		return (
			processingStates.isSaving ||
			processingStates.isResetting ||
			(processingStates.isUploading && !authState.isAuthenticated)
		);
	}, [processingStates, authState.isAuthenticated]);

	/**
	 * Determine if upload button should be hidden
	 */
	const shouldHideUploadButton = useMemo(() => {
		return isAnyProcessing || isUIFrozen || !authState.isAuthenticated;
	}, [isAnyProcessing, isUIFrozen, authState.isAuthenticated]);

	/**
	 * Basic loading state categorization
	 */
	const loadingStates = useMemo(
		() => ({
			isInLoadingState:
				processingStates.isLoading ||
				processingStates.isUploading ||
				processingStates.isProcessing,
			isInProcessingState: isAnyProcessing,
			isInErrorState: errorState?.isInErrorState || false,
		}),
		[processingStates, isAnyProcessing, errorState]
	);

	// ===== TAB PERMISSIONS =====

	/**
	 * Upload tab is always accessible (users need to be able to upload)
	 */
	const canAccessUpload = true;

	/**
	 * Preview tab requires resume content and no critical processing
	 */
	const canAccessPreview = useMemo(() => {
		// Must have resume content
		if (!resumeState.hasResume || !resumeState.hasOptimizedContent) {
			return false;
		}

		// Cannot access during critical processing operations
		if (
			processingStates.isUploading ||
			processingStates.isProcessing ||
			processingStates.isAnalyzing
		) {
			return false;
		}

		return true;
	}, [resumeState, processingStates]);

	// ===== ACTION PERMISSIONS =====

	/**
	 * Edit mode permissions
	 */
	const canEdit = useMemo(() => {
		return (
			resumeState.hasOptimizedContent &&
			!isAnyProcessing &&
			authState.isAuthenticated
		);
	}, [
		resumeState.hasOptimizedContent,
		isAnyProcessing,
		authState.isAuthenticated,
	]);

	/**
	 * Save permissions
	 */
	const canSave = useMemo(() => {
		return (
			uiState.isEditing &&
			uiState.hasUnsavedChanges &&
			!processingStates.isSaving &&
			authState.isAuthenticated
		);
	}, [
		uiState.isEditing,
		uiState.hasUnsavedChanges,
		processingStates.isSaving,
		authState.isAuthenticated,
	]);

	/**
	 * Reset permissions
	 */
	const canReset = useMemo(() => {
		return (
			resumeState.hasResume && !isAnyProcessing && authState.isAuthenticated
		);
	}, [resumeState.hasResume, isAnyProcessing, authState.isAuthenticated]);

	/**
	 * Download permissions
	 */
	const canDownload = useMemo(() => {
		return resumeState.hasOptimizedContent && !isAnyProcessing;
	}, [resumeState.hasOptimizedContent, isAnyProcessing]);

	/**
	 * Upload file permissions
	 */
	const canUploadFile = useMemo(() => {
		return authState.isAuthenticated && !isAnyProcessing && !isUIFrozen;
	}, [authState.isAuthenticated, isAnyProcessing, isUIFrozen]);

	/**
	 * Text input permissions
	 */
	const canInputText = useMemo(() => {
		return authState.isAuthenticated && !isAnyProcessing && !isUIFrozen;
	}, [authState.isAuthenticated, isAnyProcessing, isUIFrozen]);

	// ===== UI INTERACTION STATES =====

	const canInteractWithUI = !isUIFrozen;
	const showLoadingState = loadingStates.isInLoadingState;

	// ===== ACTION FUNCTIONS =====

	/**
	 * Set active tab
	 */
	const setActiveTab = useCallback((tab: TabType) => {
		console.log("🔄 Setting active tab:", tab);
		setUIState((prev) => ({ ...prev, activeTab: tab }));
	}, []);

	/**
	 * Enter edit mode with validation
	 */
	const enterEditMode = useCallback(() => {
		if (!canEdit) {
			console.warn("⚠️ Cannot enter edit mode: Permission denied");

			// Provide specific feedback based on reason
			if (!authState.isAuthenticated) {
				toast.warning("Please sign in to edit your resume");
			} else if (!resumeState.hasOptimizedContent) {
				toast.warning("Please upload and optimize a resume first");
			} else if (isAnyProcessing) {
				toast.warning("Please wait for current operation to complete");
			}
			return;
		}

		console.log("📝 Entering edit mode");
		setUIState((prev) => ({ ...prev, isEditing: true }));

		toast.message("📝 Entering edit mode", {
			description: "You can now modify your resume content",
		});
	}, [
		canEdit,
		authState.isAuthenticated,
		resumeState.hasOptimizedContent,
		isAnyProcessing,
	]);

	/**
	 * Exit edit mode with unsaved changes warning
	 */
	const exitEditMode = useCallback(() => {
		if (uiState.hasUnsavedChanges) {
			// Show warning about unsaved changes
			toast.warning("You have unsaved changes", {
				description: "Your changes will be lost if you exit edit mode",
				action: {
					label: "Save First",
					onClick: () => {
						// This would trigger save in parent component
						console.log("🔔 User requested save before exit");
					},
				},
			});
		}

		console.log("👁️ Exiting edit mode");
		setUIState((prev) => ({
			...prev,
			isEditing: false,
			hasUnsavedChanges: false,
		}));

		toast.message("👁️ Exiting to preview mode");
	}, [uiState.hasUnsavedChanges]);

	/**
	 * Toggle edit mode
	 */
	const toggleEditMode = useCallback(() => {
		if (uiState.isEditing) {
			exitEditMode();
		} else {
			enterEditMode();
		}
	}, [uiState.isEditing, enterEditMode, exitEditMode]);

	/**
	 * Set unsaved changes flag
	 */
	const setHasUnsavedChanges = useCallback((hasChanges: boolean) => {
		setUIState((prev) => ({ ...prev, hasUnsavedChanges: hasChanges }));
	}, []);

	/**
	 * Switch to upload tab with validation
	 */
	const switchToUpload = useCallback(() => {
		if (canAccessUpload) {
			setActiveTab("upload");
		} else {
			toast.warning("Upload tab is not accessible right now");
		}
	}, [canAccessUpload, setActiveTab]);

	/**
	 * Switch to preview tab with validation
	 */
	const switchToPreview = useCallback(() => {
		if (canAccessPreview) {
			setActiveTab("preview");
		} else {
			// Provide specific feedback
			if (!resumeState.hasOptimizedContent) {
				toast.info("Please upload and optimize your resume first", {
					description: "The preview will be available after optimization",
				});
			} else if (isAnyProcessing) {
				toast.info("Please wait for processing to complete", {
					description: "Preview will be available when ready",
				});
			}
		}
	}, [
		canAccessPreview,
		resumeState.hasOptimizedContent,
		isAnyProcessing,
		setActiveTab,
	]);

	// ===== PERMISSION HELPERS =====

	/**
	 * Check if a specific action is permitted
	 */
	const checkPermission = useCallback(
		(action: string): boolean => {
			switch (action as PermissionAction) {
				case "edit":
					return canEdit;
				case "save":
					return canSave;
				case "reset":
					return canReset;
				case "download":
					return canDownload;
				case "upload_file":
					return canUploadFile;
				case "input_text":
					return canInputText;
				case "switch_tab":
					return canInteractWithUI;
				case "apply_suggestion":
				case "apply_keyword":
					return uiState.isEditing && canInteractWithUI;
				default:
					console.warn("Unknown permission action:", action);
					return false;
			}
		},
		[
			canEdit,
			canSave,
			canReset,
			canDownload,
			canUploadFile,
			canInputText,
			canInteractWithUI,
			uiState.isEditing,
		]
	);

	/**
	 * Get reason why an action is disabled
	 */
	const getDisabledReason = useCallback(
		(action: string): string | null => {
			if (checkPermission(action)) {
				return null; // Action is allowed
			}

			// Common reasons
			if (!authState.isAuthenticated) {
				return "Please sign in to perform this action";
			}

			if (isAnyProcessing) {
				return "Please wait for current operation to complete";
			}

			if (isUIFrozen) {
				return "UI is temporarily locked";
			}

			// Action-specific reasons
			switch (action as PermissionAction) {
				case "edit":
					if (!resumeState.hasOptimizedContent) {
						return "Please upload and optimize a resume first";
					}
					break;

				case "save":
					if (!uiState.isEditing) {
						return "Enter edit mode to save changes";
					}
					if (!uiState.hasUnsavedChanges) {
						return "No changes to save";
					}
					break;

				case "reset":
					if (!resumeState.hasResume) {
						return "No resume data to reset";
					}
					break;

				case "download":
					if (!resumeState.hasOptimizedContent) {
						return "No content available to download";
					}
					break;

				case "upload_file":
				case "input_text":
					return "Upload functionality is temporarily unavailable";

				case "apply_suggestion":
				case "apply_keyword":
					if (!uiState.isEditing) {
						return "Enter edit mode to apply suggestions";
					}
					break;
			}

			return "Action is not available right now";
		},
		[
			checkPermission,
			authState.isAuthenticated,
			isAnyProcessing,
			isUIFrozen,
			resumeState,
			uiState,
		]
	);

	// ===== RETURN INTERFACE =====

	return {
		// Current UI state
		isEditing: uiState.isEditing,
		activeTab: uiState.activeTab,
		hasUnsavedChanges: uiState.hasUnsavedChanges,

		// Tab permissions
		canAccessUpload,
		canAccessPreview,

		// Action permissions
		canEdit,
		canSave,
		canReset,
		canDownload,

		// Upload permissions
		canUploadFile,
		canInputText,
		shouldHideUploadButton,

		// UI interaction states
		isUIFrozen,
		canInteractWithUI,
		showLoadingState,

		// Loading state categorization
		isInLoadingState: loadingStates.isInLoadingState,
		isInProcessingState: loadingStates.isInProcessingState,
		isInErrorState: loadingStates.isInErrorState,

		// Actions
		setActiveTab,
		enterEditMode,
		exitEditMode,
		toggleEditMode,
		setHasUnsavedChanges,

		// Tab switching with validation
		switchToUpload,
		switchToPreview,

		// Permission helpers
		checkPermission,
		getDisabledReason,
	};
};
