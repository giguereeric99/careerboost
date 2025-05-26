/**
 * ResumeOptimizer Component - COMPLETELY REFACTORED FOR NEW ARCHITECTURE
 *
 * Main component that manages the resume optimization workflow.
 * Uses custom hooks for separation of concerns between uploading and editing.
 *
 * MAJOR UPDATES FOR NEW ARCHITECTURE:
 * - Updated to work with refactored useResumeOptimizer hook
 * - Fixed all TypeScript errors by using correct property names
 * - Simplified state management with centralized edit mode
 * - Compatible with temporary content preservation system
 * - Enhanced props passing to ResumePreview component
 * - Maintained all original functionality while improving stability
 */

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Import UI components
import UploadSection from "@/components/ResumeOptimizerSection/uploadSection";
import ResumePreview from "@/components/ResumeOptimizerSection/resumePreview";
import ScoreCard from "@/components/ResumeOptimizerSection/scoreCard";
import SuggestionsList from "@/components/ResumeOptimizerSection/suggestionsList";
import KeywordsList from "@/components/ResumeOptimizerSection/keywordsList";
import TemplateGallery from "@/components/ResumeOptimizerSection/templateGallery";
import ResetConfirmationDialog from "@/components/Dialogs/resetConfirmationDialog";
import LoadingState from "@/components/ResumeOptimizerSection/loadingState";
import EmptyPreviewState from "@/components/ResumeOptimizerSection/emptyPreviewState";
import { resumeTemplates } from "@/constants/resumeTemplates";

// Import custom hooks for state management
import useResumeOptimizer from "@/hooks/optimizer/useResumeOptimizer";
import useUploadSection from "@/hooks/optimizer/useUploadSection";

// Import types for type safety
import { Suggestion, Keyword, OptimizedResumeData } from "@/types/resumeTypes";
import { SuggestionImpact } from "@/types/suggestionTypes";

/**
 * EmptyPreviewStateProps interface
 * Props for the empty state component when no resume is available
 */
interface EmptyPreviewStateProps {
  onGoToUpload: () => void; // Action to navigate to upload section
}

/**
 * Normalizes a suggestion object to ensure consistent structure
 * Handles different property naming conventions and ensures IDs exist
 *
 * @param suggestion - Suggestion to normalize
 * @param index - Index for fallback ID generation
 * @returns Normalized suggestion with consistent property names
 */
function normalizeSuggestion(suggestion: any, index: number): Suggestion {
  // Generate debug output for suggestions without ID
  if (!suggestion.id) {
    console.warn(`Suggestion without ID at index ${index}:`, suggestion);
  }

  return {
    // Ensure ID exists with fallbacks
    id:
      suggestion.id ||
      suggestion.suggestion_id ||
      `suggestion-${index}-${Date.now()}`,
    // Ensure text property exists
    text: suggestion.text || suggestion.original_text || "",
    // Provide defaults for optional properties
    type: suggestion.type || "general",
    impact: suggestion.impact || "",
    // Handle both naming conventions
    isApplied: suggestion.isApplied || suggestion.is_applied || false,
    // Include pointImpact for score calculations
    pointImpact: suggestion.pointImpact || suggestion.point_impact || 2,
  };
}

/**
 * Normalizes a keyword object to ensure consistent structure
 * Handles different property naming conventions and formats
 *
 * @param keyword - Keyword to normalize (string or object)
 * @param index - Index for fallback ID generation
 * @returns Normalized keyword with consistent property names
 */
function normalizeKeyword(keyword: any, index: number): Keyword {
  // Handle case where keyword is just a string
  if (typeof keyword === "string") {
    return {
      id: `keyword-${index}-${Date.now()}`,
      text: keyword,
      isApplied: false,
      relevance: 1,
      pointImpact: 1,
    };
  }

  // Generate debug output for keywords without ID
  if (!keyword.id) {
    console.warn(`Keyword object without ID at index ${index}:`, keyword);
  }

  // Handle keyword as an object with potential varying property names
  return {
    id: keyword.id || keyword.keyword_id || `keyword-${index}-${Date.now()}`,
    text: keyword.text || keyword.keyword || "",
    // Support all possible variations of the applied property
    isApplied:
      keyword.isApplied || keyword.is_applied || keyword.applied || false,
    relevance: keyword.relevance || 1,
    pointImpact: keyword.pointImpact || keyword.point_impact || 1,
  };
}

/**
 * ResumeOptimizer Component - REFACTORED FOR NEW ARCHITECTURE
 * Handles the complete lifecycle of resume optimization including:
 * - File upload and content extraction
 * - AI optimization
 * - Rendering preview with template selection
 * - Managing suggestions and keywords with centralized state
 * - Saving and resetting user changes
 */
const ResumeOptimizer: React.FC = () => {
  // Get user authentication state from Clerk
  const { user } = useUser();

  // Ref to track previous loading state for tab navigation and UI updates
  const previousIsLoading = useRef(false);

  // State to track if welcome toast has been shown
  const welcomeToastShownRef = useRef(false);

  // ===== USE THE REFACTORED HOOK WITH NEW PROPERTIES =====

  // Use the main optimizer hook to handle resume optimization state and actions
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

    // ===== CENTRALIZED EDITING STATE =====
    isEditing, // NEW: centralized edit mode
    tempEditedContent, // NEW: temporary content during editing
    tempSections, // NEW: stable sections during editing
    hasTempChanges, // NEW: tracks temporary modifications

    // ===== COMPUTED STATE =====
    currentDisplayContent, // NEW: computed display content
    currentSections, // NEW: computed sections based on mode

    // ===== MODIFICATION FLAGS =====
    contentModified,
    scoreModified,
    templateModified,

    // ===== LOADING STATES =====
    isLoading,
    isSaving,
    isResetting,

    // ===== CORE ACTIONS =====
    setActiveTab,
    toggleEditMode, // NEW: centralized edit mode toggle
    loadLatestResume,
    saveResume,
    resetResume,

    // ===== EDITING ACTIONS =====
    handleContentEdit,
    handleSectionEdit, // NEW: section-specific editing
    handleApplySuggestion,
    handleKeywordApply,
    updateResumeWithOptimizedData,
    updateSelectedTemplate,

    // ===== UTILITY FUNCTIONS =====
    getAppliedKeywords,
    hasUnsavedChanges,
    calculateCompletionScore,
    shouldEnableSaveButton,

    // ===== DIRECT STATE SETTERS (limited access) =====
    setOptimizedText,
    setCurrentAtsScore,
    setSuggestions,
    setKeywords,
    setContentModified,
    setScoreModified,
    setSelectedTemplate,
    setTemplateModified,
  } = useResumeOptimizer(user?.id);

  // Use the upload section hook to handle file upload and initial optimization
  const {
    // State
    selectedFile, // Selected file for upload
    resumeContent, // Extracted content from file
    isUploading, // Uploading file in progress
    isOptimizing, // AI optimization in progress

    // Actions
    setSelectedFile, // Set selected file
    handleContentChange, // Handle content changes in upload
    handleFileUpload, // Handle file upload process
    processUploadedFile, // Process uploaded file
    handleTextAnalysis, // Send content for AI analysis
  } = useUploadSection({
    // Pass the callback to receive optimization data after completion
    onOptimizationComplete: (
      optimizedText,
      resumeId,
      atsScore,
      suggestionsData,
      keywordsData
    ) => {
      console.log("🎉 Optimization complete, processing results:", {
        resumeId,
        atsScore,
        suggestionsCount: suggestionsData?.length || 0,
        keywordsCount: keywordsData?.length || 0,
      });

      // Normalize suggestions to ensure consistent structure
      const normalizedSuggestions = Array.isArray(suggestionsData)
        ? suggestionsData.map(normalizeSuggestion)
        : [];

      // Normalize keywords to ensure consistent structure
      const normalizedKeywords = Array.isArray(keywordsData)
        ? keywordsData.map(normalizeKeyword)
        : [];

      console.log("✅ Normalized data for UI:", {
        suggestionsNormalized: normalizedSuggestions.length,
        keywordsNormalized: normalizedKeywords.length,
      });

      // Update the main state with optimization results
      updateResumeWithOptimizedData(
        optimizedText || "",
        resumeId || "",
        atsScore || 65,
        normalizedSuggestions,
        normalizedKeywords
      );

      // Change tab after processing is complete
      setActiveTab("preview");

      // Show success toast
      toast.success("Resume optimized successfully!", {
        description: "Your resume has been analyzed and improved by our AI.",
        duration: 5000,
      });
    },
  });

  // ===== LOCAL UI STATE =====

  // State for managing loading display during analysis
  const [showLoadingState, setShowLoadingState] = useState(false);

  // State for reset confirmation dialog
  const [showResetDialog, setShowResetDialog] = useState(false);

  /**
   * Centralized function to handle UI updates after loading
   * Handles tab navigation, loading state, and welcome toasts in one place
   */
  const handleLoadingStateChange = useCallback(() => {
    // Check if loading just finished (was loading before, not loading now)
    const loadingJustFinished = !isLoading && previousIsLoading.current;

    // Update previous loading state for next render
    previousIsLoading.current = isLoading;

    // If loading didn't just finish, nothing to do
    if (!loadingJustFinished) return;

    // Automatic tab navigation based on resume data
    if (hasResume && (currentDisplayContent || optimizedText)) {
      // If we have resume data, switch to preview tab
      setActiveTab("preview");
      console.log("🎯 Auto-switching to preview tab after loading");

      toast.success("Last resume loaded successfully!", {
        description:
          "You can continue optimizing your resume or upload a new one.",
        duration: 5000,
      });
    } else {
      // If no resume data, stay on upload tab
      setActiveTab("upload");
      console.log("📁 Staying on upload tab - no resume found");

      toast.info("Welcome to CareerBoost!", {
        description: "Upload your resume to get started with AI optimization.",
        duration: 7000,
      });
    }
  }, [
    isLoading,
    hasResume,
    currentDisplayContent,
    optimizedText,
    setActiveTab,
  ]);

  /**
   * Handle tab change with data loading if needed
   * Prevents tab switching during processing and loads data when required
   *
   * @param value - Tab value to switch to
   */
  const handleTabChange = useCallback(
    (value: string) => {
      // Prevent switching to preview if analysis in progress
      if (value === "preview" && (isUploading || isOptimizing || isLoading)) {
        toast.info("Please wait until analysis is complete");
        return;
      }

      setActiveTab(value);

      // When switching to preview tab, load the latest resume data if needed
      if (value === "preview" && user?.id && !currentDisplayContent) {
        loadLatestResume();
        console.log("🔄 Loading latest resume data");
      }
    },
    [
      user?.id,
      isUploading,
      isOptimizing,
      isLoading,
      loadLatestResume,
      currentDisplayContent,
      setActiveTab,
    ]
  );

  /**
   * Handle analysis start - show loading state
   * Called when the AI optimization process begins
   */
  const handleAnalysisStart = useCallback(() => {
    setShowLoadingState(true);
  }, []);

  /**
   * Calculate if preview tab should be disabled
   * Prevents access during processing states
   */
  const isPreviewTabDisabled =
    isLoading || isUploading || isOptimizing || showLoadingState;

  /**
   * Get current ATS score to display
   * Uses current score if available, falls back to original score
   */
  const atsScore =
    currentAtsScore !== null ? currentAtsScore : originalAtsScore;

  /**
   * Get array of applied keywords for templates
   * Uses the utility function from the hook
   */
  const appliedKeywordsArray = getAppliedKeywords();

  /**
   * Centralized reset handler to ensure all components are synchronized
   * Handles the reset confirmation and execution
   */
  const handleCompleteReset = useCallback(() => {
    // Hide confirmation dialog
    setShowResetDialog(false);

    // Call the reset function from the hook
    resetResume().then((success) => {
      if (success) {
        console.log(
          "✅ Reset completed successfully - all components synchronized"
        );
      }
    });
  }, [resetResume]);

  /**
   * Handle resume download
   * Creates an HTML file with the current content and selected template
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
      <title>Resume</title>
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
    a.download = "resume.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Resume downloaded successfully");
  }, [currentDisplayContent, optimizedText, selectedTemplate]);

  /**
   * Maps the database-format suggestions to component-format suggestions
   * Ensures each suggestion has required properties including ID
   */
  const mappedSuggestions = suggestions.map((s, index) => {
    // Log warning for suggestions without ID
    if (!s.id) {
      console.warn(`Suggestion without ID in mapping (index ${index}):`, s);
    }

    return {
      // Ensure ID with fallback
      id: s.id || `mapped-suggestion-${index}-${Date.now()}`,
      text: s.text || "",
      type: s.type || "general",
      impact: s.impact || "",
      // Handle both naming conventions
      isApplied: s.isApplied || false,
      pointImpact: s.pointImpact || 2,
    };
  });

  /**
   * Maps the database-format keywords to component-format keywords
   * Adding the 'applied' property required by KeywordsList component
   */
  const mappedKeywords = keywords.map((k, index) => {
    // Log warning for keywords without ID
    if (!k.id) {
      console.warn(`Keyword without ID in mapping (index ${index}):`, k);
    }

    return {
      // Ensure ID with fallback
      id: k.id || `mapped-keyword-${index}-${Date.now()}`,
      text: k.text || "",
      isApplied: k.isApplied || false,
      // Add the 'applied' property required by the component
      applied: k.isApplied || false,
      relevance: k.relevance || 1,
      pointImpact: k.pointImpact || 1,
    };
  });

  /**
   * Enhanced adapter function for applying keywords
   * Updates only local state without saving to database immediately
   * Uses the exact point impact from the keyword for accurate score updates
   *
   * @param index - Index of keyword in the array
   */
  const handleKeywordApplyAdapter = useCallback(
    (index: number) => {
      console.log(`🏷️ handleKeywordApplyAdapter called with index ${index}`);

      // Only proceed with keyword application if in edit mode
      if (isEditing && index >= 0 && index < mappedKeywords.length) {
        const keyword = mappedKeywords[index];

        console.log(`🏷️ Applying keyword (local only):`, keyword);

        // Handle missing ID with warning
        if (!keyword.id) {
          console.warn(`Keyword at index ${index} has no ID:`, keyword);
          toast.error("Cannot apply keyword: Missing ID");
          return;
        }

        // Get the exact point impact from the keyword, with fallback to default
        const exactPointImpact = keyword.pointImpact || 1;

        // Log the operation with impact details
        console.log("🎯 Applying keyword with impact:", {
          keywordId: keyword.id,
          keyword: keyword.text,
          pointImpact: exactPointImpact,
          currentScore: atsScore,
        });

        // Apply the keyword using the hook's handler - now only updates local state
        handleKeywordApply(keyword.id, !keyword.isApplied);

        // Explicitly mark score as modified when applying keyword
        setScoreModified(true);
        setContentModified(true);
      } else if (!isEditing) {
        // Notify user that editing is required to apply keywords
        toast.info("Enter edit mode to apply keywords");
      } else {
        console.error(
          `❌ Invalid keyword index: ${index}. Max: ${
            mappedKeywords.length - 1
          }`
        );
      }
    },
    [
      isEditing,
      mappedKeywords,
      atsScore,
      handleKeywordApply,
      setScoreModified,
      setContentModified,
    ]
  );

  /**
   * Adapter function for simulate keyword impact
   * Returns the expected impact object structure with accurate values
   *
   * @param index - Index of keyword in array
   * @returns Impact calculation object
   */
  // const simulateKeywordImpactAdapter = useCallback(
  //   (index: number) => {
  //     // Find the keyword to get its exact point impact
  //     const keyword =
  //       index >= 0 && index < mappedKeywords.length
  //         ? mappedKeywords[index]
  //         : null;

  //     // Use the exact point impact from the keyword if available, or fallback to default
  //     const pointImpact = keyword?.pointImpact || 1;

  //     // Use current score as base, fallback to original score or default
  //     const currentScore = atsScore || originalAtsScore || 65;

  //     // Calculate new score capped at 100
  //     const newScore = Math.min(100, currentScore + pointImpact);

  //     // Log the calculation for debugging
  //     console.log(
  //       `📊 Simulating keyword impact: ${currentScore} + ${pointImpact} = ${newScore}`
  //     );

  //     // Return the expected object structure with accurate values
  //     return {
  //       newScore,
  //       pointImpact,
  //       description: `Adding this keyword will improve your resume's ATS compatibility by ${pointImpact} point.`,
  //     };
  //   },
  //   [atsScore, originalAtsScore, mappedKeywords]
  // );

  /**
   * Enhanced adapter function for applying suggestions
   * Updates only local state without saving to database immediately
   * Uses the exact point impact from the suggestion for accurate score updates
   *
   * @param index - The index of the suggestion in the suggestions array
   * @returns Boolean indicating if operation was successful
   */
  const handleApplySuggestionAdapter = useCallback(
    (index: number) => {
      console.log(`💡 handleApplySuggestionAdapter called with index ${index}`);

      // Only proceed if in edit mode and index is valid
      if (isEditing && index >= 0 && index < mappedSuggestions.length) {
        const suggestion = mappedSuggestions[index];

        console.log(`💡 Applying suggestion (local only):`, suggestion);

        // Validate that the suggestion has a valid ID
        if (!suggestion.id) {
          console.error(
            "❌ Cannot apply suggestion: Missing suggestion ID",
            suggestion
          );

          // Generate temporary ID for this operation
          const tempId = `temp-suggestion-${index}-${Date.now()}`;
          console.log(`🔧 Generated temporary ID: ${tempId}`);

          // Assign the temporary ID to the suggestion
          suggestion.id = tempId;

          toast.error("Cannot apply suggestion: Missing ID");
          return false;
        }

        // Validate the resume data exists and has an ID
        if (!resumeData?.id) {
          console.error("❌ Cannot apply suggestion: Missing resume ID");
          toast.error("Cannot apply suggestion: Resume not found");
          return false;
        }

        // Get the exact point impact from the suggestion, with fallback to default
        const exactPointImpact = suggestion.pointImpact || 2;

        // Log the operation for debugging
        console.log("🎯 Applying suggestion (local state only):", {
          resumeId: resumeData.id,
          suggestionId: suggestion.id,
          suggestion: suggestion.text,
          currentState: suggestion.isApplied,
          newState: !suggestion.isApplied,
          pointImpact: exactPointImpact,
        });

        // Call the parent handler with suggestion ID and toggle applied state
        // Now only updates local state without making API calls
        handleApplySuggestion(suggestion.id, !suggestion.isApplied);

        // Explicitly mark score as modified when applying suggestion
        setScoreModified(true);
        setContentModified(true);

        return true;
      } else if (!isEditing) {
        // User needs to be in edit mode to apply suggestions
        toast.info("Enter edit mode to apply suggestions");
        return false;
      } else {
        // Invalid index
        console.error(
          "❌ Invalid suggestion index:",
          index,
          "Max:",
          mappedSuggestions.length - 1
        );
        return false;
      }
    },
    [
      isEditing,
      mappedSuggestions,
      resumeData,
      handleApplySuggestion,
      setScoreModified,
      setContentModified,
    ]
  );

  /**
   * Adapter function for simulate suggestion impact
   * Returns the expected impact object structure with accurate values
   *
   * @param index - Index of suggestion in array
   * @returns Impact calculation object
   */
  // const simulateSuggestionImpactAdapter = useCallback(
  //   (index: number): SuggestionImpact => {
  //     // Find the suggestion to get its exact point impact
  //     const suggestion =
  //       index >= 0 && index < mappedSuggestions.length
  //         ? mappedSuggestions[index]
  //         : null;

  //     // Use the exact point impact from the suggestion if available, or fallback to default
  //     const pointImpact = suggestion?.pointImpact || 2;

  //     // Use current score as base, fallback to original score or default
  //     const currentScore = atsScore || originalAtsScore || 65;

  //     // Calculate new score capped at 100
  //     const newScore = Math.min(100, currentScore + pointImpact);

  //     // Log the calculation for debugging
  //     console.log(
  //       `📊 Simulating suggestion impact: ${currentScore} + ${pointImpact} = ${newScore}`
  //     );

  //     // Return the expected object structure with accurate values
  //     return {
  //       newScore,
  //       pointImpact,
  //       description: `This suggestion will improve your resume's ATS compatibility by ${pointImpact} points.`,
  //     };
  //   },
  //   [atsScore, originalAtsScore, mappedSuggestions]
  // );

  /**
   * Adapter for file upload to match expected signature
   * Provides default values for optional parameters
   *
   * @param url - URL of the uploaded file
   * @param name - Name of the file
   * @param size - Size of the file in bytes
   * @param type - MIME type of the file
   */
  const handleFileUploadAdapter = useCallback(
    (url: string, name: string, size?: number, type?: string) => {
      // Call the original handler with defaults for optional parameters
      handleFileUpload(url, name, size || 0, type || "");
    },
    [handleFileUpload]
  );

  /**
   * Enhanced save handler that handles all changes in a single atomic transaction
   * Collects all applied suggestions and keywords and saves them with the content
   * Now also includes the selected template in the save operation
   *
   * @param content - Content to save
   * @returns Promise resolving to the save result
   */
  const handleSaveWithUpdates = useCallback(
    async (content: string) => {
      // Create a unique ID for this save operation's toast
      const toastId = "saving-changes-toast";

      // Show processing state to user with the ID
      toast.loading("Saving all changes...", {
        id: toastId,
        description:
          "Saving resume content, keywords, suggestions, and template.",
      });

      // Call the atomic save method from the hook with the selected template
      const result = await saveResume(content, selectedTemplate);

      // If save was successful
      if (result) {
        // Reset modification states are handled by the hook

        // Update the toast to show success using the same ID
        toast.success("All changes saved successfully", {
          id: toastId,
          description:
            "Your resume, keywords, suggestions, and template have been updated.",
        });
      } else {
        // Update the toast to show error using the same ID
        toast.error("Failed to save changes", {
          id: toastId,
          description:
            "Please try again. If the problem persists, contact support.",
        });
      }

      return result;
    },
    [saveResume, selectedTemplate]
  );

  /**
   * Handle template selection
   * Updates the selected template and marks content as modified
   *
   * @param templateId - ID of the selected template
   */
  const handleTemplateSelection = useCallback(
    (templateId: string) => {
      // Only allow template selection in edit mode
      if (!isEditing) {
        toast.info("Switch to Edit mode to change templates");
        return;
      }

      // Check if the template is already selected
      if (templateId === selectedTemplate) {
        return;
      }

      // Find the template
      const template = resumeTemplates.find((t) => t.id === templateId);

      // Update the template using hook function
      updateSelectedTemplate(templateId);

      // Show confirmation toast
      toast.success(`${template?.name || "Template"} selected`, {
        description: "Remember to save your changes to apply this template.",
      });
    },
    [isEditing, selectedTemplate, updateSelectedTemplate]
  );

  /**
   * Handle edit mode change from ResumePreview
   * Delegates to the centralized hook function
   *
   * @param newEditingState - New editing state
   */
  const handleEditModeChange = useCallback(
    (newEditingState: boolean) => {
      console.log(
        `🔄 Edit mode change requested: ${isEditing} -> ${newEditingState}`
      );

      // Use the centralized toggle function from the hook
      // Note: toggleEditMode already handles the logic of entering/exiting edit mode
      if (newEditingState !== isEditing) {
        toggleEditMode();
      }
    },
    [isEditing, toggleEditMode]
  );

  // ===== EFFECTS =====

  // Check for previous toast shown in session storage
  useEffect(() => {
    try {
      const lastToastTime = sessionStorage.getItem("welcomeToastTime");
      if (lastToastTime) {
        const lastTime = parseInt(lastToastTime, 10);
        const currentTime = Date.now();

        // If a toast was shown in the last 15 minutes, mark it as already displayed
        if (currentTime - lastTime < 15 * 60 * 1000) {
          // 15 minutes in ms
          welcomeToastShownRef.current = true;
        }
      }
    } catch (e) {
      // Ignore session storage errors
    }
  }, []);

  // Effect to handle loading state changes
  useEffect(() => {
    handleLoadingStateChange();
  }, [handleLoadingStateChange]);

  // ===== RENDER =====

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

      {/* Main tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="max-w-5xl mx-auto"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">Upload Resume</TabsTrigger>
          <TabsTrigger value="preview" disabled={isPreviewTabDisabled}>
            Optimize & Preview
            {(isUploading || isOptimizing || isLoading || showLoadingState) && (
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

        {/* Upload tab */}
        <TabsContent value="upload" className="space-y-4">
          {/* Using the UploadSection component with required props */}
          <UploadSection
            isUploading={isUploading}
            isParsing={isOptimizing}
            selectedFile={selectedFile}
            resumeContent={resumeContent}
            onFileChange={setSelectedFile}
            onContentChange={handleContentChange}
            onContinue={handleTextAnalysis}
            onFileUpload={handleFileUploadAdapter}
            setActiveTab={setActiveTab}
            onAnalysisStart={handleAnalysisStart}
            showLoadingState={setShowLoadingState}
            onAnalysisComplete={(
              optimizedText,
              resumeId,
              atsScore,
              suggestions,
              keywords
            ) => {
              // Normalize suggestions and keywords before updating
              const normalizedSuggestions = Array.isArray(suggestions)
                ? suggestions.map((s, i) => normalizeSuggestion(s, i))
                : [];

              const normalizedKeywords = Array.isArray(keywords)
                ? keywords.map((k, i) => normalizeKeyword(k, i))
                : [];

              // Update state with normalized data
              updateResumeWithOptimizedData(
                optimizedText || "",
                resumeId || "",
                atsScore || 65,
                normalizedSuggestions,
                normalizedKeywords
              );

              // Hide loading state when complete
              setShowLoadingState(false);
            }}
            checkingForExistingResumes={isLoading}
          />
        </TabsContent>

        {/* Preview tab with optimized loading state handling */}
        <TabsContent value="preview" className="space-y-6">
          {/*
           * Display appropriate content based on state:
           * 1. Show loading spinner during initial data load
           * 2. Show loading spinner during analysis
           * 3. Show empty state when no content exists
           * 4. Show content when available
           */}
          {isLoading || showLoadingState || isOptimizing ? (
            <LoadingState />
          ) : !currentDisplayContent && !optimizedText ? (
            <EmptyPreviewState onGoToUpload={() => setActiveTab("upload")} />
          ) : (
            <>
              {/* Main content area with 5-column grid layout */}
              <div className="grid md:grid-cols-5 gap-6">
                {/* Resume preview - takes 3 columns */}
                <div className="col-span-3">
                  <ResumePreview
                    // ===== CONTENT PROPS =====
                    optimizedText={currentDisplayContent || optimizedText}
                    originalOptimizedText={optimizedText}
                    // ===== TEMPLATE AND DISPLAY =====
                    selectedTemplate={selectedTemplate}
                    templates={resumeTemplates}
                    appliedKeywords={appliedKeywordsArray}
                    suggestions={mappedSuggestions}
                    // ===== ACTION CALLBACKS =====
                    onDownload={handleDownload}
                    onSave={handleSaveWithUpdates}
                    onTextChange={handleContentEdit}
                    onReset={() => setShowResetDialog(true)}
                    // ===== STATE PROPS =====
                    isOptimizing={isOptimizing}
                    isApplyingChanges={isSaving}
                    language={resumeData?.language || "English"}
                    resumeData={resumeData || undefined}
                    // ===== NEW: CENTRALIZED EDIT MODE MANAGEMENT =====
                    isEditing={isEditing}
                    onEditModeChange={handleEditModeChange}
                    // ===== NEW: TEMPORARY CONTENT FROM HOOK =====
                    tempEditedContent={tempEditedContent}
                    tempSections={tempSections}
                    hasTempChanges={hasTempChanges}
                    onSectionEdit={handleSectionEdit}
                    // ===== MODIFICATION FLAGS =====
                    scoreModified={scoreModified}
                    templateModified={templateModified}
                    contentModified={contentModified}
                  />
                </div>

                {/* Sidebar with optimization controls - takes 2 columns */}
                <div className="col-span-2 flex flex-col gap-4">
                  {/* ATS Score card */}
                  <ScoreCard
                    optimizationScore={atsScore || 0}
                    resumeContent={currentDisplayContent || optimizedText}
                    suggestionsApplied={
                      suggestions.filter((s) => s.isApplied).length
                    }
                    keywordsApplied={keywords.filter((k) => k.isApplied).length}
                    scoreBreakdown={null}
                    potentialScore={100}
                    initialScore={65}
                    isCalculating={isOptimizing}
                  />

                  {/* AI Suggestions - Now passing isEditing state */}
                  <SuggestionsList
                    suggestions={mappedSuggestions}
                    isOptimizing={isOptimizing}
                    onApplySuggestion={handleApplySuggestionAdapter}
                    resumeContent={currentDisplayContent || optimizedText}
                    currentScore={atsScore || 0}
                    isEditing={isEditing} // Pass the editing state to control when suggestions can be applied
                  />

                  {/* Keywords - Now passing isEditing state */}
                  <KeywordsList
                    keywords={mappedKeywords}
                    onKeywordApply={handleKeywordApplyAdapter}
                    showImpactDetails={true}
                    currentScore={atsScore || 0}
                    isEditing={isEditing} // Pass the editing state to control when keywords can be applied
                  />

                  {/* Template selection gallery */}
                  <TemplateGallery
                    templates={resumeTemplates}
                    selectedTemplate={selectedTemplate}
                    onTemplateSelect={handleTemplateSelection}
                    isEditing={isEditing} // Pass the editing state to control when templates can be changed
                  />
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResumeOptimizer;
