import React from 'react';
import { ResumeTemplateType } from './types/resumeTemplateTypes';

interface TemplateGalleryProps {
  templates: ResumeTemplateType[];
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
}

const TemplateGallery: React.FC<TemplateGalleryProps> = ({ 
  templates, 
  selectedTemplate, 
  onTemplateSelect 
}) => {
  return (
    <div className="bg-gray-100 border rounded-lg p-4 mt-4">
      <h3 className="font-medium mb-3">Template Gallery</h3>
      <div className="grid grid-cols-3 gap-3">
        {templates.map(template => (
          <div key={template.id} className="relative">
            <div 
              className={`border bg-white aspect-[3/4] rounded overflow-hidden p-2 shadow-sm cursor-pointer transition-all ${selectedTemplate === template.id ? 'ring-2 ring-brand-600' : 'hover:shadow-md'}`}
              onClick={() => onTemplateSelect(template.id)}
            >
              <div className={`h-full ${template.previewClass}`}></div>
            </div>
            <p className="text-xs text-center mt-1">{template.name}</p>
            {template.isPro && (
              <div className="absolute top-1 right-1">
                <span className="text-[10px] bg-gradient-to-r from-brand-600 to-teal-600 text-white px-1.5 py-0.5 rounded-full">PRO</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateGallery;