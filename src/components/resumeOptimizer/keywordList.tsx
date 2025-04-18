import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle } from "lucide-react";

interface Keyword {
  text: string;
  applied: boolean;
}

interface KeywordListProps {
  keywords: Keyword[];
  onKeywordApply: (index: number) => void;
}

const KeywordList: React.FC<KeywordListProps> = ({ keywords, onKeywordApply }) => {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h3 className="font-medium">Recommended Keywords</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <Button 
            key={index} 
            variant={keyword.applied ? "default" : "outline"} 
            size="sm"
            className={keyword.applied ? "bg-brand-600" : ""}
            onClick={() => onKeywordApply(index)}
          >
            {keyword.text}
            {keyword.applied && <CheckCircle className="h-3 w-3 ml-1" />}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default KeywordList;