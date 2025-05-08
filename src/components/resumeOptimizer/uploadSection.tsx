/**
 * Enhanced UploadSection Component
 * 
 * Provides an interface for users to upload or paste their resume content.
 * Features:
 * - File upload via drag & drop or button click
 * - Text input for pasting resume content
 * - Automatic transition to preview after successful optimization
 * - Visual feedback during processing
 * - Direct data transfer to parent component without requiring database reload
 * - Improved ATS score extraction and transmission
 */

'use client';

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle, AlertCircle } from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";
import { toast } from "sonner";
import { useUser, SignInButton } from "@clerk/nextjs";

/**
 * Props interface for the UploadSection component
 * Defines the expected properties for controlling the upload and analysis process
 * Enhanced to include optimizedText, resumeId, and atsScore in onAnalysisComplete
 */
interface UploadSectionProps {
  isUploading: boolean;              // Whether a file is currently being uploaded
  isParsing: boolean;                // Whether resume content is being parsed
  selectedFile: File | null;         // Currently selected file object
  resumeContent: string;             // Content from pasted resume or extracted from file
  onFileChange: (file: File) => void;  // Handler for file input change
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;  // Handler for textarea change
  onContinue: () => void;            // Handler for continue button click
  onFileUpload: (url: string, name: string, size?: number, type?: string) => void;  // Handler for successful file upload
  setActiveTab?: (tab: string) => void; // Optional prop to control tab navigation
  onAnalysisStart?: () => void;      // Called when analysis starts
  onAnalysisComplete?: (
    optimizedText?: string, 
    resumeId?: string,
    atsScore?: number,
    suggestions?: any[],
    keywords?: any[]
  ) => void;  // Called when analysis completes with all necessary data
}

/**
 * Mapping of MIME types to human-readable file extensions/formats
 * Used for displaying file type in a user-friendly format
 */
const mimeLabelMap: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
};

/**
 * UploadSection Component
 * 
 * Provides an interface for users to upload or paste their resume content.
 * Enhanced to extract and pass ATS score directly to parent component, avoiding reload
 */
const UploadSection: React.FC<UploadSectionProps> = ({
  isUploading,
  isParsing,
  selectedFile,
  resumeContent,
  onFileChange,
  onContentChange,
  onContinue,
  onFileUpload,
  setActiveTab,
  onAnalysisStart,
  onAnalysisComplete,
}) => {
  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------
  
  // Ref for accessing the file input element
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // UI interaction state
  const [isDragOver, setIsDragOver] = useState(false);        // Tracks drag over state for visual feedback
  const [isProcessing, setIsProcessing] = useState(false);    // Tracks if processing is in progress
  const [analysisCompleted, setAnalysisCompleted] = useState(false); // Tracks if analysis has finished
  const [isUploadInProgress, setIsUploadInProgress] = useState(false); // Tracks if upload is active
  
  // Data state
  const [uploadedInfo, setUploadedInfo] = useState<{ name: string; size: number; type: string } | null>(null); // Uploaded file info
  
  // Get user authentication status from Clerk
  const { isSignedIn, user } = useUser();

  // -------------------------------------------------------------------------
  // Helper Functions
  // -------------------------------------------------------------------------
  
  /**
   * Convert bytes to KB with 1 decimal place
   * Makes file sizes more readable for users
   */
  const readableSize = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";

  /**
   * Check if analysis is currently in progress
   * Used to determine if UI should be disabled
   */
  const isAnalysisInProgress = () => {
    return isParsing || isProcessing || isUploadInProgress;
  };

  /**
   * Determine if upload buttons should be disabled
   * Disable when already uploading, processing, or file already uploaded
   */
  const shouldDisableUpload = () => {
    return isUploading || isParsing || isProcessing || !!uploadedInfo || isUploadInProgress;
  };

  /**
   * Processes API response to extract all necessary data
   * Formats data consistently for parent component
   * Enhanced to ensure ATS score is properly extracted and passed
   */
  const processApiResponse = (result: any) => {
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid API response format');
    }

    // Log complet de l'objet résultat pour debug
    console.log("Complete API result object:", result);
    
    // Extract basic data
    const optimizedText = result.optimizedText || result.optimized_text || '';
    const resumeId = result.resumeId || result.resume_id || '';
    
    // Extract ATS score with more robust fallbacks and logging
    let atsScore = 65; // Valeur par défaut
  
    if (typeof result.atsScore === 'number') {
      atsScore = result.atsScore;
    } else if (typeof result.ats_score === 'number') {
      atsScore = result.ats_score;
    }
  
    console.log("ATS Score extracted:", atsScore, "Type:", typeof atsScore);
    
    // Extract or process suggestions
    let suggestions = result.suggestions || [];
    
    // Ensure suggestions have consistent format
    suggestions = suggestions.map((suggestion: any) => ({
      id: suggestion.id || String(Math.random()),
      type: suggestion.type || 'general',
      text: suggestion.text || '',
      impact: suggestion.impact || 'This suggestion may improve your resume.',
      isApplied: suggestion.isApplied || suggestion.is_applied || false
    }));
    
    // Extract or process keywords
    let keywords = [];
    
    // Handle different possible keyword formats
    if (Array.isArray(result.keywords) && result.keywords.length > 0) {
      keywords = result.keywords.map((k: any) => ({
        text: k.text || k.keyword || '',
        applied: k.applied || k.is_applied || false,
        impact: k.impact || 0.5,
        category: k.category || 'general'
      }));
    } else if (Array.isArray(result.keywordSuggestions) && result.keywordSuggestions.length > 0) {
      // Convert string arrays to keyword objects
      keywords = result.keywordSuggestions.map((text: string) => ({
        text,
        applied: false,
        impact: 0.5,
        category: 'general'
      }));
    }
    
    return {
      optimizedText,
      resumeId,
      atsScore,
      suggestions,
      keywords
    };
  };

  // -------------------------------------------------------------------------
  // Text Processing Handler
  // -------------------------------------------------------------------------
  
  /**
   * Handles direct text input analysis
   * Processes pasted resume content and automatically transitions to preview
   * Enhanced to extract and pass ATS score directly to parent component
   */
  const handleTextAnalysis = async () => {
    // Validate minimum content length
    if (!resumeContent || resumeContent.length < 50 || isProcessing) return;
    
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    // Update processing state for UI feedback
    setIsProcessing(true);
    const loadingToastId = toast.loading("Analyzing resume content...");
    
    try {
      // Prepare form data for API request
      const formData = new FormData();
      formData.append("rawText", resumeContent);
      if (user?.id) formData.append("userId", user.id);
      formData.append("resetLastSavedText", "true");
      
      // Call optimization API
      const optimizeRes = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });
      
      // Parse the response
      const result = await optimizeRes.json();
      
      // Log the raw API response for debugging
      console.log("Raw API response:", result);
      
      // Handle successful optimization
      if (optimizeRes.ok && result?.optimizedText) {
        // Clear loading toast and show success message
        toast.dismiss(loadingToastId);
        toast.success("Resume content analyzed successfully");
        
        // Mark analysis as completed for UI state
        setAnalysisCompleted(true);
        
        // Process the API response to extract all data
        const { 
          optimizedText, 
          resumeId, 
          atsScore, 
          suggestions, 
          keywords 
        } = processApiResponse(result);
        
        // Log the data being passed to parent component for debugging
        console.log("Passing data to parent:", {
          textLength: optimizedText.length,
          resumeId,
          atsScore,  // Make sure ATS score is logged
          suggestionsCount: suggestions.length,
          keywordsCount: keywords.length
        });
        
        // Pass all extracted data to parent component
        if (onAnalysisComplete) {
          onAnalysisComplete(
            optimizedText,
            resumeId,
            atsScore,  // Ensure ATS score is included
            suggestions,
            keywords
          );
        }
      } else {
        // Handle API error response
        throw new Error(result?.error || "Analysis failed");
      }
    } catch (err: any) {
      // Handle analysis errors with user feedback
      toast.dismiss(loadingToastId);
      toast.error("Content analysis error", {
        description: err.message,
      });
    } finally {
      // Always reset processing state
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // File Upload Handler
  // -------------------------------------------------------------------------
  
  /**
   * Handles the resume optimization process after file upload
   * Extracts all necessary data from API response to avoid additional server calls
   * Improved to ensure ATS score is properly extracted and passed to parent
   */
  const handleResumeOptimization = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    // Set upload in progress state for UI feedback
    setIsUploadInProgress(true);
    
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    // Update processing state for UI feedback
    setIsProcessing(true);
    setAnalysisCompleted(false);
    
    // Show loading toast for user feedback
    const loadingToastId = toast.loading("Analyzing uploaded resume...");
    
    // Prepare API request data
    const formData = new FormData();
    formData.append("fileUrl", fileUrl);
    formData.append("fileName", fileName);
    formData.append("fileType", fileType || "");
    formData.append("userId", user?.id || "");
    formData.append("resetLastSavedText", "true");

    try {
      // Call the API to optimize the resume
      const optimizeRes = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });

      // Parse the API response
      const result = await optimizeRes.json();
      
      // Log the raw API response for debugging
      console.log("Raw API response:", result);

      // Handle successful optimization
      if (optimizeRes.ok && result?.optimizedText) {
        // Update file upload state in parent component
        onFileUpload(fileUrl, fileName, fileSize, fileType);
        
        // Update local upload info for UI
        setUploadedInfo({
          name: fileName,
          size: fileSize,
          type: fileType,
        });
        
        // Clear loading toast and show success message
        toast.dismiss(loadingToastId);
        toast.success("Resume uploaded and optimized");
        
        // Mark analysis as completed for UI state
        setAnalysisCompleted(true);
        
        // Process the API response to extract all data
        const { 
          optimizedText, 
          resumeId, 
          atsScore, 
          suggestions, 
          keywords 
        } = processApiResponse(result);
        
        // Log the data being passed to parent component for debugging
        console.log("Passing data to parent:", {
          textLength: optimizedText.length,
          resumeId,
          atsScore,  // Make sure ATS score is logged
          suggestionsCount: suggestions.length,
          keywordsCount: keywords.length
        });
        
        // Pass all extracted data to parent component
        if (onAnalysisComplete) {
          onAnalysisComplete(
            optimizedText,
            resumeId,
            atsScore,  // Ensure ATS score is included
            suggestions,
            keywords
          );
        }
      } else {
        // Handle API error response
        throw new Error(result?.error || "Optimization failed");
      }
    } catch (err: any) {
      // Handle optimization errors with user feedback
      toast.dismiss(loadingToastId);
      toast.error("Upload analysis error", {
        description: err.message,
      });
    } finally {
      // Always reset processing states
      setIsProcessing(false);
      setIsUploadInProgress(false);
    }
  };

  // -------------------------------------------------------------------------
  // UI Render
  // -------------------------------------------------------------------------
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* ===== HEADER SECTION ===== */}
          <div className="space-y-2 text-center">
            <h3 className="font-medium">Upload your resume</h3>
            <p className="text-sm text-muted-foreground">
              Accepted formats: PDF, .docx, .txt
            </p>
          </div>

          {/* ===== FILE UPLOAD AREA ===== */}
          <div className={`flex flex-col items-center justify-center space-y-4 py-6 border-2 border-dashed rounded-lg ${
            isAnalysisInProgress() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
          } transition-colors`}>
            {/* File icon */}
            <div className="rounded-full bg-blue-50 p-3">
              <FileUp className="h-6 w-6 text-brand-600" />
            </div>

            {/* Drag and drop zone with visual feedback */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!isAnalysisInProgress()) {
                  setIsDragOver(true);
                }
              }}
              onDragLeave={() => {
                if (!isAnalysisInProgress()) {
                  setIsDragOver(false);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!isAnalysisInProgress()) {
                  setIsDragOver(false);
                  // Handle dropped files here if needed
                }
              }}
              className={`transition-all w-full text-center border-2 border-dashed rounded-md p-4 ${
                isAnalysisInProgress() 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'cursor-pointer'
              } ${
                isDragOver && !isAnalysisInProgress() 
                  ? "bg-blue-50 border-blue-400" 
                  : "border-gray-300"
              }`}
            >
              {isAnalysisInProgress() 
                ? "Analysis in progress..." 
                : "Drag & Drop your resume here or use the button below."
              }
            </div>

            {/* Upload button or sign-in prompt */}
            <div className="relative w-full flex justify-center items-center">
              {isSignedIn ? (
                <UploadButton
                  className={`custom-btn ut-button:bg-blue-600 ut-button:text-white ut-button:rounded-md ut-button:px-4 ut-button:py-2 ut-button:hover:hover:bg-primary/90 ${
                    shouldDisableUpload() ? 'ut-button:opacity-50 ut-button:cursor-not-allowed' : ''
                  }`}
                  endpoint="resumeUploader"
                  disabled={shouldDisableUpload()}
                  onClientUploadComplete={async (res) => {
                    // Check if file was uploaded successfully
                    if (!res?.[0]?.ufsUrl) return;

                    const fileUrl = res[0].ufsUrl;
                    const fileName = res[0].name;
                    const fileSize = res[0].size;
                    const fileType = res[0].type;

                    // Process the uploaded resume file
                    await handleResumeOptimization(fileUrl, fileName, fileSize, fileType);
                  }}
                  onUploadError={(error) => {
                    toast.error("Upload error", {
                      description: error.message,
                    });
                  }}
                />
              ) : (
                <SignInButton mode="modal">
                  <Button className="px-4">You must be signed in to upload</Button>
                </SignInButton>
              )}
            </div>

            {/* ===== FILE STATUS DISPLAY ===== */}
            {uploadedInfo && (
              <div className="mt-2 text-sm text-muted-foreground animate-fade-in-up text-center">
                {/* File info with status icon */}
                <div className="flex items-center justify-center gap-1">
                  {analysisCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="font-medium">Uploaded file:</span> {uploadedInfo.name}
                </div>
                {/* File details */}
                <div className="text-xs text-gray-500">
                  ({readableSize(uploadedInfo.size)}, {mimeLabelMap[uploadedInfo.type] || uploadedInfo.type})
                </div>
                {/* Processing status */}
                <div className="text-xs mt-1 text-brand-600">
                  {isProcessing
                    ? "Analyzing resume content..."
                    : analysisCompleted 
                    ? "Analysis complete! Preparing preview..." 
                    : "Analysis complete"}
                </div>
              </div>
            )}
          </div>

          {/* ===== TEXT INPUT AREA ===== */}
          <div className="space-y-4">
            {/* Text input header with character count */}
            <div className="flex items-center justify-between">
              <p className="font-medium">Or paste your resume content:</p>
              {resumeContent && (
                <span className="text-xs text-muted-foreground">
                  {resumeContent.length} characters
                </span>
              )}
            </div>
            
            {/* Text input field */}
            <Textarea
              placeholder="Paste your resume content here..."
              className="min-h-[200px]"
              value={resumeContent}
              onChange={onContentChange}
              disabled={isAnalysisInProgress()}
            />
            
            {/* Analyze text button (only show for pasted content) */}
            {resumeContent && resumeContent.length >= 50 && !uploadedInfo && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTextAnalysis}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Analyzing...
                  </div>
                ) : (
                  "Analyze & Preview"
                )}
              </Button>
            )}
            
            {/* ===== TEXT ANALYSIS STATUS ===== */}
            {/* Processing status */}
            {isProcessing && resumeContent && !uploadedInfo && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Analyzing text content...
              </div>
            )}
            {/* Completion status */}
            {analysisCompleted && resumeContent && !uploadedInfo && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Analysis complete! Preparing preview...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadSection;