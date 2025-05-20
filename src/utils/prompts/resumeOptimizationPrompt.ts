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
 * - Comprehensive section identification for better resume structure
 * - Real-time ATS score calculation based on multiple factors
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
  /** Target job role or industry (for more specific optimization) */
  targetRole?: string;
  /** Whether to focus on specific section improvements */
  focusSections?: string[];
  /** Industry sector for more targeted keywords (new option) */
  industrySector?: string;
  /** Job description text to better match keywords (new option) */
  jobDescriptionText?: string;
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
  "language",   // Related to grammar, spelling, and language use
  "keywords",   // Related to industry-specific keywords and terminology
  "ats"         // Specifically addressing ATS compatibility issues
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
  customInstructions: [],
  targetRole: "",
  focusSections: [],
  industrySector: "",
  jobDescriptionText: ""
};

/**
 * Mapping of section IDs to human-readable section names in English
 * This serves as the base for all languages - section IDs remain constant across languages
 */
export const RESUME_SECTION_NAMES_EN: Record<string, string> = {
  'resume-header': 'Personal Information',
  'resume-summary': 'Professional Summary',
  'resume-experience': 'Experience',
  'resume-education': 'Education',
  'resume-skills': 'Skills',
  'resume-languages': 'Languages',
  'resume-certifications': 'Certifications',
  'resume-projects': 'Projects',
  'resume-awards': 'Awards & Achievements',
  'resume-references': 'References',
  'resume-publications': 'Publications',
  'resume-volunteering': 'Volunteering',
  'resume-additional': 'Additional Information',
  'resume-interests': 'Interests'
};

/**
 * Section name translations for French
 * Maps section IDs to French section names
 */
export const RESUME_SECTION_NAMES_FR: Record<string, string> = {
  'resume-header': 'Informations Personnelles',
  'resume-summary': 'Profil Professionnel',
  'resume-experience': 'Expérience Professionnelle',
  'resume-education': 'Formation',
  'resume-skills': 'Compétences',
  'resume-languages': 'Langues',
  'resume-certifications': 'Certifications',
  'resume-projects': 'Projets',
  'resume-awards': 'Prix et Distinctions',
  'resume-references': 'Références',
  'resume-publications': 'Publications',
  'resume-volunteering': 'Bénévolat',
  'resume-additional': 'Informations Complémentaires',
  'resume-interests': 'Centres d\'Intérêt'
};

/**
 * Section name translations for Spanish
 * Maps section IDs to Spanish section names
 */
export const RESUME_SECTION_NAMES_ES: Record<string, string> = {
  'resume-header': 'Información Personal',
  'resume-summary': 'Perfil Profesional',
  'resume-experience': 'Experiencia Profesional',
  'resume-education': 'Formación Académica',
  'resume-skills': 'Habilidades',
  'resume-languages': 'Idiomas',
  'resume-certifications': 'Certificaciones',
  'resume-projects': 'Proyectos',
  'resume-awards': 'Premios y Reconocimientos',
  'resume-references': 'Referencias',
  'resume-publications': 'Publicaciones',
  'resume-volunteering': 'Voluntariado',
  'resume-additional': 'Información Adicional',
  'resume-interests': 'Intereses'
};

/**
 * Get section names based on the specified language
 * 
 * @param language - The language to retrieve section names for
 * @returns Record mapping section IDs to localized section names
 */
export function getSectionNamesByLanguage(language: string): Record<string, string> {
  // Normalize language for matching
  const normalizedLang = language.toLowerCase().trim();
  
  if (normalizedLang === 'french' || normalizedLang === 'français' || normalizedLang === 'francais') {
    return RESUME_SECTION_NAMES_FR;
  } else if (normalizedLang === 'spanish' || normalizedLang === 'español' || normalizedLang === 'espanol') {
    return RESUME_SECTION_NAMES_ES;
  } else {
    // Default to English for any other language
    return RESUME_SECTION_NAMES_EN;
  }
}

/**
 * Sections with their importance weight for ATS scoring
 * Different sections have different impacts on the overall ATS score
 */
export const SECTION_WEIGHTS = {
  'resume-experience': 0.30,    // Experience is typically most important
  'resume-skills': 0.25,        // Skills are highly relevant
  'resume-education': 0.15,     // Education is important but less than experience
  'resume-summary': 0.10,       // Professional summary sets the tone
  'resume-projects': 0.07,      // Projects demonstrate practical skills
  'resume-certifications': 0.05, // Certifications validate skills
  'resume-languages': 0.03,     // Languages can be important in global positions
  'resume-awards': 0.02,        // Awards demonstrate excellence
  'resume-publications': 0.01,  // Publications show expertise in some fields
  'resume-volunteering': 0.01,  // Volunteering shows character
  'resume-additional': 0.005,   // Additional information can be relevant
  'resume-interests': 0.005     // Interests are less important for ATS
};

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
  
  // Get section names in the appropriate language
  const sectionNames = getSectionNamesByLanguage(
    typeof config.language === 'string' ? config.language : 'en'
  );
  
  // Base role description
  let systemPrompt = `You are an expert resume optimizer who helps improve resumes for ATS compatibility and recruiter appeal in ${config.language}.
  
You specialize in transforming regular resumes into highly effective documents that pass through Applicant Tracking Systems and impress recruiters.

You will format your output as HTML with semantic section IDs to enable proper template application. You will ensure all sections are properly identified, including specialized sections like interests, volunteering, publications, and references if present in the original resume.`;

  // Add target job role context if provided
  if (config.targetRole) {
    systemPrompt += `\n\nYou are specifically optimizing this resume for ${config.targetRole} positions, so emphasize relevant skills and experiences accordingly.`;
  }

  // Add industry sector context if provided (new)
  if (config.industrySector) {
    systemPrompt += `\n\nYou are optimizing this resume for the ${config.industrySector} industry sector, focusing on high-value keywords and skills specific to this domain.`;
  }

  // Add focused sections if provided
  if (config.focusSections && config.focusSections.length > 0) {
    systemPrompt += `\n\nPay special attention to improving these sections: ${config.focusSections.map(section => sectionNames[section] || section).join(', ')}.`;
  }

  // CSS classes instructions - important addition for correct class placement
  systemPrompt += `\n\nIMPORTANT: When formatting the HTML, place the "section-title" class on heading elements (h1, h2), NOT on section elements. Example:
- Correct: <section id="resume-summary"><h2 class="section-title">${sectionNames['resume-summary']}</h2>...</section>
- Incorrect: <section id="resume-summary" class="section-title"><h2>${sectionNames['resume-summary']}</h2>...</section>`;

  // Language-specific instructions for section names
  systemPrompt += `\n\nIMPORTANT: All section titles must be in ${config.language}. Do not use English section names unless ${config.language} is English. Use culturally appropriate section names for the language.`;

  // Enhanced critical instructions for suggestions and keywords (new)
  systemPrompt += `\n\nCRITICAL INSTRUCTIONS FOR SUGGESTIONS AND KEYWORDS:
- NEVER suggest improvements or changes that are already implemented in the resume
- Each suggestion must provide genuinely NEW content or structure that doesn't exist yet
- Keywords must be highly relevant to the industry/role AND absent from the current resume
- Before suggesting a keyword, verify that it does NOT appear in any form (singular, plural, hyphenated) in the resume
- Do not suggest generic skills that are clearly demonstrated throughout the resume
- Prioritize suggesting specialized or niche skills that would add significant value
- For technologies or tools already mentioned in the resume, do not suggest them again as keywords
- Analyze the entire resume content first to identify all existing skills and keywords`;

  // Final instructions
  systemPrompt += `\n\nI want all predefined sections to be included in the optimization result even if some are empty of content.

It is very important to create the resume, the suggestions and the keywords in this language: ${config.language}.`;

  return systemPrompt;
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
  
  // Get section names in the appropriate language
  const sectionNames = getSectionNamesByLanguage(
    typeof config.language === 'string' ? config.language : 'en'
  );
  
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
- Use standard section headings in ${config.language} (e.g., "${sectionNames['resume-experience']}", "${sectionNames['resume-education']}", "${sectionNames['resume-skills']}")
- Include keywords from the industry and job descriptions
- Avoid using tables, graphics, or complex formatting
- Use a clean, simple layout with clear section breaks
- Ensure contact information is clearly visible at the top
- Structure content for easy parsing by automated systems
- Use bullet points for accomplishments and responsibilities
- Quantify achievements with metrics when possible
- Match skills and experience with job requirements`;
  }

  // Build HTML formatting instructions with explicit section IDs
  // Each section is clearly identified for proper template application
  // Added specific instructions for class placement
  prompt += `\n\nCRITICAL HTML FORMATTING INSTRUCTIONS:
- Format your response with semantic HTML structure following these exact rules:`;

  // List all possible sections with their IDs and correct class placement
  // Using language-specific section names
  Object.entries(sectionNames).forEach(([id, name]) => {
    prompt += `\n  - Use <section id="${id}"> for ${name} section (without any class on the section tag)`;
    
    // Add specific instructions for section headers
    if (id === 'resume-header') {
      prompt += `\n    - Add class="section-title" to the <h1> element (not the section)
    - Add class="name" to the heading with the person's name: <h1 class="section-title name">Person Name</h1>
    - Add appropriate classes to personal information:
      • class="email" for email addresses: <span class="email">email@example.com</span>
      • class="phone" for phone numbers: <span class="phone">123-456-7890</span>
      • class="address" for postal addresses: <span class="address">123 Street, City</span>
      • class="linkedin" for LinkedIn URLs: <span class="linkedin">linkedin.com/in/username</span>`;
    } else {
      prompt += `\n    - Add class="section-title" to the section title: <h2 class="section-title">${name}</h2>`;
    }
  });

  prompt += `\n
- Important: Always add the class "section-title" to the HEADING tags (h1, h2), NOT to the section tags
- Create proper sections for ALL applicable categories from the resume
- Use the section titles in ${config.language}, not in English (unless ${config.language} is English)
- Even if references only say "Available upon request," place this in a properly formatted resume-references section
- Use appropriate HTML tags (h1, h2, h3, p, ul, li) for proper structure within each section
- Make sure the HTML is well-formed and valid
- Do not include any CSS or styling
- Any time there's an email address, phone number, address or LinkedIn URL in the header, wrap it in a span with the appropriate class`;

  // Add the resume content to be optimized
  prompt += `\n\nResume to optimize:
${resumeText}`;

  // Add job description context if available (new)
  if (config.jobDescriptionText) {
    prompt += `\n\nJob Description to match against:
${config.jobDescriptionText}
The above job description should be used to identify relevant keywords and tailor suggestions.`;
  }

  // Enhanced instructions for keywords and suggestions (new)
  prompt += `\n\nKEYWORD AND SUGGESTION GENERATION INSTRUCTIONS:
- First, CAREFULLY analyze the resume to identify ALL skills, terms, and concepts that are ALREADY PRESENT
- For each potential keyword or suggestion, check the entire resume to ensure it's not already mentioned
- Create an internal list of EXISTING keywords to avoid suggesting them again
- Only suggest keywords that are 100% ABSENT from the resume in ANY form (including plurals, hyphenations, or variations)
- For suggestions, focus on recommending genuinely new content that would significantly enhance the resume
- Prioritize suggesting skills, achievements, or structural improvements that are missing entirely
- Each suggestion should offer something that cannot be inferred from the existing content`;

  // Add output format instructions for the AI response - KEEPING THE ORIGINAL FORMAT
  prompt += `\n\nIMPORTANT: Your response must be a valid JSON object with exactly these fields:
{
  "optimizedText": "The complete HTML-formatted improved resume content",
  "suggestions": [
    {"type": "structure", "text": "What to improve", "impact": "Why this helps"},
    {"type": "content", "text": "What to improve", "impact": "Why this helps"},
    {"type": "skills", "text": "What to improve", "impact": "Why this helps"},
    {"type": "formatting", "text": "What to improve", "impact": "Why this helps"},
    {"type": "language", "text": "What to improve", "impact": "Why this helps"},
    {"type": "keywords", "text": "What to improve", "impact": "Why this helps"},
    {"type": "ats", "text": "What to improve", "impact": "Why this helps"}
  ],
  "keywordSuggestions": ["keyword1", "keyword2", "keyword3", ...],
  "atsScore": (number between 0-100)
}`;

  // Add detailed explanation of how the ATS score is calculated
  prompt += `\n\nATS SCORE CALCULATION:
Calculate the atsScore (0-100) based on these factors:
- Content quality and relevance (30%): How well the content matches typical job requirements
- Keyword optimization (25%): Presence of industry-relevant keywords
- Structure and organization (20%): Clear sections with proper headings
- Formatting and readability (15%): Clean format that's easy for ATS to parse
- Quantified achievements (10%): Specific metrics and results
- Overall impact and professionalism (5%): General impression and polish

For each suggestion implemented, the score should increase by approximately:
- Major improvement: +5-10 points
- Moderate improvement: +3-5 points
- Minor improvement: +1-2 points`;

  prompt += `\n\nGuidelines:
- Provide between 1-${config.maxSuggestions} high-impact suggestions across different categories
- Include 1-${config.maxKeywords} relevant industry keywords that should be added to the resume
- Format the optimizedText as HTML with section IDs as specified above
- Ensure EVERY applicable section has proper identification with the correct section ID
- Ensure the optimized text maintains all relevant information from the original
- Do not include ANY explanatory text, code blocks, or other content outside the JSON structure
- CRITICAL: The 'section-title' class must be on the h1/h2 tags, NOT on the section tags
- CRITICAL: The section titles in the output HTML must be in ${config.language}, not in English
- CRITICAL: Double-check that suggestions and keywords don't recommend what's already in the resume`;

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
  
  // Add Claude-specific instructions with enhanced focus on avoiding duplicate suggestions (updated)
  return `${basePrompt}

IMPORTANT CLAUDE-SPECIFIC INSTRUCTIONS:
- Your response must be ONLY valid JSON - no explanatory text outside the JSON object
- For the "optimizedText" field, include properly escaped HTML with section IDs
- Make sure to create proper <section> elements with appropriate IDs for ALL content
- Keep <section> tags clean without any classes: <section id="resume-header"> (NOT <section id="resume-header" class="section-title">)
- Add class="section-title" only to heading elements (h1, h2) within each section
- Pay special attention to newer sections like publications, volunteering, awards, and interests - they must have proper IDs
- If references only mention "available upon request," still create a proper references section
- Do not include \`\`\`json and \`\`\` around your response
- When escaping HTML in JSON, replace " with \\" inside HTML attributes
- Verify that your JSON is valid before responding
- Ensure all section IDs exactly match the specified format (e.g., 'resume-header', 'resume-skills')
- Make sure all section titles are in ${options.language || DEFAULT_OPTIONS.language}, not in English (unless the language is English)
- CRITICALLY IMPORTANT: Before suggesting a keyword, verify it is COMPLETELY ABSENT from the resume in ALL forms
- Only suggest genuinely new content in suggestions, not repetitions of what's already there`;
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
 * Calculate the impact a keyword has on ATS score improvement
 * 
 * @param keyword - The keyword being evaluated
 * @param resumeContent - The current resume content
 * @param targetRole - Optional target role context
 * @returns Score impact value from 0.0 to 1.0
 */
export function calculateKeywordImpact(
  keyword: string, 
  resumeContent: string, 
  targetRole?: string
): number {
  // Calculate base impact (higher if keyword doesn't exist in resume)
  const baseImpact = resumeContent.toLowerCase().includes(keyword.toLowerCase()) ? 0.3 : 0.8;
  
  // Adjust impact based on target role if available
  if (targetRole && targetRole.toLowerCase().includes(keyword.toLowerCase())) {
    return Math.min(baseImpact + 0.3, 1.0); // Higher impact for role-relevant keywords
  }
  
  return baseImpact;
}

/**
 * Calculate the impact a suggestion has on ATS score improvement
 * 
 * @param suggestion - The suggestion object with type, text and impact
 * @returns Score impact value from 1 to 10
 */
export function calculateSuggestionImpact(suggestion: { 
  type: string; 
  text: string; 
  impact: string;
}): number {
  // Base impact by suggestion type
  const typeImpacts: Record<string, number> = {
    'structure': 7,   // Structure improvements have high impact
    'keywords': 8,    // Keyword improvements have very high impact
    'content': 6,     // Content improvements have medium-high impact
    'skills': 7,      // Skills improvements have high impact
    'formatting': 5,  // Formatting improvements have medium impact
    'language': 4,    // Language improvements have lower-medium impact
    'ats': 8          // Direct ATS improvements have very high impact
  };
  
  // Base score from suggestion type
  const baseScore = typeImpacts[suggestion.type] || 5;
  
  // Adjust based on impact text content
  let impactModifier = 0;
  const impactText = suggestion.impact.toLowerCase();
  
  if (impactText.includes('significant') || impactText.includes('substantial') || impactText.includes('critical')) {
    impactModifier = 2;
  } else if (impactText.includes('important') || impactText.includes('notably')) {
    impactModifier = 1;
  } else if (impactText.includes('minor') || impactText.includes('slight')) {
    impactModifier = -1;
  }
  
  // Return the adjusted score (1-10 range)
  return Math.max(1, Math.min(10, baseScore + impactModifier));
}

/**
 * Check if a keyword is already present in the resume content
 * Accounts for variations like plurals, hyphenations, etc.
 * 
 * @param keyword - The keyword to check
 * @param resumeContent - The resume content to search in
 * @returns Boolean indicating if the keyword is already present
 */
export function isKeywordAlreadyPresent(keyword: string, resumeContent: string): boolean {
  // Normalize content and keyword for comparison
  const normalizedContent = resumeContent.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();
  
  // Check for exact match
  if (normalizedContent.includes(normalizedKeyword)) {
    return true;
  }
  
  // Check for plural variations
  const singularKeyword = normalizedKeyword.endsWith('s') 
    ? normalizedKeyword.slice(0, -1) 
    : normalizedKeyword;
  const pluralKeyword = normalizedKeyword.endsWith('s')
    ? normalizedKeyword
    : normalizedKeyword + 's';
    
  if (normalizedContent.includes(singularKeyword) || normalizedContent.includes(pluralKeyword)) {
    return true;
  }
  
  // Check for hyphenated variations
  if (normalizedKeyword.includes('-')) {
    const withoutHyphen = normalizedKeyword.replace(/-/g, ' ');
    if (normalizedContent.includes(withoutHyphen)) {
      return true;
    }
  } else if (normalizedKeyword.includes(' ')) {
    const withHyphen = normalizedKeyword.replace(/ /g, '-');
    if (normalizedContent.includes(withHyphen)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate an updated ATS score based on applied suggestions and keywords
 * 
 * @param baseScore - The base ATS score (0-100)
 * @param appliedSuggestions - Array of applied suggestions
 * @param appliedKeywords - Array of applied keywords
 * @param resumeContent - Current resume content
 * @returns Updated ATS score (0-100)
 */
export function calculateUpdatedAtsScore(
  baseScore: number,
  appliedSuggestions: Array<{ type: string; text: string; impact: string }>,
  appliedKeywords: string[],
  resumeContent: string
): number {
  // Calculate suggestion impact
  let totalSuggestionImpact = 0;
  
  for (const suggestion of appliedSuggestions) {
    const impactValue = calculateSuggestionImpact(suggestion);
    // Each suggestion can improve score by 0.1 to 1 point
    totalSuggestionImpact += (impactValue / 10);
  }
  
  // Calculate keyword impact
  let totalKeywordImpact = 0;
  
  for (const keyword of appliedKeywords) {
    const impactValue = calculateKeywordImpact(keyword, resumeContent);
    // Each keyword can improve score by 0.1 to 0.5 points
    totalKeywordImpact += (impactValue / 2);
  }
  
  // Calculate combined improvement
  // Weighted scoring: suggestions have higher impact (60%) than keywords (40%)
  const improvement = (totalSuggestionImpact * 0.6) + (totalKeywordImpact * 0.4);
  
  // Apply diminishing returns for higher base scores
  // The higher the score, the harder it is to improve further
  const diminishingFactor = Math.max(0.1, 1 - (baseScore / 150));
  const adjustedImprovement = improvement * diminishingFactor * 10;
  
  // Calculate new score with ceiling at 100
  return Math.min(100, Math.round(baseScore + adjustedImprovement));
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