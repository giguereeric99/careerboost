/**
 * ResumeOptimizer Component - ENHANCED WITH STEP-BY-STEP DEBUG SYSTEM
 *
 * Main component that manages the resume optimization workflow for CareerBoost SaaS.
 * Now uses only the unified state machine hook with enhanced debug capabilities.
 *
 * MAJOR ENHANCEMENT FOR DEBUG:
 * - Added step-by-step debug system using new hook functions
 * - Replaced old debug buttons with new simulation functions
 * - Enhanced error tracking and state validation
 * - Interactive debug panel for troubleshooting workflow issues
 * - Maintains all original functionality while adding debug capabilities
 */

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// Import UI components for the resume optimization workflow
import UploadSection from "@/components/ResumeOptimizerSection/uploadSection";
import ResumePreview from "@/components/ResumeOptimizerSection/resumePreview";
import ScoreCard from "@/components/ResumeOptimizerSection/scoreCard";
import SuggestionsList from "@/components/ResumeOptimizerSection/suggestionsList";
import KeywordsList from "@/components/ResumeOptimizerSection/keywordsList";
import TemplateGallery from "@/components/ResumeOptimizerSection/templateGallery";
import ResetConfirmationDialog from "@/components/Dialogs/resetConfirmationDialog";
import LoadingState from "@/components/ResumeOptimizerSection/loadingState";
import EmptyPreviewState from "@/components/ResumeOptimizerSection/emptyPreviewState";
import ErrorState from "@/components/Dialogs/errorStateDialog";
import { resumeTemplates } from "@/constants/templates";

// Import the unified state machine hook with enhanced debug capabilities
import useResumeOptimizer from "@/hooks/optimizer/useResumeOptimizer";

// Import types for type safety
import { Suggestion, Keyword } from "@/types/resumeTypes";

/**
 * ResumeOptimizer Component - ENHANCED DEBUG VERSION
 *
 * Main component for CareerBoost's resume optimization feature.
 * Now includes step-by-step debug capabilities for troubleshooting.
 * Handles the complete lifecycle of resume optimization including:
 * - File upload and content extraction (now integrated)
 * - AI optimization and analysis (now integrated)
 * - Rendering preview with template selection
 * - Managing suggestions and keywords with unified state
 * - Saving and resetting user changes
 * - Error handling with retry mechanism (now integrated)
 * - Enhanced debug system for troubleshooting (NEW)
 */
const ResumeOptimizer: React.FC = () => {
	// Get user authentication state from Clerk
	const { user } = useUser();

	// ===== UNIFIED STATE MACHINE HOOK - ENHANCED WITH DEBUG =====
	const {
		// ===== CORE STATE =====
		resumeData,
		optimizedText,
		originalAtsScore,
		currentAtsScore,
		suggestions,
		keywords,
		selectedTemplate,
		hasResume,
		activeTab,

		// ===== MULTILINGUAL SECTION TITLES SUPPORT =====
		sectionTitles,
		resumeLanguage,

		// ===== EDITING STATE =====
		isEditing,
		tempEditedContent,
		tempSections,
		hasTempChanges,

		// ===== COMPUTED STATE =====
		currentDisplayContent,
		currentSections,

		// ===== MODIFICATION FLAGS =====
		contentModified,
		scoreModified,
		templateModified,

		// ===== UPLOAD STATE - NOW INTEGRATED =====
		selectedFile,
		uploadedFileInfo,
		resumeTextContent,
		uploadProgress,
		isDragOver,
		uploadMethod,

		// ===== UPLOADTHING STATES =====
		isActiveUpload,
		uploadThingInProgress,
		uploadThingFiles,

		// Validation state
		validationErrors,
		showValidationDialog,
		clearValidationErrors,

		// ===== LOADING STATES - GRANULAR =====
		isLoading,
		isSaving,
		isResetting,
		isUploading,
		isProcessingFile,
		isAnalyzing,

		// ===== UPLOAD UI STATES =====
		uploadUIStates,

		// ===== STATE-CALCULATED PERMISSIONS =====
		canAccessUpload,
		canAccessPreview,
		canEdit,
		canSave,
		canReset,
		isInLoadingState,
		isInProcessingState,
		isInErrorState,

		// ===== DIRECT STATE ACCESS =====
		currentState,

		// ===== UPLOAD ACTIONS - NOW INTEGRATED =====
		handleFileSelect,
		handleFileUpload,
		handleTextContentChange,
		handleTextUpload,
		handleDragOver,
		processUploadedFile,
		retryLastOperation,

		// ===== UPLOADTHING ACTIONS =====
		handleUploadThingBegin,
		handleUploadThingComplete,
		handleUploadThingError,
		setUploadThingActive,

		// ===== UPLOAD STATUS =====
		uploadStatus,
		canUploadFile,
		canInputText,
		isRetryable,

		// ===== CORE ACTIONS =====
		setActiveTab,
		toggleEditMode,
		loadLatestResume,
		saveResume,
		resetResume,

		// ===== EDITING ACTIONS =====
		handleContentEdit,
		handleSectionEdit,
		handleApplySuggestion,
		handleKeywordApply,
		updateResumeWithOptimizedData,
		updateSelectedTemplate,

		// ===== UTILITY FUNCTIONS =====
		getAppliedKeywords,
		hasUnsavedChanges,
		calculateCompletionScore,
		shouldEnableSaveButton,

		// ===== ENHANCED DEBUG SYSTEM =====
		debug,
	} = useResumeOptimizer(user?.id);

	const { context } = debug;

	// ===== LOCAL UI STATE - MINIMIZED =====

	// State for reset confirmation dialog
	const [showResetDialog, setShowResetDialog] = useState(false);

	// Debug panel expansion state
	const [isDebugExpanded, setIsDebugExpanded] = useState(false);

	// ===== EVENT HANDLERS - SIMPLIFIED WITH UNIFIED STATE =====

	/**
	 * Handle tab change with unified state validation
	 * Now uses state-calculated permissions instead of complex conditions
	 */
	const handleTabChange = useCallback(
		(value: string) => {
			// Use state-calculated permission instead of complex condition
			if (value === "preview" && !canAccessPreview) {
				toast.info("Please wait until analysis is complete");
				return;
			}

			// Update active tab
			setActiveTab(value as "upload" | "preview");

			// When switching to preview tab, load the latest resume data if needed
			if (value === "preview" && user?.id && !currentDisplayContent) {
				loadLatestResume();
				console.log("Loading latest resume data");
			}
		},
		[
			user?.id,
			canAccessPreview,
			loadLatestResume,
			currentDisplayContent,
			setActiveTab,
		]
	);

	/**
	 * Centralized reset handler with unified state management
	 */
	const handleCompleteReset = useCallback(() => {
		// Hide confirmation dialog
		setShowResetDialog(false);

		// Call the unified reset function
		resetResume().then((success) => {
			if (success) {
				console.log("Reset completed successfully - unified state updated");
			}
		});
	}, [resetResume]);

	/**
	 * Handle resume download with current display content
	 */
	const handleDownload = useCallback(() => {
		// Use current display content for download
		const contentForDownload = currentDisplayContent || optimizedText;

		// Validate content exists
		if (!contentForDownload) {
			toast.error("No content to download");
			return;
		}

		// Get selected template or default to first template
		const template =
			resumeTemplates.find((t) => t.id === selectedTemplate) ||
			resumeTemplates[0];

		// Create complete HTML document with template styling
		const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Resume - CareerBoost Optimized</title>
<style>
  body {
    font-family: Arial, sans-serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
  }
  ${
		template.previewClass
			? `.resume-content { ${template.previewClass.replace(
					/border[^;]+;/g,
					""
			  )} }`
			: ""
	}
</style>
</head>
<body>
<div class="resume-content">
  ${contentForDownload}
</div>
</body>
</html>`;

		// Create and trigger download
		const blob = new Blob([htmlContent], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "resume-careerboost-optimized.html";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		// Show success notification
		toast.success("Resume downloaded successfully");
	}, [currentDisplayContent, optimizedText, selectedTemplate]);

	/**
	 * Enhanced adapter function for applying keywords with unified state
	 */
	const handleKeywordApplyAdapter = useCallback(
		(index: number) => {
			console.log(`Keyword apply adapter called with index ${index}`);

			// Use state-calculated permission instead of manual check
			if (!canEdit) {
				toast.info("Enter edit mode to apply keywords");
				return;
			}

			if (index >= 0 && index < keywords.length) {
				const keyword = keywords[index];

				if (!keyword.id) {
					console.warn(`Keyword at index ${index} has no ID:`, keyword);
					toast.error("Cannot apply keyword: Missing ID");
					return;
				}

				console.log("Applying keyword with unified state:", {
					keywordId: keyword.id,
					keyword: keyword.text,
					currentScore: currentAtsScore,
				});

				// Use unified state handler
				handleKeywordApply(keyword.id, !keyword.isApplied);
			} else {
				console.error(
					`Invalid keyword index: ${index}. Max: ${keywords.length - 1}`
				);
			}
		},
		[canEdit, keywords, currentAtsScore, handleKeywordApply]
	);

	/**
	 * Enhanced adapter function for applying suggestions with unified state
	 */
	const handleApplySuggestionAdapter = useCallback(
		(index: number) => {
			console.log(`Suggestion apply adapter called with index ${index}`);

			// Use state-calculated permission instead of manual check
			if (!canEdit) {
				toast.info("Enter edit mode to apply suggestions");
				return false;
			}

			if (index >= 0 && index < suggestions.length) {
				const suggestion = suggestions[index];

				if (!suggestion.id) {
					console.error(
						"Cannot apply suggestion: Missing suggestion ID",
						suggestion
					);
					toast.error("Cannot apply suggestion: Missing ID");
					return false;
				}

				if (!resumeData?.id) {
					console.error("Cannot apply suggestion: Missing resume ID");
					toast.error("Cannot apply suggestion: Resume not found");
					return false;
				}

				console.log("Applying suggestion with unified state:", {
					resumeId: resumeData.id,
					suggestionId: suggestion.id,
					suggestion: suggestion.text,
					currentState: suggestion.isApplied,
					newState: !suggestion.isApplied,
				});

				// Use unified state handler
				handleApplySuggestion(suggestion.id, !suggestion.isApplied);
				return true;
			} else {
				console.error(
					"Invalid suggestion index:",
					index,
					"Max:",
					suggestions.length - 1
				);
				return false;
			}
		},
		[canEdit, suggestions, resumeData, handleApplySuggestion]
	);

	/**
	 * Enhanced save handler with unified state management
	 */
	const handleSaveWithUpdates = useCallback(
		async (content: string) => {
			// Use unified save method with atomic transaction
			const result = await saveResume(content, selectedTemplate);

			return result;
		},
		[saveResume, selectedTemplate]
	);

	/**
	 * Handle template selection with unified state validation
	 */
	const handleTemplateSelection = useCallback(
		(templateId: string) => {
			// Use state-calculated permission
			if (!canEdit) {
				toast.info("Switch to Edit mode to change templates");
				return;
			}

			if (templateId === selectedTemplate) {
				return;
			}

			const template = resumeTemplates.find((t) => t.id === templateId);

			// Use unified state handler
			updateSelectedTemplate(templateId);

			toast.success(`${template?.name || "Template"} selected`, {
				description: "Remember to save your changes to apply this template.",
			});
		},
		[canEdit, selectedTemplate, updateSelectedTemplate]
	);

	/**
	 * Handle edit mode change with unified state management
	 */
	const handleEditModeChange = useCallback(
		(newEditingState: boolean) => {
			console.log(
				`Edit mode change requested: ${isEditing} -> ${newEditingState}`
			);

			// Use the unified toggle function
			if (newEditingState !== isEditing) {
				toggleEditMode();
			}
		},
		[isEditing, toggleEditMode]
	);

	/**
	 * Default function for simulating keyword impact
	 */
	const simulateKeywordImpact = useCallback(
		(keywordText: string, resumeContent: string, currentScore: number) => {
			const baseImpact = 2;
			const randomVariation = Math.random() * 2;
			const pointImpact = Math.round(baseImpact + randomVariation);

			return {
				newScore: Math.min(100, currentScore + pointImpact),
				pointImpact,
				description: `Adding "${keywordText}" may improve your ATS score by approximately ${pointImpact} points.`,
			};
		},
		[]
	);

	// ===== ENHANCED DEBUG FUNCTIONS - NOW USING NEW HOOK SYSTEM =====

	/**
	 * Helper function to show toast with step info
	 */
	const showDebugToast = useCallback((stepName: string, success: boolean) => {
		if (success) {
			toast.success(`Debug: ${stepName} completed`, {
				description: "Check the debug panel for state changes",
				duration: 3000,
			});
		} else {
			toast.error(`Debug: ${stepName} failed`, {
				description: "Check console for error details",
				duration: 5000,
			});
		}
	}, []);

	/**
	 * Validate state before attempting simulation
	 */
	const validateDebugAction = useCallback(
		(actionName: string, requiredState?: string): boolean => {
			if (requiredState && currentState !== requiredState) {
				toast.warning(`Debug: Cannot ${actionName}`, {
					description: `Current state: ${currentState}. Required: ${requiredState}`,
					duration: 4000,
				});
				return false;
			}
			return true;
		},
		[currentState]
	);

	// ===== ENHANCED DEBUG HANDLERS USING NEW HOOK FUNCTIONS =====

	const handleDebugSelectFile = useCallback(() => {
		console.log("🎯 Debug: Starting file selection simulation");
		try {
			debug.simulateActions.selectFile();
			showDebugToast("File Selection", true);
		} catch (error) {
			console.error("Debug file selection failed:", error);
			showDebugToast("File Selection", false);
		}
	}, [debug.simulateActions.selectFile, showDebugToast]);

	const handleDebugStartUpload = useCallback(() => {
		if (!validateDebugAction("start upload", "awaiting_upload")) return;

		console.log("🎯 Debug: Starting upload simulation");
		try {
			debug.simulateActions.startUpload();
			showDebugToast("Upload Start", true);
		} catch (error) {
			console.error("Debug upload start failed:", error);
			showDebugToast("Upload Start", false);
		}
	}, [debug.simulateActions.startUpload, showDebugToast, validateDebugAction]);

	const handleDebugCompleteUpload = useCallback(() => {
		if (!validateDebugAction("complete upload", "uploading_file")) return;

		console.log("🎯 Debug: Completing upload simulation");
		try {
			debug.simulateActions.completeUpload();
			showDebugToast("Upload Complete", true);
		} catch (error) {
			console.error("Debug upload complete failed:", error);
			showDebugToast("Upload Complete", false);
		}
	}, [
		debug.simulateActions.completeUpload,
		showDebugToast,
		validateDebugAction,
	]);

	const handleDebugStartProcessing = useCallback(() => {
		if (!validateDebugAction("start processing", "file_upload_complete"))
			return;

		console.log("🎯 Debug: Starting processing simulation");
		try {
			debug.simulateActions.startProcessing();
			showDebugToast("Processing Start", true);
		} catch (error) {
			console.error("Debug processing start failed:", error);
			showDebugToast("Processing Start", false);
		}
	}, [
		debug.simulateActions.startProcessing,
		showDebugToast,
		validateDebugAction,
	]);

	const handleDebugCompleteProcessing = useCallback(() => {
		if (!validateDebugAction("complete processing", "processing_file")) return;

		console.log("🎯 Debug: Completing processing simulation");
		try {
			debug.simulateActions.completeProcessing();
			showDebugToast("Processing Complete", true);
		} catch (error) {
			console.error("Debug processing complete failed:", error);
			showDebugToast("Processing Complete", false);
		}
	}, [
		debug.simulateActions.completeProcessing,
		showDebugToast,
		validateDebugAction,
	]);

	const handleDebugStartAnalysis = useCallback(() => {
		if (!validateDebugAction("start analysis", "processing_file")) return;

		console.log("🎯 Debug: Starting analysis simulation");
		try {
			debug.simulateActions.startAnalysis();
			showDebugToast("Analysis Start", true);
		} catch (error) {
			console.error("Debug analysis start failed:", error);
			showDebugToast("Analysis Start", false);
		}
	}, [
		debug.simulateActions.startAnalysis,
		showDebugToast,
		validateDebugAction,
	]);

	const handleDebugCompleteAnalysis = useCallback(() => {
		if (!validateDebugAction("complete analysis", "analyzing_content")) return;

		console.log("🎯 Debug: Completing analysis simulation");
		try {
			debug.simulateActions.completeAnalysis();
			showDebugToast("Analysis Complete", true);
		} catch (error) {
			console.error("Debug analysis complete failed:", error);
			showDebugToast("Analysis Complete", false);
		}
	}, [
		debug.simulateActions.completeAnalysis,
		showDebugToast,
		validateDebugAction,
	]);

	const handleDebugSimulateError = useCallback(() => {
		console.log("🎯 Debug: Simulating error state");
		try {
			debug.simulateActions.simulateError();
			showDebugToast("Error Simulation", true);
		} catch (error) {
			console.error("Debug error simulation failed:", error);
			showDebugToast("Error Simulation", false);
		}
	}, [debug.simulateActions.simulateError, showDebugToast]);

	const handleDebugReset = useCallback(() => {
		console.log("🎯 Debug: Resetting to initial state");
		try {
			debug.simulateActions.resetToInitial();
			showDebugToast("Reset", true);
		} catch (error) {
			console.error("Debug reset failed:", error);
			showDebugToast("Reset", false);
		}
	}, [debug.simulateActions.resetToInitial, showDebugToast]);

	const handleDebugValidateState = useCallback(() => {
		console.log("🎯 Debug: Validating current state");
		try {
			const validation = debug.validateCurrentState();
			console.log("State validation result:", validation);

			if (validation.isValid) {
				toast.success("State validation passed", {
					description: "No issues found with current state",
					duration: 3000,
				});
			} else {
				toast.warning("State validation issues found", {
					description: `${validation.issues.length} issues detected. Check console.`,
					duration: 5000,
				});
			}
		} catch (error) {
			console.error("Debug state validation failed:", error);
			showDebugToast("State Validation", false);
		}
	}, [debug.validateCurrentState, showDebugToast]);

	const handleDebugLogFullState = useCallback(() => {
		console.log("🎯 Debug: Logging full state");
		console.group("📋 Full Debug State");
		console.log("Current State:", currentState);
		console.log("Context:", debug.context);
		console.log("Action History:", debug.actionHistory);
		console.log("Upload UI States:", uploadUIStates);
		console.log("Permissions:", {
			canAccessUpload,
			canAccessPreview,
			canEdit,
			canSave,
			canReset,
		});
		console.groupEnd();

		toast.info("Full state logged to console", {
			description: "Check browser console for complete state dump",
			duration: 3000,
		});
	}, [
		currentState,
		debug.context,
		debug.actionHistory,
		uploadUIStates,
		canAccessUpload,
		canAccessPreview,
		canEdit,
		canSave,
		canReset,
	]);

	// ===== RENDER - ENHANCED WITH NEW DEBUG SYSTEM =====

	return (
		<div className="py-8">
			{/* Reset Confirmation Dialog */}
			<ResetConfirmationDialog
				open={showResetDialog}
				onOpenChange={setShowResetDialog}
				onConfirm={handleCompleteReset}
				isResetting={isResetting}
			/>

			{/* Header section */}
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold">AI Resume Optimizer</h2>
				<p className="text-gray-500">
					Perfect your resume with AI-powered suggestions
				</p>
			</div>

			{/* Main tabs for CareerBoost workflow */}
			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="max-w-5xl mx-auto"
			>
				{/* Tab navigation with unified state validation */}
				<TabsList className="grid w-full grid-cols-2 mb-8">
					<TabsTrigger value="upload">Upload Resume</TabsTrigger>
					<TabsTrigger value="preview" disabled={!canAccessPreview}>
						Optimize & Preview
						{/* Loading indicator using unified state */}
						{isInProcessingState && (
							<span className="ml-2 inline-flex items-center">
								<svg
									className="animate-spin h-4 w-4"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
									/>
								</svg>
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				{/* Upload tab - Now uses integrated upload functionality */}
				<TabsContent value="upload" className="space-y-4">
					{/* Error state with retry functionality */}
					{isInErrorState && !validationErrors && (
						<ErrorState
							message={uploadStatus.errorMessage || "An error occurred"}
							canRetry={isRetryable}
							onRetry={retryLastOperation}
							currentStep={uploadStatus.currentStep}
						/>
					)}

					{/* Upload section with complete UploadThing integration */}
					{(!isInErrorState || validationErrors) && (
						<UploadSection
							uploadState={{
								isUploading,
								isProcessingFile,
								isAnalyzing,
								selectedFile,
								resumeTextContent,
								uploadProgress,
								isDragOver,
								canUploadFile,
								canInputText,
								isActiveUpload,
								uploadThingInProgress,
								uploadThingFiles,
								validationErrors,
								uploadMethod,
							}}
							uploadActions={{
								onFileSelect: handleFileSelect,
								onFileUpload: handleFileUpload,
								onTextContentChange: handleTextContentChange,
								onTextUpload: handleTextUpload,
								onDragOver: handleDragOver,
								onUploadThingBegin: handleUploadThingBegin,
								onUploadThingComplete: handleUploadThingComplete,
								onUploadThingError: handleUploadThingError,
								onSetUploadThingActive: setUploadThingActive,
								clearValidationErrors,
							}}
							uploadStatus={uploadStatus}
							uploadUIStates={uploadUIStates}
							onTabSwitch={setActiveTab}
							isInLoadingState={isInLoadingState}
							isInErrorState={isInErrorState}
						/>
					)}
				</TabsContent>

				{/* Preview tab - Resume optimization and preview */}
				<TabsContent value="preview" className="space-y-6">
					{/* Conditional rendering based on unified state */}
					{isInLoadingState ? (
						<LoadingState />
					) : isInErrorState ? (
						<ErrorState
							message={uploadStatus.errorMessage || "An error occurred"}
							canRetry={isRetryable}
							onRetry={retryLastOperation}
							currentStep={uploadStatus.currentStep}
						/>
					) : !currentDisplayContent && !optimizedText ? (
						<EmptyPreviewState onGoToUpload={() => setActiveTab("upload")} />
					) : (
						<>
							{/* Main content area with responsive layout */}
							<div className="grid md:grid-cols-5 gap-6">
								{/* Resume preview section */}
								<div className="col-span-3">
									<ResumePreview
										// Content props
										optimizedText={currentDisplayContent || optimizedText}
										originalOptimizedText={optimizedText}
										// Template and display
										selectedTemplate={selectedTemplate}
										templates={resumeTemplates}
										appliedKeywords={getAppliedKeywords()}
										suggestions={suggestions}
										// Action callbacks
										onDownload={handleDownload}
										onSave={handleSaveWithUpdates}
										onTextChange={handleContentEdit}
										onReset={() => setShowResetDialog(true)}
										// State props using unified state
										isOptimizing={isAnalyzing}
										isApplyingChanges={isSaving}
										language={resumeData?.language || "English"}
										resumeData={resumeData || undefined}
										// Unified edit mode management
										isEditing={isEditing}
										onEditModeChange={handleEditModeChange}
										// Modification flags
										scoreModified={scoreModified}
										templateModified={templateModified}
										// Multilingual section titles support
										sectionTitles={sectionTitles}
										resumeLanguage={
											resumeLanguage || resumeData?.language || "English"
										}
									/>
								</div>

								{/* Sidebar with optimization controls */}
								<div className="col-span-2 flex flex-col gap-4">
									{/* ATS Score card */}
									<ScoreCard
										optimizationScore={currentAtsScore || originalAtsScore || 0}
										resumeContent={currentDisplayContent || optimizedText}
										suggestionsApplied={
											suggestions.filter((s) => s.isApplied).length
										}
										keywordsApplied={keywords.filter((k) => k.isApplied).length}
										scoreBreakdown={null}
										potentialScore={100}
										initialScore={originalAtsScore || 65}
										isCalculating={isAnalyzing}
									/>

									{/* AI Suggestions list */}
									<SuggestionsList
										suggestions={suggestions}
										isOptimizing={isAnalyzing}
										onApplySuggestion={handleApplySuggestionAdapter}
										resumeContent={currentDisplayContent || optimizedText}
										currentScore={currentAtsScore || originalAtsScore || 0}
										isEditing={isEditing}
									/>

									{/* Keywords list */}
									<KeywordsList
										keywords={keywords.map((k) => ({
											...k,
											applied: k.isApplied, // Add compatibility property
										}))}
										onKeywordApply={handleKeywordApplyAdapter}
										showImpactDetails={true}
										currentScore={currentAtsScore || originalAtsScore || 0}
										isEditing={isEditing}
										simulateKeywordImpact={simulateKeywordImpact}
									/>

									{/* Template selection gallery */}
									<TemplateGallery
										templates={resumeTemplates}
										selectedTemplate={selectedTemplate}
										onTemplateSelect={handleTemplateSelection}
										isEditing={isEditing}
									/>
								</div>
							</div>
						</>
					)}
				</TabsContent>
			</Tabs>

			{/* ENHANCED DEBUG PANEL - NOW WITH COMPLETE WORKFLOW COVERAGE */}
			{/* ENHANCED DEBUG PANEL - NOW WITH COMPLETE WORKFLOW COVERAGE */}
			{process.env.NODE_ENV === "development" && (
				<div className="mt-8 bg-gray-50 border rounded-lg">
					{/* Debug Panel Header */}
					<div
						className="p-4 bg-gray-100 rounded-t-lg cursor-pointer hover:bg-gray-200 transition-colors"
						onClick={() => setIsDebugExpanded(!isDebugExpanded)}
					>
						<div className="flex items-center justify-between">
							<h3 className="font-bold text-gray-800">
								🔧 Enhanced Debug Panel (Development Only)
							</h3>
							<div className="flex items-center gap-2">
								<span className="text-sm text-gray-600">
									State: {currentState}
								</span>
								<span
									className={`transform transition-transform ${
										isDebugExpanded ? "rotate-180" : ""
									}`}
								>
									▼
								</span>
							</div>
						</div>
					</div>

					{/* Debug Panel Content - Collapsible */}
					{isDebugExpanded && (
						<div className="p-4 space-y-6">
							{/* Current State Information */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								<div className="bg-white p-4 rounded border">
									<h4 className="font-semibold mb-3 text-blue-800">
										📊 Current State Info
									</h4>
									<div className="text-sm space-y-2">
										<div className="flex justify-between">
											<span className="font-medium">Current State:</span>
											<span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono text-xs">
												{currentState}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Active Tab:</span>
											<span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
												{activeTab}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Can Access Preview:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													canAccessPreview ? "bg-green-500" : "bg-red-500"
												}`}
											>
												{canAccessPreview.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Can Edit:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													canEdit ? "bg-green-500" : "bg-red-500"
												}`}
											>
												{canEdit.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Is In Loading State:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													isInLoadingState ? "bg-orange-500" : "bg-gray-500"
												}`}
											>
												{isInLoadingState.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Is In Error State:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													isInErrorState ? "bg-red-500" : "bg-green-500"
												}`}
											>
												{isInErrorState.toString()}
											</span>
										</div>
									</div>
								</div>

								<div className="bg-white p-4 rounded border">
									<h4 className="font-semibold mb-3 text-green-800">
										📤 Upload State Info
									</h4>
									<div className="text-sm space-y-2">
										<div className="flex justify-between">
											<span className="font-medium">Upload Progress:</span>
											<span className="bg-blue-100 px-2 py-1 rounded text-blue-800">
												{uploadProgress}%
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Current Step:</span>
											<span
												className="bg-gray-100 px-2 py-1 rounded text-gray-700 text-xs max-w-32 truncate"
												title={uploadStatus.currentStep}
											>
												{uploadStatus.currentStep}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Is Active Upload:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													isActiveUpload ? "bg-orange-500" : "bg-gray-500"
												}`}
											>
												{isActiveUpload?.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Selected File:</span>
											<span
												className="bg-gray-100 px-2 py-1 rounded text-gray-700 text-xs max-w-32 truncate"
												title={selectedFile?.name}
											>
												{selectedFile?.name || "None"}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Has Resume Data:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													!!resumeData ? "bg-green-500" : "bg-red-500"
												}`}
											>
												{(!!resumeData).toString()}
											</span>
										</div>
									</div>
								</div>

								{/* NEW: Edit State Info */}
								<div className="bg-white p-4 rounded border">
									<h4 className="font-semibold mb-3 text-purple-800">
										✏️ Edit State Info
									</h4>
									<div className="text-sm space-y-2">
										<div className="flex justify-between">
											<span className="font-medium">Is Editing:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													isEditing ? "bg-purple-500" : "bg-gray-500"
												}`}
											>
												{isEditing?.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Content Modified:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													context.contentModified
														? "bg-orange-500"
														: "bg-gray-500"
												}`}
											>
												{context.contentModified?.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Score Modified:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													context.scoreModified
														? "bg-orange-500"
														: "bg-gray-500"
												}`}
											>
												{context.scoreModified?.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Template Modified:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													context.templateModified
														? "bg-orange-500"
														: "bg-gray-500"
												}`}
											>
												{context.templateModified?.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Has Unsaved Changes:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													hasUnsavedChanges() ? "bg-red-500" : "bg-green-500"
												}`}
											>
												{hasUnsavedChanges().toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Can Save:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													canSave ? "bg-green-500" : "bg-gray-500"
												}`}
											>
												{canSave?.toString()}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="font-medium">Can Reset:</span>
											<span
												className={`px-2 py-1 rounded text-white text-xs ${
													canReset ? "bg-green-500" : "bg-gray-500"
												}`}
											>
												{canReset?.toString()}
											</span>
										</div>
									</div>
								</div>
							</div>

							{/* Enhanced Step-by-Step Controls - COMPLETELY REORGANIZED */}
							<div className="bg-white p-4 rounded border">
								<h4 className="font-semibold mb-3 text-purple-800">
									🎮 Complete Workflow Debug Controls
								</h4>
								<p className="text-sm text-gray-600 mb-4">
									Simulate every step of the CareerBoost workflow. Buttons are
									automatically enabled/disabled based on current state.
								</p>

								{/* WORKFLOW 1: Upload & Analysis */}
								<div className="space-y-4 mb-6">
									<div className="flex items-center gap-2 text-sm">
										<span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
											1
										</span>
										<span className="font-medium text-blue-700">
											Upload & Analysis Workflow
										</span>
									</div>
									<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 ml-8">
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_FILE_SELECT")
											}
											className="bg-blue-500 text-white px-3 py-2 rounded text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Select File
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_UPLOAD_START")
											}
											className="bg-green-500 text-white px-3 py-2 rounded text-xs hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Start Upload
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_UPLOAD_COMPLETE")
											}
											className="bg-emerald-500 text-white px-3 py-2 rounded text-xs hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Complete Upload
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_PROCESSING_START")
											}
											className="bg-yellow-500 text-white px-3 py-2 rounded text-xs hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Start Processing
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_PROCESSING_COMPLETE")
											}
											className="bg-orange-500 text-white px-3 py-2 rounded text-xs hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Complete Processing
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_ANALYSIS_COMPLETE")
											}
											className="bg-indigo-500 text-white px-3 py-2 rounded text-xs hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Complete Analysis
										</button>
									</div>
								</div>

								{/* WORKFLOW 2: Edit Mode */}
								<div className="space-y-4 mb-6">
									<div className="flex items-center gap-2 text-sm">
										<span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
											2
										</span>
										<span className="font-medium text-purple-700">
											Edit Mode Workflow
										</span>
									</div>
									<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 ml-8">
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_ENTER_EDIT_MODE")
											}
											className="bg-purple-500 text-white px-3 py-2 rounded text-xs hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Can edit: ${canEdit}, Is editing: ${isEditing}`}
										>
											Enter Edit Mode
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_UPDATE_CONTENT")
											}
											className="bg-pink-500 text-white px-3 py-2 rounded text-xs hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Is editing: ${isEditing}`}
										>
											Update Content
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_UPDATE_SECTION")
											}
											className="bg-rose-500 text-white px-3 py-2 rounded text-xs hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Is editing: ${isEditing}`}
										>
											Update Section
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_UPDATE_TEMPLATE")
											}
											className="bg-violet-500 text-white px-3 py-2 rounded text-xs hover:bg-violet-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Is editing: ${isEditing}`}
										>
											Change Template
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_APPLY_SUGGESTION")
											}
											className="bg-cyan-500 text-white px-3 py-2 rounded text-xs hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={!suggestions.length}
											title={`Suggestions available: ${suggestions.length}`}
										>
											Apply Suggestion
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_APPLY_KEYWORD")
											}
											className="bg-teal-500 text-white px-3 py-2 rounded text-xs hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={!keywords.length}
											title={`Keywords available: ${keywords.length}`}
										>
											Apply Keyword
										</button>
									</div>
								</div>

								{/* WORKFLOW 3: Save Operations */}
								<div className="space-y-4 mb-6">
									<div className="flex items-center gap-2 text-sm">
										<span className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
											3
										</span>
										<span className="font-medium text-green-700">
											Save Workflow
										</span>
									</div>
									<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 ml-8">
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_START_SAVING")
											}
											className="bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Can save: ${canSave}`}
										>
											Start Saving
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_SAVE_SUCCESS")
											}
											className="bg-emerald-600 text-white px-3 py-2 rounded text-xs hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Save Success
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_SAVE_ERROR")
											}
											className="bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Save Error
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_EXIT_EDIT_MODE")
											}
											className="bg-gray-600 text-white px-3 py-2 rounded text-xs hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Is editing: ${isEditing}`}
										>
											Exit Edit Mode
										</button>
									</div>
								</div>

								{/* WORKFLOW 4: Reset Operations */}
								<div className="space-y-4 mb-6">
									<div className="flex items-center gap-2 text-sm">
										<span className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
											4
										</span>
										<span className="font-medium text-red-700">
											Reset Workflow
										</span>
									</div>
									<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 ml-8">
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_START_RESET")
											}
											className="bg-red-600 text-white px-3 py-2 rounded text-xs hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Can reset: ${canReset}`}
										>
											Start Reset
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_RESET_SUCCESS")
											}
											className="bg-orange-600 text-white px-3 py-2 rounded text-xs hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Reset Success
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_RESET_ERROR")
											}
											className="bg-red-800 text-white px-3 py-2 rounded text-xs hover:bg-red-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Current state: ${currentState}`}
										>
											Reset Error
										</button>
									</div>
								</div>

								{/* WORKFLOW 5: Navigation & Utilities */}
								<div className="space-y-4">
									<div className="flex items-center gap-2 text-sm">
										<span className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
											5
										</span>
										<span className="font-medium text-gray-700">
											Navigation & Utilities
										</span>
									</div>
									<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 ml-8">
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_SWITCH_TO_UPLOAD")
											}
											className="bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 transition-colors"
										>
											📤 Upload Tab
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_SWITCH_TO_PREVIEW")
											}
											className="bg-indigo-600 text-white px-3 py-2 rounded text-xs hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Can access preview: ${canAccessPreview}`}
										>
											👁️ Preview Tab
										</button>
										<button
											onClick={() =>
												debug.simulateAction("SIMULATE_CLEAR_ERROR")
											}
											className="bg-yellow-600 text-white px-3 py-2 rounded text-xs hover:bg-yellow-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
											disabled={false}
											title={`Is in error state: ${isInErrorState}`}
										>
											✅ Clear Error
										</button>
										<button
											onClick={() => debug.simulateAction("SIMULATE_ERROR")}
											className="bg-red-500 text-white px-3 py-2 rounded text-xs hover:bg-red-600 transition-colors"
										>
											❌ Simulate Error
										</button>
										<button
											onClick={() => debug.simulateAction("SIMULATE_RESET")}
											className="bg-gray-500 text-white px-3 py-2 rounded text-xs hover:bg-gray-600 transition-colors"
										>
											🔄 Reset All
										</button>
										<button
											onClick={handleDebugValidateState}
											className="bg-teal-500 text-white px-3 py-2 rounded text-xs hover:bg-teal-600 transition-colors"
										>
											✅ Validate State
										</button>
									</div>
								</div>
							</div>

							{/* Action History */}
							<div className="bg-white p-4 rounded border">
								<h4 className="font-semibold mb-3 text-indigo-800">
									📋 Recent Action History
								</h4>
								<div className="max-h-40 overflow-y-auto">
									{debug.actionHistory && debug.actionHistory.length > 0 ? (
										<div className="space-y-1">
											{debug.actionHistory
												.slice(-10)
												.reverse()
												.map((entry, index) => (
													<div
														key={index}
														className="text-xs bg-gray-50 p-2 rounded border-l-4 border-indigo-500"
													>
														<div className="flex justify-between items-start">
															<span className="font-mono text-indigo-600">
																{entry.action.type}
															</span>
															<span className="text-gray-500">
																{new Date(entry.timestamp).toLocaleTimeString()}
															</span>
														</div>
														<div className="flex justify-between text-gray-600 mt-1">
															<span>
																{entry.fromState} → {entry.toState}
															</span>
															<span
																className={`px-1 rounded ${
																	entry.success
																		? "bg-green-100 text-green-800"
																		: "bg-red-100 text-red-800"
																}`}
															>
																{entry.success ? "✓" : "✗"}
															</span>
														</div>
														{entry.error && (
															<div className="text-red-600 mt-1 text-xs">
																Error: {entry.error}
															</div>
														)}
													</div>
												))}
										</div>
									) : (
										<p className="text-gray-500 text-sm italic">
											No actions recorded yet
										</p>
									)}
								</div>
							</div>

							{/* Next Valid States */}
							<div className="bg-white p-4 rounded border">
								<h4 className="font-semibold mb-3 text-green-800">
									🎯 Available Transitions
								</h4>
								<div className="text-sm">
									{debug.getNextValidStates &&
									debug.getNextValidStates().length > 0 ? (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
											{debug.getNextValidStates().map((stateInfo, index) => (
												<div
													key={index}
													className="bg-green-50 p-2 rounded border border-green-200"
												>
													<div className="font-mono text-green-700 text-xs">
														{stateInfo.state}
													</div>
													<div className="text-green-600 text-xs mt-1">
														{stateInfo.description}
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-gray-500 italic">
											No valid transitions available
										</p>
									)}
								</div>
							</div>

							{/* Upload UI States Detail */}
							<div className="bg-white p-4 rounded border">
								<h4 className="font-semibold mb-3 text-orange-800">
									🎛️ Upload UI States Detail
								</h4>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="text-xs bg-gray-50 p-3 rounded border font-mono">
										<div className="font-bold mb-2 text-gray-700">
											Button States:
										</div>
										<div className="space-y-1">
											<div>
												shouldHideUploadButton:{" "}
												<span
													className={
														uploadUIStates?.shouldHideUploadButton
															? "text-red-600"
															: "text-green-600"
													}
												>
													{uploadUIStates?.shouldHideUploadButton?.toString()}
												</span>
											</div>
											<div>
												allowNewUpload:{" "}
												<span
													className={
														uploadUIStates?.allowNewUpload
															? "text-green-600"
															: "text-red-600"
													}
												>
													{uploadUIStates?.allowNewUpload?.toString()}
												</span>
											</div>
											<div>
												allowTextInput:{" "}
												<span
													className={
														uploadUIStates?.allowTextInput
															? "text-green-600"
															: "text-red-600"
													}
												>
													{uploadUIStates?.allowTextInput?.toString()}
												</span>
											</div>
										</div>
									</div>
									<div className="text-xs bg-gray-50 p-3 rounded border font-mono">
										<div className="font-bold mb-2 text-gray-700">
											UI States:
										</div>
										<div className="space-y-1">
											<div>
												isUIFrozen:{" "}
												<span
													className={
														uploadUIStates?.isUIFrozen
															? "text-red-600"
															: "text-green-600"
													}
												>
													{uploadUIStates?.isUIFrozen?.toString()}
												</span>
											</div>
											<div>
												canInteractWithUI:{" "}
												<span
													className={
														uploadUIStates?.canInteractWithUI
															? "text-green-600"
															: "text-red-600"
													}
												>
													{uploadUIStates?.canInteractWithUI?.toString()}
												</span>
											</div>
											<div>
												showUploadingAnimation:{" "}
												<span
													className={
														uploadUIStates?.showUploadingAnimation
															? "text-orange-600"
															: "text-gray-600"
													}
												>
													{uploadUIStates?.showUploadingAnimation?.toString()}
												</span>
											</div>
											<div>
												showProcessingAnimation:{" "}
												<span
													className={
														uploadUIStates?.showProcessingAnimation
															? "text-orange-600"
															: "text-gray-600"
													}
												>
													{uploadUIStates?.showProcessingAnimation?.toString()}
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Full Debug Object Inspector */}
							<div className="bg-white p-4 rounded border">
								<h4 className="font-semibold mb-3 text-gray-800">
									🔍 Debug Object Inspector
								</h4>
								<details className="text-xs">
									<summary className="cursor-pointer hover:text-blue-600 font-medium mb-2">
										Click to expand full debug object (Warning: Large data)
									</summary>
									<div className="bg-gray-50 p-3 rounded border max-h-60 overflow-auto font-mono">
										<pre>
											{JSON.stringify(
												debug,
												(key, value) => {
													// Exclude circular references and functions
													if (typeof value === "function") return "[Function]";
													if (key === "dispatch") return "[Dispatch Function]";
													return value;
												},
												2
											)}
										</pre>
									</div>
								</details>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ResumeOptimizer;
