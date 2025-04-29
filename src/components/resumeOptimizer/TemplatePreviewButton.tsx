/**
 * Template Preview Button Component
 * 
 * A button that opens a modal to preview the resume with applied template
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import ResumePreviewModal from './ResumePreviewModal';
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';
import { getTemplateById } from '@/constants/resumeTemplates';

interface TemplatePreviewButtonProps {
  resumeContent: string;
  selectedTemplateId: string;
  children?: React.ReactNode;
}

/**
 * TemplatePreviewButton component
 * Shows a button to preview the resume and manages the preview modal state
 */
const TemplatePreviewButton: React.FC<TemplatePreviewButtonProps> = ({
  resumeContent,
  selectedTemplateId,
  children
}) => {
  // State for modal visibility
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Get the selected template from the template ID
  const selectedTemplate = getTemplateById(selectedTemplateId);
  
  // Open the preview modal
  const handleOpenPreview = () => {
    setIsPreviewOpen(true);
  };
  
  return (
    <>
      {/* Preview Button */}
      <Button
        variant="outline"
        onClick={handleOpenPreview}
        className="flex items-center gap-2"
        disabled={!resumeContent}
      >
        <Eye className="h-4 w-4" />
        {children || "Preview"}
      </Button>
      
      {/* Preview Modal */}
      <ResumePreviewModal
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        resumeContent={resumeContent}
        selectedTemplate={selectedTemplate}
      />
    </>
  );
};

export default TemplatePreviewButton;