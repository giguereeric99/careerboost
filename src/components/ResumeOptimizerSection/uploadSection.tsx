/**
 * UploadSection Component
 * 
 * Provides an interface for users to upload or paste their resume content.
 * Features:
 * - File upload via drag & drop or UploadThing
 * - Text input for pasting resume content
 * - Direct data transfer to parent component without database reload
 */

'use client';

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle, AlertCircle, Upload, FileText } from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";
import { toast } from "sonner";
import { useUser, SignInButton } from "@clerk/nextjs";

/**
 * Props interface for the UploadSection component
 */
interface UploadSectionProps {
  isUploading: boolean;              // Whether a file is currently being uploaded
  isParsing: boolean;                // Whether resume content is being parsed
  selectedFile: File | null;         // Currently selected file object
  resumeContent: string;             // Content from pasted resume
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
  ) => void;  // Called when analysis completes
}

/**
 * Mapping of MIME types to human-readable file formats
 */
const mimeLabelMap: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
};

/**
 * UploadSection Component
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
  // Local state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user authentication status
  const { isSignedIn, user } = useUser();

  /**
   * Convert bytes to readable format
   */
  const readableSize = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";

  /**
   * Check if analysis is currently in progress
   */
  const isAnalysisInProgress = () => {
    return isParsing || isProcessing || isUploading;
  };

  /**
   * Determine if upload buttons should be disabled
   */
  const shouldDisableUpload = () => {
    return isUploading || isParsing || isProcessing || !!uploadedInfo;
  };

  /**
   * Handles the resume optimization process after file upload
   */
  const handleResumeOptimization = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    // Set processing state for UI feedback
    setIsProcessing(true);
    setAnalysisCompleted(false);
    
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
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
        
        // Extract all necessary data from result
        const optimizedText = result.optimizedText || '';
        const resumeId = result.resumeId || '';
        const atsScore = result.atsScore || 65;
        const suggestions = result.suggestions || [];
        const keywords = result.keywords || result.keywordSuggestions?.map((text: string) => ({ 
          text, 
          applied: false 
        })) || [];
        
        // Pass all extracted data to parent component
        if (onAnalysisComplete) {
          onAnalysisComplete(
            optimizedText,
            resumeId,
            atsScore,
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
    }
  };

  /**
   * Handle text analysis from textarea
   */
  const handleTextAnalysis = async () => {
    // Validate minimum content length
    if (!resumeContent || resumeContent.length < 50 || isProcessing) {
      if (resumeContent.length < 50) {
        toast.error("Please enter at least 50 characters");
      }
      return;
    }
    
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
      
      // Handle successful optimization
      if (optimizeRes.ok && result?.optimizedText) {
        // Clear loading toast and show success message
        toast.dismiss(loadingToastId);
        toast.success("Resume content analyzed successfully");
        
        // Mark analysis as completed for UI state
        setAnalysisCompleted(true);
        
        // Extract all necessary data from result
        const optimizedText = result.optimizedText || '';
        const resumeId = result.resumeId || '';
        const atsScore = result.atsScore || 65;
        const suggestions = result.suggestions || [];
        const keywords = result.keywords || result.keywordSuggestions?.map((text: string) => ({ 
          text, 
          applied: false 
        })) || [];
        
        // Pass all extracted data to parent component
        if (onAnalysisComplete) {
          onAnalysisComplete(
            optimizedText,
            resumeId,
            atsScore,
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

          {/* ===== FILE UPLOAD SECTION ===== */}
          <div className="space-y-4">
            {/* Full width drag and drop zone with visual feedback */}
            <div
              className={`flex flex-col items-center justify-center h-64 space-y-4 py-6 border-2 border-dashed rounded-lg ${
                isDragOver ? "bg-blue-50 border-blue-400" : "border-gray-300"
              } ${
                isAnalysisInProgress() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
              } transition-colors`}
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
            >
              {/* File icon */}
              <div className="rounded-full bg-blue-50 p-3">
                <FileUp className="h-6 w-6 text-blue-600" />
              </div>
              
              <p className="text-center">
                {isAnalysisInProgress() 
                  ? "Analysis in progress..." 
                  : "Drag & Drop your resume here or use the button below."}
              </p>

              {/* Upload button or sign-in prompt */}
              <div className="relative w-full flex justify-center items-center">
                {isSignedIn ? (
                  <UploadButton
                    className={`custom-btn ut-button:bg-blue-600 ut-button:text-white ut-button:rounded-md ut-button:px-4 ut-button:py-2 ut-button:hover:hover:bg-blue-700 ${
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
                <div className="text-xs mt-1 text-blue-600">
                  {isProcessing
                    ? "Analyzing resume content..."
                    : analysisCompleted 
                    ? "Analysis complete! Preparing preview..." 
                    : "Analysis complete"}
                </div>
              </div>
            )}

            {/* ===== TEXT INPUT SECTION ===== */}
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
              
              {/* Text requirement hint */}
              {resumeContent.length > 0 && resumeContent.length < 50 && (
                <div className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Please enter at least 50 characters (currently {resumeContent.length})
                </div>
              )}
              
              {/* Processing status */}
              {isProcessing && (
                <div className="text-xs text-blue-600 flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Analyzing text content...
                </div>
              )}
              
              {/* Completion status */}
              {analysisCompleted && !isProcessing && (
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Analysis complete! Preparing preview...
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadSection;