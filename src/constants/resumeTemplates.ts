/**
 * Resume templates definition
 * Contains all templates available in the application with their styling and structure
 */
import { ResumeTemplateType, TemplateContentSections } from '../types/resumeTemplateTypes';

/**
 * Basic template styling 
 * Clean and minimalist styling suitable for formal applications
 */
const basicStyles = `
  body {
    font-family: Arial, sans-serif;
    margin: 40px;
    padding: 0;
    color: #333;
    line-height: 1.6;
    font-size: 14px;
  }
  h1, h2 {
    margin-bottom: 10px;
    color: #222;
  }
  h1 {
    font-size: 28px;
    margin-top: 0;
  }
  h2 {
    font-size: 20px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
    margin-top: 30px;
  }
  p, li {
    margin: 5px 0;
  }
  ul {
    padding-left: 20px;
  }
  .contact {
    margin-top: 10px;
    margin-bottom: 30px;
  }
  .section {
    margin-bottom: 20px;
  }
`;

/**
 * HTML structure for basic template
 * Uses placeholders for each section that will be replaced with actual content
 * Added interests section
 */
const basicTemplate = `
  <h1>{{resume-header}}</h1>
  <div class="contact">
    {{resume-contact}}
  </div>
  <div class="section">
    <h2>Profil Professionnel</h2>
    {{resume-summary}}
  </div>
  <div class="section">
    <h2>Expérience Professionnelle</h2>
    {{resume-experience}}
  </div>
  <div class="section">
    <h2>Formation</h2>
    {{resume-education}}
  </div>
  <div class="section">
    <h2>Compétences</h2>
    {{resume-skills}}
  </div>
  <div class="section">
    <h2>Langues</h2>
    {{resume-languages}}
  </div>
  <div class="section">
    <h2>Certifications</h2>
    {{resume-certifications}}
  </div>
  <div class="section">
    <h2>Centres d'intérêt</h2>
    {{resume-interests}}
  </div>
`;

/**
 * Custom apply function for the basic template
 * Handles section mapping and content placement in the template
 * Ensures all contact information is properly displayed
 * 
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content
 */
function applyBasicTemplate(sections: TemplateContentSections): string {
  // Create a base HTML structure
  let html = '';
  
  // Handle header section (name)
  if (sections['resume-header']) {
    // Extract the name (usually in h1)
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(sections['resume-header'], 'text/html');
    const nameElement = headerDoc.querySelector('h1');
    const name = nameElement ? nameElement.textContent : 'Nom Prénom';
    
    html += `<h1>${name}</h1>`;
  } else {
    html += `<h1>Nom Prénom</h1>`;
  }
  
  // Contact information - gather all available contact details
  let contactInfo = '';
  let email = '';
  let phone = '';
  let address = '';
  let linkedin = '';
  
  // Look for contact info in header or separate contact section
  if (sections['resume-contact']) {
    contactInfo = sections['resume-contact'];
  } else if (sections['resume-header']) {
    const headerDoc = new DOMParser().parseFromString(sections['resume-header'], 'text/html');
    
    // Extract contact elements
    const paragraphs = headerDoc.querySelectorAll('p');
    paragraphs.forEach(p => {
      const text = p.textContent || '';
      if (text.includes('@')) email = text;
      else if (text.includes('tel') || text.includes('phone') || text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/)) phone = text;
      else if (text.includes('linkedin')) linkedin = text;
      else if (text.includes('rue') || text.includes('avenue') || text.includes('app.') || 
               text.includes('street') || text.includes('ave')) address = text;
    });
    
    // If we found any contact info, format it
    if (email || phone || address || linkedin) {
      const parts = [];
      if (email) parts.push(email);
      if (phone) parts.push(phone);
      if (address) parts.push(address);
      if (linkedin) parts.push(linkedin);
      
      contactInfo = `<p>${parts.join(' | ')}</p>`;
    }
  }
  
  // If no contact info was found, use a placeholder
  if (!contactInfo) {
    contactInfo = '<p>Email : exemple@email.com | Téléphone : 06 00 00 00 00 | Adresse : 123 Rue Exemple, Ville</p>';
  }
  
  html += `<div class="contact">${contactInfo}</div>`;
  
  // Process each main section
  const sectionMapping = {
    'resume-summary': 'Profil Professionnel',
    'resume-experience': 'Expérience Professionnelle',
    'resume-education': 'Formation',
    'resume-skills': 'Compétences',
    'resume-languages': 'Langues',
    'resume-certifications': 'Certifications',
    'resume-projects': 'Projets',
    'resume-interests': 'Centres d\'intérêt'
  };
  
  // Add each section with its heading
  Object.entries(sectionMapping).forEach(([sectionId, title]) => {
    if (sections[sectionId]) {
      // Remove any existing h2 heading, as we'll add our own
      let content = sections[sectionId];
      const parser = new DOMParser();
      const sectionDoc = parser.parseFromString(content, 'text/html');
      const existingHeading = sectionDoc.querySelector('h2');
      
      if (existingHeading) {
        existingHeading.remove();
        content = sectionDoc.body.innerHTML;
      }
      
      html += `
      <div class="section">
        <h2>${title}</h2>
        ${content}
      </div>`;
    }
  });
  
  return html;
}

/**
 * Professional template styles (Pro)
 * More sophisticated styling with modern layout
 */
const professionalStyles = `
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 40px;
    padding: 0;
    color: #333;
    line-height: 1.6;
    font-size: 14px;
  }
  h1, h2 {
    margin-bottom: 15px;
    color: #0277bd;
  }
  h1 {
    font-size: 30px;
    margin-top: 0;
    text-align: center;
  }
  h2 {
    font-size: 22px;
    border-bottom: 2px solid #0277bd;
    padding-bottom: 8px;
    margin-top: 25px;
  }
  p, li {
    margin: 8px 0;
  }
  ul {
    padding-left: 25px;
  }
  .contact {
    text-align: center;
    margin-top: 10px;
    margin-bottom: 40px;
  }
  .section {
    margin-bottom: 25px;
  }
  .job-title {
    font-weight: bold;
    color: #0277bd;
  }
`;

// Resume template data with enhanced properties
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
    // Template and apply function would be defined here
  },
  {
    id: "creative",
    name: "Creative",
    isPro: true,
    previewClass: "bg-gradient-to-r from-brand-100 to-teal-100 border-none",
    description: "Unique layout for design and creative industry positions",
    // Template properties would be defined here
  },
  {
    id: "executive",
    name: "Executive",
    isPro: true,
    previewClass: "border-2 border-gray-800",
    description: "Sophisticated design for executive and leadership roles",
    // Template properties would be defined here
  },
  {
    id: "technical",
    name: "Technical",
    isPro: true,
    previewClass: "border-l-4 border-r-4 border-blue-500",
    description: "Specialized layout highlighting technical skills and projects",
    // Template properties would be defined here
  },
  {
    id: "compact",
    name: "Compact",
    isPro: true,
    previewClass: "border-b-4 border-amber-500",
    description: "Space-efficient design that fits more content on a single page",
    // Template properties would be defined here
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