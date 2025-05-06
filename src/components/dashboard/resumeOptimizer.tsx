/**
 * Enhanced ResumeOptimizer Component
 * 
 * Main component that manages the resume optimization workflow with advanced score tracking.
 * Features:
 * - File upload and text input for resumes
 * - AI-powered optimization with real-time score feedback
 * - Detailed keyword and suggestion impact analysis
 * - Automatic score calculation with breakdown visualization
 * - Optimized state management to prevent unnecessary re-renders
 * - Template selection and application
 * - Export and download capabilities
 * 
 * This component uses advanced memoization techniques to ensure optimal performance
 * even with complex score calculations and UI updates.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import custom hooks
import { useResumeOptimizerEnhanced } from '@/hooks/useResumeOptimizerEnhanced';
import { useResumeScoreManager } from '@/hooks/useResumeScoreManager';
import { useResumeLoader } from '@/hooks/useResumeLoader';

// Import components
import UploadSection from '@/components/ResumeOptimizer/uploadSection';
import ResumePreview from '@/components/ResumeOptimizer/resumePreview';
import ScoreCard from '@/components/ResumeOptimizer/scoreCard';
import SuggestionsList from '@/components/ResumeOptimizer/suggestionsList';
import KeywordList from '@/components/ResumeOptimizer/keywordList';
import TemplateGallery from '@/components/ResumeOptimizer/templateGallery';
import ProUpgradeDialog from '@/components/Dialogs/proUpgradeDialog';
import ResetConfirmationDialog from '@/components/Dialogs/resetConfirmationDialog';
import LoadingState from '@/components/ResumeOptimizer/loadingState';
import EmptyPreviewState from '@/components/ResumeOptimizer/emptyPreviewState';
import EditVersionBanner from '@/components/ResumeOptimizer/editVersionBanner';
import RegenerateButton from '@/components/ResumeOptimizer/regenerateButton';
import OptimizationMetrics from '@/components/ResumeOptimizer/optimizationMetrics';
import { resumeTemplates } from '@/constants/resumeTemplates';

/**
 * ResumeOptimizer Component
 * Main component for the resume optimization workflow
 */
const ResumeOptimizer: React.FC = () => {
  // -------------------------------------------------------------------------
  // Authentication & Hook Setup
  // -------------------------------------------------------------------------
  
  // Get user authentication state from Clerk
  const { user } = useUser();

  // Initialize the resume optimizer hook with enhanced score tracking
  const {
    // Status states - Track the state of various operations
    isUploading,          // File upload in progress
    isParsing,            // Text parsing in progress
    isOptimizing,         // AI optimization in progress
    isApplyingChanges,    // Applying suggestions/keywords in progress
    isResetting,          // Reset operation in progress
    needsRegeneration,    // Content needs regeneration before download
    
    // Data states - The actual resume content and related data
    selectedFile,         // Currently selected file
    resumeData,           // Resume metadata
    optimizedData,        // Optimized resume data
    optimizedText,        // Current optimized resume text
    editedText,           // User-edited version of resume
    processedHtml,        // Processed HTML content
    suggestions,          // AI suggestions for improvement
    keywords,             // Keyword suggestions
    optimizationScore,    // Current ATS score
    optimizationMetrics,  // Detailed optimization metrics
    isEditing,            // Currently in edit mode
    setIsEditing,         // Set edit mode
    appliedSuggestions,   // Indices of applied suggestions
    appliedKeywords,      // Array of applied keywords
    scoreManager,         // Score calculation manager
    
    // Action handlers - Functions to interact with the resume
    setSelectedFile,              // Set selected file
    handlePreviewContentChange,   // Handle content changes in preview
    handleApplySuggestion,        // Apply a suggestion
    handleKeywordApply,           // Apply a keyword
    handleRegenerateResume,       // Regenerate resume
    handleReset,                  // Reset to original
    handleSave,                   // Save changes
    exportReport,                 // Export optimization report
    loadLatestResume,             // Load latest resume from database
    
    // File handling
    handleFileUpload,             // Handle file upload completion
    
    // Advanced score simulation
    simulateKeywordImpact,        // Simulate impact of applying a keyword
    simulateSuggestionImpact      // Simulate impact of applying a suggestion
  } = useResumeOptimizerEnhanced(user?.id);
  
  // -------------------------------------------------------------------------
  // Component State Management
  // -------------------------------------------------------------------------
  
  // UI state - Controls the overall component behavior
  const [activeTab, setActiveTab] = useState("upload");        // Current active tab
  const [resumeContent, setResumeContent] = useState("");      // Raw text input content
  const [rawText, setRawText] = useState<string>("");          // Raw text for optimization
  const [fileUrl, setFileUrl] = useState<string | null>(null); // Uploaded file URL
  const [fileName, setFileName] = useState<string | null>(null);// Uploaded file name
  const [selectedTemplate, setSelectedTemplate] = useState("basic"); // Template ID
  const [showProDialog, setShowProDialog] = useState(false);   // Show pro upgrade dialog
  const [showResetDialog, setShowResetDialog] = useState(false);// Show reset confirmation
  
  // Process tracking state - Tracks the analysis workflow
  const [isAnalysisDisabled, setIsAnalysisDisabled] = useState(false); // Tab is disabled during analysis
  const [hasResume, setHasResume] = useState(false);                   // User has a resume saved
  const [isUploadInProgress, setIsUploadInProgress] = useState(false); // File upload/analysis in progress
  
  // Refs for managing asynchronous operations and preventing race conditions
  const isLoadingInProgress = useRef(false);    // Prevent concurrent loading
  const loadAttemptedRef = useRef(false);       // Track if load has been attempted
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout reference
  const loadingAttempts = useRef(0);            // Track number of loading attempts

  // -------------------------------------------------------------------------
  // Computed Values & Memoization
  // -------------------------------------------------------------------------
  
  /**
   * Display content priority:
   * 1. Processed HTML (if available)
   * 2. User-edited text
   * 3. Original optimized text
   * This ensures the most processed version is always displayed
   */
  const displayContent = useMemo(() => {
    return processedHtml || editedText || optimizedText || '';
  }, [processedHtml, editedText, optimizedText]);

  /**
   * Calculate current resume score with breakdown
   * Using useMemo to prevent unnecessary recalculations
   */
  const currentScoreData = useMemo(() => {
    return {
      score: optimizationScore,
      breakdown: scoreManager?.scoreBreakdown || null,
      potentialScore: scoreManager?.scoreBreakdown?.potential || null
    };
  }, [optimizationScore, scoreManager?.scoreBreakdown]);

  /**
   * Check if any analysis process is currently active
   * Used to disable the preview tab during these operations
   */
  const isAnalysisInProgress = useMemo(() => {
    return isParsing || isOptimizing || isAnalysisDisabled;
  }, [isParsing, isOptimizing, isAnalysisDisabled]);

  /**
   * Determine if the preview tab should be disabled
   * Disabled when:
   * - Analysis is in progress
   * - Upload is in progress
   * - User has no resume and hasn't switched to preview tab yet
   */
  const isPreviewTabDisabled = useMemo(() => {
    return (
      isAnalysisInProgress ||
      isUploadInProgress ||
      (!hasResume && !optimizedText && activeTab !== "preview") ||
      (isUploading || isParsing || isOptimizing)
    );
  }, [
    isAnalysisInProgress,
    isUploadInProgress,
    hasResume,
    optimizedText,
    activeTab,
    isUploading,
    isParsing,
    isOptimizing
  ]);

  /**
   * Get array of applied keywords for display
   * Memoized to prevent unnecessary array creation
   */
  const appliedKeywordsArray = useMemo(() => {
    return keywords
      .filter(keyword => keyword.applied)
      .map(keyword => keyword.text);
  }, [keywords]);

  /**
   * Check if resume has unsaved edits
   * Used to enable/disable reset functionality
   */
  const hasEdits = useMemo(() => Boolean(editedText), [editedText]);

  // -------------------------------------------------------------------------
  // Event Handlers - Optimized with useCallback
  // -------------------------------------------------------------------------
  
  /**
   * Handle text input changes in the textarea
   * Updates both resumeContent and rawText states
   */
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setResumeContent(newText);  // For display
    setRawText(newText);        // For processing
  }, []);

  /**
   * Handle template selection
   * Shows pro dialog if selected template requires upgrade
   */
  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = resumeTemplates.find(t => t.id === templateId);
    if (template?.isPro) {
      setShowProDialog(true);  // Show upgrade dialog
    } else {
      setSelectedTemplate(templateId);  // Update selected template
    }
  }, []);

  /**
   * Handle file upload completion
   * Updates file-related state variables
   */
  const onFileUpload = useCallback((url: string, name: string, size?: number, type?: string) => {
    setFileUrl(url);
    setFileName(name);
    // Create a dummy File object for compatibility
    setSelectedFile(new File([""], name, { type: type || "application/octet-stream" }));
  }, [setSelectedFile]);

  /**
   * Called when analysis starts (from UploadSection)
   * Disables UI elements that should not be accessible during analysis
   */
  const handleAnalysisStart = useCallback(() => {
    setIsAnalysisDisabled(true);     // Disable preview tab
    setIsUploadInProgress(true);     // Mark upload in progress
  }, []);

  /**
   * Called when analysis completes (from UploadSection)
   * Sets up loading state for preview tab transition
   */
  const handleAnalysisComplete = useCallback(() => {
    setIsAnalysisDisabled(false);    // Re-enable preview tab
    setIsUploadInProgress(false);    // Mark upload complete
    
    // Force resume existence to true since analysis just completed
    setHasResume(true);
    
    // Switch to preview tab immediately
    setActiveTab("preview");
    
    // Set loading state
    isLoadingInProgress.current = true;
    
    // Start loading resume data in the background
    if (user?.id && loadLatestResume) {
      // Use setTimeout to avoid blocking the UI
      setTimeout(() => {
        const loadResumeData = async () => {
          try {
            await loadLatestResume(user.id);
          } catch (error) {
            console.error("Error loading resume:", error);
          } finally {
            isLoadingInProgress.current = false;
          }
        };
        
        loadResumeData();
      }, 100);
    }
  }, [user?.id, loadLatestResume]);

  /**
   * Submit text for optimization
   * Handles the API call for text-based resume optimization
   */
  const handleSubmitText = useCallback(async () => {
    // Validate minimum length
    if (!rawText || rawText.length < 50) {
      toast.error("Please enter at least 50 characters");
      return;
    }

    try {
      // Start analysis process
      handleAnalysisStart();
      
      // Prepare form data for API
      const formData = new FormData();
      formData.append("rawText", rawText);
      if (user?.id) formData.append("userId", user.id);

      // Call optimization API
      const res = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });

      // Handle API errors
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to optimize resume");
      }
      
      // Success - analysis complete
      handleAnalysisComplete();
      
    } catch (error: any) {
      // Reset analysis state on error
      setIsAnalysisDisabled(false);
      setIsUploadInProgress(false);
      
      toast.error("Optimization failed", {
        description: error.message || "An unexpected error occurred."
      });
    }
  }, [rawText, user?.id, handleAnalysisStart, handleAnalysisComplete]);

  /**
   * Handle explicit loading trigger (button click)
   * Resets attempts and forces a fresh load
   */
  const handleLoadResume = useCallback(async () => {
    // Skip if already loading
    if (isLoadingInProgress.current) return;
    
    try {
      isLoadingInProgress.current = true;
      loadAttemptedRef.current = true;
      loadingAttempts.current = 0;  // Reset attempts
      
      if (user?.id) {
        const result = await loadLatestResume(user.id);
        
        // Update state based on result
        if (result) {
          setHasResume(true);
        } else {
          setHasResume(false);
        }
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      setHasResume(false);
    } finally {
      isLoadingInProgress.current = false;
    }
  }, [user?.id, loadLatestResume]);

  /**
   * Handle tab change with smart data loading
   * Loads data only when switching to preview if needed
   */
  const handleTabChange = useCallback((value: string) => {
    // Prevent switching to preview if disabled
    if (value === "preview" && isPreviewTabDisabled) {
      toast.info("Please wait for the analysis to complete");
      return;
    }
    
    setActiveTab(value);
    
    // Load data when switching to preview tab if no content exists
    if (value === "preview" && user && (!displayContent || !optimizedText)) {
      // Reset loading attempts for fresh try
      loadingAttempts.current = 0;
      
      // Set loading state
      isLoadingInProgress.current = true;
      
      // Load immediately
      if (user?.id) {
        loadLatestResume(user.id).then((result) => {
          // Update hasResume based on result
          setHasResume(!!result);
          isLoadingInProgress.current = false;
        }).catch(error => {
          console.error("Error loading resume:", error);
          isLoadingInProgress.current = false;
        });
      }
    }
  }, [user, isPreviewTabDisabled, loadLatestResume, displayContent, optimizedText]);

  /**
   * Handle resume download
   * Creates HTML file with selected template
   */
  const handleDownload = useCallback(() => {
    // Check if regeneration is needed
    if (needsRegeneration) {
      toast({
        title: "Changes not applied",
        description: "Please apply your changes before downloading."
      });
      return;
    }
    
    // Validate content exists
    const contentToDownload = displayContent;
    if (!contentToDownload) {
      toast.error("No content to download");
      return;
    }
    
    // Get selected template
    const template = resumeTemplates.find(t => t.id === selectedTemplate) || resumeTemplates[0];
    
    // Create complete HTML document
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
        ${contentToDownload}
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
    
    toast.success("Resume downloaded");
  }, [needsRegeneration, displayContent, selectedTemplate]);

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  
  /**
   * Check for existing resume on component mount
   * Only runs once per user ID change
   */
  useEffect(() => {
    let isMounted = true;
    
    const checkResume = async () => {
      // Skip if already loading or no user
      if (!user?.id || isLoadingInProgress.current) return;
      
      try {
        isLoadingInProgress.current = true;
        
        console.log("Checking if user has resume...");
        const result = await loadLatestResume(user.id);
        
        // Update state based on result if component is still mounted
        if (isMounted) {
          if (result) {
            console.log("User has a resume");
            setHasResume(true);
          } else {
            console.log("User has no resume");
            setHasResume(false);
          }
        }
      } catch (error) {
        console.error("Error checking for resume:", error);
        if (isMounted) {
          setHasResume(false);
        }
      } finally {
        isLoadingInProgress.current = false;
      }
    };
    
    checkResume();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user?.id, loadLatestResume]);

  /**
   * Cleanup effect for timeouts
   * Ensures timeouts are cleared on unmount
   */
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // UI Helpers & Render Functions
  // -------------------------------------------------------------------------
  
  /**
   * Render empty state with loading button
   * Shows when no resume data is available
   */
  const renderEmptyPreviewStateWithLoad = useCallback(() => (
    <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-4">
      <Sparkles className="h-12 w-12 text-brand-600 mb-4" />
      <p className="text-lg font-medium">No resume data available</p>
      <p className="text-sm text-gray-500 text-center max-w-md">
        {loadAttemptedRef.current 
          ? "You don't have any resumes yet. Upload a resume or paste content to get started."
          : "Upload a resume or paste content to get started with AI optimization"}
      </p>
      <div className="flex gap-4 mt-4">
        <Button 
          onClick={() => setActiveTab("upload")}
        >
          Go to Upload
        </Button>
        
        {!loadAttemptedRef.current && user && (
          <Button
            variant="outline"
            onClick={handleLoadResume}
            disabled={isLoadingInProgress.current}
          >
            {isLoadingInProgress.current ? "Loading..." : "Check for Resumes"}
          </Button>
        )}
      </div>
    </div>
  ), [user, handleLoadResume]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  
  return (
    <div className="py-8">
      {/* Reset Confirmation Dialog */}
      <ResetConfirmationDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
        isResetting={isResetting}
      />

      {/* Header section */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">AI Resume Optimizer</h2>
        <p className="text-gray-500">Perfect your resume with AI-powered suggestions</p>
      </div>

      {/* Main tabs - preview tab disabled during analysis */}
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
            {(isAnalysisInProgress || isUploadInProgress ) && (
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
          <UploadSection
            isUploading={isUploading}
            isParsing={isParsing || isOptimizing}
            selectedFile={selectedFile}
            resumeContent={rawText}
            onFileChange={setSelectedFile}
            onContentChange={handleContentChange}
            onContinue={handleSubmitText}
            onFileUpload={onFileUpload}
            setActiveTab={handleTabChange}
            onAnalysisStart={handleAnalysisStart}
            onAnalysisComplete={handleAnalysisComplete}
          />
        </TabsContent>
        
        {/* Preview tab with proper loading state handling */}
        <TabsContent value="preview" className="space-y-6">
          {/* Show loading state when:
              1. We're currently loading data (isLoadingInProgress.current)
              2. No display content exists AND we're not in analysis
          */}
          {isLoadingInProgress.current || (!displayContent && !isAnalysisInProgress) ? (
            <LoadingState />
          ) : (
            <>
              {!displayContent ? (
                renderEmptyPreviewStateWithLoad()
              ) : (
                <>
                  {/* Edited version banner */}
                  {editedText && !isEditing && (
                    <EditVersionBanner 
                      isEditing={isEditing} 
                      onReset={() => setShowResetDialog(true)} 
                    />
                  )}
                
                  {/* Regenerate button */}
                  {needsRegeneration && !isEditing && (
                    <div className="flex justify-end">
                      <RegenerateButton 
                        isApplying={isApplyingChanges}
                        onRegenerate={handleRegenerateResume}
                      />
                    </div>
                  )}
                  
                  <div className="grid md:grid-cols-5 gap-6">
                    {/* Resume preview */}
                    <div className="col-span-3">
                      <ResumePreview
                        optimizedText={displayContent}
                        originalOptimizedText={optimizedText}
                        selectedTemplate={selectedTemplate}
                        templates={resumeTemplates}
                        appliedKeywords={appliedKeywordsArray}
                        suggestions={[]}
                        onDownload={handleDownload}
                        onSave={handleSave}
                        onTextChange={handlePreviewContentChange}
                        isOptimizing={isOptimizing || isApplyingChanges}
                        language={optimizedData?.language || "English"}
                        onEditModeChange={setIsEditing}
                        onReset={hasEdits ? () => setShowResetDialog(true) : undefined}
                      />
                    </div>
                    {/* Sidebar */}
                    <div className="col-span-2 flex flex-col gap-4">
                      {/* Score card */}
                      <ScoreCard 
                        optimizationScore={currentScoreData.score}
                        resumeContent={displayContent}
                        suggestionsApplied={Array.isArray(appliedSuggestions) ? appliedSuggestions.length : 0}
                        keywordsApplied={Array.isArray(appliedKeywords) ? appliedKeywords.length : 0}
                        scoreBreakdown={currentScoreData.breakdown}
                        potentialScore={currentScoreData.potentialScore}
                        initialScore={optimizationScore}
                      />

                      {/* Suggestions */}
                      <SuggestionsList
                        suggestions={suggestions.map((s, i) => ({
                          ...s,
                          isApplied: Array.isArray(appliedSuggestions) && appliedSuggestions.includes(i)
                        }))}
                        isOptimizing={isOptimizing}
                        onApplySuggestion={handleApplySuggestion}
                        resumeContent={displayContent}
                        showImpactDetails={true}
                        currentScore={currentScoreData.score}
                        simulateSuggestionImpact={simulateSuggestionImpact}
                      />
                      
                      {/* Keywords */}
                      <KeywordList
                        keywords={keywords.map(k => ({
                          ...k,
                          applied: Array.isArray(appliedKeywords) && appliedKeywords.includes(k.text)
                        }))}
                        onKeywordApply={handleKeywordApply}
                        needsRegeneration={needsRegeneration}
                        showImpactDetails={true}
                        currentScore={currentScoreData.score}
                        simulateKeywordImpact={simulateKeywordImpact}
                      />

                      {/* Templates */}
                      <TemplateGallery
                        templates={resumeTemplates}
                        selectedTemplate={selectedTemplate}
                        onTemplateSelect={handleTemplateSelect}
                      />
                      
                      {/* Optimization metrics */}
                      {displayContent && (
                        <OptimizationMetrics 
                          metrics={optimizationMetrics}
                          onExport={exportReport}
                          onDownload={handleDownload}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Pro subscription dialog */}
      <ProUpgradeDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
      />
    </div>
  );
};

export default ResumeOptimizer;