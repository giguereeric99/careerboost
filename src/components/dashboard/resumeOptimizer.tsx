/**
 * ResumeOptimizer Component
 * 
 * Main component that manages the resume optimization workflow.
 * Uses custom hooks for separation of concerns between uploading and editing.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

// Import components
import UploadResume from '@/components/resumeOptimizer/uploadResume';
import ResumePreview from '@/components/resumeOptimizer/resumePreview';
import ScoreCard from '@/components/resumeOptimizer/scoreCard';
import SuggestionsList from '@/components/resumeOptimizer/suggestionsList';
import KeywordList from '@/components/resumeOptimizer/keywordList';
import TemplateGallery from '@/components/resumeOptimizer/templateGallery';
import ResetConfirmationDialog from '@/components/Dialogs/resetConfirmationDialog';
import LoadingState from '@/components/resumeOptimizer/loadingState';
import EmptyPreviewState from '@/components/resumeOptimizer/emptyPreviewState';
import { resumeTemplates } from '@/constants/resumeTemplates';

// Import custom hooks
import useResumeOptimizer from '@/hooks/optimizer/useResumeOptimizer';
import useUploadSection from '@/hooks/optimizer/useUploadSection';

/**
 * ResumeOptimizer Component - Main entry point for the resume optimization workflow
 */
const ResumeOptimizer: React.FC = () => {
  // Get user authentication state
  const { user } = useUser();
  
  // Track when showing the loading state during optimization
  const [showLoadingState, setShowLoadingState] = useState(false);
  
  // Use the main optimizer hook
  const {
    // State
    resumeData,
    optimizedText,
    editedText,
    atsScore,
    suggestions,
    keywords,
    isEditing,
    selectedTemplate,
    isLoading,
    isSaving,
    isResetting,
    hasResume,
    activeTab,
    
    // Actions
    setActiveTab,
    setIsEditing,
    setSelectedTemplate,
    loadLatestResume,
    saveResume,
    resetResume,
    handleContentEdit,
    handleApplySuggestion,
    handleKeywordApply,
    updateResumeWithOptimizedData
  } = useResumeOptimizer(user?.id);
  
  // Use the upload section hook
  const {
    // State
    selectedFile,
    resumeContent,
    isUploading, 
    isOptimizing,
    
    // Actions
    setSelectedFile,
    handleContentChange,
    handleFileUpload,
    processUploadedFile,
    handleTextAnalysis
  } = useUploadSection({
    // Pass the callback to receive optimization data
    onOptimizationComplete: (optimizedText, resumeId, atsScore, suggestions, keywords) => {
      // Update the main state with optimization results
      updateResumeWithOptimizedData(optimizedText, resumeId, atsScore, suggestions, keywords);
      
      // Hide loading state and change tab after processing
      setShowLoadingState(false);
      setActiveTab('preview');
    }
  });
  
  /**
   * Handle tab change with data loading if needed
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
    }
  }, [user?.id, isUploading, isOptimizing, isLoading, loadLatestResume, optimizedText, setActiveTab]);
  
  /**
   * Handle analysis start - show loading state
   */
  const handleAnalysisStart = useCallback(() => {
    setShowLoadingState(true);
  }, []);
  
  /**
   * Calculate if preview tab should be disabled
   */
  const isPreviewTabDisabled = isLoading || isUploading || isOptimizing || showLoadingState;
  
  /**
   * Determine which content to display in the preview
   */
  const displayContent = editedText || (resumeData?.last_saved_text ?? resumeData?.optimized_text) || optimizedText || '';
  
  /**
   * Get array of applied keywords for templates
   */
  const appliedKeywordsArray = keywords
    .filter(keyword => keyword.is_applied)
    .map(keyword => keyword.text);
  
  /**
   * Handle reset dialog confirmation
   */
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  /**
   * Handle resume download
   */
  const handleDownload = useCallback(() => {
    // Validate content exists
    if (!displayContent) {
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
          {/* <UploadSection
            isUploading={isUploading}
            isParsing={isOptimizing}
            selectedFile={selectedFile}
            resumeContent={resumeContent}
            onFileChange={setSelectedFile}
            onContentChange={handleContentChange}
            onContinue={handleTextAnalysis}
            onFileUpload={handleFileUpload}
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
          /> */}
          <UploadResume />
        </TabsContent>
        
        {/* Preview tab with optimized loading state handling */}
        <TabsContent value="preview" className="space-y-6">
          {/* 
           * Display appropriate content based on state:
           * 1. Show loading spinner during analysis
           * 2. Show empty state when no content exists
           * 3. Show content when available
           */}
          {showLoadingState || isOptimizing ? (
            <LoadingState onSkipLoading={() => setShowLoadingState(false)} />
          ) : !displayContent ? (
            <EmptyPreviewState 
              onGoToUpload={() => setActiveTab('upload')} 
              onCheckForResumes={loadLatestResume}
            />
          ) : (
            <>
              {/* Main content area with 5-column grid layout */}
              <div className="grid md:grid-cols-5 gap-6">
                {/* Resume preview - takes 3 columns */}
                <div className="col-span-3">
                  div resume preview
                </div>

                {/* Sidebar with optimization controls - takes 2 columns */}
                <div className="col-span-2 flex flex-col gap-4">
         

                    <div>sidebar</div>
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