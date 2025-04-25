'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

// Import enhanced resume parser utilities
import { 
  ResumeData, 
  Suggestion,
  uploadResume,
  parseResume,
  optimizeResume,
  getLatestOptimizedResume,
  parseOptimizedText,
  extractKeywords,
  calculateAtsScore
} from '@/services/resumeParser';

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
  
  // Active tab state (upload or preview)
  const [activeTab, setActiveTab] = useState("upload");
  
  // Resume content and file information
  const [resumeContent, setResumeContent] = useState("");
  const [rawText, setRawText] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Processing states
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  
  // Optimized resume data
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [originalText, setOriginalText] = useState<string>("");
  const [optimizedText, setOptimizedText] = useState<string>("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("English");
  
  // Resume data models
  const [parsedResumeData, setParsedResumeData] = useState<ResumeData | null>(null);
  const [optimizedResumeData, setOptimizedResumeData] = useState<ResumeData | null>(null);
  
  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState("basic");
  
  // Optimization results
  const [atsScore, setAtsScore] = useState<number>(0);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [improvementSuggestions, setImprovementSuggestions] = useState<Suggestion[]>([]);
  
  // User selections
  const [keywords, setKeywords] = useState<{text: string, applied: boolean}[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  
  // Regeneration state
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
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
   */
  useEffect(() => {
    if (selectedTemplate) {
      setNeedsRegeneration(true);
    }
  }, [selectedTemplate]);
  
  /**
   * Effect to load optimized resume when tab changes to preview
   * or when resumeId changes
   */
  useEffect(() => {
    if (activeTab === "preview" && user && !optimizedText) {
      loadLatestOptimizedResume();
    }
  }, [activeTab, user]);
  
  /**
   * Effect to parse optimized text into resume sections when it becomes available
   */
  useEffect(() => {
    if (optimizedText && optimizedText.length > 0) {
      // Parse the optimized text into structured data
      const parsedData = parseOptimizedText(optimizedText);
      setOptimizedResumeData(parsedData);
      
      // Update resume sections for preview
      updateResumeSectionsFromData(parsedData);
      
      // Extract keywords from the optimized text
      const extractedKeywords = extractKeywords(optimizedText);
      setSuggestedKeywords(extractedKeywords);
      
      // Convert to keyword objects with applied=false
      setKeywords(extractedKeywords.map(keyword => ({
        text: keyword,
        applied: false
      })));
      
      // Calculate initial ATS score
      const initialScore = calculateAtsScore(parsedData);
      setAtsScore(initialScore);
    }
  }, [optimizedText]);
  
  /**
   * Loads the most recent optimized resume for the current user
   * Includes improved error handling to prevent blocking the UI flow
   */
  const loadLatestOptimizedResume = async () => {
    if (!user?.id) return;
    
    setInitialLoading(true);
    
    try {
      console.log("Attempting to load resume for user:", user.id);
      const { data, error } = await getLatestOptimizedResume(user.id);
      
      if (error) {
        console.error("Error loading resume:", error);
        
        // Display a warning but allow user to continue in Preview tab
        toast.warning("Couldn't load previous resume", {
          description: "You can upload a new resume or paste content to begin."
        });
        
        // Don't redirect, let the user stay in Preview with empty state
        setInitialLoading(false);
        return;
      }
      
      if (data) {
        // Resume found - save the data
        console.log("Resume loaded successfully");
        setResumeId(data.id);
        setOriginalText(data.original_text);
        setOptimizedText(data.optimized_text);
        setDetectedLanguage(data.language || "English");
        
        toast.success("Resume loaded successfully", {
          description: `Language: ${data.language}`,
        });
      } else {
        // No resume found for this user
        console.log("No previous resume found for user");
        toast.info("No previous resume found", {
          description: "Please upload a resume to begin optimization."
        });
        
        // User can stay in Preview and see empty state ready for new upload
      }
    } catch (error: any) {
      // Handle any unexpected exceptions
      console.error("Exception in loadLatestOptimizedResume:", error);
      toast.error("Error loading resume", {
        description: "Please try uploading a new resume."
      });
      
      // Allow user to stay in Preview tab with empty state
    } finally {
      setInitialLoading(false);
    }
  };
  
  /**
   * Updates resume sections from parsed data for preview
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
   * Handles file selection and uploads the resume
   * 
   * @param file - Selected resume file
   */
  const handleFileUpload = async (file: File) => {
    if (!file) return null;
    
    setIsUploading(true);
    
    try {
      // Upload the file to storage
      const { path, error } = await uploadResume(file);
      
      if (error) throw error;
      
      setFileName(file.name);
      setSelectedFile(file);
      
      // Parse the resume to extract structured data
      setIsParsing(true);
      
      const { data: parsedData, error: parseError } = await parseResume(path);
      
      if (parseError) throw parseError;
      
      if (parsedData) {
        setParsedResumeData(parsedData);
        
        // Optimize the resume with AI
        setIsOptimizing(true);
        
        const { 
          optimizedData, 
          optimizedText: aiText, 
          suggestions, 
          keywordSuggestions,
          atsScore: score,
          error: optimizeError 
        } = await optimizeResume(parsedData);
        
        if (optimizeError) throw optimizeError;
        
        if (optimizedData && aiText) {
          // Save optimization results
          setOptimizedResumeData(optimizedData);
          setOptimizedText(aiText);
          setImprovementSuggestions(suggestions);
          setSuggestedKeywords(keywordSuggestions);
          setAtsScore(score);
          
          // Format keywords for UI
          setKeywords(keywordSuggestions.map(keyword => ({
            text: keyword,
            applied: false
          })));
          
          // Navigate to preview tab
          setActiveTab("preview");
          
          return optimizedData;
        }
      }
      
      return null;
    } catch (error: any) {
      console.error("Error in handleFileUpload:", error);
      toast.error("Resume upload failed", {
        description: error.message
      });
      return null;
    } finally {
      setIsUploading(false);
      setIsParsing(false);
      setIsOptimizing(false);
    }
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
      // Mark that changes need to be regenerated
      setNeedsRegeneration(true);
    }
  };

  /**
   * Toggles a keyword's applied state
   * Updates both the local state and marks for regeneration
   * 
   * @param index - Index of the keyword to toggle
   */
  const handleKeywordApply = (index: number) => {
    const updatedKeywords = [...keywords];
    updatedKeywords[index].applied = !updatedKeywords[index].applied;
    setKeywords(updatedKeywords);
    
    // Mark that changes need to be regenerated
    setNeedsRegeneration(true);
  };
  
  /**
   * Handles applying a suggestion from the suggestions list
   * Marks that changes need to be regenerated
   * 
   * @param index - Index of the suggestion to apply
   */
  const handleApplySuggestion = (index: number) => {
    const updatedAppliedSuggestions = [...appliedSuggestions];
    
    // Toggle suggestion application
    if (updatedAppliedSuggestions.includes(index)) {
      // Remove if already applied
      const suggestionIndex = updatedAppliedSuggestions.indexOf(index);
      updatedAppliedSuggestions.splice(suggestionIndex, 1);
    } else {
      // Add if not applied
      updatedAppliedSuggestions.push(index);
    }
    
    setAppliedSuggestions(updatedAppliedSuggestions);
    
    // Mark that changes need to be regenerated
    setNeedsRegeneration(true);
  };

  /**
   * Handles the regeneration of the resume with applied changes
   * Updates the resume preview with new content based on selected keywords and applied suggestions
   */
  const handleRegenerateResume = async () => {
    if (!needsRegeneration) return;
    
    setIsRegenerating(true);
    toast.loading("Applying your changes to the resume...");
    
    try {
      // Get applied keywords
      const appliedKeywordsList = keywords
        .filter(keyword => keyword.applied)
        .map(keyword => keyword.text);
      
      // Get applied suggestions
      const appliedSuggestionsList = appliedSuggestions.map(index => improvementSuggestions[index]);
      
      // In a production implementation, you would call an API here to regenerate
      // the resume with the applied keywords and suggestions
      // For now, we'll simulate the regeneration by modifying the local data
      
      // 1. Add applied keywords to skills
      const updatedSkills = [
        ...resumeSections.skills.filter(skill => 
          !keywords.some(k => k.text.toLowerCase() === skill.toLowerCase())
        ),
        ...appliedKeywordsList
      ];
      
      // 2. Update resume sections with new skills
      const updatedSections = {
        ...resumeSections,
        skills: updatedSkills
      };
      
      // 3. Update the resume sections state
      setResumeSections(updatedSections);
      
      // 4. Recalculate ATS score based on applied changes
      const newScore = Math.min(100, atsScore + (appliedKeywordsList.length * 2) + (appliedSuggestionsList.length * 3));
      setAtsScore(newScore);
      
      // Success message
      toast.dismiss();
      toast.success("Resume updated with your changes", {
        description: `New ATS Score: ${newScore}/100`
      });
      
      // Reset regeneration flag
      setNeedsRegeneration(false);
    } catch (error: any) {
      toast.dismiss();
      toast.error("Failed to apply changes", {
        description: error.message || "There was an error applying your changes. Please try again."
      });
    } finally {
      setIsRegenerating(false);
    }
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
  
    setIsOptimizing(true);
    toast.loading("Analyzing your resume...");
  
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
      
      // Save the optimized text and related data
      setOptimizedText(result.optimizedText);
      setDetectedLanguage(result.language || "English");
      
      // If we got suggestions and keywords from the API, use them
      if (result.suggestions) {
        setImprovementSuggestions(result.suggestions);
      }
      
      if (result.keywordSuggestions) {
        setSuggestedKeywords(result.keywordSuggestions);
        setKeywords(result.keywordSuggestions.map((keyword: string) => ({
          text: keyword,
          applied: false
        })));
      }
      
      // Use ATS score from API or calculate it
      if (result.atsScore) {
        setAtsScore(result.atsScore);
      } else {
        const parsedData = parseOptimizedText(result.optimizedText);
        const score = calculateAtsScore(parsedData);
        setAtsScore(score);
      }
      
      toast.dismiss();
      toast.success("Resume optimized successfully", {
        description: `Language detected: ${result.language || "English"}`
      });
      
      // Navigate to preview tab
      setActiveTab("preview");
  
    } catch (error: any) {
      toast.dismiss();
      toast.error("Optimization failed", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setIsOptimizing(false);
    }
  };
    
  /**
   * File upload handler for UploadSection component
   * 
   * @param url - URL of the uploaded file
   * @param name - Name of the uploaded file
   */
  const onFileUpload = (url: string, name: string) => {
    setFileUrl(url);
    setFileName(name);
    setSelectedFile(new File([""], name, { type: "application/octet-stream" }));
  };

  // Render empty state for Preview when no resume data is available
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
                        disabled={isRegenerating}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isRegenerating ? (
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
                        isOptimizing={isOptimizing || isRegenerating}
                      />
                    </div>
                    
                    {/* Right column (2/5) - Tools and suggestions */}
                    <div className="col-span-2 flex flex-col gap-4">
                      {/* ATS Optimization score card */}
                      <ScoreCard optimizationScore={atsScore} />

                      {/* AI-powered improvement suggestions */}
                      <SuggestionsList
                        suggestions={improvementSuggestions}
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