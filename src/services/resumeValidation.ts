// src/services/resumeValidationService.ts

/**
 * Resume Validation Service
 * 
 * Provides functions to validate if a document is a resume/CV
 * by analyzing its structure and content.
 */

/**
 * Minimum score required to consider a document as a valid resume
 * Can be adjusted based on requirements
 */
const MIN_RESUME_VALIDATION_SCORE = 60;

/**
 * Expected sections in a standard resume
 * Used to validate the document structure
 */
const EXPECTED_RESUME_SECTIONS = [
  { name: 'contact', weight: 20, regex: /\b(?:email|téléphone|tél|tel|phone|adresse|address|linkedin)\b/i },
  { name: 'experience', weight: 25, regex: /\b(?:expérience|experience|emploi|employment|travail|work|poste|position)\b/i },
  { name: 'education', weight: 20, regex: /\b(?:éducation|education|formation|diplôme|diplome|degree|université|university|école|school)\b/i },
  { name: 'skills', weight: 15, regex: /\b(?:compétences|competences|skills|aptitudes|abilities|connaissances|knowledge)\b/i },
  { name: 'languages', weight: 10, regex: /\b(?:langues|languages|français|anglais|english|french|spanish|espagnol|allemand|german)\b/i },
  { name: 'certifications', weight: 10, regex: /\b(?:certifications|certificats|certificates|accréditations|accreditations)\b/i },
];

/**
 * Keywords commonly found in resumes
 * Used to improve validation accuracy
 */
const RESUME_KEYWORDS = [
  // General keywords
  'résumé', 'cv', 'curriculum', 'vitae', 'carrière', 'career',
  // Professional terms
  'gestion', 'management', 'développement', 'development', 'projet', 'project',
  'équipe', 'team', 'leadership', 'responsable', 'responsabilités', 'responsibilities',
  // Common action verbs in resumes
  'dirigé', 'managed', 'développé', 'developed', 'créé', 'created',
  'implémenté', 'implemented', 'amélioré', 'improved', 'coordonné', 'coordinated',
  // Dates and durations
  'depuis', 'since', 'présent', 'present', 'actuel', 'current',
  // Education terminology
  'baccalauréat', 'bachelor', 'maîtrise', 'master', 'doctorat', 'phd', 'doctorate',
];

/**
 * Calculate the probability that a document is a resume based on its content
 * 
 * @param content - Text content of the document to analyze
 * @returns Probability score (0-100) that it is a resume
 */
export function calculateResumeScore(content: string): number {
  if (!content || content.length < 200) {
    return 0; // Document too short to be a valid resume
  }

  // Normalize content for analysis
  const normalizedContent = content.toLowerCase();
  let score = 0;
  let sectionsFound = 0;
  
  // Check for expected resume sections
  for (const section of EXPECTED_RESUME_SECTIONS) {
    if (section.regex.test(normalizedContent)) {
      score += section.weight;
      sectionsFound++;
    }
  }
  
  // Bonus if multiple sections are present (indicating a resume structure)
  if (sectionsFound >= 3) {
    score += 10;
  }
  
  // Check for resume-specific keywords
  let keywordsFound = 0;
  for (const keyword of RESUME_KEYWORDS) {
    if (normalizedContent.includes(keyword)) {
      keywordsFound++;
    }
  }
  
  // Add points based on number of keywords found
  const keywordsScore = Math.min(20, keywordsFound * 2);
  score += keywordsScore;
  
  // Check for structural characteristics of a resume
  
  // Presence of dates (often present in resumes)
  const dateRegex = /\b(19|20)\d{2}\b/;
  if (dateRegex.test(normalizedContent)) {
    score += 5;
  }
  
  // Presence of email address
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  if (emailRegex.test(normalizedContent)) {
    score += 5;
  }
  
  // Presence of phone number
  const phoneRegex = /\b(\+\d{1,3}[ -]?)?\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}\b/;
  if (phoneRegex.test(normalizedContent)) {
    score += 5;
  }
  
  // Limit score to 100
  return Math.min(100, score);
}

/**
 * Detect the main sections of a resume
 * Allows analyzing the document structure
 * 
 * @param content - Text content of the resume
 * @returns Object with the found sections and their content
 */
export function detectResumeSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = content.split('\n');
  
  let currentSection = 'header';
  sections[currentSection] = '';
  
  // Search for potential section titles and divide the content
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Detection of potential section title
    // Criteria: short line, uppercase or with distinct formatting
    if (
      (line.length < 30 && (line === line.toUpperCase() || /^[A-Z]/.test(line))) ||
      /^#+\s/.test(line) // Markdown format
    ) {
      let sectionName = line.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Assign to standard section if possible
      for (const section of EXPECTED_RESUME_SECTIONS) {
        if (section.regex.test(line.toLowerCase())) {
          sectionName = section.name;
          break;
        }
      }
      
      currentSection = sectionName;
      sections[currentSection] = '';
    } else {
      // Add line to current section
      sections[currentSection] += line + '\n';
    }
  }
  
  return sections;
}

/**
 * Validate if a document is a resume by analyzing its content
 * 
 * @param content - Text content of the document to validate
 * @returns Object containing validation result and additional information
 */
export function validateResume(content: string): { 
  isValid: boolean; 
  score: number; 
  sections: Record<string, string>;
  missingElements: string[];
} {
  // Validation score
  const score = calculateResumeScore(content);
  
  // Section detection
  const sections = detectResumeSections(content);
  
  // Identify missing elements
  const missingElements: string[] = [];
  
  for (const section of EXPECTED_RESUME_SECTIONS) {
    let found = false;
    
    // Check if section exists by name
    if (sections[section.name]) {
      found = true;
    } else {
      // Check content with regex
      for (const [sectionName, sectionContent] of Object.entries(sections)) {
        if (section.regex.test(sectionContent)) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      missingElements.push(section.name);
    }
  }
  
  return {
    isValid: score >= MIN_RESUME_VALIDATION_SCORE,
    score,
    sections,
    missingElements
  };
}

/**
 * Determine if the document needs significant improvements
 * Useful for proposing specific recommendations to the user
 * 
 * @param validationResult - Result of resume validation
 * @returns Object containing improvement recommendations
 */
export function getResumeImprovementSuggestions(
  validationResult: ReturnType<typeof validateResume>
): { needsImprovement: boolean; suggestions: string[] } {
  const suggestions: string[] = [];
  
  // Suggestions based on missing sections
  for (const missing of validationResult.missingElements) {
    switch (missing) {
      case 'contact':
        suggestions.push("Add your contact information (email, phone, LinkedIn)");
        break;
      case 'experience':
        suggestions.push("Add a section describing your professional experience");
        break;
      case 'education':
        suggestions.push("Add information about your education and degrees");
        break;
      case 'skills':
        suggestions.push("Add a section highlighting your technical and professional skills");
        break;
      case 'languages':
        suggestions.push("Specify the languages you master");
        break;
      case 'certifications':
        suggestions.push("Include your certifications and additional training");
        break;
    }
  }
  
  // General suggestions if score is low
  if (validationResult.score < MIN_RESUME_VALIDATION_SCORE) {
    suggestions.push("Your document doesn't appear to be a complete resume. Make sure to include essential sections.");
  } else if (validationResult.score < 80) {
    suggestions.push("Your resume could benefit from a clearer structure and more detailed content.");
  }
  
  return {
    needsImprovement: suggestions.length > 0,
    suggestions
  };
}