/**
 * ResumePreviewComponents
 *
 * This file contains modular components extracted from ResumePreview
 * to reduce the file size and improve maintainability.
 * Each component handles a specific part of the resume preview interface.
 */

import React from "react";
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
  AlertTriangle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import TipTapResumeEditor from "@/components/ResumeOptimizerSection/tipTapResumeEditor";
import { OptimizationSuggestion } from "@/types/suggestionTypes";
import { ResumeTemplateType } from "@/types/resumeTemplateTypes";

/**
 * Interface for Section
 * Defines the structure of a resume section for editing
 */
interface Section {
  id: string;
  title: string;
  content: string;
}

// ========== PreviewHeader Component ==========

/**
 * Props for PreviewHeader component
 * Controls the action buttons and navigation in the resume preview header
 */
interface PreviewHeaderProps {
  editMode: boolean; // Whether the resume is in edit mode
  toggleEditMode: () => void; // Function to toggle edit mode
  openPreview: () => void; // Function to open full preview in new window
  handleSave: () => void; // Function to save changes
  isSaving: boolean; // Whether changes are being saved
  contentModified: boolean; // Whether content has been modified
  scoreModified?: boolean; // Whether score has been modified
  optimizedText: string; // Resume content to display
  onReset?: () => void; // Optional callback for reset button
}

/**
 * Header section of the ResumePreview with action buttons
 * Displays different controls based on whether the resume is in edit or preview mode
 */
export const PreviewHeader: React.FC<PreviewHeaderProps> = ({
  editMode,
  toggleEditMode,
  openPreview,
  handleSave,
  isSaving,
  contentModified,
  scoreModified = false,
  optimizedText,
  onReset,
}) => {
  // Determine if save button should be enabled based on both content and score modifications
  const shouldEnableSave = contentModified || scoreModified;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {/* Back button in edit mode */}
        {editMode && (
          <Button variant="ghost" size="sm" onClick={toggleEditMode}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Preview
          </Button>
        )}
        {/* Title changes based on mode */}
        {!editMode && <h3 className="font-bold text-lg">Resume Preview</h3>}
        {editMode && <h3 className="font-bold text-lg">Edit Sections</h3>}
      </div>

      <div className="flex gap-2">
        {/* Buttons for preview mode */}
        {!editMode && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={openPreview}
              disabled={!optimizedText}
            >
              <Eye className="h-4 w-4 mr-2" /> Full Preview
            </Button>

            {/* Reset button - only visible if onReset is provided */}
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                disabled={!optimizedText}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={toggleEditMode}
              disabled={!optimizedText}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          </>
        )}

        {/* Save button for edit mode */}
        {editMode && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !shouldEnableSave} // Enabled only when modified and not saving
            className="bg-brand-600 hover:bg-brand-700"
          >
            {isSaving ? (
              // Loading spinner when saving
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Saving...
              </>
            ) : (
              // Regular save button when not saving
              <>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

// ========== PreviewContent Component ==========

/**
 * Props for PreviewContent component
 * Controls the display of the resume content in preview mode
 */
interface PreviewContentProps {
  optimizedText: string; // Resume content to display
  combinedSections: string; // Combined HTML of all sections
  sanitizeHtml: (html: string) => string; // Function to sanitize HTML content
  template: ResumeTemplateType; // Selected visual template
  onDownload: () => void; // Function to download resume
}

/**
 * Content display in preview mode
 * Shows the resume content with the selected template and a download button
 */
export const PreviewContent: React.FC<PreviewContentProps> = ({
  optimizedText,
  combinedSections,
  sanitizeHtml,
  template,
  onDownload,
}) => (
  <div>
    {/* Resume preview with spacing between sections */}
    <div className="resume-preview-content border rounded-lg overflow-hidden mb-4">
      {optimizedText ? (
        // Display formatted resume content if available
        <div
          className={`min-h-[600px] p-4 ${template.previewClass || ""}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(combinedSections) }}
        />
      ) : (
        // Empty state when no content is available
        <div className="p-6 min-h-[600px] flex items-center justify-center bg-gray-50">
          <p className="text-gray-400">No content to display</p>
        </div>
      )}
    </div>

    {/* Download button - only shown when content exists */}
    {optimizedText && (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" /> Download Resume
        </Button>
      </div>
    )}
  </div>
);

// ========== EditorContent Component ==========

/**
 * Props for EditorContent component
 * Controls the section-based editor in edit mode
 */
interface EditorContentProps {
  sections: Section[]; // Resume sections to edit
  handleSectionUpdate: (sectionId: string, newContent: string) => void; // Function to update section content
  appliedKeywords: string[]; // Keywords applied to the resume
  suggestions: OptimizationSuggestion[]; // Suggestions for improvement
  handleSave: () => void; // Function to save changes
  isSaving: boolean; // Whether changes are being saved
  contentModified: boolean; // Whether content has been modified
  scoreModified?: boolean; // Whether score has been modified
  toggleEditMode: () => void; // Function to toggle edit mode
}

/**
 * Section editor in edit mode
 * Provides an accordion interface for editing each section of the resume
 */
export const EditorContent: React.FC<EditorContentProps> = ({
  sections,
  handleSectionUpdate,
  appliedKeywords,
  suggestions,
  handleSave,
  isSaving,
  contentModified,
  scoreModified = false,
  toggleEditMode,
}) => {
  // Function to handle keyword application
  const handleApplyKeyword = (keyword: string) => {
    console.log("Apply keyword:", keyword);
  };

  // Function to handle suggestion application
  const handleApplySuggestion = (suggestion: OptimizationSuggestion) => {
    console.log("Apply suggestion:", suggestion);
  };

  // Determine if save button should be enabled
  const shouldEnableSave = contentModified || scoreModified;

  return (
    <div className="space-y-4">
      {/* Accordion for sections editing */}
      <Accordion
        type="single"
        className="space-y-4"
        defaultValue={sections.length > 0 ? sections[0].id : undefined}
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.id}
            value={section.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 font-medium text-gray-800 hover:bg-gray-50 flex justify-between items-center">
              {section.title}
            </AccordionTrigger>
            <AccordionContent className="p-4 pt-6">
              <TipTapResumeEditor
                content={section.content}
                onChange={(html) => handleSectionUpdate(section.id, html)}
                appliedKeywords={appliedKeywords}
                onApplyKeyword={handleApplyKeyword}
                suggestions={suggestions}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Action buttons */}
      <div className="pt-4 flex justify-end gap-2">
        {/* Cancel button */}
        <Button variant="outline" size="sm" onClick={toggleEditMode}>
          Cancel
        </Button>

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !shouldEnableSave} // Uses combined state for enablement
          className="bg-brand-600 hover:bg-brand-700"
        >
          {isSaving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Saving Changes...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" /> Save & Apply Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// ========== LoadingState Component ==========

/**
 * Loading state displayed during optimization process
 * Shows an animated indicator with loading text
 */
export const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-4">
    <div className="h-8 w-8 text-brand-600 mb-4 animate-pulse">✨</div>
    <p className="text-lg font-medium">Optimizing your resume...</p>
    <p className="text-sm text-gray-500">
      Please wait while our AI analyzes and enhances your resume
    </p>
  </div>
);

// ========== NoContentWarning Component ==========

/**
 * Warning displayed when no content is available
 * Shows an alert with instructions for the user
 */
export const NoContentWarning: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2">
    <span className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
    <p className="text-xs text-amber-700">
      No optimized content available. Please upload a resume or paste content to
      optimize.
    </p>
  </div>
);

// ========== UnsavedChangesWarning Component ==========

/**
 * Warning displayed when there are unsaved changes
 * Shows an alert with instructions to save changes
 */
export const UnsavedChangesWarning: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded p-2 mb-4 text-sm text-amber-700 flex items-center">
    <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 flex-shrink-0" />
    You have unsaved changes. Click "Save Changes" to apply your modifications.
  </div>
);

// ========== AppliedKeywordsList Component ==========

/**
 * Props for AppliedKeywordsList component
 * Controls the display of applied keywords
 */
interface AppliedKeywordsListProps {
  keywords: string[]; // List of keyword strings to display
}

/**
 * Display list of applied keywords
 * Shows tags for each applied keyword
 */
export const AppliedKeywordsList: React.FC<AppliedKeywordsListProps> = ({
  keywords,
}) => (
  <div className="mt-4">
    <h4 className="text-sm font-medium mb-2">Applied Keywords</h4>
    <div className="flex flex-wrap gap-1">
      {keywords.map((keyword, index) => (
        <span
          key={index}
          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
        >
          {keyword}
        </span>
      ))}
    </div>
  </div>
);
