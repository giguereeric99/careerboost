/**
 * Enhanced ResumeOptimizer Component
 * 
 * Main component that manages the complete resume optimization workflow with direct data transfer.
 * Features:
 * - File upload and text input for resumes
 * - AI-powered optimization with real-time feedback
 * - Improved state management with proper loading states
 * - Efficient data handling to minimize API requests
 * - Responsive layout with split view for content and suggestions
 * - Direct data propagation from API to UI without database reload
 * - Enhanced ATS score handling and real-time updates
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

// Import components
import UploadSection from '@/components/resumeOptimizer/uploadSection';
import ResumePreview from '@/components/resumeOptimizer/resumePreview';
import ScoreCard from '@/components/resumeOptimizer/scoreCard';
import SuggestionsList from '@/components/resumeOptimizer/suggestionsList';
import KeywordList from '@/components/resumeOptimizer/keywordList';
import TemplateGallery from '@/components/resumeOptimizer/templateGallery';
import ProUpgradeDialog from '@/components/Dialogs/proUpgradeDialog';
import ResetConfirmationDialog from '@/components/Dialogs/resetConfirmationDialog';
import LoadingState from '@/components/resumeOptimizer/loadingState';
import EmptyPreviewState from '@/components/resumeOptimizer/emptyPreviewState';
import EditVersionBanner from '@/components/resumeOptimizer/editVersionBanner';
import OptimizationMetrics from '@/components/resumeOptimizer/optimizationMetrics';
import { resumeTemplates } from '@/constants/resumeTemplates';

/**
 * ResumeOptimizer Component
 * Main component for the resume optimization workflow
 * Enhanced with improved ATS score handling and loading sequence control
 */
const ResumeOptimizer: React.FC = () => {
  // =========================================================================
  // Authentication & Hook Setup
  // =========================================================================
  
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
    isLoading,            // General loading state
    
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
    resumeId,             // ID of the current resume
    
    // Action handlers - Functions to interact with the resume
    setSelectedFile,              // Set selected file
    handlePreviewContentChange,   // Handle content changes in preview
    handleApplySuggestion,        // Apply a suggestion
    handleKeywordApply,           // Apply a keyword
    handleRegenerateResume,       // Regenerate resume with applied changes
    handleReset,                  // Reset to original
    handleSave,                   // Save changes
    exportReport,                 // Export optimization report
    loadLatestResume,             // Load latest resume from database
    
    // File handling
    handleFileUpload,             // Handle file upload completion
    
    // Advanced score simulation
    simulateKeywordImpact,        // Simulate impact of applying a keyword
    simulateSuggestionImpact,     // Simulate impact of applying a suggestion
    
    // Additional state setters needed for direct data update
    setOptimizedText,             // Set optimized text directly
    setResumeId,                  // Set resume ID directly
    setOptimizationScore,         // Set optimization score directly
    setSuggestions,               // Set suggestions directly
    setKeywords,                  // Set keywords directly
  } = useResumeOptimizerEnhanced(user?.id);
  
  // =========================================================================
  // Component State Management
  // =========================================================================
  
  // UI state - Controls the overall component behavior
  const [activeTab, setActiveTab] = useState("upload");            // Current active tab
  const [resumeContent, setResumeContent] = useState("");          // Raw text input content
  const [rawText, setRawText] = useState<string>("");              // Raw text for optimization
  const [fileUrl, setFileUrl] = useState<string | null>(null);     // Uploaded file URL
  const [fileName, setFileName] = useState<string | null>(null);   // Uploaded file name
  const [selectedTemplate, setSelectedTemplate] = useState("basic"); // Template ID
  const [showProDialog, setShowProDialog] = useState(false);       // Show pro upgrade dialog
  const [showResetDialog, setShowResetDialog] = useState(false);   // Show reset confirmation
  
  // Process tracking state - Tracks the analysis workflow
  const [isAnalysisDisabled, setIsAnalysisDisabled] = useState(false); // Tab is disabled during analysis
  const [hasResume, setHasResume] = useState<boolean | null>(null);    // User has a resume saved
  const [isUploadInProgress, setIsUploadInProgress] = useState(false); // File upload/analysis in progress
  
  // ATS Score tracking state - Enhanced to track score updates
  const [localAtsScore, setLocalAtsScore] = useState<number>(optimizationScore);  // Local score state for real-time updates
  const [isScoreCalculating, setIsScoreCalculating] = useState(false);  // Whether score is currently being calculated
  
  // Refs for managing asynchronous operations and preventing race conditions
  const isLoadingInProgressRef = useRef(false);    // Prevent concurrent loading
  const loadAttemptedRef = useRef(false);          // Track if load has been attempted
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout reference
  const loadingAttemptsRef = useRef(0);            // Track number of loading attempts
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Safety timeout to prevent infinite loading
  const scoreUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce score updates
  
  // Flag to track loading sequence
  const [dataLoadingSequence, setDataLoadingSequence] = useState({
    textLoaded: false,       // Whether optimized text is loaded
    suggestionsLoaded: false, // Whether suggestions are loaded
    keywordsLoaded: false,   // Whether keywords are loaded
    scoreInitialized: false  // Whether score has been initialized
  });

  // =========================================================================
  // Effects for Score Handling and Loading Sequence
  // =========================================================================
  
  /**
   * Track loading sequence to ensure proper order of component initialization
   * This helps coordinate the loading of data elements and score calculation
   */
  useEffect(() => {
    // Update text loaded status
    if (optimizedText && !dataLoadingSequence.textLoaded) {
      setDataLoadingSequence(prev => ({ ...prev, textLoaded: true }));
    }
    
    // Update suggestions loaded status
    if (suggestions.length > 0 && !dataLoadingSequence.suggestionsLoaded) {
      setDataLoadingSequence(prev => ({ ...prev, suggestionsLoaded: true }));
    }
    
    // Update keywords loaded status
    if (keywords.length > 0 && !dataLoadingSequence.keywordsLoaded) {
      setDataLoadingSequence(prev => ({ ...prev, keywordsLoaded: true }));
    }
  }, [optimizedText, suggestions, keywords, dataLoadingSequence]);
  
  /**
   * Final score calculation after all dependencies are loaded
   * This ensures the score is calculated only after all components are ready
   */
  useEffect(() => {
    const { textLoaded, suggestionsLoaded, keywordsLoaded, scoreInitialized } = dataLoadingSequence;
    
    // Only proceed if all data is loaded but score is not yet initialized
    if (textLoaded && suggestionsLoaded && keywordsLoaded && !scoreInitialized) {
      console.log("All dependencies loaded, finalizing score calculation");
      
      // Indicate score calculation is in progress for UI
      setIsScoreCalculating(true);
      
      // Use a timeout to both show the calculation animation and ensure
      // all other components have rendered completely
      setTimeout(() => {
        // If we have a score manager, force update the score
        if (scoreManager && scoreManager.updateBaseScore && localAtsScore > 0) {
          console.log("Updating base score in score manager to:", localAtsScore);
          scoreManager.updateBaseScore(localAtsScore);
        }
        
        // Mark score calculation as complete
        setIsScoreCalculating(false);
        setDataLoadingSequence(prev => ({ ...prev, scoreInitialized: true }));
      }, 1200); // Slight delay for UX and to ensure other renders are complete
    }
  }, [dataLoadingSequence, scoreManager, localAtsScore]);
  
  /**
   * Synchronize optimizationScore to local state
   * Ensures we always have the latest score value available
   */
  useEffect(() => {
    // Only update if score actually changed and is a valid number
    if (!isNaN(optimizationScore) && optimizationScore > 0 && optimizationScore !== localAtsScore) {
      console.log(`Updating local ATS score from ${localAtsScore} to ${optimizationScore}`);
      setLocalAtsScore(optimizationScore);
    }
  }, [optimizationScore, localAtsScore]);
  
  /**
   * Handle score manager updates
   * Ensures score changes from score manager propagate to state
   */
  useEffect(() => {
    if (scoreManager?.currentScore && !isNaN(scoreManager.currentScore)) {
      // Debounce score updates to prevent rapid UI changes
      if (scoreUpdateTimeoutRef.current) {
        clearTimeout(scoreUpdateTimeoutRef.current);
      }
      
      scoreUpdateTimeoutRef.current = setTimeout(() => {
        const newScore = scoreManager.currentScore;
        console.log(`Score Manager update: new score ${newScore}`);
        
        // Update both local state and main state
        setLocalAtsScore(newScore);
        
        // Only update main state if it has actually changed to prevent loops
        if (newScore !== optimizationScore) {
          setOptimizationScore(newScore);
        }
      }, 100);
    }
    
    return () => {
      if (scoreUpdateTimeoutRef.current) {
        clearTimeout(scoreUpdateTimeoutRef.current);
      }
    };
  }, [scoreManager?.currentScore, optimizationScore, setOptimizationScore]);

  // =========================================================================
  // Computed Values & Memoization
  // =========================================================================
  
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
   * Enhanced to use local score state for real-time updates
   */
  const currentScoreData = useMemo(() => {
    // Always use the most up-to-date score available
    const currentScore = localAtsScore || optimizationScore || 65;
    
    return {
      score: currentScore,
      breakdown: scoreManager?.scoreBreakdown || null,
      potentialScore: scoreManager?.scoreBreakdown?.potential || null
    };
  }, [localAtsScore, optimizationScore, scoreManager?.scoreBreakdown]);

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
   * - Any loading operation is happening
   */
  const isPreviewTabDisabled = useMemo(() => {
    return (
      isAnalysisInProgress ||
      isUploadInProgress ||
      (hasResume === false && !optimizedText && activeTab !== "preview") ||
      (isUploading || isParsing || isOptimizing) ||
      isLoading
    );
  }, [
    isAnalysisInProgress,
    isUploadInProgress,
    hasResume,
    optimizedText,
    activeTab,
    isUploading,
    isParsing,
    isOptimizing,
    isLoading
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

  // =========================================================================
  // Safety Timeouts & Error Prevention
  // =========================================================================
  
  /**
   * Safety timeout effect to prevent infinite loading states
   * This ensures loading state is never stuck on indefinitely
   */
  useEffect(() => {
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // If we're in a loading state, set a safety timeout to force exit after max time
    if (isLoadingInProgressRef.current) {
      loadTimeoutRef.current = setTimeout(() => {
        console.log("Safety timeout triggered - forcing loading state to false");
        isLoadingInProgressRef.current = false;
      }, 10000); // 10 seconds max loading time
    }
    
    // Cleanup on unmount
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [activeTab]); // Re-run when active tab changes

  // =========================================================================
  // Event Handlers - Optimized with useCallback
  // =========================================================================
  
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
    
    // Reset loading sequence for the new analysis
    setDataLoadingSequence({
      textLoaded: false,
      suggestionsLoaded: false, 
      keywordsLoaded: false,
      scoreInitialized: false
    });
    
    // Indicate score calculation will be needed
    setIsScoreCalculating(true);
  }, []);

  /**
   * Called when analysis completes (from UploadSection)
   * Enhanced to receive optimized text, resume ID, ATS score, suggestions and keywords directly 
   * with controlled loading sequence for better score calculation
   */
  const handleAnalysisComplete = useCallback((
    optimizedTextContent?: string, 
    resumeIdValue?: string,
    scoreValue?: number,
    suggestionsData?: any[],
    keywordsData?: any[]
  ) => {
    // Step 1: Re-enable UI elements
    setIsAnalysisDisabled(false);   // Re-enable preview tab
    setIsUploadInProgress(false);   // Mark upload complete
    
    // Step 2: Update resume state
    setHasResume(true);             // User now has a resume
    
    // Step 3: Handle direct data updates in controlled sequence
    if (optimizedTextContent && optimizedTextContent.length > 0) {
      console.log("Received optimized text directly with length:", optimizedTextContent.length);
      
      // Reset loading sequence - will track components as they load
      setDataLoadingSequence({
        textLoaded: false,
        suggestionsLoaded: false,
        keywordsLoaded: false,
        scoreInitialized: false
      });
      
      // Indicate score calculation in progress for better UX - shows loading animation
      setIsScoreCalculating(true);
      
      // STAGE 1: Update optimized text and resume ID first
      if (setOptimizedText) {
        setOptimizedText(optimizedTextContent);
      }
      
      if (resumeIdValue && setResumeId) {
        setResumeId(resumeIdValue);
      }
      
      // STAGE 2: After a short delay, update suggestions and keywords
      // This slight delay helps ensure the text is processed before other updates
      setTimeout(() => {
        // Update suggestions if provided
        if (suggestionsData && Array.isArray(suggestionsData) && setSuggestions) {
          console.log("Setting suggestions directly:", suggestionsData.length);
          setSuggestions(suggestionsData);
        }
        
        // Update keywords if provided
        if (keywordsData && Array.isArray(keywordsData) && setKeywords) {
          console.log("Setting keywords directly:", keywordsData.length);
          setKeywords(keywordsData);
        }
        
        // STAGE 3: After all other data is loaded, update the score
        setTimeout(() => {
          // Update score if provided
          if (scoreValue !== undefined && !isNaN(scoreValue)) {
            console.log("Setting final ATS score:", scoreValue);
            
            // IMPORTANT: Update both local and main score states first
            setLocalAtsScore(scoreValue);
            
            if (setOptimizationScore) {
              setOptimizationScore(scoreValue);
            }
            
            // CRITICAL: Update score directly in score manager using the new API
            if (scoreManager && typeof scoreManager.updateBaseScore === 'function') {
              console.log("Directly updating score in score manager to:", scoreValue);
              scoreManager.updateBaseScore(scoreValue);
            }
            
            // Debug log to verify all score values are in sync
            console.log("DEBUG - Scores after update:", {
              scoreValueFromAPI: scoreValue,
              localAtsScore: scoreValue, // Use the value we're setting rather than the state variable
              optimizationScore: scoreValue, // Use the value we're setting rather than the state variable
              scoreManagerBaseScore: scoreManager?.getBaseScore?.() || 'N/A',
              scoreManagerCurrentScore: scoreManager?.currentScore || 'N/A'
            });
          }
          
          // End the score calculation animation after all updates
          setTimeout(() => {
            setIsScoreCalculating(false);
            
            // Switch to preview tab now that data is loaded
            setActiveTab("preview");
          }, 500); // Slight additional delay for the animation effect
        }, 300); // Delay for score update after keywords and suggestions
      }, 200); // Delay for suggestions and keywords after text
      
      return;
    }
    
    // Step 4: If not all data provided directly, load from server
    console.log("No direct content received, loading from server...");
    
    if (user?.id && loadLatestResume) {
      isLoadingInProgressRef.current = true;
      
      // Add slight delay to ensure database records are available
      setTimeout(() => {
        const loadResumeData = async () => {
          try {
            const result = await loadLatestResume(user.id);
            console.log("Resume data loaded:", result ? "success" : "no data");
            
            // If we have a successful load and a score, ensure it's properly set
            if (result && result.atsScore) {
              // Update score manager directly with the loaded score
              if (scoreManager && typeof scoreManager.updateBaseScore === 'function') {
                console.log("Updating score manager with loaded score:", result.atsScore);
                scoreManager.updateBaseScore(result.atsScore);
              }
            }
            
            // Switch to preview tab after loading completes
            setActiveTab("preview");
          } catch (error) {
            console.error("Error loading resume:", error);
            toast.error("Failed to load resume data", {
              description: "Please try refreshing the page"
            });
          } finally {
            isLoadingInProgressRef.current = false;
          }
        };
        
        loadResumeData();
      }, 1000);
    } else {
      // Switch to preview even if we can't load data - will show empty state
      console.log("Cannot load resume data - switching to preview tab anyway");
      setActiveTab("preview");
    }
  }, [
    user?.id, 
    loadLatestResume, 
    setActiveTab, 
    setOptimizedText, 
    setResumeId, 
    setOptimizationScore,
    setSuggestions,
    setKeywords,
    scoreManager,
    setLocalAtsScore
  ]);

  /**
   * Submit text for optimization
   * Handles the API call for text-based resume optimization
   * Enhanced with better score handling
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
      
      // Parse API response to extract all needed data
      const result = await res.json();
      
      // Log the complete API response for debugging ATS score
      console.log("Complete API response:", result);
      
      // If we get data from the API, use it directly
      if (result && result.optimizedText) {
        // Extract all necessary data
        const optimizedText = result.optimizedText;
        const resumeId = result.resumeId;
        
        // Extract and validate ATS score with improved error handling
        let atsScore = 65; // Default value
        if (result.atsScore !== undefined && !isNaN(result.atsScore)) {
          atsScore = result.atsScore;
          console.log("Extracted valid ATS score:", atsScore);
        } else {
          console.warn("Invalid or missing ATS score in API response, using default:", atsScore);
        }
        
        // Extract suggestions
        const suggestions = result.suggestions || [];
        
        // Extract keywords or prepare from keywordSuggestions
        const keywords = result.keywords || 
          (result.keywordSuggestions ? 
            result.keywordSuggestions.map((text: string) => ({ 
              text, 
              applied: false 
            })) : []);
        
        // Call handleAnalysisComplete with all data
        handleAnalysisComplete(
          optimizedText,
          resumeId,
          atsScore,
          suggestions,
          keywords
        );
      } else {
        // Simple completion without data if API didn't return expected results
        handleAnalysisComplete();
      }
      
    } catch (error: any) {
      // Reset analysis state on error
      setIsAnalysisDisabled(false);
      setIsUploadInProgress(false);
      setIsScoreCalculating(false);
      
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
    if (isLoadingInProgressRef.current) return;
    
    try {
      isLoadingInProgressRef.current = true;
      loadAttemptedRef.current = true;
      loadingAttemptsRef.current = 0;  // Reset attempts
      
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
      // IMPORTANT: Always reset loading state
      isLoadingInProgressRef.current = false;
    }
  }, [user?.id, loadLatestResume]);

  /**
   * Handle tab change with smart data loading
   * Loads data only when switching to preview if needed
   */
  const handleTabChange = useCallback((value: string) => {
    // Prevent switching to preview if disabled
    if (value === "preview" && isPreviewTabDisabled) {
      toast.info("Please wait until analysis is complete");
      return;
    }
    
    setActiveTab(value);
    
    // Load data when switching to preview tab if no content exists
    if (value === "preview" && user && (!displayContent || !optimizedText)) {
      // Reset loading attempts for fresh try
      loadingAttemptsRef.current = 0;
      
      // Set loading state
      isLoadingInProgressRef.current = true;
      
      // Load immediately
      if (user?.id) {
        loadLatestResume(user.id).then((result) => {
          // Update hasResume based on result
          setHasResume(!!result);
        }).catch(error => {
          console.error("Error loading resume:", error);
        }).finally(() => {
          // CRITICAL: Always reset loading state
          isLoadingInProgressRef.current = false;
        });
      } else {
        // Reset loading state if we can't load
        isLoadingInProgressRef.current = false;
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
    
    toast.success("Resume downloaded successfully");
  }, [needsRegeneration, displayContent, selectedTemplate]);

  // =========================================================================
  // Effects - Data Loading & Resource Management
  // =========================================================================
  
  /**
   * Check for existing resume on component mount
   * Only runs once per user ID change
   */
  useEffect(() => {
    let isMounted = true;
    
    const checkResume = async () => {
      // Skip if already loading or no user
      if (!user?.id || isLoadingInProgressRef.current) return;
      
      try {
        isLoadingInProgressRef.current = true;
        
        console.log("Checking if user has resume...");
        const result = await loadLatestResume(user.id);
        
        // Update state based on result if component is still mounted
        if (isMounted) {
          if (result) {
            console.log("User has a resume");
            setHasResume(true);
          } else {
            console.log("User has no resume - normal for new users");
            setHasResume(false);
            // No error toast for new users
          }
        }
      } catch (error) {
        console.error("Error checking for resume:", error);
        if (isMounted) {
          setHasResume(false);
        }
      } finally {
        // CRITICAL: Always reset loading state
        if (isMounted) {
          isLoadingInProgressRef.current = false;
        }
      }
    };
    
    checkResume();
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Ensure loading state is reset on unmount
      isLoadingInProgressRef.current = false;
    };
  }, [user?.id, loadLatestResume]);

  /**
   * Cleanup effect for timeouts
   * Ensures timeouts are cleared on unmount to prevent memory leaks
   */
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      
      if (scoreUpdateTimeoutRef.current) {
        clearTimeout(scoreUpdateTimeoutRef.current);
      }
    };
  }, []);

  // =========================================================================
  // UI Helper Components
  // =========================================================================
  
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
          Upload Resume
        </Button>
        
        {!loadAttemptedRef.current && user && (
          <Button
            variant="outline"
            onClick={handleLoadResume}
            disabled={isLoadingInProgressRef.current}
          >
            {isLoadingInProgressRef.current ? "Loading..." : "Check for available resumes"}
          </Button>
        )}
      </div>
    </div>
  ), [user, handleLoadResume]);

  // =========================================================================
  // Main Component Render
  // =========================================================================
  
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
            {(isAnalysisInProgress || isUploadInProgress || isLoading) && (
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
        
        {/* Preview tab with optimized loading state handling */}
        <TabsContent value="preview" className="space-y-6">
          {/* 
           * Enhanced loading state logic:
           * 1. Show loading spinner when actual loading occurs and no content yet
           * 2. Show empty state when loading is complete but no content exists
           * 3. Show content when it becomes available
           */}
          {(isLoadingInProgressRef.current && !displayContent) || isLoading ? (
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
                
                  {/* Regenerate button - shows when changes need to be applied */}
                  {needsRegeneration && !isEditing && (
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleRegenerateResume}
                        disabled={isApplyingChanges}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isApplyingChanges ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                            </svg>
                            Applying changes...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
                            </svg>
                            Apply Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
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
                        suggestions={suggestions}
                        onDownload={handleDownload}
                        onSave={handleSave}
                        onTextChange={handlePreviewContentChange}
                        isOptimizing={isOptimizing || isApplyingChanges}
                        isApplyingChanges={isApplyingChanges}
                        language={optimizedData?.language || "English"}
                        onEditModeChange={setIsEditing}
                        onReset={hasEdits ? () => setShowResetDialog(true) : undefined}
                        onRegenerateContent={handleRegenerateResume}
                        needsRegeneration={needsRegeneration}
                      />
                    </div>

                    {/* Sidebar with optimization controls - takes 2 columns */}
                    <div className="col-span-2 flex flex-col gap-4">
                      {/* ATS Score card with detailed metrics - Enhanced with proper score data */}
                      <ScoreCard 
                        optimizationScore={currentScoreData.score}
                        resumeContent={displayContent}
                        suggestionsApplied={Array.isArray(appliedSuggestions) ? appliedSuggestions.length : 0}
                        keywordsApplied={Array.isArray(appliedKeywords) ? appliedKeywords.length : 0}
                        scoreBreakdown={currentScoreData.breakdown}
                        potentialScore={currentScoreData.potentialScore}
                        initialScore={optimizationScore}
                        isCalculating={isScoreCalculating} // Pass our new calculating state
                      />

                      {/* AI Suggestions with impact analysis */}
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
                      
                      {/* Keywords with impact analysis */}
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

                      {/* Template selection gallery */}
                      <TemplateGallery
                        templates={resumeTemplates}
                        selectedTemplate={selectedTemplate}
                        onTemplateSelect={handleTemplateSelect}
                      />
                      
                      {/* Optimization metrics and export options */}
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

      {/* Pro subscription dialog - shown when selecting premium templates */}
      <ProUpgradeDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
      />
    </div>
  );
};

export default ResumeOptimizer;