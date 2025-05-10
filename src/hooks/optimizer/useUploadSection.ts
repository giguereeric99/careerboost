/**
 * useUploadSection Hook
 * 
 * Custom hook for managing file uploads and text input for resume optimization.
 * Handles the upload workflow, file processing, and API communication.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { 
  uploadResume, 
  getFileUrl, 
  parseResume, 
  optimizeResume, 
  parseOptimizedText, 
  extractKeywords 
} from '@/services/resumeService';

/**
 * Interface for uploaded file information
 */
interface UploadedFileInfo {
  name: string;
  size: number;
  type: string;
  url: string;
}

/**
 * Hook props - allows parent to receive optimization data
 */
interface UseUploadSectionProps {
  onOptimizationComplete?: (
    optimizedText: string,
    resumeId: string,
    atsScore: number,
    suggestions: any[],
    keywords: any[]
  ) => void;
  
  /**
   * Called when analysis/optimization starts
   */
  onAnalysisStart?: () => void;
}

/**
 * Custom hook for managing the upload section functionality
 */
export const useUploadSection = ({ onOptimizationComplete, onAnalysisStart }: UseUploadSectionProps = {}) => {
  // Get user info
  const { user } = useUser();
  
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<UploadedFileInfo | null>(null);
  
  // Text input state
  const [resumeContent, setResumeContent] = useState<string>('');
  
  // Processing state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [analysisCompleted, setAnalysisCompleted] = useState<boolean>(false);
  
  /**
   * Handle file selection
   */
  const handleFileChange = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  /**
   * Handle text input changes
   */
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResumeContent(e.target.value);
  }, []);

  /**
   * Upload file to storage and optimize
   */
  const handleFileUpload = useCallback(async (url: string, name: string, size: number, type: string) => {
    // Store uploaded file info
    setUploadedFileInfo({
      name,
      size,
      type,
      url
    });
    
    // Create a File object for the selected file
    const file = new File([''], name, { type });
    setSelectedFile(file);
    
    // Return the file info
    return { url, name, size, type };
  }, []);

  /**
   * Process uploaded file and optimize it
   */
  const processUploadedFile = useCallback(async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    if (!fileUrl || isOptimizing) return null;
    
    // Start optimization process
    setIsOptimizing(true);
    setAnalysisCompleted(false);
    
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    const loadingToastId = toast.loading("Analyzing uploaded resume...");
    
    try {
      // Prepare form data for API request
      const formData = new FormData();
      formData.append("fileUrl", fileUrl);
      formData.append("fileName", fileName);
      formData.append("fileType", fileType || "");
      formData.append("userId", user?.id || "");
      formData.append("resetLastSavedText", "true");
      
      // Call optimization API
      const response = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });
      
      // Parse the response
      const result = await response.json();
      
      // Handle API error
      if (!response.ok) {
        throw new Error(result?.error || "Optimization failed");
      }
      
      // Process successful response
      if (result?.optimizedText) {
        toast.dismiss(loadingToastId);
        toast.success("Resume uploaded and optimized");
        
        // Mark analysis as completed
        setAnalysisCompleted(true);
        
        // Extract and normalize data
        const optimizedText = result.optimizedText || '';
        const resumeId = result.resumeId || '';
        const atsScore = result.atsScore || 65;
        
        // Format suggestions
        const suggestions = Array.isArray(result.suggestions) 
          ? result.suggestions.map((s: any) => ({
              id: s.id || String(Math.random()),
              text: s.text || s.original_text || '',
              improvement: s.improvement || s.improved_text || '',
              type: s.type || 'general',
              impact: s.impact || 'This improvement could enhance your resume',
              is_applied: s.is_applied || false
            }))
          : [];
        
        // Format keywords
        const keywords = result.keywords 
          ? result.keywords 
          : (result.keywordSuggestions 
              ? result.keywordSuggestions.map((text: string) => ({ 
                  id: String(Math.random()),
                  text, 
                  is_applied: false 
                })) 
              : []);
        
        // Call the callback with processed data
        if (onOptimizationComplete) {
          onOptimizationComplete(
            optimizedText,
            resumeId,
            atsScore,
            suggestions,
            keywords
          );
        }
        
        return {
          optimizedText,
          resumeId,
          atsScore,
          suggestions,
          keywords
        };
      } else {
        throw new Error("Invalid response from optimization API");
      }
    } catch (err: any) {
      toast.dismiss(loadingToastId);
      toast.error("Upload analysis error", {
        description: err.message,
      });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, user?.id, onAnalysisStart, onOptimizationComplete]);

  /**
   * Handle the optimization of pasted text content
   */
  const handleTextAnalysis = useCallback(async () => {
    // Validate content
    if (!resumeContent || resumeContent.length < 50 || isOptimizing) {
      if (resumeContent.length < 50) {
        toast.error("Please enter at least 50 characters");
      }
      return;
    }
    
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    // Start optimization process
    setIsOptimizing(true);
    setAnalysisCompleted(false);
    
    const loadingToastId = toast.loading("Analyzing resume content...");
    
    try {
      // Prepare form data for API request
      const formData = new FormData();
      formData.append("rawText", resumeContent);
      if (user?.id) formData.append("userId", user.id);
      formData.append("resetLastSavedText", "true");
      
      // Call optimization API
      const response = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });
      
      // Parse the response
      const result = await response.json();
      
      // Handle API error
      if (!response.ok) {
        throw new Error(result?.error || "Analysis failed");
      }
      
      // Process successful response
      if (result?.optimizedText) {
        toast.dismiss(loadingToastId);
        toast.success("Resume content analyzed successfully");
        
        // Mark analysis as completed
        setAnalysisCompleted(true);
        
        // Extract and normalize data
        const optimizedText = result.optimizedText || '';
        const resumeId = result.resumeId || '';
        const atsScore = result.atsScore || 65;
        
        // Format suggestions
        const suggestions = Array.isArray(result.suggestions) 
          ? result.suggestions.map((s: any) => ({
              id: s.id || String(Math.random()),
              text: s.text || s.original_text || '',
              improvement: s.improvement || s.improved_text || '',
              type: s.type || 'general',
              impact: s.impact || 'This improvement could enhance your resume',
              is_applied: s.is_applied || false
            }))
          : [];
        
        // Format keywords
        const keywords = result.keywords 
          ? result.keywords 
          : (result.keywordSuggestions 
              ? result.keywordSuggestions.map((text: string) => ({ 
                  id: String(Math.random()),
                  text, 
                  is_applied: false 
                })) 
              : []);
        
        // Call the callback with processed data
        if (onOptimizationComplete) {
          onOptimizationComplete(
            optimizedText,
            resumeId,
            atsScore,
            suggestions,
            keywords
          );
        }
        
        return {
          optimizedText,
          resumeId,
          atsScore,
          suggestions,
          keywords
        };
      } else {
        throw new Error("Invalid response from optimization API");
      }
    } catch (err: any) {
      toast.dismiss(loadingToastId);
      toast.error("Content analysis error", {
        description: err.message,
      });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, [resumeContent, isOptimizing, user?.id, onAnalysisStart, onOptimizationComplete]);

  return {
    // State
    selectedFile,
    uploadedFileInfo,
    resumeContent,
    isUploading,
    isOptimizing,
    isDragOver,
    analysisCompleted,
    
    // Actions
    setSelectedFile,
    setIsUploading,
    setIsDragOver,
    handleFileChange,
    handleContentChange,
    handleFileUpload,
    processUploadedFile,
    handleTextAnalysis
  };
};

export default useUploadSection;