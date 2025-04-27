'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

// Import the custom hook for resume optimization
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';

// Import only the parsing utilities that are needed directly in this component
import { 
  parseOptimizedText,
  extractKeywords,
  calculateAtsScore
} from '@/services/resumeParser';

// Import types
import { ResumeData, Suggestion } from '@/types/resume';

// Import components for resume optimization workflow
import UploadSection from '@/components/resumeOptimizer/uploadSection';
import ResumePreview from '@/components/resumeOptimizer/resumePreview';
import ScoreCard from '@/components/resumeOptimizer/scoreCard';
import SuggestionsList from '@/components/resumeOptimizer/suggestionsList';
import KeywordList from '@/components/resumeOptimizer/keywordList';
import TemplateGallery from '@/components/resumeOptimizer/templateGallery';
import ProUpgradeDialog from '@/components/resumeOptimizer/proUpgradeDialog';
import { resumeTemplates } from '../../constants/resumeTemplates';

/**
 * ResumeOptimizer Component
 * 
 * Main component that orchestrates the resume optimization workflow:
 * 1. File upload or text input
 * 2. Resume parsing and analysis
 * 3. AI-powered optimization
 * 4. Preview and template selection
 * 5. Download or save optimized resume
 */
const ResumeOptimizer = () => {
  // Authentication state from Clerk
  const { user } = useUser();

  // Use the custom hook for resume optimization
  // This hook manages the core resume optimization logic and state
  const {
    isUploading,
    isParsing,
    isOptimizing,
    isApplyingChanges,
    needsRegeneration,
    selectedFile,
    resumeData,
    optimizedData,
    optimizedText,
    resumeId,
    suggestions,
    keywords,
    optimizationScore,
    handleFileUpload,
    optimizeResumeData,
    loadLatestResume,
    applyTemplateToResume,
    applySuggestion,
    toggleKeyword,
    applyChanges,
    setSelectedFile
  } = useResumeOptimizer();
  
  // Active tab state (upload or preview)
  const [activeTab, setActiveTab] = useState("upload");
  
  // Resume content and file information
  const [resumeContent, setResumeContent] = useState("");
  const [rawText, setRawText] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  // Loading states that aren't in the hook
  const [initialLoading, setInitialLoading] = useState(false);

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState("basic");
  
  // Pro upgrade dialog state
  const [showProDialog, setShowProDialog] = useState(false);
  
  // Resume sections for preview
  const [resumeSections, setResumeSections] = useState({
    personalInfo: {
      name: "",
      title: "",
      contact: "",
      about: ""
    },
    experience: [] as any[],
    education: {
      degree: "",
      school: "",
      year: "",
      gpa: ""
    },
    skills: [] as string[]
  });

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
   * Effect to parse optimized text into resume sections when it becomes available
   * This effect updates the UI with the optimized resume data
   */
  useEffect(() => {
    if (optimizedText && optimizedText.length > 0) {
      // Parse the optimized text into structured data
      const parsedData = parseOptimizedText(optimizedText);
      
      // Update resume sections for preview
      updateResumeSectionsFromData(parsedData);
    }
  }, [optimizedText]);
  
  /**
   * Loads the most recent optimized resume for the current user
   * Wrapper around the hook's loadLatestResume function
   */
  const loadLatestOptimizedResumeWrapper = async () => {
    if (!user?.id) return;
    
    setInitialLoading(true);
    
    try {
      // Use the hook's function to load the resume
      const data = await loadLatestResume(user.id);
      
      if (!data) {
        // No resume found or error occurred, handled by the hook
        setInitialLoading(false);
        return;
      }
      
    } catch (error: any) {
      // Error already handled by the hook
      console.error("Exception in loadLatestOptimizedResumeWrapper:", error);
    } finally {
      setInitialLoading(false);
    }
  };
  
  /**
   * Updates resume sections from parsed data for preview
   * Transforms the parsed data into UI-friendly format
   * 
   * @param data - Parsed resume data
   */
  const updateResumeSectionsFromData = (data: ResumeData) => {
    // Format contact information
    let contactInfo = "";
    if (data.location) contactInfo += data.location;
    if (data.email) {
      if (contactInfo) contactInfo += " | ";
      contactInfo += data.email;
    }
    if (data.phone) {
      if (contactInfo) contactInfo += " | ";
      contactInfo += data.phone;
    }
    
    // Update resume sections for preview
    setResumeSections({
      personalInfo: {
        name: data.fullName || "Your Name",
        title: data.title || "Professional Title",
        contact: contactInfo || "Contact Information",
        about: data.summary || "Professional summary"
      },
      experience: data.experience.map(exp => ({
        title: exp.position,
        company: exp.company,
        period: `${exp.startDate}${exp.endDate ? ` - ${exp.endDate}` : ''}`,
        location: exp.location || '',
        achievements: exp.description || []
      })),
      education: data.education.length > 0 ? {
        degree: data.education[0].degree,
        school: data.education[0].institution,
        year: data.education[0].endDate || data.education[0].startDate || '',
        gpa: data.education[0].gpa || ''
      } : {
        degree: "",
        school: "",
        year: "",
        gpa: ""
      },
      skills: data.skills || []
    });
  };

  /**
   * Handles changes to the pasted resume content
   * 
   * @param e - Textarea change event
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResumeContent(e.target.value);
    setRawText(e.target.value);
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
   * In production, this would generate and download a file
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
    
    toast.success("Resume downloaded");
    
    // In a real implementation, this would generate and download a PDF/DOCX file
    // based on the selected template and current resume content
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
    
    toast.success("Resume saved to your account");
    
    // In a real implementation, this would save the current state of the resume
    // to the user's account in the database
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
   * Processes the pasted text
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
   */
  const onFileUpload = (url: string, name: string) => {
    setFileUrl(url);
    setFileName(name);
    setSelectedFile(new File([""], name, { type: "application/octet-stream" }));
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
                      <ResumePreview
                        resumeSections={resumeSections}
                        selectedTemplate={selectedTemplate}
                        templates={resumeTemplates}
                        appliedKeywords={appliedKeywordsArray}
                        onDownload={handleDownload}
                        onSave={handleSave}
                        isOptimizing={isOptimizing || isApplyingChanges}
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