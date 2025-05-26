/**
 * TipTap Custom Extensions - Complete Resume Sections
 *
 * This file contains essential TipTap extensions used in the resume editor:
 * - SectionNode: Preserves section IDs for template application
 * - FontSize: Custom extension for controlling font size
 * - Complete list of all resume sections for reference and validation
 *
 * These extensions ensure proper structure and formatting for resume content
 * while maintaining compatibility with various resume templates.
 */

import { Extension, RawCommands } from "@tiptap/core";

/**
 * Custom extension for preserving section IDs on headings and paragraphs
 * This is essential for template application and section identification
 *
 * When content is parsed and rendered, this extension ensures that:
 * - Section IDs are preserved during editing
 * - Template styling can be properly applied
 * - Section-specific functionality works correctly
 */
export const SectionNode = Extension.create({
  name: "section",

  // Add section tag to the whitelist and preserve section IDs
  addGlobalAttributes() {
    return [
      {
        // Apply to headings and paragraphs within sections
        types: ["heading", "paragraph"],
        attributes: {
          sectionId: {
            default: null,
            // Parse section ID from the closest section element
            parseHTML: (element) =>
              element.closest("section")?.getAttribute("id") || null,
            // Render section ID as a data attribute for CSS targeting
            renderHTML: (attributes) => {
              if (!attributes.sectionId) {
                return {};
              }

              return {
                "data-section-id": attributes.sectionId,
              };
            },
          },
        },
      },
    ];
  },
});

/**
 * Custom extension for font size control
 * Allows dynamic font size changes within the editor
 *
 * This extension provides:
 * - Font size parsing from existing HTML
 * - Font size rendering with inline styles
 * - Command for programmatically setting font sizes
 */
export const FontSize = Extension.create({
  name: "fontSize",

  // Add font size as a global attribute for text styling
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            // Parse font size from element's inline style
            parseHTML: (element) => element.style.fontSize || null,
            // Render font size as inline CSS style
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  // Add commands for font size manipulation
  addCommands() {
    return {
      /**
       * Set font size command
       * @param fontSize - CSS font size value (e.g., '16px', '1.2em', '120%')
       * @returns Command chain for TipTap
       */
      setFontSize:
        (fontSize: string) =>
        ({ chain }: { chain: any }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
    } as Partial<RawCommands>;
  },
});

/**
 * Complete list of resume sections with their IDs and labels
 * This comprehensive list includes all standard resume sections
 *
 * Each section includes:
 * - id: Unique identifier used in HTML and database
 * - label: Human-readable name for UI display
 * - description: Brief explanation of section purpose
 * - required: Whether this section is typically required in a resume
 */
export const resumeSections = [
  {
    id: "resume-header",
    label: "Personal Information",
    description: "Name, contact details, and basic information",
    required: true,
  },
  {
    id: "resume-summary",
    label: "Professional Summary",
    description: "Brief overview of professional background and goals",
    required: true,
  },
  {
    id: "resume-experience",
    label: "Experience",
    description: "Work history and professional accomplishments",
    required: true,
  },
  {
    id: "resume-education",
    label: "Education",
    description: "Educational background, degrees, and academic achievements",
    required: true,
  },
  {
    id: "resume-skills",
    label: "Skills & Interests",
    description: "Technical skills, soft skills, and professional interests",
    required: true,
  },
  {
    id: "resume-languages",
    label: "Languages",
    description: "Languages spoken and proficiency levels",
    required: false,
  },
  {
    id: "resume-certifications",
    label: "Certifications",
    description: "Professional certifications and credentials",
    required: false,
  },
  {
    id: "resume-projects",
    label: "Projects",
    description: "Notable projects and their outcomes",
    required: false,
  },
  {
    id: "resume-awards",
    label: "Awards & Achievements",
    description: "Recognition, honors, and significant accomplishments",
    required: false,
  },
  {
    id: "resume-references",
    label: "References",
    description: "Professional references and recommendations",
    required: false,
  },
  {
    id: "resume-publications",
    label: "Publications",
    description: "Published works, articles, and research papers",
    required: false,
  },
  {
    id: "resume-volunteering",
    label: "Volunteering",
    description: "Volunteer work and community involvement",
    required: false,
  },
  {
    id: "resume-additional",
    label: "Additional Information",
    description: "Any other relevant information not covered in other sections",
    required: false,
  },
  {
    id: "resume-interests",
    label: "Interests",
    description: "Personal interests and hobbies",
    required: false,
  },
];

/**
 * Utility function to get section information by ID
 * @param sectionId - The ID of the section to find
 * @returns Section object or undefined if not found
 */
export const getSectionById = (sectionId: string) => {
  return resumeSections.find((section) => section.id === sectionId);
};

/**
 * Utility function to get all required sections
 * @returns Array of required resume sections
 */
export const getRequiredSections = () => {
  return resumeSections.filter((section) => section.required);
};

/**
 * Utility function to get all optional sections
 * @returns Array of optional resume sections
 */
export const getOptionalSections = () => {
  return resumeSections.filter((section) => !section.required);
};

/**
 * Utility function to validate if a section ID is valid
 * @param sectionId - The section ID to validate
 * @returns Boolean indicating if the section ID exists
 */
export const isValidSectionId = (sectionId: string): boolean => {
  return resumeSections.some((section) => section.id === sectionId);
};

/**
 * Utility function to get section label by ID
 * @param sectionId - The ID of the section
 * @returns Section label or the ID itself if not found
 */
export const getSectionLabel = (sectionId: string): string => {
  const section = getSectionById(sectionId);
  return section ? section.label : sectionId;
};

/**
 * Section order configuration for consistent display
 * This array defines the recommended order for displaying resume sections
 * Used by parsing and rendering functions to maintain consistent structure
 */
export const sectionDisplayOrder = [
  "resume-header",
  "resume-summary",
  "resume-experience",
  "resume-education",
  "resume-skills",
  "resume-languages",
  "resume-certifications",
  "resume-projects",
  "resume-awards",
  "resume-volunteering",
  "resume-publications",
  "resume-interests",
  "resume-references",
  "resume-additional",
];

/**
 * Section categories for grouping and organization
 * Helps organize sections into logical groups for better UX
 */
export const sectionCategories = {
  essential: [
    "resume-header",
    "resume-summary",
    "resume-experience",
    "resume-education",
    "resume-skills",
  ],
  professional: [
    "resume-certifications",
    "resume-projects",
    "resume-awards",
    "resume-publications",
  ],
  personal: ["resume-languages", "resume-interests", "resume-volunteering"],
  contact: ["resume-references", "resume-additional"],
};

/**
 * Default placeholders for each section type
 * Used when creating new sections or providing guidance to users
 */
export const sectionPlaceholders = {
  "resume-header": "Your Name\nJob Title\nEmail | Phone | Location",
  "resume-summary":
    "Professional summary highlighting your experience, skills, and career goals.",
  "resume-experience":
    "• Position at Company Name (20XX - Present)\n• Achieved X by implementing Y, resulting in Z.\n• Led a team of X people to accomplish Y goal.",
  "resume-education":
    "• Degree in Field of Study, Institution Name (20XX - 20XX)\n• GPA: X.X/4.0 (if applicable)\n• Relevant coursework: Course 1, Course 2",
  "resume-skills":
    "• Technical: Skill 1, Skill 2, Skill 3\n• Soft Skills: Communication, Teamwork, Problem-solving",
  "resume-languages":
    "• Language 1 (Fluent)\n• Language 2 (Intermediate)\n• Language 3 (Basic)",
  "resume-certifications":
    "• Certification Name, Issuing Organization (Year)\n• Certification Name, Issuing Organization (Year)",
  "resume-projects":
    "• Project Name: Brief description and outcomes\n• Project Name: Brief description and outcomes",
  "resume-awards":
    "• Award Name, Issuing Organization (Year)\n• Recognition, Issuer (Year)",
  "resume-volunteering":
    "• Volunteer Role, Organization (Period)\n• Key contributions or responsibilities",
  "resume-publications":
    "• Publication Title, Journal/Publisher, Date\n• Authors, Publication Title, Journal/Publisher, Date",
  "resume-interests": "• Interest 1\n• Interest 2\n• Interest 3",
  "resume-references":
    "• Reference Name, Position, Company\n• Email, Phone\n\nOR\n\nReferences available upon request",
  "resume-additional":
    "Additional relevant information such as workshops, conferences, or other qualifications.",
};

/**
 * Export all sections data for external use
 * This makes it easy to import everything needed for section management
 */
export default {
  resumeSections,
  getSectionById,
  getRequiredSections,
  getOptionalSections,
  isValidSectionId,
  getSectionLabel,
  sectionDisplayOrder,
  sectionCategories,
  sectionPlaceholders,
};
