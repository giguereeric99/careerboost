// hooks/resume/useResumeUpload.ts

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { optimizeResume, uploadResume, getFileUrl } from '@/services/resumeService';
import { OptimizationSuggestion as Suggestion } from '@/types/suggestionTypes';
import { Keyword } from '@/types/keywordTypes';

/**
 * Hook for resume file upload and initial optimization
 * Handles the complete workflow from file selection to AI optimization
 */
export function useResumeUpload(
  onOptimizationComplete: (
    optimizedText: string,
    resumeId: string,
    atsScore: number,
    suggestions: Suggestion[],
    keywords: Keyword[]
  ) => void
) {
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeContent, setResumeContent] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  
  /**
   * Handle text content changes in the upload form
   */
  const handleContentChange = useCallback((content: string) => {
    setResumeContent(content);
  }, []);
  
  /**
   * Handle file upload and processing
   */
  const handleFileUpload = useCallback(async (url: string, name: string, size?: number, type?: string) => {
    try {
      setIsUploading(true);
      
      // If URL is already provided (e.g. from Dropzone), use it directly
      if (url) {
        console.log("File URL provided:", url);
        await processUploadedFile(url, name, size, type);
        return true;
      }
      
      // Otherwise upload the selected file
      if (!selectedFile) {
        toast.error("No file selected");
        return false;
      }
      
      toast.loading("Uploading resume...");
      
      // Upload the file
      const { path, error } = await uploadResume(selectedFile);
      
      if (error) {
        toast.error("Upload failed", { description: error.message });
        return false;
      }
      
      // Get the public URL
      const fileUrl = getFileUrl(path);
      console.log("File uploaded successfully, URL:", fileUrl);
      
      // Process the uploaded file
      return await processUploadedFile(
        fileUrl, 
        selectedFile.name, 
        selectedFile.size, 
        selectedFile.type
      );
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error("Upload failed", { description: error.message });
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile]);
  
  /**
   * Process an uploaded file to extract and optimize content
   */
  const processUploadedFile = useCallback(async (
    fileUrl: string, 
    fileName: string, 
    fileSize?: number, 
    fileType?: string
  ) => {
    try {
      setIsUploading(false);
      setIsOptimizing(true);
      
      toast.loading("Analyzing resume content...");
      
      // Create resume data object for optimization
      const resumeData = {
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize || 0,
        file_type: fileType || ''
      };
      
      // Call the optimization service
      const { 
        optimizedText, 
        optimizedData, 
        suggestions, 
        keywordSuggestions,
        atsScore,
        error 
      } = await optimizeResume(resumeData);
      
      if (error) {
        toast.error("Optimization failed", { description: error.message });
        return false;
      }
      
      // Prepare the results for the callback
      // Convert keyword strings to keyword objects
      const keywordObjects = keywordSuggestions.map((text, index) => ({
        id: `keyword-${index}-${Date.now()}`,
        text,
        isApplied: false,
        relevance: 1
      }));
      
      // Ensure optimized text is available
      if (!optimizedText) {
        toast.error("No optimized text returned");
        return false;
      }
      
      // Update content state
      setResumeContent(optimizedText);
      
      // Call success callback with all the data
      onOptimizationComplete(
        optimizedText,
        optimizedData?.id || '',
        atsScore,
        suggestions || [],
        keywordObjects
      );
      
      // Show success toast
      toast.success("Resume optimized successfully!");
      
      return true;
    } catch (error: any) {
      console.error("Error processing file:", error);
      toast.error("Processing failed", { description: error.message });
      return false;
    } finally {
      setIsOptimizing(false);
    }
  }, [onOptimizationComplete]);
  
  /**
   * Handle direct text analysis without file upload
   */
  const handleTextAnalysis = useCallback(async () => {
    try {
      // Validate we have content to analyze
      if (!resumeContent || resumeContent.trim().length < 100) {
        toast.error("Please provide more text to analyze (at least 100 characters)");
        return false;
      }
      
      setIsOptimizing(true);
      toast.loading("Analyzing resume content...");
      
      // Create resume data with direct content
      const resumeData = {
        content: resumeContent,
        file_name: 'direct-input.txt',
        file_type: 'text/plain'
      };
      
      // Call the optimization service
      const { 
        optimizedText, 
        optimizedData, 
        suggestions, 
        keywordSuggestions,
        atsScore,
        error 
      } = await optimizeResume(resumeData);
      
      if (error) {
        toast.error("Optimization failed", { description: error.message });
        return false;
      }
      
      // Convert keyword strings to objects
      const keywordObjects = keywordSuggestions.map((text, index) => ({
        id: `keyword-${index}-${Date.now()}`,
        text,
        isApplied: false,
        relevance: 1
      }));
      
      // Call success callback with all the data
      onOptimizationComplete(
        optimizedText || resumeContent,
        optimizedData?.id || '',
        atsScore,
        suggestions || [],
        keywordObjects
      );
      
      toast.success("Resume optimized successfully!");
      
      return true;
    } catch (error: any) {
      console.error("Error analyzing text:", error);
      toast.error("Analysis failed", { description: error.message });
      return false;
    } finally {
      setIsOptimizing(false);
    }
  }, [resumeContent, onOptimizationComplete]);
  
  return {
    // State
    selectedFile,
    resumeContent,
    isUploading,
    isOptimizing,
    
    // Actions
    setSelectedFile,
    handleContentChange,
    handleFileUpload,
    processUploadedFile,
    handleTextAnalysis
  };
}