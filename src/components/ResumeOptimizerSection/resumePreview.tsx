/**
 * Enhanced ResumePreview Component
 * 
 * This component displays a preview of the optimized resume and allows editing.
 * Features:
 * - Toggle between view and edit modes
 * - Real-time preview of edits without saving
 * - Section-based editing with TipTap rich text editor
 * - Support for multiple templates
 * - Download functionality
 * - Reset to original version (only shown when changes exist)
 * - Real-time updates when applying suggestions and keywords
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Download, Save, Eye, Edit, ChevronLeft,
  Check, FileText, RotateCcw, AlertCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';
import { Suggestion } from '@/types/resumeTypes';
import { createCompleteHtml } from '@/utils/templateUtils';
import { getTemplateById } from '@/constants/resumeTemplates';
import { STANDARD_SECTIONS } from '@/constants/sections';
import DOMPurify from 'dompurify';
import { toast } from "sonner";
import { Section } from '@/types/resumeTypes';

// Import TipTap editor
import TipTapResumeEditor from '@/components/ResumeOptimizerSection/tipTapResumeEditor';

// Import helper components
import { 
  PreviewHeader,  
  PreviewContent,
  LoadingState,
  NoContentWarning,
  AppliedKeywordsList
} from './resumePreviewComponents';

// Import utilities
import { 
  normalizeHtmlContent, 
  parseHtmlIntoSections,
  getSectionName,
  SECTION_NAMES,
  SECTION_ORDER,
  isSectionEmpty
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
  isApplyingChanges?: boolean;          // Whether changes are being applied
  language?: string;                    // Language of the resume
  onEditModeChange?: (isEditing: boolean) => void; // Optional callback for edit mode changes
  onReset?: () => void;                 // Optional callback for reset button
  onRegenerateContent?: () => void;     // Optional callback for regenerating content with applied changes
  needsRegeneration?: boolean;          // Whether the content needs regeneration after applying changes
  isEditing?: boolean;                  // NEW: Whether the resume is in edit mode (controlled by parent)
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
  isApplyingChanges = false,
  language = "English",
  onEditModeChange,
  onReset,
  onRegenerateContent,
  needsRegeneration = false,
  isEditing // NEW: Using isEditing prop from parent component
}) => {
  // UI state - Now checking if isEditing is provided by parent
  // If isEditing is provided by parent, we use it for controlled mode
  // Otherwise we maintain our own state for uncontrolled mode
  const [localEditMode, setLocalEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [contentModified, setContentModified] = useState(false);
  const [hasLoadedInitialContent, setHasLoadedInitialContent] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>(''); // State for real-time preview
  
  // Track if content has ever been modified to determine if Reset button should show
  const [hasBeenModified, setHasBeenModified] = useState(false);
  
  // Determine the current edit mode - if isEditing is provided by parent, use it
  // Otherwise use our local state
  const editMode = isEditing !== undefined ? isEditing : localEditMode;
  
  // Get selected template
  const template = useMemo(() => (
    templates.find(t => t.id === selectedTemplate) || templates[0]
  ), [selectedTemplate, templates]);

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
   * Create a default empty section with title and placeholder content
   * 
   * @param sectionId - The ID of the section to create
   * @returns A complete section object with empty content
   */
  const createEmptySection = useCallback((sectionId: string): Section => {
    const title = getSectionName(sectionId);
    // Create placeholder content for the section with appropriate heading
    const content = `<h2>${title}</h2><p></p>`;
    
    return {
      id: sectionId,
      title: title,
      content: content,
      visible: true, // Show all sections in edit mode
      isEmpty: true,  // Empty by default
      type: "empty",
      order: 0  
    };
  }, []);
  
  /**
   * Initialize all standard sections for editing
   * This ensures all possible sections are available in edit mode
   * 
   * @param existingSections - Array of sections parsed from the resume content
   * @returns Complete array of all standard sections, with content from existing sections
   */
  const initializeAllSections = useCallback((existingSections: Section[]) => {
    // Create a map of existing sections by ID for easy lookup
    const existingSectionsMap = new Map(
      existingSections.map(section => [section.id, section])
    );
    
    // Create the complete section list with standard sections in the correct order
    return STANDARD_SECTIONS.map(standardSection => {
      const existingSection = existingSectionsMap.get(standardSection.id);
      
      // If section exists in content, use it; otherwise create empty section
      if (existingSection) {
        return {
          ...existingSection,
          visible: true,  // Show sections that exist in the document
          isEmpty: isSectionEmpty(existingSection.content, existingSection.title)
        };
      } else {
        // Create a new empty section
        return createEmptySection(standardSection.id);
      }
    });
  }, [createEmptySection]);
  
  /**
   * Determine if a reset should be available
   * Reset is available if content has been modified OR is different from original
   */
  const shouldShowReset = useMemo(() => {
    // Only show Reset if:
    // 1. The onReset callback exists
    // 2. Either the content is currently modified OR 
    // 3. The content was modified at some point and differs from original
    
    if (!onReset) return false;
    
    // If content is currently modified, show reset button
    if (contentModified) return true;
    
    // If content has been modified before and current content differs from original
    const currentContent = previewContent || optimizedText;
    const originalContent = originalOptimizedText || '';
    
    if (hasBeenModified && currentContent !== originalContent) {
      return true;
    }
    
    return false;
  }, [onReset, contentModified, hasBeenModified, previewContent, optimizedText, originalOptimizedText]);
  
  /**
   * Combine non-empty sections into complete HTML
   * Only includes sections that have meaningful content
   */
  const combineAllSections = useCallback(() => {
    return sections
      .filter(section => !section.isEmpty) // Only include non-empty sections
      .map(section => 
        `<section id="${section.id}" class="section-title">${section.content}</section>`
      )
      .join('\n');
  }, [sections]);

  /**
   * Handle internal reset action
   * Reset content to original version without saving to database
   */
  const handleLocalReset = useCallback(() => {
    if (!originalOptimizedText) return;
    
    // Reset preview content to original
    setPreviewContent(originalOptimizedText);
    
    // Parse original content to reset sections
    try {
      const normalizedContent = processContent(originalOptimizedText);
      const parsedSections = parseHtmlIntoSections(
        normalizedContent,
        getSectionName,
        SECTION_NAMES,
        SECTION_ORDER
      );
      
      // Initialize all standard sections with original content
      const allSections = initializeAllSections(parsedSections);
      setSections(allSections);
      
      // Reset modification state
      setContentModified(false);
      
      // Keep hasBeenModified true to indicate there was a history of changes
      
      // Notify parent of content change back to original
      onTextChange(originalOptimizedText);
      
      toast.success("Content reset to original version");
    } catch (error) {
      console.error("Error resetting content:", error);
      toast.error("Failed to reset content");
    }
  }, [originalOptimizedText, processContent, initializeAllSections, onTextChange]);
  
  /**
   * Handle reset button click
   * Calls parent reset function and also resets local state
   */
  const handleReset = useCallback(() => {
    // First reset local content
    handleLocalReset();
    
    // Then call parent reset function if provided
    if (onReset) {
      onReset();
    }
  }, [handleLocalReset, onReset]);

  /**
   * Parse the resume HTML into sections when optimizedText changes
   */
  useEffect(() => {
    // Skip if we're currently in edit mode to prevent editor state from being reset
    if (editMode) return;
    
    // Skip if there's no content and we've already loaded initial content
    if (!optimizedText && hasLoadedInitialContent) return;
    
    try {
      if (!optimizedText) {
        // Initialize with empty standard sections when no content
        const emptySections = STANDARD_SECTIONS.map(({ id }) => createEmptySection(id));
        setSections(emptySections);
        setHasLoadedInitialContent(true);
        return;
      }
      
      // Normalize and sanitize the content
      const normalizedContent = processContent(optimizedText);
      
      // Parse content into sections
      const parsedSections = parseHtmlIntoSections(
        normalizedContent, 
        getSectionName, 
        SECTION_NAMES,
        SECTION_ORDER
      );
      
      // Initialize all standard sections, filling in content from parsed sections
      const allSections = initializeAllSections(parsedSections);
      
      // Set all sections and reset modification state for initial load
      setSections(allSections);
      // We don't reset contentModified here to preserve the state across mode changes
      
      setHasLoadedInitialContent(true);
      
      // Set initial preview content only if it doesn't exist already
      if (!previewContent) {
        setPreviewContent(normalizedContent);
      }
      
    } catch (error) {
      console.error("Error parsing optimized text into sections:", error);
      // Fallback to simple section
      setSections([{
        id: 'resume-summary',
        title: 'Professional Summary',
        content: optimizedText || '<p>No content available</p>',
        visible: true,
        isEmpty: !optimizedText,
        type: 'summary',
        order: 0
      }]);
      setHasLoadedInitialContent(true);
      if (!previewContent) {
        setPreviewContent(optimizedText || '');
      }
    }
  }, [optimizedText, editMode, hasLoadedInitialContent, processContent, createEmptySection, initializeAllSections, previewContent]);

  /**
   * Notify parent component when edit mode changes
   * This effect now handles both the controlled and uncontrolled modes
   */
  useEffect(() => {
    // Only call onEditModeChange if we're in uncontrolled mode
    // and the local edit mode changes
    if (isEditing === undefined && onEditModeChange) {
      onEditModeChange(localEditMode);
    }
  }, [localEditMode, onEditModeChange, isEditing]);

  /**
   * Handle section content update
   * Updates section content and also updates preview in real-time
   */
  const handleSectionUpdate = useCallback((sectionId: string, newContent: string) => {
    setSections(prevSections => {
      const updatedSections = prevSections.map(section => {
        if (section.id === sectionId) {
          // Determine if section is empty after update
          const isEmpty = isSectionEmpty(newContent, section.title);
          
          return { 
            ...section, 
            content: newContent,
            isEmpty: isEmpty
          };
        }
        return section;
      });
      
      // Mark content as modified
      setContentModified(true);
      setHasBeenModified(true);
      
      // Update the preview content immediately for real-time preview
      setTimeout(() => {
        const combinedSections = updatedSections
          .filter(section => !section.isEmpty)
          .map(section => 
            `<section id="${section.id}" class="section-title">${section.content}</section>`
          )
          .join('\n');
        
        setPreviewContent(combinedSections);
        
        // Notify parent of changes (but don't save to database yet)
        onTextChange(combinedSections);
      }, 0);
      
      return updatedSections;
    });
  }, [onTextChange]);

  /**
   * Handle save button click
   */
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Get combined HTML from non-empty sections and normalize it
      let combinedHtml = combineAllSections();
      combinedHtml = processContent(combinedHtml);
      
      if (combinedHtml.length < 50) {
        toast.error("Content too short", {
          description: "Resume content must be at least 50 characters."
        });
        setIsSaving(false);
        return;
      }
      
      // Call parent save handler
      const saveResult = await Promise.resolve(onSave(combinedHtml));
      
      if (saveResult) {
        setContentModified(false);
        // Keep hasBeenModified as true since changes have been made and saved
        
        toast.success("Resume saved successfully");
        
        // Notify parent component of the changes
        onTextChange(combinedHtml);
        
        // Update preview content
        setPreviewContent(combinedHtml);
        
        // Exit edit mode after saving if we're in uncontrolled mode
        if (isEditing === undefined) {
          setLocalEditMode(false);
        }
      } else {
        toast.error("Failed to save resume");
      }
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save resume");
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, combineAllSections, processContent, onSave, onTextChange, isEditing]);

  /**
   * Open preview in new window
   */
  const openPreview = useCallback(() => {
    try {
      const template = getTemplateById(selectedTemplate);
      const contentToUse = editMode ? combineAllSections() : (previewContent || optimizedText);
      const completeHtml = createCompleteHtml(template, contentToUse);
      
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(completeHtml);
        previewWindow.document.close();
      }
    } catch (error) {
      console.error("Error opening preview:", error);
      toast.error("Failed to open preview");
    }
  }, [selectedTemplate, combineAllSections, editMode, previewContent, optimizedText]);

  /**
   * Toggle edit mode on/off with no confirmation dialog
   * This function now handles both controlled and uncontrolled modes
   */
  const toggleEditMode = useCallback(() => {
    if (isEditing !== undefined) {
      // In controlled mode, notify parent to toggle edit mode
      if (onEditModeChange) {
        onEditModeChange(!isEditing);
      }
    } else {
      // In uncontrolled mode, toggle local state
      setLocalEditMode(prev => !prev);
    }
  }, [isEditing, onEditModeChange]);

  /**
   * Handle "Apply Changes" button click to regenerate content
   */
  const handleRegenerateContent = useCallback(() => {
    if (onRegenerateContent) {
      onRegenerateContent();
    }
  }, [onRegenerateContent]);

  /**
   * Show loading state during optimization
   */
  if (isOptimizing) {
    return <LoadingState />;
  }

  /**
   * Content to use for preview - prefers preview content if available
   * Falls back to optimizedText prop if no preview content
   */
  const displayedContent = previewContent || optimizedText;

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
        onReset={shouldShowReset ? handleReset : undefined}
      />
      
      {/* Warning if no content is available */}
      {!optimizedText && <NoContentWarning />}
      
      {/* Modified indicator - show in both edit and preview modes */}
      {contentModified && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-4 text-sm text-blue-700 flex items-center">
          <span className="h-2 w-2 bg-blue-500 rounded-full mr-2"></span>
          You have unsaved changes. Click "Save Changes" to apply your modifications.
        </div>
      )}
      
      {/* Content Area */}
      {editMode ? (
        <div className="space-y-4">
          {/* Sections Editor */}
          <Accordion 
            type="single" 
            className="space-y-4" 
            defaultValue={sections.length > 0 ? sections[0].id : undefined}
            collapsible
          >
            {sections.map(section => (
              <AccordionItem 
                key={section.id} 
                value={section.id} 
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 font-medium text-gray-800 hover:bg-gray-50 flex justify-between items-center">
                  {section.title}
                  {section.isEmpty && (
                    <span className="text-xs text-gray-400 mr-2">(Empty)</span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-6">
                  <TipTapResumeEditor
                    content={section.content}
                    onChange={(html) => handleSectionUpdate(section.id, html)}
                    appliedKeywords={appliedKeywords}
                    suggestions={[]}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          {/* Action Buttons */}
          <div className="pt-4 flex justify-end gap-2">
            {/* Cancel button */}
            <Button 
              variant="outline"
              size="sm"
              onClick={toggleEditMode}
            >
              Cancel
            </Button>
            
            {/* Save button */}
            <Button 
              onClick={handleSave}
              disabled={isSaving || !contentModified}
              className="bg-brand-600 hover:bg-brand-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" /> Save & Apply Changes
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <PreviewContent 
          optimizedText={displayedContent}
          combinedSections={previewContent || optimizedText}
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