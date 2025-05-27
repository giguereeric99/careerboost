/**
 * Executive Template Definition - PREMIUM EXECUTIVE DESIGN
 * Sophisticated and authoritative template for senior leadership positions
 * Features elegant two-column layout with premium typography and executive-level presentation
 * Optimized for C-level executives, VPs, Directors, and senior management roles
 * ENHANCED: Conditional display of header elements and sophisticated content processing
 */
import {
  ResumeTemplateType,
  TemplateContentSections,
} from "../../../types/resumeTemplateTypes";
import {
  extractHeaderInfo,
  createHeaderPlaceholderObject,
} from "../../../utils/templateUtils";
import { executiveStyles } from "./executiveStyles";

/**
 * Executive template HTML structure
 * Premium 2-column layout with sophisticated header and executive-level presentation
 * NOTE: Header elements will be conditionally added based on available content
 */
const executiveTemplateHTML = `
<div class="executive-resume-container">
  <!-- Executive Header Section - Premium presentation -->
  <div id="resume-header" class="executive-header">
    <div class="executive-header-content">
      <!-- Content will be inserted here based on available data -->
    </div>
  </div>

  <!-- Executive Content Wrapper -->
  <div class="executive-content-wrapper">
    
    <!-- Main Content Area - Primary information -->
    <div class="executive-main">
      <div class="section executive-main-section" id="resume-summary">
        {{resume-summary}}
      </div>
      
      <div class="section executive-main-section" id="resume-experience">
        {{resume-experience}}
      </div>
      
      <div class="section executive-main-section" id="resume-projects">
        {{resume-projects}}
      </div>
      
      <div class="section executive-main-section" id="resume-education">
        {{resume-education}}
      </div>
      
      <div class="section executive-main-section" id="resume-awards">
        {{resume-awards}}
      </div>
      
      <div class="section executive-main-section" id="resume-publications">
        {{resume-publications}}
      </div>
      
      <div class="section executive-main-section" id="resume-volunteering">
        {{resume-volunteering}}
      </div>
      
      <div class="section executive-main-section" id="resume-references">
        {{resume-references}}
      </div>
      
      <div class="section executive-main-section" id="resume-additional">
        {{resume-additional}}
      </div>
    </div>

    <!-- Executive Sidebar - Supporting information -->
    <div class="executive-sidebar">
      <div class="section executive-sidebar-section" id="resume-skills">
        {{resume-skills}}
      </div>
      
      <div class="section executive-sidebar-section" id="resume-languages">
        {{resume-languages}}
      </div>
      
      <div class="section executive-sidebar-section" id="resume-certifications">
        {{resume-certifications}}
      </div>
      
      <div class="section executive-sidebar-section" id="resume-interests">
        {{resume-interests}}
      </div>
    </div>
  </div>
</div>
`;

/**
 * Type definition for executive section configuration
 * Defines the structure of each section configuration with icon and location
 */
type ExecutiveSectionConfig = {
  icon: string;
  location: "main" | "sidebar";
  priority: number; // Executive priority level for content ordering
};

/**
 * Type definition for executive sections mapping
 * Maps section IDs to their configuration to ensure type safety
 */
type ExecutiveSectionsType = {
  "resume-summary": ExecutiveSectionConfig;
  "resume-experience": ExecutiveSectionConfig;
  "resume-projects": ExecutiveSectionConfig;
  "resume-education": ExecutiveSectionConfig;
  "resume-awards": ExecutiveSectionConfig;
  "resume-publications": ExecutiveSectionConfig;
  "resume-volunteering": ExecutiveSectionConfig;
  "resume-references": ExecutiveSectionConfig;
  "resume-additional": ExecutiveSectionConfig;
  "resume-skills": ExecutiveSectionConfig;
  "resume-languages": ExecutiveSectionConfig;
  "resume-certifications": ExecutiveSectionConfig;
  "resume-interests": ExecutiveSectionConfig;
};

/**
 * Section configuration for executive template
 * Defines icons, layout location, and executive priority for each resume section
 * ENHANCED: Priority-based ordering for executive-level presentation
 */
const executiveSections: ExecutiveSectionsType = {
  // Main content sections - displayed in the main column with executive priority
  "resume-summary": {
    icon: "person-fill",
    location: "main",
    priority: 1, // Highest priority for executive summary
  },
  "resume-experience": {
    icon: "briefcase-fill",
    location: "main",
    priority: 2, // Second priority for executive experience
  },
  "resume-projects": {
    icon: "diagram-3-fill",
    location: "main",
    priority: 3, // Third priority for strategic projects
  },
  "resume-education": {
    icon: "mortarboard-fill",
    location: "main",
    priority: 6, // Lower priority but still in main content
  },
  "resume-awards": {
    icon: "trophy-fill",
    location: "main",
    priority: 4, // High priority for executive achievements
  },
  "resume-publications": {
    icon: "journal-text",
    location: "main",
    priority: 5, // Important for thought leadership
  },
  "resume-volunteering": {
    icon: "heart-fill",
    location: "main",
    priority: 7, // Community involvement for executives
  },
  "resume-references": {
    icon: "people-fill",
    location: "main",
    priority: 9, // Lower priority but available if needed
  },
  "resume-additional": {
    icon: "info-circle-fill",
    location: "main",
    priority: 8, // Additional information as needed
  },

  // Sidebar sections - displayed in the sidebar column with supporting priority
  "resume-skills": {
    icon: "gear-fill",
    location: "sidebar",
    priority: 1, // Primary sidebar content - core competencies
  },
  "resume-languages": {
    icon: "globe2",
    location: "sidebar",
    priority: 3, // Important for global executives
  },
  "resume-certifications": {
    icon: "award-fill",
    location: "sidebar",
    priority: 2, // Professional credentials are important
  },
  "resume-interests": {
    icon: "star-fill",
    location: "sidebar",
    priority: 4, // Personal interests to show well-roundedness
  },
};

/**
 * ENHANCED: Build conditional executive header HTML
 * Only includes elements that have actual content with premium executive presentation
 * Creates sophisticated contact layout with professional styling
 *
 * @param headerInfo - Extracted header information from resume content
 * @returns Complete header HTML with only available elements and executive design
 */
function buildExecutiveHeader(headerInfo: any): string {
  console.log(
    "Building executive header with premium presentation",
    headerInfo
  );

  let headerHTML = "";

  // Always include name (required field for any resume) with executive styling
  headerHTML += `    <h1 class="section-title name executive-name">${
    headerInfo.name || "Full Name"
  }</h1>\n`;

  // Conditionally include executive title/position if available
  if (headerInfo.title && headerInfo.title.trim()) {
    headerHTML += `    <p class="title executive-title">${headerInfo.title}</p>\n`;
  }

  // Build premium contacts array for elements that exist
  const contactElements: string[] = [];

  // Add phone contact with executive styling if provided
  if (headerInfo.phone && headerInfo.phone.trim()) {
    contactElements.push(
      `<div class="executive-contact">
        <div class="executive-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/telephone-fill.svg" alt="Phone">
        </div>
        <span>${headerInfo.phone}</span>
      </div>`
    );
  }

  // Add email contact with executive styling if provided
  if (headerInfo.email && headerInfo.email.trim()) {
    contactElements.push(
      `<div class="executive-contact">
        <div class="executive-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/envelope-fill.svg" alt="Email">
        </div>
        <span>${headerInfo.email}</span>
      </div>`
    );
  }

  // Add LinkedIn profile with executive styling if provided
  if (headerInfo.linkedin && headerInfo.linkedin.trim()) {
    contactElements.push(
      `<div class="executive-contact">
        <div class="executive-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/linkedin.svg" alt="LinkedIn">
        </div>
        <span>${headerInfo.linkedin}</span>
      </div>`
    );
  }

  // Add portfolio website with executive styling if provided
  if (headerInfo.portfolio && headerInfo.portfolio.trim()) {
    contactElements.push(
      `<div class="executive-contact">
        <div class="executive-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/globe2.svg" alt="Portfolio">
        </div>
        <span>${headerInfo.portfolio}</span>
      </div>`
    );
  }

  // Only add contacts section if we have at least one contact method
  if (contactElements.length > 0) {
    headerHTML += `    <div class="executive-contacts">\n`;
    headerHTML += `      ${contactElements.join("\n      ")}\n`;
    headerHTML += `    </div>\n`;
  }

  // Conditionally include address with executive styling if provided
  if (headerInfo.address && headerInfo.address.trim()) {
    const formattedAddress = headerInfo.address.replace(/\n/g, "<br>");
    headerHTML += `    <div class="executive-address">${formattedAddress}</div>\n`;
  }

  console.log(
    `Executive header built with ${contactElements.length} contacts and premium styling`
  );

  return headerHTML;
}

/**
 * ENHANCED: Executive content processor with sophisticated styling
 * Adds premium executive styling while preserving existing titles and content structure
 * Focuses on authority, leadership, and professional presentation
 *
 * @param content - Original section content from resume data
 * @param sectionId - ID of the section being processed
 * @param config - Section configuration (icon, location, priority)
 * @returns Enhanced HTML content with executive styling and premium presentation
 */
function enhanceExecutiveContent(
  content: string,
  sectionId: string,
  config: ExecutiveSectionConfig
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
      // Keep the existing title text and language, add executive styling and icon
      const existingTitle = titleElement.textContent?.trim() || "";

      // Add premium icon and executive styling while preserving original title
      titleElement.innerHTML = `<img class="executive-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${config.icon}.svg" alt="${existingTitle}"> ${existingTitle}`;

      // Update classes for executive styling
      titleElement.className = "section-title executive-section-title";

      console.log(
        `Executive: Enhanced section "${sectionId}" with premium icon and styling, kept title: "${existingTitle}"`
      );
    } else {
      console.log(
        `Executive: No h2 title found in section "${sectionId}", content will be used as-is with executive styling`
      );
    }

    // Apply location-specific executive enhancements
    if (config.location === "sidebar") {
      // Sidebar-specific enhancements for executive supporting information
      const lists = doc.querySelectorAll("ul");
      lists.forEach((list) => {
        if (!list.className.includes("executive-sidebar-list")) {
          list.className += " executive-sidebar-list";
        }
      });

      const listItems = doc.querySelectorAll("li");
      listItems.forEach((item) => {
        if (!item.className.includes("executive-sidebar-item")) {
          item.className += " executive-sidebar-item";
        }
      });
    } else if (config.location === "main") {
      // Main content enhancements for executive primary information
      const paragraphs = doc.querySelectorAll("p");
      paragraphs.forEach((p) => {
        if (!p.className.includes("executive-content")) {
          p.className += " executive-content";
        }
      });

      // Special handling for experience section with executive experience styling
      if (sectionId === "resume-experience") {
        const jobDivs = doc.querySelectorAll("div");
        jobDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " executive-experience";
          }
        });
      }

      // Special handling for education section with executive education styling
      if (sectionId === "resume-education") {
        const eduDivs = doc.querySelectorAll("div");
        eduDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " executive-education";
          }
        });
      }

      // Special handling for projects section with executive project styling
      if (sectionId === "resume-projects") {
        const projectDivs = doc.querySelectorAll("div");
        projectDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " executive-project";
          }
        });
      }

      // Special handling for awards section (important for executives)
      if (sectionId === "resume-awards") {
        const awardDivs = doc.querySelectorAll("div");
        awardDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " executive-award";
          }
        });
      }
    }

    // Return processed HTML content with executive enhancements
    return doc.body.innerHTML;
  } catch (error) {
    console.error(`Error enhancing executive content for ${sectionId}:`, error);
    // Fallback: return original content without modifications if parsing fails
    return content;
  }
}

/**
 * Type guard to check if a section ID is valid for executive sections
 * Helps TypeScript understand that the key exists in our sections configuration
 * Also ensures the sectionId is a string type
 *
 * @param sectionId - Section ID to check (can be string or number from Object.entries)
 * @returns True if the section ID is valid for executive sections
 */
function isValidExecutiveSection(
  sectionId: string | number
): sectionId is keyof ExecutiveSectionsType {
  return typeof sectionId === "string" && sectionId in executiveSections;
}

/**
 * ENHANCED: Apply executive template to content sections
 * Builds header conditionally and applies premium executive styling
 * ENHANCED: TypeScript-safe section processing with executive-level presentation
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with executive template applied
 */
function applyExecutiveTemplate(sections: TemplateContentSections): string {
  console.log(
    "Applying Executive template with premium styling and conditional header elements"
  );

  // Start with the executive template structure
  let result = executiveTemplateHTML;

  // Process header section with executive conditional elements
  if (sections["resume-header"]) {
    console.log("Processing executive header with premium conditional display");

    // Extract structured header information from raw content
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Build executive header HTML with premium styling and conditional elements
    const executiveHeaderHTML = buildExecutiveHeader(headerInfo);

    // Replace the header placeholder with our executive content
    const headerPlaceholder =
      "      <!-- Content will be inserted here based on available data -->";
    result = result.replace(headerPlaceholder, executiveHeaderHTML);
  } else {
    // Default executive header with premium styling if no header section provided
    console.log("No header section found, using default executive header");

    const defaultHeaderHTML = buildExecutiveHeader({
      name: "Executive Name",
      title: "Chief Executive Officer",
      phone: "(123) 456-7890",
      email: "executive@company.com",
      linkedin: "linkedin.com/in/executive",
      portfolio: null, // Will be conditionally excluded
      address: "Executive City, Country",
    });

    const headerPlaceholder =
      "      <!-- Content will be inserted here based on available data -->";
    result = result.replace(headerPlaceholder, defaultHeaderHTML);
  }

  // Process all other sections with executive enhancements
  // ENHANCED: Using type guard to ensure TypeScript safety
  Object.entries(sections).forEach(([sectionId, content]) => {
    // Skip header section (already processed) and only process valid executive sections
    if (sectionId !== "resume-header" && isValidExecutiveSection(sectionId)) {
      const sectionConfig = executiveSections[sectionId];

      // Additional safety check to ensure sectionConfig exists
      if (!sectionConfig) {
        console.warn(
          `No configuration found for executive section: ${sectionId}`
        );
        return;
      }

      const placeholder = `{{${sectionId}}}`;

      // Only process if the placeholder exists in the template
      if (result.includes(placeholder)) {
        console.log(
          `Executive: Processing ${sectionId} for ${sectionConfig.location} with priority ${sectionConfig.priority} - preserving existing title`
        );

        // Enhance content with executive styling and premium presentation
        const enhancedContent = enhanceExecutiveContent(
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
      `Executive: Cleaning ${remainingPlaceholders.length} remaining placeholders`
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
    "Executive template processing completed with premium styling and conditional header elements"
  );
  return result;
}

/**
 * Executive template configuration object
 * Exported for use in the template registry
 * This object defines all properties needed for the CareerBoost template system
 */
export const executiveTemplate: ResumeTemplateType = {
  id: "executive", // Unique identifier for this template
  name: "Executive", // Display name shown to users
  isPro: true, // Requires Pro subscription for CareerBoost
  previewClass: "border-t-4 border-slate-700", // Tailwind classes for preview styling
  description:
    "Premium executive design with sophisticated typography and authoritative presentation for senior leadership positions", // User-facing description
  styles: executiveStyles, // CSS styles for this template
  template: executiveTemplateHTML, // HTML structure template
  applyTemplate: applyExecutiveTemplate, // Function to apply content to template
};
