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
 * - Enhanced ATS score handling and real-time updates with proper prioritization
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import custom hooks
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';

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
  } = useResumeOptimizer(user?.id, { user });
  
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
  const hasRunRef = useRef(false);                 // Track if resume check has already run

  // Track consecutive loading changes to prevent infinite loops
  const consecutiveLoadingChangesRef = useRef(0); 
  
  // Track highest observed score to prevent score regression
  const highestScoreRef = useRef<number>(optimizationScore || 65); 
  
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

  // Run once at component mount to ensure resume content is loaded from backup if available
  useEffect(() => {
    // Execute only once when component mounts
    if (user?.id) {
      // Always remove the problematic flag that blocks loading
      localStorage.removeItem(`user_${user.id}_no_resume`);
      
      // Check if we have saved content in localStorage
      const savedContent = localStorage.getItem(`resume_content_${user.id}`);
      const savedId = localStorage.getItem(`resume_id_${user.id}`);
      
      if (savedContent && savedId) {
        // If saved content exists, update states immediately
        console.log("Content found in localStorage, updating states");
        setEditedText(savedContent);
        
        // Try to load score as well
        const savedScore = localStorage.getItem(`resume_score_${user.id}`);
        if (savedScore) {
          const score = parseInt(savedScore);
          if (!isNaN(score)) {
            setOptimizationScore(score);
            forceScoreUpdate(score);
          }
        }
        
        // Then still load from server to get the most recent data
        setTimeout(() => {
          loadLatestResume(user.id, { silent: true });
        }, 100);
      } else {
        // Otherwise, just load from server
        loadLatestResume(user.id);
      }
    }
  }, []); // Empty dependency array = single execution
  
  /**
   * Track loading sequence to ensure proper order of component initialization
   * This helps coordinate the loading of data elements and score calculation
   */
  useEffect(() => {
    // Update text loaded status when optimized text is available
    if (optimizedText && !dataLoadingSequence.textLoaded) {
      setDataLoadingSequence(prev => ({ ...prev, textLoaded: true }));
    }
    
    // Update suggestions loaded status when suggestions are available
    if (suggestions.length > 0 && !dataLoadingSequence.suggestionsLoaded) {
      setDataLoadingSequence(prev => ({ ...prev, suggestionsLoaded: true }));
    }
    
    // Update keywords loaded status when keywords are available
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
        // Check scoreManager first - prioritize its score if higher
        if (scoreManager && scoreManager.getCurrentScore && scoreManager.getCurrentScore() > localAtsScore) {
          const scoreManagerScore = scoreManager.getCurrentScore();
          console.log(`Using higher score from scoreManager: ${scoreManagerScore} instead of localAtsScore: ${localAtsScore}`);
          setLocalAtsScore(scoreManagerScore);
          
          // Update highest score reference if needed
          if (scoreManagerScore > highestScoreRef.current) {
            highestScoreRef.current = scoreManagerScore;
          }
        }
        // Otherwise use local score if valid to update scoreManager
        else if (localAtsScore > 0 && scoreManager && scoreManager.updateBaseScore) {
          console.log("Updating scoreManager with localAtsScore:", localAtsScore);
          scoreManager.updateBaseScore(localAtsScore);
          
          // Update highest score reference if needed
          if (localAtsScore > highestScoreRef.current) {
            highestScoreRef.current = localAtsScore;
          }
        }
        
        // Mark score calculation as complete
        setIsScoreCalculating(false);
        setDataLoadingSequence(prev => ({ ...prev, scoreInitialized: true }));
      }, 1200); // Slight delay for UX and to ensure other renders are complete
    }
  }, [dataLoadingSequence, scoreManager, localAtsScore]);
  
  /**
   * Synchronize optimizationScore to local state with protection against downgrade
   * Ensures we always have the latest score value available without regression
   */
  useEffect(() => {
    // Only update if score actually changed and is a valid number
    if (!isNaN(optimizationScore) && optimizationScore > 0 && optimizationScore !== localAtsScore) {
      // Protection against score downgrade: never go from higher score to lower one
      // This avoids the issue of default 65 score overriding actual scores
      if (localAtsScore > optimizationScore) {
        console.log(`Ignoring downgrade of score from ${localAtsScore} to ${optimizationScore}`);
        
        // Force scoreManager to use our higher value
        if (scoreManager && typeof scoreManager.updateBaseScore === 'function') {
          console.log(`Ensuring scoreManager uses higher score: ${localAtsScore}`);
          scoreManager.updateBaseScore(localAtsScore);
        }
        
        return;
      }
      
      // If the new score is higher or we didn't have a score before, update
      console.log(`Updating local ATS score from ${localAtsScore} to ${optimizationScore}`);
      setLocalAtsScore(optimizationScore);
      
      // Update highest score reference if needed
      if (optimizationScore > highestScoreRef.current) {
        highestScoreRef.current = optimizationScore;
      }
    }
  }, [optimizationScore, localAtsScore, scoreManager]);
  
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
        
        // Protection against score downgrade
        if (newScore < highestScoreRef.current && !isScoreCalculating) {
          console.log(`Ignoring score manager downgrade from ${highestScoreRef.current} to ${newScore}`);
          return;
        }
        
        // Update both local state and main state
        setLocalAtsScore(newScore);
        
        // Only update main state if it has actually changed to prevent loops
        if (newScore !== optimizationScore) {
          setOptimizationScore(newScore);
        }
        
        // Update highest score reference if needed
        if (newScore > highestScoreRef.current) {
          highestScoreRef.current = newScore;
        }
      }, 100);
    }
    
    return () => {
      if (scoreUpdateTimeoutRef.current) {
        clearTimeout(scoreUpdateTimeoutRef.current);
      }
    };
  }, [scoreManager?.currentScore, optimizationScore, setOptimizationScore, isScoreCalculating]);

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
    console.log(`Calculating displayContent at ${new Date().toISOString()}:`, {
      hasProcessedHtml: Boolean(processedHtml),
      hasEditedText: Boolean(editedText),
      hasOptimizedText: Boolean(optimizedText),
      processedHtmlLength: processedHtml?.length || 0,
      editedTextLength: editedText?.length || 0,
      optimizedTextLength: optimizedText?.length || 0
    });
    
    // Normal content with priority (processedHtml > editedText > optimizedText)
    const content = processedHtml || editedText || optimizedText;
    
    // If no content found and we have a user, check localStorage as last resort
    if (!content && user?.id) {
      const emergencyContent = localStorage.getItem(`resume_content_${user.id}`);
      if (emergencyContent) {
        console.log("Emergency content retrieval from localStorage");
        return emergencyContent;
      }
    }
    
    return content || '';
  }, [processedHtml, editedText, optimizedText, user?.id]);

  /**
   * Calculate current resume score with breakdown
   * Using useMemo to prevent unnecessary recalculations
   * Enhanced to use local score state for real-time updates with protection
   * against regression to default values
   */
  const currentScoreData = useMemo(() => {
    // Use the most reliable score value available, in order of priority:
    // 1. Highest observed score (protection against regression)
    // 2. Local ATS score (real-time updates)
    // 3. Optimization score (from hook)
    // 4. Default value (65)
    const baseScore = localAtsScore || optimizationScore || 65;
    
    // Compare with highest observed score for regression protection
    const currentScore = Math.max(baseScore, highestScoreRef.current);
    
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
  
    // If we're in any loading state, set a safety timeout to force exit after max time
    if (isLoadingInProgressRef.current || isUploading || isParsing || isOptimizing || isLoading) {
      loadTimeoutRef.current = setTimeout(() => {
        console.log("Safety timeout triggered - forcing loading state to false");
        // Reset ALL loading states and counters
        isLoadingInProgressRef.current = false;
        loadingAttemptsRef.current = 0;
        setIsUploadInProgress(false);
        setIsAnalysisDisabled(false);
        setIsScoreCalculating(false);
        
        // Show feedback to user
        toast.warning("Loading process completed with warnings", {
          description: "The process was taking longer than expected."
        });
        
        // Force transition to appropriate tab based on content availability
        if (optimizedText) {
          setActiveTab("preview");
        } else {
          setActiveTab("upload");
        }
      }, 45000); // 45 second safety timeout (should be less than the API timeout)
    }
    
    // Cleanup on unmount
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [activeTab, isUploading, isParsing, isOptimizing, isLoading, optimizedText]);

  // =========================================================================
  // Score Management Functions
  // =========================================================================
  
  /**
   * Emergency method to force update the score across all components
   * This method bypasses normal update mechanisms to force a score value
   * throughout the system, ensuring consistency across all components
   * 
   * Used when a specific score value needs to take precedence over
   * calculated values, such as when receiving a score from the API
   * 
   * @param scoreValue - The new score value to force across the system
   */
  const forceScoreUpdate = useCallback((scoreValue: number) => {
    // Validate input to prevent invalid scores
    if (!scoreValue || isNaN(scoreValue) || scoreValue <= 0 || scoreValue > 100) {
      console.log("Invalid score value ignored:", scoreValue);
      return;
    }
    
    console.log("Force updating score across the system:", scoreValue);
    
    // Update highest score reference if needed
    if (scoreValue > highestScoreRef.current) {
      highestScoreRef.current = scoreValue;
    }
    
    // 1. Update local state for immediate UI feedback
    setLocalAtsScore(scoreValue);
    
    // 2. Update main optimization score state for persistence
    if (setOptimizationScore) {
      setOptimizationScore(scoreValue);
    }
    
    // 3. Force update in score manager which handles calculations and metrics
    if (scoreManager && typeof scoreManager.updateBaseScore === 'function') {
      console.log("Direct score update in scoreManager:", scoreValue);
      scoreManager.updateBaseScore(scoreValue);
      
      // Optional: Force refresh score breakdown if method available
      if (scoreManager.getScoreBreakdown) {
        const breakdown = scoreManager.getScoreBreakdown();
        console.log("Updated score breakdown after force update:", breakdown);
      }
    }
    
    // 4. Mark score initialization as completed to prevent further automatic updates
    // that might override our forced value
    setDataLoadingSequence(prev => ({ ...prev, scoreInitialized: true }));
    
    // 5. Log final state for debugging purposes
    setTimeout(() => {
      console.log("Score system state after force update:", {
        forcedValue: scoreValue,
        localAtsScore: localAtsScore,
        optimizationScore: optimizationScore,
        highestObservedScore: highestScoreRef.current,
        scoreManagerBaseScore: scoreManager?.getBaseScore?.() || 'N/A',
        scoreManagerCurrentScore: scoreManager?.currentScore || 'N/A',
        loadingSequence: dataLoadingSequence
      });
    }, 100);
  }, [setOptimizationScore, scoreManager, setDataLoadingSequence, localAtsScore, optimizationScore, dataLoadingSequence]);

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
    
    // Set loading progress flag
    isLoadingInProgressRef.current = true;
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
    // CRITICAL: Reset ALL loading states immediately
    isLoadingInProgressRef.current = false;
    loadingAttemptsRef.current = 0;
    setIsUploadInProgress(false);
    setIsAnalysisDisabled(false);
    setIsScoreCalculating(false);
  
    // Step 2: Update resume state
    setHasResume(!!optimizedTextContent);
    
    // Step 3: Handle direct data updates in controlled sequence
    if (optimizedTextContent && optimizedTextContent.length > 0) {
      console.log("Received optimized text directly with length:", optimizedTextContent.length);
      
      // Reset loading sequence
      setDataLoadingSequence({
        textLoaded: false,
        suggestionsLoaded: false,
        keywordsLoaded: false,
        scoreInitialized: false
      });
      
      // Show score calculation animation for better UX
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
            
            // Use our robust score update mechanism
            forceScoreUpdate(scoreValue);
          }
          
          // End the score calculation animation after all updates
          setTimeout(() => {
            setIsScoreCalculating(false);
            loadingAttemptsRef.current = 0;
            isLoadingInProgressRef.current = false;
            
            // Switch to preview tab now that data is loaded
            setActiveTab("preview");
          }, 500);
        }, 300);
      }, 200);
      
      return;
    }
    
    // Step 4: If no direct content provided, load from server or show empty state
    if (user?.id && loadLatestResume) {
      // Reset loading attempts reference to allow a fresh start
      loadingAttemptsRef.current = 0;
      
      // Load latest resume with a retry mechanism
      const attemptLoad = async (retryCount = 0) => {
        if (retryCount > 2) {
          console.log("Max retries reached, switching to upload tab");
          setHasResume(false);
          setActiveTab("upload");
          return;
        }
        
        try {
          isLoadingInProgressRef.current = true;
          console.log(`Attempting to load resume (attempt ${retryCount + 1})`);
          
          const result = await loadLatestResume(user.id);
          
          if (result && result.optimizedText) {
            console.log("Resume loaded successfully");
            setHasResume(true);
            
            // If result includes ATS score, update it
            if (result.atsScore) {
              forceScoreUpdate(result.atsScore);
            }
            
            // Switch to preview tab
            setActiveTab("preview");
          } else {
            console.log("No resume data found");
            setHasResume(false);
            setActiveTab("upload");
          }
        } catch (error) {
          console.error("Error loading resume:", error);
          
          // Retry if we have attempts left
          if (retryCount < 2) {
            console.log(`Retrying load (${retryCount + 2}/3)...`);
            setTimeout(() => attemptLoad(retryCount + 1), 1000);
          } else {
            setHasResume(false);
            setActiveTab("upload");
          }
        } finally {
          isLoadingInProgressRef.current = false;
        }
      };
      
      // Start the load attempt with a slight delay
      setTimeout(() => attemptLoad(), 500);
    } else {
      // Reset states and redirect to upload tab if no user or load function
      setHasResume(false);
      isLoadingInProgressRef.current = false;
      setActiveTab("upload");
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
    forceScoreUpdate
  ]);

  /**
   * Submit text for optimization
   * Handles the API call for text-based resume optimization
   * Enhanced with better score handling
   */
  const handleSubmitText = useCallback(async () => {
    // Reset loading attempts at start of submission to prevent loops
    loadingAttemptsRef.current = 0;
    
    // Validate minimum length
    if (!rawText || rawText.length < 50) {
      toast.error("Please enter at least 50 characters");
      return;
    }
  
    try {
      // Start analysis process
      handleAnalysisStart();
      
      // Create an AbortController for this request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 seconds client-side timeout
      
      // Prepare form data for API
      const formData = new FormData();
      formData.append("rawText", rawText);
      if (user?.id) formData.append("userId", user.id);
  
      // Call optimization API with timeout protection
      const res = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
  
      // Handle API errors
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to optimize resume");
      }
      
      // Parse API response to extract all needed data
      const result = await res.json();
      
      // Log the complete API response for debugging
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
          
          // Update highest score reference if needed
          if (atsScore > highestScoreRef.current) {
            highestScoreRef.current = atsScore;
          }
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
        // Reset critical loading states before calling handleAnalysisComplete
        isLoadingInProgressRef.current = false;
        handleAnalysisComplete();
      }
      
    } catch (error: any) {
      // Enhanced error handling for specific error types
      let errorMessage = error.message || "An unexpected error occurred.";
      
      // Check if it's an abort error (timeout)
      if (error.name === 'AbortError') {
        errorMessage = "The request timed out. Please try again with a shorter resume or retry later.";
      }
      
      // Reset analysis state on error
      setIsAnalysisDisabled(false);
      setIsUploadInProgress(false);
      setIsScoreCalculating(false);
      
      // Critical: Reset loading states on error to prevent loops
      isLoadingInProgressRef.current = false;
      loadingAttemptsRef.current = 0;
      
      toast.error("Optimization failed", {
        description: errorMessage
      });
      
      // Switch back to upload tab on error
      setActiveTab("upload");
    }
  }, [rawText, user?.id, handleAnalysisStart, handleAnalysisComplete, highestScoreRef, setActiveTab]);

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
          
          // If result includes an ATS score, ensure it's properly recorded
          if (result.atsScore && !isNaN(result.atsScore)) {
            console.log("Found ATS score in loaded result:", result.atsScore);
            // Update highest score if needed
            if (result.atsScore > highestScoreRef.current) {
              highestScoreRef.current = result.atsScore;
            }
            
            // Force score update across the system
            forceScoreUpdate(result.atsScore);
          }
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
  }, [user?.id, loadLatestResume, forceScoreUpdate]);

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
    
    // IMPORTANT: Reset loading attempts when switching tabs
    loadingAttemptsRef.current = 0;
    
    setActiveTab(value);
    
    // Load data when switching to preview tab if no content exists
    if (value === "preview" && user && (!displayContent || !optimizedText)) {
      // Set loading state
      isLoadingInProgressRef.current = true;
      
      // Load immediately
      if (user?.id) {
        // IMPORTANT: Add a small timeout to let React update the UI first
        setTimeout(() => {
          loadLatestResume(user.id).then((result) => {
            // Update hasResume based on result
            setHasResume(!!result);
            
            // If result includes an ATS score, ensure it's properly recorded
            if (result && result.atsScore && !isNaN(result.atsScore)) {
              console.log("Found ATS score in loaded result:", result.atsScore);
              
              // Make sure we update the score across the system
              forceScoreUpdate(result.atsScore);
            }
          }).catch(error => {
            console.error("Error loading resume:", error);
            // IMPORTANT: Set hasResume to false on error
            setHasResume(false);
          }).finally(() => {
            // CRITICAL: Always reset loading state
            isLoadingInProgressRef.current = false;
          });
        }, 100);
      } else {
        // Reset loading state if we can't load
        isLoadingInProgressRef.current = false;
      }
    }
  }, [user, isPreviewTabDisabled, loadLatestResume, displayContent, optimizedText, forceScoreUpdate]);

  /**
   * Handle resume download
   * Creates HTML file with selected template
   */
  const handleDownload = useCallback(() => {
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
  }, [displayContent, selectedTemplate]);
  
  /**
   * Create a function to add a "Skip Loading" button to LoadingState
   * This provides users with a way to force-exit loading states if they get stuck
   */
  const handleForceExitLoading = useCallback(() => {
    console.log("User forced exit from loading state");
    
    // Reset all loading states
    isLoadingInProgressRef.current = false;
    loadingAttemptsRef.current = 0;
    setIsUploadInProgress(false);
    setIsAnalysisDisabled(false);
    setIsScoreCalculating(false);
    
    // If we have content, go to preview tab, otherwise go to upload tab
    if (optimizedText) {
      setActiveTab("preview");
    } else {
      setActiveTab("upload");
    }
    
    toast.info("Loading process canceled");
  }, [optimizedText]);

  // =========================================================================
  // Effects - Data Loading & Resource Management
  // =========================================================================
  
  /**
   * Check for existing resume on component mount
   * Only runs once per user ID change
   */
  useEffect(() => {
    // Function to check if user has a resume
    const checkResume = async () => {
      // Skip if already loading, no user, or if we've already checked
      if (!user?.id || isLoadingInProgressRef.current || hasRunRef.current) return;
      
      // Mark that we're now checking
      hasRunRef.current = true;
      
      try {
        console.log("Checking if user has resume...");
        isLoadingInProgressRef.current = true;
        
        const result = await loadLatestResume(user.id);
        
        if (result) {
          console.log("User has a resume");
          setHasResume(true);
          
          // If result includes an ATS score, ensure it's properly recorded
          if (result.atsScore && !isNaN(result.atsScore)) {
            console.log("Found ATS score in initial load:", result.atsScore);
            
            // Update highest score reference if needed
            if (result.atsScore > highestScoreRef.current) {
              highestScoreRef.current = result.atsScore;
            }
            
            // Force update score system-wide
            forceScoreUpdate(result.atsScore);
          }
        } else {
          console.log("User has no resume - normal for new users");
          setHasResume(false);
          
          // IMPORTANT: Set a flag in local storage to prevent future unnecessary checks
          // for this session, as we now know the user has no resumes
          localStorage.setItem(`user_${user.id}_no_resume`, 'true');
        }
      } catch (error) {
        console.error("Error checking for resume:", error);
        setHasResume(false);
        
        // Also set the flag on error to prevent continuous retries
        localStorage.setItem(`user_${user.id}_no_resume`, 'true');
      } finally {
        // CRITICAL: Always reset loading state
        isLoadingInProgressRef.current = false;
      }
    };
    
    // When the user changes, do a check if we haven't already determined they have no resume
    if (user?.id) {
      // Check if we already know this user has no resumes from a previous check
      const userHasNoResume = localStorage.getItem(`user_${user.id}_no_resume`) === 'true';
      
      if (userHasNoResume) {
        // If we already know they have no resumes, set the state directly
        console.log("Already know user has no resumes, skipping check");
        setHasResume(false);
        hasRunRef.current = true; // Mark as checked
      } else {
        // Otherwise, check if they have resumes
        checkResume();
      }
    }
    
    // Cleanup function
    return () => {
      // Reset loading state on unmount
      isLoadingInProgressRef.current = false;
    };
  }, [user?.id, loadLatestResume, forceScoreUpdate]);
  
  /**
   * Additional helper hook to run once after component mount
   * This prevents the initial check from running multiple times in development
   */
  useEffect(() => {
    // We need to use localStorage because React 18 strict mode runs effects twice in development
    const isFirstLoad = localStorage.getItem('resume_optimizer_initialized') !== 'true';
    
    if (isFirstLoad) {
      // Mark that we've initialized the component
      localStorage.setItem('resume_optimizer_initialized', 'true');
    }
    
    // Clean up function
    return () => {
      // On component unmount, we can reset the initialization flag to ensure
      // the check runs again on next mount
      localStorage.removeItem('resume_optimizer_initialized');
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

  /**
   * Enhanced LoadingState component with escape hatch
   * Renders the loading state with an option to force exit loading
   */
  const renderLoadingStateWithEscape = useCallback(() => (
    <div className="flex flex-col items-center justify-center">
      <LoadingState />
      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleForceExitLoading}
        >
          Skip Loading
        </Button>
        <p className="text-xs text-gray-500 mt-1">
          If loading takes too long, you can skip and try again
        </p>
      </div>
    </div>
  ), [handleForceExitLoading]);

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

      {/* Pro Upgrade Dialog - shown when selecting premium templates */}
      <ProUpgradeDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
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
           * 1. Show loading spinner with escape hatch when loading occurs and no content yet
           * 2. Show empty state when loading is complete but no content exists
           * 3. Show content when it becomes available
           */}
          {(isLoadingInProgressRef.current && !displayContent) || isLoading ? (
            renderLoadingStateWithEscape()
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
    </div>
  );
};

export default ResumeOptimizer;