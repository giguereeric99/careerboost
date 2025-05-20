/**
 * Resume templates definition
 * Contains all templates available in the application
 * References styles and structures from separate constants files
 */
import { ResumeTemplateType, TemplateContentSections, HeaderInfo } from '../types/resumeTemplateTypes';
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
import { extractHeaderInfo, generateBasicHeader, generateProfessionalHeader } from '../utils/templateUtils';

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
 * Uses structured header generation and section formatting
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyBasicTemplate(sections: TemplateContentSections): string {
  console.log("Applying basic template to content");
  
  // Create base HTML structure
  let html = '';
  
  // Process header content
  if (sections['resume-header']) {
    console.log("Processing resume header section");
    
    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections['resume-header']);
    
    // Generate formatted header HTML
    html += generateBasicHeader(headerInfo);
  } else {
    // Default header if none provided
    console.log("No header section found, using default");
    html += generateBasicHeader({
      name: 'Full Name',
      phone: '(123) 456-7890',
      email: 'example@email.com',
      linkedin: null,
      portfolio: null,
      address: 'City, Country',
      title: null
    });
  }
  
  // Process each main section
  STANDARD_SECTIONS.forEach(section => {
    // Skip header section already handled
    if (section.id === 'resume-header') return;
    
    // Only include sections that have content
    if (sections[section.id]) {
      console.log(`Adding section: ${section.id}`);
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
 * Uses structured header generation with icon-based layout
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyProfessionalTemplate(sections: TemplateContentSections): string {
  console.log("Applying professional template to content");
  
  // Create base HTML structure
  let html = '<div class="container">';
  
  // Process header content
  if (sections['resume-header']) {
    console.log("Processing resume header section");
    
    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections['resume-header']);
    
    // Generate formatted header HTML
    html += generateProfessionalHeader(headerInfo);
  } else {
    // Default header if none provided
    console.log("No header section found, using default");
    html += generateProfessionalHeader({
      name: 'Full Name',
      phone: '(123) 456-7890',
      email: 'example@email.com',
      linkedin: 'linkedin.com/in/username',
      portfolio: null,
      address: 'City, Country',
      title: 'Professional Title'
    });
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
 * Generates a creative header HTML structure with icons
 * 
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section
 */
function generateCreativeHeader(headerInfo: HeaderInfo): string {
  return `<div class="creative-header">
    <h1 class="section-title name">${headerInfo.name}</h1>
    ${headerInfo.title ? `<div class="creative-title">${headerInfo.title}</div>` : ''}
    <div class="contact-creative">
      <div class="contact-icons">
        ${headerInfo.phone ? `<div class="contact-item"><span class="contact-icon">📱</span> <span class="phone">${headerInfo.phone}</span></div>` : ''}
        ${headerInfo.email ? `<div class="contact-item"><span class="contact-icon">✉️</span> <span class="email">${headerInfo.email}</span></div>` : ''}
        ${headerInfo.linkedin ? `<div class="contact-item"><span class="contact-icon">🔗</span> <span class="linkedin">${headerInfo.linkedin}</span></div>` : ''}
        ${headerInfo.portfolio ? `<div class="contact-item"><span class="contact-icon">🌐</span> <span class="link">${headerInfo.portfolio}</span></div>` : ''}
        ${headerInfo.address ? `<div class="contact-item"><span class="contact-icon">📍</span> <span class="address">${headerInfo.address}</span></div>` : ''}
      </div>
    </div>
  </div>`;
}

/**
 * Custom apply function for creative template
 * Uses a more modern and artistic layout with custom header
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyCreativeTemplate(sections: TemplateContentSections): string {
  console.log("Applying creative template to content");
  
  // Create base creative container
  let html = '<div class="creative-container">';
  
  // Process header content
  if (sections['resume-header']) {
    console.log("Processing resume header section");
    
    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections['resume-header']);
    
    // Generate formatted header HTML
    html += generateCreativeHeader(headerInfo);
  } else {
    // Default header if none provided
    console.log("No header section found, using default");
    html += generateCreativeHeader({
      name: 'Full Name',
      phone: '(123) 456-7890',
      email: 'example@email.com',
      linkedin: 'linkedin.com/in/username',
      portfolio: 'portfolio.com',
      address: 'City, Country',
      title: 'Creative Professional'
    });
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
    if (sections[sectionId] && sectionId !== 'resume-header') {
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
 * Generates an executive header HTML structure
 * 
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section
 */
function generateExecutiveHeader(headerInfo: HeaderInfo): string {
  return `<div id="resume-header">
    <h1 class="section-title name">${headerInfo.name}</h1>
    ${headerInfo.title ? `<h2 class="executive-title">${headerInfo.title}</h2>` : ''}
    <div class="executive-contact">
      ${headerInfo.phone ? `<div class="contact-item phone">${headerInfo.phone}</div>` : ''}
      ${headerInfo.email ? `<div class="contact-item email">${headerInfo.email}</div>` : ''}
      ${headerInfo.linkedin ? `<div class="contact-item linkedin">${headerInfo.linkedin}</div>` : ''}
      ${headerInfo.portfolio ? `<div class="contact-item link">${headerInfo.portfolio}</div>` : ''}
      ${headerInfo.address ? `<div class="contact-item address">${headerInfo.address}</div>` : ''}
    </div>
  </div>`;
}

/**
 * Custom apply function for the executive template
 * Uses elegant styling suitable for leadership positions
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyExecutiveTemplate(sections: TemplateContentSections): string {
  console.log("Applying executive template to content");
  
  // Create base HTML structure
  let html = '<div class="executive-container">';
  
  // Process header content
  if (sections['resume-header']) {
    console.log("Processing resume header section");
    
    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections['resume-header']);
    
    // Generate formatted header HTML
    html += generateExecutiveHeader(headerInfo);
  } else {
    // Default header if none provided
    console.log("No header section found, using default");
    html += generateExecutiveHeader({
      name: 'Full Name',
      phone: '(123) 456-7890',
      email: 'example@email.com',
      linkedin: 'linkedin.com/in/username',
      portfolio: null,
      address: 'City, Country',
      title: 'Executive Director'
    });
  }
  
  // Process each section with executive styling
  const sectionMappings = {
    'resume-summary': 'Executive Summary',
    'resume-experience': 'Professional Experience',
    'resume-education': 'Education & Credentials',
    'resume-skills': 'Areas of Expertise',
    'resume-certifications': 'Professional Certifications',
    'resume-languages': 'Languages',
    'resume-projects': 'Key Projects & Initiatives',
    'resume-awards': 'Honors & Distinctions',
    'resume-references': 'Professional References',
    'resume-publications': 'Publications & Speaking',
    'resume-volunteering': 'Board & Volunteer Work',
    'resume-additional': 'Additional Information',
    'resume-interests': 'Interests'
  };
  
  // Add each section with executive styling
  Object.entries(sectionMappings).forEach(([sectionId, title]) => {
    if (sections[sectionId] && sectionId !== 'resume-header') {
      html += `
      <div class="section" id="${sectionId}">
        <h2>${title}</h2>
        ${sections[sectionId]}
      </div>`;
    }
  });
  
  // Close container
  html += '</div>';
  
  return html;
}

/**
 * Generates a technical header HTML structure with code-like formatting
 * 
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section
 */
function generateTechnicalHeader(headerInfo: HeaderInfo): string {
  return `<div id="resume-header">
    <h1 class="section-title name">${headerInfo.name}</h1>
    ${headerInfo.title ? `<div class="tech-title">${headerInfo.title}</div>` : ''}
    <div class="tech-contact">
      ${headerInfo.phone ? `<code class="contact-code phone">tel: ${headerInfo.phone}</code>` : ''}
      ${headerInfo.email ? `<code class="contact-code email">email: ${headerInfo.email}</code>` : ''}
      ${headerInfo.linkedin ? `<code class="contact-code linkedin">profile: ${headerInfo.linkedin}</code>` : ''}
      ${headerInfo.portfolio ? `<code class="contact-code link">web: ${headerInfo.portfolio}</code>` : ''}
      ${headerInfo.address ? `<code class="contact-code address">location: ${headerInfo.address}</code>` : ''}
    </div>
  </div>`;
}

/**
 * Custom apply function for the technical template
 * Uses code-like styling suitable for technical positions
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyTechnicalTemplate(sections: TemplateContentSections): string {
  console.log("Applying technical template to content");
  
  // Create base HTML structure
  let html = '<div class="technical-container">';
  
  // Process header content
  if (sections['resume-header']) {
    console.log("Processing resume header section");
    
    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections['resume-header']);
    
    // Generate formatted header HTML
    html += generateTechnicalHeader(headerInfo);
  } else {
    // Default header if none provided
    console.log("No header section found, using default");
    html += generateTechnicalHeader({
      name: 'Full Name',
      phone: '(123) 456-7890',
      email: 'example@email.com',
      linkedin: 'github.com/username',
      portfolio: 'portfolio.dev',
      address: 'City, Country',
      title: 'Software Engineer'
    });
  }
  
  // Process each section with technical styling
  const sectionMappings = {
    'resume-summary': 'Technical Profile',
    'resume-skills': 'Technical Skills',
    'resume-experience': 'Professional Experience',
    'resume-projects': 'Projects',
    'resume-education': 'Education',
    'resume-certifications': 'Certifications',
    'resume-languages': 'Languages',
    'resume-publications': 'Publications',
    'resume-awards': 'Awards',
    'resume-volunteering': 'Volunteering',
    'resume-references': 'References',
    'resume-additional': 'Additional Info',
    'resume-interests': 'Interests'
  };
  
  // Add each section in the specific order
  Object.entries(sectionMappings).forEach(([sectionId, title]) => {
    if (sections[sectionId] && sectionId !== 'resume-header') {
      html += `
      <div class="section" id="${sectionId}">
        <h2>${title}</h2>
        ${sections[sectionId]}
      </div>`;
    }
  });
  
  // Close container
  html += '</div>';
  
  return html;
}

/**
 * Generates a compact header HTML structure with space-efficient layout
 * 
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section
 */
function generateCompactHeader(headerInfo: HeaderInfo): string {
  return `<div id="resume-header">
    <div class="compact-header-row">
      <h1 class="section-title name">${headerInfo.name}</h1>
      <div class="compact-contact">
        ${headerInfo.phone ? `<span class="phone">${headerInfo.phone}</span>` : ''}
        ${headerInfo.email ? `<span class="email">${headerInfo.email}</span>` : ''}
      </div>
    </div>
    ${headerInfo.title ? `<div class="compact-title">${headerInfo.title}</div>` : ''}
    <div class="compact-details">
      ${headerInfo.linkedin ? `<span class="linkedin">${headerInfo.linkedin}</span>` : ''}
      ${headerInfo.portfolio ? `<span class="link">${headerInfo.portfolio}</span>` : ''}
      ${headerInfo.address ? `<span class="address">${headerInfo.address}</span>` : ''}
    </div>
  </div>`;
}

/**
 * Custom apply function for the compact template
 * Uses space-efficient layout for maximizing content
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyCompactTemplate(sections: TemplateContentSections): string {
  console.log("Applying compact template to content");
  
  // Create base HTML structure
  let html = '<div class="compact-container">';
  
  // Process header content
  if (sections['resume-header']) {
    console.log("Processing resume header section");
    
    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections['resume-header']);
    
    // Generate formatted header HTML
    html += generateCompactHeader(headerInfo);
  } else {
    // Default header if none provided
    console.log("No header section found, using default");
    html += generateCompactHeader({
      name: 'Full Name',
      phone: '(123) 456-7890',
      email: 'example@email.com',
      linkedin: 'linkedin.com/in/username',
      portfolio: null,
      address: 'City, Country',
      title: 'Professional'
    });
  }
  
  // Process each section with compact styling
  const sectionMappings = {
    'resume-summary': 'Summary',
    'resume-experience': 'Experience',
    'resume-education': 'Education',
    'resume-skills': 'Skills',
    'resume-certifications': 'Certifications',
    'resume-languages': 'Languages',
    'resume-projects': 'Projects',
    'resume-awards': 'Awards',
    'resume-references': 'References',
    'resume-publications': 'Publications',
    'resume-volunteering': 'Volunteering',
    'resume-additional': 'Additional',
    'resume-interests': 'Interests'
  };
  
  // Add each section with compact styling
  Object.entries(sectionMappings).forEach(([sectionId, title]) => {
    if (sections[sectionId] && sectionId !== 'resume-header') {
      html += `
      <div class="section" id="${sectionId}">
        <h2>${title}</h2>
        ${sections[sectionId]}
      </div>`;
    }
  });
  
  // Close container
  html += '</div>';
  
  return html;
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
    applyTemplate: applyExecutiveTemplate // Now using dedicated executive template function
  },
  {
    id: "technical",
    name: "Technical",
    isPro: true,
    previewClass: "border-l-4 border-r-4 border-blue-500",
    description: "Specialized layout highlighting technical skills and projects",
    styles: technicalStyles,
    template: technicalTemplate,
    applyTemplate: applyTechnicalTemplate // Now using dedicated technical template function
  },
  {
    id: "compact",
    name: "Compact",
    isPro: true,
    previewClass: "border-b-4 border-amber-500",
    description: "Space-efficient design that fits more content on a single page",
    styles: compactStyles,
    template: compactTemplate,
    applyTemplate: applyCompactTemplate // Now using dedicated compact template function
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