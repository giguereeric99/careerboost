/**
 * Resume Optimization Prompt Module
 * 
 * This module provides standardized prompts for resume optimization across different AI providers.
 * It ensures consistent formatting and output structure regardless of which AI service is used.
 * 
 * Features:
 * - HTML-formatted output with section IDs for improved template support
 * - Support for multiple languages and customizations
 * - Specialized instructions for different AI models
 * - Specific sections for interests and references properly identified
 */

/**
 * Interface for prompt configuration options
 * Allows for flexible customization of prompts
 */
interface PromptOptions {
  /** The language of the resume (e.g., "English", "French") */
  language?: string;
  /** Maximum number of suggestions to request */
  maxSuggestions?: number;
  /** Maximum number of keywords to request */
  maxKeywords?: number;
  /** Whether to include detailed instructions for ATS optimization */
  includeAtsInstructions?: boolean;
  /** Custom instructions to add to the prompt */
  customInstructions?: string[];
}

/**
 * Suggestion types used in the resume optimization response
 * These categories help organize different types of improvements
 */
export const SUGGESTION_TYPES = [
  "structure",  // Related to the organization and layout of the resume
  "content",    // Related to the actual content and wording
  "skills",     // Related to technical and soft skills representation
  "formatting", // Related to visual aspects and formatting
  "language"    // Related to grammar, spelling, and language use
] as const;

/**
 * Default prompt configuration
 * Provides sensible defaults that can be overridden
 */
const DEFAULT_OPTIONS: PromptOptions = {
  language: "English",
  maxSuggestions: 5,
  maxKeywords: 10,
  includeAtsInstructions: true,
  customInstructions: []
};

/**
 * List of resume sections that should be properly identified by the AI
 * Each section has a specific ID that will be used in templates
 */
const RESUME_SECTIONS = [
  { id: "resume-header", description: "Name and contact information" },
  { id: "resume-summary", description: "Professional summary/profile" },
  { id: "resume-experience", description: "Work experience" },
  { id: "resume-education", description: "Educational background" },
  { id: "resume-skills", description: "Technical and soft skills" },
  { id: "resume-languages", description: "Language proficiency" },
  { id: "resume-certifications", description: "Professional certifications" },
  { id: "resume-projects", description: "Relevant projects" },
  { id: "resume-interests", description: "Personal interests/hobbies" },
  { id: "resume-references", description: "Professional references" }
];

/**
 * Generates a standardized system prompt for resume optimization
 * This sets the overall context and role for the AI
 * 
 * @param options - Configuration options for the prompt
 * @returns A system prompt string for AI services
 */
export function generateSystemPrompt(options: PromptOptions = {}): string {
  // Merge default options with provided options
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return `You are an expert resume optimizer who helps improve resumes for ATS compatibility and recruiter appeal in ${config.language}.
  
You specialize in transforming regular resumes into highly effective documents that pass through Applicant Tracking Systems and impress recruiters.

You will format your output as HTML with semantic section IDs to enable proper template application. You will ensure all sections are properly identified, including interests and references if present in the original resume.

I want all predefined sections to be included in the optimization result even if some are empty of content.

It is very important to create the resume in this language: ${config.language}.`;
}

/**
 * Generates a standardized user prompt for resume optimization
 * This contains the main instructions for the AI
 * 
 * @param resumeText - The original resume text to optimize
 * @param options - Configuration options for the prompt
 * @returns A user prompt string for AI services
 */
export function generateResumePrompt(resumeText: string, options: PromptOptions = {}): string {
  // Merge default options with provided options
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Build the base prompt with optimization criteria
  let prompt = `TASK: Analyze and optimize the following resume, focusing on these criteria:

1. Clear structure and layout to capture the recruiter's attention within seconds
2. Professional format with well-defined sections, readable fonts, and balanced margins
3. Highlighting relevant technical skills for the industry
4. Removing irrelevant or overly personal information
5. Correcting spelling and grammar errors
6. Balancing technical skills and soft skills
7. Using impactful language and action verbs
8. Optimizing organization for Applicant Tracking Systems (ATS)`;

  // Add any custom instructions to the base prompt
  if (config.customInstructions && config.customInstructions.length > 0) {
    config.customInstructions.forEach((instruction, index) => {
      prompt += `\n${9 + index}. ${instruction}`;
    });
  }

  // Add detailed ATS instructions if requested
  if (config.includeAtsInstructions) {
    prompt += `\n\nATS OPTIMIZATION TIPS:
- Use standard section headings (e.g., "Experience", "Education", "Skills")
- Include keywords from the industry and job descriptions
- Avoid using tables, graphics, or complex formatting
- Use a clean, simple layout with clear section breaks
- Ensure contact information is clearly visible at the top
- Structure content for easy parsing by automated systems`;
  }

  // Build HTML formatting instructions with explicit section IDs
  // Each section is clearly identified for proper template application
  prompt += `\n\nIMPORTANT HTML FORMATTING INSTRUCTIONS:
- Format your response as semantic HTML with the following section IDs:
  - <section id="resume-header" class="section-title"> for name, contact info
  - <section id="resume-summary" class="section-title"> for professional summary
  - <section id="resume-experience" class="section-title"> for work experience
  - <section id="resume-education" class="section-title"> for education
  - <section id="resume-skills" class="section-title"> for skills
  - <section id="resume-languages" class="section-title"> for languages (if applicable)
  - <section id="resume-certifications" class="section-title"> for certifications (if applicable)
  - <section id="resume-interests" class="section-title"> for interests/hobbies (if applicable)
  - <section id="resume-references" class="section-title"> for references (if applicable)

- IMPORTANT: Create proper sections for interests and references if they exist in the resume
- Even if references only say "Available upon request," place this in a properly formatted resume-references section
- Use appropriate HTML tags (h1, h2, h3, p, ul, li) for proper structure within each section
- Make sure the HTML is well-formed and valid
- Do not include any CSS or styling`;

  // Add the resume content to be optimized
  prompt += `\n\nResume to optimize:
${resumeText}`;

  // Add output format instructions for the AI response
  prompt += `\n\nIMPORTANT: Your response must be a valid JSON object with exactly these fields:
{
  "optimizedText": "The complete HTML-formatted improved resume content",
  "suggestions": [
    {"type": "structure", "text": "What to improve", "impact": "Why this helps"},
    {"type": "content", "text": "What to improve", "impact": "Why this helps"},
    {"type": "skills", "text": "What to improve", "impact": "Why this helps"},
    {"type": "formatting", "text": "What to improve", "impact": "Why this helps"},
    {"type": "language", "text": "What to improve", "impact": "Why this helps"}
  ],
  "keywordSuggestions": ["keyword1", "keyword2", "keyword3", ...],
  "atsScore": (number between 0-100)
}

Guidelines:
- Provide between 1-${config.maxSuggestions} high-impact suggestions across different categories
- Include 1-${config.maxKeywords} relevant industry keywords that should be added to the resume
- Format the optimizedText as HTML with section IDs as specified above
- Ensure EVERY section has proper identification with the correct section ID
- Ensure the optimized text maintains all relevant information from the original
- Do not include ANY explanatory text, code blocks, or other content outside the JSON structure`;

  return prompt;
}

/**
 * Generates a concise prompt specifically for Claude AI
 * Claude sometimes requires more explicit instructions to produce properly formatted JSON
 * 
 * @param resumeText - The original resume text to optimize
 * @param options - Configuration options for the prompt
 * @returns A user prompt string for Claude AI
 */
export function generateClaudePrompt(resumeText: string, options: PromptOptions = {}): string {
  const basePrompt = generateResumePrompt(resumeText, options);
  
  // Add Claude-specific instructions with emphasis on proper section handling
  return `${basePrompt}

IMPORTANT CLAUDE-SPECIFIC INSTRUCTIONS:
- Your response must be ONLY valid JSON - no explanatory text outside the JSON object
- For the "optimizedText" field, include properly escaped HTML with section IDs
- Make sure to create proper <section> elements with appropriate IDs for ALL content
- Pay special attention to interests and references sections - they must have proper IDs
- If references only mention "available upon request," still create a proper references section
- Do not include \`\`\`json and \`\`\` around your response
- When escaping HTML in JSON, replace " with \\" inside HTML attributes
- Verify that your JSON is valid before responding`;
}

/**
 * Complete prompt configuration with both system and user components
 * Used to provide the full context to AI models
 */
export interface CompletePrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Generates both system and user prompts for the specified AI provider
 * Handles provider-specific optimizations
 * 
 * @param resumeText - The original resume text to optimize 
 * @param provider - The AI provider (openai, gemini, or claude)
 * @param options - Configuration options for the prompt
 * @returns Both system and user prompts appropriate for the specified AI provider
 */
export function getProviderPrompts(
  resumeText: string,
  provider: 'openai' | 'gemini' | 'claude',
  options: PromptOptions = {}
): CompletePrompt {
  const systemPrompt = generateSystemPrompt(options);
  let userPrompt: string;
  
  // Use provider-specific prompt generation when applicable
  switch (provider) {
    case 'claude':
      userPrompt = generateClaudePrompt(resumeText, options);
      break;
    case 'openai':
    case 'gemini':
    default:
      userPrompt = generateResumePrompt(resumeText, options);
      break;
  }
  
  return { systemPrompt, userPrompt };
}

/**
 * Export a default function that provides the complete prompt for any provider
 * This is the main entry point to get optimized prompts
 * 
 * @param resumeText - The original resume text to optimize
 * @param provider - The AI provider to use
 * @param options - Configuration options for the prompt
 * @returns Complete system and user prompts for the specified provider
 */
export default function getResumeOptimizationPrompt(
  resumeText: string,
  provider: 'openai' | 'gemini' | 'claude' = 'openai',
  options: PromptOptions = {}
): CompletePrompt {
  return getProviderPrompts(resumeText, provider, options);
}