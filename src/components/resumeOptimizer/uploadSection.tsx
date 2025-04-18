import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle } from "lucide-react";

interface UploadSectionProps {
  isUploading: boolean;
  isParsing: boolean;
  selectedFile: File | null;
  resumeContent: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onContinue: () => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({
  isUploading,
  isParsing,
  selectedFile,
  resumeContent,
  onFileChange,
  onContentChange,
  onContinue,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardContent className="pt-6">
        <div 
          className="flex flex-col items-center justify-center space-y-4 py-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="rounded-full bg-blue-50 p-3">
            <FileUp className="h-6 w-6 text-brand-600" />
          </div>
          <div className="space-y-2 text-center">
            <h3 className="font-medium">Upload your resume</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop or click to upload (PDF, DOCX, TXT)
            </p>
          </div>
          <input 
            ref={fileInputRef}
            id="file-upload"
            type="file" 
            accept=".pdf,.doc,.docx,.txt" 
            className="hidden" 
            onChange={onFileChange}
            disabled={isUploading || isParsing}
          />
          <div className="w-full max-w-sm">
            <Button 
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isParsing}
            >
              {isUploading ? 'Uploading...' : isParsing ? 'Analyzing...' : 'Choose File'}
            </Button>
          </div>
          {selectedFile && (
            <div className="flex items-center text-sm bg-brand-50 text-brand-600 px-3 py-1 rounded-full">
              <CheckCircle className="h-4 w-4 mr-2" /> 
              {selectedFile.name}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Or paste your resume content:</p>
            {resumeContent && (
              <span className="text-xs text-muted-foreground">
                {resumeContent.length} characters
              </span>
            )}
          </div>
          <Textarea 
            placeholder="Paste your resume content here..." 
            className="min-h-[200px]"
            value={resumeContent}
            onChange={onContentChange}
          />
          <div className="flex justify-end">
            <Button 
              onClick={onContinue}
              disabled={isUploading || isParsing || resumeContent.length < 50}
            >
              {isParsing ? 'Analyzing...' : 'Continue'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadSection;