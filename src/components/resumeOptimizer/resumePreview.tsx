import React from 'react';
import { Button } from "@/components/ui/button";
import { Download, Save } from "lucide-react";
import { ResumeTemplateType } from '../../types/resumeTemplateTypes';

export interface ResumeSection {
  personalInfo: {
    name: string;
    title: string;
    contact: string;
    about: string;
  };
  experience: {
    title: string;
    company: string;
    period: string;
    location: string;
    achievements: string[];
  }[];
  education: {
    degree: string;
    school: string;
    year: string;
    gpa?: string;
  };
  skills: string[];
}

interface ResumePreviewProps {
  resumeSections: ResumeSection;
  selectedTemplate: string;
  templates: ResumeTemplateType[];
  appliedKeywords: string[];
  onDownload: () => void;
  onSave: () => void;
  isOptimizing: boolean;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({
  resumeSections,
  selectedTemplate,
  templates,
  appliedKeywords,
  onDownload,
  onSave,
  isOptimizing,
}) => {
  const template = templates.find(t => t.id === selectedTemplate) || templates[0];
  
  if (isOptimizing) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-4">
        <div className="h-8 w-8 text-brand-600 mb-4 animate-pulse">
          {/* Sparkles icon would go here but we'll use CSS for animation */}
          ✨
        </div>
        <p className="text-lg font-medium">Optimizing your resume...</p>
        <p className="text-sm text-gray-500">Please wait while our AI analyzes and enhances your resume</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Resume Preview</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
          <Button size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-2" /> Save
          </Button>
        </div>
      </div>
      
      <div className={`border rounded-lg p-4 min-h-[500px] ${template.previewClass}`}>
        <div className="text-xl font-bold mb-1">{resumeSections.personalInfo.name}</div>
        <div className="text-sm text-gray-500 mb-3">
          {resumeSections.personalInfo.title} | {resumeSections.personalInfo.contact}
        </div>
        
        <div className="mb-4">
          <div className="font-medium border-b pb-1 mb-2">Professional Summary</div>
          <p className="text-sm">{resumeSections.personalInfo.about}</p>
        </div>
        
        <div className="mb-4">
          <div className="font-medium border-b pb-1 mb-2">Experience</div>
          {resumeSections.experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <div className="font-medium text-sm">{exp.title}</div>
                <div className="text-xs text-gray-500">{exp.period}</div>
              </div>
              <div className="text-xs mb-1">{exp.company}, {exp.location}</div>
              <ul className="text-xs list-disc list-inside space-y-1">
                {exp.achievements.map((achievement, j) => (
                  <li key={j}>{achievement}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mb-4">
          <div className="font-medium border-b pb-1 mb-2">Education</div>
          <div className="text-xs">
            <div className="font-medium">{resumeSections.education.degree}</div>
            <div>{resumeSections.education.school}, {resumeSections.education.year}</div>
            {resumeSections.education.gpa && <div>GPA: {resumeSections.education.gpa}</div>}
          </div>
        </div>
        
        <div>
          <div className="font-medium border-b pb-1 mb-2">Skills</div>
          <div className="flex flex-wrap gap-1 text-xs">
            {resumeSections.skills.map((skill, i) => (
              <span key={i} className="bg-gray-100 px-2 py-1 rounded">{skill}</span>
            ))}
            {appliedKeywords.map((keyword, i) => (
              <span key={`new-${i}`} className="bg-brand-100 text-brand-700 px-2 py-1 rounded animate-pulse-subtle">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumePreview;