/**
 * UploadSection Component - ENHANCED WITH PROPER LOADING STATES
 *
 * Now shows appropriate loading components instead of basic UI during processing
 * - LoadingState during checking_existing_resume
 * - LoadingAnalyzeState during upload/processing/analysis workflow
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

	// ===== LOCAL UI STATE - ONLY COMPONENT-SPECIFIC =====

	// Resume validation state (specific to this component)
	const [validationErrors, setValidationErrors] = useState<any>(null);
	const [showValidationDialog, setShowValidationDialog] = useState(false);

	// UploadThing integration (component-specific)
	const { startUpload, isUploading: isUploadThingActive } =
		useUploadThing("resumeUploader");

	// File input reference
	const fileInputRef = useRef<HTMLInputElement>(null);

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
	 * FIXED: More strict conditions to prevent showing during initial states
	 */
	const shouldShowLoadingAnalyzeState = useCallback(() => {
		// Get current step from upload status
		const currentStep =
			uploadStatus.currentStep || uploadStatus.primaryMessage || "";

		// CRITICAL: Don't show LoadingAnalyzeState if no file is selected or being processed
		const hasFileActivity =
			selectedFile || uploadThingFiles.length > 0 || isActiveUpload;

		// CRITICAL: Don't show during initial states (awaiting_upload, etc.)
		const isInInitialState =
			currentStep.includes("Get started") ||
			currentStep.includes("Upload your resume") ||
			currentStep.includes("Ready");

		// Show LoadingAnalyzeState ONLY during active upload workflow
		const isInActiveUploadWorkflow =
			(hasFileActivity || isActiveUpload || uploadThingInProgress) &&
			(safeUploadUIStates.isInActiveProcessing ||
				isUploading ||
				isProcessingFile ||
				isAnalyzing ||
				uploadStatus.isInUploadPhase ||
				uploadStatus.isInProcessingPhase ||
				uploadStatus.isInAnalysisPhase ||
				// Include file_upload_complete to prevent gap
				currentStep.includes("Upload complete") ||
				currentStep.includes("Starting file processing") ||
				currentStep.includes("Processing file") ||
				currentStep.includes("AI analysis") ||
				// Progress-based check ONLY if there's file activity
				(hasFileActivity &&
					uploadStatus.overallProgress > 10 &&
					uploadStatus.overallProgress < 100));

		// OVERRIDE: Never show during initial states
		const shouldShow = isInActiveUploadWorkflow && !isInInitialState;

		// console.log("🔍 shouldShowLoadingAnalyzeState:", {
		// 	result: shouldShow,
		// 	currentStep,
		// 	hasFileActivity,
		// 	isInInitialState,
		// 	isInActiveUploadWorkflow,
		// 	overallProgress: uploadStatus.overallProgress,
		// 	selectedFile: !!selectedFile,
		// 	isActiveUpload,
		// 	uploadThingInProgress,
		// 	timestamp: new Date().toISOString(),
		// });

		return shouldShow;
	}, [
		safeUploadUIStates.isInActiveProcessing,
		isUploading,
		isProcessingFile,
		isAnalyzing,
		isActiveUpload,
		uploadThingInProgress,
		uploadStatus,
		selectedFile,
		uploadThingFiles,
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
	 * Handle validation dialog close
	 */
	const handleCloseValidationDialog = useCallback(() => {
		setShowValidationDialog(false);
		setValidationErrors(null);

		// Reset file selection through unified action
		onFileSelect(null);

		toast.info("You can upload a new file");
	}, [onFileSelect]);

	/**
	 * Handle file dropped via drag and drop - ENHANCED WITH UPLOADTHING
	 */
	const handleFileDrop = useCallback(
		async (file: File) => {
			// Validate file locally
			const validation = validateFile(file);
			if (!validation.success) {
				toast.error("Invalid file", {
					description: validation.message,
				});
				return;
			}

			// First select the file through unified action
			onFileSelect(file);

			try {
				// Start UploadThing upload process
				// This will trigger onBeforeUploadBegin -> onClientUploadComplete chain
				const uploadResult = await startUpload([file]);

				if (!uploadResult?.[0]) {
					throw new Error("File upload failed");
				}

				// Success handling is done through UploadThing callbacks
				console.log("Drag & drop upload initiated successfully");
			} catch (err: any) {
				console.error("Drag & drop upload error:", err);
				// ✅ FIXED: Use uploadActions prop
				onUploadThingError(err);
			}
		},
		[onFileSelect, startUpload, onUploadThingError] // ✅ FIXED: Correct dependencies
	);

	/**
	 * Handle text analysis - SIMPLIFIED
	 */
	const handleTextAnalysis = useCallback(async () => {
		// Validate content locally
		const validation = validateResumeContent(resumeTextContent);
		if (!validation.success) {
			toast.error("Invalid content", {
				description: validation.message,
			});
			return;
		}

		// Process through unified action
		const success = await onTextUpload();

		if (!success) {
			toast.error("Text analysis failed", {
				description: "Please check your content and try again.",
			});
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
		console.log("🔄 UploadSection: Showing LoadingState for initial checking");
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

									if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
										const file = e.dataTransfer.files[0];
										handleFileDrop(file);
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
												onUploadError={handleUploadThingError} // ✅ FIXED: Correct function name
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

							{/* ===== TEXT INPUT SECTION - SIMPLIFIED ===== */}
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

								{/* Analyze button with unified validation */}
								{resumeTextContent &&
									resumeTextContent.length >= 50 &&
									!selectedFile && (
										<Button
											variant="outline"
											size="sm"
											onClick={handleTextAnalysis}
											disabled={!safeUploadUIStates.allowTextInput}
											className="w-full"
										>
											{safeUploadUIStates.isInActiveProcessing ? (
												<div className="flex items-center gap-2">
													<Loader2 className="h-4 w-4 animate-spin" />
													{uploadStatus.primaryMessage}
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

						{/* ===== DEBUG INFO - DEVELOPMENT ONLY ===== */}
						{process.env.NODE_ENV === "development" && (
							<div className="mt-4 p-3 bg-yellow-50 border rounded text-xs">
								<h4 className="font-bold">UploadSection Debug:</h4>
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
									<strong>isInActiveProcessing:</strong>{" "}
									{safeUploadUIStates.isInActiveProcessing
										? "✅ TRUE"
										: "❌ FALSE"}
								</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Resume validation dialog - KEPT FOR SPECIFIC USE CASE */}
			<ResumeValidationDialog
				open={showValidationDialog}
				onOpenChange={setShowValidationDialog}
				validationResult={validationErrors}
				onClose={handleCloseValidationDialog}
			/>
		</>
	);
};

export default UploadSection;
