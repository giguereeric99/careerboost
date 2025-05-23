/**
 * Resume templates definition
 * Contains all templates available in the application
 * References styles and structures from separate constants files
 *
 * REFACTORED VERSION - Compatible with new standardized header structure
 * Uses the new placeholder system from templateStructures.ts and smart separator handling
 * All template functions now use generateStandardizedHeader for universal compatibility
 */
import {
  ResumeTemplateType,
  TemplateContentSections,
  HeaderInfo,
} from "../types/resumeTemplateTypes";
import { STANDARD_SECTIONS } from "./sections";
import {
  basicStyles,
  professionalStyles,
  creativeStyles,
  executiveStyles,
  technicalStyles,
  compactStyles,
} from "./templateStyles";
import {
  basicTemplate,
  professionalTemplate,
  creativeTemplate,
  executiveTemplate,
  technicalTemplate,
  compactTemplate,
} from "./templateStructures";
import {
  extractHeaderInfo,
  generateStandardizedHeader,
  createHeaderPlaceholderObject,
  isValidContact,
  applyTemplateToContent,
} from "../utils/templateUtils";

/**
 * Checks if a contact info string contains any of the specified items
 * Legacy function kept for backward compatibility
 *
 * @param text - Text to analyze
 * @param items - Array of items to check for
 * @returns True if text contains any of the items
 */
function containsAny(text: string, items: string[]): boolean {
  const lowerText = text.toLowerCase();
  return items.some((item) => lowerText.includes(item.toLowerCase()));
}

/**
 * Custom apply function for the basic template
 * Uses the new standardized header structure with smart placeholder replacement
 * Compatible with the new templateStructures.ts format
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with proper placeholder replacement
 */
function applyBasicTemplate(sections: TemplateContentSections): string {
  console.log("Applying basic template with new placeholder system");

  // Start with the basic template structure
  let result = basicTemplate;

  // Handle header section with new placeholder system
  if (sections["resume-header"]) {
    console.log(
      "Processing resume header section with placeholder replacement"
    );

    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Create placeholder object for individual field replacement
    const headerPlaceholders = createHeaderPlaceholderObject(headerInfo);

    // Replace individual header placeholders in the template
    Object.entries(headerPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
        console.log(`Replaced ${placeholder} with: ${value}`);
      }
    });

    // Clean up any remaining header placeholders (for missing fields)
    const remainingHeaderPlaceholders = result.match(
      /\{\{resume-header\.[^}]+\}\}/g
    );
    if (remainingHeaderPlaceholders) {
      remainingHeaderPlaceholders.forEach((placeholder) => {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          ""
        );
        console.log(`Removed unused placeholder: ${placeholder}`);
      });
    }

    // Smart separator cleanup - remove trailing separators and empty spans
    result = result.replace(/\s*\|\s*<\/p>/g, "</p>"); // Remove trailing separators
    result = result.replace(/<span class="[^"]*"><\/span>\s*\|?\s*/g, ""); // Remove empty spans
    result = result.replace(/\|\s*\|/g, "|"); // Remove double separators
    result = result.replace(/\s+\|$/gm, ""); // Remove trailing separators at end of lines
  } else {
    // Default header if none provided
    console.log("No header section found, using default basic header");
    const defaultHeaderInfo: HeaderInfo = {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: null,
      portfolio: null,
      address: "City, Country",
      title: null,
    };

    const defaultPlaceholders =
      createHeaderPlaceholderObject(defaultHeaderInfo);
    Object.entries(defaultPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value
      );
    });
  }

  // Replace other section placeholders
  Object.entries(sections).forEach(([sectionId, content]) => {
    if (sectionId !== "resume-header") {
      const placeholder = `{{${sectionId}}}`;
      if (result.includes(placeholder)) {
        console.log(`Replacing placeholder: ${placeholder}`);
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          content || ""
        );
      }
    }
  });

  // Clean up any remaining section placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    console.log(
      `Found ${remainingPlaceholders.length} remaining placeholders to clear`
    );
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  return result;
}

/**
 * Custom apply function for professional template
 * Uses the new standardized header structure with professional styling
 * Icons and professional styling are handled by CSS, not HTML structure
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with professional template applied
 */
function applyProfessionalTemplate(sections: TemplateContentSections): string {
  console.log("Applying professional template with new placeholder system");

  // Start with the professional template structure
  let result = professionalTemplate;

  // Handle header section with new placeholder system
  if (sections["resume-header"]) {
    console.log("Processing professional header with placeholder replacement");

    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Create placeholder object for individual field replacement
    const headerPlaceholders = createHeaderPlaceholderObject(headerInfo);

    // Replace individual header placeholders in the template
    Object.entries(headerPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
        console.log(`Replaced professional ${placeholder} with: ${value}`);
      }
    });

    // Clean up any remaining header placeholders
    const remainingHeaderPlaceholders = result.match(
      /\{\{resume-header\.[^}]+\}\}/g
    );
    if (remainingHeaderPlaceholders) {
      remainingHeaderPlaceholders.forEach((placeholder) => {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          ""
        );
      });
    }

    // Smart separator cleanup for professional template
    result = result.replace(/\s*\|\s*<\/p>/g, "</p>");
    result = result.replace(/<span class="[^"]*"><\/span>\s*\|?\s*/g, "");
    result = result.replace(/\|\s*\|/g, "|");
    result = result.replace(/\s+\|$/gm, "");
  } else {
    // Default professional header
    console.log("No header section found, using default professional header");
    const defaultHeaderInfo: HeaderInfo = {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: "linkedin.com/in/username",
      portfolio: null,
      address: "City, Country",
      title: "Professional Title",
    };

    const defaultPlaceholders =
      createHeaderPlaceholderObject(defaultHeaderInfo);
    Object.entries(defaultPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value
      );
    });
  }

  // Replace other section placeholders
  Object.entries(sections).forEach(([sectionId, content]) => {
    if (sectionId !== "resume-header") {
      const placeholder = `{{${sectionId}}}`;
      if (result.includes(placeholder)) {
        console.log(`Replacing professional section: ${placeholder}`);
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          content || ""
        );
      }
    }
  });

  // Clean up remaining placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  return result;
}

/**
 * Custom apply function for creative template
 * Uses the new standardized header structure with creative styling
 * Creative elements and styling are handled by CSS
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with creative template applied
 */
function applyCreativeTemplate(sections: TemplateContentSections): string {
  console.log("Applying creative template with new placeholder system");

  // Start with the creative template structure
  let result = creativeTemplate;

  // Handle header section with new placeholder system
  if (sections["resume-header"]) {
    console.log("Processing creative header with placeholder replacement");

    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Create placeholder object for individual field replacement
    const headerPlaceholders = createHeaderPlaceholderObject(headerInfo);

    // Replace individual header placeholders in the template
    Object.entries(headerPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
        console.log(`Replaced creative ${placeholder} with: ${value}`);
      }
    });

    // Clean up any remaining header placeholders
    const remainingHeaderPlaceholders = result.match(
      /\{\{resume-header\.[^}]+\}\}/g
    );
    if (remainingHeaderPlaceholders) {
      remainingHeaderPlaceholders.forEach((placeholder) => {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          ""
        );
      });
    }

    // Smart separator cleanup for creative template
    result = result.replace(/\s*\|\s*<\/p>/g, "</p>");
    result = result.replace(/<span class="[^"]*"><\/span>\s*\|?\s*/g, "");
    result = result.replace(/\|\s*\|/g, "|");
    result = result.replace(/\s+\|$/gm, "");
  } else {
    // Default creative header
    console.log("No header section found, using default creative header");
    const defaultHeaderInfo: HeaderInfo = {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: "linkedin.com/in/username",
      portfolio: "portfolio.com",
      address: "City, Country",
      title: "Creative Professional",
    };

    const defaultPlaceholders =
      createHeaderPlaceholderObject(defaultHeaderInfo);
    Object.entries(defaultPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value
      );
    });
  }

  // Replace other section placeholders
  Object.entries(sections).forEach(([sectionId, content]) => {
    if (sectionId !== "resume-header") {
      const placeholder = `{{${sectionId}}}`;
      if (result.includes(placeholder)) {
        console.log(`Replacing creative section: ${placeholder}`);
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          content || ""
        );
      }
    }
  });

  // Clean up remaining placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  return result;
}

/**
 * Custom apply function for the executive template
 * Uses the new standardized header structure with executive styling
 * Executive styling and sophistication are handled by CSS
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with executive template applied
 */
function applyExecutiveTemplate(sections: TemplateContentSections): string {
  console.log("Applying executive template with new placeholder system");

  // Start with the executive template structure
  let result = executiveTemplate;

  // Handle header section with new placeholder system
  if (sections["resume-header"]) {
    console.log("Processing executive header with placeholder replacement");

    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Create placeholder object for individual field replacement
    const headerPlaceholders = createHeaderPlaceholderObject(headerInfo);

    // Replace individual header placeholders in the template
    Object.entries(headerPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
        console.log(`Replaced executive ${placeholder} with: ${value}`);
      }
    });

    // Clean up any remaining header placeholders
    const remainingHeaderPlaceholders = result.match(
      /\{\{resume-header\.[^}]+\}\}/g
    );
    if (remainingHeaderPlaceholders) {
      remainingHeaderPlaceholders.forEach((placeholder) => {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          ""
        );
      });
    }

    // Smart separator cleanup for executive template
    result = result.replace(/\s*\|\s*<\/p>/g, "</p>");
    result = result.replace(/<span class="[^"]*"><\/span>\s*\|?\s*/g, "");
    result = result.replace(/\|\s*\|/g, "|");
    result = result.replace(/\s+\|$/gm, "");
  } else {
    // Default executive header
    console.log("No header section found, using default executive header");
    const defaultHeaderInfo: HeaderInfo = {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: "linkedin.com/in/username",
      portfolio: null,
      address: "City, Country",
      title: "Executive Director",
    };

    const defaultPlaceholders =
      createHeaderPlaceholderObject(defaultHeaderInfo);
    Object.entries(defaultPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value
      );
    });
  }

  // Replace other section placeholders
  Object.entries(sections).forEach(([sectionId, content]) => {
    if (sectionId !== "resume-header") {
      const placeholder = `{{${sectionId}}}`;
      if (result.includes(placeholder)) {
        console.log(`Replacing executive section: ${placeholder}`);
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          content || ""
        );
      }
    }
  });

  // Clean up remaining placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  return result;
}

/**
 * Custom apply function for the technical template
 * Uses the new standardized header structure with technical styling
 * Technical elements and code-like styling are handled by CSS
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with technical template applied
 */
function applyTechnicalTemplate(sections: TemplateContentSections): string {
  console.log("Applying technical template with new placeholder system");

  // Start with the technical template structure
  let result = technicalTemplate;

  // Handle header section with new placeholder system
  if (sections["resume-header"]) {
    console.log("Processing technical header with placeholder replacement");

    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Create placeholder object for individual field replacement
    const headerPlaceholders = createHeaderPlaceholderObject(headerInfo);

    // Replace individual header placeholders in the template
    Object.entries(headerPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
        console.log(`Replaced technical ${placeholder} with: ${value}`);
      }
    });

    // Clean up any remaining header placeholders
    const remainingHeaderPlaceholders = result.match(
      /\{\{resume-header\.[^}]+\}\}/g
    );
    if (remainingHeaderPlaceholders) {
      remainingHeaderPlaceholders.forEach((placeholder) => {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          ""
        );
      });
    }

    // Smart separator cleanup for technical template
    result = result.replace(/\s*\|\s*<\/p>/g, "</p>");
    result = result.replace(/<span class="[^"]*"><\/span>\s*\|?\s*/g, "");
    result = result.replace(/\|\s*\|/g, "|");
    result = result.replace(/\s+\|$/gm, "");
  } else {
    // Default technical header
    console.log("No header section found, using default technical header");
    const defaultHeaderInfo: HeaderInfo = {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: "github.com/username",
      portfolio: "portfolio.dev",
      address: "City, Country",
      title: "Software Engineer",
    };

    const defaultPlaceholders =
      createHeaderPlaceholderObject(defaultHeaderInfo);
    Object.entries(defaultPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value
      );
    });
  }

  // Replace other section placeholders
  Object.entries(sections).forEach(([sectionId, content]) => {
    if (sectionId !== "resume-header") {
      const placeholder = `{{${sectionId}}}`;
      if (result.includes(placeholder)) {
        console.log(`Replacing technical section: ${placeholder}`);
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          content || ""
        );
      }
    }
  });

  // Clean up remaining placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  return result;
}

/**
 * Custom apply function for the compact template
 * Uses the new standardized header structure with space-efficient styling
 * Compact layout and space optimization are handled by CSS
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with compact template applied
 */
function applyCompactTemplate(sections: TemplateContentSections): string {
  console.log("Applying compact template with new placeholder system");

  // Start with the compact template structure
  let result = compactTemplate;

  // Handle header section with new placeholder system
  if (sections["resume-header"]) {
    console.log("Processing compact header with placeholder replacement");

    // Extract structured information from header
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Create placeholder object for individual field replacement
    const headerPlaceholders = createHeaderPlaceholderObject(headerInfo);

    // Replace individual header placeholders in the template
    Object.entries(headerPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      if (result.includes(placeholder)) {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          value
        );
        console.log(`Replaced compact ${placeholder} with: ${value}`);
      }
    });

    // Clean up any remaining header placeholders
    const remainingHeaderPlaceholders = result.match(
      /\{\{resume-header\.[^}]+\}\}/g
    );
    if (remainingHeaderPlaceholders) {
      remainingHeaderPlaceholders.forEach((placeholder) => {
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          ""
        );
      });
    }

    // Smart separator cleanup for compact template
    result = result.replace(/\s*\|\s*<\/p>/g, "</p>");
    result = result.replace(/<span class="[^"]*"><\/span>\s*\|?\s*/g, "");
    result = result.replace(/\|\s*\|/g, "|");
    result = result.replace(/\s+\|$/gm, "");
  } else {
    // Default compact header
    console.log("No header section found, using default compact header");
    const defaultHeaderInfo: HeaderInfo = {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: "linkedin.com/in/username",
      portfolio: null,
      address: "City, Country",
      title: "Professional",
    };

    const defaultPlaceholders =
      createHeaderPlaceholderObject(defaultHeaderInfo);
    Object.entries(defaultPlaceholders).forEach(([field, value]) => {
      const placeholder = `{{resume-header.${field}}}`;
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        value
      );
    });
  }

  // Replace other section placeholders
  Object.entries(sections).forEach(([sectionId, content]) => {
    if (sectionId !== "resume-header") {
      const placeholder = `{{${sectionId}}}`;
      if (result.includes(placeholder)) {
        console.log(`Replacing compact section: ${placeholder}`);
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          content || ""
        );
      }
    }
  });

  // Clean up remaining placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  return result;
}

// Define all resume templates with their properties
// Enhanced with new standardized header structure and placeholder system
export const resumeTemplates: ResumeTemplateType[] = [
  {
    id: "basic",
    name: "Basic",
    isPro: false,
    previewClass: "border-l-4 border-brand-600",
    description: "Simple and clean layout suitable for most job applications",
    styles: basicStyles,
    template: basicTemplate,
    applyTemplate: applyBasicTemplate, // Now uses new placeholder system with smart separator handling
  },
  {
    id: "professional",
    name: "Professional",
    isPro: true,
    previewClass: "border-t-4 border-teal-600",
    description: "Elegant design with modern styling for corporate positions",
    styles: professionalStyles,
    template: professionalTemplate,
    applyTemplate: applyProfessionalTemplate, // Now uses new placeholder system with smart separator handling
  },
  {
    id: "creative",
    name: "Creative",
    isPro: true,
    previewClass: "bg-gradient-to-r from-brand-100 to-teal-100 border-none",
    description: "Unique layout for design and creative industry positions",
    styles: creativeStyles,
    template: creativeTemplate,
    applyTemplate: applyCreativeTemplate, // Now uses new placeholder system with smart separator handling
  },
  {
    id: "executive",
    name: "Executive",
    isPro: true,
    previewClass: "border-2 border-gray-800",
    description: "Sophisticated design for executive and leadership roles",
    styles: executiveStyles,
    template: executiveTemplate,
    applyTemplate: applyExecutiveTemplate, // Now uses new placeholder system with smart separator handling
  },
  {
    id: "technical",
    name: "Technical",
    isPro: true,
    previewClass: "border-l-4 border-r-4 border-blue-500",
    description:
      "Specialized layout highlighting technical skills and projects",
    styles: technicalStyles,
    template: technicalTemplate,
    applyTemplate: applyTechnicalTemplate, // Now uses new placeholder system with smart separator handling
  },
  {
    id: "compact",
    name: "Compact",
    isPro: true,
    previewClass: "border-b-4 border-amber-500",
    description:
      "Space-efficient design that fits more content on a single page",
    styles: compactStyles,
    template: compactTemplate,
    applyTemplate: applyCompactTemplate, // Now uses new placeholder system with smart separator handling
  },
];

/**
 * Get a template by ID
 * Returns the template object or the basic template if not found
 *
 * @param id - Template ID to retrieve
 * @returns The template object or the basic template if not found
 */
export function getTemplateById(id: string): ResumeTemplateType {
  return (
    resumeTemplates.find((template) => template.id === id) || resumeTemplates[0]
  );
}

/**
 * Utility function to validate that all templates use the new placeholder system
 * Tests each template with sample data to ensure proper placeholder replacement
 * and separator handling
 *
 * @returns Validation results for all templates
 */
export function validateAllTemplatesStandardization(): {
  templateId: string;
  usesNewPlaceholderSystem: boolean;
  hasProperSeparatorHandling: boolean;
  issues: string[];
}[] {
  console.log("Validating new placeholder system across all templates");

  const results = resumeTemplates.map((template) => {
    // Create sample sections with header content
    const sampleSections: TemplateContentSections = {
      "resume-header": `
        <section id="resume-header">
          <h1 class="section-title name">Test Name</h1>
          <p class="title">Test Title</p>
          <p>
            <span class="phone">123-456-7890</span> |
            <span class="email">test@email.com</span> |
            <span class="linkedin">linkedin.com/in/test</span>
          </p>
          <p><span class="address">Test Address</span></p>
        </section>
      `,
      "resume-summary": "<p>Test summary content</p>",
    };

    try {
      const result = template.applyTemplate?.(sampleSections) || "";

      // Check for new placeholder system usage
      const hasNewPlaceholders =
        !result.includes("{{resume-header.") &&
        !result.includes("{{resume-summary}}");

      // Check for proper separator handling
      const hasTrailingSeparators =
        result.includes("|</p>") ||
        result.includes("| </p>") ||
        result.match(/\|\s*$/m);

      // Check for empty spans
      const hasEmptySpans =
        result.includes('<span class="phone"></span>') ||
        result.includes('<span class="email"></span>') ||
        result.includes('<span class="linkedin"></span>') ||
        result.includes('<span class="portfolio"></span>');

      const issues: string[] = [];
      if (!hasNewPlaceholders)
        issues.push("Still contains unprocessed placeholders");
      if (hasTrailingSeparators) issues.push("Contains trailing separators");
      if (hasEmptySpans) issues.push("Contains empty spans");
      if (!result.includes('class="section-title name"'))
        issues.push("Missing standardized name class");

      return {
        templateId: template.id,
        usesNewPlaceholderSystem: hasNewPlaceholders,
        hasProperSeparatorHandling: !hasTrailingSeparators && !hasEmptySpans,
        issues,
      };
    } catch (error) {
      return {
        templateId: template.id,
        usesNewPlaceholderSystem: false,
        hasProperSeparatorHandling: false,
        issues: [`Error applying template: ${error}`],
      };
    }
  });

  console.log("Template validation completed:", results);
  return results;
}

/**
 * Test function to verify separator handling across all templates
 * Creates various contact combinations to ensure no trailing separators occur
 *
 * @returns Array of test results for each template with different contact scenarios
 */
export function testTemplateSeparatorHandling(): Array<{
  templateId: string;
  scenario: string;
  hasTrailingSeparator: boolean;
  result: string;
}> {
  console.log("Testing separator handling across all templates");

  const testScenarios = [
    {
      name: "All contacts present",
      headerContent: `
        <section id="resume-header">
          <h1 class="section-title name">John Doe</h1>
          <p class="title">Software Developer</p>
          <p>
            <span class="phone">418-261-9999</span> |
            <span class="email">john@email.com</span> |
            <span class="linkedin">linkedin.com/in/john</span> |
            <span class="portfolio">john.dev</span>
          </p>
          <p><span class="address">123 Main St</span></p>
        </section>
      `,
    },
    {
      name: "Missing portfolio",
      headerContent: `
        <section id="resume-header">
          <h1 class="section-title name">Jane Smith</h1>
          <p class="title">Designer</p>
          <p>
            <span class="phone">418-555-1234</span> |
            <span class="email">jane@email.com</span> |
            <span class="linkedin">linkedin.com/in/jane</span>
          </p>
          <p><span class="address">456 Oak Ave</span></p>
        </section>
      `,
    },
    {
      name: "Only phone and email",
      headerContent: `
        <section id="resume-header">
          <h1 class="section-title name">Bob Johnson</h1>
          <p>
            <span class="phone">514-555-7890</span> |
            <span class="email">bob@email.com</span>
          </p>
        </section>
      `,
    },
  ];

  const results: Array<{
    templateId: string;
    scenario: string;
    hasTrailingSeparator: boolean;
    result: string;
  }> = [];

  resumeTemplates.forEach((template) => {
    testScenarios.forEach((scenario) => {
      try {
        const sections: TemplateContentSections = {
          "resume-header": scenario.headerContent,
        };

        const result = template.applyTemplate?.(sections) || "";
        const hasTrailingSeparator =
          result.includes("|</p>") ||
          result.includes("| </p>") ||
          result.match(/\|\s*$/m);

        results.push({
          templateId: template.id,
          scenario: `${template.id} - ${scenario.name}`,
          hasTrailingSeparator: !!hasTrailingSeparator,
          result: result.substring(0, 500) + "...", // Truncated for readability
        });
      } catch (error) {
        results.push({
          templateId: template.id,
          scenario: `${template.id} - ${scenario.name}`,
          hasTrailingSeparator: true, // Assume failure
          result: `Error: ${error}`,
        });
      }
    });
  });

  // Log summary of test results
  const failedTests = results.filter((r) => r.hasTrailingSeparator);
  if (failedTests.length === 0) {
    console.log("✅ All template separator tests passed");
  } else {
    console.error(
      `❌ ${failedTests.length} template tests failed:`,
      failedTests
    );
  }

  return results;
}

/**
 * Utility function to get sample template output for debugging
 * Generates sample resume HTML using the specified template
 *
 * @param templateId - ID of the template to use
 * @param includeAllSections - Whether to include all possible sections
 * @returns Sample HTML output from the template
 */
export function getSampleTemplateOutput(
  templateId: string,
  includeAllSections: boolean = false
): string {
  console.log(`Generating sample output for template: ${templateId}`);

  const template = getTemplateById(templateId);

  // Create comprehensive sample sections
  const sampleSections: TemplateContentSections = {
    "resume-header": `
      <section id="resume-header">
        <h1 class="section-title name">John Doe</h1>
        <p class="title">Senior Software Developer</p>
        <p>
          <span class="phone">418-261-9999</span> |
          <span class="email">john.doe@email.com</span> |
          <span class="linkedin">linkedin.com/in/johndoe</span> |
          <span class="portfolio">johndoe.dev</span>
        </p>
        <p><span class="address">123 Main Street<br>Quebec, QC G1H 4B6</span></p>
      </section>
    `,
  };

  if (includeAllSections) {
    // Add sample content for all sections
    sampleSections["resume-summary"] = `
      <p>Experienced software developer with 8+ years of expertise in full-stack development, 
      specializing in React, Node.js, and cloud technologies. Proven track record of delivering 
      scalable solutions and leading development teams.</p>
    `;

    sampleSections["resume-experience"] = `
      <div class="job">
        <h3>Senior Software Developer - TechCorp Inc.</h3>
        <p class="job-period">January 2020 - Present</p>
        <ul>
          <li>Led development of microservices architecture serving 1M+ users</li>
          <li>Mentored junior developers and established coding standards</li>
          <li>Reduced application load time by 40% through performance optimization</li>
        </ul>
      </div>
      <div class="job">
        <h3>Software Developer - StartupXYZ</h3>
        <p class="job-period">June 2018 - December 2019</p>
        <ul>
          <li>Developed RESTful APIs and integrated third-party services</li>
          <li>Implemented automated testing strategies increasing code coverage to 90%</li>
        </ul>
      </div>
    `;

    sampleSections["resume-education"] = `
      <div class="education">
        <h3>Bachelor of Computer Science</h3>
        <p>University of Quebec - Montreal</p>
        <p class="education-period">2014-2018</p>
        <p>Relevant Coursework: Data Structures, Algorithms, Software Engineering</p>
      </div>
    `;

    sampleSections["resume-skills"] = `
      <div class="skills-grid">
        <div class="skill-category">
          <h4>Programming Languages</h4>
          <ul>
            <li>JavaScript/TypeScript</li>
            <li>Python</li>
            <li>Java</li>
            <li>C#</li>
          </ul>
        </div>
        <div class="skill-category">
          <h4>Frameworks & Technologies</h4>
          <ul>
            <li>React/Next.js</li>
            <li>Node.js/Express</li>
            <li>Docker/Kubernetes</li>
            <li>AWS/Azure</li>
          </ul>
        </div>
      </div>
    `;

    sampleSections["resume-projects"] = `
      <div class="project">
        <h3>E-commerce Platform</h3>
        <p>Full-stack web application built with React, Node.js, and PostgreSQL</p>
        <ul>
          <li>Implemented secure payment processing with Stripe integration</li>
          <li>Built admin dashboard for inventory and order management</li>
        </ul>
      </div>
    `;
  }

  try {
    const result = template.applyTemplate?.(sampleSections) || "";
    console.log(`Sample output generated successfully for ${templateId}`);
    return result;
  } catch (error) {
    console.error(`Error generating sample output for ${templateId}:`, error);
    return `Error generating sample output: ${error}`;
  }
}

/**
 * Debug function to analyze template placeholder replacement
 * Shows before/after states and identifies any issues with placeholder processing
 *
 * @param templateId - ID of the template to debug
 * @returns Debug information about placeholder replacement process
 */
export function debugTemplatePlaceholders(templateId: string): {
  templateId: string;
  originalTemplate: string;
  processedResult: string;
  unreplacedPlaceholders: string[];
  separatorIssues: string[];
  headerValidation: {
    hasValidStructure: boolean;
    missingElements: string[];
  };
} {
  console.log(`Debugging placeholder replacement for template: ${templateId}`);

  const template = getTemplateById(templateId);

  // Sample header content for testing
  const sampleHeaderContent = `
    <section id="resume-header">
      <h1 class="section-title name">Debug User</h1>
      <p class="title">Test Position</p>
      <p>
        <span class="phone">123-456-7890</span> |
        <span class="email">debug@test.com</span> |
        <span class="linkedin">linkedin.com/in/debug</span>
      </p>
      <p><span class="address">Debug Address</span></p>
    </section>
  `;

  const sampleSections: TemplateContentSections = {
    "resume-header": sampleHeaderContent,
    "resume-summary": "<p>Debug summary content</p>",
  };

  try {
    const originalTemplate = template.template || "";
    const processedResult = template.applyTemplate?.(sampleSections) || "";

    // Find unreplaced placeholders
    const unreplacedPlaceholders =
      processedResult.match(/\{\{[^}]+\}\}/g) || [];

    // Check for separator issues
    const separatorIssues: string[] = [];
    if (processedResult.includes("|</p>"))
      separatorIssues.push("Trailing separator before </p>");
    if (processedResult.includes("| </p>"))
      separatorIssues.push("Trailing separator with space before </p>");
    if (processedResult.match(/\|\s*$/m))
      separatorIssues.push("Trailing separator at end of line");
    if (processedResult.includes("||"))
      separatorIssues.push("Double separators found");
    if (processedResult.includes('<span class="phone"></span>'))
      separatorIssues.push("Empty phone span");
    if (processedResult.includes('<span class="email"></span>'))
      separatorIssues.push("Empty email span");
    if (processedResult.includes('<span class="linkedin"></span>'))
      separatorIssues.push("Empty linkedin span");
    if (processedResult.includes('<span class="portfolio"></span>'))
      separatorIssues.push("Empty portfolio span");

    // Validate header structure
    const missingElements: string[] = [];
    if (!processedResult.includes('class="section-title name"'))
      missingElements.push("section-title name class");
    if (!processedResult.includes('class="title"'))
      missingElements.push("title class");
    if (!processedResult.includes('class="phone"'))
      missingElements.push("phone class");
    if (!processedResult.includes('class="email"'))
      missingElements.push("email class");
    if (!processedResult.includes('class="address"'))
      missingElements.push("address class");

    const headerValidation = {
      hasValidStructure: missingElements.length === 0,
      missingElements,
    };

    const debugInfo = {
      templateId,
      originalTemplate: originalTemplate.substring(0, 1000) + "...", // Truncated
      processedResult: processedResult.substring(0, 1000) + "...", // Truncated
      unreplacedPlaceholders,
      separatorIssues,
      headerValidation,
    };

    console.log("Template debug analysis completed:", debugInfo);
    return debugInfo;
  } catch (error) {
    console.error(`Error debugging template ${templateId}:`, error);
    return {
      templateId,
      originalTemplate: "Error accessing template",
      processedResult: `Error: ${error}`,
      unreplacedPlaceholders: [],
      separatorIssues: [`Processing error: ${error}`],
      headerValidation: {
        hasValidStructure: false,
        missingElements: ["Error occurred during validation"],
      },
    };
  }
}
