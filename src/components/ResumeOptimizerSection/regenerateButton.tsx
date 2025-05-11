import React from 'react';
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RegenerateButtonProps {
  isApplying: boolean;
  onRegenerate: () => void;
}

const RegenerateButton: React.FC<RegenerateButtonProps> = ({ isApplying, onRegenerate }) => {
  return (
    <Button 
      onClick={onRegenerate}
      disabled={isApplying}
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      {isApplying ? (
        <>
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          Applying changes...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Apply Changes
        </>
      )}
    </Button>
  );
};

export default RegenerateButton;