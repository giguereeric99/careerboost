import { SuggestionType } from '../types/suggestions';

// AI suggestion types
export const suggestionTypes: SuggestionType[] = [
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