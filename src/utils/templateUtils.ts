/**
 * Template Utilities
 * Functions for working with resume templates and content
 */
import { ResumeTemplateType, TemplateContentSections } from '../types/resumeTemplateTypes';

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
    
    // Find all sections (either section tags or divs with section class)
    const sections = doc.querySelectorAll('section, div.section');
    const result: TemplateContentSections = {};
    
    // Extract content from each section
    sections.forEach((section) => {
      if (section.id) {
        result[section.id] = section.innerHTML;
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
    
    return result;
  } catch (error) {
    console.error('Error extracting sections:', error);
    return {};
  }
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
      result = result.replace(placeholder, content);
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
  
  // Example using html2pdf.js (you would need to install this package)
  // import html2pdf from 'html2pdf.js';
  
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