/**
 * Template Utilities
 * Functions for working with resume templates and content
 */
import { ResumeTemplateType, TemplateContentSections } from '../types/resumeTemplateTypes';
import { STANDARD_SECTIONS, ALTERNATIVE_SECTION_IDS } from '../constants/sections';

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
    
    // Find all sections (either section tags or divs with section class or id)
    const sections = doc.querySelectorAll('section, div.section, div[id^="resume-"], div.section-creative');
    const result: TemplateContentSections = {};
    
    // Extract content from each section
    sections.forEach((section) => {
      if (section.id) {
        if (section.id.startsWith('resume-')) {
          result[section.id] = section.innerHTML;
        } else if (ALTERNATIVE_SECTION_IDS[section.id as keyof typeof ALTERNATIVE_SECTION_IDS]) {
          // Convert alternative IDs to standard IDs
          const standardId = ALTERNATIVE_SECTION_IDS[section.id as keyof typeof ALTERNATIVE_SECTION_IDS];
          result[standardId] = section.innerHTML;
        }
      }
    });
    
    // If no sections found, check for headings with section IDs
    if (Object.keys(result).length === 0) {
      // Find headings with section IDs 
      const headings = doc.querySelectorAll('[id^="resume-"]');
      
      headings.forEach((heading) => {
        if (heading.id) {
          // Get all content until the next heading with a section ID
          let content = heading.outerHTML;
          let currentNode = heading.nextElementSibling;
          
          while (
            currentNode && 
            !currentNode.id?.startsWith('resume-')
          ) {
            content += currentNode.outerHTML;
            currentNode = currentNode.nextElementSibling;
          }
          
          result[heading.id] = content;
        }
      });
    }
    
    // Second fallback: try to identify sections by headings (h2, h3)
    if (Object.keys(result).length === 0) {
      const headings = doc.querySelectorAll('h1, h2, h3');
      
      let lastSectionId: string | null = null;
      let lastHeadingContent = '';
      
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const headingText = heading.textContent?.trim() || '';
        
        // Skip if no text
        if (!headingText) continue;
        
        // First heading is treated as the header
        if (i === 0 && heading.tagName === 'H1') {
          // Extract the header section
          let headerContent = heading.outerHTML;
          let currentNode = heading.nextElementSibling;
          
          // Add content until next heading
          while (
            currentNode && 
            !['H1', 'H2', 'H3'].includes(currentNode.tagName)
          ) {
            headerContent += currentNode.outerHTML;
            currentNode = currentNode.nextElementSibling;
          }
          
          result['resume-header'] = headerContent;
          continue;
        }
        
        // Try to identify the section type based on the heading text
        const sectionId = identifySectionType(headingText);
        
        if (sectionId) {
          // If we found a previous section, store its content before starting a new one
          if (lastSectionId && lastHeadingContent) {
            result[lastSectionId] = lastHeadingContent;
          }
          
          lastSectionId = sectionId;
          lastHeadingContent = heading.outerHTML;
        } else if (lastSectionId) {
          // If we're inside a section, add the content
          lastHeadingContent += heading.outerHTML;
        }
        
        // Get content until next heading
        let currentNode = heading.nextElementSibling;
        while (
          currentNode && 
          !['H1', 'H2', 'H3'].includes(currentNode.tagName)
        ) {
          if (lastHeadingContent) {
            lastHeadingContent += currentNode.outerHTML;
          }
          currentNode = currentNode.nextElementSibling;
        }
      }
      
      // Add the last section if any
      if (lastSectionId && lastHeadingContent) {
        result[lastSectionId] = lastHeadingContent;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting sections:', error);
    return {};
  }
}

/**
 * Identifies the section type based on the heading text
 * 
 * @param headingText - The text of the heading to analyze
 * @returns The standard section ID or null if not identified
 */
function identifySectionType(headingText: string): string | null {
  const text = headingText.toLowerCase();
  
  if (text.includes('summary') || text.includes('profile') || text.includes('about')) {
    return 'resume-summary';
  } else if (text.includes('experience') || text.includes('work') || text.includes('employment')) {
    return 'resume-experience';
  } else if (text.includes('education') || text.includes('studies') || text.includes('formation')) {
    return 'resume-education';
  } else if (text.includes('skill') || text.includes('competence') || text.includes('expertise')) {
    return 'resume-skills';
  } else if (text.includes('language') || text.includes('langue')) {
    return 'resume-languages';
  } else if (text.includes('certification') || text.includes('credential')) {
    return 'resume-certifications';
  } else if (text.includes('project') || text.includes('portfolio')) {
    return 'resume-projects';
  } else if (text.includes('award') || text.includes('achievement') || text.includes('honor')) {
    return 'resume-awards';
  } else if (text.includes('volunteer') || text.includes('community')) {
    return 'resume-volunteering';
  } else if (text.includes('publication') || text.includes('article') || text.includes('paper')) {
    return 'resume-publications';
  } else if (text.includes('interest') || text.includes('hobby') || text.includes('activity')) {
    return 'resume-interests';
  } else if (text.includes('reference') || text.includes('recommendation')) {
    return 'resume-references';
  } else if (text.includes('additional') || text.includes('other')) {
    return 'resume-additional';
  }
  
  return null;
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
  // If template has custom apply function, use it
  if (template.applyTemplate) {
    return template.applyTemplate(sections);
  }
  
  // Default implementation if no custom function specified
  // Use the template HTML and replace section placeholders with content
  if (template.template) {
    // Start with the template HTML
    let result = template.template;
    
    // Replace each section placeholder with actual content
    Object.entries(sections).forEach(([sectionId, content]) => {
      const placeholder = `{{${sectionId}}}`;
      result = result.replace(placeholder, content || '');
    });
    
    // Handle any remaining placeholders - replace with empty string
    STANDARD_SECTIONS.forEach(section => {
      const placeholder = `{{${section.id}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(new RegExp(placeholder, 'g'), '');
      }
    });
    
    return result;
  }
  
  // Fallback: just concatenate the sections if no template specified
  return Object.values(sections).join('');
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
  // Extract sections from content
  const sections = extractSections(content);
  
  // Apply template to sections
  const formattedContent = applyTemplateToContent(template, sections);
  
  // Create complete HTML document
  return `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      ${template.styles || ''}
    </style>
  </head>
  <body>
    ${formattedContent}
  </body>
  </html>`;
}

/**
 * Generate PDF from template content
 * This would integrate with a PDF generation library
 * 
 * @param template - The template to use 
 * @param content - The HTML content to convert
 * @returns Promise resolving to a Blob containing the PDF
 */
export async function generatePDF(
  template: ResumeTemplateType,
  content: string
): Promise<Blob> {
  // This is a placeholder for PDF generation
  // You would integrate with a library like html2pdf.js, jsPDF, or similar
  
  const completeHtml = createCompleteHtml(template, content);
  
  // Mock implementation - replace with actual PDF generation
  // In a real implementation, you would do something like:
  // return html2pdf().from(completeHtml).outputPdf('blob');
  
  // For now, just return the HTML as a blob to demonstrate the concept
  return new Blob([completeHtml], { type: 'application/pdf' });
}

/**
 * Preview the resume with the selected template
 * Creates a data URL that can be used in an iframe or window for preview
 * 
 * @param template - The template to use
 * @param content - The HTML content to preview
 * @returns Data URL with the complete HTML document
 */
export function createPreviewUrl(
  template: ResumeTemplateType,
  content: string
): string {
  const completeHtml = createCompleteHtml(template, content);
  return URL.createObjectURL(new Blob([completeHtml], { type: 'text/html' }));
}