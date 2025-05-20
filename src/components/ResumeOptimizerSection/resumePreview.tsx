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
 * - Reset to original version (always visible in preview mode)
 * - Real-time updates when applying suggestions and keywords
 * - Updated to work with atomic save approach
 * - Support for full preview in modal with template applied
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Save,
  Eye,
  Edit,
  ChevronLeft,
  Check,
  FileText,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ResumeTemplateType } from "@/types/resumeTemplateTypes";
import { Suggestion, OptimizedResumeData } from "@/types/resumeTypes";
import { createCompleteHtml } from "@/utils/templateUtils";
import { getTemplateById } from "@/constants/resumeTemplates";
import { STANDARD_SECTIONS } from "@/constants/sections";
import DOMPurify from "dompurify";
import { toast } from "sonner";
import { Section } from "@/types/resumeTypes";

// Import TipTap editor
import TipTapResumeEditor from "@/components/ResumeOptimizerSection/tipTapResumeEditor";

// Import UI components
import ResumePreviewModal from "./resumePreviewModal";

// Import helper components
import {
  PreviewHeader,
  PreviewContent,
  LoadingState,
  NoContentWarning,
  AppliedKeywordsList,
} from "./resumePreviewComponents";

// Import utilities
import {
  normalizeHtmlContent,
  parseHtmlIntoSections,
  getSectionName,
  SECTION_NAMES,
  SECTION_ORDER,
  isSectionEmpty,
  ensureSectionTitleClasses,
} from "@/utils/resumeUtils";

/**
 * Interface for ResumePreview component props
 */
interface ResumePreviewProps {
  optimizedText: string; // Resume content to display
  originalOptimizedText?: string; // Original content for reset
  selectedTemplate: string; // ID of the selected template
  templates: ResumeTemplateType[]; // Available templates
  appliedKeywords: string[]; // Keywords applied to the resume
  suggestions: Suggestion[]; // Suggestions for improvement
  onDownload: () => void; // Handler for download button
  onSave: (content: string) => Promise<boolean> | boolean; // Handler for save button
  onTextChange: (text: string) => void; // Handler for text changes
  isOptimizing: boolean; // Whether optimization is in progress
  isApplyingChanges?: boolean; // Whether changes are being applied
  language?: string; // Language of the resume
  onEditModeChange?: (isEditing: boolean) => void; // Optional callback for edit mode changes
  onReset?: () => void; // Optional callback for reset button
  onRegenerateContent?: () => void; // Optional callback for regenerating content with applied changes
  needsRegeneration?: boolean; // Whether the content needs regeneration after applying changes
  isEditing?: boolean; // Whether the resume is in edit mode (controlled by parent)
  scoreModified?: boolean; // Whether the score has been modified due to applied suggestions/keywords
  templateModified?: boolean; // Whether the template has been modified
  resumeData?: OptimizedResumeData; // Full resume data object
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
  isEditing, // Whether the resume is in edit mode (controlled by parent)
  scoreModified = false, // Whether score has been modified (default: false)
  templateModified = false, // Whether the template has been modified (default: false)
  resumeData,
}) => {
  // Local state for UI controls
  const [localEditMode, setLocalEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [contentModified, setContentModified] = useState(false);
  const [hasLoadedInitialContent, setHasLoadedInitialContent] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>(""); // State for real-time preview

  // Track if content has ever been modified
  const [hasBeenModified, setHasBeenModified] = useState(false);

  // State for controlling the preview modal visibility
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Determine the current edit mode - if isEditing is provided by parent, use it
  // Otherwise use our local state
  const editMode = isEditing !== undefined ? isEditing : localEditMode;

  // Get selected template
  const template = useMemo(
    () => templates.find((t) => t.id === selectedTemplate) || templates[0],
    [selectedTemplate, templates]
  );

  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  const sanitizeHtml = useCallback((html: string): string => {
    if (typeof DOMPurify === "undefined") {
      // Basic sanitization if DOMPurify is not available
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/\son\w+\s*=\s*["']?[^"']*["']?/gi, "");
    }

    // Use DOMPurify for comprehensive sanitization
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "a",
        "b",
        "br",
        "div",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "i",
        "li",
        "ol",
        "p",
        "section",
        "span",
        "strong",
        "u",
        "ul",
      ],
      ALLOWED_ATTR: [
        "href",
        "target",
        "rel",
        "id",
        "class",
        "style",
        "data-section-id",
        "data-section",
      ],
      ALLOW_ARIA_ATTR: true,
      USE_PROFILES: { html: true },
      ALLOW_DATA_ATTR: true,
      SANITIZE_DOM: false,
      KEEP_CONTENT: true,
      ADD_ATTR: ["id"],
    });
  }, []);

  /**
   * Process and normalize the HTML content
   */
  const processContent = useCallback(
    (content: string): string => {
      if (!content) return "";

      // Normalize HTML entities and ensure consistent format
      return normalizeHtmlContent(content, sanitizeHtml);
    },
    [sanitizeHtml]
  );

  /**
   * Create a default empty section with title and placeholder content
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
      isEmpty: true, // Empty by default
      type: "empty",
      order: 0,
    };
  }, []);

  /**
   * Initialize all standard sections for editing
   * This ensures all possible sections are available in edit mode
   */
  const initializeAllSections = useCallback(
    (existingSections: Section[]) => {
      // Create a map of existing sections by ID for easy lookup
      const existingSectionsMap = new Map(
        existingSections.map((section) => [section.id, section])
      );

      // Create the complete section list with standard sections in the correct order
      return STANDARD_SECTIONS.map((standardSection) => {
        const existingSection = existingSectionsMap.get(standardSection.id);

        // If section exists in content, use it; otherwise create empty section
        if (existingSection) {
          return {
            ...existingSection,
            visible: true, // Show sections that exist in the document
            isEmpty: isSectionEmpty(
              existingSection.content,
              existingSection.title
            ),
          };
        } else {
          // Create a new empty section
          return createEmptySection(standardSection.id);
        }
      });
    },
    [createEmptySection]
  );

  /**
   * Combine non-empty sections into complete HTML
   * Only includes sections that have meaningful content
   */
  const combineAllSections = useCallback(() => {
    return sections
      .filter((section) => !section.isEmpty) // Only include non-empty sections
      .map(
        (section) => `<section id="${section.id}">${section.content}</section>`
      )
      .join("\n");
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

      // Notify parent of content change back to original
      onTextChange(originalOptimizedText);

      // toast.success("Content reset to original version");
    } catch (error) {
      console.error("Error resetting content:", error);
      toast.error("Failed to reset content");
    }
  }, [
    originalOptimizedText,
    processContent,
    initializeAllSections,
    onTextChange,
  ]);

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

    // Force a re-render of the preview content
    setPreviewContent(originalOptimizedText || "");

    // Also reset content modified state
    setContentModified(false);
    setHasBeenModified(false);
  }, [handleLocalReset, onReset, originalOptimizedText]);

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
        const emptySections = STANDARD_SECTIONS.map(({ id }) =>
          createEmptySection(id)
        );
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

      setHasLoadedInitialContent(true);

      // Set initial preview content only if it doesn't exist already
      if (!previewContent) {
        setPreviewContent(normalizedContent);
      }
    } catch (error) {
      console.error("Error parsing optimized text into sections:", error);
      // Fallback to simple section
      setSections([
        {
          id: "resume-summary",
          title: "Professional Summary",
          content: optimizedText || "<p>No content available</p>",
          visible: true,
          isEmpty: !optimizedText,
          type: "summary",
          order: 0,
        },
      ]);
      setHasLoadedInitialContent(true);
      if (!previewContent) {
        setPreviewContent(optimizedText || "");
      }
    }
  }, [
    optimizedText,
    editMode,
    hasLoadedInitialContent,
    processContent,
    createEmptySection,
    initializeAllSections,
    previewContent,
  ]);

  /**
   * Notify parent component when edit mode changes
   */
  useEffect(() => {
    // Only call onEditModeChange if we're in uncontrolled mode
    // and the local edit mode changes
    if (isEditing === undefined && onEditModeChange) {
      onEditModeChange(localEditMode);
    }
  }, [localEditMode, onEditModeChange, isEditing]);

  /**
   * Effect to initialize sections when entering edit mode
   */
  useEffect(() => {
    // Only execute when edit mode is activated
    if (editMode) {
      console.log("Edit mode activated, preparing sections...");

      // Determine which content to use - prefer previewContent over optimizedText
      const contentToLoad = previewContent || optimizedText;

      if (contentToLoad) {
        try {
          // Process and normalize the content
          const normalizedContent = processContent(contentToLoad);

          // Parse content into sections
          const parsedSections = parseHtmlIntoSections(
            normalizedContent,
            getSectionName,
            SECTION_NAMES,
            SECTION_ORDER
          );

          // Initialize all standard sections with the current content
          const allSections = initializeAllSections(parsedSections);

          // Update sections with the parsed content
          setSections(allSections);

          console.log(
            "Sections initialized for edit mode with current content"
          );
        } catch (error) {
          console.error("Error initializing sections for edit mode:", error);
        }
      }
    }
  }, [
    editMode,
    previewContent,
    optimizedText,
    processContent,
    initializeAllSections,
  ]);

  /**
   * Handle section content update
   * Updates section content and also updates preview in real-time
   */
  const handleSectionUpdate = useCallback(
    (sectionId: string, newContent: string) => {
      setSections((prevSections) => {
        const updatedSections = prevSections.map((section) => {
          if (section.id === sectionId) {
            // Process the new content to ensure section title classes
            let processedContent = newContent;

            try {
              // Ensure section title class is preserved in the new content
              const parser = new DOMParser();
              const doc = parser.parseFromString(newContent, "text/html");

              // Find the first h1 or h2 in the content
              const heading = doc.querySelector("h1, h2");

              // If a heading is found, ensure it has the section-title class
              if (heading && !heading.classList.contains("section-title")) {
                heading.classList.add("section-title");
                processedContent = doc.body.innerHTML;
              }
            } catch (error) {
              console.error("Error processing section update:", error);
              // Use original content if processing fails
              processedContent = newContent;
            }

            // Determine if section is empty after update
            const isEmpty = isSectionEmpty(newContent, section.title);

            return {
              ...section,
              content: newContent,
              isEmpty: isEmpty,
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
            .filter((section) => !section.isEmpty)
            .map(
              (section) =>
                `<section id="${section.id}">${section.content}</section>`
            )
            .join("\n");

          setPreviewContent(combinedSections);

          // Notify parent of changes (but don't save to database yet)
          onTextChange(combinedSections);
        }, 0);

        return updatedSections;
      });
    },
    [onTextChange]
  );

  /**
   * Handle save button click
   * Performs validation, saves content, and updates UI states
   * Updated to reflect atomic save approach - saves all changes at once
   */
  const handleSave = useCallback(async () => {
    // Prevent simultaneous save operations
    if (isSaving) return;

    try {
      // Set saving state to show loading indicator
      setIsSaving(true);

      // Combine all non-empty sections into complete HTML and process it
      let combinedHtml = combineAllSections();

      // Ensure all section titles have the proper class
      combinedHtml = ensureSectionTitleClasses(combinedHtml);

      combinedHtml = processContent(combinedHtml);

      // Validate content length
      if (combinedHtml.length < 50) {
        toast.error("Content too short", {
          description: "Resume content must be at least 50 characters.",
        });
        setIsSaving(false);
        return;
      }

      // Notify user that we're saving all changes
      // toast.loading("Saving all changes...", {
      //   id: "save-changes-toast",
      //   description:
      //     "Saving resume content, applied keywords, and suggestions...",
      // });

      // Call parent save handler and await its result
      const saveResult = await Promise.resolve(onSave(combinedHtml));

      // Handle success case
      if (saveResult) {
        // Dismiss loading toast and show success
        // toast.success("All changes saved successfully", {
        //   id: "save-changes-toast",
        //   description:
        //     "Resume content, keywords, and suggestions have been updated.",
        // });

        // Update local state
        setContentModified(false);

        // Update preview content with saved content
        setPreviewContent(combinedHtml);

        // Update sections state with the saved content
        try {
          const normalizedContent = processContent(combinedHtml);
          const parsedSections = parseHtmlIntoSections(
            normalizedContent,
            getSectionName,
            SECTION_NAMES,
            SECTION_ORDER
          );

          // Initialize all standard sections with the saved content
          const allSections = initializeAllSections(parsedSections);
          setSections(allSections);
        } catch (sectionError) {
          console.error(
            "Error parsing saved content into sections:",
            sectionError
          );
        }

        // Notify parent component of the changes
        onTextChange(combinedHtml);

        // Exit edit mode after saving if we're in uncontrolled mode
        if (isEditing === undefined) {
          setLocalEditMode(false);
        }
      } else {
        // Handle failure case
        toast.error("Failed to save resume", {
          id: "save-changes-toast",
          description: "An error occurred while saving your changes.",
        });
      }
    } catch (error) {
      // Log error and show error toast
      console.error("Error saving resume:", error);
      toast.error("Failed to save resume", {
        id: "save-changes-toast",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      // Always reset saving state when done
      setIsSaving(false);
    }
  }, [
    isSaving,
    combineAllSections,
    processContent,
    onSave,
    onTextChange,
    isEditing,
    initializeAllSections,
  ]);

  /**
   * Open preview in modal
   * Updated to use the ResumePreviewModal component instead of opening in a new window
   */
  const openPreview = useCallback(() => {
    try {
      // Get the content to preview (different if in edit mode)
      const contentToUse = previewContent || optimizedText;

      // console.log(contentToUse);

      // Open the modal instead of a new window
      setIsPreviewModalOpen(true);

      // Log the template and content being used for debugging
      console.log("Opening preview with template:", selectedTemplate);
      console.log("Content length for preview:", contentToUse.length);
    } catch (error) {
      console.error("Error opening preview:", error);
      toast.error("Failed to open preview");
    }
  }, [
    selectedTemplate,
    combineAllSections,
    editMode,
    previewContent,
    optimizedText,
  ]);

  /**
   * Handle closing the preview modal
   */
  const handleClosePreviewModal = useCallback(() => {
    setIsPreviewModalOpen(false);
  }, []);

  /**
   * Toggle edit mode on/off
   */
  const toggleEditMode = useCallback(() => {
    if (isEditing !== undefined) {
      // In controlled mode, notify parent to toggle edit mode
      if (onEditModeChange) {
        onEditModeChange(!isEditing);
      }
    } else {
      // In uncontrolled mode, toggle local state
      setLocalEditMode((prev) => !prev);
    }
  }, [isEditing, onEditModeChange]);

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
   * Determine if save button should be enabled
   * Now considering both content modification and score modification
   */
  const shouldEnableSave = contentModified || scoreModified || templateModified;

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
        shouldEnableSave={shouldEnableSave} // Use combined state
        optimizedText={optimizedText}
        // Always pass onReset if it exists and we're not in edit mode
        onReset={!editMode && onReset ? handleReset : undefined}
      />

      {/* Warning if no content is available */}
      {!optimizedText && <NoContentWarning />}

      {/* Modified indicator - show in both edit and preview modes with warning icon */}
      {shouldEnableSave && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm text-amber-700 flex items-start">
          <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium">You have unsaved changes</p>
            <p className="text-xs mt-1">
              This includes content edits, applied keywords, and suggestions.
              Click "Save Changes" to update your resume with all modifications.
            </p>
          </div>
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
            {sections.map((section) => (
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
            <Button variant="outline" size="sm" onClick={toggleEditMode}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>

            {/* Save button - considers content and score modifications */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !shouldEnableSave}
              className="bg-brand-600 hover:bg-brand-700 "
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving all changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </>
              )}
            </Button>
          </div>

          {/* Atomic save notice */}
          {shouldEnableSave && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
              Clicking "Save Changes" will save your resume content and all
              applied keywords and suggestions.
            </div>
          )}
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

      {/* Resume Preview Modal */}
      <ResumePreviewModal
        open={isPreviewModalOpen}
        onClose={handleClosePreviewModal}
        resumeContent={editMode ? combineAllSections() : displayedContent}
        selectedTemplate={template}
      />
    </div>
  );
};

export default ResumePreview;
