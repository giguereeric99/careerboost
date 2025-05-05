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
 */
interface UploadSectionProps {
  isUploading: boolean;              // Whether a file is currently being uploaded
  isParsing: boolean;                // Whether resume content is being parsed
  selectedFile: File | null;         // Currently selected file object
  resumeContent: string;             // Content from pasted resume or extracted from file
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;  // Handler for file input change
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;  // Handler for textarea change
  onContinue: () => void;            // Handler for continue button click (kept for compatibility but won't be used)
  onFileUpload: (url: string, name: string, size?: number, type?: string) => void;  // Handler for successful file upload
  setActiveTab?: (tab: string) => void; // Optional prop to control tab navigation
  onAnalysisStart?: () => void;      // Called when analysis starts (upload or text analysis)
  onAnalysisComplete?: () => void;   // Called when analysis completes
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
 * Features:
 * - File upload via drag & drop or button click
 * - Text input for pasting resume content
 * - Automatic transition to preview after successful optimization
 * - Visual feedback during processing
 * - Integration with parent component for state management
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
   * 
   * @param bytes - Size in bytes
   * @returns Formatted string with KB unit
   */
  const readableSize = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";

  /**
   * Check if analysis is currently in progress
   * Used to determine if UI should be disabled
   * 
   * @returns Boolean indicating if analysis is active
   */
  const isAnalysisInProgress = () => {
    return isParsing || isProcessing || isUploadInProgress;
  };

  /**
   * Determine if upload buttons should be disabled
   * Disable when already uploading, processing, or file already uploaded
   * 
   * @returns Boolean indicating if upload should be disabled
   */
  const shouldDisableUpload = () => {
    return isUploading || isParsing || isProcessing || !!uploadedInfo || isUploadInProgress;
  };

  // -------------------------------------------------------------------------
  // Text Processing Handler
  // -------------------------------------------------------------------------
  
  /**
   * Handles direct text input analysis
   * Processes pasted resume content and automatically transitions to preview
   */
  const handleTextAnalysis = async () => {
    // Skip if no content or already processing
    if (!resumeContent || resumeContent.length < 50 || isProcessing) return;
    
    // ===== START ANALYSIS =====
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    // Update processing state
    setIsProcessing(true);
    const loadingToastId = toast.loading("Analyzing resume content...");
    
    try {
      // ===== API CALL =====
      // Create form data for API request
      const formData = new FormData();
      formData.append("rawText", resumeContent);
      if (user?.id) formData.append("userId", user.id);
      
      // Call optimization API
      const optimizeRes = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });
      
      // Parse response
      const result = await optimizeRes.json();
      
      // ===== HANDLE RESPONSE =====
      if (optimizeRes.ok && result?.optimizedText) {
        toast.dismiss(loadingToastId);
        toast.success("Resume content analyzed successfully");
        
        // ===== CRITICAL TIMING SECTION =====
        // Wait for database to save the data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mark analysis as complete
        setAnalysisCompleted(true);
        
        // Notify parent that analysis is complete
        // This will trigger the preview tab switch
        if (onAnalysisComplete) {
          onAnalysisComplete();
        }
      } else {
        // ===== ERROR HANDLING =====
        throw new Error(result?.error || "Analysis failed");
      }
    } catch (err: any) {
      toast.dismiss(loadingToastId);
      toast.error("Content analysis error", {
        description: err.message,
      });
    } finally {
      // ===== CLEANUP =====
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------------------
  // File Upload Handler
  // -------------------------------------------------------------------------
  
  /**
   * Handles the resume optimization process after file upload
   * Manages the entire workflow from upload to automatic preview transition
   * 
   * @param fileUrl - URL of the uploaded file
   * @param fileName - Name of the uploaded file
   * @param fileSize - Size of the uploaded file
   * @param fileType - MIME type of the uploaded file
   */
  const handleResumeOptimization = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    // ===== START UPLOAD PROCESS =====
    // Track upload progress for UI state
    setIsUploadInProgress(true);
    
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    // Set processing state to display loading indicators
    setIsProcessing(true);
    setAnalysisCompleted(false);
    
    // Show loading toast with unique ID for later dismissal
    const loadingToastId = toast.loading("Analyzing uploaded resume...");
    
    // ===== PREPARE API REQUEST =====
    // Create form data for API request
    const formData = new FormData();
    formData.append("fileUrl", fileUrl);
    formData.append("fileName", fileName);
    formData.append("fileType", fileType || "");
    formData.append("userId", user?.id || "");

    try {
      // ===== API CALL =====
      // Send request to optimization API
      const optimizeRes = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });

      // Parse the JSON response
      const result = await optimizeRes.json();

      // ===== HANDLE RESPONSE =====
      if (optimizeRes.ok && result?.optimizedText) {
        // Update parent component with upload information
        onFileUpload(fileUrl, fileName, fileSize, fileType);
        
        // Save uploaded file information for UI display
        setUploadedInfo({
          name: fileName,
          size: fileSize,
          type: fileType,
        });
        
        // Dismiss loading toast and show success message
        toast.dismiss(loadingToastId);
        toast.success("Resume uploaded and optimized");
        
        // ===== CRITICAL TIMING SECTION =====
        // Wait for database to save the data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mark analysis as complete
        setAnalysisCompleted(true);
        
        // Notify parent that analysis is complete
        // This will trigger the preview tab switch
        if (onAnalysisComplete) {
          onAnalysisComplete();
        }
      } else {
        // ===== ERROR HANDLING =====
        throw new Error(result?.error || "Optimization failed");
      }
    } catch (err: any) {
      // Display error message to user
      toast.dismiss(loadingToastId);
      toast.error("Upload analysis error", {
        description: err.message,
      });
    } finally {
      // ===== CLEANUP =====
      // Reset processing state regardless of outcome
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