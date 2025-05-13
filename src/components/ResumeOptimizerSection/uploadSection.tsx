/**
 * UploadSection Component
 * 
 * Provides an interface for users to upload or paste their resume content.
 * Features:
 * - File upload via drag & drop or UploadThing
 * - Text input for pasting resume content
 * - Direct data transfer to parent component without database reload
 * - Validation using existing Zod schemas for all upload methods
 * - Improved error handling for different file formats
 * - Loading state visualization during analysis
 * - Auto-switching to preview tab after analysis
 * - Replace upload button with loading animation during upload
 */

'use client';

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle, AlertCircle, Upload, FileText, Loader2 } from "lucide-react";
import { UploadButton, useUploadThing } from "@/utils/uploadthing";
import { toast } from "sonner";
import { useUser, SignInButton } from "@clerk/nextjs";
import { z } from "zod";
import { optimizeRequestSchema } from "@/validation/resumeSchema"; // Import of existing schema
import LoadingAnalyzeState from "@/components/ResumeOptimizerSection/loadingAnalyzeState";
import LoadingState from "@/components/ResumeOptimizerSection/loadingState";

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
  checkingForExistingResumes?: boolean; // Whether checking for existing resumes
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
 * List of allowed file MIME types
 */
const ALLOWED_FILE_TYPES = Object.keys(mimeLabelMap);

/**
 * File validation schema, adapted for the specific needs of file uploads
 */
const fileValidationSchema = z.object({
  type: z.enum(ALLOWED_FILE_TYPES as [string, ...string[]], {
    message: "Unsupported file format. Please use PDF, DOCX or TXT."
  }),
  size: z.number()
    .max(4 * 1024 * 1024, "File size must be less than 4MB")
    .min(1, "File cannot be empty"),
  name: z.string().min(1, "File name is required")
});

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
  checkingForExistingResumes = false,
}) => {
  // Local state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const [showAnalyzeState, setShowAnalyzeState] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState<{ name: string; size: number; type: string } | null>(null);
  const [isActiveUpload, setIsActiveUpload] = useState(false);
  
  // Initialize UploadThing hook for drag and drop file uploads
  const { startUpload, isUploading: isUploadingFile } = useUploadThing("resumeUploader");
  
  // File input reference
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user authentication status
  const { isSignedIn, user } = useUser();

  /**
   * Effect for tab navigation after analysis completes
   * This ensures we switch to the preview tab after analysis is done
   */
  useEffect(() => {
    if (analysisCompleted && setActiveTab) {
      // Use a small timeout to ensure all data is processed before tab switch
      const timerId = setTimeout(() => {
        setActiveTab("optimize");
        setShowAnalyzeState(false);
      }, 500);
      
      return () => clearTimeout(timerId);
    }
  }, [analysisCompleted, setActiveTab]);

  /**
   * Convert bytes to readable format
   */
  const readableSize = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";

  /**
   * Check if analysis is currently in progress
   */
  const isAnalysisInProgress = () => {
    return isParsing || isProcessing || isUploading || isUploadingFile;
  };

  /**
   * Determine if upload buttons should be disabled
   */
  const shouldDisableUpload = () => {
    return isUploading || isParsing || isProcessing || isUploadingFile || !!uploadedInfo;
  };

  /**
   * Validate file with Zod schema
   */
  const validateFile = (file: File): { success: boolean; message?: string } => {
    try {
      fileValidationSchema.parse(file);
      return { success: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors[0]?.message || "Invalid file";
        return { success: false, message };
      }
      return { success: false, message: "File validation failed" };
    }
  };

  /**
   * Validate resume content using a simpler approach
   */
  const validateResumeContent = (content: string): { success: boolean; message?: string } => {
    try {
      // Basic validation - just check minimum length
      if (!content || content.length < 50) {
        return {
          success: false,
          message: `Please enter at least 50 characters. Current: ${content?.length || 0} characters.`
        };
      }

      // If we get here, validation passes
      return { success: true };
    } catch (error) {
      console.error("Content validation error:", error);
      return { 
        success: false, 
        message: "Content validation failed. Please check your input." 
      };
    }
  };

  /**
   * Get file-specific help tips when errors occur
   */
  const getFileTypeErrorHelp = (fileType: string, errorMessage: string): string => {
    // Check if error message contains specific keywords that might indicate known issues
    const errorLower = errorMessage.toLowerCase();
    
    // If it's a DOCX file and there's an error
    if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      if (errorLower.includes("parse") || errorLower.includes("format") || errorLower.includes("500")) {
        return "DOCX file processing failed. Try saving your document as PDF or copy-paste its content into the text area below.";
      }
    }
    
    // If it's a PDF file and there's an error
    if (fileType === "application/pdf") {
      if (errorLower.includes("extract") || errorLower.includes("content") || errorLower.includes("500")) {
        return "PDF content extraction failed. Make sure your PDF is not protected and that text can be selected. You can also try to copy-paste the content directly.";
      }
    }
    
    return "Please try another file or copy-paste your resume content into the text area below.";
  };

  /**
   * Starts the analysis process and shows the loading state
   */
  const startAnalysis = () => {
    // Notify parent that analysis is starting
    if (onAnalysisStart) {
      onAnalysisStart();
    }
    
    // Show loading analysis state
    setShowAnalyzeState(true);
  };

  /**
   * Handles the resume optimization process after file upload
   */
  const handleResumeOptimization = async (fileUrl: string, fileName: string, fileSize: number, fileType: string) => {
    // Set processing state for UI feedback
    setIsProcessing(true);
    setAnalysisCompleted(false);
    
    // Start analysis and show loading state
    startAnalysis();
    
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

      // Log detailed error info for debugging
      if (!optimizeRes.ok) {
        console.error("API Error Status:", optimizeRes.status);
        console.error("API Error Status Text:", optimizeRes.statusText);
        
        // For 500 errors, provide more detailed feedback based on file type
        if (optimizeRes.status === 500) {
          const specificHelp = getFileTypeErrorHelp(fileType, "500 Internal Server Error");
          throw new Error(`The server encountered an error processing your file. ${specificHelp}`);
        }
      }

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
        
        // Tab navigation is now handled by the useEffect
      } else {
        // Handle specific error messages from the API
        const errorMsg = result?.error || "Optimization failed";
        const specificHelp = getFileTypeErrorHelp(fileType, errorMsg);
        throw new Error(`${errorMsg}. ${specificHelp}`);
      }
    } catch (err: any) {
      // Handle optimization errors with user feedback
      toast.dismiss(loadingToastId);
      
      // Enhanced error message with file-specific help
      const errorMessage = err.message || "An error occurred during processing";
      const specificHelp = getFileTypeErrorHelp(fileType, errorMessage);
      
      toast.error("Upload analysis error", {
        description: errorMessage.includes(specificHelp) ? errorMessage : `${errorMessage}. ${specificHelp}`,
        duration: 6000, // Show error longer to give user time to read
      });
      
      // Hide loading analyze state on error
      setShowAnalyzeState(false);
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
    
    // Validate content with simple validation
    const validation = validateResumeContent(resumeContent);
    if (!validation.success) {
      toast.error("Invalid content", {
        description: validation.message
      });
      return;
    }
    
    // Start analysis and show loading state
    startAnalysis();
    
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
      
      // Detailed error logging
      if (!optimizeRes.ok) {
        console.error("API Error Status:", optimizeRes.status);
        console.error("API Error Status Text:", optimizeRes.statusText);
      }
      
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
        
        // Tab navigation is now handled by the useEffect
      } else {
        // Handle API error response
        throw new Error(result?.error || "Analysis failed");
      }
    } catch (err: any) {
      // Handle analysis errors with user feedback
      toast.dismiss(loadingToastId);
      toast.error("Content analysis error", {
        description: err.message,
        duration: 6000, // Show error longer to give user time to read
      });
      
      // Hide loading analyze state on error
      setShowAnalyzeState(false);
    } finally {
      // Always reset processing state
      setIsProcessing(false);
    }
  };

  /**
   * Handle file dropped via drag and drop
   */
  const handleFileDrop = async (file: File) => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.success) {
      toast.error("Invalid file", {
        description: validation.message
      });
      return;
    }
    
    // Update parent component with selected file
    if (onFileChange) {
      onFileChange(file);
    }
    
    // Show loading toast
    const loadingToastId = toast.loading("Uploading dropped file...");
    
    try {
      // Use UploadThing to upload the file
      const uploadResult = await startUpload([file]);
      
      // Check if upload was successful
      if (!uploadResult?.[0]) {
        throw new Error("File upload failed");
      }
      
      // Clear loading toast
      toast.dismiss(loadingToastId);
      
      // Get the file URL from the upload result
      const fileUrl = uploadResult[0].ufsUrl;
      
      // Process the uploaded resume with optimization
      await handleResumeOptimization(
        fileUrl, 
        file.name, 
        file.size, 
        file.type
      );
    } catch (err: any) {
      // Handle upload errors
      toast.dismiss(loadingToastId);
      toast.error("File upload error", {
        description: err.message || "Failed to upload file",
        duration: 6000, // Show error longer to give user time to read
      });
    }
  };

  /**
   * Handle file uploaded via button
   */
  const handleButtonUpload = async (uploadResults: any) => {
    // Check if file was uploaded successfully
    if (!uploadResults?.[0]) return;

    try {
      const fileUrl = uploadResults[0].ufsUrl;
      const fileName = uploadResults[0].name;
      const fileSize = uploadResults[0].size;
      const fileType = uploadResults[0].type;

      // Log file details for debugging
      console.log("Processing uploaded file:", { 
        fileName, 
        fileType, 
        fileSize: readableSize(fileSize)
      });

      // Process the uploaded resume file
      await handleResumeOptimization(fileUrl, fileName, fileSize, fileType);
    } catch (err: any) {
      toast.error("Upload processing error", {
        description: err.message || "Failed to process uploaded file",
        duration: 6000, // Show error longer to give user time to read
      });
    }
  };

  // If checking for existing resumes, show the LoadingState component
  if (checkingForExistingResumes) {
    return <LoadingState />;
  }

  // If showing analyze state, render the LoadingAnalyzeState component
  if (showAnalyzeState) {
    return <LoadingAnalyzeState />;
  }
  
  // Otherwise render the upload interface
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
                if (!isAnalysisInProgress() && !shouldDisableUpload()) {
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
                setIsDragOver(false);
                
                // Return early if processing or upload is disabled
                if (isAnalysisInProgress() || shouldDisableUpload()) {
                  return;
                }
                
                // Check if files were dropped
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  handleFileDrop(file);
                }
              }}
            >
              {/* File icon - changes to loader when uploading */}
              <div className="rounded-full bg-blue-50 p-3">
                {isUploadingFile || isUploading || isProcessing ? (
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                ) : (
                  <FileUp className="h-6 w-6 text-blue-600" />
                )}
              </div>
              
              <p className="text-center">
                {isAnalysisInProgress() 
                  ? "Uploading and analyzing your resume..." 
                  : "Drag & Drop your resume here or use the button below."}
              </p>

              {/* Upload button or uploading animation or sign-in prompt */}
              <div className="relative w-full flex justify-center items-center">
                {isSignedIn ? (
                  isActiveUpload || isProcessing || isUploading || isUploadingFile ? (
                    // Loading animation during upload - completely replaces the button
                    <div className="flex flex-col items-center py-2 px-4 min-h-[40px] min-w-[120px]">
                      <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                      <p className="text-sm text-blue-600 mt-2">
                        {isProcessing ? "Processing..." : "Uploading..."}
                      </p>
                    </div>
                  ) : (
                    // Normal UploadButton when not uploading
                    <UploadButton
                      className={`custom-btn ut-button:bg-blue-600 ut-button:text-white ut-button:rounded-md ut-button:px-4 ut-button:py-2 ut-button:hover:hover:bg-blue-700 ${
                        shouldDisableUpload() ? 'ut-button:opacity-50 ut-button:cursor-not-allowed' : ''
                      }`}
                      endpoint="resumeUploader"
                      disabled={shouldDisableUpload()}
                      // Intercepter le début du téléchargement (si disponible dans votre version d'UploadThing)
                      onBeforeUploadBegin={(files) => {
                        console.log("Upload about to begin with files:", files);
                        setIsActiveUpload(true);
                        return files;
                      }}
                      // Intercepter la fin du téléchargement
                      onClientUploadComplete={(results) => {
                        console.log("Upload completed with results:", results);
                        // Garder l'état actif pendant que nous traitons le fichier
                        handleButtonUpload(results);
                        // Ne pas réinitialiser setIsActiveUpload ici - le laisser actif pendant le traitement
                      }}
                      onUploadError={(error) => {
                        console.error("Upload error:", error);
                        toast.error("Upload error", {
                          description: error.message,
                          duration: 6000,
                        });
                        // Réinitialiser l'état actif en cas d'erreur
                        setIsActiveUpload(false);
                      }}
                    />
                  )
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