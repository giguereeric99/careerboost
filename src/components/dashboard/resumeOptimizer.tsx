/**
 * ResumeOptimizer Component
 * 
 * Main component that orchestrates the complete resume optimization workflow:
 * 1. File upload or text input
 * 2. Resume parsing and analysis
 * 3. AI-powered optimization
 * 4. WYSIWYG editing and template preview
 * 5. Download or save optimized resume
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

// Import the custom hook for resume optimization
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';

// Import utils for HTML processing
import { prepareOptimizedTextForEditor } from '@/utils/htmlProcessor';

// Import types
import { Suggestion } from '@/types/resume';

// Import components for resume optimization workflow
import UploadSection from '@/components/ResumeOptimizer/UploadSection';
import ResumePreview from '@/components/ResumeOptimizer/ResumePreview';
import ScoreCard from '@/components/ResumeOptimizer/ScoreCard';
import SuggestionsList from '@/components/ResumeOptimizer/SuggestionsList';
import KeywordList from '@/components/ResumeOptimizer/KeywordList';
import TemplateGallery from '@/components/ResumeOptimizer/TemplateGallery';
import ProUpgradeDialog from '@/components/ResumeOptimizer/ProUpgradeDialog';
import { resumeTemplates } from '../../constants/resumeTemplates';

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
    needsRegeneration,
    
    // Data states
    selectedFile,
    resumeData,           // Original parsed resume data
    optimizedData,        // Optimized resume data (processed by AI)
    optimizedText,        // Raw optimized text (as string)
    resumeId,             // ID of the saved resume in database
    suggestions,          // Improvement suggestions from AI
    keywords,             // Keyword suggestions from AI
    optimizationScore,    // ATS compatibility score
    
    // Action handlers
    handleFileUpload,     // Process uploaded file
    optimizeResumeData,   // Send data to AI for optimization
    loadLatestResume,     // Load most recent resume for current user
    applyTemplateToResume, // Apply selected template
    applySuggestion,      // Apply a suggestion to the resume
    toggleKeyword,        // Toggle a keyword's applied state
    applyChanges,         // Apply all pending changes (regenerate)
    setSelectedFile,      // Update the selected file
    setOptimizedData,     // Set optimized data directly
    setOptimizedText      // Set optimized text directly
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
  const [editedHtml, setEditedHtml] = useState<string>(''); // HTML content from TipTap editor

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
    if (activeTab === "preview" && user && !optimizedText) {
      loadLatestOptimizedResumeWrapper();
    }
  }, [activeTab, user, optimizedText]);
  
  /**
   * Effect to log when optimized text becomes available
   */
  useEffect(() => {
    if (optimizedText && optimizedText.length > 0) {
      console.log("Optimized text received (sample):", optimizedText.substring(0, 100) + "...");
      console.log("Full text length:", optimizedText.length);
      
      // Process the text to make it suitable for the editor
      try {
        const processedHtml = prepareOptimizedTextForEditor(optimizedText);
        setEditedHtml(processedHtml);
        console.log("Processed HTML for editor (sample):", processedHtml.substring(0, 100) + "...");
      } catch (error) {
        console.error("Error processing optimized text:", error);
      }
    }
  }, [optimizedText]);
  
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
    } catch (error: any) {
      console.error("Exception in loadLatestOptimizedResumeWrapper:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  /**
   * Handles changes to the pasted resume content
   * 
   * @param e - Textarea change event
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setResumeContent(newText);
    setRawText(newText);
  };

  /**
   * Handles changes from the TipTap editor
   * 
   * @param html - HTML content from the editor
   */
  const handleEditorChange = (html: string) => {
    console.log("Editor content changed");
    setEditedHtml(html);
    
    // Also update optimizedText if it exists
    if (typeof setOptimizedText === 'function') {
      setOptimizedText(html);
    }
  };

  /**
   * Handles template selection
   * Shows pro dialog for premium templates or applies the selected template
   * 
   * @param templateId - ID of the selected template
   */
  const handleTemplateSelect = (templateId: string) => {
    const template = resumeTemplates.find(t => t.id === templateId);
    
    // Check if selected template requires pro subscription
    if (template?.isPro) {
      setShowProDialog(true);
    } else {
      setSelectedTemplate(templateId);
      // This will trigger the useEffect that calls applyTemplateToResume
    }
  };

  /**
   * Toggles a keyword's applied state
   * Delegates to the hook's toggleKeyword function
   * 
   * @param index - Index of the keyword to toggle
   */
  const handleKeywordApply = (index: number) => {
    toggleKeyword(index);
  };
  
  /**
   * Handles applying a keyword directly from the editor
   * 
   * @param keyword - Keyword to apply
   */
  const handleEditorKeywordApply = (keyword: string) => {
    // Find the keyword in the keywords array
    const keywordIndex = keywords.findIndex(k => k.text === keyword);
    if (keywordIndex !== -1) {
      toggleKeyword(keywordIndex);
    }
  };
  
  /**
   * Handles applying a suggestion from the suggestions list
   * Delegates to the hook's applySuggestion function
   * 
   * @param index - Index of the suggestion to apply
   */
  const handleApplySuggestion = (index: number) => {
    applySuggestion(index);
  };

  /**
   * Handles the regeneration of the resume with applied changes
   * Delegates to the hook's applyChanges function
   */
  const handleRegenerateResume = async () => {
    await applyChanges();
  };

  /**
   * Handles resume download action
   * Creates an HTML file with the edited content and template styling
   */
  const handleDownload = () => {
    // Check if changes need to be regenerated first
    if (needsRegeneration) {
      toast({
        title: "Changes not applied",
        description: "Please apply your changes before downloading."
      });
      return;
    }
    
    // Use the edited HTML if available, otherwise use the optimized text
    const contentToDownload = editedHtml || optimizedText;
    
    if (!contentToDownload) {
      toast.error("No content to download");
      return;
    }
    
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
  };

  /**
   * Handles resume save action
   * In production, this would save the resume to the user's account
   */
  const handleSave = () => {
    // Check if changes need to be regenerated first
    if (needsRegeneration) {
      toast({
        title: "Changes not applied",
        description: "Please apply your changes before saving."
      });
      return;
    }
    
    // TODO: Implement actual save functionality
    // This would likely involve sending the edited HTML to your API
    // and updating the resume in the database
    
    toast.success("Resume saved to your account");
  };

  /**
   * Filter to get only applied keywords as an array of strings
   * Used by the ResumePreview component to highlight applied keywords
   */
  const appliedKeywordsArray = keywords
    .filter(keyword => keyword.applied)
    .map(keyword => keyword.text);

  /**
   * Handles form submission for resume optimization from text input
   * Processes the pasted text and calls the optimization API
   */
  const handleSubmitText = async () => {
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
  };
    
  /**
   * File upload handler for UploadSection component
   * Sets the file information for the UI
   * 
   * @param url - URL of the uploaded file
   * @param name - Name of the uploaded file
   * @param size - Size of the uploaded file
   * @param type - MIME type of the uploaded file
   */
  const onFileUpload = (url: string, name: string, size?: number, type?: string) => {
    console.log("File uploaded:", { url, name, size, type });
    setFileUrl(url);
    setFileName(name);
    setSelectedFile(new File([""], name, { type: type || "application/octet-stream" }));
  };

  /**
   * Renders empty state for Preview when no resume data is available
   * Provides a friendly UI for users who haven't uploaded a resume yet
   */
  const renderEmptyPreviewState = () => (
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
  );

  // Main component render
  return (
    <div className="py-8">
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
            onFileChange={() => {}} // Handled by handleFileUpload
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
              {/* Show empty state if no optimized text is available */}
              {!optimizedText ? (
                renderEmptyPreviewState()
              ) : (
                <>
                  {/* Regenerate button (visible only when changes need to be applied) */}
                  {needsRegeneration && (
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
                      {/* New ResumePreview component with TipTap integration */}
                      <ResumePreview
                        optimizedText={optimizedText}
                        selectedTemplate={selectedTemplate}
                        templates={resumeTemplates}
                        appliedKeywords={appliedKeywordsArray}
                        suggestions={suggestions}
                        onDownload={handleDownload}
                        onSave={handleSave}
                        onTextChange={handleEditorChange}
                        onApplySuggestion={handleApplySuggestion}
                        onApplyKeyword={handleEditorKeywordApply}
                        isOptimizing={isOptimizing || isApplyingChanges}
                        language={optimizedData?.language || "English"}
                      />

                      {/* Resume template gallery */}
                      <TemplateGallery
                        templates={resumeTemplates}
                        selectedTemplate={selectedTemplate}
                        onTemplateSelect={handleTemplateSelect}
                      />
                    </div>
                    
                    {/* Right column (2/5) - Tools and suggestions */}
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