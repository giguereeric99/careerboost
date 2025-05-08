/**
 * Enhanced Resume Optimizer Hook with improved state management and infinite loop prevention
 * 
 * Key improvements:
 * 1. Uses refs to prevent state update loops
 * 2. Implements content memoization to reduce unnecessary re-renders  
 * 3. Adds safeguards against concurrent updates
 * 4. Simplifies effect dependencies
 * 5. Fixes loading state issues that could cause UI to get stuck
 * 6. Exposes state setters for direct manipulation from components (score, resumeId, suggestions, keywords)
 * 7. Facilitates direct data transfer from API to UI without requiring database reload
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';
import { useResumeScoreManager } from '@/hooks/useResumeScoreManager';
import { prepareOptimizedTextForEditor } from '@/utils/htmlProcessor';
import { normalizeHtmlContent } from '@/utils/resumeUtils';
import { toast } from 'sonner';
import { generateOptimizationMetrics, downloadOptimizationReport, exportFormats } from '@/services/resumeMetricsExporter';

export function useResumeOptimizerEnhanced(userId?: string | null) {
  // Get the base resume optimizer hook
  const resumeOptimizer = useResumeOptimizer(userId);
  
  // Destructure values from the base hook
  const {
    // Important to fully destructure isLoading to ensure we can properly track it
    optimizedText, editedText, suggestions, keywords, optimizationScore, resumeId,
    isLoading, resetResume, toggleKeyword, applySuggestion, loadLatestResume: baseLoadLatestResume,
    // Include remaining properties to ensure we don't lose functionality
    isUploading, isParsing, isOptimizing, needsRegeneration,
    selectedFile, resumeData, optimizedData, setSelectedFile, setOptimizedData, setOptimizedText, setEditedText
  } = resumeOptimizer;
  
  // Local state
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  const [appliedKeywords, setAppliedKeywords] = useState<string[]>([]);
  const [optimizationMetrics, setOptimizationMetrics] = useState<any>(null);
  
  // Add local states to enable direct updates for all relevant data
  const [localOptimizationScore, setLocalOptimizationScore] = useState<number>(optimizationScore);
  const [localResumeId, setLocalResumeId] = useState<string | null>(resumeId);
  const [localSuggestions, setLocalSuggestions] = useState<any[]>(suggestions || []);
  const [localKeywords, setLocalKeywords] = useState<any[]>(keywords || []);
  const [internalLoading, setInternalLoading] = useState(false);
  
  // Refs to prevent infinite loops and unnecessary rerenders
  const startTimeRef = useRef<Date>(new Date());
  const appliedSuggestionsRef = useRef<number[]>([]);
  const appliedKeywordsRef = useRef<string[]>([]);
  const isUpdatingContentRef = useRef(false);
  const isUpdatingTrackingRef = useRef(false);
  const lastProcessedContentRef = useRef<string>('');
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Safety timeout reference
  
  // Sync local states with base hook's states
  useEffect(() => {
    setLocalOptimizationScore(optimizationScore);
  }, [optimizationScore]);
  
  useEffect(() => {
    setLocalResumeId(resumeId);
  }, [resumeId]);
  
  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setLocalSuggestions(suggestions);
    }
  }, [suggestions]);
  
  useEffect(() => {
    if (keywords && keywords.length > 0) {
      setLocalKeywords(keywords);
    }
  }, [keywords]);
  
  // Initialize advanced score manager if available
  const scoreManager = useResumeScoreManager ? useResumeScoreManager({
    initialScore: optimizationScore,
    resumeContent: optimizedText || editedText || '',
    initialSuggestions: localSuggestions.map(s => ({
      id: s.id,
      type: s.type || 'general',
      text: s.text,
      impact: s.impact || 'medium',
      isApplied: s.isApplied || false
    })),
    initialKeywords: localKeywords.map(k => ({
      text: k.text,
      applied: k.applied
    })),
    resumeId: localResumeId,
    onScoreChange: (newScore) => {
      console.log("Advanced score updated:", newScore);
      // Update local score when score manager changes it
      setLocalOptimizationScore(newScore);
    }
  }) : null;

  /**
   * Safety timeout effect to ensure we don't get stuck in loading state
   * Even if network requests fail or other errors occur
   */
  useEffect(() => {
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // If we're in a loading state, set a safety timeout to force exit after max time
    if (internalLoading) {
      loadTimeoutRef.current = setTimeout(() => {
        console.log("Safety timeout triggered - forcing loading state to false");
        setInternalLoading(false);
      }, 8000); // 8 seconds max loading time
    }

    // Cleanup on unmount
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [internalLoading]);

  /**
   * Wrapper for loadLatestResume that adds additional safety
   * Ensures loading state is properly managed regardless of outcome
   */
  const loadLatestResume = useCallback(async (userId: string) => {
    // Set loading state
    setInternalLoading(true);
    
    try {
      console.log("Enhanced hook: Loading latest resume for user", userId);
      const result = await baseLoadLatestResume(userId);
      return result;
    } catch (error) {
      console.error("Enhanced hook: Error loading resume:", error);
      return null;
    } finally {
      // Critical: always reset loading state even if error occurs
      console.log("Enhanced hook: Resetting loading state");
      setInternalLoading(false);
    }
  }, [baseLoadLatestResume]);

  /**
   * Process resume text when it becomes available
   * Uses ref to prevent concurrent processing and avoid infinite loops
   */
  useEffect(() => {
    // Prevent concurrent updates or processing during loading
    if (isUpdatingContentRef.current || isLoading || internalLoading) return;
    
    const textToProcess = editedText || optimizedText;
    
    // Skip if content hasn't changed or is empty
    if (!textToProcess || textToProcess === lastProcessedContentRef.current) {
      return;
    }
    
    const processContent = async () => {
      isUpdatingContentRef.current = true;
      
      try {
        const normalizedText = normalizeHtmlContent(textToProcess);
        const processedContent = prepareOptimizedTextForEditor(normalizedText);
        
        // Only update if content has actually changed
        if (processedContent !== lastProcessedContentRef.current) {
          setProcessedHtml(processedContent);
          lastProcessedContentRef.current = processedContent;
          
          // Update score manager content if available
          if (scoreManager) {
            scoreManager.updateContent(processedContent);
          }
        }
      } catch (error) {
        console.error("Error processing resume text:", error);
        if (textToProcess !== lastProcessedContentRef.current) {
          setProcessedHtml(textToProcess);
          lastProcessedContentRef.current = textToProcess;
        }
      } finally {
        isUpdatingContentRef.current = false;
      }
    };
    
    // Use setTimeout to debounce updates and prevent infinite loops
    const timeoutId = setTimeout(() => {
      processContent();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [optimizedText, editedText, isLoading, internalLoading, scoreManager]);
  
  /**
   * Track applied suggestions and keywords without causing loops
   * Uses refs to maintain stable comparisons and prevent unnecessary updates
   */
  useEffect(() => {
    // Prevent concurrent updates
    if (isUpdatingTrackingRef.current) return;
    
    const updateTracking = () => {
      isUpdatingTrackingRef.current = true;
      
      try {
        let updated = false;
        
        // For suggestions
        if (localSuggestions && localSuggestions.length > 0) {
          const newApplied = localSuggestions
            .map((s, i) => s.isApplied ? i : -1)
            .filter(i => i !== -1);
          
          // Compare arrays by value, not reference
          const needsUpdate = JSON.stringify(newApplied) !== JSON.stringify(appliedSuggestionsRef.current);
          
          if (needsUpdate) {
            appliedSuggestionsRef.current = newApplied;
            setAppliedSuggestions(newApplied);
            updated = true;
          }
        }
        
        // For keywords
        if (localKeywords && localKeywords.length > 0) {
          const newApplied = localKeywords
            .filter(k => k.applied)
            .map(k => k.text);
          
          // Compare arrays by value, not reference
          const needsUpdate = JSON.stringify(newApplied) !== JSON.stringify(appliedKeywordsRef.current);
          
          if (needsUpdate) {
            appliedKeywordsRef.current = newApplied;
            setAppliedKeywords(newApplied);
            updated = true;
          }
        }
        
        // Generate metrics if tracking data was updated
        if (updated) {
          generateMetrics();
        }
      } finally {
        isUpdatingTrackingRef.current = false;
      }
    };
    
    // Debounce updates to prevent infinite loops
    const timeoutId = setTimeout(updateTracking, 100);
    
    return () => clearTimeout(timeoutId);
  }, [localSuggestions, localKeywords]); 
  
  /**
   * Generate metrics with error handling and debouncing
   */
  const generateMetrics = useCallback(() => {
    if (!generateOptimizationMetrics) return null;

    try {
      const initialScore = optimizationScore;
      const currentScore = scoreManager?.currentScore || localOptimizationScore || optimizationScore;
      const appliedSugs = localSuggestions.filter((s, i) => appliedSuggestions.includes(i));
      const appliedKeys = localKeywords.filter(k => appliedKeywords.includes(k.text));

      const metrics = generateOptimizationMetrics(
        initialScore,
        currentScore,
        appliedSugs,
        appliedKeys,
        startTimeRef.current
      );

      setOptimizationMetrics(metrics);
      return metrics;
    } catch (error) {
      console.error("Error generating metrics:", error);
      return null;
    }
  }, [
    optimizationScore, 
    localOptimizationScore,
    localSuggestions, 
    localKeywords, 
    appliedSuggestions, 
    appliedKeywords, 
    scoreManager
  ]);
  
  /**
   * Export report with improved error handling
   */
  const exportReport = useCallback((format: 'json' | 'csv' | 'markdown' = 'markdown') => {
    try {
      if (scoreManager?.exportReport) {
        scoreManager.exportReport(format);
        return;
      }

      // Fallback if scoreManager not available
      const metrics = generateMetrics();
      if (!metrics || !downloadOptimizationReport || !exportFormats) return;

      let content: string;
      let mimeType: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = exportFormats.toJSON(metrics);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'csv':
          content = exportFormats.toCSV(metrics);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
        case 'markdown':
        default:
          content = exportFormats.toMarkdown(metrics);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `resume-optimization-${timestamp}.${extension}`;

      downloadOptimizationReport(content, filename, mimeType);
      
      toast.success(`Report exported as ${filename}`);
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  }, [scoreManager, generateMetrics]);
  
  /**
   * Handle preview content change with debouncing
   */
  const handlePreviewContentChange = useCallback((html: string) => {
    // Only update if content has actually changed
    if (html === lastProcessedContentRef.current) return;
    
    lastProcessedContentRef.current = html;
    setProcessedHtml(html);
    
    // Update editedText in the hook with debouncing
    if (resumeOptimizer.setEditedText) {
      resumeOptimizer.setEditedText(html);
    }
    
    // Update content in score manager if available
    if (scoreManager) {
      scoreManager.updateContent(html);
    }
  }, [resumeOptimizer.setEditedText, scoreManager]);
  
  /**
   * Set suggestions with validation and formatting
   * This function allows directly setting suggestions from external components
   */
  const setSuggestions = useCallback((newSuggestions: any[]) => {
    console.log("Setting suggestions:", newSuggestions?.length || 0);
    
    // Validate input
    if (!newSuggestions || !Array.isArray(newSuggestions)) {
      console.warn("Invalid suggestions format, must be an array");
      return;
    }
    
    try {
      // Format suggestions to ensure consistent structure
      const formattedSuggestions = newSuggestions.map(suggestion => ({
        id: suggestion.id || String(Math.random()),
        type: suggestion.type || 'general',
        text: suggestion.text || '',
        impact: suggestion.impact || 'This suggestion may improve your resume.',
        isApplied: suggestion.isApplied || suggestion.is_applied || false
      }));
      
      // Update local suggestions state
      setLocalSuggestions(formattedSuggestions);
      
      // Update score manager if available
      if (scoreManager) {
        // Since we can't directly access score manager's setSuggestions,
        // we'll need to regenerate metrics after setting suggestions
        setTimeout(() => {
          generateMetrics();
        }, 100);
      }
    } catch (error) {
      console.error("Error setting suggestions:", error);
    }
  }, [scoreManager, generateMetrics]);
  
  /**
   * Set keywords with validation and formatting
   * This function allows directly setting keywords from external components
   */
  const setKeywords = useCallback((newKeywords: any[]) => {
    console.log("Setting keywords:", newKeywords?.length || 0);
    
    // Validate input
    if (!newKeywords || !Array.isArray(newKeywords)) {
      console.warn("Invalid keywords format, must be an array");
      return;
    }
    
    try {
      // Format keywords to ensure consistent structure
      const formattedKeywords = newKeywords.map(keyword => {
        // Handle different possible formats
        if (typeof keyword === 'string') {
          return {
            text: keyword,
            applied: false
          };
        }
        
        return {
          text: keyword.text || keyword.keyword || '',
          applied: keyword.applied || keyword.is_applied || false,
          impact: keyword.impact || 0.5,
          category: keyword.category || 'general'
        };
      });
      
      // Update local keywords state
      setLocalKeywords(formattedKeywords);
      
      // Update score manager if available
      if (scoreManager) {
        // Since we can't directly access score manager's setKeywords,
        // we'll need to regenerate metrics after setting keywords
        setTimeout(() => {
          generateMetrics();
        }, 100);
      }
    } catch (error) {
      console.error("Error setting keywords:", error);
    }
  }, [scoreManager, generateMetrics]);
  
  /**
   * Apply suggestion with improved state management
   */
  const handleApplySuggestion = useCallback((index: number) => {
    // Prevent invalid index
    if (index < 0 || index >= localSuggestions.length) return;
    
    // Use score manager if available
    if (scoreManager) {
      scoreManager.applySuggestion(index);
    }
    
    // Update local suggestions state
    setLocalSuggestions(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        isApplied: !updated[index].isApplied
      };
      return updated;
    });
    
    // Call original hook function
    applySuggestion(index);
  }, [applySuggestion, scoreManager, localSuggestions.length]);
  
  /**
   * Apply keyword with improved state management
   */
  const handleKeywordApply = useCallback((index: number) => {
    // Prevent invalid index
    if (index < 0 || index >= localKeywords.length) return;
    
    // Use score manager if available
    if (scoreManager) {
      scoreManager.applyKeyword(index);
    }
    
    // Update local keywords state
    setLocalKeywords(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        applied: !updated[index].applied
      };
      return updated;
    });
    
    // Call original hook function
    toggleKeyword(index);
  }, [toggleKeyword, scoreManager, localKeywords.length]);
  
  /**
   * Reset resume with improved error handling and state cleanup
   */
  const handleReset = useCallback(async () => {
    try {
      // Call original hook function
      const success = await resetResume();
      
      if (success) {
        // Reset score manager if available
        if (scoreManager) {
          scoreManager.resetAllChanges();
        }
        
        // Clear tracking refs
        appliedSuggestionsRef.current = [];
        appliedKeywordsRef.current = [];
        
        // Reset state
        setAppliedSuggestions([]);
        setAppliedKeywords([]);
        
        // Reset suggestions and keywords to their initial state
        setLocalSuggestions(localSuggestions.map(s => ({...s, isApplied: false})));
        setLocalKeywords(localKeywords.map(k => ({...k, applied: false})));
        
        // Set processed HTML to the original optimized text
        if (optimizedText) {
          try {
            const processedContent = prepareOptimizedTextForEditor(optimizedText);
            setProcessedHtml(processedContent);
            lastProcessedContentRef.current = processedContent;
          } catch (error) {
            console.error("Error processing optimized text after reset:", error);
            setProcessedHtml(optimizedText);
            lastProcessedContentRef.current = optimizedText;
          }
        }
      }
      
      return success;
    } catch (error) {
      console.error("Error resetting resume:", error);
      toast.error("Failed to reset resume");
      return false;
    }
  }, [resetResume, optimizedText, scoreManager, localSuggestions, localKeywords]);
  
  /**
   * Save resume with improved validation and error handling
   */
  const handleSave = useCallback(async (content: string): Promise<boolean> => {
    // Prevent saving if already in progress
    if (isUpdatingContentRef.current) {
      console.log("Save already in progress");
      return false;
    }
    
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
      if (!localResumeId) {
        toast.error("Cannot save resume", {
          description: "No resume ID found for saving."
        });
        return false;
      }
      
      // Save to database using the API
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resumeId: localResumeId,
          content: safeContent,
          userId: userId
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
      if (resumeOptimizer.setEditedText) {
        resumeOptimizer.setEditedText(safeContent);
      }
      
      // Update processed HTML state and ref
      setProcessedHtml(safeContent);
      lastProcessedContentRef.current = safeContent;
      
      // Update content in score manager if available
      if (scoreManager) {
        scoreManager.updateContent(safeContent);
        
        // Save score manager state
        scoreManager.saveState();
      }
      
      toast.success("Resume saved successfully");
      
      // Return success
      return true;
    } catch (error: any) {
      // Log the error
      console.error("Error saving resume:", error);
      
      toast.error("Failed to save resume", {
        description: error.message || "An unexpected error occurred."
      });
      
      // Return failure
      return false;
    }
  }, [localResumeId, userId, resumeOptimizer.setEditedText, scoreManager]);
  
  /**
   * Return enhanced hook with improved state management
   * All methods are wrapped with error handling and loop prevention
   */
  return {
    ...resumeOptimizer,
    processedHtml,
    isEditing,
    setIsEditing,
    appliedSuggestions,
    appliedKeywords,
    optimizationMetrics,
    scoreManager,
    // Use local states instead of base hook states
    suggestions: localSuggestions,
    keywords: localKeywords,
    // IMPORTANT: Use our enhanced wrapper and internal loading state instead of original
    loadLatestResume,
    isLoading: isLoading || internalLoading, // Combine both loading states for UI
    // Add these state setters to allow direct updates from components
    setOptimizationScore: setLocalOptimizationScore,
    setResumeId: setLocalResumeId,
    setSuggestions, // New function to update suggestions
    setKeywords,    // New function to update keywords
    generateMetrics,
    exportReport,
    handlePreviewContentChange,
    handleApplySuggestion,
    handleKeywordApply,
    handleReset,
    handleSave,
    // Expose loading state for debugging
    _isUpdatingContent: isUpdatingContentRef.current,
    _isUpdatingTracking: isUpdatingTrackingRef.current,
    _internalLoading: internalLoading
  };
}