/**
 * ResumeOptimizer Component (Updated)
 * 
 * Main component that orchestrates the complete resume optimization workflow with enhanced features:
 * 1. File upload or text input
 * 2. AI-powered optimization and suggestions
 * 3. Resume preview and editing via accordions
 * 4. Save edits to last_saved_text and reset functionality
 * 5. Template selection and download
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

// Import the custom hook for resume optimization
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';

// Import utils for HTML processing
import { prepareOptimizedTextForEditor } from '@/utils/htmlProcessor';
import { normalizeHtmlContent } from '@/utils/resumeUtils';

// Import types
import { Suggestion } from '@/types/resume';

// Import components for resume optimization workflow
import UploadSection from '@/components/ResumeOptimizer/UploadSection';
import ResumePreview from '@/components/ResumeOptimizer/ResumePreview';
import ScoreCard from '@/components/ResumeOptimizer/ScoreCard';
import SuggestionsList from '@/components/ResumeOptimizer/SuggestionsList';
import KeywordList from '@/components/ResumeOptimizer/KeywordList';
import TemplateGallery from '@/components/ResumeOptimizer/TemplateGallery';
import ProUpgradeDialog from '@/components/Dialogs/ProUpgradeDialog';
import ResetConfirmationDialog from '@/components/Dialogs/ResetConfirmationDialog';
import { resumeTemplates } from '@/constants/resumeTemplates';

/**
 * ResumeOptimizer Component
 * 
 * This is the main component that provides the resume optimization functionality.
 * It handles the workflow from upload to optimization to preview and template selection.
 */
const ResumeOptimizer: React.FC = () => {
  // Get authentication state from Clerk
  const { user } = useUser();

  // Use the custom hook for resume optimization
  // This hook manages the core resume optimization logic and state
  const {
    // Loading states
    isUploading,
    isParsing,
    isOptimizing,
    isApplyingChanges,
    isResetting,
    needsRegeneration,
    
    // Data states
    selectedFile,
    resumeData,           // Original parsed resume data
    optimizedData,        // Optimized resume data (processed by AI)
    optimizedText,        // Original AI-optimized text (as string)
    editedText,           // User-edited text from last_saved_text
    resumeId,             // ID of the saved resume in database
    suggestions,          // Improvement suggestions from AI
    keywords,             // Keyword suggestions from AI
    optimizationScore,    // ATS compatibility score
    
    // Actions
    handleFileUpload,     // Process uploaded file
    optimizeResumeData,   // Send data to AI for optimization
    loadLatestResume,     // Load most recent resume for current user
    applyTemplateToResume, // Apply selected template
    applySuggestion,      // Apply a suggestion to the resume
    toggleKeyword,        // Toggle a keyword's applied state
    applyChanges,         // Apply all pending changes (regenerate)
    resetResume,          // Reset resume to original optimized version
    
    // Setters
    setSelectedFile,      // Update the selected file
    setOptimizedData,     // Set optimized data directly
    setOptimizedText,     // Set optimized text directly
    setEditedText         // Set edited text directly
  } = useResumeOptimizer();
  
  // UI state management
  const [activeTab, setActiveTab] = useState("upload");  // Current active tab
  const [resumeContent, setResumeContent] = useState(""); // Content from text input
  const [rawText, setRawText] = useState<string>("");     // Raw text for API
  const [fileUrl, setFileUrl] = useState<string | null>(null); // URL of uploaded file
  const [fileName, setFileName] = useState<string | null>(null); // Name of uploaded file
  const [initialLoading, setInitialLoading] = useState(false);  // Initial loading state
  const [selectedTemplate, setSelectedTemplate] = useState("basic"); // Selected template ID
  const [showProDialog, setShowProDialog] = useState(false); // Pro upgrade dialog visibility
  const [showResetDialog, setShowResetDialog] = useState(false); // Reset confirmation dialog
  const [processedHtml, setProcessedHtml] = useState<string>(''); // Processed HTML for preview
  const [isEditing, setIsEditing] = useState(false); // Track if user is in edit mode

  /**
   * Effect to reset regeneration state when changing templates
   * Notifies the optimizer hook that changes need to be regenerated
   */
  useEffect(() => {
    if (selectedTemplate) {
      applyTemplateToResume(selectedTemplate);
    }
  }, [selectedTemplate, applyTemplateToResume]);
  
  /**
   * Effect to load optimized resume when tab changes to preview
   * or when resumeId changes
   */
  useEffect(() => {
    // Only load resume if we're on preview tab, user is logged in, and we don't have content yet
    if (activeTab === "preview" && user && !optimizedText && !editedText) {
      loadLatestOptimizedResumeWrapper();
    }
  }, [activeTab, user, optimizedText, editedText]);
  
  /**
   * Effect to process resume text when it becomes available
   * Prioritizes editedText (last_saved_text) over optimizedText
   */
  useEffect(() => {
    // First check if we have edited text to display, otherwise use optimized text
    const textToProcess = editedText || optimizedText;
    
    if (textToProcess && textToProcess.length > 0) {
      console.log("Resume text received (sample):", textToProcess.substring(0, 100) + "...");
      console.log("Source:", editedText ? "last_saved_text" : "optimized_text");
      
      // Process the text to make it suitable for display
      try {
        // First normalize the HTML to ensure consistent format
        const normalizedText = normalizeHtmlContent(textToProcess);
        
        // Then prepare it for the editor
        const processedContent = prepareOptimizedTextForEditor(normalizedText);
        setProcessedHtml(processedContent);
      } catch (error) {
        console.error("Error processing resume text:", error);
        setProcessedHtml(textToProcess);
      }
    }
  }, [optimizedText, editedText]);
  
  /**
   * Loads the most recent optimized resume for the current user
   * Wrapper around the hook's loadLatestResume function with additional UI handling
   */
  const loadLatestOptimizedResumeWrapper = async () => {
    if (!user?.id) return;
    
    setInitialLoading(true);
    
    try {
      console.log("Loading latest resume for user:", user.id);
      
      // Use the hook's function to load the resume
      const data = await loadLatestResume(user.id);
      
      if (!data) {
        console.log("No resume data found or error occurred");
        setInitialLoading(false);
        return;
      }
      
      console.log("Resume loaded successfully:", data.id);
      console.log("Has last_saved_text:", Boolean(data.last_saved_text));
    } catch (error: any) {
      console.error("Exception in loadLatestOptimizedResumeWrapper:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  /**
   * Handles changes to the pasted resume content
   * Updates the state with the new text
   * 
   * @param e - Textarea change event
   */
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setResumeContent(newText);
    setRawText(newText);
  }, []);

  /**
   * Handles content changes from the ResumePreview component
   * Updates both local state and the optimizer hook's state
   * 
   * @param html - HTML content from the editor
   */
  const handlePreviewContentChange = useCallback((html: string) => {
    console.log("Resume content changed");
    setProcessedHtml(html);
    
    // Also update editedText in the hook
    if (typeof setEditedText === 'function') {
      setEditedText(html);
    }
    
    // Mark that changes need to be regenerated for AI suggestions and keywords
    // We don't call applyChanges here because we want the user to do that explicitly
    console.log("Content changed, will need regeneration");
  }, [setEditedText]);

  /**
   * Handles template selection
   * Shows pro dialog for premium templates or applies the selected template
   * 
   * @param templateId - ID of the selected template
   */
  const handleTemplateSelect = useCallback((templateId: string) => {
    const template = resumeTemplates.find(t => t.id === templateId);
    
    // Check if selected template requires pro subscription
    if (template?.isPro) {
      setShowProDialog(true);
    } else {
      setSelectedTemplate(templateId);
      // This will trigger the useEffect that calls applyTemplateToResume
    }
  }, []);

  /**
   * Toggles a keyword's applied state
   * Delegates to the hook's toggleKeyword function
   * 
   * @param index - Index of the keyword to toggle
   */
  const handleKeywordApply = useCallback((index: number) => {
    toggleKeyword(index);
  }, [toggleKeyword]);
  
  /**
   * Handles applying a keyword directly from the editor
   * Finds the keyword in the array and toggles its state
   * 
   * @param keyword - Keyword to apply
   */
  const handleEditorKeywordApply = useCallback((keyword: string) => {
    // Find the keyword in the keywords array
    const keywordIndex = keywords.findIndex(k => k.text === keyword);
    if (keywordIndex !== -1) {
      toggleKeyword(keywordIndex);
    }
  }, [keywords, toggleKeyword]);
  
  /**
   * Handles applying a suggestion from the suggestions list
   * Delegates to the hook's applySuggestion function
   * 
   * @param index - Index of the suggestion to apply
   */
  const handleApplySuggestion = useCallback((index: number) => {
    applySuggestion(index);
  }, [applySuggestion]);

  /**
   * Handles the regeneration of the resume with applied changes
   * Delegates to the hook's applyChanges function
   */
  const handleRegenerateResume = useCallback(async () => {
    await applyChanges();
  }, [applyChanges]);

  /**
   * Handles resume download action
   * Creates an HTML file with the edited content and template styling
   */
  const handleDownload = useCallback(() => {
    // Check if changes need to be regenerated first
    if (needsRegeneration) {
      toast({
        title: "Changes not applied",
        description: "Please apply your changes before downloading."
      });
      return;
    }
    
    // Use the processed HTML if available, otherwise use edited or optimized text
    const contentToDownload = processedHtml || editedText || optimizedText;
    
    if (!contentToDownload) {
      toast.error("No content to download");
      return;
    }
    
    // Find the template object
    const template = resumeTemplates.find(t => t.id === selectedTemplate) || resumeTemplates[0];
    
    // Create a temporary HTML file with the content
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
    
    // Create a blob and download link
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
  }, [needsRegeneration, processedHtml, editedText, optimizedText, selectedTemplate]);

  /**
   * Handles saving the resume to the database
   * Updates the last_saved_text field with the edited content
   * 
   * @param content - HTML content to save
   * @returns Promise<boolean> indicating success/failure
   */
  const handleSave = useCallback(async (content: string): Promise<boolean> => {
    try {
      // Validate content
      if (!content || typeof content !== 'string') {
        throw new Error("Invalid content provided");
      }
      
      const safeContent = String(content);
      
      // Basic content validation
      if (safeContent.length < 50) {
        toast.error("Content too short", {
          description: "The resume content is too short to be saved."
        });
        return false;
      }
      
      // If we don't have a resume ID, we can't save
      if (!resumeId) {
        toast.error("Cannot save resume", {
          description: "No resume ID found for saving."
        });
        return false;
      }
      
      console.log(`Saving resume ID ${resumeId} with content length: ${safeContent.length}`);
      
      // Save to database using the API
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeId: resumeId,
          content: safeContent,
          userId: user?.id
        }),
      });
      
      // Check if the save was successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save resume");
      }
      
      // Parse the response
      const result = await response.json();
      
      // Update edited text in the state
      setEditedText(safeContent);
      
      // Update processed HTML state
      setProcessedHtml(safeContent);
      
      // Return success
      return true;
    } catch (error: any) {
      // Log the error
      console.error("Error saving resume:", error);
      
      // Return failure
      return false;
    }
  }, [resumeId, user?.id, setEditedText]);

  /**
   * Handles resetting the resume to the original optimized version
   * Delegates to the hook's resetResume function
   */
  const handleReset = useCallback(async () => {
    const success = await resetResume();
    
    if (success) {
      // Close the dialog
      setShowResetDialog(false);
      
      // Set processed HTML to the original optimized text
      if (optimizedText) {
        try {
          const processedContent = prepareOptimizedTextForEditor(optimizedText);
          setProcessedHtml(processedContent);
        } catch (error) {
          console.error("Error processing optimized text after reset:", error);
          setProcessedHtml(optimizedText);
        }
      }
    }
  }, [resetResume, optimizedText]);

  /**
   * Handles form submission for resume optimization from text input
   * Processes the pasted text and calls the optimization API
   */
  const handleSubmitText = useCallback(async () => {
    if (!rawText || rawText.length < 50) {
      toast.error("Please enter at least 50 characters", {
        description: "Your resume text is too short for proper analysis."
      });
      return;
    }
  
    try {
      // Create form data for API request
      const formData = new FormData();
      formData.append("rawText", rawText);
      if (user?.id) formData.append("userId", user.id);
  
      // Send to backend API
      const res = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });
  
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to optimize resume");
      }
  
      const result = await res.json();
      console.log("API optimization result received");
      
      // Navigate to preview tab on success
      setActiveTab("preview");
  
    } catch (error: any) {
      toast.error("Optimization failed", {
        description: error.message || "An unexpected error occurred."
      });
    }
  }, [rawText, user?.id]);
    
  /**
   * File upload handler for UploadSection component
   * Sets the file information for the UI and optimizer hook
   * 
   * @param url - URL of the uploaded file
   * @param name - Name of the uploaded file
   * @param size - Size of the uploaded file
   * @param type - MIME type of the uploaded file
   */
  const onFileUpload = useCallback((url: string, name: string, size?: number, type?: string) => {
    console.log("File uploaded:", { url, name, size, type });
    setFileUrl(url);
    setFileName(name);
    setSelectedFile(new File([""], name, { type: type || "application/octet-stream" }));
  }, [setSelectedFile]);

  /**
   * Filter to get only applied keywords as an array of strings
   * Used by the ResumePreview component to highlight applied keywords
   */
  const appliedKeywordsArray = keywords
    .filter(keyword => keyword.applied)
    .map(keyword => keyword.text);

  /**
   * Renders empty state for Preview when no resume data is available
   * Provides a friendly UI for users who haven't uploaded a resume yet
   */
  const renderEmptyPreviewState = useCallback(() => (
    <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-4">
      <Sparkles className="h-12 w-12 text-brand-600 mb-4" />
      <p className="text-lg font-medium">No resume data available</p>
      <p className="text-sm text-gray-500 text-center max-w-md">
        Upload a resume or paste content to get started with AI optimization
      </p>
      <Button 
        className="mt-4"
        onClick={() => setActiveTab("upload")}
      >
        Go to Upload
      </Button>
    </div>
  ), [setActiveTab]);

  /**
   * Handler for when edit mode changes
   * Used to show/hide certain UI elements
   */
  const handleEditModeChange = useCallback((isEditingMode: boolean) => {
    setIsEditing(isEditingMode);
  }, []);

  /**
   * Determine if the resume has edits that can be reset
   * Used to enable/disable the reset button
   */
  const hasEdits = Boolean(editedText);

  // Main component render
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

      {/* Main tabs for the resume optimization workflow */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
        {/* Tab navigation */}
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">Upload Resume</TabsTrigger>
          <TabsTrigger value="preview">Optimize & Preview</TabsTrigger>
        </TabsList>
        
        {/* Upload tab content */}
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
            setActiveTab={setActiveTab}
          />
        </TabsContent>
        
        {/* Preview tab content */}
        <TabsContent value="preview" className="space-y-6">
          {/* Initial loading state */}
          {initialLoading ? (
            <div className="flex flex-col items-center justify-center h-[200px]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-600"></div>
              <p className="mt-4 text-gray-500">Loading your optimized resume...</p>
            </div>
          ) : (
            <>
              {/* Show empty state if no resume content is available */}
              {!optimizedText && !editedText ? (
                renderEmptyPreviewState()
              ) : (
                <>
                  {/* Info chip showing if we're displaying edited version */}
                  {editedText && !isEditing && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center mb-4">
                      <span className="text-blue-600 text-sm">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                        You're viewing your edited version of the resume
                      </span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="ml-auto text-blue-600 text-xs"
                        onClick={() => setShowResetDialog(true)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> Reset to AI version
                      </Button>
                    </div>
                  )}
                
                  {/* Regenerate button (visible only when changes need to be applied) */}
                  {needsRegeneration && !isEditing && (
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleRegenerateResume}
                        disabled={isApplyingChanges}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isApplyingChanges ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Applying changes...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Apply Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  <div className="grid md:grid-cols-5 gap-6">
                    {/* Left column (3/5) - Resume preview */}
                    <div className="col-span-3">
                      {/* Resume preview with editing via accordions */}
                      <ResumePreview
                        optimizedText={editedText || optimizedText}
                        originalOptimizedText={optimizedText}
                        selectedTemplate={selectedTemplate}
                        templates={resumeTemplates}
                        appliedKeywords={appliedKeywordsArray}
                        suggestions={[]} // Removed suggestions from accordions
                        onDownload={handleDownload}
                        onSave={handleSave}
                        onTextChange={handlePreviewContentChange}
                        isOptimizing={isOptimizing || isApplyingChanges}
                        language={optimizedData?.language || "English"}
                        onEditModeChange={handleEditModeChange}
                        onReset={hasEdits ? () => setShowResetDialog(true) : undefined}
                      />
                    </div>
                    
                    {/* Right column (2/5) - Always visible, even in edit mode */}
                    <div className="col-span-2 flex flex-col gap-4">
                      {/* ATS Optimization score card */}
                      <ScoreCard optimizationScore={optimizationScore} />

                      {/* AI-powered improvement suggestions */}
                      <SuggestionsList
                        suggestions={suggestions}
                        isOptimizing={isOptimizing}
                        onApplySuggestion={handleApplySuggestion}
                      />
                      
                      {/* Industry-specific keywords suggestions */}
                      <KeywordList
                        keywords={keywords}
                        onKeywordApply={handleKeywordApply}
                        needsRegeneration={needsRegeneration}
                      />

                      {/* Resume template gallery */}
                      <TemplateGallery
                        templates={resumeTemplates}
                        selectedTemplate={selectedTemplate}
                        onTemplateSelect={handleTemplateSelect}
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Pro subscription upgrade dialog */}
      <ProUpgradeDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
      />
    </div>
  );
};

export default ResumeOptimizer;