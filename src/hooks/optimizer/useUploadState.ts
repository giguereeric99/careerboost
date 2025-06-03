/**
 * useUploadState Hook - Specialized Upload Logic
 *
 * This hook handles ONLY upload-related operations:
 * - File selection and validation
 * - UploadThing integration
 * - File processing and API calls
 * - Upload state management
 *
 * RESPONSIBILITIES:
 * - Upload flow state machine
 * - UploadThing callbacks
 * - File processing API integration
 * - Upload progress tracking
 *
 * DOES NOT HANDLE:
 * - Resume data persistence
 * - UI permissions
 * - Edit mode
 * - Debug features
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// Import types
import { UploadedFileInfo } from "@/types/resumeOptimizerTypes";
import { OptimizedResumeData } from "@/types/resumeTypes";

// Import validation utilities
import {
	validateFile,
	validateTextContent,
} from "@/actions/resumeOptimizerActions";

/**
 * Upload state enum - Simple state machine for upload flow
 */
type UploadState =
	| "idle" // Ready to accept files
	| "file_selected" // File selected but not uploaded
	| "uploading" // UploadThing actively uploading
	| "upload_complete" // File uploaded to cloud
	| "processing" // Processing file content
	| "analyzing" // AI analyzing content
	| "complete" // Upload and analysis complete
	| "error"; // Error state

/**
 * Upload method tracking
 */
type UploadMethod = "file" | "text" | null;

/**
 * Hook interface for type safety
 */
interface UseUploadStateReturn {
	// Current state
	uploadState: UploadState;
	uploadMethod: UploadMethod;

	// File data
	selectedFile: File | null;
	uploadedFileInfo: UploadedFileInfo | null;
	resumeTextContent: string;

	// Progress and UI states
	uploadProgress: number;
	isDragOver: boolean;

	// Computed states
	isUploading: boolean;
	isProcessing: boolean;
	isAnalyzing: boolean;
	canUploadFile: boolean;
	canInputText: boolean;

	// UploadThing specific states
	isActiveUpload: boolean;
	uploadThingInProgress: boolean;
	uploadThingFiles: File[];

	// Error handling
	errorMessage: string | null;
	canRetry: boolean;

	// Actions
	handleFileSelect: (file: File | null) => void;
	handleTextContentChange: (content: string) => void;
	handleTextUpload: () => Promise<OptimizedResumeData | null>;
	handleDragOver: (isDragOver: boolean) => void;
	retryLastOperation: () => void;

	// UploadThing integration actions
	handleUploadThingBegin: (files: File[]) => void;
	handleUploadThingComplete: (
		results: any[]
	) => Promise<OptimizedResumeData | null>;
	handleUploadThingError: (error: Error) => void;
	setUploadThingActive: (isActive: boolean) => void;

	// Reset function
	resetUploadState: () => void;
}

/**
 * Main upload state hook
 */
export const useUploadState = (userId?: string): UseUploadStateReturn => {
	// Get user authentication from Clerk
	const { user } = useUser();

	// ===== CORE STATE =====
	const [uploadState, setUploadState] = useState<UploadState>("idle");
	const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);

	// File and content state
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadedFileInfo, setUploadedFileInfo] =
		useState<UploadedFileInfo | null>(null);
	const [resumeTextContent, setResumeTextContent] = useState<string>("");

	// Progress and UI state
	const [uploadProgress, setUploadProgress] = useState<number>(0);
	const [isDragOver, setIsDragOver] = useState<boolean>(false);

	// UploadThing specific state
	const [isActiveUpload, setIsActiveUpload] = useState<boolean>(false);
	const [uploadThingInProgress, setUploadThingInProgress] =
		useState<boolean>(false);
	const [uploadThingFiles, setUploadThingFiles] = useState<File[]>([]);

	// Error handling state
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [lastOperation, setLastOperation] = useState<string | null>(null);

	// Refs for cleanup and timeouts
	const uploadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const retryCountRef = useRef<number>(0);

	// ===== COMPUTED STATES =====

	const isUploading = uploadState === "uploading";
	const isProcessing = uploadState === "processing";
	const isAnalyzing = uploadState === "analyzing";

	// Permission checks - simplified logic
	const canUploadFile = uploadState === "idle" && !!user?.id && !isActiveUpload;
	const canInputText = uploadState === "idle" && !!user?.id && !isActiveUpload;
	const canRetry = uploadState === "error" && !!lastOperation;

	// ===== UTILITY FUNCTIONS =====

	/**
	 * Clear error state and reset to idle
	 */
	const clearError = useCallback(() => {
		setErrorMessage(null);
		setUploadState("idle");
	}, []);

	/**
	 * Set error state with message
	 */
	const setError = useCallback((message: string, operation?: string) => {
		console.error("❌ Upload error:", message);
		setErrorMessage(message);
		setUploadState("error");
		setLastOperation(operation || null);

		// Reset UploadThing states on error
		setIsActiveUpload(false);
		setUploadThingInProgress(false);
		setUploadThingFiles([]);

		// Show toast notification
		toast.error("Upload Error", {
			description: message,
			duration: 6000,
		});
	}, []);

	/**
	 * Set upload timeout protection
	 */
	const setUploadTimeout = useCallback(
		(duration: number, operation: string) => {
			// Clear existing timeout
			if (uploadTimeoutRef.current) {
				clearTimeout(uploadTimeoutRef.current);
			}

			// Set new timeout
			uploadTimeoutRef.current = setTimeout(() => {
				setError(`${operation} timed out. Please try again.`, operation);
			}, duration);
		},
		[setError]
	);

	/**
	 * Clear upload timeout
	 */
	const clearUploadTimeout = useCallback(() => {
		if (uploadTimeoutRef.current) {
			clearTimeout(uploadTimeoutRef.current);
			uploadTimeoutRef.current = null;
		}
	}, []);

	// ===== FILE HANDLING FUNCTIONS =====

	/**
	 * Handle file selection with validation
	 */
	const handleFileSelect = useCallback(
		(file: File | null) => {
			console.log("📁 File select triggered:", file?.name || "null");

			// Clear previous state
			clearError();
			setSelectedFile(null);
			setUploadMethod(null);

			// Handle null file (deselection)
			if (!file) {
				setUploadState("idle");
				return;
			}

			// Validate file
			const validation = validateFile(file);
			if (!validation.isValid) {
				setError(
					validation.error || "Invalid file selected",
					"file_validation"
				);
				return;
			}

			// Set file and update state
			setSelectedFile(file);
			setUploadMethod("file");
			setUploadState("file_selected");

			console.log("✅ File selected successfully:", {
				name: file.name,
				size: file.size,
				type: file.type,
			});
		},
		[clearError, setError]
	);

	/**
	 * Handle text content changes
	 */
	const handleTextContentChange = useCallback(
		(content: string) => {
			setResumeTextContent(content);
			setUploadMethod("text");

			// Clear file selection if user is typing
			if (content.length > 0 && selectedFile) {
				setSelectedFile(null);
			}
		},
		[selectedFile]
	);

	/**
	 * Handle drag over state
	 */
	const handleDragOver = useCallback((isDragging: boolean) => {
		setIsDragOver(isDragging);
	}, []);

	// ===== UPLOADTHING INTEGRATION =====

	/**
	 * Handle UploadThing begin callback
	 * Called when UploadThing starts uploading
	 */
	const handleUploadThingBegin = useCallback(
		(files: File[]) => {
			console.log("🚀 UploadThing begin with files:", files.length);

			// Validate authentication
			if (!user?.id) {
				setError("Please sign in to upload files", "uploadthing_begin");
				return;
			}

			// Validate files array
			if (!files || files.length === 0) {
				setError("No files provided to UploadThing", "uploadthing_begin");
				return;
			}

			// Update UploadThing state
			setIsActiveUpload(true);
			setUploadThingInProgress(false);
			setUploadThingFiles(files);

			// Update upload state
			setUploadState("uploading");
			setUploadProgress(0);
			setLastOperation("uploadthing_upload");

			// Set timeout protection
			setUploadTimeout(30000, "UploadThing upload"); // 30 seconds

			console.log("✅ UploadThing upload started successfully");
		},
		[user?.id, setError, setUploadTimeout]
	);

	/**
	 * Handle UploadThing completion callback
	 * Called when UploadThing finishes uploading
	 * CRITICAL: This function processes the uploaded file
	 */
	const handleUploadThingComplete = useCallback(
		async (results: any[]): Promise<OptimizedResumeData | null> => {
			console.log("📥 UploadThing complete with results:", results?.length);

			// Clear timeout
			clearUploadTimeout();

			// Validate results
			if (!results || !Array.isArray(results) || results.length === 0) {
				setError(
					"Upload completed but no file data received",
					"uploadthing_complete"
				);
				return null;
			}

			const firstResult = results[0];
			if (!firstResult || !firstResult.ufsUrl || !firstResult.name) {
				setError(
					"Upload completed but file data is incomplete",
					"uploadthing_complete"
				);
				return null;
			}

			// Update state to upload complete
			setUploadState("upload_complete");
			setUploadProgress(100);
			setIsActiveUpload(false);
			setUploadThingInProgress(true);

			// Create file info object
			const fileInfo: UploadedFileInfo = {
				name: firstResult.name,
				size: firstResult.size || 0,
				type: firstResult.type || "application/octet-stream",
				url: firstResult.ufsUrl,
			};

			setUploadedFileInfo(fileInfo);

			console.log(
				"✅ UploadThing completion processed, starting file processing"
			);

			// Automatically process the uploaded file
			try {
				const result = await processUploadedFile(fileInfo);
				return result;
			} catch (error) {
				console.error("❌ Error in auto file processing:", error);
				setError("Failed to process uploaded file", "file_processing");
				return null;
			}
		},
		[clearUploadTimeout, setError]
	);

	/**
	 * Handle UploadThing error callback
	 */
	const handleUploadThingError = useCallback(
		(error: Error) => {
			console.error("❌ UploadThing error:", error);

			clearUploadTimeout();
			setError(`Upload failed: ${error.message}`, "uploadthing_error");

			// Reset UploadThing states
			setIsActiveUpload(false);
			setUploadThingInProgress(false);
			setUploadThingFiles([]);
		},
		[clearUploadTimeout, setError]
	);

	/**
	 * Manually set UploadThing active state
	 */
	const setUploadThingActive = useCallback((isActive: boolean) => {
		setIsActiveUpload(isActive);

		if (!isActive) {
			// Also clear related states
			setUploadThingInProgress(false);
			setUploadThingFiles([]);
		}
	}, []);

	// ===== FILE PROCESSING FUNCTIONS =====

	/**
	 * Process uploaded file through optimization API
	 * CRITICAL: This function calls the /api/optimize endpoint
	 */
	const processUploadedFile = useCallback(
		async (fileInfo: UploadedFileInfo): Promise<OptimizedResumeData | null> => {
			console.log("🔄 Processing uploaded file:", fileInfo.name);

			// Validate inputs
			if (!user?.id) {
				setError("User not authenticated", "file_processing");
				return null;
			}

			if (!fileInfo || !fileInfo.url) {
				setError("Invalid file information", "file_processing");
				return null;
			}

			try {
				// Update state to processing
				setUploadState("processing");
				setLastOperation("file_processing");
				setUploadTimeout(60000, "File processing"); // 60 seconds

				// Prepare API request
				const formData = new FormData();
				formData.append("fileUrl", fileInfo.url);
				formData.append("fileName", fileInfo.name);
				formData.append("fileType", fileInfo.type);
				formData.append("userId", user.id);
				formData.append("resetLastSavedText", "true");

				console.log("📤 Calling /api/optimize for file processing");

				// Call optimization API
				const response = await fetch("/api/optimize", {
					method: "POST",
					body: formData,
				});

				// Parse response
				let result;
				try {
					result = await response.json();
				} catch (parseError) {
					throw new Error("Invalid response from server");
				}

				// Handle 422 validation errors (file not a resume)
				if (response.status === 422 && result.validation) {
					console.log("📋 Resume validation failed");
					setError("File is not a valid resume format", "resume_validation");
					return null;
				}

				// Handle other HTTP errors
				if (!response.ok) {
					const errorMessage = result?.error || `API Error: ${response.status}`;
					throw new Error(errorMessage);
				}

				// Validate success response
				if (!result?.optimizedText || !result?.resumeId) {
					throw new Error(
						"Invalid optimization response: missing required data"
					);
				}

				// Clear timeout
				clearUploadTimeout();

				// Update state to analyzing
				setUploadState("analyzing");
				setLastOperation("analysis");

				// Build resume data object
				const resumeData: OptimizedResumeData = {
					id: result.resumeId,
					user_id: user.id,
					original_text: "",
					optimized_text: result.optimizedText,
					last_saved_text: undefined,
					last_saved_score_ats: undefined,
					language: result.language || "English",
					file_name: fileInfo.name,
					file_type: fileInfo.type,
					file_size: fileInfo.size,
					file_url: fileInfo.url,
					ats_score: result.atsScore || 65,
					selected_template: "basic",
					keywords: result.keywords || [],
					suggestions: result.suggestions || [],
				};

				// Update state to complete
				setUploadState("complete");
				setUploadThingInProgress(false);

				console.log("✅ File processing completed successfully");

				// Show success notification
				toast.success("File processed successfully", {
					description: "Your resume has been optimized by AI",
					duration: 4000,
				});

				return resumeData;
			} catch (error) {
				console.error("❌ File processing error:", error);
				clearUploadTimeout();
				setError(
					error instanceof Error ? error.message : "File processing failed",
					"file_processing"
				);
				return null;
			}
		},
		[user?.id, setError, setUploadTimeout, clearUploadTimeout]
	);

	/**
	 * Handle text upload and processing
	 */
	const handleTextUpload =
		useCallback(async (): Promise<OptimizedResumeData | null> => {
			console.log("📝 Processing text content");

			// Validate authentication
			if (!user?.id) {
				setError("Please sign in to process text", "text_processing");
				return null;
			}

			// Validate content
			const validation = validateTextContent(resumeTextContent);
			if (!validation.isValid) {
				setError(validation.error || "Invalid text content", "text_validation");
				return null;
			}

			try {
				// Update state
				setUploadState("analyzing");
				setUploadMethod("text");
				setLastOperation("text_processing");
				setUploadTimeout(60000, "Text processing"); // 60 seconds

				// Prepare API request
				const formData = new FormData();
				formData.append("rawText", resumeTextContent);
				formData.append("userId", user.id);
				formData.append("resetLastSavedText", "true");

				console.log("📤 Calling /api/optimize for text processing");

				// Call optimization API
				const response = await fetch("/api/optimize", {
					method: "POST",
					body: formData,
				});

				// Parse response
				let result;
				try {
					result = await response.json();
				} catch (parseError) {
					throw new Error("Invalid response from server");
				}

				// Handle errors
				if (!response.ok) {
					const errorMessage = result?.error || `API Error: ${response.status}`;
					throw new Error(errorMessage);
				}

				// Validate response
				if (!result?.optimizedText) {
					throw new Error("Invalid optimization response");
				}

				// Clear timeout
				clearUploadTimeout();

				// Build resume data object
				const resumeData: OptimizedResumeData = {
					id: result.resumeId || `text-${Date.now()}`,
					user_id: user.id,
					original_text: resumeTextContent,
					optimized_text: result.optimizedText,
					last_saved_text: undefined,
					last_saved_score_ats: undefined,
					language: result.language || "English",
					file_name: "text-input.txt",
					file_type: "text/plain",
					file_size: resumeTextContent.length,
					ats_score: result.atsScore || 65,
					selected_template: "basic",
					keywords: result.keywords || [],
					suggestions: result.suggestions || [],
				};

				// Update state to complete
				setUploadState("complete");

				console.log("✅ Text processing completed successfully");

				// Show success notification
				toast.success("Text processed successfully", {
					description: "Your resume has been optimized by AI",
					duration: 4000,
				});

				return resumeData;
			} catch (error) {
				console.error("❌ Text processing error:", error);
				clearUploadTimeout();
				setError(
					error instanceof Error ? error.message : "Text processing failed",
					"text_processing"
				);
				return null;
			}
		}, [
			user?.id,
			resumeTextContent,
			setError,
			setUploadTimeout,
			clearUploadTimeout,
		]);

	// ===== RETRY FUNCTIONALITY =====

	/**
	 * Retry the last failed operation
	 */
	const retryLastOperation = useCallback(async () => {
		if (!lastOperation || !canRetry) {
			console.warn("No operation to retry");
			return;
		}

		console.log("🔄 Retrying operation:", lastOperation);
		retryCountRef.current += 1;

		// Clear error state
		clearError();

		try {
			switch (lastOperation) {
				case "file_processing":
					if (uploadedFileInfo) {
						await processUploadedFile(uploadedFileInfo);
					}
					break;

				case "text_processing":
					if (resumeTextContent) {
						await handleTextUpload();
					}
					break;

				case "uploadthing_upload":
					// Reset UploadThing states to allow retry
					setIsActiveUpload(false);
					setUploadThingInProgress(false);
					setUploadThingFiles([]);
					setUploadState("idle");
					toast.info("Ready to upload again", {
						description: "Please select your file again",
					});
					break;

				default:
					console.warn("Unknown operation to retry:", lastOperation);
			}
		} catch (error) {
			console.error("Retry failed:", error);
			setError("Retry failed. Please try again.", lastOperation);
		}
	}, [
		lastOperation,
		canRetry,
		clearError,
		uploadedFileInfo,
		resumeTextContent,
		processUploadedFile,
		handleTextUpload,
		setError,
	]);

	// ===== RESET FUNCTIONALITY =====

	/**
	 * Reset upload state to initial values
	 */
	const resetUploadState = useCallback(() => {
		console.log("🔄 Resetting upload state");

		// Clear all timeouts
		clearUploadTimeout();

		// Reset all state
		setUploadState("idle");
		setUploadMethod(null);
		setSelectedFile(null);
		setUploadedFileInfo(null);
		setResumeTextContent("");
		setUploadProgress(0);
		setIsDragOver(false);
		setIsActiveUpload(false);
		setUploadThingInProgress(false);
		setUploadThingFiles([]);
		setErrorMessage(null);
		setLastOperation(null);

		// Reset retry count
		retryCountRef.current = 0;
	}, [clearUploadTimeout]);

	// ===== EFFECTS =====

	// Cleanup effect
	useEffect(() => {
		return () => {
			clearUploadTimeout();
		};
	}, [clearUploadTimeout]);

	// ===== RETURN INTERFACE =====

	return {
		// Current state
		uploadState,
		uploadMethod,

		// File data
		selectedFile,
		uploadedFileInfo,
		resumeTextContent,

		// Progress and UI states
		uploadProgress,
		isDragOver,

		// Computed states
		isUploading,
		isProcessing,
		isAnalyzing,
		canUploadFile,
		canInputText,

		// UploadThing specific states
		isActiveUpload,
		uploadThingInProgress,
		uploadThingFiles,

		// Error handling
		errorMessage,
		canRetry,

		// Actions
		handleFileSelect,
		handleTextContentChange,
		handleTextUpload,
		handleDragOver,
		retryLastOperation,

		// UploadThing integration actions
		handleUploadThingBegin,
		handleUploadThingComplete,
		handleUploadThingError,
		setUploadThingActive,

		// Reset function
		resetUploadState,
	};
};
