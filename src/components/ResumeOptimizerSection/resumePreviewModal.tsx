/**
 * Resume Preview Modal Component
 * 
 * Displays a lightbox-style preview of the resume with selected template applied
 * Allows user to view and download the resume in various formats
 * Responsive design for all screen sizes
 */
import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, File, X } from "lucide-react";
import { createPreviewUrl, createCompleteHtml } from '@/utils/templateUtils';
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';

interface ResumePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeContent: string;
  selectedTemplate: ResumeTemplateType;
}

/**
 * ResumePreviewModal component
 * Shows a preview of the resume with selected template applied
 */
const ResumePreviewModal: React.FC<ResumePreviewModalProps> = ({
  open,
  onOpenChange,
  resumeContent,
  selectedTemplate,
}) => {
  // State for storing the preview URL
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // State to track PDF generation
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
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
   * This would integrate with a PDF library like html2pdf.js
   */
  const handleDownloadPdf = () => {
    // Set loading state
    setIsGeneratingPdf(true);
    
    // Placeholder for PDF generation
    // In a real implementation, you would use a library like html2pdf.js
    
    // Mock PDF generation with a timeout
    setTimeout(() => {
      try {
        // Get the HTML content (this would be passed to the PDF generation library)
        const html = createCompleteHtml(
          selectedTemplate,
          resumeContent,
          'My Resume'
        );
        
        // Create a mock PDF download
        // In a real implementation, you would generate a PDF and download it
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
        // Show error notification here
      }
    }, 1000);
  };
  
  // Handle close from the X button
  const handleClose = () => {
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Increased max-width to make the preview much wider on desktop */}
      <DialogContent className="max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1400px] max-h-[95vh] p-0 gap-0 flex flex-col rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-4">
          {/* DialogTitle component for accessibility */}
          <DialogTitle className="text-lg font-semibold">Resume Preview</DialogTitle>
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
            {/* Only one close button */}
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Preview iframe with improved size and responsiveness */}
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
      </DialogContent>
    </Dialog>
  );
};

export default ResumePreviewModal;