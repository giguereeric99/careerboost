/**
 * UploadSection Component - ENHANCED WITH PROPER LOADING STATES
 *
 * Now shows appropriate loading components instead of basic UI during processing
 * - LoadingState during checking_existing_resume
 * - LoadingAnalyzeState during upload/processing/analysis workflow
 * FIXED: Textarea analysis now properly shows LoadingAnalyzeState
 */

"use client";

import React, { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
	FileUp,
	CheckCircle,
	AlertCircle,
	Upload,
	FileText,
	Loader2,
} from "lucide-react";
import { UploadButton, useUploadThing } from "@/utils/uploadthing";
import { toast } from "sonner";
import { useUser, SignInButton } from "@clerk/nextjs";
import { z } from "zod";
import LoadingAnalyzeState from "@/components/ResumeOptimizerSection/loadingAnalyzeState";
import LoadingState from "@/components/ResumeOptimizerSection/loadingState";
import ResumeValidationDialog from "@/components/Dialogs/resumeValidationDialog";
import {
	UploadSectionProps,
	UploadedFileInfo,
} from "@/types/resumeOptimizerTypes";

/**
 * Mapping of MIME types to human-readable file formats
 * CORRECTED: Only authorized formats
 */
const MIME_LABEL_MAP: Record<string, string> = {
	"application/pdf": "PDF",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		".docx",
	"text/plain": ".txt",
};

/**
 * List of allowed file MIME types
 * CORRECTED: Only authorized formats
 */
const ALLOWED_FILE_TYPES = Object.keys(MIME_LABEL_MAP);

/**
 * File validation schema using Zod
 * CORRECTED: Only authorized formats
 */
const fileValidationSchema = z.object({
	type: z.enum(ALLOWED_FILE_TYPES as [string, ...string[]], {
		message: "Unsupported file format. Please use PDF, DOCX, or TXT.",
	}),
	size: z
		.number()
		.max(10 * 1024 * 1024, "File size must be less than 10MB")
		.min(1, "File cannot be empty"),
	name: z.string().min(1, "File name is required"),
});

/**
 * Content validation schema for text input
 */
const contentValidationSchema = z.object({
	content: z
		.string()
		.min(50, "Resume content must be at least 50 characters long")
		.max(50000, "Resume content is too long (max 50,000 characters)"),
});

/**
 * UploadSection Component - Enhanced with Loading States
 */
const UploadSection: React.FC<UploadSectionProps> = ({
	uploadState,
	uploadActions,
	uploadStatus,
	uploadUIStates,
	onTabSwitch,
	isInLoadingState,
	isInErrorState,
}) => {
	// ===== DEFENSIVE FALLBACK FOR uploadUIStates =====
	const safeUploadUIStates = uploadUIStates || {
		shouldHideUploadButton: false,
		shouldReallyHideUploadButton: false,
		isUploadThingActive: false,
		isUIFrozen: false,
		showUploadingAnimation: false,
		showProcessingAnimation: false,
		showGeneralLoadingAnimation: false,
		isInActiveProcessing: false,
		canInteractWithUI: true,
		allowNewUpload: true,
		allowTextInput: true,
	};

	// ===== DESTRUCTURE UNIFIED STATE - INCLUDING UPLOADTHING =====
	const {
		isUploading,
		isProcessingFile,
		isAnalyzing,
		selectedFile,
		resumeTextContent,
		uploadProgress,
		isDragOver,
		canUploadFile,
		canInputText,
		uploadMethod, // ✅ ADDED: Need this for text analysis detection
		// UploadThing states
		isActiveUpload,
		uploadThingInProgress,
		uploadThingFiles,
	} = uploadState;

	const {
		onFileSelect,
		onFileUpload,
		onTextContentChange,
		onTextUpload,
		onDragOver,
		// UploadThing actions - CRITICAL FOR INTEGRATION
		onUploadThingBegin,
		onUploadThingComplete,
		onUploadThingError,
		onSetUploadThingActive,
	} = uploadActions;

	// UploadThing integration (component-specific)
	const { startUpload, isUploading: isUploadThingActive } = useUploadThing(
		"resumeUploader",
		{
			// ✅ Callbacks déplacés ici depuis UploadButton
			onClientUploadComplete: onUploadThingComplete,
			onUploadError: onUploadThingError,
			onUploadBegin: onUploadThingBegin,
		}
	);

	// File input reference
	const fileInputRef = useRef<HTMLInputElement>(null);

	// PROTECTED LOGGING REF - MOVED TO TOP TO AVOID HOOK VIOLATION
	const logProtectionRef = useRef({
		lastLogTime: 0,
		lastLogMessage: "",
		logCount: 0,
	});

	// Get user authentication status
	const { isSignedIn, user } = useUser();

	// ===== COMPUTED VALUES - SIMPLIFIED USING UI STATES =====

	/**
	 * Convert bytes to readable format
	 */
	const readableSize = (bytes: number) =>
		(bytes / (1024 * 1024)).toFixed(1) + " MB";

	/**
	 * Get file type display name
	 */
	const getFileTypeDisplay = (type: string): string => {
		return MIME_LABEL_MAP[type] || type;
	};

	// ===== ENHANCED: DETERMINE WHICH LOADING STATE TO SHOW =====

	/**
	 * Check if we should show LoadingState (for initial checking)
	 */
	const shouldShowLoadingState = useCallback(() => {
		// Show LoadingState during checking_existing_resume
		return (
			uploadStatus.currentStep?.includes("Checking for existing resume") ||
			uploadStatus.primaryMessage?.includes("Checking for existing resume") ||
			uploadStatus.currentStep?.includes("Initializing") ||
			(isInLoadingState && !safeUploadUIStates.isInActiveProcessing)
		);
	}, [uploadStatus, isInLoadingState, safeUploadUIStates.isInActiveProcessing]);

	/**
	 * Check if we should show LoadingAnalyzeState (for upload/process/analyze)
	 * FIXED: Enhanced to detect text analysis properly
	 */
	const shouldShowLoadingAnalyzeState = useCallback(() => {
		// ✅ CRITICAL: Don't show loading if we have validation errors
		if (uploadState.validationErrors) {
			console.log(
				"🔍 shouldShowLoadingAnalyzeState: validationErrors present, NOT showing LoadingAnalyzeState"
			);
			return false;
		}
		// ✅ CRITICAL: Priority check - if we're analyzing, always show LoadingAnalyzeState
		if (isAnalyzing) {
			console.log(
				"🔍 shouldShowLoadingAnalyzeState: isAnalyzing = TRUE, showing LoadingAnalyzeState"
			);
			return true;
		}

		// ✅ CRITICAL: Priority check - if we're in active processing, show LoadingAnalyzeState
		if (safeUploadUIStates.isInActiveProcessing) {
			console.log(
				"🔍 shouldShowLoadingAnalyzeState: isInActiveProcessing = TRUE, showing LoadingAnalyzeState"
			);
			return true;
		}

		// Get current step from upload status
		const currentStep =
			uploadStatus.currentStep || uploadStatus.primaryMessage || "";

		// ✅ ENHANCED: File activity detection
		const hasFileActivity =
			selectedFile || uploadThingFiles.length > 0 || isActiveUpload;

		// ✅ ENHANCED: Text analysis activity detection
		const hasTextActivity =
			(uploadMethod === "text" &&
				resumeTextContent &&
				resumeTextContent.length >= 50) ||
			currentStep.includes("AI analysis") ||
			currentStep.includes("Analyzing") ||
			currentStep.includes("analysis in progress");

		// CRITICAL: Don't show during initial states (awaiting_upload, etc.)
		const isInInitialState =
			currentStep.includes("Get started") ||
			currentStep.includes("Upload your resume") ||
			currentStep.includes("Ready");

		// ✅ ENHANCED: Show LoadingAnalyzeState for ANY active workflow
		const isInActiveUploadWorkflow =
			(hasFileActivity ||
				hasTextActivity ||
				isActiveUpload ||
				uploadThingInProgress ||
				isAnalyzing) &&
			(safeUploadUIStates.isInActiveProcessing ||
				isUploading ||
				isProcessingFile ||
				isAnalyzing || // ✅ CRITICAL: Direct isAnalyzing check
				uploadStatus.isInUploadPhase ||
				uploadStatus.isInProcessingPhase ||
				uploadStatus.isInAnalysisPhase ||
				// Include specific step detection
				currentStep.includes("Upload complete") ||
				currentStep.includes("Starting file processing") ||
				currentStep.includes("Processing file") ||
				currentStep.includes("AI analysis") ||
				currentStep.includes("Analyzing") ||
				// Progress-based check for both file and text activity
				((hasFileActivity || hasTextActivity) &&
					uploadStatus.overallProgress > 10 &&
					uploadStatus.overallProgress < 100));

		// OVERRIDE: Never show during initial states
		const shouldShow = isInActiveUploadWorkflow && !isInInitialState;

		// ✅ ENHANCED: Debug logging for both file and text analysis
		if (hasTextActivity || uploadMethod === "text") {
			console.log("🔍 TEXT ANALYSIS shouldShowLoadingAnalyzeState:", {
				result: shouldShow,
				isAnalyzing,
				isInActiveProcessing: safeUploadUIStates.isInActiveProcessing,
				currentStep,
				hasTextActivity,
				uploadMethod,
				resumeTextContentLength: resumeTextContent?.length || 0,
				isInAnalysisPhase: uploadStatus.isInAnalysisPhase,
				overallProgress: uploadStatus.overallProgress,
				isInActiveUploadWorkflow,
				isInInitialState,
			});
		}

		return shouldShow;
	}, [
		// ✅ CRITICAL: Add isAnalyzing as dependency
		isAnalyzing,
		safeUploadUIStates.isInActiveProcessing,
		isUploading,
		isProcessingFile,
		isActiveUpload,
		uploadThingInProgress,
		uploadStatus,
		selectedFile,
		uploadThingFiles,
		uploadMethod,
		resumeTextContent,
		uploadState.validationErrors,
	]);

	// ===== VALIDATION FUNCTIONS - KEPT LOCAL =====

	/**
	 * Validate file with Zod schema
	 */
	const validateFile = (file: File): { success: boolean; message?: string } => {
		try {
			fileValidationSchema.parse(file);
			return { success: true };
		} catch (error) {
			if (error instanceof z.ZodError) {
				const message = error.errors[0]?.message || "Invalid file";
				return { success: false, message };
			}
			return { success: false, message: "File validation failed" };
		}
	};

	/**
	 * Validate resume content for minimum requirements
	 */
	const validateResumeContent = (
		content: string
	): { success: boolean; message?: string } => {
		try {
			contentValidationSchema.parse({ content });
			return { success: true };
		} catch (error) {
			if (error instanceof z.ZodError) {
				const message = error.errors[0]?.message || "Invalid content";
				return { success: false, message };
			}
			return { success: false, message: "Content validation failed" };
		}
	};

	// ===== UPLOADTHING EVENT HANDLERS - CRITICAL INTEGRATION =====

	/**
	 * CRITICAL: Handle UploadThing before upload begin
	 * This is called BEFORE upload starts and hides the button immediately
	 * FIXES THE MAIN ISSUE: Button disappears instantly
	 * FIXED: Uses uploadActions props instead of undefined functions
	 */
	const handleUploadThingBeforeUploadBegin = useCallback(
		(files: File[]) => {
			console.log(
				"🚀 UploadThing onBeforeUploadBegin - Hiding button immediately:",
				files
			);

			// CRITICAL: Trigger state machine action to hide button
			// ✅ FIXED: Use uploadActions prop
			onUploadThingBegin(files);

			// Validate files before upload
			for (const file of files) {
				const validation = validateFile(file);
				if (!validation.success) {
					toast.error("Invalid file", {
						description: validation.message,
					});
					// Return empty array to cancel upload
					return [];
				}
			}

			return files;
		},
		[onUploadThingBegin] // ✅ FIXED: Correct dependency
	);

	/**
	 * Handle UploadThing upload errors
	 * This is called when UploadThing encounters an error
	 * FIXED: Uses uploadActions props instead of undefined functions
	 */
	const handleUploadThingError = useCallback(
		(error: Error) => {
			console.error("❌ UploadThing onUploadError:", error);

			// Trigger state machine action
			// ✅ FIXED: Use uploadActions prop
			onUploadThingError(error);

			toast.error("Upload failed", {
				description: error.message,
				duration: 6000,
			});
		},
		[onUploadThingError] // ✅ FIXED: Correct dependency
	);

	// ===== OTHER EVENT HANDLERS =====

	/**
	 * Handle file dropped via drag and drop - ENHANCED WITH UPLOADTHING
	 */
	const handleFileDrop = useCallback(
		async (file: File) => {
			console.log("🎯 Drag & Drop: Starting file drop process for:", file.name);

			// 1. Validate file locally (same as before)
			const validation = validateFile(file);
			if (!validation.success) {
				toast.error("Invalid file", {
					description: validation.message,
				});
				return;
			}

			// 2. Select the file through unified action (same as before)
			onFileSelect(file);

			// 3. ✅ NEW: Follow the exact same process as UploadButton
			console.log("🎯 Drag & Drop: Following UploadButton process flow");

			try {
				// 3a. Trigger onBeforeUploadBegin (same as UploadButton)
				console.log(
					"🎯 Drag & Drop: Calling handleUploadThingBeforeUploadBegin"
				);
				const processedFiles = handleUploadThingBeforeUploadBegin([file]);

				// Check if validation passed (empty array means validation failed)
				if (!processedFiles || processedFiles.length === 0) {
					console.log(
						"🎯 Drag & Drop: File validation failed in onBeforeUploadBegin"
					);
					return;
				}

				console.log(
					"🎯 Drag & Drop: File validation passed, starting UploadThing"
				);

				// 3b. Start UploadThing upload with validated files
				const uploadResult = await startUpload(processedFiles);

				// 3c. Check upload result (success will be handled by onClientUploadComplete automatically)
				if (!uploadResult?.[0]) {
					throw new Error("File upload failed - no result returned");
				}

				console.log(
					"🎯 Drag & Drop: UploadThing upload initiated successfully"
				);
				console.log(
					"🎯 Drag & Drop: LoadingAnalyzeState should now be visible"
				);

				// ✅ SUCCESS: onClientUploadComplete will be called automatically by UploadThing
				// This will trigger the state machine and show LoadingAnalyzeState
			} catch (err: any) {
				console.error("🎯 Drag & Drop: Upload failed:", err);
				// 3d. Handle errors (same as UploadButton)
				handleUploadThingError(err);
			}
		},
		[
			onFileSelect,
			startUpload,
			handleUploadThingBeforeUploadBegin,
			handleUploadThingError,
		]
	);

	/**
	 * Handle text analysis - ENHANCED FOR LOADING STATE
	 */
	const handleTextAnalysis = useCallback(async () => {
		console.log("📝 Text Analysis: Starting text analysis");

		// Validate content locally
		const validation = validateResumeContent(resumeTextContent);
		if (!validation.success) {
			toast.error("Invalid content", {
				description: validation.message,
			});
			return;
		}

		console.log("📝 Text Analysis: Validation passed, calling onTextUpload");

		// ✅ ENHANCED: Process through unified action
		// This should trigger the state machine and show LoadingAnalyzeState
		const success = await onTextUpload();

		if (!success) {
			console.log("📝 Text Analysis: onTextUpload returned false");
			toast.error("Text analysis failed", {
				description: "Please check your content and try again.",
			});
		} else {
			console.log("📝 Text Analysis: onTextUpload completed successfully");
		}
	}, [resumeTextContent, onTextUpload]);

	/**
	 * Handle drag over events - UNIFIED WITH SAFE ACCESS
	 */
	const handleDragEvents = useCallback(
		(isDragging: boolean) => {
			if (safeUploadUIStates.canInteractWithUI) {
				onDragOver(isDragging);
			}
		},
		[safeUploadUIStates.canInteractWithUI, onDragOver]
	);

	// ===== ENHANCED: CONDITIONAL RENDERING WITH PROPER LOADING STATES =====

	// Show LoadingState for initial checking (checking_existing_resume)
	if (shouldShowLoadingState()) {
		// PROTECTED LOGGING using ref declared at top
		const now = Date.now();
		const message =
			"🔄 UploadSection: Showing LoadingState for initial checking";
		const timeSinceLastLog = now - logProtectionRef.current.lastLogTime;
		const isSameMessage = logProtectionRef.current.lastLogMessage === message;

		// Only log if it's been more than 1 second OR different message
		if (!isSameMessage || timeSinceLastLog > 1000) {
			console.log(message);
			logProtectionRef.current.lastLogTime = now;
			logProtectionRef.current.lastLogMessage = message;
			logProtectionRef.current.logCount++;
		}
		return <LoadingState />;
	}

	// Show LoadingAnalyzeState for upload/processing/analysis workflow
	if (shouldShowLoadingAnalyzeState()) {
		console.log("🔄 UploadSection: Showing LoadingAnalyzeState for processing");
		return (
			<LoadingAnalyzeState
				{...({
					currentStep: uploadStatus.primaryMessage || uploadStatus.currentStep,
					progress: uploadStatus.overallProgress,
				} as any)}
			/>
		);
	}

	// ===== MAIN UPLOAD UI - ENHANCED WITH LOADING COMPONENTS =====

	return (
		<>
			<Card>
				<CardContent className="pt-6">
					<div className="space-y-6">
						{/* ===== HEADER SECTION ===== */}
						<div className="space-y-2 text-center">
							<h3 className="font-medium">Upload your resume</h3>
							<p className="text-sm text-muted-foreground">
								Accepted formats: PDF, DOCX, TXT (Max 10MB)
							</p>
						</div>

						{/* ===== FILE UPLOAD SECTION - ENHANCED LOGIC ===== */}
						<div className="space-y-4">
							{/* Drag and drop zone with unified state */}
							<div
								className={`flex flex-col items-center justify-center h-64 space-y-4 py-6 border-2 border-dashed rounded-lg transition-colors ${
									isDragOver && safeUploadUIStates.allowNewUpload
										? "bg-blue-50 border-blue-400"
										: "border-gray-300"
								} ${
									safeUploadUIStates.isUIFrozen ||
									!safeUploadUIStates.allowNewUpload
										? "opacity-50 cursor-not-allowed"
										: "hover:bg-gray-50"
								}`}
								onDragOver={(e) => {
									e.preventDefault();
									if (safeUploadUIStates.allowNewUpload) {
										handleDragEvents(true);
									}
								}}
								onDragLeave={() => {
									if (safeUploadUIStates.allowNewUpload) {
										handleDragEvents(false);
									}
								}}
								onDrop={(e) => {
									e.preventDefault();
									if (safeUploadUIStates.allowNewUpload) {
										handleDragEvents(false);
									}

									// Block if not connected OR if UI frozen
									if (
										!safeUploadUIStates.allowNewUpload ||
										safeUploadUIStates.isUIFrozen
									)
										return;

									// ✅ FIXED: Process dropped files using corrected handleFileDrop
									if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
										// Validate single file
										if (e.dataTransfer.files.length > 1) {
											toast.error("Multiple files not supported", {
												description: "Please drop only one file at a time.",
												duration: 4000,
											});
											return;
										}

										const file = e.dataTransfer.files[0];
										if (file) {
											console.log(
												"🎯 onDrop: Calling handleFileDrop for:",
												file.name
											);
											handleFileDrop(file);
										}
									}
								}}
							>
								{/* Upload icon with unified loading state */}
								<div className="rounded-full bg-blue-50 p-3">
									{safeUploadUIStates.showUploadingAnimation ||
									safeUploadUIStates.showProcessingAnimation ? (
										<Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
									) : (
										<FileUp className="h-6 w-6 text-blue-600" />
									)}
								</div>

								{/* Status message using unified state */}
								<p className="text-center text-sm">
									{safeUploadUIStates.isInActiveProcessing
										? uploadStatus.primaryMessage
										: "Drag & Drop your resume here or use the button below."}
								</p>

								{/* CRITICAL: Upload button with UploadThing integration */}
								<div className="relative w-full flex justify-center items-center">
									{safeUploadUIStates.allowNewUpload ? (
										safeUploadUIStates.shouldReallyHideUploadButton ? (
											// CRITICAL FIX: Loading animation during any processing
											<div className="flex flex-col items-center py-2 px-4 min-h-[40px] min-w-[120px]">
												<div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
												<p className="text-sm text-blue-600 mt-2">
													{safeUploadUIStates.showUploadingAnimation
														? "Uploading..."
														: safeUploadUIStates.showProcessingAnimation
														? "Processing..."
														: uploadStatus.primaryMessage}
												</p>
											</div>
										) : (
											// CRITICAL: UploadButton with full UploadThing integration
											// ✅ FIXED: All handlers use correct function names from props
											<UploadButton
												className="custom-btn ut-button:bg-blue-600 ut-button:text-white ut-button:rounded-md ut-button:px-4 ut-button:py-2 ut-button:hover:bg-blue-700"
												endpoint="resumeUploader"
												disabled={!safeUploadUIStates.allowNewUpload}
												onBeforeUploadBegin={handleUploadThingBeforeUploadBegin} // CRITICAL: Hides button immediately
												onClientUploadComplete={onUploadThingComplete}
												onUploadError={handleUploadThingError}
											/>
										)
									) : (
										<SignInButton mode="modal">
											<Button className="px-4">
												You must be signed in to upload
											</Button>
										</SignInButton>
									)}
								</div>
							</div>

							{/* ===== FILE STATUS DISPLAY - USING UNIFIED STATE ===== */}
							{selectedFile && (
								<div className="mt-2 text-sm text-muted-foreground animate-fade-in-up text-center">
									<div className="flex items-center justify-center gap-1">
										{safeUploadUIStates.isInActiveProcessing ? (
											<Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
										) : (
											<CheckCircle className="h-4 w-4 text-green-500" />
										)}
										<span className="font-medium">Selected file:</span>{" "}
										{selectedFile.name}
									</div>
									<div className="text-xs text-gray-500">
										({readableSize(selectedFile.size)},{" "}
										{getFileTypeDisplay(selectedFile.type)})
									</div>
									<div className="text-xs mt-1 text-blue-600">
										{uploadStatus.secondaryMessage}
									</div>
								</div>
							)}

							{/* ===== TEXT INPUT SECTION - ENHANCED FOR LOADING STATE ===== */}
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<p className="font-medium">Or paste your resume content:</p>
									{resumeTextContent && (
										<span className="text-xs text-muted-foreground">
											{resumeTextContent.length} characters
										</span>
									)}
								</div>

								{/* Text input using unified state */}
								<Textarea
									placeholder="Paste your resume content here..."
									className="min-h-[200px]"
									value={resumeTextContent}
									onChange={(e) => onTextContentChange(e.target.value)}
									disabled={!safeUploadUIStates.allowTextInput}
								/>

								{/* ✅ ENHANCED: Analyze button with unified validation and loading detection */}
								{resumeTextContent &&
									resumeTextContent.length >= 50 &&
									!selectedFile && (
										<Button
											variant="outline"
											size="sm"
											onClick={handleTextAnalysis}
											disabled={
												!safeUploadUIStates.allowTextInput ||
												safeUploadUIStates.isInActiveProcessing
											}
											className="w-full"
										>
											{safeUploadUIStates.isInActiveProcessing ? (
												<div className="flex items-center gap-2">
													<Loader2 className="h-4 w-4 animate-spin" />
													{uploadStatus.primaryMessage || "Analyzing..."}
												</div>
											) : (
												"Analyze & Preview"
											)}
										</Button>
									)}

								{/* Content validation feedback */}
								{resumeTextContent.length > 0 &&
									resumeTextContent.length < 50 && (
										<div className="text-xs text-amber-600 flex items-center gap-1">
											<AlertCircle className="h-3 w-3" />
											Please enter at least 50 characters (currently{" "}
											{resumeTextContent.length})
										</div>
									)}

								{/* Processing status using unified state */}
								{safeUploadUIStates.isInActiveProcessing && (
									<div className="text-xs text-blue-600 flex items-center gap-1">
										<Loader2 className="h-3 w-3 animate-spin" />
										{uploadStatus.secondaryMessage}
									</div>
								)}
							</div>
						</div>

						{/* ===== PROGRESS INDICATOR - UNIFIED ===== */}
						{safeUploadUIStates.isInActiveProcessing &&
							uploadStatus.overallProgress > 0 && (
								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span>Progress</span>
										<span>{uploadStatus.overallProgress}%</span>
									</div>
									<div className="w-full bg-gray-200 rounded-full h-2">
										<div
											className="bg-blue-600 h-2 rounded-full transition-all duration-300"
											style={{ width: `${uploadStatus.overallProgress}%` }}
										/>
									</div>
									<p className="text-xs text-muted-foreground text-center">
										{uploadStatus.secondaryMessage}
									</p>
								</div>
							)}

						{/* ===== ERROR STATE DISPLAY ===== */}
						{isInErrorState && uploadStatus.errorMessage && (
							<div className="bg-red-50 border border-red-200 rounded-lg p-4">
								<div className="flex items-center gap-2">
									<AlertCircle className="h-4 w-4 text-red-500" />
									<p className="text-sm font-medium text-red-800">
										Upload Error
									</p>
								</div>
								<p className="text-sm text-red-700 mt-1">
									{uploadStatus.errorMessage}
								</p>
								{uploadStatus.canRetry && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											// Retry logic would be handled by parent component
											// through the unified action system
											toast.info("Retry functionality coming soon");
										}}
										className="mt-2"
									>
										Try Again
									</Button>
								)}
							</div>
						)}

						{/* ===== ENHANCED DEBUG INFO - DEVELOPMENT ONLY ===== */}
						{process.env.NODE_ENV === "development" && (
							<div className="mt-4 p-3 bg-yellow-50 border rounded text-xs">
								<h4 className="font-bold">UploadSection Debug (Enhanced):</h4>
								<p>
									<strong>shouldShowLoadingState:</strong>{" "}
									{shouldShowLoadingState() ? "✅ TRUE" : "❌ FALSE"}
								</p>
								<p>
									<strong>shouldShowLoadingAnalyzeState:</strong>{" "}
									{shouldShowLoadingAnalyzeState() ? "✅ TRUE" : "❌ FALSE"}
								</p>
								<p>
									<strong>uploadStatus.currentStep:</strong>{" "}
									{uploadStatus.currentStep || "undefined"}
								</p>
								<p>
									<strong>uploadStatus.primaryMessage:</strong>{" "}
									{uploadStatus.primaryMessage || "undefined"}
								</p>
								<p>
									<strong>uploadMethod:</strong> {uploadMethod || "undefined"}
								</p>
								<p>
									<strong>resumeTextContent.length:</strong>{" "}
									{resumeTextContent?.length || 0}
								</p>
								<p>
									<strong>isInActiveProcessing:</strong>{" "}
									{safeUploadUIStates.isInActiveProcessing
										? "✅ TRUE"
										: "❌ FALSE"}
								</p>
								<p>
									<strong>isAnalyzing:</strong>{" "}
									{isAnalyzing ? "✅ TRUE" : "❌ FALSE"}
								</p>
								<p>
									<strong>isInAnalysisPhase:</strong>{" "}
									{uploadStatus.isInAnalysisPhase ? "✅ TRUE" : "❌ FALSE"}
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Resume validation dialog - KEPT FOR SPECIFIC USE CASE */}
			<ResumeValidationDialog
				open={!!uploadState.validationErrors}
				onOpenChange={(open) => {
					if (!open) {
						// Clear validation errors through clear action
						if (uploadActions.clearValidationErrors) {
							uploadActions.clearValidationErrors();
						}
						uploadActions.onFileSelect(null);
						toast.info("You can upload a new file");
					}
				}}
				validationResult={uploadState.validationErrors}
				onClose={() => {
					// Clear validation errors through clear action
					if (uploadActions.clearValidationErrors) {
						uploadActions.clearValidationErrors();
					}
					uploadActions.onFileSelect(null);
					toast.info("You can upload a new file");
				}}
			/>
		</>
	);
};

export default UploadSection;
