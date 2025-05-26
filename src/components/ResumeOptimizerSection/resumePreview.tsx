/**
 * Enhanced ResumePreview Component - Fixed Accordion/Editor Focus Issues
 *
 * Key fixes:
 * 1. Auto-activate accordion section when editor is clicked
 * 2. Proper focus management for TipTap editors
 * 3. Improved section state management
 * 4. Better editor initialization timing
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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

// ENHANCED: Import the new header editor component
import ResumeHeaderEditor from "@/components/ResumeOptimizerSection/resumeHeaderEditor";

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
  optimizedText: string;
  originalOptimizedText?: string;
  selectedTemplate: string;
  templates: ResumeTemplateType[];
  appliedKeywords: string[];
  suggestions: Suggestion[];
  onDownload: () => void;
  onSave: (content: string) => Promise<boolean> | boolean;
  onTextChange: (text: string) => void;
  isOptimizing: boolean;
  isApplyingChanges?: boolean;
  language?: string;
  onEditModeChange?: (isEditing: boolean) => void;
  onReset?: () => void;
  onRegenerateContent?: () => void;
  needsRegeneration?: boolean;
  isEditing?: boolean;
  scoreModified?: boolean;
  templateModified?: boolean;
  resumeData?: OptimizedResumeData;
}

/**
 * Enhanced ResumePreview Component with Accordion Focus Management
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
  isEditing,
  scoreModified = false,
  templateModified = false,
  resumeData,
}) => {
  // Local state for UI controls
  const [localEditMode, setLocalEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [contentModified, setContentModified] = useState(false);
  const [hasLoadedInitialContent, setHasLoadedInitialContent] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");

  // Track if content has ever been modified
  const [hasBeenModified, setHasBeenModified] = useState(false);

  // State for controlling the preview modal visibility
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // NEW: State for managing active accordion section
  const [activeAccordionSection, setActiveAccordionSection] =
    useState<string>("");

  // NEW: Track which sections have editors that need focus
  const [sectionsNeedingFocus, setSectionsNeedingFocus] = useState<Set<string>>(
    new Set()
  );

  // Determine the current edit mode
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
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/\son\w+\s*=\s*["']?[^"']*["']?/gi, "");
    }

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
      return normalizeHtmlContent(content, sanitizeHtml);
    },
    [sanitizeHtml]
  );

  /**
   * Create a default empty section with title and placeholder content
   */
  const createEmptySection = useCallback((sectionId: string): Section => {
    const title = getSectionName(sectionId);
    const content = `<h2>${title}</h2><p></p>`;

    return {
      id: sectionId,
      title: title,
      content: content,
      visible: true,
      isEmpty: true,
      type: "empty",
      order: 0,
    };
  }, []);

  /**
   * Initialize all standard sections for editing
   */
  const initializeAllSections = useCallback(
    (existingSections: Section[]) => {
      const existingSectionsMap = new Map(
        existingSections.map((section) => [section.id, section])
      );

      return STANDARD_SECTIONS.map((standardSection) => {
        const existingSection = existingSectionsMap.get(standardSection.id);

        if (existingSection) {
          return {
            ...existingSection,
            visible: true,
            isEmpty: isSectionEmpty(
              existingSection.content,
              existingSection.title
            ),
          };
        } else {
          return createEmptySection(standardSection.id);
        }
      });
    },
    [createEmptySection]
  );

  /**
   * Combine non-empty sections into complete HTML
   */
  const combineAllSections = useCallback(() => {
    return sections
      .filter((section) => !section.isEmpty)
      .map(
        (section) => `<section id="${section.id}">${section.content}</section>`
      )
      .join("\n");
  }, [sections]);

  /**
   * NEW: Handle accordion section click - auto-activate and prepare focus
   */
  const handleAccordionSectionClick = useCallback((sectionId: string) => {
    console.log(`🎯 Accordion section clicked: ${sectionId}`);

    // Set the active accordion section immediately
    setActiveAccordionSection(sectionId);

    // Mark this section as needing focus once the accordion opens
    setSectionsNeedingFocus((prev) => new Set([...prev, sectionId]));

    // Small delay to ensure accordion content is rendered before focusing
    setTimeout(() => {
      const editorElement = document.querySelector(
        `[data-section-id="${sectionId}"] .ProseMirror`
      );
      if (editorElement) {
        (editorElement as HTMLElement).focus();
        console.log(`✅ Focus set on editor for section: ${sectionId}`);
      }
    }, 100);
  }, []);

  /**
   * NEW: Enhanced section update with focus management
   */
  const handleSectionUpdate = useCallback(
    (sectionId: string, newContent: string) => {
      console.log(`📝 Section update: ${sectionId}`);

      setSections((prevSections) => {
        const updatedSections = prevSections.map((section) => {
          if (section.id === sectionId) {
            let processedContent = newContent;

            try {
              const parser = new DOMParser();
              const doc = parser.parseFromString(newContent, "text/html");
              const heading = doc.querySelector("h1, h2");

              if (heading && !heading.classList.contains("section-title")) {
                heading.classList.add("section-title");
                processedContent = doc.body.innerHTML;
              }
            } catch (error) {
              console.error("Error processing section update:", error);
              processedContent = newContent;
            }

            const isEmpty = isSectionEmpty(newContent, section.title);

            return {
              ...section,
              content: newContent,
              isEmpty: isEmpty,
            };
          }
          return section;
        });

        setContentModified(true);
        setHasBeenModified(true);

        // Update preview content immediately
        setTimeout(() => {
          const combinedSections = updatedSections
            .filter((section) => !section.isEmpty)
            .map(
              (section) =>
                `<section id="${section.id}">${section.content}</section>`
            )
            .join("\n");

          setPreviewContent(combinedSections);
          onTextChange(combinedSections);
        }, 0);

        return updatedSections;
      });
    },
    [onTextChange]
  );

  /**
   * NEW: Enhanced Editor Wrapper Component with Focus Management
   */
  const EditorWrapper: React.FC<{
    sectionId: string;
    content: string;
    onUpdate: (content: string) => void;
  }> = ({ sectionId, content, onUpdate }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Effect to handle focus when section becomes active
    useEffect(() => {
      if (
        sectionsNeedingFocus.has(sectionId) &&
        activeAccordionSection === sectionId
      ) {
        const timer = setTimeout(() => {
          const proseMirror = editorRef.current?.querySelector(
            ".ProseMirror"
          ) as HTMLElement;
          if (proseMirror) {
            proseMirror.focus();
            console.log(`✅ Editor focused for section: ${sectionId}`);
          }

          // Remove from sections needing focus
          setSectionsNeedingFocus((prev) => {
            const newSet = new Set(prev);
            newSet.delete(sectionId);
            return newSet;
          });
        }, 200);

        return () => clearTimeout(timer);
      }
    }, [sectionId, activeAccordionSection, sectionsNeedingFocus]);

    return (
      <div ref={editorRef} data-section-id={sectionId}>
        {sectionId === "resume-header" ? (
          <ResumeHeaderEditor content={content} onChange={onUpdate} />
        ) : (
          <TipTapResumeEditor
            content={content}
            onChange={onUpdate}
            appliedKeywords={appliedKeywords}
            suggestions={[]}
            sectionType={sectionId.replace("resume-", "")}
          />
        )}
      </div>
    );
  };

  /**
   * Handle reset operations (unchanged from original)
   */
  const handleLocalReset = useCallback(() => {
    if (!originalOptimizedText) return;

    setPreviewContent(originalOptimizedText);

    try {
      const normalizedContent = processContent(originalOptimizedText);
      const parsedSections = parseHtmlIntoSections(
        normalizedContent,
        getSectionName,
        SECTION_NAMES,
        SECTION_ORDER
      );

      const allSections = initializeAllSections(parsedSections);
      setSections(allSections);
      setContentModified(false);
      onTextChange(originalOptimizedText);
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

  const handleReset = useCallback(() => {
    handleLocalReset();
    if (onReset) {
      onReset();
    }
    setPreviewContent(originalOptimizedText || "");
    setContentModified(false);
    setHasBeenModified(false);
  }, [handleLocalReset, onReset, originalOptimizedText]);

  /**
   * Parse content into sections (unchanged from original)
   */
  useEffect(() => {
    if (editMode) return;
    if (!optimizedText && hasLoadedInitialContent) return;

    try {
      if (!optimizedText) {
        const emptySections = STANDARD_SECTIONS.map(({ id }) =>
          createEmptySection(id)
        );
        setSections(emptySections);

        // Set first section as active by default when entering edit mode
        if (emptySections.length > 0) {
          setActiveAccordionSection(emptySections[0].id);
        }

        setHasLoadedInitialContent(true);
        return;
      }

      const normalizedContent = processContent(optimizedText);
      const parsedSections = parseHtmlIntoSections(
        normalizedContent,
        getSectionName,
        SECTION_NAMES,
        SECTION_ORDER
      );

      const allSections = initializeAllSections(parsedSections);
      setSections(allSections);

      // Set first non-empty section as active by default
      const firstNonEmptySection = allSections.find(
        (section) => !section.isEmpty
      );
      if (firstNonEmptySection) {
        setActiveAccordionSection(firstNonEmptySection.id);
      } else if (allSections.length > 0) {
        setActiveAccordionSection(allSections[0].id);
      }

      setHasLoadedInitialContent(true);

      if (!previewContent) {
        setPreviewContent(normalizedContent);
      }
    } catch (error) {
      console.error("Error parsing optimized text into sections:", error);
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
      setActiveAccordionSection("resume-summary");
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
   * Notify parent when edit mode changes (unchanged)
   */
  useEffect(() => {
    if (isEditing === undefined && onEditModeChange) {
      onEditModeChange(localEditMode);
    }
  }, [localEditMode, onEditModeChange, isEditing]);

  /**
   * Initialize sections for edit mode (unchanged)
   */
  useEffect(() => {
    if (editMode) {
      console.log("Edit mode activated, preparing sections...");

      const contentToLoad = previewContent || optimizedText;

      if (contentToLoad) {
        try {
          const normalizedContent = processContent(contentToLoad);
          const parsedSections = parseHtmlIntoSections(
            normalizedContent,
            getSectionName,
            SECTION_NAMES,
            SECTION_ORDER
          );

          const allSections = initializeAllSections(parsedSections);
          setSections(allSections);

          // Auto-activate first section when entering edit mode
          if (allSections.length > 0 && !activeAccordionSection) {
            const firstSection =
              allSections.find((s) => !s.isEmpty) || allSections[0];
            setActiveAccordionSection(firstSection.id);
          }

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
    activeAccordionSection,
  ]);

  /**
   * Handle save (unchanged from original but with logging)
   */
  const handleSave = useCallback(async () => {
    if (isSaving) return;

    console.log("💾 Starting save operation...");

    try {
      setIsSaving(true);

      let combinedHtml = combineAllSections();
      combinedHtml = ensureSectionTitleClasses(combinedHtml);
      combinedHtml = processContent(combinedHtml);

      if (combinedHtml.length < 50) {
        toast.error("Content too short", {
          description: "Resume content must be at least 50 characters.",
        });
        setIsSaving(false);
        return;
      }

      const saveResult = await Promise.resolve(onSave(combinedHtml));

      if (saveResult) {
        setContentModified(false);
        setPreviewContent(combinedHtml);

        try {
          const normalizedContent = processContent(combinedHtml);
          const parsedSections = parseHtmlIntoSections(
            normalizedContent,
            getSectionName,
            SECTION_NAMES,
            SECTION_ORDER
          );

          const allSections = initializeAllSections(parsedSections);
          setSections(allSections);
        } catch (sectionError) {
          console.error(
            "Error parsing saved content into sections:",
            sectionError
          );
        }

        onTextChange(combinedHtml);

        if (isEditing === undefined) {
          setLocalEditMode(false);
        }
      } else {
        toast.error("Failed to save resume", {
          description: "An error occurred while saving your changes.",
        });
      }
    } catch (error) {
      console.error("Error saving resume:", error);
      toast.error("Failed to save resume", {
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
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
   * Other handlers (unchanged from original)
   */
  const openPreview = useCallback(() => {
    try {
      const contentToUse = previewContent || optimizedText;
      setIsPreviewModalOpen(true);
      console.log("Opening preview with template:", selectedTemplate);
    } catch (error) {
      console.error("Error opening preview:", error);
      toast.error("Failed to open preview");
    }
  }, [selectedTemplate, previewContent, optimizedText]);

  const handleClosePreviewModal = useCallback(() => {
    setIsPreviewModalOpen(false);
  }, []);

  const toggleEditMode = useCallback(() => {
    if (isEditing !== undefined) {
      if (onEditModeChange) {
        onEditModeChange(!isEditing);
      }
    } else {
      setLocalEditMode((prev) => !prev);
    }
  }, [isEditing, onEditModeChange]);

  // Show loading state during optimization
  if (isOptimizing) {
    return <LoadingState />;
  }

  const displayedContent = previewContent || optimizedText;
  const shouldEnableSave = contentModified || scoreModified || templateModified;

  return (
    <div className="bg-white border rounded-lg p-6">
      {/* Header with actions */}
      <PreviewHeader
        editMode={editMode}
        toggleEditMode={toggleEditMode}
        openPreview={openPreview}
        handleSave={handleSave}
        isSaving={isSaving}
        shouldEnableSave={shouldEnableSave}
        optimizedText={optimizedText}
        onReset={!editMode && onReset ? handleReset : undefined}
      />

      {/* Warning if no content is available */}
      {!optimizedText && <NoContentWarning />}

      {/* Modified indicator */}
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
          {/* ENHANCED: Accordion with auto-activation and focus management */}
          <Accordion
            type="single"
            className="space-y-4"
            value={activeAccordionSection}
            onValueChange={setActiveAccordionSection}
            collapsible
          >
            {sections.map((section) => (
              <AccordionItem
                key={section.id}
                value={section.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <AccordionTrigger
                  className="px-4 py-3 font-medium text-gray-800 hover:bg-gray-50 flex justify-between items-center"
                  onClick={() => handleAccordionSectionClick(section.id)}
                >
                  {section.title}
                  {section.isEmpty && (
                    <span className="text-xs text-gray-400 mr-2">(Empty)</span>
                  )}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-6">
                  {/* ENHANCED: Use EditorWrapper with focus management */}
                  <EditorWrapper
                    sectionId={section.id}
                    content={section.content}
                    onUpdate={(html) => handleSectionUpdate(section.id, html)}
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Action Buttons */}
          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={toggleEditMode}>
              <X className="h-4 w-4 mr-2" /> Cancel
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !shouldEnableSave}
              className="bg-brand-600 hover:bg-brand-700"
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
