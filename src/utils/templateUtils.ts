/**
 * Template Utilities
 * Functions for working with resume templates and content
 */
import { ResumeTemplateType, TemplateContentSections, HeaderInfo } from '../types/resumeTemplateTypes';
import { STANDARD_SECTIONS, ALTERNATIVE_SECTION_IDS } from '../constants/sections';
import { processAIResponse, applyDefaultStyling } from './htmlProcessor';

/**
 * Process header content to add missing spans
 * This ensures that all contact information is properly tagged with semantic classes
 * 
 * @param headerContent - HTML content of the header
 * @returns Processed HTML with proper span tags
 */
export function preprocessHeaderContent(headerContent: string): string {
  try {
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerContent, 'text/html');
    
    // Process paragraphs in the header that contain contact information
    const paragraphs = headerDoc.querySelectorAll('p');
    
    paragraphs.forEach(paragraph => {
      // Skip paragraphs that are already fully wrapped in spans
      if (paragraph.childNodes.length === 1 && paragraph.firstChild?.nodeType === Node.ELEMENT_NODE) {
        return;
      }
      
      // Process text nodes and elements in the paragraph
      let newInnerHTML = '';
      let lastNodeWasElement = false;
      
      paragraph.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim() || '';
          
          if (text) {
            // Identify the type of content by keywords
            if (text.includes('Portfolio') || text.includes('Website') || text.includes('Site')) {
              newInnerHTML += ` <span class="link">${text}</span>`;
            } else if (text.includes('LinkedIn') || text.includes('Github')) {
              newInnerHTML += ` <span class="social">${text}</span>`;
            } else if (text.includes(':') || text.includes('/') || text.includes('|')) {
              // This is likely a separator, keep it as is
              newInnerHTML += text;
            } else {
              // Generic content with no obvious type
              newInnerHTML += ` <span class="contact-info">${text}</span>`;
            }
            
            lastNodeWasElement = false;
          } else if (text === ' ' || text === '/' || text === '|' || text === ':') {
            // Preserve separators
            newInnerHTML += text;
            lastNodeWasElement = false;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Preserve existing elements
          newInnerHTML += (lastNodeWasElement ? ' ' : '') + (node as Element).outerHTML;
          lastNodeWasElement = true;
        }
      });
      
      // Update paragraph content
      paragraph.innerHTML = newInnerHTML.trim();
    });
    
    return headerDoc.body.innerHTML;
  } catch (error) {
    console.error('Error preprocessing header content:', error);
    return headerContent;
  }
}

/**
 * Extract content from HTML by section ID
 * This function parses the HTML content and extracts sections based on IDs
 * 
 * @param html - The HTML content containing resume sections
 * @returns Object with section IDs as keys and their HTML content as values
 */
export function extractSections(html: string): TemplateContentSections {
  if (!html) return {};
  
  try {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Final result object
    const result: TemplateContentSections = {};
    
    // METHOD 1: Explicit section search
    console.log("Extracting sections: Trying Method 1 - Explicit sections");
    
    // Find all sections (section tags or divs with section class or id starting with resume-)
    const explicitSections = doc.querySelectorAll('section, div.section, div[id^="resume-"], div.section-creative');
    
    if (explicitSections.length > 0) {
      console.log(`Found ${explicitSections.length} explicit sections`);
      
      // Extract content from each section
      explicitSections.forEach((section) => {
        if (section.id) {
          let sectionId = section.id;
          
          // Normalize section ID if needed
          if (!sectionId.startsWith('resume-')) {
            // Try to map alternative IDs to standard IDs
            if (ALTERNATIVE_SECTION_IDS[sectionId as keyof typeof ALTERNATIVE_SECTION_IDS]) {
              sectionId = ALTERNATIVE_SECTION_IDS[sectionId as keyof typeof ALTERNATIVE_SECTION_IDS];
            } else {
              // If no mapping found, prefix with resume-
              sectionId = `resume-${sectionId}`;
            }
          }
          
          // Store section content
          result[sectionId] = section.innerHTML;
        }
      });
    }
    
    // METHOD 2: Search by elements with section-title class
    if (Object.keys(result).length === 0) {
      console.log("Extracting sections: Trying Method 2 - section-title class");
      
      // Find all elements with section-title class (usually headings)
      const sectionTitles = doc.querySelectorAll('.section-title');
      
      if (sectionTitles.length > 0) {
        console.log(`Found ${sectionTitles.length} section titles`);
        
        // Process each section title
        sectionTitles.forEach((title, index) => {
          // Find the parent section or div
          let sectionElement = title.closest('section') || title.closest('div[id^="resume-"]');
          
          if (sectionElement && sectionElement.id) {
            // If we found a proper section element, use its ID
            result[sectionElement.id] = sectionElement.innerHTML;
          } else {
            // If no proper section found, try to identify the section type
            const titleText = title.textContent?.trim() || '';
            let sectionId = '';
            
            // Special handling for header (first h1)
            if (title.tagName === 'H1' && index === 0) {
              sectionId = 'resume-header';
            } else {
              // Try to identify section type from title text
              sectionId = identifySectionType(titleText) || `resume-section-${index}`;
            }
            
            // Collect all content until the next section title
            let sectionContent = title.outerHTML;
            let currentNode = title.nextElementSibling;
            
            while (
              currentNode && 
              !currentNode.classList.contains('section-title')
            ) {
              sectionContent += currentNode.outerHTML;
              currentNode = currentNode.nextElementSibling;
            }
            
            // Add the section to results
            result[sectionId] = sectionContent;
          }
        });
      }
    }
    
    // METHOD 3: Search by H1, H2, H3 headings
    if (Object.keys(result).length === 0) {
      console.log("Extracting sections: Trying Method 3 - Headings");
      
      // Find headings that might indicate sections
      const headings = doc.querySelectorAll('h1, h2, h3');
      
      if (headings.length > 0) {
        console.log(`Found ${headings.length} headings`);
        
        // Process each heading
        headings.forEach((heading, index) => {
          const headingText = heading.textContent?.trim() || '';
          let sectionId = '';
          
          // Process header separately (first h1)
          if (heading.tagName === 'H1' && index === 0) {
            sectionId = 'resume-header';
            
            // Collect header content including paragraphs after the H1
            let headerContent = heading.outerHTML;
            let currentNode = heading.nextElementSibling;
            
            // Add content until we hit a different heading type
            while (
              currentNode && 
              !['H1', 'H2', 'H3'].includes(currentNode.tagName)
            ) {
              headerContent += currentNode.outerHTML;
              currentNode = currentNode.nextElementSibling;
            }
            
            result[sectionId] = headerContent;
          } 
          // Process other headings as regular sections
          else if (heading.tagName === 'H2' || heading.tagName === 'H3') {
            // Identify section type from heading text
            const identifiedSectionId = identifySectionType(headingText);
            if (identifiedSectionId) {
              sectionId = identifiedSectionId;
            }
            
            if (!sectionId) {
              // If we couldn't identify the section type, create a generic ID
              sectionId = 'resume-' + headingText
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\w\-]+/g, '')
                .substring(0, 20);
            }
            
            // Collect all content until the next heading of same or higher level
            let sectionContent = heading.outerHTML;
            let currentNode = heading.nextElementSibling;
            
            while (
              currentNode && 
              !(['H1', 'H2'].includes(currentNode.tagName) || 
                (heading.tagName === 'H3' && currentNode.tagName === 'H3'))
            ) {
              sectionContent += currentNode.outerHTML;
              currentNode = currentNode.nextElementSibling;
            }
            
            // Add the section to results
            result[sectionId] = sectionContent;
          }
        });
      }
    }
    
    // METHOD 4: Fallback - If still nothing found, divide by text blocks
    if (Object.keys(result).length === 0) {
      console.log("Extracting sections: Using Method 4 - Fallback method");
      
      // First add everything in the body as resume-content
      result['resume-content'] = doc.body.innerHTML;
      
      // Try to extract at least the header if we can find an H1
      const h1 = doc.querySelector('h1');
      if (h1) {
        let headerContent = h1.outerHTML;
        let currentNode = h1.nextElementSibling;
        
        // Add paragraphs that likely contain contact info
        while (
          currentNode && 
          currentNode.tagName === 'P' &&
          currentNode.textContent
        ) {
          headerContent += currentNode.outerHTML;
          currentNode = currentNode.nextElementSibling;
        }
        
        result['resume-header'] = headerContent;
      }
    }
    
    // SPECIAL PROCESSING: Clean up header section to remove duplicates
    if (result['resume-header']) {
      try {
        const headerParser = new DOMParser();
        const headerDoc = headerParser.parseFromString(result['resume-header'], 'text/html');
        
        // Track content that's already been seen to detect duplicates
        const existingTexts = new Set<string>();
        const elementsToRemove: Element[] = [];
        
        // Check all paragraphs and span elements
        const contactElements = headerDoc.querySelectorAll('p, span');
        
        contactElements.forEach(element => {
          const text = element.textContent?.trim() || '';
          
          // If this exact text has already been seen, mark for removal
          if (existingTexts.has(text)) {
            elementsToRemove.push(element);
          } else if (text) {
            existingTexts.add(text);
          }
        });
        
        // Remove duplicate elements
        elementsToRemove.forEach(element => {
          element.parentNode?.removeChild(element);
        });
        
        // Update the cleaned header
        result['resume-header'] = headerDoc.body.innerHTML;
        
      } catch (error) {
        console.error('Error cleaning resume header:', error);
      }
    }
    
    console.log(`Extracted ${Object.keys(result).length} sections:`, Object.keys(result));
    return result;
  } catch (error) {
    console.error('Error extracting sections:', error);
    return {};
  }
}

/**
 * Identifies the section type based on the heading text
 * Enhanced with more keywords and multilingual support (English/French)
 * 
 * @param headingText - The text of the heading to analyze
 * @returns The standard section ID or null if not identified
 */
function identifySectionType(headingText: string): string | null {
  if (!headingText) return null;
  
  const text = headingText.toLowerCase();
  
  // Map with common section keywords in English and French
  const sectionKeywords = {
    'resume-summary': ['summary', 'profile', 'about', 'profil', 'sommaire', 'résumé', 'aperçu', 'à propos'],
    'resume-experience': ['experience', 'work', 'employment', 'expérience', 'travail', 'emploi', 'parcours'],
    'resume-education': ['education', 'studies', 'formation', 'éducation', 'études', 'diplômes', 'scolarité'],
    'resume-skills': ['skill', 'competence', 'expertise', 'compétence', 'aptitude', 'savoir-faire'],
    'resume-languages': ['language', 'langue', 'idiomas', 'linguistic'],
    'resume-certifications': ['certification', 'credential', 'licence', 'accréditation'],
    'resume-projects': ['project', 'portfolio', 'projet', 'réalisation', 'accomplissement'],
    'resume-awards': ['award', 'achievement', 'honor', 'prize', 'recognition', 'distinction', 'prix', 'récompense'],
    'resume-volunteering': ['volunteer', 'community', 'bénévolat', 'communauté', 'associatif'],
    'resume-publications': ['publication', 'article', 'paper', 'publication', 'article', 'livre', 'ouvrage'],
    'resume-interests': ['interest', 'hobby', 'activity', 'pastime', 'intérêt', 'loisir', 'activité', 'passion'],
    'resume-references': ['reference', 'recommendation', 'référence', 'recommandation', 'contact'],
    'resume-additional': ['additional', 'other', 'more', 'extra', 'additionnel', 'autre', 'supplémentaire', 'divers']
  };
  
  // Check each section type
  for (const [sectionId, keywords] of Object.entries(sectionKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return sectionId;
      }
    }
  }
  
  // If no match found
  return null;
}

/**
 * Extracts structured information from the header content
 * Improved to better handle addresses with line breaks
 * 
 * @param headerContent - HTML content of the header section
 * @returns Object with structured header information
 */
export function extractHeaderInfo(headerContent: string): HeaderInfo {
  try {
    // First, preprocess the header to add missing spans
    const processedContent = preprocessHeaderContent(headerContent);
    
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(processedContent, 'text/html');
    
    // Initialize result with default values
    const result: HeaderInfo = {
      name: 'Full Name',
      phone: null,
      email: null,
      linkedin: null,
      portfolio: null,
      address: null,
      title: null
    };
    
    // Extract name from h1
    const nameElement = headerDoc.querySelector('h1') || headerDoc.querySelector('h2') || headerDoc.querySelector('h3');
    if (nameElement && nameElement.textContent) {
      result.name = nameElement.textContent.trim();
    }
    
    // Extract professional title/role
    if (nameElement) {
      const nextElement = nameElement.nextElementSibling;
      if (nextElement && nextElement.tagName === 'P' && 
          nextElement.textContent && 
          !nextElement.textContent.includes('@') && // Not email
          !nextElement.textContent.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) && // Not phone
          nextElement.textContent.length < 100) { // Not too long
        result.title = nextElement.textContent.trim();
      }
    }
    
    // If we couldn't find a title, look for h2/h3 not a section title
    if (!result.title) {
      const subHeading = headerDoc.querySelector('h2:not(.section-title), h3:not(.section-title)');
      if (subHeading && subHeading.textContent) {
        result.title = subHeading.textContent.trim();
      }
    }
    
    // Extract phone number
    const phoneElement = headerDoc.querySelector('.phone');
    if (phoneElement && phoneElement.textContent) {
      result.phone = phoneElement.textContent.trim();
    } else {
      // Try to find phone number pattern in any text
      const allText = headerDoc.body.textContent || '';
      const phoneMatch = allText.match(/(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (phoneMatch) {
        result.phone = phoneMatch[0].trim();
      }
    }
    
    // Extract email
    const emailElement = headerDoc.querySelector('.email');
    if (emailElement && emailElement.textContent) {
      result.email = emailElement.textContent.trim();
    } else {
      // Try to find email pattern in any text
      const allText = headerDoc.body.textContent || '';
      const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        result.email = emailMatch[0].trim();
      }
    }
    
    // Extract portfolio information
    const portfolioElement = headerDoc.querySelector('.link, .portfolio');
    if (portfolioElement && portfolioElement.textContent) {
      // Extract portfolio text, handling cases like "Portfolio : inactif"
      const portfolioText = portfolioElement.textContent.trim();
      
      // If the text contains a URL, extract just the URL
      const urlMatch = portfolioText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        result.portfolio = urlMatch[0];
      } else {
        // Otherwise, use the full text or extract from "Portfolio : X" format
        if (portfolioText.toLowerCase().includes('portfolio')) {
          const portfolioMatch = portfolioText.match(/portfolio\s*[:;]\s*([^|/\n]+)/i);
          if (portfolioMatch && portfolioMatch[1]) {
            result.portfolio = portfolioMatch[1].trim();
          } else {
            result.portfolio = portfolioText;
          }
        } else {
          result.portfolio = portfolioText;
        }
      }
    } else {
      // Try to find portfolio text directly in paragraphs
      const paragraphs = headerDoc.querySelectorAll('p');
      for (const p of paragraphs) {
        const text = p.textContent || '';
        if (text.toLowerCase().includes('portfolio') || 
            text.toLowerCase().includes('website') || 
            text.toLowerCase().includes('site:')) {
          
          // Extract the part that follows "portfolio" or similar keywords
          const portfolioMatch = text.match(/(?:portfolio|website|site)(?:\s*[:;]\s*)([^|/\n]+)/i);
          if (portfolioMatch && portfolioMatch[1]) {
            result.portfolio = portfolioMatch[1].trim();
            break;
          } else {
            // Try to extract just the portfolio text
            const parts = text.split(/[\/|]/);
            for (const part of parts) {
              if (part.trim().toLowerCase().includes('portfolio')) {
                result.portfolio = part.trim();
                break;
              }
            }
            if (!result.portfolio) {
              result.portfolio = text.trim();
            }
            break;
          }
        }
      }
    }
    
    // Extract LinkedIn
    const linkedinElement = headerDoc.querySelector('.linkedin, .social');
    if (linkedinElement && linkedinElement.textContent) {
      const linkedinText = linkedinElement.textContent.trim();
      
      // Extract LinkedIn info similar to portfolio
      result.linkedin = linkedinText;
    }
    
    // Extract address - IMPROVED ADDRESS HANDLING
    const addressElement = headerDoc.querySelector('.address');
    if (addressElement) {
      // Get the HTML content to preserve line breaks
      let addressHtml = addressElement.innerHTML;
      
      // Convert <br> tags to newlines for proper storage
      addressHtml = addressHtml.replace(/<br\s*\/?>/gi, '\n');
      
      // Create a temporary div to extract text with line breaks
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = addressHtml;
      
      // Get text content which will include the line breaks we added
      const addressText = tempDiv.textContent || '';
      
      // Store the address with line breaks preserved
      result.address = addressText.trim();
      
      console.log("Found address element:", addressText);
    } else {
      // Fallback address detection from paragraphs
      const paragraphs = headerDoc.querySelectorAll('p');
      for (const p of paragraphs) {
        const text = p.textContent || '';
        if ((text.match(/\b[A-Z][0-9][A-Z]\s?[0-9][A-Z][0-9]\b/i) || // Canadian postal code
          text.includes("app.") || 
          text.match(/\bQuebec\b|\bQuébec\b|\bMontreal\b|\bMontréal\b/i)) && 
          !text.includes('@') && // Not email
          !text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) // Not phone
        ) {
          result.address = text.trim();
          console.log("Found address in paragraph:", text);
          break;
        }
      }
    }
    
    console.log("Extracted header info:", result);
    return result;
  } catch (error) {
    console.error('Error extracting header info:', error);
    return {
      name: 'Full Name',
      phone: null,
      email: null,
      linkedin: null,
      portfolio: null,
      address: null,
      title: null
    };
  }
}

/**
 * Generates a basic header HTML structure with improved handling of all contact information
 * 
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section
 */
export function generateBasicHeader(headerInfo: HeaderInfo): string {
  // Build contact sections with careful handling of separators
  const contactParts: string[] = [];
  
  if (headerInfo.phone) {
    contactParts.push(`<span class="phone">${headerInfo.phone}</span>`);
  }
  
  if (headerInfo.email) {
    contactParts.push(`<span class="email">${headerInfo.email}</span>`);
  }
  
  if (headerInfo.linkedin) {
    contactParts.push(`<span class="linkedin">${headerInfo.linkedin}</span>`);
  }
  
  if (headerInfo.portfolio) {
    // Format portfolio info appropriately
    const portfolioText = headerInfo.portfolio.toLowerCase() === 'inactif' || 
    headerInfo.portfolio.toLowerCase() === 'inactive' ? 
    `Portfolio : ${headerInfo.portfolio}` : headerInfo.portfolio;
    contactParts.push(`<span class="link">${portfolioText}</span>`);
  }
  
  // Join contact parts with separators
  const contactLine = contactParts.length > 0 ? 
    `<p>${contactParts.join(' | ')}</p>` : '';
  
  // Format address separately, replacing newlines with BR tags
  let addressLine = '';
  if (headerInfo.address) {
    // Replace newlines with <br> tags for display
    const formattedAddress = headerInfo.address.replace(/\n/g, '<br>');
    addressLine = `<p><span class="address">${formattedAddress}</span></p>`;
  }
  
  // Assemble the complete header
  return `<div id="resume-header">
    <h1 class="section-title name">${headerInfo.name}</h1>
    ${headerInfo.title ? `<p class="professional-title">${headerInfo.title}</p>` : ''}
    ${contactLine}
    ${addressLine}
  </div>`;
}

/**
 * Generates a professional header HTML structure with improved handling of all contact information
 * 
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section with icons
 */
export function generateProfessionalHeader(headerInfo: HeaderInfo): string {
  // Build contact details with careful handling of all information
  const contactDetailsParts: string[] = [];
  
  if (headerInfo.phone) {
    contactDetailsParts.push(`<span class="phone"><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/telephone-fill.svg" alt="Phone"> ${headerInfo.phone}</span>`);
  }
  
  if (headerInfo.email) {
    contactDetailsParts.push(`<span class="email"><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/envelope-fill.svg" alt="Email"> ${headerInfo.email}</span>`);
  }
  
  if (headerInfo.linkedin) {
    contactDetailsParts.push(`<span class="linkedin"><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/linkedin.svg" alt="LinkedIn"> ${headerInfo.linkedin}</span>`);
  }
  
  if (headerInfo.portfolio) {
    // Format portfolio info appropriately
    const portfolioText = headerInfo.portfolio.toLowerCase() === 'inactif' || 
                         headerInfo.portfolio.toLowerCase() === 'inactive' ? 
                         `Portfolio : ${headerInfo.portfolio}` : headerInfo.portfolio;
    contactDetailsParts.push(`<span class="link"><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/globe.svg" alt="Website"> ${portfolioText}</span>`);
  }
  
  const contactDetails = contactDetailsParts.length > 0 ?
    `<div class="contact-details">${contactDetailsParts.join('')}</div>` : '';
  
  // Assemble the complete header
  return `<div id="resume-header">
    <h1 class="section-title name">${headerInfo.name}</h1>
    <div class="contact-info">
      ${headerInfo.title ? `<div class="professional-title">${headerInfo.title}</div>` : ''}
      ${contactDetails}
      ${headerInfo.address ? `<div class="address"><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/geo-alt-fill.svg" alt="Address"> ${headerInfo.address}</div>` : ''}
    </div>
  </div>`;
}

/**
 * Apply a template to resume content
 * Takes extracted section content and formats it according to the template
 * 
 * @param template - The template to apply
 * @param sections - Object containing section content by ID
 * @returns Complete HTML with applied template
 */
export function applyTemplateToContent(
  template: ResumeTemplateType,
  sections: TemplateContentSections
): string {
  console.log(`Applying template: ${template.id} with ${Object.keys(sections).length} sections`);
  
  // If template has custom apply function, use it
  if (template.applyTemplate) {
    console.log(`Using custom apply function for template: ${template.id}`);
    return template.applyTemplate(sections);
  }
  
  // Default implementation if no custom function specified
  if (template.template) {
    console.log(`Using standard template replacement for template: ${template.id}`);
    // Start with the template HTML
    let result = template.template;
    
    // Replace each section placeholder with actual content
    Object.entries(sections).forEach(([sectionId, content]) => {
      const placeholder = `{{${sectionId}}}`;
      
      if (result.includes(placeholder)) {
        console.log(`Replacing placeholder: ${placeholder}`);
        result = result.replace(placeholder, content || '');
      } else {
        console.log(`Placeholder not found in template: ${placeholder}`);
      }
    });
    
    // Handle any remaining placeholders - replace with empty string
    const remainingPlaceholders = result.match(/{{[^}]+}}/g);
    if (remainingPlaceholders) {
      console.log(`Found ${remainingPlaceholders.length} remaining placeholders to clear`);
      
      remainingPlaceholders.forEach(placeholder => {
        result = result.replace(new RegExp(placeholder, 'g'), '');
      });
    }
    
    return result;
  }
  
  // Fallback: concatenate the sections if no template specified
  console.log("No template HTML found - using fallback concatenation method");
  
  // Create a container for the resume
  let html = '<div class="resume-container">';
  
  // Always show header first if available
  if (sections['resume-header']) {
    html += `<div id="resume-header">${sections['resume-header']}</div>`;
  }
  
  // Then add all other sections in standard order
  STANDARD_SECTIONS.forEach(section => {
    if (section.id !== 'resume-header' && sections[section.id]) {
      html += `<div class="section" id="${section.id}">${sections[section.id]}</div>`;
    }
  });
  
  // Close container
  html += '</div>';
  
  return html;
}

/**
 * Creates a complete HTML document with template styling
 * Used for export to file or preview
 * 
 * @param template - The template to use
 * @param content - The HTML content to apply the template to
 * @param title - Optional title for the HTML document
 * @returns Complete HTML document as a string
 */
export function createCompleteHtml(
  template: ResumeTemplateType,
  content: string,
  title: string = 'Resume'
): string {
  console.log(`Creating complete HTML with template: ${template.id}`);
  
  // Extract sections from content
  const sections = extractSections(content);
  
  // Apply template to sections
  const formattedContent = applyTemplateToContent(template, sections);
  
  // Create complete HTML document with improved meta tags
  return `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Professional resume created with CareerBoost">
    <title>${title}</title>
    <style>
      /* Reset and common styles */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      /* Template-specific styles */
      ${template.styles || ''}
      
      /* Print-specific styles */
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        @page {
          margin: 1cm;
        }
      }
    </style>
  </head>
  <body>
    ${formattedContent}
  </body>
  </html>`;
}

/**
 * Enhances HTML header content by adding semantic span classes to contact information
 * Used in prepareOptimizedTextForEditor to improve header structure before editing
 * 
 * @param headerSection - DOM Element containing the header section
 */
function enhanceHeaderContactInfo(headerSection: Element): void {
  if (!headerSection) return;
  
  // Process paragraphs in the header
  const paragraphs = headerSection.querySelectorAll('p');
  
  paragraphs.forEach(p => {
    let textContentUpdated = false;
    const originalText = p.innerHTML;
    let newHTML = originalText;
    
    // 1. Add email spans
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    if (emailRegex.test(newHTML)) {
      newHTML = newHTML.replace(emailRegex, '<span class="email">$1</span>');
      textContentUpdated = true;
    }
    
    // 2. Add phone spans
    const phoneRegex = /((?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
    if (phoneRegex.test(newHTML)) {
      newHTML = newHTML.replace(phoneRegex, '<span class="phone">$1</span>');
      textContentUpdated = true;
    }
    
    // 3. Add address spans for paragraphs that look like addresses
    if (
      newHTML.match(/[A-Z][0-9][A-Z]\s?[0-9][A-Z][0-9]/i) || // Canadian postal code
      (newHTML.match(/,/g) || []).length >= 2 || // Multiple commas
      newHTML.includes("app.") || // Apartment indicator
      newHTML.match(/Quebec|Québec|Montreal|Montréal/i) // City names
    ) {
      // Only wrap in address span if not already in a span
      if (!newHTML.includes('<span class="')) {
        newHTML = `<span class="address">${newHTML}</span>`;
        textContentUpdated = true;
      }
    }
    
    // 4. Add portfolio/website spans for text containing those keywords
    const portfolioRegex = /(Portfolio\s*[:;]\s*[^<|/\n]+)/gi;
    if (portfolioRegex.test(newHTML)) {
      newHTML = newHTML.replace(portfolioRegex, '<span class="link">$1</span>');
      textContentUpdated = true;
    }
    
    // 5. Add LinkedIn spans
    const linkedinRegex = /(LinkedIn\s*[:;]\s*[^<|/\n]+)/gi;
    if (linkedinRegex.test(newHTML)) {
      newHTML = newHTML.replace(linkedinRegex, '<span class="linkedin">$1</span>');
      textContentUpdated = true;
    }
    
    // 6. Process mixed content with separators (/, |) that might contain unmarked items
    if (newHTML.includes('/') || newHTML.includes('|')) {
      // Split by common separators
      const parts = newHTML.split(/([\/|])/);
      
      // Process each part that isn't already wrapped in a span
      let processedHTML = '';
      parts.forEach(part => {
        if (part === '/' || part === '|') {
          processedHTML += part;
        } else if (part.includes('<span class="')) {
          processedHTML += part;
        } else {
          const trimmedPart = part.trim();
          if (trimmedPart) {
            // Determine the type of content
            if (trimmedPart.toLowerCase().includes('portfolio') || 
                trimmedPart.toLowerCase().includes('website')) {
              processedHTML += `<span class="link">${trimmedPart}</span>`;
              textContentUpdated = true;
            } else if (trimmedPart.toLowerCase().includes('linkedin') || 
                      trimmedPart.toLowerCase().includes('github')) {
              processedHTML += `<span class="social">${trimmedPart}</span>`;
              textContentUpdated = true;
            } else {
              processedHTML += trimmedPart;
            }
          }
        }
      });
      
      if (processedHTML && processedHTML !== newHTML) {
        newHTML = processedHTML;
        textContentUpdated = true;
      }
    }
    
    // Update paragraph HTML if changes were made
    if (textContentUpdated) {
      p.innerHTML = newHTML;
    }
  });
}

/**
 * Process and prepare optimized text for the editor
 * Enhanced to improve header content structure and formatting
 * 
 * @param optimizedText Text from AI (plain or HTML)
 * @returns Properly formatted HTML ready for the editor
 */
export function prepareOptimizedTextForEditor(optimizedText: string): string {
  // Skip if empty
  if (!optimizedText) return '';
  
  try {
    // First convert to proper HTML if needed
    let processedHtml = processAIResponse(optimizedText);
    
    // Create a temporary document to work with
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');
    
    // Step 1: Process each section to fix classes
    doc.querySelectorAll('section').forEach(section => {
      // Remove section-title class from the section itself
      section.classList.remove('section-title');
      
      // Find the first h1 or h2 in the section
      const heading = section.querySelector('h1, h2');
      
      // If a heading is found, add section-title class to it
      if (heading) {
        heading.classList.add('section-title');
      }
    });
    
    // Step 2: Process header section for name/email/phone/etc classes
    const headerSection = doc.querySelector('section#resume-header');
    if (headerSection) {
      // Add name class to h1
      const nameHeading = headerSection.querySelector('h1');
      if (nameHeading) {
        nameHeading.classList.add('name');
      }
      
      // Enhanced processing of contact information
      enhanceHeaderContactInfo(headerSection);
      
      // Track processed text to avoid duplicates
      const processedTexts = new Set<string>();
      const elementsToRemove: Element[] = [];
      
      // Mark duplicates for removal
      headerSection.querySelectorAll('p, span').forEach(element => {
        const text = element.textContent?.trim() || '';
        if (text) {
          if (processedTexts.has(text)) {
            elementsToRemove.push(element);
          } else {
            processedTexts.add(text);
          }
        }
      });
      
      // Remove duplicates
      elementsToRemove.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    }
    
    // Step 3: Get the updated HTML
    processedHtml = doc.body.innerHTML;
    
    // Step 4: Apply default styling
    const styledHtml = applyDefaultStyling(processedHtml);
    
    return styledHtml;
  } catch (error) {
    console.error('Error in DOM processing:', error);
    
    // Fallback to original if any errors
    return optimizedText;
  }
}