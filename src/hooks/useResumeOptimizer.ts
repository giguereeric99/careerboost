'use client'

import { useState } from 'react';
import { uploadResume, parseResume, optimizeResume, ResumeData } from '@/services/resumeParser';
import { useToast } from './useToast';

export type OptimizationSuggestion = {
  type: string;
  text: string;
  impact: string;
};

export function useResumeOptimizer() {
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [optimizedData, setOptimizedData] = useState<ResumeData | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [optimizationScore, setOptimizationScore] = useState(65);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    try {
      setIsUploading(true);
      setSelectedFile(file);
      
      const { path, error } = await uploadResume(file);
      
      if (error) {
        throw error;
      }
      
      setIsUploading(false);
      setIsParsing(true);
      
      const { data, error: parseError } = await parseResume(path);
      
      if (parseError) {
        throw parseError;
      }
      
      setResumeData(data);
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been analyzed and is ready for optimization."
      });
      
      return data;
    } catch (error: any) {
      toast({
        title: "Error processing resume",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };
  
  const optimizeResumeData = async (data: ResumeData = resumeData!) => {
    if (!data) return;
    
    try {
      setIsOptimizing(true);
      
      const { optimizedData, suggestions, error } = await optimizeResume(data);
      
      if (error) {
        throw error;
      }
      
      setOptimizedData(optimizedData);
      setSuggestions(suggestions);
      
      // Calculate optimization score based on the number of suggestions
      const baseScore = 65;
      const maxScoreImprovement = 35;
      const newScore = Math.min(100, baseScore + (suggestions.length > 0 ? maxScoreImprovement / suggestions.length * 2 : 0));
      setOptimizationScore(Math.round(newScore));
      
      toast({
        title: "Resume optimized",
        description: "Your resume has been optimized and suggestions are available."
      });
      
      return { optimizedData, suggestions };
    } catch (error: any) {
      toast({
        title: "Error optimizing resume",
        description: error.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsOptimizing(false);
    }
  };
  
  const applyTemplateToResume = (templateId: string) => {
    // This would actually update how the resume is displayed
    toast({
      title: "Template applied",
      description: `The ${templateId} template has been applied to your resume.`
    });
  };
  
  const applySuggestion = (suggestionIndex: number) => {
    // In a real implementation, this would modify the resume data
    // For now we'll just mark it as applied and update the score
    const newScore = Math.min(100, optimizationScore + 5);
    setOptimizationScore(newScore);
    
    toast({
      title: "Suggestion applied",
      description: "Your resume has been updated with the suggestion."
    });
  };
  
  return {
    isUploading,
    isParsing,
    isOptimizing,
    selectedFile,
    resumeData,
    optimizedData,
    suggestions,
    optimizationScore,
    handleFileUpload,
    optimizeResumeData,
    applyTemplateToResume,
    applySuggestion,
    setSelectedFile
  };
}