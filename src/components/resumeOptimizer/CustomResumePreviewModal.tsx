/**
 * Custom Resume Preview Modal Component
 * 
 * A completely custom modal implementation to avoid issues with the built-in Dialog component
 * Shows a preview of the resume with the selected template applied
 */
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileText, File, X } from "lucide-react";
import { createPreviewUrl, createCompleteHtml } from '@/utils/templateUtils';
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';

interface CustomResumePreviewModalProps {
  open: boolean;
  onClose: () => void;
  resumeContent: string;
  selectedTemplate: ResumeTemplateType;
}

/**
 * CustomResumePreviewModal component
 * Uses a completely custom modal implementation without relying on Dialog
 */
const CustomResumePreviewModal: React.FC<CustomResumePreviewModalProps> = ({
  open,
  onClose,
  resumeContent,
  selectedTemplate,
}) => {
  // State for storing the preview URL
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // State to track PDF generation
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Effect to prevent scrolling of the background when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  
  // Generate preview URL when content or template changes
  useEffect(() => {
    if (open && resumeContent && selectedTemplate) {
      try {
        const url = createPreviewUrl(selectedTemplate, resumeContent);
        setPreviewUrl(url);
        
        // Clean up URL when component unmounts
        return () => {
          if (url) URL.revokeObjectURL(url);
        };
      } catch (error) {
        console.error('Error creating preview URL:', error);
      }
    }
  }, [open, resumeContent, selectedTemplate]);
  
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (open) {
      window.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  /**
   * Download the resume as HTML
   */
  const handleDownloadHtml = () => {
    try {
      const html = createCompleteHtml(
        selectedTemplate,
        resumeContent,
        'My Resume'
      );
      
      // Create and download the HTML file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading HTML:', error);
      // Show error notification here
    }
  };
  
  /**
   * Download the resume as PDF
   */
  const handleDownloadPdf = () => {
    // Set loading state
    setIsGeneratingPdf(true);
    
    // Mock PDF generation with a timeout
    setTimeout(() => {
      try {
        // Get the HTML content
        const html = createCompleteHtml(
          selectedTemplate,
          resumeContent,
          'My Resume'
        );
        
        // Create a mock PDF download
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Reset loading state
        setIsGeneratingPdf(false);
      } catch (error) {
        console.error('Error generating PDF:', error);
        setIsGeneratingPdf(false);
      }
    }, 1000);
  };
  
  // If modal is not open, don't render anything
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      {/* Modal container */}
      <div className="relative w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[1400px] max-h-[95vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-semibold">Resume Preview</h2>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadHtml}
              className="flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              <span>HTML</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1"
            >
              <File className="h-4 w-4" />
              <span>{isGeneratingPdf ? 'Generating...' : 'PDF'}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
        
        {/* Preview content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {previewUrl ? (
            <div className="w-full h-full flex justify-center">
              <iframe
                src={previewUrl}
                className="w-full max-w-[800px] lg:max-w-[900px] h-[95vh] border rounded shadow-lg bg-white"
                title="Resume Preview"
                style={{ 
                  minHeight: '800px'
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 bg-gray-200 rounded-full mb-4"></div>
                <p className="text-gray-500">Loading preview...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomResumePreviewModal;