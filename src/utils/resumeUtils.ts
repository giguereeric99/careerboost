/**
 * Resume Utils - Enhanced Section Management
 * 
 * This module provides utilities for processing and manipulating resume content,
 * with a focus on standardized section management and HTML processing.
 */

import { STANDARD_SECTIONS } from '@/constants/sections';
import DOMPurify from 'dompurify';

import { Section } from '@/types/resume';

/**
 * Standard section names in English - will always be displayed in English
 * Maps section IDs to display names
 */
export const SECTION_NAMES: Record<string, string> = {
  'resume-header': 'Personal Information',
  'resume-summary': 'Professional Summary',
  'resume-experience': 'Experience',
  'resume-education': 'Education',
  'resume-skills': 'Skills & Interests',
  'resume-languages': 'Languages',
  'resume-certifications': 'Certifications',
  'resume-projects': 'Projects',
  'resume-awards': 'Awards & Achievements',
  'resume-references': 'References',
  'resume-publications': 'Publications',
  'resume-volunteering': 'Volunteering',
  'resume-additional': 'Additional Information',
  'resume-interests': 'Interests',
  // Legacy/alternate section IDs mapping to standard names
  'personal-information': 'Personal Information',
  'website-social-links': 'Contact & Social Links',
  'professional-summaries': 'Professional Summary',
  'experiences': 'Experience',
  'formations': 'Education',
  'certifications': 'Certifications',
  'awards-achievements': 'Awards & Achievements',
  'projects': 'Projects',
  'skills-interests': 'Skills & Interests',
  'volunteering': 'Volunteering',
  'publications': 'Publications',
  'referees': 'References',
};

/**
 * Default order for sections - used for sorting sections in a logical order
 */
export const SECTION_ORDER = [
  'resume-header', 'personal-information',
  'resume-summary', 'professional-summaries',
  'resume-experience', 'experiences',
  'resume-education', 'formations',
  'resume-skills', 'skills-interests',
  'resume-languages',
  'resume-certifications', 'certifications',
  'resume-projects', 'projects',
  'resume-awards', 'awards-achievements',
  'resume-volunteering', 'volunteering',
  'resume-publications', 'publications',
  'resume-interests', 'interests',
  'resume-references', 'referees',
  'resume-additional', 'additional'
];

/**
 * Standard placeholders and default content for empty sections
 * Used when creating new sections in the editor
 */
export const SECTION_PLACEHOLDERS: Record<string, string> = {
  'resume-header': 'Your Name\nJob Title\nEmail | Phone | Location',
  'resume-summary': 'Professional summary highlighting your experience, skills, and career goals.',
  'resume-experience': '• Position at Company Name (20XX - Present)\n• Achieved X by implementing Y, resulting in Z.\n• Led a team of X people to accomplish Y goal.',
  'resume-education': '• Degree in Field of Study, Institution Name (20XX - 20XX)\n• GPA: X.X/4.0 (if applicable)\n• Relevant coursework: Course 1, Course 2',
  'resume-skills': '• Technical: Skill 1, Skill 2, Skill 3\n• Soft Skills: Communication, Teamwork, Problem-solving',
  'resume-languages': '• Language 1 (Fluent)\n• Language 2 (Intermediate)\n• Language 3 (Basic)',
  'resume-certifications': '• Certification Name, Issuing Organization (Year)\n• Certification Name, Issuing Organization (Year)',
  'resume-projects': '• Project Name: Brief description and outcomes\n• Project Name: Brief description and outcomes',
  'resume-awards': '• Award Name, Issuing Organization (Year)\n• Recognition, Issuer (Year)',
  'resume-volunteering': '• Volunteer Role, Organization (Period)\n• Key contributions or responsibilities',
  'resume-publications': '• Publication Title, Journal/Publisher, Date\n• Authors, Publication Title, Journal/Publisher, Date',
  'resume-interests': '• Interest 1\n• Interest 2\n• Interest 3',
  'resume-references': '• Reference Name, Position, Company\n• Email, Phone\n\nOR\n\nReferences available upon request',
  'resume-additional': 'Additional relevant information such as workshops, conferences, or other qualifications.'
};

/**
 * Get standardized section name from ID
 * 
 * @param id - Section ID
 * @returns Standardized section name in English
 */
export function getSectionName(id: string): string {
  // Try to find a predefined name
  if (SECTION_NAMES[id]) return SECTION_NAMES[id];
  
  // If not found in standard names, create a formatted title from the ID
  return id
    .replace('resume-', '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Maps alternative section IDs to standard ones
 * Helps normalize section IDs from different sources
 * 
 * @param id - Section ID to normalize
 * @returns Standardized section ID
 */
export function normalizeSecttionId(id: string): string {
  // Map of alternative section IDs to standard ones
  const sectionIdMapping: Record<string, string> = {
    'personal-information': 'resume-header',
    'professional-summaries': 'resume-summary',
    'experiences': 'resume-experience',
    'formations': 'resume-education',
    'skills-interests': 'resume-skills',
    'certifications': 'resume-certifications',
    'projects': 'resume-projects',
    'awards-achievements': 'resume-awards',
    'volunteering': 'resume-volunteering',
    'publications': 'resume-publications',
    'interests': 'resume-interests',
    'referees': 'resume-references',
    'additional': 'resume-additional'
  };
  
  // Return the normalized ID or the original if not found
  return sectionIdMapping[id] || id;
}

/**
 * Checks if a section is empty based on its content
 * A section is considered empty if it has:
 * - No content
 * - Only whitespace
 * - Only heading with no meaningful content
 * - Only placeholder content
 * 
 * @param content - Section content to check
 * @param sectionTitle - Title of the section (to detect placeholder content)
 * @returns Boolean indicating if the section is empty
 */
export function isSectionEmpty(content: string, sectionTitle: string): boolean {
  if (!content) return true;
  
  // Remove whitespace
  const trimmedContent = content.trim();
  if (!trimmedContent) return true;
  
  // Check for heading-only content
  const headingOnlyPatterns = [
    `<h1>${sectionTitle}</h1>`,
    `<h2>${sectionTitle}</h2>`,
    `<h3>${sectionTitle}</h3>`,
  ];
  
  // Check for heading with empty paragraph
  const headingWithEmptyParagraphPatterns = [
    `<h1>${sectionTitle}</h1><p></p>`,
    `<h2>${sectionTitle}</h2><p></p>`,
    `<h3>${sectionTitle}</h3><p></p>`,
  ];
  
  // Check if content is just a heading or heading with empty paragraph
  for (const pattern of [...headingOnlyPatterns, ...headingWithEmptyParagraphPatterns]) {
    if (trimmedContent === pattern || trimmedContent.replace(/\s+/g, '') === pattern.replace(/\s+/g, '')) {
      return true;
    }
  }
  
  // Parse content to detect placeholder text or empty elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmedContent, 'text/html');
  const textContent = doc.body.textContent || '';
  
  // If there's almost no text content, section is likely empty
  if (textContent.trim().length < 5) {
    return true;
  }
  
  // Count the number of actual content elements
  const contentElements = doc.querySelectorAll('p, li, table, ul, ol');
  if (contentElements.length === 0) {
    return true;
  }
  
  // Check if all paragraphs/list items are empty
  let hasContentElement = false;
  contentElements.forEach(element => {
    if ((element.textContent || '').trim().length > 0) {
      hasContentElement = true;
    }
  });
  
  return !hasContentElement;
}

/**
 * Normalizes HTML content regardless of its format
 * Handles both entity-encoded and regular HTML
 * 
 * @param html - HTML content to normalize
 * @param sanitizeFn - Function to sanitize HTML (optional)
 * @returns Standardized HTML content
 */
export function normalizeHtmlContent(html: string, sanitizeFn?: (html: string) => string): string {
  if (!html) return '';
  
  // Step 1: Decode any HTML entities to ensure consistent handling
  let normalized = html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Step 2: Add class="section-title" to section tags if missing
  normalized = normalized.replace(
    /<section\s+id="([^"]+)"(?!\s+class=)/g, 
    '<section id="$1" class="section-title"'
  );
  
  // Step 3: Standardize section IDs to ensure they match our predefined structure
  STANDARD_SECTIONS.forEach(({ id }) => {
    // Find section tags with alternative IDs and standardize them
    normalized = normalized.replace(
      new RegExp(`<section\\s+id="${normalizeSecttionId(id)}"`, 'g'),
      `<section id="${id}"`
    );
  });
  
  // Step 4: Sanitize if a sanitize function is provided
  if (sanitizeFn) {
    normalized = sanitizeFn(normalized);
  }
  
  return normalized;
}

/**
 * Parse HTML content into resume sections
 * 
 * @param html - HTML content to parse
 * @param getSectionNameFn - Function to get section name from ID
 * @param sectionNames - Map of section IDs to display names
 * @param sectionOrder - Order for sorting sections
 * @returns Array of parsed sections
 */
export function parseHtmlIntoSections(
  html: string, 
  getSectionNameFn: (id: string) => string = getSectionName,
  sectionNames: Record<string, string> = SECTION_NAMES,
  sectionOrder: string[] = SECTION_ORDER
): Section[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const parsedSections: Section[] = [];
  
  // Approach 1: Try to extract sections using section tags
  const sectionElements = doc.querySelectorAll('section');
  
  if (sectionElements.length > 0) {
    console.log(`Found ${sectionElements.length} sections with <section> tags`);
    
    sectionElements.forEach((section, index) => {
      // Get section ID or generate one
      const rawId = section.id || `section-${Math.random().toString(36).substring(2, 9)}`;
      // Normalize the ID to ensure it matches our standard format
      const id = normalizeSecttionId(rawId);
      
      // Get the title from heading element or section id
      const title = getSectionNameFn(id);
      
      // Create the section with all required properties
      parsedSections.push({
        id,
        title,
        content: section.innerHTML,
        type: guessTypeFromTitle(title),
        order: index,
        visible: true,
        isEmpty: isSectionEmpty(section.innerHTML, title)
      });
    });
  } else {
    // Approach 2: Try to identify sections by headings
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length > 0) {
      console.log(`Found ${headings.length} sections with headings`);
      
      headings.forEach((heading, index) => {
        // Get heading text and create section ID
        const title = heading.textContent || `Section ${index + 1}`;
        // Try to find a standard section ID based on the heading text
        const standardId = Object.entries(sectionNames).find(
          ([_, name]) => name.toLowerCase() === title.toLowerCase()
        )?.[0];
        
        // Use standard ID or create one from the heading
        const rawId = standardId || `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
        // Normalize the ID
        const id = normalizeSecttionId(rawId);
        
        // Get the standardized title
        const standardTitle = getSectionNameFn(id);
        
        // Find content for this section (all nodes until next heading)
        let sectionContent = heading.outerHTML;
        let currentNode = heading.nextElementSibling;
        const nextHeading = headings[index + 1];
        
        // Collect all elements until the next heading
        while (currentNode && 
              (nextHeading === undefined || 
               !currentNode.isEqualNode(nextHeading))) {
          sectionContent += currentNode.outerHTML || '';
          currentNode = currentNode.nextElementSibling;
          
          // Break if we reached the end
          if (!currentNode) break;
        }
        
        if (sectionContent) {
          parsedSections.push({
            id, 
            title: standardTitle, 
            content: sectionContent,
            type: guessTypeFromTitle(standardTitle),
            order: index,
            visible: true,
            isEmpty: isSectionEmpty(sectionContent, standardTitle)
          });
        }
      });
    } else {
      // Approach 3: Try to identify sections by paragraph groupings
      const paragraphs = doc.querySelectorAll('p');
      
      if (paragraphs.length > 3) {
        console.log(`Found ${paragraphs.length} paragraphs, attempting to group into sections`);
        
        // Try to group the paragraphs into logical sections
        let currentSection: Section = {
          id: 'resume-header',
          title: sectionNames['resume-header'],
          content: '',
          type: 'header',
          order: 0,
          visible: true,
          isEmpty: true
        };
        
        let sectionIndex = 0;
        const commonSectionNames = Object.values(sectionNames);
        
        paragraphs.forEach((paragraph, index) => {
          // Check if paragraph might be a section title (short, no periods)
          const text = paragraph.textContent || '';
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          
          // Check if this paragraph's text matches or is similar to a standard section name
          const matchedSectionName = commonSectionNames.find(name => 
            text.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(text.toLowerCase())
          );
          
          if ((wordCount < 5 && text.length < 50 && !text.includes('.')) || matchedSectionName) {
            // Save previous section if it has content
            if (currentSection.content) {
              currentSection.isEmpty = isSectionEmpty(currentSection.content, currentSection.title);
              parsedSections.push({ ...currentSection });
            }
            
            // Start a new section
            sectionIndex++;
            
            // Try to find a matching section ID
            let newSectionId = 'section-' + sectionIndex;
            if (matchedSectionName) {
              const entry = Object.entries(sectionNames).find(([_, name]) => name === matchedSectionName);
              if (entry) {
                newSectionId = entry[0];
              }
            }
            
            const normalizedId = normalizeSecttionId(newSectionId);
            const sectionTitle = getSectionNameFn(newSectionId);
            
            currentSection = {
              id: normalizedId,
              title: sectionTitle,
              content: paragraph.outerHTML,
              type: guessTypeFromTitle(sectionTitle),
              order: sectionIndex,
              visible: true,
              isEmpty: isSectionEmpty(paragraph.outerHTML, sectionTitle)
            };
          } else {
            // Add to current section content
            currentSection.content += paragraph.outerHTML;
          }
        });
        
        // Add the last section
        if (currentSection.content) {
          currentSection.isEmpty = isSectionEmpty(currentSection.content, currentSection.title);
          parsedSections.push(currentSection);
        }
      } else {
        // Approach 4: Just create a single section with all content
        console.log('No clear section structure found, creating a single section');
        
        const sectionTitle = sectionNames['resume-summary'];
        
        parsedSections.push({
          id: 'resume-summary',
          title: sectionTitle,
          content: doc.body.innerHTML,
          type: 'summary',
          order: 0,
          visible: true,
          isEmpty: isSectionEmpty(doc.body.innerHTML, sectionTitle)
        });
      }
    }
  }
  
  // If no sections were found, create a default one
  if (parsedSections.length === 0) {
    const sectionTitle = sectionNames['resume-summary'];
    
    parsedSections.push({
      id: 'resume-summary',
      title: sectionTitle,
      content: html,
      type: 'summary',
      order: 0,
      visible: true,
      isEmpty: isSectionEmpty(html, sectionTitle)
    });
  }
  
  // Sort sections according to predefined order
  return [...parsedSections].sort((a, b) => {
    // Find index in SECTION_ORDER (or large number if not found)
    const indexA = sectionOrder.findIndex(id => a.id.includes(id) || id.includes(a.id));
    const indexB = sectionOrder.findIndex(id => b.id.includes(id) || id.includes(b.id));
    
    // If both have defined positions, sort by that
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one has defined position, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // Otherwise, sort alphabetically by title
    return a.title.localeCompare(b.title);
  });
}

/**
 * Tries to determine the section type based on its title
 * Useful for automatic categorization of sections
 * 
 * @param title - Section title to analyze
 * @returns Best guess at section type
 */
export function guessTypeFromTitle(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('experience') || lowerTitle.includes('emploi') || lowerTitle.includes('work')) 
    return 'experience';
  if (lowerTitle.includes('education') || lowerTitle.includes('formation') || lowerTitle.includes('study')) 
    return 'education';
  if (lowerTitle.includes('skill') || lowerTitle.includes('compétence') || lowerTitle.includes('expertise')) 
    return 'skills';
  if (lowerTitle.includes('summary') || lowerTitle.includes('résumé') || lowerTitle.includes('profile')) 
    return 'summary';
  if (lowerTitle.includes('contact') || lowerTitle.includes('personal') || lowerTitle.includes('information')) 
    return 'header';
  if (lowerTitle.includes('language') || lowerTitle.includes('langue'))
    return 'languages';
  if (lowerTitle.includes('certification') || lowerTitle.includes('diploma'))
    return 'certifications';
  if (lowerTitle.includes('project') || lowerTitle.includes('portfolio'))
    return 'projects';
  if (lowerTitle.includes('award') || lowerTitle.includes('achievement'))
    return 'awards';
  if (lowerTitle.includes('volunteer') || lowerTitle.includes('community'))
    return 'volunteering';
  if (lowerTitle.includes('reference') || lowerTitle.includes('recommendation'))
    return 'references';
  
  // Default to general if no specific type can be determined
  return 'general';
}

/**
 * Initialize all sections with proper required properties
 * Ensures all sections have the required properties even if parsed from minimal data
 * 
 * @param sections - Array of potentially incomplete sections
 * @returns Complete sections with all required properties
 */
export function initializeAllSections(sections: Section[]): Section[] {
  return sections.map((section, index) => ({
    ...section,
    type: section.type || guessTypeFromTitle(section.title),
    order: section.order !== undefined ? section.order : index,
    visible: section.visible !== undefined ? section.visible : true,
    isEmpty: section.isEmpty !== undefined ? section.isEmpty : isSectionEmpty(section.content, section.title)
  }));
}

/**
 * Ensure all standard sections are represented
 * Fills in missing sections with empty content
 * 
 * @param sections - Array of existing sections
 * @returns Complete array with all standard sections
 */
export function ensureAllStandardSections(sections: Section[]): Section[] {
  // Create a map of existing sections by ID
  const existingSections = new Map(sections.map(section => [section.id, section]));
  
  // Create the complete list with all standard sections
  const completeSections = STANDARD_SECTIONS.map(({ id }, index) => {
    const existingSection = existingSections.get(id);
    
    if (existingSection) {
      // Use existing section if found
      return existingSection;
    } else {
      // Create a new empty section with all required properties
      const sectionTitle = getSectionName(id);
      const content = `<h2>${sectionTitle}</h2><p></p>`;
      
      return {
        id,
        title: sectionTitle,
        content,
        type: guessTypeFromTitle(sectionTitle),
        order: index,
        visible: true,
        isEmpty: true
      };
    }
  });
  
  return completeSections;
}

/**
 * Escape HTML entities in a string
 * 
 * @param text - String to escape
 * @returns Escaped string
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Unescape HTML entities in a string
 * 
 * @param text - String with HTML entities
 * @returns Unescaped string
 */
export function unescapeHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Create a default section with proper HTML structure
 * 
 * @param sectionId - Standard section ID
 * @returns HTML content for the section
 */
export function createDefaultSectionContent(sectionId: string): string {
  const title = getSectionName(sectionId);
  const placeholder = SECTION_PLACEHOLDERS[sectionId] || '';
  
  return `
    <h2>${title}</h2>
    <p>${placeholder}</p>
  `;
}

/**
 * Combines sections into a complete HTML document
 * Only includes non-empty sections
 * 
 * @param sections - Array of all sections
 * @returns HTML content with only non-empty sections
 */
export function combineNonEmptySections(sections: Section[]): string {
  return sections
    .filter(section => !isSectionEmpty(section.content, section.title))
    .map(section => 
      `<section id="${section.id}" class="section-title">${section.content}</section>`
    )
    .join('\n');
}

/**
 * Formats a date string to a standard format
 * 
 * @param dateStr - Date string to format
 * @returns Formatted date
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
}

/**
 * Extract text content from HTML
 * Useful for analyzing content without HTML tags
 * 
 * @param html - HTML content to process
 * @returns Plain text without HTML tags
 */
export function extractTextContent(html: string): string {
  if (!html) return '';
  
  // Use DOMParser to safely extract text
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Detect language of text content
 * Basic implementation that can be expanded with more sophisticated detection
 * 
 * @param text - Text to analyze
 * @returns Detected language code (en, fr, es, etc)
 */
export function detectLanguage(text: string): string {
  if (!text) return 'en';
  
  // Common French words
  const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'je', 'tu', 'il', 'elle', 
                       'nous', 'vous', 'ils', 'elles', 'pour', 'dans', 'avec', 'sur',
                       'expérience', 'compétences', 'formation', 'diplôme'];
  
  // Common Spanish words
  const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'yo', 'tú', 
                        'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'para', 'en', 
                        'con', 'sobre', 'experiencia', 'habilidades', 'educación'];
  
  // Count word occurrences
  const words = text.toLowerCase().split(/\s+/);
  let frenchCount = 0;
  let spanishCount = 0;
  
  words.forEach(word => {
    if (frenchWords.includes(word)) frenchCount++;
    if (spanishWords.includes(word)) spanishCount++;
  });
  
  // Determine language based on counts and threshold (at least 3% of words)
  const threshold = Math.max(3, words.length * 0.03);
  
  if (frenchCount > spanishCount && frenchCount >= threshold) {
    return 'fr';
  } else if (spanishCount > frenchCount && spanishCount >= threshold) {
    return 'es';
  }
  
  // Default to English
  return 'en';
}

/**
 * Extract keywords from resume content
 * Identifies potential keywords for ATS optimization
 * 
 * @param content - Resume HTML content
 * @returns Array of potential keywords
 */
export function extractKeywordsFromContent(content: string): string[] {
  if (!content) return [];
  
  // Extract plain text
  const text = extractTextContent(content);
  
  // Extract capitalized words (likely skills, technologies, etc.)
  const capitalizedRegex = /\b[A-Z][a-zA-Z0-9]*\b/g;
  const capitalizedMatches = text.match(capitalizedRegex) || [];
  
  // Common technical skills to look for
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'React', 'Angular', 'Vue',
    'Node.js', 'Express', 'MongoDB', 'SQL', 'AWS', 'Azure', 'Docker', 'Kubernetes',
    'DevOps', 'CI/CD', 'Git', 'REST', 'API', 'HTML', 'CSS', 'Sass', 'SCSS',
    'Leadership', 'Management', 'Communication', 'Problem-solving', 'Teamwork',
    'Project Management', 'Agile', 'Scrum', 'Kanban', 'Microsoft Office',
    'Analytical', 'Research', 'Marketing', 'Sales', 'Customer Service',
    'SEO', 'SEM', 'Analytics', 'Data Analysis', 'Machine Learning', 'AI'
  ];
  
  // Find common skills in the text
  const foundSkills = commonSkills.filter(skill => 
    new RegExp(`\\b${skill}\\b`, 'i').test(text)
  );
  
  // Combine, deduplicate, and filter out common stop words
  const stopWords = ['I', 'A', 'The', 'An', 'And', 'Or', 'But', 'In', 'On', 'At', 'To', 'For'];
  
  const keywords = [...new Set([
    ...capitalizedMatches,
    ...foundSkills
  ])].filter(word => 
    word.length > 1 && 
    !stopWords.includes(word)
  );
  
  return keywords;
}

/**
 * Find missing information in a resume
 * Identifies important sections that might be missing
 * 
 * @param sections - Array of resume sections
 * @returns Object with missing sections and recommendations
 */
export function findMissingInformation(sections: Section[]): {
  missingSections: string[];
  recommendations: string[];
} {
  // Create a map of section IDs for quick lookup
  const sectionMap = new Map(sections.map(section => [section.id, section]));
  
  // Critical sections that should be present in a good resume
  const criticalSections = [
    'resume-header',
    'resume-summary',
    'resume-experience',
    'resume-education',
    'resume-skills'
  ];
  
  // Find missing critical sections
  const missingSections = criticalSections.filter(id => 
    !sectionMap.has(id) || isSectionEmpty(sectionMap.get(id)?.content || '', getSectionName(id))
  );
  
  // Generate recommendations based on missing sections
  const recommendations = missingSections.map(id => {
    const sectionName = getSectionName(id);
    switch (id) {
      case 'resume-header':
        return `Add your personal information including name, title, and contact details.`;
      case 'resume-summary':
        return `Include a professional summary to highlight your experience and goals.`;
      case 'resume-experience':
        return `Add your work experience with specific achievements and responsibilities.`;
      case 'resume-education':
        return `Include your educational background with degrees, institutions, and dates.`;
      case 'resume-skills':
        return `List your key skills relevant to your target position.`;
      default:
        return `Add the ${sectionName} section to improve your resume.`;
    }
  });
  
  return {
    missingSections,
    recommendations
  };
}