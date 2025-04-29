/**
 * ResumePreview Component
 * 
 * This component displays a preview of the optimized resume using TipTap WYSIWYG editor.
 * It allows users to view and edit their resume content with rich formatting,
 * and provides a way to preview the resume with different templates.
 * 
 * Updated to support the new template system with enhanced preview capabilities.
 */

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Save } from "lucide-react";
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';
import { Suggestion } from '@/types/resume';
import TipTapResumeEditor from './TipTapResumeEditor';
import TemplatePreviewButton from './TemplatePreviewButton';
import { createCompleteHtml } from '@/utils/templateUtils';
import { getTemplateById } from '@/constants/resumeTemplates';

/**
 * Interface for ResumePreview component props
 */
interface ResumePreviewProps {
  optimizedText: string;                // Raw optimized text from AI
  selectedTemplate: string;             // ID of the selected template
  templates: ResumeTemplateType[];      // Available templates
  appliedKeywords: string[];            // Keywords applied to the resume
  suggestions: Suggestion[];            // Suggestions for improvement
  onDownload: () => void;               // Handler for download button
  onSave: () => void;                   // Handler for save button
  onTextChange: (text: string) => void; // Handler for text changes
  onApplySuggestion: (index: number) => void; // Handler for applying a suggestion
  onApplyKeyword: (keyword: string) => void;  // Handler for applying a keyword
  isOptimizing: boolean;                // Whether optimization is in progress
  language?: string;                    // Language of the resume
}

/**
 * ResumePreview Component
 * 
 * The main component for displaying and editing the optimized resume.
 */
const ResumePreview: React.FC<ResumePreviewProps> = ({
  optimizedText,
  selectedTemplate,
  templates,
  appliedKeywords,
  suggestions,
  onDownload,
  onSave,
  onTextChange,
  onApplySuggestion,
  onApplyKeyword,
  isOptimizing,
  language = "English" // Default to English
}) => {
  // State for storing the structured HTML content
  const [structuredHTML, setStructuredHTML] = useState<string>('');
  
  // Get the selected template object
  const template = templates.find(t => t.id === selectedTemplate) || templates[0];

  /**
   * Process optimized text into structured HTML when it changes
   */
  useEffect(() => {
    if (optimizedText) {
      try {
        // Use optimized text directly
        setStructuredHTML(optimizedText);
        console.log('Editor content updated from optimized text');
      } catch (error) {
        console.error("Error processing optimized text:", error);
        // Fallback to simple HTML conversion if processing fails
        setStructuredHTML(`<div>${optimizedText.replace(/\n/g, '<br/>')}</div>`);
      }
    }
  }, [optimizedText]);

  /**
   * Handle changes from the TipTap editor
   * 
   * @param html - Updated HTML content from the editor
   */
  const handleEditorChange = (html: string) => {
    // Update local state
    setStructuredHTML(html);
    
    // Call the parent handler
    onTextChange(html);
  };

  /**
   * Handle applying a suggestion to the resume
   * 
   * @param suggestion - The suggestion to apply
   */
  const handleApplySuggestion = (suggestion: Suggestion) => {
    // Find the index of the suggestion in the array
    const index = suggestions.findIndex(s => 
      s.text === suggestion.text && s.type === suggestion.type
    );
    
    if (index !== -1) {
      onApplySuggestion(index);
    }
  };

  /**
   * Handle custom download that creates HTML with the selected template applied
   */
  const handleCustomDownload = () => {
    try {
      // Get the current template
      const template = getTemplateById(selectedTemplate);
      
      // Create complete HTML document with template applied
      const completeHtml = createCompleteHtml(template, structuredHTML);
      
      // Create and trigger download
      const blob = new Blob([completeHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("Resume downloaded with template:", template.name);
    } catch (error) {
      console.error("Error downloading resume:", error);
      // Fallback to original download handler
      onDownload();
    }
  };

  /**
   * Display loading state during optimization
   */
  if (isOptimizing) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-4">
        <div className="h-8 w-8 text-brand-600 mb-4 animate-pulse">
          {/* Animation for optimization in progress */}
          ✨
        </div>
        <p className="text-lg font-medium">Optimizing your resume...</p>
        <p className="text-sm text-gray-500">Please wait while our AI analyzes and enhances your resume</p>
      </div>
    );
  }

  /**
   * Warning component for when optimized text is not available
   */
  const renderNoContentWarning = () => {
    if (!optimizedText && !structuredHTML) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2">
          <span className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
          <p className="text-xs text-amber-700">
            No optimized content available. Please upload a resume or paste content to optimize.
          </p>
        </div>
      );
    }
    return null;
  };

  /**
   * Main component render
   */
  return (
    <div>
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Resume Preview</h3>
        <div className="flex gap-2">
          <TemplatePreviewButton
            resumeContent={structuredHTML}
            selectedTemplateId={selectedTemplate}
          >
            See Result
          </TemplatePreviewButton>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCustomDownload}
            disabled={!structuredHTML}
          >
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
          <Button 
            size="sm" 
            onClick={onSave}
            disabled={!structuredHTML}
          >
            <Save className="h-4 w-4 mr-2" /> Save
          </Button>
        </div>
      </div>
      
      {/* Warning if no content is available */}
      {renderNoContentWarning()}
      
      {/* TipTap WYSIWYG Editor */}
      {structuredHTML ? (
        <TipTapResumeEditor 
          content={structuredHTML}
          onChange={handleEditorChange}
          appliedKeywords={appliedKeywords}
          onApplyKeyword={onApplyKeyword}
          suggestions={suggestions}
          onApplySuggestion={handleApplySuggestion}
        />
      ) : (
        <div className="border rounded-lg p-6 min-h-[500px] flex items-center justify-center bg-gray-50">
          <p className="text-gray-400">No content to display</p>
        </div>
      )}
    </div>
  );
};

export default ResumePreview;