import React from 'react';
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyPreviewStateProps {
  onGoToUpload: () => void;
}

const EmptyPreviewState: React.FC<EmptyPreviewStateProps> = ({ onGoToUpload }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] border rounded-lg p-4">
      <Sparkles className="h-12 w-12 text-brand-600 mb-4" />
      <p className="text-lg font-medium">No resume data available</p>
      <p className="text-sm text-gray-500 text-center max-w-md">
        Upload a resume or paste content to get started with AI optimization
      </p>
      <Button 
        className="mt-4"
        onClick={onGoToUpload}
      >
        Go to Upload
      </Button>
    </div>
  );
};

export default EmptyPreviewState;