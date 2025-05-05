import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, LoaderIcon } from "lucide-react";

interface AnalysisDialogProps {
  open: boolean;
  isAnalyzing: boolean;
  onComplete: () => void;
}

const AnalysisDialog: React.FC<AnalysisDialogProps> = ({
  open,
  isAnalyzing,
  onComplete
}) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px] bg-white" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle>
            {isAnalyzing ? "Analyzing Your Resume" : "Analysis Complete!"}
          </DialogTitle>
          <DialogDescription>
            {isAnalyzing 
              ? "Please wait while we optimize your resume content..."
              : "Your resume has been successfully analyzed and optimized."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center py-6">
          {isAnalyzing ? (
            <LoaderIcon className="h-12 w-12 text-blue-500 animate-spin mb-4" />
          ) : (
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
          )}
          
          <p className="text-center text-sm text-gray-600 mb-4">
            {isAnalyzing 
              ? "This may take a few moments..." 
              : "Click below to view your optimized resume"
            }
          </p>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={onComplete}
            disabled={isAnalyzing}
            className={!isAnalyzing ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {isAnalyzing ? "Analyzing..." : "Continue to Preview"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisDialog;