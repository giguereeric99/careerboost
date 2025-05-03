/**
 * ResumePreview Component
 * 
 * This component displays a preview of the optimized resume and allows editing.
 * Features:
 * - Toggle between view and edit modes
 * - Section-based editing with TipTap rich text editor
 * - Support for multiple templates
 * - Download functionality
 * - Reset to original version
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Download, Save, Eye, Edit, ChevronLeft,
  Check, FileText, RotateCcw 
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';
import { Suggestion } from '@/types/resume';
import { createCompleteHtml } from '@/utils/templateUtils';
import { getTemplateById } from '@/constants/resumeTemplates';
import DOMPurify from 'dompurify';
import { toast } from "sonner";

// Import TipTap editor
import TipTapResumeEditor from '@/components/ResumeOptimizer/TipTapResumeEditor';

// Import helper components
import { 
  PreviewHeader,  
  PreviewContent,
  EditorContent,
  LoadingState,
  NoContentWarning,
  AppliedKeywordsList
} from './ResumePreviewComponents';

// Import utilities
import { 
  normalizeHtmlContent, 
  parseHtmlIntoSections,
  getSectionName,
  SECTION_NAMES,
  SECTION_ORDER
} from '@/utils/resumeUtils';

/**
 * Interface for ResumePreview component props
 */
interface ResumePreviewProps {
  optimizedText: string;                // Resume content to display
  originalOptimizedText?: string;       // Original content for reset
  selectedTemplate: string;             // ID of the selected template
  templates: ResumeTemplateType[];      // Available templates
  appliedKeywords: string[];            // Keywords applied to the resume
  suggestions: Suggestion[];            // Suggestions for improvement
  onDownload: () => void;               // Handler for download button
  onSave: (content: string) => Promise<boolean> | boolean; // Handler for save button
  onTextChange: (text: string) => void; // Handler for text changes
  isOptimizing: boolean;                // Whether optimization is in progress
  language?: string;                    // Language of the resume
  onEditModeChange?: (isEditing: boolean) => void; // Optional callback for edit mode changes
  onReset?: () => void;                 // Optional callback for reset button
}

/**
 * Section interface for resume content sections
 */
interface Section {
  id: string;
  title: string;
  content: string;
}

/**
 * ResumePreview Component
 */
const ResumePreview: React.FC<ResumePreviewProps> = ({
  optimizedText,
  originalOptimizedText,
  selectedTemplate,
  templates,
  appliedKeywords,
  suggestions,
  onDownload,
  onSave,
  onTextChange,
  isOptimizing,
  language = "English",
  onEditModeChange,
  onReset
}) => {
  // UI state
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [contentModified, setContentModified] = useState(false);
  
  // Get selected template
  const template = templates.find(t => t.id === selectedTemplate) || templates[0];

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  const sanitizeHtml = useCallback((html: string): string => {
    if (typeof DOMPurify === 'undefined') {
      // Basic sanitization if DOMPurify is not available
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*["']?[^"']*["']?/gi, '');
    }
    
    // Use DOMPurify for comprehensive sanitization
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'a', 'b', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'i', 'li', 'ol', 'p', 'section', 'span', 'strong', 'u', 'ul'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'id', 'class', 'style',
        'data-section-id', 'data-section'
      ],
      // Additional options to preserve formatting
      ALLOW_ARIA_ATTR: true,
      USE_PROFILES: { html: true },
      KEEP_CONTENT: true
    });
  }, []);

  /**
   * Process and normalize the HTML content
   */
  const processContent = useCallback((content: string): string => {
    if (!content) return '';
    
    // Normalize HTML entities and ensure consistent format
    return normalizeHtmlContent(content, sanitizeHtml);
  }, [sanitizeHtml]);

  /**
   * Parse the resume HTML into sections when optimizedText changes
   */
  useEffect(() => {
    if (!optimizedText) {
      setSections([]);
      return;
    }
    
    try {
      // Normalize and sanitize the content
      const normalizedContent = processContent(optimizedText);
      
      // Parse content into sections
      const parsedSections = parseHtmlIntoSections(
        normalizedContent, 
        getSectionName, 
        SECTION_NAMES,
        SECTION_ORDER
      );
      
      console.log(`Parsed ${parsedSections.length} sections:`, 
        parsedSections.map(s => s.title));
      
      setSections(parsedSections);
      setContentModified(false);
    } catch (error) {
      console.error("Error parsing optimized text into sections:", error);
      // Fallback to simple section
      setSections([{
        id: 'resume-summary',
        title: SECTION_NAMES['resume-summary'],
        content: optimizedText
      }]);
    }
  }, [optimizedText, processContent]);

  /**
   * Notify parent component when edit mode changes
   */
  useEffect(() => {
    if (onEditModeChange) {
      onEditModeChange(editMode);
    }
  }, [editMode, onEditModeChange]);

  /**
   * Handle section content update
   */
  const handleSectionUpdate = useCallback((sectionId: string, newContent: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.map(section => 
        section.id === sectionId ? { ...section, content: newContent } : section
      );
      setContentModified(true);
      return updatedSections;
    });
  }, []);

  /**
   * Combine all sections into complete HTML
   */
  const combineAllSections = useCallback(() => {
    return sections.map(section => 
      `<section id="${section.id}" class="section-title">${section.content}</section>`
    ).join('\n');
  }, [sections]);

  /**
   * Handle save button click
   */
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Get combined HTML and normalize it
      let combinedHtml = combineAllSections();
      combinedHtml = processContent(combinedHtml);
      
      if (combinedHtml.length < 50) {
        toast.error("Content is too short", {
          description: "Resume content must be at least 50 characters."
        });
        return;
      }
      
      console.log("Saving content, length:", combinedHtml.length);
      
      // Call parent save handler
      const saveResult = await Promise.resolve(onSave(combinedHtml));
      
      if (saveResult) {
        setContentModified(false);
        toast.success("Resume saved successfully");
        
        // Notify parent component of the changes
        onTextChange(combinedHtml);
        
        // Exit edit mode after saving
        setEditMode(false);
      }
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save resume");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, combineAllSections, processContent, onSave, onTextChange]);

  /**
   * Open preview in new window
   */
  const openPreview = useCallback(() => {
    try {
      const template = getTemplateById(selectedTemplate);
      const combinedContent = combineAllSections();
      const completeHtml = createCompleteHtml(template, combinedContent);
      
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(completeHtml);
        previewWindow.document.close();
      }
    } catch (error) {
      console.error("Error opening preview:", error);
      toast.error("Failed to open preview");
    }
  }, [selectedTemplate, combineAllSections]);

  /**
   * Toggle edit mode on/off
   */
  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  /**
   * Show loading state during optimization
   */
  if (isOptimizing) {
    return <LoadingState />;
  }

  /**
   * Main render
   */
  return (
    <div className="bg-white border rounded-lg p-6">
      {/* Header with actions */}
      <PreviewHeader 
        editMode={editMode}
        toggleEditMode={toggleEditMode}
        openPreview={openPreview}
        handleSave={handleSave}
        isSaving={isSaving}
        contentModified={contentModified}
        optimizedText={optimizedText}
        onReset={onReset}
      />
      
      {/* Warning if no content is available */}
      {!optimizedText && <NoContentWarning />}
      
      {/* Modified indicator */}
      {contentModified && editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-4 text-sm text-blue-700 flex items-center">
          <span className="h-2 w-2 bg-blue-500 rounded-full mr-2"></span>
          You have unsaved changes. Click "Save Changes" to apply your modifications.
        </div>
      )}
      
      {/* Content Area */}
      {editMode ? (
        <EditorContent 
          sections={sections}
          handleSectionUpdate={handleSectionUpdate}
          appliedKeywords={appliedKeywords}
          suggestions={suggestions}
          handleSave={handleSave}
          isSaving={isSaving}
          contentModified={contentModified}
          toggleEditMode={toggleEditMode}
        />
      ) : (
        <PreviewContent 
          optimizedText={optimizedText}
          combinedSections={combineAllSections()}
          sanitizeHtml={sanitizeHtml}
          template={template}
          onDownload={onDownload}
        />
      )}
      
      {/* Applied keywords list */}
      {!editMode && appliedKeywords.length > 0 && (
        <AppliedKeywordsList keywords={appliedKeywords} />
      )}
    </div>
  );
};

export default ResumePreview;