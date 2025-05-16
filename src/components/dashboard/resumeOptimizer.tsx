/**
 * ResumeOptimizer Component
 * 
 * Main component that manages the resume optimization workflow.
 * Uses custom hooks for separation of concerns: 
 * - useResumeOptimizer for general state management
 * - useResumeScore for score-related calculations
 * - useUploadSection for file upload and parsing
 * 
 * Key functionality:
 * - File upload and parsing
 * - AI optimization of resume content
 * - Editing of optimized content with real-time feedback
 * - Application of AI suggestions and keywords
 * - Template selection and preview
 * - Saving and resetting functionality
 * - Advanced ATS score calculations
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Import UI components
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

// Import custom hooks for state management
import useResumeOptimizer from '@/hooks/optimizer/useResumeOptimizer';
import useUploadSection from '@/hooks/optimizer/useUploadSection';
import useResumeScore from '@/hooks/optimizer/useResumeScore';

// Import types for type safety - Corrected imports
import { OptimizationSuggestion, SuggestionImpact } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';
import { ImpactLevel } from '@/services/resumeScoreLogic';

/**
 * Creates a deterministic ID based on text content
 * This ensures the same content always gets the same ID
 * 
 * @param prefix - Prefix to use for the ID
 * @param text - Text content to derive the ID from
 * @returns Deterministic ID string
 */
function createDeterministicId(prefix: string, text: string): string {
  // Create a simple hash from the text
  let hash = 0;
  if (text.length === 0) return `${prefix}-empty`;
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use the hash as part of the ID - ensure it's positive
  return `${prefix}-${Math.abs(hash)}`;
}

/**
 * Counter for ensuring unique IDs even when created in the same millisecond
 */
let idCounter = 0;

/**
 * Generates a unique ID with a prefix
 * Uses a combination of timestamp, counter, and index to ensure uniqueness
 * 
 * @param prefix - Prefix to use for the ID
 * @param index - Index of the item in its collection
 * @returns Unique ID string
 */
function generateUniqueId(prefix: string, index: number): string {
  const timestamp = Date.now();
  const uniqueCount = idCounter++;
  return `${prefix}-${index}-${timestamp}-${uniqueCount}`;
}

/**
 * Normalizes a suggestion object to ensure consistent structure
 * Handles different property naming conventions and ensures IDs exist
 * 
 * @param suggestion - Suggestion to normalize
 * @param index - Index for fallback ID generation
 * @returns Normalized suggestion with consistent property names
 */
function normalizeSuggestion(suggestion: any, index: number): OptimizationSuggestion {
  // Generate debug output for suggestions without ID
  if (!suggestion.id) {
    console.warn(`Suggestion without ID at index ${index}:`, suggestion);
  }

  // Create a deterministic ID if text is available
  const text = suggestion.text || suggestion.original_text || '';
  const deterministicId = text ? createDeterministicId('suggestion', text) : null;

  return {
    // Ensure ID exists with fallbacks - try deterministic ID first if available
    id: suggestion.id || suggestion.suggestion_id || deterministicId || generateUniqueId('suggestion', index),
    // Ensure text property exists
    text: text,
    // Provide defaults for optional properties
    type: suggestion.type || 'general',
    impact: suggestion.impact || '',
    // Handle both naming conventions
    isApplied: suggestion.isApplied || suggestion.is_applied || false,
    // Include pointImpact for score calculations
    pointImpact: suggestion.pointImpact || suggestion.point_impact || 2,
    // Add score property if available for better impact calculations
    score: suggestion.score 
  };
}

/**
 * Normalizes a keyword object to ensure consistent structure
 * Handles different property naming conventions and formats
 * Uses deterministic IDs for better consistency across sessions
 * 
 * @param keyword - Keyword to normalize (string or object)
 * @param index - Index for fallback ID generation
 * @returns Normalized keyword with consistent property names
 */
function normalizeKeyword(keyword: any, index: number): Keyword {
  // Handle case where keyword is just a string
  if (typeof keyword === 'string') {
    // Create a deterministic ID based on the text content
    const deterministicId = createDeterministicId('keyword', keyword);
    
    return {
      id: deterministicId,
      text: keyword,
      isApplied: false,
      relevance: 1,
      pointImpact: 1,
      category: 'general',
      impact: 0.5
    };
  }
  
  // Get text from the keyword object for ID generation
  const text = keyword.text || keyword.keyword || '';
  
  // Generate debug output for keywords without ID
  if (!keyword.id) {
    console.warn(`Keyword object without ID at index ${index}:`, keyword);
  }
  
  // Create a deterministic ID if text is available
  const deterministicId = text ? createDeterministicId('keyword', text) : null;
  
  // Handle keyword as an object with potential varying property names
  return {
    // Use deterministic ID if possible, fall back to other options
    id: keyword.id || keyword.keyword_id || deterministicId || generateUniqueId('keyword', index),
    text: text,
    // Support all possible variations of the applied property
    isApplied: keyword.isApplied || keyword.is_applied || keyword.applied || false,
    relevance: keyword.relevance || 1,
    pointImpact: keyword.pointImpact || keyword.point_impact || 1,
    // Add category and impact for better score calculations
    category: keyword.category || 'general',
    impact: keyword.impact || 0.5
  };
}

/**
 * ResumeOptimizer Component - Main entry point for the resume optimization workflow
 * Handles the complete lifecycle of resume optimization including:
 * - File upload and content extraction
 * - AI optimization
 * - Rendering preview with template selection
 * - Managing suggestions and keywords
 * - Saving and resetting user changes
 * - ATS score calculations and impact analysis
 */
const ResumeOptimizer: React.FC = () => {
  // Get user authentication state from Clerk
  const { user } = useUser();
  
  // Ref to track previous loading state for tab navigation and UI updates
  const previousIsLoading = useRef(false);
  
  // State to track if welcome toast has been shown
  const welcomeToastShownRef = useRef(false);
  
  // State for UI loading
  const [showLoadingState, setShowLoadingState] = useState(false);
  
  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  
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
    contentModified,    // Whether text content has been modified
    scoreModified,      // Whether score has been modified
    isLoading,          // Loading initial data
    isSaving,           // Saving changes to database
    isResetting,        // Resetting to original state
    hasResume,          // Whether user has any resume
    activeTab,          // Currently active tab
    
    // Actions
    setActiveTab,                    // Change active tab
    setIsEditing,                    // Toggle edit mode
    loadLatestResume,                // Load latest resume data
    saveResume,                      // Save user changes
    resetResume,                     // Reset to AI-optimized version
    handleContentEdit,               // Handle content changes
    handleApplySuggestion,           // Apply a suggestion to content
    handleKeywordApply,              // Apply a keyword to content
    updateResumeWithOptimizedData,   // Update state with optimization results
    updateSelectedTemplate,          // Update template selection
    setContentModified,              // Set content modified state
    setScoreModified,                // Set score modified state
    
    // Score-related functionality from useResumeScore integration
    simulateSuggestionImpact,        // Calculate impact of applying a suggestion
    simulateKeywordImpact,           // Calculate impact of applying a keyword
    generateScoreBreakdown,          // Generate detailed score breakdown
    getImprovementMetrics            // Get improvement metrics for display
  } = useResumeOptimizer(user?.id);
  
  // Get scoring details including applied and potential improvements
  // These can be passed to the ScoreCard for more detailed display
  const scoreBreakdown = generateScoreBreakdown();
  const improvementMetrics = getImprovementMetrics;
  
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
    onOptimizationComplete: (optimizedText, resumeId, atsScore, suggestionsData, keywordsData) => {
      console.log("Optimization complete, processing results:", {
        resumeId,
        atsScore,
        suggestionsCount: suggestionsData?.length || 0,
        keywordsCount: keywordsData?.length || 0
      });
      
      // Normalize suggestions to ensure consistent structure
      const normalizedSuggestions = Array.isArray(suggestionsData)
        ? suggestionsData.map((s, i) => normalizeSuggestion(s, i))
        : [];
      
      // Normalize keywords to ensure consistent structure
      const normalizedKeywords = Array.isArray(keywordsData)
        ? keywordsData.map((k, i) => normalizeKeyword(k, i))
        : [];
        
      console.log("Normalized data for UI:", {
        suggestionsNormalized: normalizedSuggestions.length,
        keywordsNormalized: normalizedKeywords.length
      });
      
      // Update the main state with optimization results
      updateResumeWithOptimizedData(
        optimizedText || '',
        resumeId || '',
        atsScore || 65,
        normalizedSuggestions,
        normalizedKeywords
      );
      
      // Change tab after processing is complete
      setActiveTab('preview');
      
      // Hide loading state
      setShowLoadingState(false);
      
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
  
  /**
   * Maps the database-format suggestions to component-format suggestions
   * Ensures each suggestion has required properties including ID
   */
  const mappedSuggestions = suggestions.map((s, index) => {
    // Log warning for suggestions without ID
    if (!s.id) {
      console.warn(`Suggestion without ID in mapping (index ${index}):`, s);
    }
    
    // Generate a deterministic ID if text is available
    const text = s.text || '';
    const deterministicId = text ? createDeterministicId('mapped-suggestion', text) : null;
    
    return {
      // Ensure ID with fallback - try deterministic ID first if available
      id: s.id || deterministicId || `mapped-suggestion-${index}-${Date.now()}`,
      text: s.text || '',
      type: s.type || 'general',
      impact: s.impact || '',
      // Handle both naming conventions
      isApplied: s.isApplied || false,
      pointImpact: s.pointImpact || 2,
      // Add score for better impact calculation
      score: s.score
    };
  });
  
  /**
   * Maps the database-format keywords to component-format keywords
   * Adding the 'applied' property required by KeywordsList component
   * Now uses deterministic IDs for more consistent behavior
   */
  const mappedKeywords = keywords.map((k, index) => {
    // Log warning for keywords without ID
    if (!k.id) {
      console.warn(`Keyword without ID in mapping (index ${index}):`, k);
    }
    
    // Generate a deterministic ID if text is available
    const text = k.text || '';
    const deterministicId = text ? createDeterministicId('mapped-keyword', text) : null;
    
    return {
      // Ensure ID with fallback - try deterministic ID first if available
      id: k.id || deterministicId || `mapped-keyword-${index}-${Date.now()}`,
      text: text,
      isApplied: k.isApplied || false,
      // Add the 'applied' property required by the component
      applied: k.isApplied || false,
      relevance: k.relevance || 1,
      pointImpact: k.pointImpact || 1,
      // Add category and impact for better score calculations
      category: k.category || 'general',
      impact: k.impact || 0.5
    };
  });
  
  /**
   * Enhanced adapter function for onKeywordApply
   * Converts index-based calls to id-based calls using useResumeScore for impact calculations
   * 
   * @param index - Index of keyword in the array
   */
  const handleKeywordApplyAdapter = useCallback((index: number) => {
    console.log(`handleKeywordApplyAdapter called with index ${index}`);
    
    // Only proceed with keyword application if in edit mode
    if (isEditing && index >= 0 && index < mappedKeywords.length) {
      const keyword = mappedKeywords[index];
      
      console.log(`Applying keyword:`, keyword);
      
      // Handle missing ID with warning
      if (!keyword.id) {
        console.warn(`Keyword at index ${index} has no ID:`, keyword);
        toast.error("Cannot apply keyword: Missing ID");
        return;
      }
      
      // Apply the keyword using the hook's handler with useResumeScore integration
      handleKeywordApply(keyword.id, !keyword.isApplied);
      
      // Content modified is now managed by useResumeOptimizer and useResumeScore
    } else if (!isEditing) {
      // Notify user that editing is required to apply keywords
      toast.info("Enter edit mode to apply keywords");
    } else {
      console.error(`Invalid keyword index: ${index}. Max: ${mappedKeywords.length - 1}`);
    }
  }, [isEditing, mappedKeywords, handleKeywordApply]);
  
  /**
   * Adapter function for simulateKeywordImpact
   * Uses useResumeScore to calculate accurate impact values
   * 
   * @param index - Index of keyword in the array
   * @returns Impact calculation object
   */
  const simulateKeywordImpactAdapter = useCallback((index: number) => {
    // Use useResumeScore hook for accurate impact calculation 
    if (index >= 0 && index < mappedKeywords.length) {
      const result = simulateKeywordImpact(index);
      
      // Return in the format expected by KeywordsList component
      return {
        newScore: result.newScore,
        pointImpact: result.pointImpact,
        description: result.description,
        level: result.level || ImpactLevel.MEDIUM
      };
    }
    
    // Fallback with default values if index is invalid
    return {
      newScore: Math.min(100, atsScore + 1),
      pointImpact: 1,
      description: "Adding this keyword will improve your ATS compatibility score.",
      level: ImpactLevel.LOW
    };
  }, [atsScore, mappedKeywords, simulateKeywordImpact]);
  
  /**
   * Enhanced adapter function for applying suggestions
   * Uses useResumeScore for accurate impact calculations
   * 
   * @param index - The index of the suggestion in the suggestions array
   * @returns Boolean indicating if operation started successfully
   */
  const handleApplySuggestionAdapter = useCallback((index: number) => {
    console.log(`handleApplySuggestionAdapter called with index ${index}`);
    
    // Only proceed if in edit mode and index is valid
    if (isEditing && index >= 0 && index < mappedSuggestions.length) {
      const suggestion = mappedSuggestions[index];
      
      console.log(`Applying suggestion:`, suggestion);
      
      // Validate that the suggestion has a valid ID
      if (!suggestion.id) {
        console.error("Cannot apply suggestion: Missing suggestion ID", suggestion);
        
        // Generate temporary ID for this operation
        const tempId = `temp-suggestion-${index}-${Date.now()}`;
        console.log(`Generated temporary ID: ${tempId}`);
        
        // Assign the temporary ID to the suggestion
        suggestion.id = tempId;
        
        toast.error("Cannot apply suggestion: Missing ID");
        return false;
      }
      
      // Apply the suggestion with useResumeScore integration for accurate scoring
      handleApplySuggestion(suggestion.id, !suggestion.isApplied);
      
      return true;
    } else if (!isEditing) {
      // User needs to be in edit mode to apply suggestions
      toast.info("Enter edit mode to apply suggestions");
      return false;
    } else {
      // Invalid index
      console.error("Invalid suggestion index:", index, "Max:", mappedSuggestions.length - 1);
      return false;
    }
  }, [isEditing, mappedSuggestions, handleApplySuggestion]);
  
  /**
   * Adapter function for simulate suggestion impact
   * Uses useResumeScore for accurate impact analysis
   * 
   * @param index - Index of suggestion in array
   * @returns Impact calculation object
   */
  const simulateSuggestionImpactAdapter = useCallback((index: number): SuggestionImpact => {
    // Use useResumeScore hook for accurate impact calculation
    if (index >= 0 && index < mappedSuggestions.length) {
      const result = simulateSuggestionImpact(index);
      
      // Return in the format expected by SuggestionsList component
      return {
        newScore: result.newScore,
        pointImpact: result.pointImpact,
        description: result.description,
        level: result.level || ImpactLevel.MEDIUM
      };
    }
    
    // Fallback with default values if index is invalid
    return {
      newScore: Math.min(100, atsScore + 2),
      pointImpact: 2,
      description: "This suggestion will improve your resume's clarity and impact.",
      level: ImpactLevel.MEDIUM
    };
  }, [atsScore, mappedSuggestions, simulateSuggestionImpact]);
  
  /**
   * Adapter for file upload to match expected signature
   * Provides default values for optional parameters
   * 
   * @param url - URL of the uploaded file
   * @param name - Name of the file
   * @param size - Size of the file in bytes
   * @param type - MIME type of the file
   */
  const handleFileUploadAdapter = useCallback((url: string, name: string, size?: number, type?: string) => {
    // Call the original handler with defaults for optional parameters
    handleFileUpload(url, name, size || 0, type || '');
  }, [handleFileUpload]);

  /**
   * Enhanced save handler that resets modification states after save
   * Centralizes the saving logic and feedback
   * 
   * @param content - Content to save
   * @returns Promise resolving to the save result
   */
  const handleSaveWithUpdates = useCallback(async (content: string) => {
    // Call the original save method which now includes atomic saving
    // of content, suggestions, and keywords
    const result = await saveResume(content);
    
    return result;
  }, [saveResume]);

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

  // Get improvement metrics from useResumeScore for the ScoreCard
  const { improvementPoints, remainingPotential } = improvementMetrics;

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
              // Normalize suggestions and keywords before updating
              const normalizedSuggestions = Array.isArray(suggestions) 
                ? suggestions.map((s, i) => normalizeSuggestion(s, i))
                : [];
                
              const normalizedKeywords = Array.isArray(keywords)
                ? keywords.map((k, i) => normalizeKeyword(k, i))
                : [];
              
              // Update state with normalized data
              updateResumeWithOptimizedData(
                optimizedText || '',
                resumeId || '',
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
          {/* Display appropriate content based on state */}
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
                    onSave={handleSaveWithUpdates} // Use enhanced save handler
                    onTextChange={handleContentEdit}
                    isOptimizing={isOptimizing}
                    isApplyingChanges={isSaving}
                    language={resumeData?.language || "English"}
                    onEditModeChange={setIsEditing}
                    onReset={() => setShowResetDialog(true)}
                    isEditing={isEditing}
                    scoreModified={scoreModified}
                    contentModified={contentModified} // Pass contentModified state from parent
                    resumeData={resumeData}
                  />
                </div>

                {/* Sidebar with optimization controls - takes 2 columns */}
                <div className="col-span-2 flex flex-col gap-4">
                  {/* ATS Score card with enhanced metrics from useResumeScore */}
                  <ScoreCard 
                    optimizationScore={atsScore || 0}
                    resumeContent={displayContent}
                    suggestionsApplied={suggestions.filter(s => s.isApplied).length}
                    keywordsApplied={keywords.filter(k => k.isApplied).length}
                    scoreBreakdown={scoreBreakdown}
                    potentialScore={scoreBreakdown?.potential || null}
                    initialScore={originalAtsScore}
                    isCalculating={isOptimizing}
                    // Enhanced props from useResumeScore
                    improvementPoints={improvementPoints}
                    remainingPotentialPoints={remainingPotential}
                  />

                  {/* AI Suggestions with useResumeScore integration */}
                  <SuggestionsList
                    suggestions={mappedSuggestions}
                    isOptimizing={isOptimizing}
                    onApplySuggestion={handleApplySuggestionAdapter}
                    resumeContent={displayContent}
                    currentScore={atsScore || 0}
                    simulateSuggestionImpact={simulateSuggestionImpactAdapter}
                    isEditing={isEditing}
                    // Enhanced props from useResumeScore integration
                    cumulativeImpactValues={scoreBreakdown}
                    appliedImprovements={{
                      suggestionPoints: scoreBreakdown?.suggestions || 0,
                      keywordPoints: scoreBreakdown?.keywords || 0,
                      totalPoints: (scoreBreakdown?.suggestions || 0) + (scoreBreakdown?.keywords || 0)
                    }}
                  />
                  
                  {/* Keywords with useResumeScore integration */}
                  <KeywordsList
                    keywords={mappedKeywords}
                    onKeywordApply={handleKeywordApplyAdapter}
                    showImpactDetails={true}
                    currentScore={atsScore || 0}
                    simulateKeywordImpact={simulateKeywordImpactAdapter}
                    isEditing={isEditing}
                    // Enhanced props from useResumeScore integration
                    needsRegeneration={contentModified && !scoreModified}
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