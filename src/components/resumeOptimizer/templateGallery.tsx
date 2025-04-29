/**
 * Enhanced Template Gallery Component
 * 
 * Displays available resume templates with improved visual design
 * Allows users to select a template for their resume
 */
import React from 'react';
import { ResumeTemplateType } from '@/types/resumeTemplateTypes';
import { Crown } from 'lucide-react';

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
    <div className="bg-white border rounded-lg p-6 mt-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4">Choose Template</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="relative group">
            {/* Template Preview Card */}
            <div 
              className={`
                border rounded-lg overflow-hidden transition-all duration-200 cursor-pointer
                ${selectedTemplate === template.id ? 'ring-2 ring-brand-600 shadow-md' : 'hover:shadow-md'}
                ${template.isPro ? 'bg-gradient-to-b from-white to-gray-50' : 'bg-white'}
              `}
              onClick={() => onTemplateSelect(template.id)}
            >
              {/* Preview Thumbnail */}
              <div className="aspect-[8.5/11] p-2 flex items-center justify-center overflow-hidden">
                {/* Template preview visualization */}
                <div className={`
                  w-full h-full flex flex-col 
                  ${template.previewClass}
                  border shadow-sm
                `}>
                  {/* Header preview */}
                  <div className="h-[15%] border-b flex flex-col justify-center items-center">
                    <div className="w-[40%] h-3 bg-gray-300 rounded-full mb-1"></div>
                    <div className="w-[60%] h-2 bg-gray-200 rounded-full"></div>
                  </div>
                  
                  {/* Content preview */}
                  <div className="flex-1 p-2">
                    {/* Experience section */}
                    <div className="mb-2">
                      <div className="w-[40%] h-2 bg-gray-300 rounded-full mb-2"></div>
                      <div className="w-full h-1 bg-gray-200 rounded-full mb-1"></div>
                      <div className="w-full h-1 bg-gray-200 rounded-full mb-1"></div>
                      <div className="w-[80%] h-1 bg-gray-200 rounded-full"></div>
                    </div>
                    
                    {/* Education section */}
                    <div className="mb-2">
                      <div className="w-[30%] h-2 bg-gray-300 rounded-full mb-2"></div>
                      <div className="w-full h-1 bg-gray-200 rounded-full mb-1"></div>
                      <div className="w-[70%] h-1 bg-gray-200 rounded-full"></div>
                    </div>
                    
                    {/* Skills section */}
                    <div>
                      <div className="w-[20%] h-2 bg-gray-300 rounded-full mb-2"></div>
                      <div className="w-full h-1 bg-gray-200 rounded-full mb-1"></div>
                      <div className="w-[90%] h-1 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Template Info */}
              <div className="p-3 border-t bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  {template.isPro && (
                    <span className="inline-flex items-center text-[10px] text-amber-600 font-semibold">
                      <Crown className="h-3 w-3 mr-0.5" /> PRO
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
              </div>
              
              {/* Selected Indicator */}
              {selectedTemplate === template.id && (
                <div className="absolute top-2 right-2 bg-brand-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm">
                  ✓
                </div>
              )}
            </div>
            
            {/* Pro Template Overlay */}
            {template.isPro && (
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none">
                <div className="bg-white/90 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm text-amber-700 flex items-center">
                  <Crown className="h-3 w-3 mr-1 text-amber-600" /> 
                  Upgrade to PRO
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateGallery;