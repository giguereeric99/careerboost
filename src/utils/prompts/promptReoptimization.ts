/**
 * Resume Reoptimization Prompt Module
 * 
 * This module provides specialized prompts for reoptimizing a resume based on selected suggestions.
 * It builds on the original optimization prompts but focuses on integrating specific suggestions
 * and maintaining the original structure and language of the resume.
 */

import { SUGGESTION_TYPES, RESUME_SECTION_NAMES, SECTION_WEIGHTS } from './resumeOptimizationPrompt';
import { Suggestion } from '@/types/resume';

/**
 * Interface for reoptimization prompt configuration options
 */
interface ReoptimizationPromptOptions {
  /** The language of the resume (e.g., "English", "French") */
  language?: string;
  /** Selected suggestions to apply */
  selectedSuggestions?: Suggestion[];
  /** Applied keywords to incorporate */
  appliedKeywords?: string[];
  /** Whether to include detailed instructions for ATS optimization */
  includeAtsInstructions?: boolean;
  /** Custom instructions to add to the prompt */
  customInstructions?: string[];
}

/**
 * Default prompt configuration
 */
const DEFAULT_REOPTIMIZATION_OPTIONS: ReoptimizationPromptOptions = {
  language: "English",
  selectedSuggestions: [],
  appliedKeywords: [],
  includeAtsInstructions: true,
  customInstructions: [],
};

/**
 * Generates a system prompt for resume reoptimization
 * 
 * @param options - Configuration options for the prompt
 * @returns A system prompt string for AI services
 */
export function generateReoptimizationSystemPrompt(options: ReoptimizationPromptOptions = {}): string {
  // Merge default options with provided options
  const config = { ...DEFAULT_REOPTIMIZATION_OPTIONS, ...options };
  
  // Base role description
  let systemPrompt = `You are an expert resume optimizer specializing in reoptimizing resumes based on selected suggestions. 
  
You will take an existing resume and a set of selected improvement suggestions, and create an improved version that 
intelligently incorporates these suggestions while maintaining the original structure and language (${config.language}).

You will format your output as HTML with semantic section IDs to enable proper template application. You will ensure 
all sections are properly identified, including specialized sections like interests, volunteering, publications, and 
references if present in the original resume.`;

  // Add suggestions context if provided
  if (config.selectedSuggestions && config.selectedSuggestions.length > 0) {
    systemPrompt += `\n\nYou will incorporate ${config.selectedSuggestions.length} specific suggestions that have been 
selected by the user. These suggestions should be seamlessly integrated into the resume in a natural way that 
maintains the original voice and tone.`;
  }

  // Add keywords context if provided
  if (config.appliedKeywords && config.appliedKeywords.length > 0) {
    systemPrompt += `\n\nYou will also incorporate ${config.appliedKeywords.length} selected keywords, ensuring they 
are placed naturally and contextually within the resume without forcing or overusing them.`;
  }

  // Final instructions
  systemPrompt += `\n\nYour goal is to create a polished, professional resume that will perform well with Applicant 
Tracking Systems (ATS) while incorporating the selected improvements. Maintain the original structure and ensure 
all sections have proper HTML section IDs.

It is very important to create the resume, the suggestions and the keywords in this language: ${config.language}.`;

  return systemPrompt;
}

/**
 * Generates a user prompt for resume reoptimization
 * 
 * @param resumeText - The current resume text to reoptimize
 * @param options - Configuration options for the prompt
 * @returns A user prompt string for AI services
 */
export function generateReoptimizationUserPrompt(
  resumeText: string, 
  options: ReoptimizationPromptOptions = {}
): string {
  // Merge default options with provided options
  const config = { ...DEFAULT_REOPTIMIZATION_OPTIONS, ...options };
  
  // Build the base prompt with reoptimization instructions
  let prompt = `TASK: Reoptimize the following resume by incorporating the selected suggestions and keywords. Focus on these criteria:

1. Intelligently integrate the selected suggestions into the appropriate sections
2. Incorporate the selected keywords in a natural and contextual way
3. Maintain the original structure and voice of the resume
4. Preserve all section IDs and HTML formatting
5. Ensure the result is well-optimized for ATS systems
6. Keep the resume in the same language (${config.language})`;

  // Add any custom instructions to the base prompt
  if (config.customInstructions && config.customInstructions.length > 0) {
    config.customInstructions.forEach((instruction, index) => {
      prompt += `\n${7 + index}. ${instruction}`;
    });
  }

  // Add detailed ATS instructions if requested
  if (config.includeAtsInstructions) {
    prompt += `\n\nATS OPTIMIZATION REMINDERS:
- Use standard section headings (e.g., "Experience", "Education", "Skills")
- Include keywords from the industry and job descriptions
- Avoid using tables, graphics, or complex formatting
- Use a clean, simple layout with clear section breaks
- Ensure contact information is clearly visible at the top
- Structure content for easy parsing by automated systems
- Use bullet points for accomplishments and responsibilities
- Quantify achievements with metrics when possible`;
  }

  // Add selected suggestions section
  if (config.selectedSuggestions && config.selectedSuggestions.length > 0) {
    prompt += `\n\nSELECTED SUGGESTIONS TO INCORPORATE:`;
    
    config.selectedSuggestions.forEach((suggestion, index) => {
      prompt += `\n${index + 1}. [${suggestion.type.toUpperCase()}] ${suggestion.text}`;
      if (suggestion.impact) {
        prompt += `\n   Impact: ${suggestion.impact}`;
      }
    });
  } else {
    prompt += `\n\nNo specific suggestions selected. Focus on general improvement and keyword integration.`;
  }

  // Add selected keywords section
  if (config.appliedKeywords && config.appliedKeywords.length > 0) {
    prompt += `\n\nSELECTED KEYWORDS TO INCORPORATE:`;
    
    // Group keywords in sets of 5 for better readability
    for (let i = 0; i < config.appliedKeywords.length; i += 5) {
      const keywordGroup = config.appliedKeywords.slice(i, i + 5);
      prompt += `\n- ${keywordGroup.join(', ')}`;
    }
  } else {
    prompt += `\n\nNo specific keywords selected. Focus on suggestion integration and general improvement.`;
  }

  // Add HTML formatting instructions
  prompt += `\n\nIMPORTANT HTML FORMATTING INSTRUCTIONS:
- Format your response as semantic HTML with the following section IDs:`;

  // List all possible sections with their IDs
  Object.entries(RESUME_SECTION_NAMES).forEach(([id, name]) => {
    prompt += `\n  - <section id="${id}" class="section-title"> for ${name}`;
  });

  prompt += `\n
- Preserve all existing section IDs from the original resume
- Create proper sections for ALL applicable categories from the resume
- Use appropriate HTML tags (h1, h2, h3, p, ul, li) for proper structure within each section
- Make sure the HTML is well-formed and valid
- Do not include any CSS or styling
- Use descriptive headers for each section that match common industry standards`;

  // Add the resume content to be reoptimized
  prompt += `\n\nRESUME TO REOPTIMIZE:
${resumeText}`;

  // Add output format instructions for the AI response
  prompt += `\n\nIMPORTANT: Your response must be a valid JSON object with exactly these fields:
{
  "optimizedText": "The complete HTML-formatted improved resume content",
  "appliedSuggestions": [
    {"type": "structure", "text": "Suggestion that was applied", "application": "How it was applied"},
    {"type": "content", "text": "Suggestion that was applied", "application": "How it was applied"}
    // Include all applied suggestions
  ],
  "appliedKeywords": ["keyword1", "keyword2", "keyword3", ...],
  "atsScore": (number between 0-100),
  "improvements": "A brief summary of the improvements made"
}`;

  prompt += `\n\nNOTE: Do not include any explanatory text, code blocks, or other content outside the JSON structure.`;

  return prompt;
}

/**
 * Complete prompt configuration with both system and user components
 * Used to provide the full context to AI models
 */
export interface CompleteReoptimizationPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Generates both system and user prompts for the specified AI provider
 * Handles provider-specific optimizations for reoptimization
 * 
 * @param resumeText - The current resume text to reoptimize
 * @param provider - The AI provider (openai, gemini, or claude)
 * @param options - Configuration options for the prompt
 * @returns Both system and user prompts appropriate for the specified AI provider
 */
export function getReoptimizationPrompts(
  resumeText: string,
  provider: 'openai' | 'gemini' | 'claude',
  options: ReoptimizationPromptOptions = {}
): CompleteReoptimizationPrompt {
  const systemPrompt = generateReoptimizationSystemPrompt(options);
  let userPrompt: string;
  
  // Use provider-specific prompt generation when applicable
  switch (provider) {
    case 'claude':
      // For Claude, add specific reminder about JSON format
      userPrompt = generateReoptimizationUserPrompt(resumeText, options);
      userPrompt += `\n\nIMPORTANT CLAUDE-SPECIFIC INSTRUCTIONS:
- Your response must be ONLY valid JSON - no explanatory text outside the JSON object
- Do not include \`\`\`json and \`\`\` around your response
- When escaping HTML in JSON, replace " with \\" inside HTML attributes
- Verify that your JSON is valid before responding`;
      break;
    case 'openai':
    case 'gemini':
    default:
      userPrompt = generateReoptimizationUserPrompt(resumeText, options);
      break;
  }
  
  return { systemPrompt, userPrompt };
}

/**
 * Main export function to get reoptimization prompts for any provider
 * 
 * @param resumeText - The current resume text to reoptimize
 * @param selectedSuggestions - Array of selected suggestions to apply
 * @param appliedKeywords - Array of keywords to incorporate
 * @param language - Language of the resume
 * @param provider - AI provider to use
 * @returns Complete system and user prompts for reoptimization
 */
export default function getResumeReoptimizationPrompt(
  resumeText: string,
  selectedSuggestions: Suggestion[] = [],
  appliedKeywords: string[] = [],
  language: string = 'English',
  provider: 'openai' | 'gemini' | 'claude' = 'openai'
): CompleteReoptimizationPrompt {
  return getReoptimizationPrompts(
    resumeText,
    provider,
    {
      language,
      selectedSuggestions,
      appliedKeywords,
      includeAtsInstructions: true
    }
  );
}