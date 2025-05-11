import React from 'react';
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditVersionBannerProps {
  isEditing: boolean;
  onReset: () => void;
}

const EditVersionBanner: React.FC<EditVersionBannerProps> = ({ isEditing, onReset }) => {
  if (isEditing) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center mb-4">
      <span className="text-blue-600 text-sm">
        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
        You're viewing your edited version of the resume
      </span>
      <Button 
        size="sm" 
        variant="ghost" 
        className="ml-auto text-blue-600 text-xs"
        onClick={onReset}
      >
        <RotateCcw className="mr-1 h-3 w-3" /> Reset to AI version
      </Button>
    </div>
  );
};

export default EditVersionBanner;