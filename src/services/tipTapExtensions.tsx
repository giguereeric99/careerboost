/**
 * TipTap Custom Extensions (Simplified)
 * 
 * This file contains essential TipTap extensions used in the resume editor:
 * - SectionNode: Preserves section IDs for template application
 * - FontSize: Custom extension for controlling font size
 * 
 * Removed draggable functionality for a more rigid structure.
 */

import { Extension } from '@tiptap/core';

/**
 * Custom extension for preserving section IDs on headings and paragraphs
 * This is essential for template application
 */
export const SectionNode = Extension.create({
  name: 'section',
  
  // Add section tag to the whitelist
  addGlobalAttributes() {
    return [
      {
        types: ['heading', 'paragraph'],
        attributes: {
          sectionId: {
            default: null,
            parseHTML: element => element.closest('section')?.getAttribute('id') || null,
            renderHTML: attributes => {
              if (!attributes.sectionId) {
                return {};
              }
              
              return {
                'data-section-id': attributes.sectionId
              };
            }
          }
        }
      }
    ];
  },
});

/**
 * Custom extension for font size
 */
export const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
    }
  },
});

/**
 * Pre-defined sections for a resume
 * Used for reference only, since we removed section addition functionality
 */
export const resumeSections = [
  { id: 'resume-header', label: 'Header (Name & Contact)' },
  { id: 'resume-summary', label: 'Professional Summary' },
  { id: 'resume-experience', label: 'Experience' },
  { id: 'resume-education', label: 'Education' },
  { id: 'resume-skills', label: 'Skills' },
  { id: 'resume-languages', label: 'Languages' },
  { id: 'resume-certifications', label: 'Certifications' },
  { id: 'resume-projects', label: 'Projects' },
  { id: 'resume-interests', label: 'Interests' },
  { id: 'resume-references', label: 'References' },
];