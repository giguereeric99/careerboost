/**
 * HTML Processing Utilities
 * 
 * Functions for processing and enhancing HTML content for resume display
 * - Structured HTML generation from plain text
 * - Section ID management
 * - Default styling application
 */

/**
 * Converts plain text resume content to structured HTML with section IDs
 * This is particularly useful when receiving raw text from AI models
 * 
 * @param text Plain text resume content
 * @returns HTML content with appropriate section tags, IDs, and basic formatting
 */
export function convertTextToHTML(text: string): string {
  if (!text) return '';
  
  // Split the text into lines for processing
  const lines = text.split('\n');
  let html = '';
  let currentSection: string | null = null;
  let inList = false;
  
  // Process each line
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      // Only add break tag if not at the beginning of a section
      if (currentSection) {
        html += '<br/>';
      }
      return;
    }
    
    // Detect section headers (usually all caps)
    const isHeader = 
      trimmedLine === trimmedLine.toUpperCase() && 
      trimmedLine.length > 3 &&
      !trimmedLine.startsWith('•') &&
      !trimmedLine.startsWith('-');
    
    // Close any open list
    if (inList && !trimmedLine.startsWith('•') && !trimmedLine.startsWith('-')) {
      html += '</ul>';
      inList = false;
    }
    
    // Handle new section header
    if (isHeader) {
      // Close previous section if any
      if (currentSection) {
        html += `</section>`;
      }
      
      // Create section ID from header (slug-case)
      const sectionId = trimmedLine
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
      
      // Use standard section IDs where possible
      let standardId = '';
      if (
        trimmedLine.includes('PROFIL') || 
        trimmedLine.includes('SUMMARY') || 
        trimmedLine.includes('ABOUT')
      ) {
        standardId = 'resume-summary';
      } else if (
        trimmedLine.includes('EXPÉRIENCE') || 
        trimmedLine.includes('EXPERIENCE') || 
        trimmedLine.includes('WORK')
      ) {
        standardId = 'resume-experience';
      } else if (
        trimmedLine.includes('FORMATION') || 
        trimmedLine.includes('EDUCATION') || 
        trimmedLine.includes('ÉTUDES')
      ) {
        standardId = 'resume-education';
      } else if (
        trimmedLine.includes('COMPÉTENCES') || 
        trimmedLine.includes('SKILLS') || 
        trimmedLine.includes('TECHNOLOGIES')
      ) {
        standardId = 'resume-skills';
      } else if (
        trimmedLine.includes('LANGUE') || 
        trimmedLine.includes('LANGUAGE')
      ) {
        standardId = 'resume-languages';
      } else if (
        trimmedLine.includes('CERTIFICATION') || 
        trimmedLine.includes('QUALIFICATION')
      ) {
        standardId = 'resume-certifications';
      } else if (
        trimmedLine.includes('PROJET') || 
        trimmedLine.includes('PROJECT')
      ) {
        standardId = 'resume-projects';
      } else if (
        trimmedLine.includes('RÉFÉRENCE') || 
        trimmedLine.includes('REFERENCE')
      ) {
        standardId = 'resume-references';
      } else {
        standardId = `resume-${sectionId}`;
      }
      
      // Start new section with standard ID
      html += `<section id="${standardId}">`;
      html += `<h2>${trimmedLine}</h2>`;
      currentSection = standardId;
    } 
    // Handle name/contact at the beginning (assuming first lines are the header)
    else if (index === 0) {
      html += `<section id="resume-header">`;
      html += `<h1>${trimmedLine}</h1>`;
      currentSection = 'resume-header';
    }
    // Handle subtitle in header
    else if (index === 1 && currentSection === 'resume-header') {
      html += `<h3>${trimmedLine}</h3>`;
    }
    // Handle contact info in header
    else if (index === 2 && currentSection === 'resume-header' && 
            (trimmedLine.includes('@') || 
             trimmedLine.includes('-') || 
             trimmedLine.includes('|'))) {
      html += `<p>${trimmedLine}</p>`;
    }
    // Handle sub-headers or job titles
    else if (trimmedLine.endsWith(':') || 
            (currentSection === 'resume-experience' && 
             trimmedLine.includes('|'))) {
      html += `<h3>${trimmedLine}</h3>`;
    }
    // Handle list items
    else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
      // Start a list if not already in one
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      // Add list item
      html += `<li>${trimmedLine.substring(1).trim()}</li>`;
    }
    // Everything else is a paragraph
    else {
      html += `<p>${trimmedLine}</p>`;
    }
  });
  
  // Close the last section and list if needed
  if (inList) {
    html += '</ul>';
  }
  if (currentSection) {
    html += `</section>`;
  }
  
  return html;
}

/**
 * Enhances HTML with proper section IDs and structure
 * Used when HTML already exists but might not have proper section IDs
 * 
 * @param html Original HTML content
 * @returns Enhanced HTML with proper section IDs
 */
export function enhanceHTML(html: string): string {
  // Skip if empty or not HTML
  if (!html || !html.includes('<')) return html;
  
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Find sections or create them
  const sections = doc.querySelectorAll('section');
  
  // If no sections found, try to create them based on headings
  if (sections.length === 0) {
    // Find all headings to identify potential sections
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    // If no headings either, wrap the entire content in a single section
    if (headings.length === 0) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      
      const newSection = document.createElement('section');
      newSection.id = 'resume-content';
      
      while (wrapper.firstChild) {
        newSection.appendChild(wrapper.firstChild);
      }
      
      return newSection.outerHTML;
    }
    
    // Process each heading to create sections
    let processedHTML = html;
    let lastIndex = 0;
    
    headings.forEach((heading, index) => {
      // Get heading text to create section ID
      const headingText = heading.textContent || '';
      
      // Determine section type based on heading content
      let sectionType = 'section';
      if (headingText.toUpperCase().includes('EXPERIENCE')) {
        sectionType = 'resume-experience';
      } else if (headingText.toUpperCase().includes('EDUCATION')) {
        sectionType = 'resume-education';
      } else if (headingText.toUpperCase().includes('SKILL')) {
        sectionType = 'resume-skills';
      } else if (headingText.toUpperCase().includes('SUMMARY')) {
        sectionType = 'resume-summary';
      } else if (index === 0) {
        sectionType = 'resume-header';
      } else {
        // Create a slug from heading text
        sectionType = 'resume-' + headingText
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]+/g, '')
          .substring(0, 20);
      }
      
      // Get next section start
      const nextHeading = headings[index + 1];
      const sectionEnd = nextHeading 
        ? html.indexOf(nextHeading.outerHTML)
        : html.length;
      
      // Extract section content
      const sectionHTML = html.substring(
        html.indexOf(heading.outerHTML), 
        sectionEnd
      );
      
      // Create new section wrapper
      const wrappedSection = `<section id="${sectionType}">${sectionHTML}</section>`;
      
      // Replace in processed HTML
      processedHTML = processedHTML.replace(sectionHTML, wrappedSection);
    });
    
    return processedHTML;
  }
  
  // Ensure all sections have IDs
  sections.forEach((section) => {
    if (!section.id) {
      // Try to determine section type from content
      const headings = section.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length > 0) {
        const headingText = headings[0].textContent || '';
        
        // Assign ID based on heading content
        if (headingText.toUpperCase().includes('EXPERIENCE')) {
          section.id = 'resume-experience';
        } else if (headingText.toUpperCase().includes('EDUCATION')) {
          section.id = 'resume-education';
        } else if (headingText.toUpperCase().includes('SKILL')) {
          section.id = 'resume-skills';
        } else if (headingText.toUpperCase().includes('SUMMARY')) {
          section.id = 'resume-summary';
        } else {
          // Create a slug from heading text
          section.id = 'resume-' + headingText
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .substring(0, 20);
        }
      } else {
        // Fallback ID
        section.id = 'resume-section-' + Math.floor(Math.random() * 1000);
      }
    }
  });
  
  // Return the improved HTML
  return doc.body.innerHTML;
}

/**
 * Process AI response to ensure it has proper HTML structure
 * Handles both raw text and HTML responses from AI
 * 
 * @param content Raw content from AI response
 * @returns Properly formatted HTML with section IDs
 */
export function processAIResponse(content: string): string {
  // Check if content already has HTML tags
  const hasHtml = content.includes('<') && content.includes('>');
  
  if (hasHtml) {
    // If it has HTML, enhance it
    return enhanceHTML(content);
  } else {
    // If it's plain text, convert to HTML
    return convertTextToHTML(content);
  }
}

/**
 * Apply default styling to HTML content
 * Adds classes and inline styles for better appearance
 * 
 * @param html Original HTML content
 * @returns Styled HTML content
 */
export function applyDefaultStyling(html: string): string {
  // Skip if empty
  if (!html) return html;
  
  // For server-side, we can't use DOM directly
  // This is a simple regex-based approach
  
  // Add classes to headings
  let styledHtml = html
    .replace(/<h1>/g, '<h1 class="text-2xl font-bold text-gray-800 mb-1">')
    .replace(/<h2>/g, '<h2 class="text-xl font-semibold text-gray-700 mb-2 mt-4 uppercase border-b pb-1">')
    .replace(/<h3>/g, '<h3 class="text-lg font-medium text-gray-700 mb-1">');
  
  // Style sections
  styledHtml = styledHtml.replace(
    /<section id="([^"]+)">/g, 
    '<section id="$1" class="mb-4 pb-2">'
  );
  
  // Special handling for specific sections
  styledHtml = styledHtml
    .replace(
      /<section id="resume-header"/g, 
      '<section id="resume-header" class="mb-6 text-center"'
    )
    .replace(
      /<section id="resume-summary"/g, 
      '<section id="resume-summary" class="mb-6 bg-gray-50 p-3 rounded"'
    )
    .replace(
      /<section id="resume-skills"/g, 
      '<section id="resume-skills" class="mb-6"'
    );
  
  // Style lists
  styledHtml = styledHtml.replace(
    /<ul>/g, 
    '<ul class="list-disc pl-5 mb-2">'
  );
  
  return styledHtml;
}

/**
 * Extract structured data from HTML content
 * This is useful for analyzing or processing the resume content
 * 
 * @param html HTML resume content
 * @returns Structured data with section text
 */
export function extractSectionsFromHtml(html: string): Record<string, string> {
  // Skip if empty
  if (!html) return {};
  
  // Create a DOM parser for browser environments
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Find all sections
  const sections = doc.querySelectorAll('section');
  const result: Record<string, string> = {};
  
  // Extract content from each section
  sections.forEach((section) => {
    if (section.id) {
      result[section.id] = section.innerHTML;
    }
  });
  
  return result;
}

/**
 * Process and prepare optimized text for the editor
 * Main entry point for handling AI-generated content
 * 
 * @param optimizedText Text from AI (plain or HTML)
 * @returns Properly formatted HTML ready for the editor
 */
export function prepareOptimizedTextForEditor(optimizedText: string): string {
  // Process the content to ensure proper HTML
  const processedHtml = processAIResponse(optimizedText);
  
  // Apply default styling
  const styledHtml = applyDefaultStyling(processedHtml);
  
  return styledHtml;
}