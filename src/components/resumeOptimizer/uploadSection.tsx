import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle } from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";
import { toast } from "sonner";
import "@uploadthing/react/styles.css";

interface UploadSectionProps {
  isUploading: boolean;
  isParsing: boolean;
  selectedFile: File | null;
  resumeContent: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onContinue: () => void;
  onFileUpload: (url: string, name: string) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({
  isUploading,
  isParsing,
  selectedFile,
  resumeContent,
  onFileChange,
  onContentChange,
  onContinue,
  onFileUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    toast.loading("Uploading " + file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const result = await res.json();

      if (result?.fileUrl) {
        onFileUpload(result.fileUrl, file.name);
        toast.success("Resume uploaded and optimized");
      } else {
        toast.error("No result returned from optimization.");
      }
    } catch (err: any) {
      toast.error("Error uploading resume", {
        description: err.message,
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h3 className="font-medium">Upload your resume</h3>
            <p className="text-sm text-muted-foreground">
              Upload a file or paste your resume content below
            </p>
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 py-6 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors">
            <div className="rounded-full bg-blue-50 p-3">
              <FileUp className="h-6 w-6 text-brand-600" />
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              className={`transition-all w-full text-center border-2 border-dashed rounded-md p-4 cursor-pointer ${isDragOver ? "bg-blue-50 border-blue-400" : "border-gray-300"}`}
            >
              Drag & Drop your resume here or use the button below.
            </div>

            <div className="relative w-full flex justify-center items-center flex-col">
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
                  <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                </div>
              )}

              <div className="mb-3">Or</div>

              <UploadButton
                className="ut-button:bg-blue-600 ut-button:text-white ut-button:rounded-md ut-button:px-4 ut-button:py-2 ut-button:hover:hover:bg-primary/90"
                endpoint="resumeUploader"
                onClientUploadComplete={(res) => {
                  if (!res?.[0]?.url) return;
                  onFileUpload(res[0].url, res[0].name);
                  toast.message("Upload successful", {
                    description: `File: ${res[0].name}`,
                  });
                }}
                onUploadError={(error) => {
                  toast.error("Upload error", {
                    description: error.message,
                  });
                }}
              />
            </div>

            {selectedFile && (
              <div className="flex items-center text-sm bg-brand-50 text-brand-600 px-3 py-1 rounded-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                {selectedFile.name}
              </div>
            )}
          </div>

          <div className="space-y-4">
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
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onContinue}
              disabled={isUploading || isParsing || resumeContent.length < 50}
            >
              {isParsing ? "Analyzing..." : "Continue"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadSection;