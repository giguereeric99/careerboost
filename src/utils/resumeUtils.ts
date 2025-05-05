/**
 * Resume Utils - Helper functions for resume processing
 * 
 * This file contains utility functions for processing and manipulating
 * resume content, particularly related to HTML handling and section management.
 */

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
 * Section interface for resume content sections
 */
export interface Section {
  id: string;
  title: string;
  content: string;
}

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
  
  // Step 3: Sanitize if a sanitize function is provided
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
  getSectionNameFn: (id: string) => string,
  sectionNames: Record<string, string>,
  sectionOrder: string[]
): Section[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const parsedSections: Section[] = [];
  
  // Approach 1: Try to extract sections using section tags
  const sectionElements = doc.querySelectorAll('section');
  
  if (sectionElements.length > 0) {
    console.log(`Found ${sectionElements.length} sections with <section> tags`);
    
    sectionElements.forEach(section => {
      // Get section ID or generate one
      const id = section.id || `section-${Math.random().toString(36).substring(2, 9)}`;
      
      // Try to get title from heading element or section id
      const headingEl = section.querySelector('h1, h2, h3, h4, h5, h6');
      const title = getSectionNameFn(id);
      
      parsedSections.push({
        id,
        title,
        content: section.innerHTML
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
        const id = standardId || `section-${title.toLowerCase().replace(/\s+/g, '-')}`;
        
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
            content: sectionContent 
          });
        }
      });
    } else {
      // Approach 3: Try to identify sections by paragraph groupings
      const paragraphs = doc.querySelectorAll('p');
      
      if (paragraphs.length > 3) {
        console.log(`Found ${paragraphs.length} paragraphs, attempting to group into sections`);
        
        // Try to group the paragraphs into logical sections
        let currentSection = {
          id: 'resume-header',
          title: sectionNames['resume-header'],
          content: ''
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
            
            currentSection = {
              id: newSectionId,
              title: getSectionNameFn(newSectionId),
              content: paragraph.outerHTML
            };
          } else {
            // Add to current section content
            currentSection.content += paragraph.outerHTML;
          }
        });
        
        // Add the last section
        if (currentSection.content) {
          parsedSections.push(currentSection);
        }
      } else {
        // Approach 4: Just create a single section with all content
        console.log('No clear section structure found, creating a single section');
        
        parsedSections.push({
          id: 'resume-summary',
          title: sectionNames['resume-summary'],
          content: doc.body.innerHTML
        });
      }
    }
  }
  
  // If no sections were found, create a default one
  if (parsedSections.length === 0) {
    parsedSections.push({
      id: 'resume-summary',
      title: sectionNames['resume-summary'],
      content: html
    });
  }
  
  // Sort sections according to predefined order
  return [...parsedSections].sort((a, b) => {
    // Find index in SECTION_ORDER (or large number if not found)
    const indexA = sectionOrder.findIndex(id => a.id.includes(id));
    const indexB = sectionOrder.findIndex(id => b.id.includes(id));
    
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
 * Parse the optimized text into a structured format
 * This is a utility function used by the resume optimizer hook
 * 
 * @param text - The optimized text to parse
 * @returns A structured object with the parsed content
 */
export function parseOptimizedText(text: string): any {
  // Create a basic object with the content
  const result = {
    parsed: true,
    content: text,
    language: detectLanguage(text)
  };
  
  return result;
}

/**
 * Basic language detection based on text content
 * 
 * @param text - Text to analyze
 * @returns Detected language
 */
export function detectLanguage(text: string): string {
  if (!text) return 'English';
  
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
    return 'French';
  } else if (spanishCount > frenchCount && spanishCount >= threshold) {
    return 'Spanish';
  }
  
  // Default to English
  return 'English';
}

/**
 * Combines sections HTML into a complete document
 * 
 * @param sections - Array of sections
 * @returns Combined HTML
 */
export function combineSectionsToHtml(sections: Section[]): string {
  if (!sections || sections.length === 0) return '';
  
  return sections.map(section => 
    `<section id="${section.id}" class="section-title">${section.content}</section>`
  ).join('\n');
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
 * Checks if a section exists in the array of sections
 * 
 * @param sections - Array of sections to check
 * @param sectionId - ID of the section to find
 * @returns Boolean indicating if section exists
 */
export function sectionExists(sections: Section[], sectionId: string): boolean {
  return sections.some(section => section.id === sectionId);
}

/**
 * Get a section content by its ID
 * 
 * @param sections - Array of sections
 * @param sectionId - ID of the section to get
 * @returns Content of the section or empty string if not found
 */
export function getSectionContent(sections: Section[], sectionId: string): string {
  const section = sections.find(s => s.id === sectionId);
  return section ? section.content : '';
}

/**
 * Create a new empty section with the specified ID and title
 * 
 * @param id - ID for the new section
 * @param title - Optional title (will use getSectionName if not provided)
 * @returns New section object
 */
export function createEmptySection(id: string, title?: string): Section {
  return {
    id,
    title: title || getSectionName(id),
    content: `<h2>${title || getSectionName(id)}</h2><p></p>`
  };
}