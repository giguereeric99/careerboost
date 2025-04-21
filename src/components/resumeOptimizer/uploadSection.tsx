import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, CheckCircle } from "lucide-react";
import { UploadButton } from "@/utils/uploadthing";
import { toast } from "sonner";
import { useUser, SignInButton } from "@clerk/nextjs";

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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { isSignedIn } = useUser();

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!isSignedIn) {
      toast.error("You must be signed in to upload a resume.");
      return;
    }

    toast.loading("Uploading " + file.name);
    setUploadProgress(0);

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
        setUploadProgress(100);
        setTimeout(() => setUploadProgress(0), 2000);
      } else {
        throw new Error("Missing fileUrl in response");
      }
    } catch (err: any) {
      toast.error("Error uploading resume", {
        description: err.message,
      });
      setUploadProgress(0);
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

            

            <div className="relative w-full flex justify-center items-center">
              {isSignedIn ? (
                <UploadButton
                  className="custom-btn ut-button:bg-blue-600 ut-button:text-white ut-button:rounded-md ut-button:px-4 ut-button:py-2 ut-button:hover:hover:bg-primary/90"
                  endpoint="resumeUploader"
                  onClientUploadComplete={async (res) => {
                    if (!res?.[0]?.url) return;
                    const fileUrl = res[0].url;
                    const fileName = res[0].name;

                    toast.loading("Analyzing uploaded resume...");

                    const formData = new FormData();
                    formData.append("fileUrl", fileUrl);

                    try {
                      const optimizeRes = await fetch("/api/optimize", {
                        method: "POST",
                        body: formData,
                      });

                      const result = await optimizeRes.json();

                      if (optimizeRes.ok && result?.fileUrl) {
                        onFileUpload(fileUrl, fileName);
                        setUploadProgress(100);
                        toast.success("Resume uploaded and optimized");
                        setTimeout(() => setUploadProgress(0), 2000);
                      } else {
                        throw new Error(result?.error || "Optimization failed");
                      }
                    } catch (err: any) {
                      toast.error("Upload analysis error", {
                        description: err.message,
                      });
                      setUploadProgress(0);
                    }
                  }}
                  onUploadError={(error) => {
                    toast.error("Upload error", {
                      description: error.message,
                    });
                  }}
                />
              ) : (
                <SignInButton mode="modal">
                  <Button className="w-full">You must be signed in to upload</Button>
                </SignInButton>
              )}
            </div>

            {uploadProgress === 100 && (
              <div className="flex items-center text-sm bg-green-50 text-green-600 px-3 py-1 rounded-full animate-fade-in-up">
                <CheckCircle className="h-4 w-4 mr-2 animate-scale-in" />
                Upload complete
              </div>
            )}

            {selectedFile && (
              <div className="mt-2 text-sm text-muted-foreground animate-fade-in-up">
                <span className="font-medium">Uploaded file:</span> {selectedFile.name}
                <div className="text-xs text-gray-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB, {selectedFile.type || "unknown type"})
                </div>
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
              onClick={() => {
                onContinue();
                toast.success("Resume analysis completed");
              }}
              disabled={isUploading || isParsing || resumeContent.length < 50}
            >
              {isParsing ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Analyzing...
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadSection;
