/**
 * Professional Template Definition - VERSION WITH CONDITIONAL HEADER
 * Modern, sophisticated resume template with 2-column layout and corporate styling
 * FIXED: Conditional display of header elements - only show if content exists
 * FIXED: TypeScript errors for section indexing
 */
import {
  ResumeTemplateType,
  TemplateContentSections,
} from "../../../types/resumeTemplateTypes";
import {
  extractHeaderInfo,
  createHeaderPlaceholderObject,
} from "../../../utils/templateUtils";
import { professionalStyles } from "./professionalStyles";

/**
 * Professional template HTML structure
 * Modern 2-column layout with header, sidebar, and main content
 * NOTE: Header elements will be conditionally added based on available content
 */
const professionalTemplateHTML = `
<div class="professional-resume-container">
  <!-- Header Section - Will be populated conditionally -->
  <div id="resume-header" class="professional-header">
    <!-- Content will be inserted here based on available data -->
  </div>

  <!-- Main Content Wrapper -->
  <div class="professional-content-wrapper">
    
    <!-- Sidebar -->
    <div class="professional-sidebar">
      <div class="section" id="resume-skills">
        {{resume-skills}}
      </div>
      
      <div class="section" id="resume-languages">
        {{resume-languages}}
      </div>
      
      <div class="section" id="resume-certifications">
        {{resume-certifications}}
      </div>
      
      <div class="section" id="resume-interests">
        {{resume-interests}}
      </div>
    </div>

    <!-- Main Content -->
    <div class="professional-main">
      <div class="section" id="resume-summary">
        {{resume-summary}}
      </div>
      
      <div class="section" id="resume-experience">
        {{resume-experience}}
      </div>
      
      <div class="section" id="resume-projects">
        {{resume-projects}}
      </div>
      
      <div class="section" id="resume-education">
        {{resume-education}}
      </div>
      
      <div class="section" id="resume-awards">
        {{resume-awards}}
      </div>
      
      <div class="section" id="resume-publications">
        {{resume-publications}}
      </div>
      
      <div class="section" id="resume-volunteering">
        {{resume-volunteering}}
      </div>
      
      <div class="section" id="resume-references">
        {{resume-references}}
      </div>
      
      <div class="section" id="resume-additional">
        {{resume-additional}}
      </div>
    </div>
  </div>
</div>
`;

/**
 * Type definition for section configuration
 * Defines the structure of each section configuration with icon and location
 */
type SectionConfig = {
  icon: string;
  location: "main" | "sidebar";
};

/**
 * Type definition for professional sections mapping
 * Maps section IDs to their configuration to ensure type safety
 */
type ProfessionalSectionsType = {
  "resume-summary": SectionConfig;
  "resume-experience": SectionConfig;
  "resume-projects": SectionConfig;
  "resume-education": SectionConfig;
  "resume-awards": SectionConfig;
  "resume-publications": SectionConfig;
  "resume-volunteering": SectionConfig;
  "resume-references": SectionConfig;
  "resume-additional": SectionConfig;
  "resume-skills": SectionConfig;
  "resume-languages": SectionConfig;
  "resume-certifications": SectionConfig;
  "resume-interests": SectionConfig;
};

/**
 * Section configuration for professional template
 * Defines icons and layout location for each resume section
 * FIXED: Now properly typed to avoid TypeScript indexing errors
 */
const professionalSections: ProfessionalSectionsType = {
  // Main content sections - displayed in the main column
  "resume-summary": {
    icon: "person-fill",
    location: "main",
  },
  "resume-experience": {
    icon: "briefcase-fill",
    location: "main",
  },
  "resume-projects": {
    icon: "layers-fill",
    location: "main",
  },
  "resume-education": {
    icon: "mortarboard-fill",
    location: "main",
  },
  "resume-awards": {
    icon: "trophy-fill",
    location: "main",
  },
  "resume-publications": {
    icon: "journal-text",
    location: "main",
  },
  "resume-volunteering": {
    icon: "heart-fill",
    location: "main",
  },
  "resume-references": {
    icon: "people-fill",
    location: "main",
  },
  "resume-additional": {
    icon: "info-circle-fill",
    location: "main",
  },

  // Sidebar sections - displayed in the sidebar column
  "resume-skills": {
    icon: "gear-fill",
    location: "sidebar",
  },
  "resume-languages": {
    icon: "globe2",
    location: "sidebar",
  },
  "resume-certifications": {
    icon: "award-fill",
    location: "sidebar",
  },
  "resume-interests": {
    icon: "star-fill",
    location: "sidebar",
  },
};

/**
 * ENHANCED: Build conditional header HTML
 * Only includes elements that have actual content to avoid empty spans
 * This ensures clean contact information display without trailing separators
 *
 * @param headerInfo - Extracted header information from resume content
 * @returns Complete header HTML with only available elements
 */
function buildConditionalHeader(headerInfo: any): string {
  console.log("Building conditional professional header", headerInfo);

  let headerHTML = "";

  // Always include name (required field for any resume)
  headerHTML += `    <h1 class="section-title name professional-name">${
    headerInfo.name || "Full Name"
  }</h1>\n`;

  // Conditionally include professional title if available
  if (headerInfo.title && headerInfo.title.trim()) {
    headerHTML += `    <p class="title professional-title">${headerInfo.title}</p>\n`;
  }

  // Build contacts array for elements that exist
  // This prevents empty spans that could cause display issues
  const contactElements: string[] = [];

  // Add phone number if provided
  if (headerInfo.phone && headerInfo.phone.trim()) {
    contactElements.push(
      `<span class="phone professional-contact">${headerInfo.phone}</span>`
    );
  }

  // Add email if provided
  if (headerInfo.email && headerInfo.email.trim()) {
    contactElements.push(
      `<span class="email professional-contact">${headerInfo.email}</span>`
    );
  }

  // Add LinkedIn profile if provided
  if (headerInfo.linkedin && headerInfo.linkedin.trim()) {
    contactElements.push(
      `<span class="linkedin professional-contact">${headerInfo.linkedin}</span>`
    );
  }

  // Add portfolio website if provided
  if (headerInfo.portfolio && headerInfo.portfolio.trim()) {
    contactElements.push(
      `<span class="portfolio professional-contact">${headerInfo.portfolio}</span>`
    );
  }

  // Only add contacts section if we have at least one contact method
  if (contactElements.length > 0) {
    headerHTML += `    <div class="professional-contacts">\n`;
    headerHTML += `      ${contactElements.join("\n      ")}\n`;
    headerHTML += `    </div>\n`;
  }

  // Conditionally include address if provided
  if (headerInfo.address && headerInfo.address.trim()) {
    // Convert line breaks to HTML breaks for proper display
    const formattedAddress = headerInfo.address.replace(/\n/g, "<br>");
    headerHTML += `    <div class="professional-address">${formattedAddress}</div>\n`;
  }

  console.log(
    `Professional header built with ${contactElements.length} contacts and ${
      headerInfo.title ? "title" : "no title"
    }`
  );

  return headerHTML;
}

/**
 * Enhanced content processor that preserves existing titles and languages
 * Only adds icons to existing section titles, doesn't replace the title text
 * This ensures multilingual support and custom section naming
 *
 * @param content - Original section content from resume data
 * @param sectionId - ID of the section being processed
 * @param config - Section configuration (icon, location)
 * @returns Enhanced HTML content with professional styling and icons
 */
function enhanceProfessionalContent(
  content: string,
  sectionId: string,
  config: SectionConfig
): string {
  // Return empty string if no content provided
  if (!content || !content.trim()) return "";

  try {
    // Parse HTML content safely using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    // Find existing h2 title element in the content
    let titleElement = doc.querySelector("h2");

    if (titleElement) {
      // Keep the existing title text and language, just add icon
      const existingTitle = titleElement.textContent?.trim() || "";

      // Add Bootstrap icon while preserving the original title text and language
      titleElement.innerHTML = `<img class="professional-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${config.icon}.svg" alt="${existingTitle}"> ${existingTitle}`;

      // Update classes for professional styling
      titleElement.className = "section-title professional-section-title";

      console.log(
        `Professional: Enhanced section "${sectionId}" with icon, kept title: "${existingTitle}"`
      );
    } else {
      console.log(
        `Professional: No h2 title found in section "${sectionId}", content will be used as-is`
      );
    }

    // Apply location-specific enhancements based on sidebar or main content
    if (config.location === "sidebar") {
      // Sidebar-specific enhancements for compact display
      const lists = doc.querySelectorAll("ul");
      lists.forEach((list) => {
        if (!list.className.includes("professional-sidebar-list")) {
          list.className += " professional-sidebar-list";
        }
      });

      const listItems = doc.querySelectorAll("li");
      listItems.forEach((item) => {
        if (!item.className.includes("professional-sidebar-item")) {
          item.className += " professional-sidebar-item";
        }
      });
    } else if (config.location === "main") {
      // Main content enhancements for detailed display
      const paragraphs = doc.querySelectorAll("p");
      paragraphs.forEach((p) => {
        if (!p.className.includes("professional-content")) {
          p.className += " professional-content";
        }
      });

      // Special handling for experience section with job entries
      if (sectionId === "resume-experience") {
        const jobDivs = doc.querySelectorAll("div");
        jobDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " professional-job";
          }
        });
      }

      // Special handling for education section with school entries
      if (sectionId === "resume-education") {
        const eduDivs = doc.querySelectorAll("div");
        eduDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " professional-education";
          }
        });
      }

      // Special handling for projects section with project entries
      if (sectionId === "resume-projects") {
        const projectDivs = doc.querySelectorAll("div");
        projectDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " professional-project";
          }
        });
      }
    }

    // Return processed HTML content
    return doc.body.innerHTML;
  } catch (error) {
    console.error(
      `Error enhancing professional content for ${sectionId}:`,
      error
    );
    // Fallback: return original content without modifications if parsing fails
    return content;
  }
}

/**
 * Type guard to check if a section ID is valid for professional sections
 * Helps TypeScript understand that the key exists in our sections configuration
 * Also ensures the sectionId is a string type
 *
 * @param sectionId - Section ID to check (can be string or number from Object.entries)
 * @returns True if the section ID is valid for professional sections
 */
function isValidProfessionalSection(
  sectionId: string | number
): sectionId is keyof ProfessionalSectionsType {
  return typeof sectionId === "string" && sectionId in professionalSections;
}

/**
 * ENHANCED: Apply professional template to content sections
 * Now builds header conditionally based on available content
 * FIXED: TypeScript errors for section indexing with proper type guards
 * This is the main function that processes resume data and applies the professional template
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with professional template applied
 */
function applyProfessionalTemplate(sections: TemplateContentSections): string {
  console.log(
    "Applying Professional template with conditional header elements"
  );

  // Start with the professional template structure
  let result = professionalTemplateHTML;

  // Process header section with conditional elements
  if (sections["resume-header"]) {
    console.log("Processing professional header with conditional display");

    // Extract structured header information from raw content
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Build conditional header HTML with only available elements
    const conditionalHeaderHTML = buildConditionalHeader(headerInfo);

    // Replace the header placeholder with our conditional content
    const headerPlaceholder =
      "    <!-- Content will be inserted here based on available data -->";
    result = result.replace(headerPlaceholder, conditionalHeaderHTML);
  } else {
    // Default professional header with basic info if no header section provided
    console.log("No header section found, using minimal default header");

    const defaultHeaderHTML = buildConditionalHeader({
      name: "Full Name",
      title: "Professional Title",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: null, // Will be conditionally excluded
      portfolio: null, // Will be conditionally excluded
      address: "City, Country",
    });

    const headerPlaceholder =
      "    <!-- Content will be inserted here based on available data -->";
    result = result.replace(headerPlaceholder, defaultHeaderHTML);
  }

  // Process all other sections while preserving existing titles
  // FIXED: Using type guard to ensure TypeScript safety
  Object.entries(sections).forEach(([sectionId, content]) => {
    // Skip header section (already processed) and only process valid professional sections
    if (
      sectionId !== "resume-header" &&
      isValidProfessionalSection(sectionId)
    ) {
      const sectionConfig = professionalSections[sectionId];

      // Additional safety check to ensure sectionConfig exists
      // This should never happen due to type guard, but provides extra safety
      if (!sectionConfig) {
        console.warn(`No configuration found for section: ${sectionId}`);
        return;
      }

      const placeholder = `{{${sectionId}}}`;

      // Only process if the placeholder exists in the template
      if (result.includes(placeholder)) {
        console.log(
          `Professional: Processing ${sectionId} for ${sectionConfig.location} - preserving existing title`
        );

        // Enhance content with professional styling and icons
        const enhancedContent = enhanceProfessionalContent(
          content,
          sectionId,
          sectionConfig
        );

        // Replace placeholder with enhanced content using regex for safety
        result = result.replace(
          new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
          enhancedContent || ""
        );
      }
    }
  });

  // Clean up any remaining placeholders that weren't filled
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    console.log(
      `Professional: Cleaning ${remainingPlaceholders.length} remaining placeholders`
    );
    // Remove each remaining placeholder to avoid display issues
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  console.log(
    "Professional template processing completed with conditional header elements"
  );
  return result;
}

/**
 * Professional template configuration object
 * Exported for use in the template registry
 * This object defines all properties needed for the CareerBoost template system
 */
export const professionalTemplate: ResumeTemplateType = {
  id: "professional", // Unique identifier for this template
  name: "Professional", // Display name shown to users
  isPro: true, // Requires Pro subscription for CareerBoost
  previewClass: "border-t-4 border-teal-600", // Tailwind classes for preview styling
  description:
    "Modern 2-column layout with sophisticated styling for corporate positions", // User-facing description
  styles: professionalStyles, // CSS styles for this template
  template: professionalTemplateHTML, // HTML structure template
  applyTemplate: applyProfessionalTemplate, // Function to apply content to template
};
