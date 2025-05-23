/**
 * useUploadSection Hook
 *
 * Custom hook for managing file uploads and text input for resume optimization.
 * Handles the upload workflow, file processing, and API communication.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import {
  uploadResume,
  getFileUrl,
  parseResume,
  optimizeResume,
  parseOptimizedText,
  extractKeywords,
} from "@/services/resumeService";
import { UploadedFileInfo } from "@/types/resumeTypes";

/**
 * Hook props - allows parent to receive optimization data
 * and react to state changes in the upload workflow
 */
interface UseUploadSectionProps {
  /**
   * Callback triggered when optimization is complete
   * Provides all relevant data to the parent component
   */
  onOptimizationComplete?: (
    optimizedText: string,
    resumeId: string,
    atsScore: number,
    suggestions: any[],
    keywords: any[]
  ) => void;

  /**
   * Callback triggered when analysis/optimization starts
   * Allows parent to react to the beginning of the process
   */
  onAnalysisStart?: () => void;
}

/**
 * Normalizes a suggestion object to ensure consistent structure
 * Handles different property naming conventions (camelCase vs snake_case)
 *
 * @param suggestion - Raw suggestion from API or other source
 * @returns Normalized suggestion with consistent property names
 */
function normalizeSuggestion(suggestion: any) {
  return {
    // Generate ID if missing - critical for operations on suggestions
    id: suggestion.id || suggestion.suggestion_id || String(Math.random()),
    // Ensure required text properties exist
    text: suggestion.text || suggestion.original_text || "",
    type: suggestion.type || "general",
    impact: suggestion.impact || "This improvement could enhance your resume",
    // Handle both camelCase and snake_case variations
    isApplied: suggestion.isApplied || suggestion.is_applied || false,
    // Include pointImpact for score calculations
    pointImpact: suggestion.pointImpact || suggestion.point_impact || 2,
  };
}

/**
 * Normalizes a keyword object to ensure consistent structure
 * Handles different property naming conventions and formats
 *
 * @param keyword - Raw keyword from API (string or object)
 * @returns Normalized keyword with consistent property names
 */
function normalizeKeyword(keyword: any) {
  // Handle case where keyword is just a string
  if (typeof keyword === "string") {
    return {
      id: String(Math.random()),
      text: keyword,
      isApplied: false,
      relevance: 1,
      pointImpact: 1,
    };
  }

  // Handle keyword as an object with potential varying property names
  return {
    id: keyword.id || keyword.keyword_id || String(Math.random()),
    text: keyword.text || keyword.keyword || "",
    // Support all possible variations of the applied property
    isApplied:
      keyword.isApplied || keyword.is_applied || keyword.applied || false,
    relevance: keyword.relevance || 1,
    pointImpact: keyword.pointImpact || keyword.point_impact || 1,
  };
}

/**
 * Custom hook for managing the upload section functionality
 * Provides a complete API for handling resume uploads and optimization
 *
 * @param props - Configuration options and callbacks
 * @returns Object containing state and functions for upload management
 */
export const useUploadSection = ({
  onOptimizationComplete,
  onAnalysisStart,
}: UseUploadSectionProps = {}) => {
  // Get authenticated user info from Clerk
  const { user } = useUser();

  // File state management
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] =
    useState<UploadedFileInfo | null>(null);

  // Text input state for direct pasting
  const [resumeContent, setResumeContent] = useState<string>("");

  // Processing state flags
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(false);

  /**
   * Handle file selection from input or drop event
   * Updates the selected file state
   *
   * @param file - The file object from the browser
   */
  const handleFileChange = useCallback((file: File | null) => {
    setSelectedFile(file);
  }, []);

  /**
   * Handle text input changes in the paste area
   * Updates the resume content state
   *
   * @param e - Change event from textarea
   */
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setResumeContent(e.target.value);
    },
    []
  );

  /**
   * Store uploaded file info and prepare for processing
   * This function is called after a file is successfully uploaded
   *
   * @param url - The URL of the uploaded file
   * @param name - The original filename
   * @param size - The file size in bytes
   * @param type - The MIME type of the file
   * @returns Object containing file information
   */
  const handleFileUpload = useCallback(
    async (url: string, name: string, size: number, type: string) => {
      // Store uploaded file metadata for reference
      setUploadedFileInfo({
        name,
        size,
        type,
        url,
      });

      // Create a File object reference for the selected file
      const file = new File([""], name, { type });
      setSelectedFile(file);

      // Return the file information for further processing
      return { url, name, size, type };
    },
    []
  );

  /**
   * Process uploaded file and submit it for optimization
   * Handles the entire workflow from uploaded file to optimization results
   *
   * @param fileUrl - The URL of the file to process
   * @param fileName - The name of the file
   * @param fileSize - The size of the file in bytes
   * @param fileType - The MIME type of the file
   * @returns Object containing optimization results or null on failure
   */
  const processUploadedFile = useCallback(
    async (
      fileUrl: string,
      fileName: string,
      fileSize: number,
      fileType: string
    ) => {
      // Validate inputs and check if already processing
      if (!fileUrl || isOptimizing) return null;

      // Update processing state
      setIsOptimizing(true);
      setAnalysisCompleted(false);

      // Notify parent component that analysis is starting
      if (onAnalysisStart) {
        onAnalysisStart();
      }

      // Show loading toast for user feedback
      const loadingToastId = toast.loading("Analyzing uploaded resume...");

      try {
        // Prepare form data for API request
        const formData = new FormData();
        formData.append("fileUrl", fileUrl);
        formData.append("fileName", fileName);
        formData.append("fileType", fileType || "");
        formData.append("userId", user?.id || "");
        formData.append("resetLastSavedText", "true");

        // Send request to optimization API endpoint
        const response = await fetch("/api/optimize", {
          method: "POST",
          body: formData,
        });

        // Parse the response JSON
        const result = await response.json();

        // Handle API error responses
        if (!response.ok) {
          throw new Error(result?.error || "Optimization failed");
        }

        // Process successful response
        if (result?.optimizedText) {
          // Update UI with success notification
          toast.dismiss(loadingToastId);
          toast.success("Resume uploaded and optimized");

          // Update state to reflect completed analysis
          setAnalysisCompleted(true);

          // Extract and normalize data from response
          const optimizedText = result.optimizedText || "";
          const resumeId = result.resumeId || "";
          const atsScore = result.atsScore || 65;

          // Log raw suggestions data for debugging
          console.log("Raw suggestions data from API:", result.suggestions);

          // Format and normalize suggestions with consistent structure
          // This fixes issues with missing IDs and property name inconsistencies
          const suggestions = Array.isArray(result.suggestions)
            ? result.suggestions.map(normalizeSuggestion)
            : [];

          // Log normalized suggestions for verification
          console.log("Normalized suggestions:", suggestions);

          // Format keywords with consistent structure
          // Handle both arrays of objects and arrays of strings
          const keywords = result.keywords
            ? result.keywords.map(normalizeKeyword)
            : result.keywordSuggestions
            ? result.keywordSuggestions.map(normalizeKeyword)
            : [];

          // Log normalized keywords for verification
          console.log("Normalized keywords:", keywords);

          // Notify parent component of successful optimization
          if (onOptimizationComplete) {
            onOptimizationComplete(
              optimizedText,
              resumeId,
              atsScore,
              suggestions,
              keywords
            );
          }

          // Return optimization results
          return {
            optimizedText,
            resumeId,
            atsScore,
            suggestions,
            keywords,
          };
        } else {
          // Handle unexpected API response format
          throw new Error("Invalid response from optimization API");
        }
      } catch (err: any) {
        // Handle and display errors
        toast.dismiss(loadingToastId);
        toast.error("Upload analysis error", {
          description: err.message,
        });
        return null;
      } finally {
        // Reset processing state regardless of outcome
        setIsOptimizing(false);
      }
    },
    [isOptimizing, user?.id, onAnalysisStart, onOptimizationComplete]
  );

  /**
   * Process text input for optimization
   * Handles the workflow for optimizing directly pasted resume content
   *
   * @returns Object containing optimization results or null on failure
   */
  const handleTextAnalysis = useCallback(async () => {
    // Validate input content length and check if already processing
    if (!resumeContent || resumeContent.length < 50 || isOptimizing) {
      if (resumeContent.length < 50) {
        toast.error("Please enter at least 50 characters");
      }
      return;
    }

    // Notify parent component that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }

    // Update processing state
    setIsOptimizing(true);
    setAnalysisCompleted(false);

    // Show loading toast for user feedback
    const loadingToastId = toast.loading("Analyzing resume content...");

    try {
      // Prepare form data for API request
      const formData = new FormData();
      formData.append("rawText", resumeContent);
      if (user?.id) formData.append("userId", user.id);
      formData.append("resetLastSavedText", "true");

      // Send request to optimization API endpoint
      const response = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });

      // Parse the response JSON
      const result = await response.json();

      // Handle API error responses
      if (!response.ok) {
        throw new Error(result?.error || "Analysis failed");
      }

      // Process successful response
      if (result?.optimizedText) {
        // Update UI with success notification
        toast.dismiss(loadingToastId);
        toast.success("Resume content analyzed successfully");

        // Update state to reflect completed analysis
        setAnalysisCompleted(true);

        // Extract and normalize data from response
        const optimizedText = result.optimizedText || "";
        const resumeId = result.resumeId || "";
        const atsScore = result.atsScore || 65;

        // Log raw suggestions data for debugging
        console.log("Raw suggestions data from API:", result.suggestions);

        // Format and normalize suggestions with consistent structure
        // This fixes issues with missing IDs and property name inconsistencies
        const suggestions = Array.isArray(result.suggestions)
          ? result.suggestions.map(normalizeSuggestion)
          : [];

        // Log normalized suggestions for verification
        console.log("Normalized suggestions after text analysis:", suggestions);

        // Format keywords with consistent structure
        // Handle both arrays of objects and arrays of strings
        const keywords = result.keywords
          ? result.keywords.map(normalizeKeyword)
          : result.keywordSuggestions
          ? result.keywordSuggestions.map(normalizeKeyword)
          : [];

        // Log normalized keywords for verification
        console.log("Normalized keywords after text analysis:", keywords);

        // Notify parent component of successful optimization
        if (onOptimizationComplete) {
          onOptimizationComplete(
            optimizedText,
            resumeId,
            atsScore,
            suggestions,
            keywords
          );
        }

        // Return optimization results
        return {
          optimizedText,
          resumeId,
          atsScore,
          suggestions,
          keywords,
        };
      } else {
        // Handle unexpected API response format
        throw new Error("Invalid response from optimization API");
      }
    } catch (err: any) {
      // Handle and display errors
      toast.dismiss(loadingToastId);
      toast.error("Content analysis error", {
        description: err.message,
      });
      return null;
    } finally {
      // Reset processing state regardless of outcome
      setIsOptimizing(false);
    }
  }, [
    resumeContent,
    isOptimizing,
    user?.id,
    onAnalysisStart,
    onOptimizationComplete,
  ]);

  // Return all state values and functions for use by components
  return {
    // State values
    selectedFile,
    uploadedFileInfo,
    resumeContent,
    isUploading,
    isOptimizing,
    isDragOver,
    analysisCompleted,

    // Actions and updaters
    setSelectedFile,
    setIsUploading,
    setIsDragOver,
    handleFileChange,
    handleContentChange,
    handleFileUpload,
    processUploadedFile,
    handleTextAnalysis,
  };
};

export default useUploadSection;
