/**
 * Editor Utility Functions
 * 
 * Helper functions for working with the TipTap editor content:
 * - Processing and applying suggestions
 * - Managing keywords
 * - Ensuring content is properly formatted for preview
 */
import { Editor } from '@tiptap/react';

/**
 * Type definitions for suggestion objects
 */
export interface Suggestion {
  text: string;
  type: string;
  impact?: string;
  isApplied?: boolean;
}

/**
 * Helper to insert a keyword at the current cursor position
 * 
 * @param editor - The TipTap editor instance
 * @param keyword - The keyword to insert
 * @param onApplyKeyword - Optional callback for when a keyword is applied
 */
export const insertKeyword = (
  editor: Editor | null, 
  keyword: string,
  onApplyKeyword?: (keyword: string) => void
) => {
  if (!editor) return;
  
  // Insert the keyword with styling
  editor
    .chain()
    .focus()
    .insertContent(`<span class="editor-keyword">${keyword}</span>`)
    .run();
  
  // Call the callback if provided
  if (onApplyKeyword) {
    onApplyKeyword(keyword);
  }
};

/**
 * Apply a suggestion to the editor content
 * 
 * @param editor - The TipTap editor instance
 * @param suggestion - The suggestion to apply
 * @param onApplySuggestion - Optional callback for when a suggestion is applied
 */
export const applySuggestion = (
  editor: Editor | null,
  suggestion: Suggestion,
  onApplySuggestion?: (suggestion: Suggestion) => void
) => {
  if (!editor) return;
  
  // Different handling based on suggestion type
  switch (suggestion.type) {
    case 'structure':
      // Structure suggestions might rearrange sections
      // Just insert the suggestion text as a guideline for now
      editor.chain().focus().insertContent(`
        <p class="editor-suggestion">Structure suggestion: ${suggestion.text}</p>
      `).run();
      break;
      
    case 'content':
      // Content suggestions typically add or improve text
      editor.chain().focus().insertContent(`
        <span class="editor-suggestion">${suggestion.text}</span>
      `).run();
      break;
      
    case 'skills':
      // Try to find the skills section and append
      const dom = editor.view.dom;
      const skillsSection = dom.querySelector('section[id="resume-skills"], [data-section-id="resume-skills"]');
      
      if (skillsSection) {
        // Try to focus at the end of the skills section
        const pos = editor.state.doc.resolve(
          editor.state.doc.nodeSize - 2
        );
        editor.chain().setTextSelection(pos).run();
        editor.chain().focus().insertContent(`<span class="editor-suggestion">${suggestion.text}</span>`).run();
      } else {
        // Just insert at current position
        editor.chain().focus().insertContent(`<span class="editor-suggestion">${suggestion.text}</span>`).run();
      }
      break;
      
    case 'language':
      // Language suggestions are about grammar and phrasing
      // Insert as highlighted text
      editor.chain().focus().insertContent(`
        <span class="editor-suggestion">${suggestion.text}</span>
      `).run();
      break;
      
    default:
      // Default behavior: insert at cursor
      editor.chain().focus().insertContent(`
        <span class="editor-suggestion">${suggestion.text}</span>
      `).run();
  }

  // Call the callback if provided
  if (onApplySuggestion) {
    onApplySuggestion(suggestion);
  }
};

/**
 * Prepare editor content for preview
 * Makes sure all HTML is properly formatted with correct section IDs
 * 
 * @param editor - The TipTap editor instance
 * @returns Clean HTML ready for preview
 */
export const prepareContentForPreview = (editor: Editor | null): string => {
  if (!editor) return '';
  
  // Get the HTML content from the editor
  let html = editor.getHTML();
  
  // Ensure all section-title elements preserve their IDs
  // This is important for templates that rely on section IDs
  html = html.replace(
    /<h([12]) class="section-title" data-section="([^"]+)"([^>]*)>/g, 
    '<h$1 class="section-title" id="$2" data-section="$2"$3>'
  );
  
  // Clean up any editor-specific classes or attributes that shouldn't be in the preview
  html = html.replace(/\s+data-drag-handle="true"/g, '');
  html = html.replace(/\s+draggable="true"/g, '');
  
  // Make sure structure suggestions don't appear in the preview
  html = html.replace(/<p class="editor-suggestion">.*?<\/p>/g, '');
  
  // Convert applied suggestions to normal text
  html = html.replace(/<span class="editor-suggestion">(.*?)<\/span>/g, '$1');
  
  // Make keywords stand out but not look like editor controls
  html = html.replace(
    /<span class="editor-keyword">(.*?)<\/span>/g, 
    '<span style="color: #3498db; font-weight: bold;">$1</span>'
  );
  
  return html;
};

/**
 * Wrap elements in sections for proper template rendering
 * Used when preparing content for final export
 * 
 * @param html - The HTML content from the editor
 * @returns HTML with proper section wrappers
 */
export const wrapElementsInSections = (html: string): string => {
  // Parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Find all section title headings
  const sectionHeadings = doc.querySelectorAll('.section-title, [id^="resume-"]');
  const result: Element[] = [];
  
  // Process each section
  sectionHeadings.forEach((heading, index) => {
    // Get the section ID from the heading
    const sectionId = heading.id || heading.getAttribute('data-section') || `section-${index}`;
    
    // Create a section element
    const section = doc.createElement('section');
    section.id = sectionId;
    
    // Add the heading to the section
    section.appendChild(heading.cloneNode(true));
    
    // Add all following elements until the next section heading
    let current = heading.nextElementSibling;
    while (current && 
           !current.classList.contains('section-title') && 
           !current.id?.startsWith('resume-')) {
      section.appendChild(current.cloneNode(true));
      current = current.nextElementSibling;
    }
    
    // Add the section to the result
    result.push(section);
  });
  
  // Create a container for the result
  const container = doc.createElement('div');
  result.forEach(section => container.appendChild(section));
  
  return container.innerHTML;
};