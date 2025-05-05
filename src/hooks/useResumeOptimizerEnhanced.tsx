import { useState, useEffect, useCallback, useRef } from 'react';
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';
import { useResumeScoreManager } from '@/hooks/useResumeScoreManager';
import { prepareOptimizedTextForEditor } from '@/utils/htmlProcessor';
import { normalizeHtmlContent } from '@/utils/resumeUtils';
import { toast } from 'sonner';
import { generateOptimizationMetrics, downloadOptimizationReport, exportFormats } from '@/services/resumeMetricsExporter';

/**
 * Enhanced Resume Optimizer Hook with improved state management and infinite loop prevention
 * 
 * Key improvements:
 * 1. Uses refs to prevent state update loops
 * 2. Implements content memoization to reduce unnecessary re-renders  
 * 3. Adds safeguards against concurrent updates
 * 4. Simplifies effect dependencies
 */
export function useResumeOptimizerEnhanced(userId?: string | null) {
  // Get the base resume optimizer hook
  const resumeOptimizer = useResumeOptimizer();
  
  // Destructure values from the base hook
  const {
    optimizedText, editedText, suggestions, keywords, optimizationScore, resumeId,
  } = resumeOptimizer;
  
  // Local state
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([]);
  const [appliedKeywords, setAppliedKeywords] = useState<string[]>([]);
  const [optimizationMetrics, setOptimizationMetrics] = useState<any>(null);
  
  // Refs to prevent infinite loops and unnecessary rerenders
  const startTimeRef = useRef<Date>(new Date());
  const appliedSuggestionsRef = useRef<number[]>([]);
  const appliedKeywordsRef = useRef<string[]>([]);
  const isUpdatingContentRef = useRef(false);
  const isUpdatingTrackingRef = useRef(false);
  const lastProcessedContentRef = useRef<string>('');
  
  // Initialize advanced score manager if available
  const scoreManager = useResumeScoreManager ? useResumeScoreManager({
    initialScore: optimizationScore,
    resumeContent: optimizedText || editedText || '',
    initialSuggestions: suggestions.map(s => ({
      id: s.id,
      type: s.type || 'general',
      text: s.text,
      impact: s.impact || 'medium',
      isApplied: s.isApplied || false
    })),
    initialKeywords: keywords.map(k => ({
      text: k.text,
      applied: k.applied
    })),
    resumeId: resumeId,
    onScoreChange: (newScore) => {
      console.log("Advanced score updated:", newScore);
    }
  }) : null;
  
  /**
   * Process resume text when it becomes available
   * Uses ref to prevent concurrent processing and avoid infinite loops
   */
  useEffect(() => {
    // Prevent concurrent updates
    if (isUpdatingContentRef.current) return;
    
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
  }, [optimizedText, editedText]); // Removed scoreManager from dependencies
  
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
        if (suggestions && suggestions.length > 0) {
          const newApplied = suggestions
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
        if (keywords && keywords.length > 0) {
          const newApplied = keywords
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
  }, [suggestions, keywords]); // Simplified dependencies
  
  /**
   * Generate metrics with error handling and debouncing
   */
  const generateMetrics = useCallback(() => {
    if (!generateOptimizationMetrics) return null;

    try {
      const initialScore = optimizationScore;
      const currentScore = scoreManager?.currentScore || optimizationScore;
      const appliedSugs = suggestions.filter((s, i) => appliedSuggestions.includes(i));
      const appliedKeys = keywords.filter(k => appliedKeywords.includes(k.text));

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
    suggestions, 
    keywords, 
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
   * Apply suggestion with improved state management
   */
  const handleApplySuggestion = useCallback((index: number) => {
    // Prevent invalid index
    if (index < 0 || index >= suggestions.length) return;
    
    // Use score manager if available
    if (scoreManager) {
      scoreManager.applySuggestion(index);
    }
    
    // Call original hook function
    resumeOptimizer.applySuggestion(index);
  }, [resumeOptimizer.applySuggestion, scoreManager, suggestions.length]);
  
  /**
   * Apply keyword with improved state management
   */
  const handleKeywordApply = useCallback((index: number) => {
    // Prevent invalid index
    if (index < 0 || index >= keywords.length) return;
    
    // Use score manager if available
    if (scoreManager) {
      scoreManager.applyKeyword(index);
    }
    
    // Call original hook function
    resumeOptimizer.toggleKeyword(index);
  }, [resumeOptimizer.toggleKeyword, scoreManager, keywords.length]);
  
  /**
   * Regenerate resume with debouncing and loading state
   */
  const handleRegenerateResume = useCallback(async () => {
    try {
      // Call original hook function
      await resumeOptimizer.applyChanges();
      
      // Update score manager if available
      if (scoreManager) {
        scoreManager.applyAllChanges();
      }
      
      // Generate metrics for reporting
      generateMetrics();
    } catch (error) {
      console.error("Error regenerating resume:", error);
      toast.error("Failed to regenerate resume");
    }
  }, [resumeOptimizer.applyChanges, scoreManager, generateMetrics]);
  
  /**
   * Reset resume with improved error handling and state cleanup
   */
  const handleReset = useCallback(async () => {
    try {
      // Call original hook function
      const success = await resumeOptimizer.resetResume();
      
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
  }, [resumeOptimizer.resetResume, optimizedText, scoreManager]);
  
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
      if (!resumeId) {
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
          resumeId: resumeId,
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
  }, [resumeId, userId, resumeOptimizer.setEditedText, scoreManager]);
  
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
    generateMetrics,
    exportReport,
    handlePreviewContentChange,
    handleApplySuggestion,
    handleKeywordApply,
    handleRegenerateResume,
    handleReset,
    handleSave,
    // Expose loading state for debugging
    _isUpdatingContent: isUpdatingContentRef.current,
    _isUpdatingTracking: isUpdatingTrackingRef.current
  };
}