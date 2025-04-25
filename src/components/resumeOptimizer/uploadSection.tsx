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
 * Defines the expected props for controlling the upload and analysis process
 */
interface UploadSectionProps {
  isUploading: boolean;              // Whether a file is currently being uploaded
  isParsing: boolean;                // Whether resume content is being parsed
  selectedFile: File | null;         // Currently selected file object
  resumeContent: string;             // Content from pasted resume or extracted from file
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;  // Handler for file input change
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;  // Handler for textarea change
  onContinue: () => void;            // Handler for continue button click
  onFileUpload: (url: string, name: string, size?: number, type?: string) => void;  // Handler for successful file upload
  setActiveTab?: (tab: string) => void; // Optional prop to control tab navigation
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
 * Provides an interface for users to upload or paste their resume content
 * Handles file uploads, resume optimization API calls, and user feedback
 * Manages the state of the upload and analysis process
 * Navigates to preview tab when analysis is complete and user clicks Continue
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
}) => {
  // Ref for accessing the file input element
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for tracking UI interactions and process status
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  
  // Get user authentication status from Clerk
  const { isSignedIn, user } = useUser();

  /**
   * Helper function to convert bytes to KB with 1 decimal place
   * Makes file sizes more readable for users
   * 
   * @param bytes - Size in bytes
   * @returns Formatted string with KB unit
   */
  const readableSize = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";

  /**
   * Reset analysis state when resumeContent changes
   * This ensures the continue button is disabled until a new analysis is completed
   */
  useEffect(() => {
    if (resumeContent) {
      setAnalysisCompleted(false);
    }
  }, [resumeContent]);

  /**
   * Handles direct text input analysis
   * Processes pasted resume content without file upload
   */
  const handleTextAnalysis = async () => {
    // Skip if no content or already processing
    if (!resumeContent || resumeContent.length < 50 || isProcessing) return;
    
    // Update processing state
    setIsProcessing(true);
    const loadingToastId = toast.loading("Analyzing resume content...");
    
    try {
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
      
      // Handle successful optimization
      if (optimizeRes.ok && result?.optimizedText) {
        toast.dismiss(loadingToastId);
        toast.success("Resume content analyzed successfully");
        setAnalysisCompleted(true);
      } else {
        throw new Error(result?.error || "Analysis failed");
      }
    } catch (err: any) {
      toast.dismiss(loadingToastId);
      toast.error("Content analysis error", {
        description: err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handles the resume optimization process after file upload
   * Manages the entire workflow from upload to analysis completion
   * 
   * @param fileUrl - URL of the uploaded file
   * @param fileName - Name of the uploaded file
   * @param fileSize - Size of the uploaded file
   * @param fileType - MIME type of the uploaded file
   */
  const handleResumeOptimization = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    // Set processing state to display loading indicators
    setIsProcessing(true);
    setAnalysisCompleted(false);
    
    // Show loading toast with unique ID for later dismissal
    const loadingToastId = toast.loading("Analyzing uploaded resume...");
    
    // Create form data for API request
    const formData = new FormData();
    formData.append("fileUrl", fileUrl);
    formData.append("fileType", fileType || "");
    formData.append("userId", user?.id || "");

    try {
      // Send request to optimization API
      const optimizeRes = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });

      // Parse the JSON response
      const result = await optimizeRes.json();

      // Check if optimization was successful
      if (optimizeRes.ok && result?.optimizedText) {
        // Update parent component with upload information
        onFileUpload(fileUrl, fileName, fileSize, fileType);
        
        // Save uploaded file information
        setUploadedInfo({
          name: fileName,
          size: fileSize,
          type: fileType,
        });
        
        // Mark analysis as completed to enable the continue button
        setAnalysisCompleted(true);
        
        // Dismiss loading toast and show success message
        toast.dismiss(loadingToastId);
        toast.success("Resume uploaded and optimized");
      } else {
        // Handle API errors
        throw new Error(result?.error || "Optimization failed");
      }
    } catch (err: any) {
      // Display error message to user
      toast.dismiss(loadingToastId);
      toast.error("Upload analysis error", {
        description: err.message,
      });
    } finally {
      // Reset processing state regardless of outcome
      setIsProcessing(false);
    }
  };

  /**
   * Checks if the continue button should be enabled
   * Button is enabled when either:
   * 1. A file has been uploaded and analysis is complete
   * 2. Text resume has been entered and analysis is complete
   * 
   * @returns Boolean indicating if continue button should be enabled
   */
  const isContinueEnabled = () => {
    // Disable if currently uploading, parsing or processing
    if (isUploading || isParsing || isProcessing) return false;
    
    // If file uploaded, enable only if analysis is complete
    if (uploadedInfo) return analysisCompleted;
    
    // If using text input, need minimum content and completed analysis
    return resumeContent.length >= 50 && analysisCompleted;
  };

  /**
   * Handle continue button click
   * Calls the parent onContinue function and navigates to preview tab if provided
   */
  const handleContinueClick = () => {
    // Execute the provided onContinue callback
    onContinue();
    
    // Navigate to preview tab if setActiveTab is provided
    if (setActiveTab) {
      setActiveTab("preview");
    }
    
    toast.success("Resume analysis completed");
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Header section with title and supported formats */}
          <div className="space-y-2 text-center">
            <h3 className="font-medium">Upload your resume</h3>
            <p className="text-sm text-muted-foreground">
              Accepted formats: PDF, .docx, .txt
            </p>
          </div>

          {/* File upload area with drag & drop support */}
          <div className="flex flex-col items-center justify-center space-y-4 py-6 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
            <div className="rounded-full bg-blue-50 p-3">
              <FileUp className="h-6 w-6 text-brand-600" />
            </div>

            {/* Drag and drop zone with visual feedback */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                // Handle dropped files here if needed
              }}
              className={`transition-all w-full text-center border-2 border-dashed rounded-md p-4 cursor-pointer ${isDragOver ? "bg-blue-50 border-blue-400" : "border-gray-300"}`}
            >
              Drag & Drop your resume here or use the button below.
            </div>

            {/* Upload button or sign-in prompt */}
            <div className="relative w-full flex justify-center items-center">
              {isSignedIn ? (
                <UploadButton
                  className="custom-btn ut-button:bg-blue-600 ut-button:text-white ut-button:rounded-md ut-button:px-4 ut-button:py-2 ut-button:hover:hover:bg-primary/90"
                  endpoint="resumeUploader"
                  onClientUploadComplete={async (res) => {
                    // Check if file was uploaded successfully
                    if (!res?.[0]?.url) return;

                    const fileUrl = res[0].url;
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

            {/* Display uploaded file information with animation */}
            {uploadedInfo && (
              <div className="mt-2 text-sm text-muted-foreground animate-fade-in-up text-center">
                <div className="flex items-center justify-center gap-1">
                  {analysisCompleted ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="font-medium">Uploaded file:</span> {uploadedInfo.name}
                </div>
                <div className="text-xs text-gray-500">
                  ({readableSize(uploadedInfo.size)}, {mimeLabelMap[uploadedInfo.type] || uploadedInfo.type})
                </div>
                <div className="text-xs mt-1 text-brand-600">
                  {analysisCompleted 
                    ? "Analysis complete! Click Continue to view optimization results." 
                    : "Analyzing resume content..."}
                </div>
              </div>
            )}
          </div>

          {/* Text input area for pasted content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">Or paste your resume content:</p>
              {resumeContent && (
                <span className="text-xs text-muted-foreground">
                  {resumeContent.length} characters
                </span>
              )}
            </div>
            <Textarea
              placeholder="Paste your resume content here..."
              className="min-h-[200px]"
              value={resumeContent}
              onChange={(e) => {
                onContentChange(e);
                // Reset analysis state when content changes
                setAnalysisCompleted(false);
              }}
            />
            {/* Analyze text button - only show for pasted content */}
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
                  <>Analyze Text</>
                )}
              </Button>
            )}
            {/* Analysis status for text input */}
            {analysisCompleted && resumeContent && !uploadedInfo && (
              <div className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Analysis complete! Click Continue to view optimization results.
              </div>
            )}
          </div>

          {/* Continue button - enabled based on analysis completion */}
          <div className="flex justify-end">
            <Button
              onClick={handleContinueClick}
              disabled={!isContinueEnabled()}
              className={analysisCompleted ? "bg-brand-600 hover:bg-brand-700" : ""}
            >
              {isParsing || isProcessing ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Analyzing...
                </div>
              ) : (
                analysisCompleted ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Continue to Preview
                  </div>
                ) : (
                  "Continue"
                )
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadSection;