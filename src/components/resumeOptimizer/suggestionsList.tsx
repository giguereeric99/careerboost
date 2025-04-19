import React from 'react';
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { OptimizationSuggestion } from '@/hooks/useResumeOptimizer';

// Define static suggestion types
const suggestionTypes = [
  {
    type: "keyword",
    title: "Add industry keywords",
    description: "Including these terms will increase visibility with ATS systems."
  },
  {
    type: "achievement",
    title: "Quantify achievements",
    description: "Add metrics to demonstrate the impact of your work."
  },
  {
    type: "format",
    title: "Improve formatting",
    description: "Structure changes to enhance readability and visual appeal."
  },
  {
    type: "language",
    title: "Enhance language",
    description: "Power words and action verbs to strengthen descriptions."
  }
];

interface SuggestionsListProps {
  suggestions: OptimizationSuggestion[];
  isOptimizing: boolean;
  onApplySuggestion: (index: number) => void;
}

const SuggestionsList: React.FC<SuggestionsListProps> = ({ 
    suggestions, 
    isOptimizing,
    onApplySuggestion 
  }) => {
  return (
    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-brand-600" />
        <h3 className="font-medium">AI Suggestions</h3>
      </div>
      {isOptimizing ? (
        <p className="text-sm text-gray-500">Generating suggestions...</p>
      ) : suggestions && suggestions.length > 0 ? (
        <ul className="space-y-3 text-sm">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="p-2 border-l-2 border-brand-400 bg-white rounded">
              <p className="font-medium">{suggestion.text}</p>
              <p className="text-gray-600">{suggestion.impact}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2" 
                onClick={() => onApplySuggestion(index)}
              >
                Apply Suggestion
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3 text-sm">
          {suggestionTypes.map((suggestion, index) => (
            <li key={index} className="p-2 border-l-2 border-brand-400 bg-white rounded">
              <p className="font-medium">{suggestion.title}</p>
              <p className="text-gray-600">{suggestion.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SuggestionsList;