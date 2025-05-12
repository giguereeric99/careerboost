/**
 * ResumeOptimizer Component
 * 
 * Main component that manages the resume optimization workflow.
 * Uses custom hooks for separation of concerns between uploading and editing.
 * Centralized UI state management for loading views and toasts.
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// Import components - using the correct paths for your project structure
import UploadSection from '@/components/ResumeOptimizerSection/uploadSection';
import ResumePreview from '@/components/ResumeOptimizerSection/resumePreview';
import ScoreCard from '@/components/ResumeOptimizerSection/scoreCard';
import SuggestionsList from '@/components/ResumeOptimizerSection/suggestionsList';
import KeywordsList from '@/components/ResumeOptimizerSection/keywordsList';
import TemplateGallery from '@/components/ResumeOptimizerSection/templateGallery';
import ResetConfirmationDialog from '@/components/Dialogs/resetConfirmationDialog';
import LoadingState from '@/components/ResumeOptimizerSection/loadingState';
import EmptyPreviewState from '@/components/ResumeOptimizerSection/emptyPreviewState';
import { resumeTemplates } from '@/constants/resumeTemplates';

// Import custom hooks
import useResumeOptimizer from '@/hooks/optimizer/useResumeOptimizer';
import useUploadSection from '@/hooks/optimizer/useUploadSection';

// Import types
import { Suggestion, Keyword, OptimizedResumeData } from '@/types/resumeTypes';

/**
 * Interface for SuggestionImpact based on error messages
 */
interface SuggestionImpact {
  newScore: number;
  pointImpact: number;
  description: string;
}

/**
 * EmptyPreviewStateProps interface based on error messages
 */
interface EmptyPreviewStateProps {
  onGoToUpload: () => void;
}

/**
 * ResumeOptimizer Component - Main entry point for the resume optimization workflow
 * Handles the complete lifecycle of resume optimization including:
 * - File upload and content extraction
 * - AI optimization
 * - Rendering preview with template selection
 * - Managing suggestions and keywords
 * - Saving and resetting user changes
 */
const ResumeOptimizer: React.FC = () => {
  // Get user authentication state from Clerk
  const { user } = useUser();
  
  // Ref to track previous loading state for tab navigation and UI updates
  const previousIsLoading = useRef(false);
  
  // State to track if welcome toast has been shown
  const welcomeToastShownRef = useRef(false);
  
  // Use the main optimizer hook to handle resume optimization state and actions
  const {
    // State
    resumeData,         // Main resume data object from database
    optimizedText,      // AI-optimized text content
    editedText,         // User-edited content
    originalAtsScore,   // Original ATS score from optimization
    currentAtsScore,    // Current ATS score after edits
    suggestions,        // AI-generated improvement suggestions
    keywords,           // Relevant keywords for the resume
    isEditing,          // Whether user is in edit mode
    selectedTemplate,   // Currently selected visual template
    isLoading,          // Loading initial data - IMPORTANT: Used to show LoadingState during initial load
    isSaving,           // Saving changes to database
    isResetting,        // Resetting to original state
    hasResume,          // Whether user has any resume
    activeTab,          // Currently active tab
    
    // Actions
    setActiveTab,             // Change active tab
    setIsEditing,             // Toggle edit mode
    loadLatestResume,         // Load latest resume data
    saveResume,               // Save user changes
    resetResume,              // Reset to AI-optimized version
    handleContentEdit,        // Handle content changes
    handleApplySuggestion,    // Apply a suggestion to content
    handleKeywordApply,       // Apply a keyword to content
    updateResumeWithOptimizedData,  // Update state with optimization results
    updateSelectedTemplate     // Update template selection
  } = useResumeOptimizer(user?.id);
  
  // Use the upload section hook to handle file upload and initial optimization
  const {
    // State
    selectedFile,       // Selected file for upload
    resumeContent,      // Extracted content from file
    isUploading,        // Uploading file in progress
    isOptimizing,       // AI optimization in progress
    
    // Actions
    setSelectedFile,       // Set selected file
    handleContentChange,   // Handle content changes in upload
    handleFileUpload,      // Handle file upload process
    processUploadedFile,   // Process uploaded file
    handleTextAnalysis     // Send content for AI analysis
  } = useUploadSection({
    // Pass the callback to receive optimization data after completion
    onOptimizationComplete: (optimizedText, resumeId, atsScore, suggestions, keywords) => {
      // Update the main state with optimization results
      updateResumeWithOptimizedData(
        optimizedText || '',
        resumeId || '',
        atsScore || 65,
        suggestions || [],
        keywords || []
      );
      
      // Change tab after processing is complete
      setActiveTab('preview');
      
      // Show success toast
      toast.success("Resume optimized successfully!", {
        description: "Your resume has been analyzed and improved by our AI.",
        duration: 5000,
      });
    }
  });
  
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
    if (hasResume && (optimizedText || resumeData?.optimized_text)) {
      // If we have resume data, switch to preview tab
      setActiveTab('preview');
      console.log('Auto-switching to preview tab after loading');

      toast.success("Last resume loaded successfully!", {
        description: "You can continue optimizing your resume or upload a new one.",
        duration: 5000,
      });
      
    } else {
      // If no resume data, stay on upload tab
      setActiveTab('upload');
      console.log('Staying on upload tab - no resume found');
      
      toast.info("Welcome to CareerBoost!", {
        description: "Upload your resume to get started with AI optimization.",
        duration: 7000,
      });
    }
  }, [isLoading, hasResume, optimizedText, resumeData, setActiveTab]);
  
  /**
   * Handle tab change with data loading if needed
   * Prevents tab switching during processing and loads data when required
   * 
   * @param value - Tab value to switch to
   */
  const handleTabChange = useCallback((value: string) => {
    // Prevent switching to preview if analysis in progress
    if (value === 'preview' && (isUploading || isOptimizing || isLoading)) {
      toast.info("Please wait until analysis is complete");
      return;
    }
    
    setActiveTab(value);
    
    // When switching to preview tab, load the latest resume data if needed
    if (value === 'preview' && user?.id && !optimizedText) {
      loadLatestResume();
      console.log('Loading latest resume data');
    }
  }, [user?.id, isUploading, isOptimizing, isLoading, loadLatestResume, optimizedText, setActiveTab]);
  
  /**
   * Handle analysis start - show loading state
   * Called when the AI optimization process begins
   */
  const [showLoadingState, setShowLoadingState] = React.useState(false);
  const handleAnalysisStart = useCallback(() => {
    setShowLoadingState(true);
  }, []);
  
  /**
   * Calculate if preview tab should be disabled
   * Prevents access during processing states
   */
  const isPreviewTabDisabled = isLoading || isUploading || isOptimizing || showLoadingState;
  
  /**
   * Determine which content to display in the preview
   * Prioritizes: edited text > last saved text > optimized text > empty string
   */
  const displayContent = editedText || (resumeData?.last_saved_text ?? resumeData?.optimized_text) || optimizedText || '';
  
  /**
   * Get current ATS score to display
   * Uses current score if available, falls back to original score
   */
  const atsScore = currentAtsScore !== null ? currentAtsScore : originalAtsScore;
  
  /**
   * Get array of applied keywords for templates
   * Filters keywords that have been applied and maps to text-only array
   */
  const appliedKeywordsArray = keywords
    .filter(keyword => keyword.isApplied)
    .map(keyword => keyword.text);
  
  /**
   * Handle reset dialog confirmation
   * Controls visibility of the reset confirmation dialog
   */
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  
  /**
   * Handle resume download
   * Creates an HTML file with the current content and selected template
   */
  const handleDownload = useCallback(() => {
    // Validate content exists
    if (!displayContent) {
      toast.error("No content to download");
      return;
    }
    
    // Get selected template or default to first template
    const template = resumeTemplates.find(t => t.id === selectedTemplate) || resumeTemplates[0];
    
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
        ${template.previewClass ? `.resume-content { ${template.previewClass.replace(/border[^;]+;/g, '')} }` : ''}
      </style>
    </head>
    <body>
      <div class="resume-content">
        ${displayContent}
      </div>
    </body>
    </html>`;
    
    // Create and trigger download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Resume downloaded successfully");
  }, [displayContent, selectedTemplate]);
  
  // Maps the database-format suggestions to component-format suggestions
  const mappedSuggestions = suggestions.map(s => ({
    id: s.id,
    text: s.text,
    type: s.type,
    impact: s.impact,
    isApplied: s.isApplied,
    pointImpact: s.pointImpact
  }));
  
  // Maps the database-format keywords to component-format keywords
  // Adding the 'applied' property required by KeywordsList component
  const mappedKeywords = keywords.map((k, index) => ({
    id: k.id || String(Math.random()),
    text: k.text,
    isApplied: k.isApplied,
    // Add the 'applied' property required by the component
    applied: k.isApplied,
    relevance: k.relevance || 1,
    pointImpact: k.pointImpact || 1
  }));
  
  /**
   * Adapter function for onKeywordApply
   * Converts index-based calls to id-based calls
   */
  const handleKeywordApplyAdapter = (index: number) => {
    // Only proceed with keyword application if in edit mode
    if (isEditing && index >= 0 && index < mappedKeywords.length) {
      const keyword = mappedKeywords[index];
      handleKeywordApply(keyword.id, !keyword.isApplied);
    } else if (!isEditing) {
      // Optionally notify user that editing is required to apply keywords
      toast.info("Enter edit mode to apply keywords");
    }
  };
  
  /**
   * Adapter function for simulateKeywordImpact
   * Returns the expected object structure
   */
  const simulateKeywordImpactAdapter = (index: number) => {
    // Default impact values
    const pointImpact = 1;
    const currentScore = atsScore || 0;
    const newScore = Math.min(100, currentScore + pointImpact);
    
    // Return the expected object structure
    return {
      newScore,
      pointImpact,
      description: "Adding this keyword will improve your ATS compatibility score."
    };
  };
  
  /**
   * Adapter function for apply suggestion
   * Converts index-based calls to id-based calls
   * Now checks if the user is in edit mode before applying suggestions
   */
  const handleApplySuggestionAdapter = (index: number) => {
    // Only proceed with suggestion application if in edit mode
    if (isEditing && index >= 0 && index < mappedSuggestions.length) {
      const suggestion = mappedSuggestions[index];
      handleApplySuggestion(suggestion.id, !suggestion.isApplied);
    } else if (!isEditing) {
      // Optionally notify user that editing is required to apply suggestions
      toast.info("Enter edit mode to apply suggestions");
    }
  };
  
  /**
   * Adapter function for simulate suggestion impact
   * Returns the expected impact object structure
   */
  const simulateSuggestionImpactAdapter = (index: number): SuggestionImpact => {
    // Default impact values
    const pointImpact = 2;
    const currentScore = atsScore || 0;
    const newScore = Math.min(100, currentScore + pointImpact);
    
    // Return the expected object structure
    return {
      newScore,
      pointImpact,
      description: "This suggestion will improve your resume's clarity and impact."
    };
  };
  
  /**
   * Adapter for file upload to match expected signature
   */
  const handleFileUploadAdapter = useCallback((url: string, name: string, size?: number, type?: string) => {
    // Call the original handler with defaults for optional parameters
    handleFileUpload(url, name, size || 0, type || '');
  }, [handleFileUpload]);

  // Check for previous toast shown in session storage
  useEffect(() => {
    try {
      const lastToastTime = sessionStorage.getItem('welcomeToastTime');
      if (lastToastTime) {
        const lastTime = parseInt(lastToastTime, 10);
        const currentTime = Date.now();
        
        // If a toast was shown in the last 15 minutes, mark it as already displayed
        if (currentTime - lastTime < 15 * 60 * 1000) { // 15 minutes in ms
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

  return (
    <div className="py-8">
      {/* Reset Confirmation Dialog */}
      <ResetConfirmationDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={() => {
          resetResume();
          setShowResetDialog(false);
        }}
        isResetting={isResetting}
      />

      {/* Header section */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">AI Resume Optimizer</h2>
        <p className="text-gray-500">Perfect your resume with AI-powered suggestions</p>
      </div>

      {/* Main tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={handleTabChange} 
        className="max-w-5xl mx-auto"
      >
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">Upload Resume</TabsTrigger>
          <TabsTrigger 
            value="preview" 
            disabled={isPreviewTabDisabled}
          >
            Optimize & Preview
            {(isUploading || isOptimizing || isLoading || showLoadingState) && (
              <span className="ml-2 inline-flex items-center">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
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
            onAnalysisComplete={(optimizedText, resumeId, atsScore, suggestions, keywords) => {
              updateResumeWithOptimizedData(
                optimizedText || '',
                resumeId || '',
                atsScore || 65,
                suggestions || [],
                keywords || []
              );
              setShowLoadingState(false);
            }}
            checkingForExistingResumes={isLoading} // Pass isLoading to the checkingForExistingResumes prop
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
          ) : !displayContent ? (
            <EmptyPreviewState 
              onGoToUpload={() => setActiveTab('upload')} 
            />
          ) : (
            <>
              {/* Main content area with 5-column grid layout */}
              <div className="grid md:grid-cols-5 gap-6">
                {/* Resume preview - takes 3 columns */}
                <div className="col-span-3">
                  <ResumePreview
                    optimizedText={displayContent}
                    originalOptimizedText={optimizedText}
                    selectedTemplate={selectedTemplate}
                    templates={resumeTemplates}
                    appliedKeywords={appliedKeywordsArray}
                    suggestions={mappedSuggestions}
                    onDownload={handleDownload}
                    onSave={saveResume}
                    onTextChange={handleContentEdit}
                    isOptimizing={isOptimizing}
                    isApplyingChanges={isSaving}
                    language={resumeData?.language || "English"}
                    onEditModeChange={setIsEditing}
                    onReset={() => setShowResetDialog(true)}
                    // Pass the editing state explicitly
                    isEditing={isEditing}
                  />
                </div>

                {/* Sidebar with optimization controls - takes 2 columns */}
                <div className="col-span-2 flex flex-col gap-4">
                  {/* ATS Score card */}
                  <ScoreCard 
                    optimizationScore={atsScore || 0}
                    resumeContent={displayContent}
                    suggestionsApplied={suggestions.filter(s => s.isApplied).length}
                    keywordsApplied={keywords.filter(k => k.isApplied).length}
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
                    resumeContent={displayContent}
                    currentScore={atsScore || 0}
                    simulateSuggestionImpact={simulateSuggestionImpactAdapter}
                    isEditing={isEditing} // Pass the editing state to control when suggestions can be applied
                  />
                  
                  {/* Keywords - Now passing isEditing state */}
                  <KeywordsList
                    keywords={mappedKeywords}
                    onKeywordApply={handleKeywordApplyAdapter}
                    showImpactDetails={true}
                    currentScore={atsScore || 0}
                    simulateKeywordImpact={simulateKeywordImpactAdapter}
                    isEditing={isEditing} // Pass the editing state to control when keywords can be applied
                  />

                  {/* Template selection gallery */}
                  <TemplateGallery
                    templates={resumeTemplates}
                    selectedTemplate={selectedTemplate}
                    onTemplateSelect={updateSelectedTemplate}
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