/**
 * Resume templates definition
 * Contains all templates available in the application
 * References styles and structures from separate constants files
 */
import { ResumeTemplateType, TemplateContentSections } from '../types/resumeTemplateTypes';
import { STANDARD_SECTIONS } from './sections';
import {
  basicStyles, 
  professionalStyles, 
  creativeStyles,
  executiveStyles,
  technicalStyles,
  compactStyles
} from './templateStyles';
import {
  basicTemplate,
  professionalTemplate,
  creativeTemplate,
  executiveTemplate,
  technicalTemplate,
  compactTemplate
} from './templateStructures';

/**
 * Checks if a contact info string contains any of the specified items
 * 
 * @param text - Text to analyze
 * @param items - Array of items to check for
 * @returns True if text contains any of the items
 */
function containsAny(text: string, items: string[]): boolean {
  const lowerText = text.toLowerCase();
  return items.some(item => lowerText.includes(item.toLowerCase()));
}

/**
 * Custom apply function for the basic template
 * Preserves original section titles from the content
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyBasicTemplate(sections: TemplateContentSections): string {
  // Create base HTML structure
  let html = '';
  
  // Process header content (name and possibly contact info)
  if (sections['resume-header']) {
    // Parse the header to handle name and contact separately
    const { nameHtml, contactHtml } = processHeaderSection(sections['resume-header']);
    
    // Add the name part
    html += nameHtml;
    
    // Add contact info if we extracted it from header
    if (contactHtml) {
      html += `<div class="contact">${contactHtml}</div>`;
    } 
    // Otherwise, check for a dedicated contact section
    else if (sections['resume-contact']) {
      html += `<div class="contact">${sections['resume-contact']}</div>`;
    }
    // Fallback to placeholder if no contact info found
    else {
      html += `<div class="contact"><p>Email: example@email.com | Phone: (123) 456-7890</p></div>`;
    }
  } else {
    // Default header if none provided
    html += `<h1>Full Name</h1>`;
    
    // Add contact info from dedicated section or use placeholder
    if (sections['resume-contact']) {
      html += `<div class="contact">${sections['resume-contact']}</div>`;
    } else {
      html += `<div class="contact"><p>Email: example@email.com | Phone: (123) 456-7890</p></div>`;
    }
  }
  
  // Process each main section
  STANDARD_SECTIONS.forEach(section => {
    // Skip header and contact sections already handled
    if (section.id === 'resume-header' || section.id === 'resume-contact') return;
    
    // Only include sections that have content
    if (sections[section.id]) {
      html += `
      <div class="section" id="${section.id}">
        ${sections[section.id]}
      </div>`;
    }
  });
  
  return html;
}

/**
 * Custom apply function for professional template
 * Uses the icon-based structure from the example
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyProfessionalTemplate(sections: TemplateContentSections): string {
  // Create container
  let html = '<div class="container">';
  
  // Handle header (name)
  if (sections['resume-header']) {
    // Extract name and title
    const { nameHtml, titleHtml } = extractNameAndTitle(sections['resume-header']);
    html += nameHtml;
    
    // Start contact info container
    html += `<div class="contact-info">`;
    
    // Add title if found
    if (titleHtml) {
      html += `${titleHtml}<br>`;
    }
    
    // Add contact info
    if (sections['resume-contact']) {
      html += sections['resume-contact'];
    } else {
      html += 'Email: example@email.com | Phone: (123) 456-7890 | Location: City, Country';
    }
    
    html += `</div>`;
  } else {
    html += `
      <h1>Full Name</h1>
      <div class="contact-info">
        Professional Title<br>
        Email: example@email.com | Phone: (123) 456-7890 | Location: City, Country
      </div>
    `;
  }
  
  // Map section IDs to their icons and titles
  const sectionConfig = {
    'resume-summary': { icon: 'person-fill', title: 'Professional Summary' },
    'resume-experience': { icon: 'briefcase-fill', title: 'Experience' },
    'resume-education': { icon: 'mortarboard-fill', title: 'Education' },
    'resume-skills': { icon: 'gear-fill', title: 'Skills' },
    'resume-certifications': { icon: 'award-fill', title: 'Certifications' },
    'resume-languages': { icon: 'globe2', title: 'Languages' },
    'resume-projects': { icon: 'layers-fill', title: 'Projects' },
    'resume-awards': { icon: 'trophy-fill', title: 'Awards & Achievements' },
    'resume-references': { icon: 'people-fill', title: 'References' },
    'resume-publications': { icon: 'journal-text', title: 'Publications' },
    'resume-volunteering': { icon: 'heart-fill', title: 'Volunteering' },
    'resume-additional': { icon: 'info-circle-fill', title: 'Additional Information' },
    'resume-interests': { icon: 'star-fill', title: 'Interests' }
  };
  
  // Process each section with its icon
  Object.entries(sectionConfig).forEach(([sectionId, config]) => {
    if (sections[sectionId]) {
      // Special handling for skills and languages sections
      let sectionContent = '';
      if (sectionId === 'resume-skills' || sectionId === 'resume-languages') {
        sectionContent = `<div class="${sectionId === 'resume-skills' ? 'skills' : 'languages'}">${sections[sectionId]}</div>`;
      } else {
        sectionContent = sections[sectionId];
      }
      
      html += `
      <div class="section" id="${sectionId}">
        <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${config.icon}.svg" alt="${config.title}"> ${config.title}</h2>
        ${sectionContent}
      </div>`;
    }
  });
  
  // Close container
  html += '</div>';
  
  return html;
}

/**
 * Custom apply function for creative template
 * Uses a more modern and artistic layout
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyCreativeTemplate(sections: TemplateContentSections): string {
  // Create base creative container
  let html = '<div class="creative-container">';
  
  // Process header content
  if (sections['resume-header']) {
    // Extract name for prominent display
    const nameHtml = extractNameOnly(sections['resume-header']);
    html += `<div class="creative-header">${nameHtml}</div>`;
    
    // Add contact info in creative style
    if (sections['resume-contact']) {
      html += `<div class="contact-creative">${sections['resume-contact']}</div>`;
    } else {
      // Try to extract contact from header if separate contact section not available
      const contactHtml = extractContactFromHeader(sections['resume-header']);
      html += `<div class="contact-creative">${contactHtml || 'Email: example@email.com | Phone: (123) 456-7890'}</div>`;
    }
  } else {
    html += `
      <div class="creative-header"><h1>Full Name</h1></div>
      <div class="contact-creative">Email: example@email.com | Phone: (123) 456-7890</div>
    `;
  }
  
  // Process each section with creative styling
  const sectionMappings = {
    'resume-summary': 'About Me',
    'resume-experience': 'Work Experience',
    'resume-education': 'Education',
    'resume-skills': 'Skills & Expertise',
    'resume-certifications': 'Certifications',
    'resume-languages': 'Languages',
    'resume-projects': 'Projects',
    'resume-awards': 'Achievements',
    'resume-references': 'References',
    'resume-publications': 'Publications',
    'resume-volunteering': 'Volunteering',
    'resume-additional': 'Additional Info',
    'resume-interests': 'Interests & Hobbies'
  };
  
  // Add each section with unique creative styling
  Object.entries(sectionMappings).forEach(([sectionId, title]) => {
    if (sections[sectionId] && sectionId !== 'resume-header' && sectionId !== 'resume-contact') {
      html += `
      <div class="section-creative" id="${sectionId}">
        <h2>${title}</h2>
        ${sections[sectionId]}
      </div>`;
    }
  });
  
  // Close creative container
  html += '</div>';
  
  return html;
}

/**
 * Extract just the name from header content
 */
function extractNameOnly(headerContent: string): string {
  try {
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerContent, 'text/html');
    
    // Look for h1 first
    const nameElement = headerDoc.querySelector('h1');
    if (nameElement) {
      return nameElement.outerHTML;
    }
    
    // If no h1, look for other heading elements
    const altNameElement = headerDoc.querySelector('h2, h3');
    if (altNameElement) {
      return `<h1>${altNameElement.textContent}</h1>`;
    }
    
    // Default fallback
    return '<h1>Full Name</h1>';
  } catch (error) {
    console.error('Error extracting name:', error);
    return '<h1>Full Name</h1>';
  }
}

/**
 * Extract contact information from header content
 */
function extractContactFromHeader(headerContent: string): string {
  try {
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerContent, 'text/html');
    
    const contactParts: string[] = [];
    const paragraphs = headerDoc.querySelectorAll('p');
    
    paragraphs.forEach(p => {
      const text = p.textContent || '';
      if (
        text.includes('@') || 
        text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) ||
        text.includes('linkedin') ||
        text.includes('github')
      ) {
        contactParts.push(text);
      }
    });
    
    return contactParts.join(' | ');
  } catch (error) {
    console.error('Error extracting contact info:', error);
    return '';
  }
}

/**
 * Extract name and title from header content
 */
function extractNameAndTitle(headerContent: string): { nameHtml: string, titleHtml: string } {
  try {
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerContent, 'text/html');
    
    // Extract name
    let nameHtml = '';
    const nameElement = headerDoc.querySelector('h1');
    if (nameElement) {
      nameHtml = nameElement.outerHTML;
    } else {
      nameHtml = '<h1>Full Name</h1>';
    }
    
    // Try to find a professional title
    let titleHtml = '';
    const paragraphs = headerDoc.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent || '';
      // If the paragraph is short and doesn't contain typical contact info,
      // it's likely to be a professional title
      if (text.length < 50 && 
          !text.includes('@') && 
          !text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) &&
          !text.includes('linkedin')) {
        titleHtml = text;
        break;
      }
    }
    
    return { nameHtml, titleHtml };
  } catch (error) {
    console.error('Error extracting name and title:', error);
    return { 
      nameHtml: '<h1>Full Name</h1>', 
      titleHtml: 'Professional Title' 
    };
  }
}

/**
 * Processes the header section to separate name and contact information
 * Avoids duplication of contact info
 * 
 * @param headerContent - HTML content of the header section
 * @returns Object with separate name and contact HTML
 */
function processHeaderSection(headerContent: string): { nameHtml: string, contactHtml: string } {
  try {
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerContent, 'text/html');
    
    // Extract the name (typically in h1)
    let nameHtml = '';
    const nameElement = headerDoc.querySelector('h1');
    if (nameElement) {
      nameHtml = nameElement.outerHTML;
    } else {
      // If no h1, look for the first heading or strong text as the name
      const altNameElement = headerDoc.querySelector('h2, h3, strong');
      if (altNameElement) {
        nameHtml = `<h1>${altNameElement.textContent}</h1>`;
      } else {
        // Default if no name found
        nameHtml = '<h1>Full Name</h1>';
      }
    }
    
    // Extract contact elements (looking for paragraphs with contact info)
    let contactElements: Element[] = [];
    const paragraphs = headerDoc.querySelectorAll('p');
    
    paragraphs.forEach(p => {
      const text = p.textContent || '';
      // Identify paragraphs that are likely contact information
      if (
        containsAny(text, ['@', 'email', 'mail']) || // Email indicators
        containsAny(text, ['phone', 'tel', 'mobile']) || // Phone indicators
        text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) || // Phone pattern
        containsAny(text, ['linkedin', 'github', 'portfolio']) || // Online profiles
        containsAny(text, ['address', 'street', 'city', 'zip']) // Address indicators
      ) {
        contactElements.push(p);
      }
    });
    
    // Create contact HTML from identified elements
    let contactHtml = '';
    if (contactElements.length > 0) {
      // Combine all contact elements, preserving their HTML
      contactHtml = contactElements.map(el => el.outerHTML).join('');
    }
    
    return { nameHtml, contactHtml };
  } catch (error) {
    console.error('Error processing header section:', error);
    return { 
      nameHtml: '<h1>Full Name</h1>', 
      contactHtml: '<p>Email: example@email.com | Phone: (123) 456-7890</p>' 
    };
  }
}

// Define all resume templates with their properties
export const resumeTemplates: ResumeTemplateType[] = [
  {
    id: "basic",
    name: "Basic",
    isPro: false,
    previewClass: "border-l-4 border-brand-600",
    description: "Simple and clean layout suitable for most job applications",
    styles: basicStyles,
    template: basicTemplate,
    applyTemplate: applyBasicTemplate
  },
  {
    id: "professional",
    name: "Professional",
    isPro: true,
    previewClass: "border-t-4 border-teal-600",
    description: "Elegant design with modern styling for corporate positions",
    styles: professionalStyles,
    template: professionalTemplate,
    applyTemplate: applyProfessionalTemplate
  },
  {
    id: "creative",
    name: "Creative",
    isPro: true,
    previewClass: "bg-gradient-to-r from-brand-100 to-teal-100 border-none",
    description: "Unique layout for design and creative industry positions",
    styles: creativeStyles,
    template: creativeTemplate,
    applyTemplate: applyCreativeTemplate
  },
  {
    id: "executive",
    name: "Executive",
    isPro: true,
    previewClass: "border-2 border-gray-800",
    description: "Sophisticated design for executive and leadership roles",
    styles: executiveStyles,
    template: executiveTemplate,
    applyTemplate: applyBasicTemplate // Reuse basic template function for now
  },
  {
    id: "technical",
    name: "Technical",
    isPro: true,
    previewClass: "border-l-4 border-r-4 border-blue-500",
    description: "Specialized layout highlighting technical skills and projects",
    styles: technicalStyles,
    template: technicalTemplate,
    applyTemplate: applyBasicTemplate // Reuse basic template function for now
  },
  {
    id: "compact",
    name: "Compact",
    isPro: true,
    previewClass: "border-b-4 border-amber-500",
    description: "Space-efficient design that fits more content on a single page",
    styles: compactStyles,
    template: compactTemplate,
    applyTemplate: applyBasicTemplate // Reuse basic template function for now
  }
];

/**
 * Get a template by ID
 * 
 * @param id - Template ID to retrieve
 * @returns The template object or the basic template if not found
 */
export function getTemplateById(id: string): ResumeTemplateType {
  return resumeTemplates.find(template => template.id === id) || resumeTemplates[0];
}