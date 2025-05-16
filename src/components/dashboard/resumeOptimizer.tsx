// components/dashboard/resumeOptimizer.tsx (simplifié)

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

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

// Import notre hook unifié
import { useResume } from "@/hooks/resume";

/**
 * ResumeOptimizer Component
 */
const ResumeOptimizer: React.FC = () => {
  // Get user authentication state from Clerk
  const { user } = useUser();

  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Ref to track if initialization has been performed
  const initializedRef = useRef<boolean>(false);

  // State to track if welcome toast has been shown
  const welcomeToastShownRef = useRef(false);

  // Ref to track previous loading state for UI updates
  const previousIsLoading = useRef(false);

  // Use the main hook for all resume functionality
  const resume = useResume(user?.id);

  /**
   * Initialization effect that runs on component mount
   * Uses the dedicated initializeResume function for complete flow
   */
  useEffect(() => {
    // Check if initialization has not been performed yet and user is available
    if (!initializedRef.current && user) {
      console.log("Initializing application for user:", user.id);

      // Mark initialization as completed
      initializedRef.current = true;

      // Initialize resume with complete flow (toast, tab navigation, etc.)
      resume.initializeResume();
    }
  }, [user, resume]);

  /**
   * Handle tab change with data loading if needed
   */
  const handleTabChange = (value: string) => {
    // Prevent switching to preview if analysis in progress
    if (
      value === "preview" &&
      (resume.isUploading || resume.isOptimizing || resume.isLoading)
    ) {
      toast.info("Please wait until analysis is complete");
      return;
    }

    resume.setActiveTab(value);

    // When switching to preview tab, load the latest resume data if needed
    if (value === "preview" && user?.id && !resume.optimizedText) {
      resume.loadLatestResume();
    }
  };

  /**
   * Determine which content to display in the preview
   */
  const displayContent =
    resume.editedText ||
    (resume.resumeData?.last_saved_text ?? resume.resumeData?.optimized_text) ||
    resume.optimizedText ||
    "";

  /**
   * Get array of applied keywords for templates
   */
  const appliedKeywordsArray = resume.keywords
    .filter((keyword) => keyword.isApplied)
    .map((keyword) => keyword.text);

  // Effect for automatic tab navigation after loading
  useEffect(() => {
    // Check if loading just finished
    const loadingJustFinished = !resume.isLoading && previousIsLoading.current;
    previousIsLoading.current = resume.isLoading;

    if (!loadingJustFinished) return;

    // Automatic tab navigation based on resume data
    if (
      resume.hasResume &&
      (resume.optimizedText || resume.resumeData?.optimized_text)
    ) {
      resume.setActiveTab("preview");

      toast.success("Last resume loaded successfully!", {
        description:
          "You can continue optimizing your resume or upload a new one.",
        duration: 5000,
      });
    } else {
      resume.setActiveTab("upload");

      toast.info("Welcome to CareerBoost!", {
        description: "Upload your resume to get started with AI optimization.",
        duration: 7000,
      });
    }
  }, [
    resume.isLoading,
    resume.hasResume,
    resume.optimizedText,
    resume.resumeData,
    resume.setActiveTab,
  ]);

  return (
    <div className="py-8">
      {/* Reset Confirmation Dialog */}
      <ResetConfirmationDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={() => {
          resume.resetResume();
          setShowResetDialog(false);
        }}
        isResetting={resume.isResetting}
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
        value={resume.activeTab}
        onValueChange={handleTabChange}
        className="max-w-5xl mx-auto"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">Upload Resume</TabsTrigger>
          <TabsTrigger
            value="preview"
            disabled={
              resume.isLoading || resume.isUploading || resume.isOptimizing
            }
          >
            Optimize & Preview
            {(resume.isUploading ||
              resume.isOptimizing ||
              resume.isLoading) && (
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
          <UploadSection
            isUploading={resume.isUploading}
            isParsing={resume.isOptimizing}
            selectedFile={resume.selectedFile}
            resumeContent={resume.resumeContent}
            onFileChange={resume.setSelectedFile}
            onContentChange={resume.handleContentChange}
            onContinue={resume.handleTextAnalysis}
            onFileUpload={resume.handleFileUpload}
            setActiveTab={resume.setActiveTab}
            onAnalysisStart={() => {}}
            onAnalysisComplete={() => {}}
            checkingForExistingResumes={resume.isLoading}
          />
        </TabsContent>

        {/* Preview tab */}
        <TabsContent value="preview" className="space-y-6">
          {/* Display appropriate content based on state */}
          {resume.isLoading || resume.isOptimizing ? (
            <LoadingState />
          ) : !displayContent ? (
            <EmptyPreviewState
              onGoToUpload={() => resume.setActiveTab("upload")}
            />
          ) : (
            <>
              {/* Main content area with 5-column grid layout */}
              <div className="grid md:grid-cols-5 gap-6">
                {/* Resume preview - takes 3 columns */}
                <div className="col-span-3">
                  <ResumePreview
                    optimizedText={displayContent}
                    originalOptimizedText={resume.optimizedText}
                    selectedTemplate={resume.selectedTemplate}
                    templates={resumeTemplates}
                    appliedKeywords={appliedKeywordsArray}
                    suggestions={resume.suggestions}
                    onDownload={() => {}} // Implement download function
                    onSave={resume.saveResume}
                    onTextChange={resume.handleContentEdit}
                    isOptimizing={resume.isOptimizing}
                    isApplyingChanges={resume.isSaving}
                    language={resume.resumeData?.language || "English"}
                    onEditModeChange={resume.setEditMode}
                    onReset={() => setShowResetDialog(true)}
                    isEditing={resume.isEditing}
                    scoreModified={resume.scoreModified}
                    contentModified={resume.contentModified}
                    resumeData={resume.resumeData}
                  />
                </div>

                {/* Sidebar with optimization controls - takes 2 columns */}
                <div className="col-span-2 flex flex-col gap-4">
                  {/* ATS Score card */}
                  <ScoreCard
                    optimizationScore={resume.currentScore}
                    resumeContent={displayContent}
                    suggestionsApplied={
                      resume.suggestions.filter((s) => s.isApplied).length
                    }
                    keywordsApplied={
                      resume.keywords.filter((k) => k.isApplied).length
                    }
                    scoreBreakdown={resume.generateScoreBreakdown}
                    potentialScore={
                      resume.generateScoreBreakdown?.potential || null
                    }
                    initialScore={resume.originalScore}
                    isCalculating={resume.isOptimizing}
                    improvementPoints={
                      resume.getImprovementMetrics.improvementPoints
                    }
                    remainingPotentialPoints={
                      resume.getImprovementMetrics.remainingPotential
                    }
                  />

                  {/* AI Suggestions */}
                  <SuggestionsList
                    suggestions={resume.suggestions}
                    isOptimizing={resume.isOptimizing}
                    onApplySuggestion={(index) => {
                      const suggestion = resume.suggestions[index];
                      if (suggestion?.id) {
                        resume.handleApplySuggestion(suggestion.id);
                      }
                    }}
                    resumeContent={displayContent}
                    currentScore={resume.currentScore}
                    simulateSuggestionImpact={resume.simulateSuggestionImpact}
                    isEditing={resume.isEditing}
                  />

                  {/* Keywords */}
                  <KeywordsList
                    keywords={resume.keywords}
                    onKeywordApply={(index) => {
                      const keyword = resume.keywords[index];
                      if (keyword?.id) {
                        resume.handleKeywordApply(keyword.id);
                      }
                    }}
                    showImpactDetails={true}
                    currentScore={resume.currentScore}
                    simulateKeywordImpact={resume.simulateKeywordImpact}
                    isEditing={resume.isEditing}
                  />

                  {/* Template selection gallery */}
                  <TemplateGallery
                    templates={resumeTemplates}
                    selectedTemplate={resume.selectedTemplate}
                    onTemplateSelect={resume.updateSelectedTemplate}
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
