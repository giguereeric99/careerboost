/**
 * ResumePreviewComponents
 * 
 * This file contains modular components extracted from ResumePreview
 * to reduce the file size and improve maintainability.
 */

import React from 'react';
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
import TipTapResumeEditor from '@/components/ResumeOptimizerSection/tipTapResumeEditor';
import { Suggestion } from '@/types/resume';
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';

/**
 * Interface for Section
 */
interface Section {
  id: string;
  title: string;
  content: string;
}

// ========== PreviewHeader Component ==========

/**
 * Props for PreviewHeader component
 */
interface PreviewHeaderProps {
  editMode: boolean;
  toggleEditMode: () => void;
  openPreview: () => void;
  handleSave: () => void;
  isSaving: boolean;
  contentModified: boolean;
  optimizedText: string;
  onReset?: () => void;
}

/**
 * Header section of the ResumePreview with action buttons
 */
export const PreviewHeader: React.FC<PreviewHeaderProps> = ({
  editMode,
  toggleEditMode,
  openPreview,
  handleSave,
  isSaving,
  contentModified,
  optimizedText,
  onReset
}) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      {editMode && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleEditMode}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Preview
        </Button>
      )}
      {!editMode && <h3 className="font-bold text-lg">Resume Preview</h3>}
      {editMode && <h3 className="font-bold text-lg">Edit Sections</h3>}
    </div>
    
    <div className="flex gap-2">
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
      
      {editMode && (
        <Button 
          size="sm" 
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
              <Save className="h-4 w-4 mr-2" /> Save Changes
            </>
          )}
        </Button>
      )}
    </div>
  </div>
);

// ========== PreviewContent Component ==========

/**
 * Props for PreviewContent component
 */
interface PreviewContentProps {
  optimizedText: string;
  combinedSections: string;
  sanitizeHtml: (html: string) => string;
  template: ResumeTemplateType;
  onDownload: () => void;
}

/**
 * Content display in preview mode
 */
export const PreviewContent: React.FC<PreviewContentProps> = ({
  optimizedText,
  combinedSections,
  sanitizeHtml,
  template,
  onDownload
}) => (
  <div>
    {/* Resume preview with spacing between sections */}
    <div className="resume-preview-content border rounded-lg overflow-hidden mb-4">
      {optimizedText ? (
        <div 
          className={`min-h-[600px] p-4 ${template.previewClass || ''}`}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(combinedSections) }}
        />
      ) : (
        <div className="p-6 min-h-[600px] flex items-center justify-center bg-gray-50">
          <p className="text-gray-400">No content to display</p>
        </div>
      )}
    </div>
    
    {/* Download button */}
    {optimizedText && (
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onDownload}
        >
          <Download className="h-4 w-4 mr-2" /> Download Resume
        </Button>
      </div>
    )}
  </div>
);

// ========== EditorContent Component ==========

/**
 * Props for EditorContent component
 */
interface EditorContentProps {
  sections: Section[];
  handleSectionUpdate: (sectionId: string, newContent: string) => void;
  appliedKeywords: string[];
  suggestions: Suggestion[];
  handleSave: () => void;
  isSaving: boolean;
  contentModified: boolean;
  toggleEditMode: () => void;
}

/**
 * Section editor in edit mode
 */
export const EditorContent: React.FC<EditorContentProps> = ({
  sections,
  handleSectionUpdate,
  appliedKeywords,
  suggestions,
  handleSave,
  isSaving,
  contentModified,
  toggleEditMode
}) => {
  const handleApplyKeyword = (keyword: string) => {
    console.log("Apply keyword:", keyword);
  };
  
  const handleApplySuggestion = (suggestion: Suggestion) => {
    console.log("Apply suggestion:", suggestion);
  };
  
  return (
    <div className="space-y-4">
      <Accordion type="single" className="space-y-4" defaultValue={sections.length > 0 ? sections[0].id : undefined}>
        {sections.map(section => (
          <AccordionItem key={section.id} value={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
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
 */
export const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-4">
    <div className="h-8 w-8 text-brand-600 mb-4 animate-pulse">
      ✨
    </div>
    <p className="text-lg font-medium">Optimizing your resume...</p>
    <p className="text-sm text-gray-500">Please wait while our AI analyzes and enhances your resume</p>
  </div>
);

// ========== NoContentWarning Component ==========

/**
 * Warning displayed when no content is available
 */
export const NoContentWarning: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-start gap-2">
    <span className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
    <p className="text-xs text-amber-700">
      No optimized content available. Please upload a resume or paste content to optimize.
    </p>
  </div>
);

// ========== AppliedKeywordsList Component ==========

/**
 * Props for AppliedKeywordsList component
 */
interface AppliedKeywordsListProps {
  keywords: string[];
}

/**
 * Display list of applied keywords
 */
export const AppliedKeywordsList: React.FC<AppliedKeywordsListProps> = ({ keywords }) => (
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