'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useResumeOptimizer } from '@/hooks/useResumeOptimizer';
import { ResumeData } from '@/services/resumeParser';

// Import refactored components
import UploadSection from '@/components/resumeOptimizer/uploadSection';
import ResumePreview from '@/components/resumeOptimizer/resumePreview';
import ScoreCard from '@/components/resumeOptimizer/scoreCard';
import SuggestionsList from '@/components/resumeOptimizer/suggestionsList';
import KeywordList from '@/components/resumeOptimizer/keywordList';
import TemplateGallery from '@/components/resumeOptimizer/templateGallery';
import ProUpgradeDialog from '@/components/resumeOptimizer/proUpgradeDialog';
import { resumeTemplates } from '../../constants/resumeTemplates';

const ResumeOptimizer = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [resumeContent, setResumeContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("basic");
  const [showProDialog, setShowProDialog] = useState(false);
  const [rawText, setRawText] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const {
    isUploading,
    isOptimizing,
    resumeData,
    optimizedData,
    suggestions,
    optimizationScore,
    handleFileUpload,
    optimizeResumeData,
    applyTemplateToResume,
    applySuggestion,
    optimize,
    optimizedText,
    loading,
    fallbackUsed,
    language,
  } = useResumeOptimizer();

  // Keywords the AI suggested to add
  const [keywords, setKeywords] = useState([
    { text: "React", applied: false },
    { text: "TypeScript", applied: false },
    { text: "Next.js", applied: false },
    { text: "Tailwind CSS", applied: false },
    { text: "UI/UX", applied: false }
  ]);

  // Resume sections for the preview
  const [resumeSections, setResumeSections] = useState({
    personalInfo: {
      name: "John Doe",
      title: "Frontend Developer",
      contact: "New York, NY | john.doe@example.com | (123) 456-7890",
      about: "Passionate frontend developer with 5+ years of experience building responsive web applications using React and TypeScript."
    },
    experience: [
      {
        title: "Senior Frontend Developer",
        company: "TechCorp Inc.",
        period: "Jan 2020 - Present",
        location: "New York, NY",
        achievements: [
          "Led the development of a customer portal that increased user engagement by 35%",
          "Implemented CI/CD pipeline that reduced deployment time by 40%",
          "Mentored junior developers and conducted code reviews"
        ]
      },
      {
        title: "Frontend Developer",
        company: "WebSolutions LLC",
        period: "Jun 2017 - Dec 2019",
        location: "Boston, MA",
        achievements: [
          "Developed responsive UI components using React and Redux",
          "Optimized application performance by reducing load time by 25%",
          "Collaborated with designers to implement UI/UX improvements"
        ]
      }
    ],
    education: {
      degree: "BS in Computer Science",
      school: "Boston University",
      year: "2017",
      gpa: "3.8/4.0"
    },
    skills: [
      "React", "TypeScript", "JavaScript", "HTML/CSS", "Redux", "Jest"
    ]
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      toast({
        title: "Processing resume",
        description: "Please wait while we analyze your resume..."
      });
      
      const data = await handleFileUpload(file);
      
      if (data) {
        updateResumePreview(data);
        setActiveTab("preview");
      }
    }
  };
  
  const updateResumePreview = (data: ResumeData) => {
    // Update resume preview with parsed data
    setResumeSections({
      personalInfo: {
        name: data.fullName || "Your Name",
        title: data.title || "Professional Title",
        contact: data.location ? `${data.location} | ${data.email || ''} | ${data.phone || ''}` : 
                `${data.email || ''} ${data.phone ? '| ' + data.phone : ''}`,
        about: data.summary || "Professional summary"
      },
      experience: data.experience?.map(exp => ({
        title: exp.position,
        company: exp.company,
        period: `${exp.startDate} - ${exp.endDate || 'Present'}`,
        location: exp.location || '',
        achievements: exp.description || []
      })) || [],
      education: data.education?.length > 0 ? {
        degree: data.education[0].degree,
        school: data.education[0].institution,
        year: data.education[0].endDate,
        gpa: data.education[0].gpa || ''
      } : {},
      skills: data.skills || []
    });
    
    // If we have parsed data, let's optimize it
    if (data) {
      optimizeResumeData(data);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setResumeContent(e.target.value);
  };

  const handleContinue = async () => {
    if (resumeContent.length > 50) {
      toast({
        title: "Processing resume content",
        description: "Please wait while we analyze your text..."
      });
      
      // Create a temporary file from the text content
      const blob = new Blob([resumeContent], { type: 'text/plain' });
      const file = new File([blob], "resume.txt", { type: "text/plain" });
      
      const data = await handleFileUpload(file);
      
      if (data) {
        updateResumePreview(data);
        setActiveTab("preview");
      }
    } else {
      toast({
        title: "Content too short",
        description: "Please provide more detailed resume content."
      });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = resumeTemplates.find(t => t.id === templateId);
    
    if (template?.isPro) {
      setShowProDialog(true);
    } else {
      setSelectedTemplate(templateId);
      applyTemplateToResume(templateId);
    }
  };

  const handleKeywordApply = (index: number) => {
    const updatedKeywords = [...keywords];
    updatedKeywords[index].applied = !updatedKeywords[index].applied;
    setKeywords(updatedKeywords);
    
    applySuggestion(index);
  };

  const handleDownload = () => {
    toast({
      title: "Resume downloaded",
      description: "Your optimized resume has been downloaded."
    });
  };

  const handleSave = () => {
    toast({
      title: "Resume saved",
      description: "Your optimized resume has been saved to your account."
    });
  };

  // Get applied keywords as array of strings
  const appliedKeywords = keywords
    .filter(keyword => keyword.applied)
    .map(keyword => keyword.text);

  const handleSubmit = async () => {
    if (!fileUrl && !rawText) {
      toast.error("Missing input", {
        description: "Please upload a resume or paste its content.",
      });
      return;
    }
  
    toast.loading("Analyzing your resume...");
  
    const form = new FormData();
    if (fileUrl) form.append("fileUrl", fileUrl);
    if (rawText) form.append("rawText", rawText);
    form.append("userId", user?.id || "anonymous");
  
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        body: form,
      });
  
      if (!res.ok) {
        const err = await res.json();
        toast.error("Analysis failed", {
          description: err.error || "Unexpected error occurred.",
        });
        return;
      }
  
      const result = await res.json();
      toast.success("Resume optimized successfully", {
        description: `Language detected: ${result.language}`,
      });
  
      // Stocke le résultat ou mets à jour l'état
      setOptimizedText(result.optimizedText);
      setDetectedLang(result.language);
      setActiveTab("preview");
  
    } catch (err: any) {
      toast.error("Unexpected error", {
        description: err.message,
      });
    }
  };
    

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold">AI Resume Optimizer</h2>
        <p className="text-gray-500">Perfect your resume with AI-powered suggestions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-5xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="upload">Upload Resume</TabsTrigger>
          <TabsTrigger value="preview">Optimize & Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-4">
        <UploadSection
          isUploading={loading}
          isParsing={loading}
          selectedFile={selectedFile}
          resumeContent={rawText}
          onFileChange={() => {}} // facultatif ici
          onContentChange={(e) => setRawText(e.target.value)}
          onContinue={handleSubmit}
          onFileUpload={(url, name) => {
            setFileUrl(url);
            setFileName(name);
            setSelectedFile(new File([""], name, { type: "application/octet-stream" })); // Simule le File pour affichage
          }}
        />
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-6">
          <div className="grid md:grid-cols-5 gap-6">
            <div className="col-span-3">
              <ResumePreview
                resumeSections={resumeSections}
                selectedTemplate={selectedTemplate}
                templates={resumeTemplates}
                appliedKeywords={appliedKeywords}
                onDownload={handleDownload}
                onSave={handleSave}
                isOptimizing={isOptimizing}
              />
            </div>
            
            <div className="col-span-2 flex flex-col gap-4">
              <ScoreCard optimizationScore={optimizationScore} />

              <SuggestionsList
                suggestions={suggestions}
                isOptimizing={isOptimizing}
                onApplySuggestion={applySuggestion}
              />
              
              <KeywordList
                keywords={keywords}
                onKeywordApply={handleKeywordApply}
              />

              <TemplateGallery
                templates={resumeTemplates}
                selectedTemplate={selectedTemplate}
                onTemplateSelect={handleTemplateSelect}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ProUpgradeDialog
        open={showProDialog}
        onOpenChange={setShowProDialog}
      />
    </div>
  );
};

export default ResumeOptimizer;