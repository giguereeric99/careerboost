/**
 * Resume Optimization Prompt Module - Enhanced with Section Titles Generation and Multilingual Suggestions/Keywords
 *
 * This module provides standardized prompts for resume optimization across different AI providers.
 * It ensures consistent formatting and output structure regardless of which AI service is used.
 *
 * ENHANCEMENT: Now generates section titles in the appropriate language to prevent empty sections
 * from displaying English titles when the resume is in another language.
 *
 * ENHANCEMENT: Added explicit language requirements for suggestions and keywords to ensure they
 * are generated in the correct language instead of defaulting to English.
 *
 * Features:
 * - HTML-formatted output with section IDs for improved template support
 * - Support for multiple languages and customizations
 * - Specialized instructions for different AI models
 * - Comprehensive section identification for better resume structure
 * - Real-time ATS score calculation based on multiple factors
 * - STANDARDIZED HEADER STRUCTURE - Guaranteed compatibility with all templates
 * - Enhanced contact information validation to prevent empty fields
 * - SECTION TITLES GENERATION - AI generates titles in correct language for empty sections
 * - MULTILINGUAL SUGGESTIONS/KEYWORDS - AI generates suggestions and keywords in resume language
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
  /** Industry sector for more targeted keywords */
  industrySector?: string;
  /** Job description text to better match keywords */
  jobDescriptionText?: string;
}

/**
 * Suggestion types used in the resume optimization response
 * These categories help organize different types of improvements
 */
export const SUGGESTION_TYPES = [
  "structure", // Related to the organization and layout of the resume
  "content", // Related to the actual content and wording
  "skills", // Related to technical and soft skills representation
  "formatting", // Related to visual aspects and formatting
  "language", // Related to grammar, spelling, and language use
  "keywords", // Related to industry-specific keywords and terminology
  "ats", // Specifically addressing ATS compatibility issues
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
  jobDescriptionText: "",
};

/**
 * Mapping of section IDs to human-readable section names in English
 * This serves as the base for all languages - section IDs remain constant across languages
 */
export const RESUME_SECTION_NAMES_EN: Record<string, string> = {
  "resume-header": "Personal Information",
  "resume-summary": "Professional Summary",
  "resume-experience": "Experience",
  "resume-education": "Education",
  "resume-skills": "Skills",
  "resume-languages": "Languages",
  "resume-certifications": "Certifications",
  "resume-projects": "Projects",
  "resume-awards": "Awards & Achievements",
  "resume-references": "References",
  "resume-publications": "Publications",
  "resume-volunteering": "Volunteering",
  "resume-additional": "Additional Information",
  "resume-interests": "Interests",
};

/**
 * Section name translations for French
 * Maps section IDs to French section names
 */
export const RESUME_SECTION_NAMES_FR: Record<string, string> = {
  "resume-header": "Informations Personnelles",
  "resume-summary": "Profil Professionnel",
  "resume-experience": "Expérience Professionnelle",
  "resume-education": "Formation",
  "resume-skills": "Compétences",
  "resume-languages": "Langues",
  "resume-certifications": "Certifications",
  "resume-projects": "Projets",
  "resume-awards": "Prix et Distinctions",
  "resume-references": "Références",
  "resume-publications": "Publications",
  "resume-volunteering": "Bénévolat",
  "resume-additional": "Informations Complémentaires",
  "resume-interests": "Centres d'Intérêt",
};

/**
 * Section name translations for Spanish
 * Maps section IDs to Spanish section names
 */
export const RESUME_SECTION_NAMES_ES: Record<string, string> = {
  "resume-header": "Información Personal",
  "resume-summary": "Perfil Profesional",
  "resume-experience": "Experiencia Profesional",
  "resume-education": "Formación Académica",
  "resume-skills": "Habilidades",
  "resume-languages": "Idiomas",
  "resume-certifications": "Certificaciones",
  "resume-projects": "Proyectos",
  "resume-awards": "Premios y Reconocimientos",
  "resume-references": "Referencias",
  "resume-publications": "Publicaciones",
  "resume-volunteering": "Voluntariado",
  "resume-additional": "Información Adicional",
  "resume-interests": "Intereses",
};

/**
 * Get section names based on the specified language
 * Supports multiple language variations and provides fallbacks
 *
 * @param language - The language to retrieve section names for
 * @returns Record mapping section IDs to localized section names
 */
export function getSectionNamesByLanguage(
  language: string
): Record<string, string> {
  // Normalize language for matching - handles various input formats
  const normalizedLang = language.toLowerCase().trim();

  // Check for French language variations
  if (
    normalizedLang === "french" ||
    normalizedLang === "français" ||
    normalizedLang === "francais"
  ) {
    return RESUME_SECTION_NAMES_FR;
  }
  // Check for Spanish language variations
  else if (
    normalizedLang === "spanish" ||
    normalizedLang === "español" ||
    normalizedLang === "espanol"
  ) {
    return RESUME_SECTION_NAMES_ES;
  }
  // Default to English for any other language
  else {
    return RESUME_SECTION_NAMES_EN;
  }
}

/**
 * Sections with their importance weight for ATS scoring
 * Different sections have different impacts on the overall ATS score
 */
export const SECTION_WEIGHTS = {
  "resume-experience": 0.3, // Experience is typically most important
  "resume-skills": 0.25, // Skills are highly relevant
  "resume-education": 0.15, // Education is important but less than experience
  "resume-summary": 0.1, // Professional summary sets the tone
  "resume-projects": 0.07, // Projects demonstrate practical skills
  "resume-certifications": 0.05, // Certifications validate skills
  "resume-languages": 0.03, // Languages can be important in global positions
  "resume-awards": 0.02, // Awards demonstrate excellence
  "resume-publications": 0.01, // Publications show expertise in some fields
  "resume-volunteering": 0.01, // Volunteering shows character
  "resume-additional": 0.005, // Additional information can be relevant
  "resume-interests": 0.005, // Interests are less important for ATS
};

/**
 * STANDARDIZED HEADER STRUCTURE - Universal template compatibility
 * This exact structure MUST be used by all templates to ensure perfect compatibility
 *
 * CRITICAL: This structure works with ALL templates (basic, professional, creative, executive, technical, compact)
 * The standardized CSS classes enable proper styling and information extraction across all templates
 */
export const STANDARD_HEADER_STRUCTURE = `<section id="resume-header">
 <h1 class="section-title name">Person Name</h1>
 <p class="title">Professional Title</p> <!-- Only if professional title exists in original -->
 <p>
   <span class="phone">Actual Phone Number</span> | 
   <span class="email">Actual Email</span> |
   <span class="linkedin">Actual LinkedIn URL</span> | <!-- Only if LinkedIn exists -->
   <span class="portfolio">Portfolio URL</span> <!-- Only if portfolio exists -->
 </p>
 <p><span class="address">Full Address</span></p> <!-- Only if address exists -->
</section>`;

/**
 * Standard structure for the experience section
 * Provides a consistent format for job entries
 */
export const STANDARD_EXPERIENCE_STRUCTURE = `<section id="resume-experience">
 <h2 class="section-title">Experience</h2>
 <h3>Job Title - Company Name</h3>
 <p class="date">Month Year - Month Year</p>
 <ul>
   <li>Accomplishment 1 with quantifiable results</li>
   <li>Accomplishment 2 with quantifiable results</li>
 </ul>
</section>`;

/**
 * Generates a standardized system prompt for resume optimization
 * This sets the overall context and role for the AI
 * Enhanced with mandatory standardized header structure requirements
 *
 * @param options - Configuration options for the prompt
 * @returns A system prompt string for AI services
 */
export function generateSystemPrompt(options: PromptOptions = {}): string {
  // Merge default options with provided options
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Get section names in the appropriate language
  const sectionNames = getSectionNamesByLanguage(
    typeof config.language === "string" ? config.language : "en"
  );

  // Base role description - establishes AI's role and primary objectives
  let systemPrompt = `You are an expert resume optimizer who helps improve resumes for ATS compatibility and recruiter appeal in ${config.language}.
 
You specialize in transforming regular resumes into highly effective documents that pass through Applicant Tracking Systems and impress recruiters.

You will format your output as HTML with semantic section IDs to enable proper template application. You will ensure all sections are properly identified, including specialized sections like interests, volunteering, publications, and references if present in the original resume.`;

  // Add target job role context if provided - helps AI focus on relevant optimizations
  if (config.targetRole) {
    systemPrompt += `\n\nYou are specifically optimizing this resume for ${config.targetRole} positions, so emphasize relevant skills and experiences accordingly.`;
  }

  // Add industry sector context if provided - enables industry-specific optimizations
  if (config.industrySector) {
    systemPrompt += `\n\nYou are optimizing this resume for the ${config.industrySector} industry sector, focusing on high-value keywords and skills specific to this domain.`;
  }

  // Add focused sections if provided - allows targeting specific areas for improvement
  if (config.focusSections && config.focusSections.length > 0) {
    systemPrompt += `\n\nPay special attention to improving these sections: ${config.focusSections
      .map((section) => sectionNames[section] || section)
      .join(", ")}.`;
  }

  // CSS classes instructions - important addition for correct class placement
  systemPrompt += `\n\nIMPORTANT: When formatting the HTML, place the "section-title" class on heading elements (h1, h2), NOT on section elements. Example:
- Correct: <section id="resume-summary"><h2 class="section-title">${sectionNames["resume-summary"]}</h2>...</section>
- Incorrect: <section id="resume-summary" class="section-title"><h2>${sectionNames["resume-summary"]}</h2>...</section>`;

  // Language-specific instructions for section names - ensures proper localization
  systemPrompt += `\n\nIMPORTANT: All section titles must be in ${config.language}. Do not use English section names unless ${config.language} is English. Use culturally appropriate section names for the language.`;

  // Enhanced critical instructions for suggestions and keywords - prevents duplication
  systemPrompt += `\n\nCRITICAL INSTRUCTIONS FOR SUGGESTIONS AND KEYWORDS:
- NEVER suggest improvements or changes that are already implemented in the resume
- Each suggestion must provide genuinely NEW content or structure that doesn't exist yet
- Keywords must be highly relevant to the industry/role AND absent from the current resume
- Before suggesting a keyword, verify that it does NOT appear in any form (singular, plural, hyphenated) in the resume
- Do not suggest generic skills that are clearly demonstrated throughout the resume
- Prioritize suggesting specialized or niche skills that would add significant value
- For technologies or tools already mentioned in the resume, do not suggest them again as keywords
- Analyze the entire resume content first to identify all existing skills and keywords`;

  // CRITICAL: STANDARDIZED HEADER STRUCTURE - This is the key change for universal template compatibility
  systemPrompt += `\n\nCRITICAL STANDARDIZED HEADER STRUCTURE - MANDATORY FOR ALL TEMPLATES:
- The header section MUST follow this EXACT structure for universal template compatibility:

<section id="resume-header">
 <h1 class="section-title name">Person Name</h1>
 <p class="title">Professional Title</p> <!-- Only if professional title exists in original -->
 <p>
   <span class="phone">Actual Phone Number</span> | 
   <span class="email">Actual Email</span> |
   <span class="linkedin">Actual LinkedIn URL</span> | <!-- Only if LinkedIn exists -->
   <span class="portfolio">Portfolio URL</span> <!-- Only if portfolio exists -->
 </p>
 <p><span class="address">Full Address</span></p> <!-- Only if address exists -->
</section>

ABSOLUTELY MANDATORY HEADER REQUIREMENTS - NO EXCEPTIONS:
- The h1 MUST have both "section-title" AND "name" classes: <h1 class="section-title name">
- Professional title MUST have "title" class: <p class="title">Professional Title</p>
- ALL contact elements MUST be in ONE paragraph with pipe separators (|)
- Phone MUST be wrapped: <span class="phone">Phone Number</span>
- Email MUST be wrapped: <span class="email">Email Address</span>  
- LinkedIn MUST be wrapped: <span class="linkedin">LinkedIn Info</span>
- Portfolio MUST be wrapped: <span class="portfolio">Portfolio Info</span>
- Address MUST be in separate paragraph: <p><span class="address">Full Address</span></p>
- This structure is REQUIRED for compatibility with ALL templates (basic, professional, creative, executive, technical, compact)`;

  // Enhanced validation rules for contact information - prevents placeholder content
  systemPrompt += `\n\nCRITICAL CONTACT INFORMATION VALIDATION RULES:
- NEVER add contact information that doesn't exist in the original resume
- NEVER add generic placeholders like "LinkedIn" without an actual LinkedIn URL
- If LinkedIn is not mentioned in the original resume, DO NOT include LinkedIn span in the contact paragraph
- If portfolio is not mentioned in the original resume, DO NOT include portfolio span in the contact paragraph
- If professional title is not clear in the original resume, DO NOT add the title paragraph
- ONLY include contact elements that have real, specific values from the original resume
- Use the pipe character (|) ONLY between contact elements that actually exist
- Remove trailing pipe characters if the last contact element doesn't exist
- The address paragraph should ONLY exist if there is actual address information`;

  // Examples of correct header implementation - provides clear formatting guidelines
  systemPrompt += `\n\nSTANDARDIZED HEADER EXAMPLES FOR DIFFERENT SCENARIOS:

EXAMPLE 1 - Full contact information (French format):
<section id="resume-header">
 <h1 class="section-title name">Jean Dupuis</h1>
 <p class="title">Développeur Senior</p>
 <p>
   <span class="phone">06 45 78 12 34</span> | 
   <span class="email">jean.dupuis@email.fr</span> |
   <span class="linkedin">linkedin.com/in/jeandupuis</span> | 
   <span class="portfolio">portfolio.jeandupuis.fr</span>
 </p>
 <p><span class="address">14 rue des Lilas<br>75012 Paris, France</span></p>
</section>

EXAMPLE 2 - No LinkedIn or portfolio (Canadian format):
<section id="resume-header">
 <h1 class="section-title name">John Doe</h1>
 <p class="title">Software Developer</p>
 <p>
   <span class="phone">418-261-9999</span> | 
   <span class="email">johndoe@gmail.com</span>
 </p>
 <p><span class="address">9999 ave Villa Saint-Vincent app.999<br>Québec, Québec G1H 4B6</span></p>
</section>

EXAMPLE 3 - Minimal contact info (US format):
<section id="resume-header">
 <h1 class="section-title name">Jane Smith</h1>
 <p>
   <span class="phone">+1 (555) 123-4567</span> | 
   <span class="email">jane.smith@company.com</span>
 </p>
</section>`;

  // Critical section requirements - ensures mandatory sections are included
  systemPrompt += `\n\nCRITICAL SECTION REQUIREMENTS:
- ALWAYS create a <section id="resume-summary"> even if there is none in the original resume
- If there is no summary in the original, create one based on the information available in the resume
- The summary should be concise (2-4 sentences) and highlight the candidate's key qualifications
- The summary should include years of experience, key skills, and professional focus
- Use this format for the created summary section:
 <section id="resume-summary">
   <h2 class="section-title">${sectionNames["resume-summary"]}</h2>
   <p>Professional with [X years] of experience in [field/industry]. Specialized in [key skills/areas]. Focused on [achievements/goals]...</p>
 </section>
- This summary section is crucial for ATS scanning and for providing a quick overview to recruiters`;

  // ENHANCEMENT: Explicit multilingual requirements for ALL content including suggestions and keywords
  systemPrompt += `\n\nCRITICAL MULTILINGUAL REQUIREMENTS - MANDATORY AND NON-NEGOTIABLE:
- The resume content MUST be in ${config.language}
- ALL suggestions MUST be written in ${config.language}
- ALL keywords MUST be in ${config.language}
- ALL section titles MUST be in ${config.language}
- This is ABSOLUTELY MANDATORY - if content is provided in the wrong language, the result will be unusable
- The user interface expects content in ${config.language} and will malfunction if English content is provided for non-English resumes`;

  // Final instructions - reinforces key requirements
  systemPrompt += `\n\nI want all predefined sections to be included in the optimization result even if some are empty of content.

It is extremely important to create the resume, the suggestions and the keywords in this language: ${config.language}, if this guideline is not followed, the final result will be incorrect or unusable, it is MANDATORY and NON-NEGOTIABLE.

REMEMBER: The standardized header structure is MANDATORY and NON-NEGOTIABLE for universal template compatibility.`;

  return systemPrompt;
}

/**
 * Generates a standardized user prompt for resume optimization
 * This contains the main instructions for the AI with standardized header requirements
 * ENHANCED: Now includes section titles generation for multilingual support
 * ENHANCED: Added explicit language requirements for suggestions and keywords
 *
 * @param resumeText - The original resume text to optimize
 * @param options - Configuration options for the prompt
 * @returns A user prompt string for AI services
 */
export function generateResumePrompt(
  resumeText: string,
  options: PromptOptions = {}
): string {
  // Merge default options with provided options
  const config = { ...DEFAULT_OPTIONS, ...options };

  // Get section names in the appropriate language
  const sectionNames = getSectionNamesByLanguage(
    typeof config.language === "string" ? config.language : "en"
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

  // Add detailed ATS instructions if requested - provides specific optimization guidance
  if (config.includeAtsInstructions) {
    prompt += `\n\nATS OPTIMIZATION TIPS:
- Use standard section headings in ${config.language} (e.g., "${sectionNames["resume-experience"]}", "${sectionNames["resume-education"]}", "${sectionNames["resume-skills"]}")
- Include keywords from the industry and job descriptions
- Avoid using tables, graphics, or complex formatting
- Use a clean, simple layout with clear section breaks
- Ensure contact information is clearly visible at the top
- Structure content for easy parsing by automated systems
- Use bullet points for accomplishments and responsibilities
- Quantify achievements with metrics when possible
- Match skills and experience with job requirements`;
  }

  // CRITICAL: STANDARDIZED HTML FORMATTING INSTRUCTIONS
  prompt += `\n\nCRITICAL HTML FORMATTING INSTRUCTIONS WITH STANDARDIZED HEADER STRUCTURE:
- Format your response with semantic HTML structure following these exact rules:

HEADER SECTION - MANDATORY STANDARDIZED STRUCTURE FOR ALL TEMPLATES:
Before creating the header, CAREFULLY ANALYZE the original resume to identify what contact information actually exists.

STEP 1: Identify existing contact information in the original resume:
- Look for phone numbers (any international format)
- Look for email addresses  
- Look for LinkedIn URLs or profiles (like "linkedin.com/in/username" or "LinkedIn: username")
- Look for portfolio URLs or website mentions
- Look for address information
- Look for professional titles or job descriptions

STEP 2: Create header with MANDATORY STANDARDIZED STRUCTURE:

TEMPLATE - EXACT STRUCTURE REQUIRED:
<section id="resume-header">
 <h1 class="section-title name">Person Name</h1>
 <p class="title">Professional Title</p> <!-- Only if clear professional title exists -->
 <p>
   <span class="phone">Actual Phone Number</span> | 
   <span class="email">Actual Email</span> |
   <span class="linkedin">Actual LinkedIn URL</span> | <!-- Only if LinkedIn exists -->
   <span class="portfolio">Portfolio URL</span> <!-- Only if portfolio exists -->
 </p>
 <p><span class="address">Full Address</span></p> <!-- Only if address exists -->
</section>

RULES FOR ALL OTHER SECTIONS:`;

  // List all possible sections with their IDs and correct class placement
  Object.entries(sectionNames).forEach(([id, name]) => {
    if (id !== "resume-header") {
      prompt += `\n  - Use <section id="${id}"> for ${name} section (without any class on the section tag)`;
      prompt += `\n    - Add class="section-title" to the section title: <h2 class="section-title">${name}</h2>`;
    }
  });

  // Enhanced format instructions with standardized header structure
  prompt += `\n
GENERAL FORMATTING RULES:
- ALWAYS add the class "section-title" to the HEADING tags (h1, h2), NEVER to the section tags
- Create proper sections for ALL applicable categories from the resume
- Use the section titles in ${config.language}, not in English (unless ${config.language} is English)
- Even if references only say "Available upon request," place this in a properly formatted resume-references section
- Use appropriate HTML tags (h1, h2, h3, p, ul, li) for proper structure within each section
- Make sure the HTML is well-formed and valid
- Do not include any CSS or styling

MANDATORY STANDARDIZED HEADER REQUIREMENTS:
- The h1 MUST have both "section-title" AND "name" classes
- Professional title MUST have "title" class and be in separate paragraph
- ALL contact elements MUST be in ONE paragraph with proper span wrapping
- Use pipe character (|) as separator between contact elements that exist
- Remove trailing pipes if contact elements don't exist
- Address MUST be in separate paragraph with address class
- This standardized structure ensures compatibility with ALL templates

MANDATORY SECTIONS:
- The resume MUST include a summary section even if the original resume doesn't have one
- Create a summary section with this format:
 <section id="resume-summary">
   <h2 class="section-title">${sectionNames["resume-summary"]}</h2>
   <p>Professional with [X years] of experience in [field/industry]. Specialized in [key skills/areas]. Focused on [achievements/goals]...</p>
 </section>
- If the original resume lacks a summary, create one by analyzing the experience, skills, and education sections
- The summary is crucial for ATS compatibility and should highlight the candidate's most relevant qualifications
- This section should always appear near the top of the resume, after the header

EXAMPLE OF CORRECTLY FORMATTED EXPERIENCE SECTION:
<section id="resume-experience">
 <h2 class="section-title">${sectionNames["resume-experience"]}</h2>
 <h3>Job Title - Company Name</h3>
 <p class="date">Month Year - Month Year</p>
 <ul>
   <li>Accomplishment with quantifiable results</li>
   <li>Accomplishment with quantifiable results</li>
 </ul>
</section>`;

  // Add the resume content to be optimized
  prompt += `\n\nResume to optimize:
${resumeText}`;

  // Add job description context if available - helps tailor optimization to specific role
  if (config.jobDescriptionText) {
    prompt += `\n\nJob Description to match against:
${config.jobDescriptionText}
The above job description should be used to identify relevant keywords and tailor suggestions.`;
  }

  // Enhanced instructions for keywords and suggestions - prevents recommending existing content
  prompt += `\n\nKEYWORD AND SUGGESTION GENERATION INSTRUCTIONS:
- First, CAREFULLY analyze the resume to identify ALL skills, terms, and concepts that are ALREADY PRESENT
- For each potential keyword or suggestion, check the entire resume to ensure it's not already mentioned
- Create an internal list of EXISTING keywords to avoid suggesting them again
- Only suggest keywords that are 100% ABSENT from the resume in ANY form (including plurals, hyphenations, or variations)
- For suggestions, focus on recommending genuinely new content that would significantly enhance the resume
- Prioritize suggesting skills, achievements, or structural improvements that are missing entirely
- Each suggestion should offer something that cannot be inferred from the existing content`;

  // ENHANCEMENT: Add section titles generation instruction
  prompt += `\n\nCRITICAL SECTION TITLES GENERATION FOR MULTILINGUAL SUPPORT:
- In addition to the optimized resume content, you MUST also provide the section titles in ${config.language}
- This is essential to ensure that empty sections in the editing interface display the correct language
- Include section titles for ALL standard resume sections, even if they don't exist in the current resume
- The section titles will be used by the frontend to create empty sections with proper language labels

Required section titles in ${config.language}:
- Personal Information section: "${sectionNames["resume-header"]}"
- Professional Summary section: "${sectionNames["resume-summary"]}"
- Experience section: "${sectionNames["resume-experience"]}"
- Education section: "${sectionNames["resume-education"]}"
- Skills section: "${sectionNames["resume-skills"]}"
- Languages section: "${sectionNames["resume-languages"]}"
- Certifications section: "${sectionNames["resume-certifications"]}"
- Projects section: "${sectionNames["resume-projects"]}"
- Awards section: "${sectionNames["resume-awards"]}"
- References section: "${sectionNames["resume-references"]}"
- Publications section: "${sectionNames["resume-publications"]}"
- Volunteering section: "${sectionNames["resume-volunteering"]}"
- Additional Information section: "${sectionNames["resume-additional"]}"
- Interests section: "${sectionNames["resume-interests"]}"

These titles must be included in your response to enable proper multilingual section creation.

CRITICAL SUGGESTIONS AND KEYWORDS LANGUAGE REQUIREMENTS:
- ALL suggestions must be written in ${config.language}
- ALL keyword suggestions must be in ${config.language}
- The "text" field in suggestions MUST be in ${config.language}
- The "impact" field in suggestions MUST be in ${config.language}
- The keywordSuggestions array MUST contain keywords in ${config.language}
- This is MANDATORY and NON-NEGOTIABLE - the interface language is ${config.language}
- If you provide suggestions or keywords in English when the resume is in ${config.language}, the result will be unusable
- Example for French: suggestions like "Ajoutez des métriques quantifiables" not "Add quantifiable metrics"
- Example for French: keywords like "Gestion de projet" not "Project management"
- Example for Spanish: suggestions like "Agregue métricas cuantificables" not "Add quantifiable metrics"
- Example for Spanish: keywords like "Gestión de proyectos" not "Project management"
- The AI must think in ${config.language} when generating suggestions and keywords, not translate from English`;

  // Add output format instructions for the AI response
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
 "atsScore": (number between 0-100),
 "sectionTitles": {
   "resume-header": "${sectionNames["resume-header"]}",
   "resume-summary": "${sectionNames["resume-summary"]}",
   "resume-experience": "${sectionNames["resume-experience"]}",
   "resume-education": "${sectionNames["resume-education"]}",
   "resume-skills": "${sectionNames["resume-skills"]}",
   "resume-languages": "${sectionNames["resume-languages"]}",
   "resume-certifications": "${sectionNames["resume-certifications"]}",
   "resume-projects": "${sectionNames["resume-projects"]}",
   "resume-awards": "${sectionNames["resume-awards"]}",
   "resume-references": "${sectionNames["resume-references"]}",
   "resume-publications": "${sectionNames["resume-publications"]}",
   "resume-volunteering": "${sectionNames["resume-volunteering"]}",
   "resume-additional": "${sectionNames["resume-additional"]}",
   "resume-interests": "${sectionNames["resume-interests"]}"
 }
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

  // Final guidelines with critical standardized header reminders and language requirements
  prompt += `\n\nGuidelines:
- Provide between 1-${config.maxSuggestions} high-impact suggestions across different categories
- Include 1-${config.maxKeywords} relevant industry keywords that should be added to the resume
- Format the optimizedText as HTML with section IDs as specified above
- Ensure EVERY applicable section has proper identification with the correct section ID
- Ensure the optimized text maintains all relevant information from the original
- Do not include ANY explanatory text, code blocks, or other content outside the JSON structure
- CRITICAL: The 'section-title' class must be on the h1/h2 tags, NOT on the section tags
- CRITICAL: The section titles in the output HTML must be in ${config.language}, not in English
- CRITICAL: ALL suggestions and keywords must be in ${config.language}, not in English
- CRITICAL: Double-check that suggestions and keywords don't recommend what's already in the resume
- CRITICAL: The header MUST use the standardized structure for universal template compatibility
- CRITICAL: Only include contact information that actually exists in the original resume
- CRITICAL: Include the sectionTitles object with all section names in ${config.language} for multilingual support
- CRITICAL: Verify that suggestions and keywords are written in ${config.language} before including them in the response`;

  return prompt;
}

/**
 * Generates a concise prompt specifically for Claude AI
 * Claude sometimes requires more explicit instructions to produce properly formatted JSON
 * Enhanced with standardized header structure requirements and section titles generation
 * Enhanced with explicit multilingual requirements for suggestions and keywords
 *
 * @param resumeText - The original resume text to optimize
 * @param options - Configuration options for the prompt
 * @returns A user prompt string for Claude AI
 */
export function generateClaudePrompt(
  resumeText: string,
  options: PromptOptions = {}
): string {
  const basePrompt = generateResumePrompt(resumeText, options);

  // Enhanced Claude-specific instructions with standardized header structure and section titles
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
- Make sure all section titles are in ${
    options.language || DEFAULT_OPTIONS.language
  }, not in English (unless the language is English)
- CRITICALLY IMPORTANT: Before suggesting a keyword, verify it is COMPLETELY ABSENT from the resume in ALL forms
- Only suggest genuinely new content in suggestions, not repetitions of what's already there
- CRITICAL: Include the "sectionTitles" object with all section names in the correct language for multilingual support

CRITICALLY IMPORTANT FOR CLAUDE - MANDATORY STANDARDIZED HEADER STRUCTURE:
Before creating the header, analyze the original resume to identify existing contact information.

The header section MUST follow EXACTLY this standardized structure:

STEP 1: Check what contact information exists in the original resume
STEP 2: Create header structure with MANDATORY standardized format

Standardized header template - EXACT STRUCTURE REQUIRED:
<section id="resume-header">
 <h1 class="section-title name">Person Name</h1>
 <p class="title">Professional Title</p> <!-- Only if title exists -->
 <p>
   <span class="phone">Actual Phone Number</span> | 
   <span class="email">Actual Email</span> |
   <span class="linkedin">Actual LinkedIn URL</span> | <!-- Only if LinkedIn exists -->
   <span class="portfolio">Portfolio URL</span> <!-- Only if portfolio exists -->
 </p>
 <p><span class="address">Full Address</span></p> <!-- Only if address exists -->
</section>

MANDATORY STANDARDIZED STRUCTURE REQUIREMENTS FOR CLAUDE:
- h1 MUST have both "section-title" and "name" classes
- Professional title MUST have "title" class in separate paragraph
- ALL contact elements MUST be in ONE paragraph with pipe separators
- Address MUST be in separate paragraph with "address" class
- Remove pipe separators for non-existent contact elements
- This standardized structure is REQUIRED for compatibility with ALL templates (basic, professional, creative, executive, technical, compact)

CLAUDE-SPECIFIC SECTION TITLES GENERATION:
- The "sectionTitles" object in your JSON response is MANDATORY
- It ensures empty sections display proper language titles in the editing interface
- All section titles must be in ${options.language || DEFAULT_OPTIONS.language}
- This prevents English titles from appearing when editing resumes in other languages

CLAUDE-SPECIFIC MULTILINGUAL REQUIREMENTS FOR SUGGESTIONS AND KEYWORDS:
- ALL suggestions in the "suggestions" array MUST be written in ${
    options.language || DEFAULT_OPTIONS.language
  }
- ALL keywords in the "keywordSuggestions" array MUST be in ${
    options.language || DEFAULT_OPTIONS.language
  }
- The "text" field in each suggestion MUST be in ${
    options.language || DEFAULT_OPTIONS.language
  }
- The "impact" field in each suggestion MUST be in ${
    options.language || DEFAULT_OPTIONS.language
  }
- This is ABSOLUTELY CRITICAL for Claude - the interface expects content in the resume's language
- Do NOT translate from English - think directly in ${
    options.language || DEFAULT_OPTIONS.language
  } when generating suggestions and keywords
- Examples for French: "Ajoutez des métriques quantifiables pour renforcer vos réalisations" not "Add quantifiable metrics"
- Examples for Spanish: "Agregue métricas cuantificables para fortalecer sus logros" not "Add quantifiable metrics"`;
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
 * Handles provider-specific optimizations and ensures proper multilingual support
 *
 * @param resumeText - The original resume text to optimize
 * @param provider - The AI provider (openai, gemini, or claude)
 * @param options - Configuration options for the prompt
 * @returns Both system and user prompts appropriate for the specified AI provider
 */
export function getProviderPrompts(
  resumeText: string,
  provider: "openai" | "gemini" | "claude",
  options: PromptOptions = {}
): CompletePrompt {
  const systemPrompt = generateSystemPrompt(options);
  let userPrompt: string;

  // Use provider-specific prompt generation when applicable
  switch (provider) {
    case "claude":
      userPrompt = generateClaudePrompt(resumeText, options);
      break;
    case "openai":
    case "gemini":
    default:
      userPrompt = generateResumePrompt(resumeText, options);
      break;
  }
  return { systemPrompt, userPrompt };
}

/**
 * Calculate the impact a keyword has on ATS score improvement
 * Used to determine how much a keyword will boost the overall score
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
  const baseImpact = resumeContent.toLowerCase().includes(keyword.toLowerCase())
    ? 0.3
    : 0.8;

  // Adjust impact based on target role if available
  if (targetRole && targetRole.toLowerCase().includes(keyword.toLowerCase())) {
    return Math.min(baseImpact + 0.3, 1.0); // Higher impact for role-relevant keywords
  }

  return baseImpact;
}

/**
 * Calculate the impact a suggestion has on ATS score improvement
 * Used to determine how much a suggestion will boost the overall score
 *
 * @param suggestion - The suggestion object with type, text and impact
 * @returns Score impact value from 1 to 10
 */
export function calculateSuggestionImpact(suggestion: {
  type: string;
  text: string;
  impact: string;
}): number {
  // Base impact by suggestion type - different types have different importance
  const typeImpacts: Record<string, number> = {
    structure: 7, // Structure improvements have high impact
    keywords: 8, // Keyword improvements have very high impact
    content: 6, // Content improvements have medium-high impact
    skills: 7, // Skills improvements have high impact
    formatting: 5, // Formatting improvements have medium impact
    language: 4, // Language improvements have lower-medium impact
    ats: 8, // Direct ATS improvements have very high impact
  };

  // Base score from suggestion type
  const baseScore = typeImpacts[suggestion.type] || 5;

  // Adjust based on impact text content - look for keywords indicating importance
  let impactModifier = 0;
  const impactText = suggestion.impact.toLowerCase();

  if (
    impactText.includes("significant") ||
    impactText.includes("substantial") ||
    impactText.includes("critical")
  ) {
    impactModifier = 2;
  } else if (
    impactText.includes("important") ||
    impactText.includes("notably")
  ) {
    impactModifier = 1;
  } else if (impactText.includes("minor") || impactText.includes("slight")) {
    impactModifier = -1;
  }

  // Return the adjusted score (1-10 range)
  return Math.max(1, Math.min(10, baseScore + impactModifier));
}

/**
 * Check if a keyword is already present in the resume content
 * Accounts for variations like plurals, hyphenations, etc.
 * This prevents the AI from suggesting keywords that already exist
 *
 * @param keyword - The keyword to check
 * @param resumeContent - The resume content to search in
 * @returns Boolean indicating if the keyword is already present
 */
export function isKeywordAlreadyPresent(
  keyword: string,
  resumeContent: string
): boolean {
  // Normalize content and keyword for comparison
  const normalizedContent = resumeContent.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase();

  // Check for exact match
  if (normalizedContent.includes(normalizedKeyword)) {
    return true;
  }

  // Check for plural variations
  const singularKeyword = normalizedKeyword.endsWith("s")
    ? normalizedKeyword.slice(0, -1)
    : normalizedKeyword;
  const pluralKeyword = normalizedKeyword.endsWith("s")
    ? normalizedKeyword
    : normalizedKeyword + "s";

  if (
    normalizedContent.includes(singularKeyword) ||
    normalizedContent.includes(pluralKeyword)
  ) {
    return true;
  }

  // Check for hyphenated variations
  if (normalizedKeyword.includes("-")) {
    const withoutHyphen = normalizedKeyword.replace(/-/g, " ");
    if (normalizedContent.includes(withoutHyphen)) {
      return true;
    }
  } else if (normalizedKeyword.includes(" ")) {
    const withHyphen = normalizedKeyword.replace(/ /g, "-");
    if (normalizedContent.includes(withHyphen)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate an updated ATS score based on applied suggestions and keywords
 * This function is used to provide real-time score updates as users apply improvements
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
    totalSuggestionImpact += impactValue / 10;
  }

  // Calculate keyword impact
  let totalKeywordImpact = 0;

  for (const keyword of appliedKeywords) {
    const impactValue = calculateKeywordImpact(keyword, resumeContent);
    // Each keyword can improve score by 0.1 to 0.5 points
    totalKeywordImpact += impactValue / 2;
  }

  // Calculate combined improvement
  // Weighted scoring: suggestions have higher impact (60%) than keywords (40%)
  const improvement = totalSuggestionImpact * 0.6 + totalKeywordImpact * 0.4;

  // Apply diminishing returns for higher base scores
  // The higher the score, the harder it is to improve further
  const diminishingFactor = Math.max(0.1, 1 - baseScore / 150);
  const adjustedImprovement = improvement * diminishingFactor * 10;

  // Calculate new score with ceiling at 100
  return Math.min(100, Math.round(baseScore + adjustedImprovement));
}

/**
 * Interface for header information, used in header normalization function
 * Contains structured data extracted from the resume header
 */
interface HeaderInfo {
  name: string;
  title: string;
  phone: string;
  email: string;
  linkedin: string;
  portfolio: string;
  address: string;
}

/**
 * Normalizes the header structure to ensure maximum template compatibility
 * This function ensures that header content follows the STANDARDIZED structure
 * Enhanced to enforce the universal header format for ALL templates
 *
 * @param headerContent - The HTML content of the header section
 * @returns Normalized header HTML with standardized structure
 */
export function normalizeHeaderStructure(headerContent: string): string {
  try {
    // Create a DOM parser to process the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(headerContent, "text/html");

    // Extract key information from the header using the standardized approach
    const headerInfo: HeaderInfo = {
      name: "",
      title: "",
      phone: "",
      email: "",
      linkedin: "",
      portfolio: "",
      address: "",
    };

    // Extract the name from h1 element
    const nameElement = doc.querySelector("h1");
    if (nameElement) {
      headerInfo.name = nameElement.textContent?.trim() || "";
    }

    // Extract phone number from any element with phone class or phone patterns
    const phoneElement = doc.querySelector(".phone");
    if (phoneElement && phoneElement.textContent) {
      headerInfo.phone = phoneElement.textContent.trim();
    } else {
      // Try to find phone number pattern in any text
      const allText = doc.body.textContent || "";
      const phoneMatch = allText.match(
        /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/
      );
      if (phoneMatch) {
        headerInfo.phone = phoneMatch[0].trim();
      }
    }

    // Extract email from any element with email class or email patterns
    const emailElement = doc.querySelector(".email");
    if (emailElement && emailElement.textContent) {
      headerInfo.email = emailElement.textContent.trim();
    } else {
      // Try to find email pattern in any text
      const allText = doc.body.textContent || "";
      const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        headerInfo.email = emailMatch[0].trim();
      }
    }

    // Extract LinkedIn information
    const linkedinElement = doc.querySelector(".linkedin");
    if (linkedinElement && linkedinElement.textContent) {
      const linkedinText = linkedinElement.textContent.trim();
      // Only include if it has substantial content (not just "LinkedIn")
      if (
        linkedinText.toLowerCase() !== "linkedin" &&
        linkedinText.length > 8
      ) {
        headerInfo.linkedin = linkedinText;
      }
    }

    // Extract portfolio information
    const portfolioElement = doc.querySelector(".portfolio, .link");
    if (portfolioElement && portfolioElement.textContent) {
      const portfolioText = portfolioElement.textContent.trim();
      // Only include if it has substantial content (not just "Portfolio")
      if (
        portfolioText.toLowerCase() !== "portfolio" &&
        portfolioText.length > 9
      ) {
        headerInfo.portfolio = portfolioText;
      }
    }

    // Extract professional title
    // Look for title class first, then check for paragraphs that might be titles
    const titleElement = doc.querySelector(".title");
    if (titleElement && titleElement.textContent) {
      headerInfo.title = titleElement.textContent.trim();
    } else {
      // Check paragraphs for potential professional titles
      const paragraphs = doc.querySelectorAll("p");
      paragraphs.forEach((paragraph, index) => {
        const text = paragraph.textContent?.trim() || "";
        // First paragraph after name that doesn't contain contact info might be title
        if (
          index === 0 &&
          !text.includes("@") &&
          !text.includes("|") &&
          !text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) &&
          text.length < 100
        ) {
          headerInfo.title = text;
        }
      });
    }

    // Extract address information
    const addressElement = doc.querySelector(".address");
    if (addressElement) {
      // Get the HTML content to preserve line breaks
      let addressHtml = addressElement.innerHTML;
      // Convert <br> tags to newlines for proper storage
      addressHtml = addressHtml.replace(/<br\s*\/?>/gi, "\n");
      // Create a temporary div to extract text with line breaks
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = addressHtml;
      const addressText = tempDiv.textContent || "";
      headerInfo.address = addressText.trim();
    }

    // Create the STANDARDIZED header structure
    let newHeader = '<section id="resume-header">\n';
    newHeader += `  <h1 class="section-title name">${headerInfo.name}</h1>\n`;

    // Add professional title if it exists
    if (headerInfo.title) {
      newHeader += `  <p class="title">${headerInfo.title}</p>\n`;
    }

    // Build contact paragraph with only existing elements
    const contactElements: string[] = [];

    if (headerInfo.phone) {
      contactElements.push(`<span class="phone">${headerInfo.phone}</span>`);
    }

    if (headerInfo.email) {
      contactElements.push(`<span class="email">${headerInfo.email}</span>`);
    }

    if (headerInfo.linkedin) {
      contactElements.push(
        `<span class="linkedin">${headerInfo.linkedin}</span>`
      );
    }

    if (headerInfo.portfolio) {
      contactElements.push(
        `<span class="portfolio">${headerInfo.portfolio}</span>`
      );
    }

    // Add contact paragraph only if there are contact elements
    if (contactElements.length > 0) {
      newHeader += "  <p>\n    ";
      newHeader += contactElements.join(" |\n    ");
      newHeader += "\n  </p>\n";
    }

    // Add address if it exists
    if (headerInfo.address) {
      // Replace newlines with <br> tags for display
      const formattedAddress = headerInfo.address.replace(/\n/g, "<br>");
      newHeader += `  <p><span class="address">${formattedAddress}</span></p>\n`;
    }

    // Close the section
    newHeader += "</section>";

    return newHeader;
  } catch (error) {
    console.error("Error normalizing header structure:", error);
    // If processing fails, return the original content
    return headerContent;
  }
}

/**
 * Ensures that the resume has a summary section, creating one if missing
 * This is important for ATS compatibility and template standardization
 * The summary section is crucial for providing a quick overview to recruiters
 *
 * @param html - The HTML content of the resume
 * @param language - The language of the resume (for section title)
 * @returns HTML with guaranteed summary section
 */
export function ensureSummarySection(
  html: string,
  language: string = "English"
): string {
  try {
    // Get section names in the appropriate language
    const sectionNames = getSectionNamesByLanguage(language);
    const summaryTitle = sectionNames["resume-summary"];

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Check if summary section exists
    const summarySection = doc.querySelector("section#resume-summary");
    if (!summarySection) {
      console.log("No summary section found. Creating a generic one.");

      // Create a new summary section
      const newSummary = document.createElement("section");
      newSummary.id = "resume-summary";

      // Create the heading
      const heading = document.createElement("h2");
      heading.className = "section-title";
      heading.textContent = summaryTitle;
      newSummary.appendChild(heading);

      // Create a generic summary paragraph based on other sections
      const paragraph = document.createElement("p");

      // Try to extract experience information for better summary creation
      const experienceSection = doc.querySelector("section#resume-experience");
      const educationSection = doc.querySelector("section#resume-education");
      const skillsSection = doc.querySelector("section#resume-skills");

      // Analyze available information to create a reasonable summary
      let years = "5+"; // Default years of experience
      let field = "the field"; // Default field
      let skills = "relevant skills"; // Default skills

      // Try to determine years of experience from experience section
      if (experienceSection) {
        // Extract dates from experience section to estimate years
        const dates = Array.from(
          experienceSection.querySelectorAll('.date, p:contains("20")')
        )
          .map((el) => el.textContent)
          .filter((text) => text && /\d{4}/.test(text || ""));

        if (dates.length > 0) {
          // Extract years from dates
          const yearMatches = dates.join(" ").match(/\b(19|20)\d{2}\b/g);
          if (yearMatches && yearMatches.length > 0) {
            const yearsArray = yearMatches.map((y) => parseInt(y));
            const earliestYear = Math.min(...yearsArray);
            const currentYear = new Date().getFullYear();
            const estimatedYears = currentYear - earliestYear;

            if (estimatedYears > 0) {
              years = `${estimatedYears}+`;
            }
          }
        }
      }

      // Try to determine field/industry from job titles
      if (experienceSection) {
        const jobTitles = Array.from(experienceSection.querySelectorAll("h3"))
          .map((el) => el.textContent?.trim())
          .filter(Boolean);

        if (jobTitles.length > 0) {
          // Extract common field from job titles
          const commonWords = jobTitles
            .join(" ")
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(/\s+/)
            .filter(
              (word) =>
                word.length > 3 && !["and", "the", "for", "with"].includes(word)
            );

          if (commonWords.length > 0) {
            // Use most frequent meaningful word as field
            const wordCounts: Record<string, number> = {};
            commonWords.forEach((word) => {
              wordCounts[word] = (wordCounts[word] || 0) + 1;
            });

            const sortedWords = Object.entries(wordCounts).sort(
              ([, countA], [, countB]): number =>
                (countB as number) - (countA as number)
            );

            if (sortedWords.length > 0) {
              field = sortedWords[0][0];
              // Capitalize first letter
              field = field.charAt(0).toUpperCase() + field.slice(1);
            }
          }
        }
      }

      // Extract key skills for summary
      if (skillsSection) {
        const skillItems = Array.from(skillsSection.querySelectorAll("li, p"))
          .map((el) => el.textContent?.trim())
          .filter(Boolean)
          .slice(0, 3);

        if (skillItems.length > 0) {
          skills = skillItems.join(", ");
        }
      }

      // Create the summary text
      paragraph.textContent = `Professional with ${years} years of experience in ${field}. Skilled in ${skills}.`;
      newSummary.appendChild(paragraph);

      // Insert the summary section after the header or at the beginning of the body
      const headerSection = doc.querySelector("section#resume-header");
      if (headerSection && headerSection.nextSibling) {
        headerSection.parentNode?.insertBefore(
          newSummary,
          headerSection.nextSibling
        );
      } else {
        const body = doc.querySelector("body");
        if (body) {
          if (body.firstChild) {
            body.insertBefore(newSummary, body.firstChild);
          } else {
            body.appendChild(newSummary);
          }
        }
      }
    }

    // Return the modified HTML
    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error ensuring summary section:", error);
    return html; // Return original if processing fails
  }
}

/**
 * Processes the AI optimization response to ensure template compatibility
 * This function should be called after receiving the AI's response but before
 * sending it to template processing
 * Enhanced to enforce the standardized header structure
 *
 * @param optimizedText - The HTML content returned by the AI
 * @param language - The language of the resume
 * @returns Processed HTML with standardized structure
 */
export function processOptimizedResponse(
  optimizedText: string,
  language: string = "English"
): string {
  try {
    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(optimizedText, "text/html");

    // Process the header section first with standardized structure enforcement
    const headerSection = doc.querySelector("section#resume-header");
    if (headerSection) {
      // Normalize header structure to enforce standardized format
      const headerHtml = headerSection.outerHTML;
      const normalizedHeader = normalizeHeaderStructure(headerHtml);

      // Replace the header with the normalized version
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = normalizedHeader;
      const newHeader = tempDiv.firstChild;

      if (newHeader && headerSection.parentNode) {
        headerSection.parentNode.replaceChild(newHeader, headerSection);
      }
    }

    // Ensure all sections have proper structure
    doc.querySelectorAll("section").forEach((section) => {
      // Make sure no section has the section-title class
      if (section.classList.contains("section-title")) {
        section.classList.remove("section-title");
      }

      // Make sure section headings have section-title class
      const heading = section.querySelector("h1, h2");
      if (heading && !heading.classList.contains("section-title")) {
        heading.classList.add("section-title");
      }

      // IMPORTANT: Preserve contact-related spans in header section
      // Only remove spans from non-header sections if they don't have contact-related classes
      if (section.id !== "resume-header") {
        // Find span tags that are NOT contact-related
        const spans = section.querySelectorAll(
          "span:not(.phone):not(.email):not(.linkedin):not(.portfolio):not(.address):not(.title)"
        );
        spans.forEach((span) => {
          // Replace non-contact span with its content
          const parent = span.parentNode;
          if (parent) {
            const spanContent = span.textContent || "";
            const textNode = document.createTextNode(spanContent);
            parent.replaceChild(textNode, span);
          }
        });
      }
    });

    // Ensure summary section exists
    const processedHtml = doc.body.innerHTML;
    const htmlWithSummary = ensureSummarySection(processedHtml, language);

    return htmlWithSummary;
  } catch (error) {
    console.error("Error processing optimized response:", error);
    return optimizedText; // Return original if processing fails
  }
}

/**
 * Ensures all sections in the resume have the correct structure
 * This is particularly important for template application
 * Enhanced to enforce standardized header structure
 *
 * @param html - The complete HTML content of the resume
 * @returns Normalized HTML with corrected section structures and standardized header
 */
export function normalizeResumeStructure(html: string): string {
  try {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // First process the header to ensure it has standardized structure
    const headerSection = doc.querySelector("section#resume-header");
    if (headerSection) {
      const headerHtml = headerSection.outerHTML;
      const normalizedHeader = normalizeHeaderStructure(headerHtml);

      // Replace the header with the normalized version
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = normalizedHeader;
      const newHeader = tempDiv.firstChild;

      if (newHeader && headerSection.parentNode) {
        headerSection.parentNode.replaceChild(newHeader, headerSection);
      }
    }

    // Ensure all sections have proper structure
    doc.querySelectorAll("section").forEach((section) => {
      // Make sure no section has the section-title class
      if (section.classList.contains("section-title")) {
        section.classList.remove("section-title");
      }

      // Make sure section headings have section-title class
      const heading = section.querySelector("h1, h2");
      if (heading && !heading.classList.contains("section-title")) {
        heading.classList.add("section-title");
      }

      // Special processing for skills and languages sections
      if (section.id === "resume-skills" || section.id === "resume-languages") {
        // Ensure skills and languages are in a proper list
        const lists = section.querySelectorAll("ul");
        if (lists.length === 0) {
          // If no lists, create one with the paragraphs content
          const items = Array.from(section.querySelectorAll("p"))
            .map((p) => p.textContent?.trim())
            .filter((text) => text && text.length > 0);

          if (items.length > 0) {
            const ul = document.createElement("ul");
            items.forEach((item) => {
              if (item) {
                const li = document.createElement("li");
                li.textContent = item;
                ul.appendChild(li);
              }
            });

            // Remove paragraphs
            section.querySelectorAll("p").forEach((p) => {
              if (p.parentNode === section && !p.classList.contains("title")) {
                p.remove();
              }
            });

            // Add the list after the heading
            const headingEl = section.querySelector("h1, h2");
            if (headingEl && headingEl.nextSibling) {
              section.insertBefore(ul, headingEl.nextSibling);
            } else {
              section.appendChild(ul);
            }
          }
        }
      }
    });

    // Return the normalized HTML
    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error normalizing resume structure:", error);
    // If anything fails, return the original HTML
    return html;
  }
}

/**
 * Export a default function that provides the complete prompt for any provider
 * This is the main entry point to get optimized prompts with standardized header structure
 * Enhanced with multilingual support for suggestions and keywords
 *
 * @param resumeText - The original resume text to optimize
 * @param provider - The AI provider to use
 * @param options - Configuration options for the prompt
 * @returns Complete system and user prompts for the specified AI provider
 */
export default function getResumeOptimizationPrompt(
  resumeText: string,
  provider: "openai" | "gemini" | "claude" = "openai",
  options: PromptOptions = {}
): CompletePrompt {
  return getProviderPrompts(resumeText, provider, options);
}
