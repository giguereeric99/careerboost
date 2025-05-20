/**
 * HTML Processing Utilities
 * 
 * Functions for processing and enhancing HTML content for resume display
 * - Structured HTML generation from plain text
 * - Section ID management
 * - Default styling application
 * - Addition of required CSS classes for templates
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
      // Add section-title class to h2 element
      html += `<h2 class="section-title">${trimmedLine}</h2>`;
      currentSection = standardId;
    } 
    // Handle name/contact at the beginning (assuming first lines are the header)
    else if (index === 0) {
      html += `<section id="resume-header">`;
      // First h1 in header is name, use section-title class
      html += `<h1 class="section-title name">${trimmedLine}</h1>`;
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
  
  try {
    // Use DOM approach for more reliable class handling
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Style headings
    doc.querySelectorAll('h1').forEach(el => {
      el.classList.add('text-2xl', 'font-bold', 'text-gray-800', 'mb-1');
    });
    
    doc.querySelectorAll('h2').forEach(el => {
      el.classList.add('text-xl', 'font-semibold', 'text-gray-700', 'mb-2', 'mt-4', 'uppercase', 'border-b', 'pb-1');
    });
    
    doc.querySelectorAll('h3').forEach(el => {
      el.classList.add('text-lg', 'font-medium', 'text-gray-700', 'mb-1');
    });
    
    // Style sections
    doc.querySelectorAll('section').forEach(el => {
      el.classList.add('mb-4', 'pb-2');
    });
    
    // Special section styling
    const headerSection = doc.querySelector('section#resume-header');
    if (headerSection) {
      headerSection.classList.add('mb-6', 'text-center');
    }
    
    const summarySection = doc.querySelector('section#resume-summary');
    if (summarySection) {
      summarySection.classList.add('mb-6', 'bg-gray-50', 'p-3', 'rounded');
    }
    
    const skillsSection = doc.querySelector('section#resume-skills');
    if (skillsSection) {
      skillsSection.classList.add('mb-6');
    }
    
    // Style lists
    doc.querySelectorAll('ul').forEach(el => {
      el.classList.add('list-disc', 'pl-5', 'mb-2');
    });
    
    // Style personal info classes
    doc.querySelectorAll('.email').forEach(el => {
      el.classList.add('text-blue-600');
    });
    
    doc.querySelectorAll('.phone').forEach(el => {
      el.classList.add('text-blue-600');
    });
    
    doc.querySelectorAll('.address').forEach(el => {
      el.classList.add('text-gray-600');
    });
    
    doc.querySelectorAll('.linkedin').forEach(el => {
      el.classList.add('text-blue-600');
    });
    
    doc.querySelectorAll('.link').forEach(el => {
      el.classList.add('text-blue-600');
    });
    
    return doc.body.innerHTML;
  } catch (error) {
    console.error('Error applying default styling with DOM:', error);
    
    // Fallback to regex-based approach if DOM manipulation fails
    let styledHtml = html
      .replace(/<h1[^>]*>/g, '<h1 class="text-2xl font-bold text-gray-800 mb-1">')
      .replace(/<h2[^>]*>/g, '<h2 class="text-xl font-semibold text-gray-700 mb-2 mt-4 uppercase border-b pb-1">')
      .replace(/<h3[^>]*>/g, '<h3 class="text-lg font-medium text-gray-700 mb-1">')
      .replace(/<section[^>]*>/g, '<section class="mb-4 pb-2">')
      .replace(/<section[^>]*id="resume-header"[^>]*>/g, '<section id="resume-header" class="mb-6 text-center">')
      .replace(/<section[^>]*id="resume-summary"[^>]*>/g, '<section id="resume-summary" class="mb-6 bg-gray-50 p-3 rounded">')
      .replace(/<section[^>]*id="resume-skills"[^>]*>/g, '<section id="resume-skills" class="mb-6">')
      .replace(/<ul[^>]*>/g, '<ul class="list-disc pl-5 mb-2">')
      .replace(/<span class="email"[^>]*>/g, '<span class="email">')
      .replace(/<span class="phone"[^>]*>/g, '<span class="phone">')
      .replace(/<span class="address"[^>]*>/g, '<span class="address">')
      .replace(/<span class="linkedin"[^>]*>/g, '<span class="linkedin">')
      .replace(/<span class="link"[^>]*>/g, '<span class="link">');
    
    return styledHtml;
  }
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
    
    // Fallback to manual string replacement if DOM processing fails
    try {
      // Process the content to ensure proper HTML
      let processedHtml = processAIResponse(optimizedText);
      
      // Remove section-title class from all sections
      processedHtml = processedHtml.replace(
        /<section([^>]*)class="([^"]*)section-title([^"]*)"([^>]*)>/g, 
        '<section$1class="$2$3"$4>'
      );
      
      // Add section-title class to all h1 and h2 elements inside sections
      processedHtml = processedHtml.replace(
        /(<section[^>]*>[\s\S]*?)(<h([12])[^>]*)(class="([^"]*)")?([^>]*>)/g,
        (match, before, tagStart, level, classAttr, classes, tagEnd) => {
          if (classAttr) {
            if (!classes.includes('section-title')) {
              return `${before}${tagStart}class="${classes} section-title"${tagEnd}`;
            }
            return match;
          } else {
            return `${before}${tagStart} class="section-title"${tagEnd}`;
          }
        }
      );
      
      // Process header section for name
      processedHtml = processedHtml.replace(
        /(<section[^>]*id="resume-header"[^>]*>[\s\S]*?)(<h1[^>]*)(class="([^"]*)")?([^>]*>)/g,
        (match, before, tagStart, classAttr, classes, tagEnd) => {
          if (classAttr) {
            if (!classes.includes('name')) {
              return `${before}${tagStart}class="${classes} name"${tagEnd}`;
            }
            return match;
          } else {
            return `${before}${tagStart} class="name"${tagEnd}`;
          }
        }
      );
      
      // Process Portfolio text
      processedHtml = processedHtml.replace(
        /(Portfolio\s*[:;]\s*[^<|/\n]+)/gi,
        '<span class="link">$1</span>'
      );
      
      // Apply default styling
      const styledHtml = applyDefaultStyling(processedHtml);
      
      return styledHtml;
    } catch (fallbackError) {
      console.error('Fallback processing also failed:', fallbackError);
      return optimizedText; // Return original input as last resort
    }
  }
}