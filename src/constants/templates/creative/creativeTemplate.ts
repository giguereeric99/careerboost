/**
 * Creative Template Definition - SIMPLIFIED ARTISTIC DESIGN WITH COLORED SECTIONS
 * Innovative layout with creative styling for artistic and design professionals
 * Features colored section backgrounds instead of individual tags for better content handling
 * FIXED: Simplified approach that works with any resume content structure
 */
import {
  ResumeTemplateType,
  TemplateContentSections,
} from "../../../types/resumeTemplateTypes";
import {
  extractHeaderInfo,
  createHeaderPlaceholderObject,
} from "../../../utils/templateUtils";
import { creativeStyles } from "./creativeStyles";

/**
 * Creative template HTML structure
 * Asymmetric 2-column layout with artistic header and modern design elements
 * NOTE: Header elements will be conditionally added based on available content
 */
const creativeTemplateHTML = `
<div class="creative-resume-container">
  <!-- Artistic Header Section with floating shapes -->
  <div id="resume-header" class="creative-header">
    <!-- Content will be inserted here based on available data -->
  </div>

  <!-- Main Content Wrapper with Creative Layout -->
  <div class="creative-content-wrapper">
    
    <!-- Creative Sidebar with Artistic Elements and Colored Section Backgrounds -->
    <div class="creative-sidebar">
      <!-- Skills Section with Blue Background -->
      <div class="section creative-sidebar-section creative-skills-section" id="resume-skills">
        {{resume-skills}}
      </div>
      
      <!-- Languages Section with Purple Background -->
      <div class="section creative-sidebar-section creative-languages-section" id="resume-languages">
        {{resume-languages}}
      </div>
      
      <!-- Certifications Section with Green Background -->
      <div class="section creative-sidebar-section creative-certifications-section" id="resume-certifications">
        {{resume-certifications}}
      </div>
      
      <!-- Interests Section with Orange Background -->
      <div class="section creative-sidebar-section creative-interests-section" id="resume-interests">
        {{resume-interests}}
      </div>

      <!-- Decorative Element for Bottom Space -->
      <div class="creative-sidebar-decoration">
        <div class="decoration-shape decoration-shape-1"></div>
        <div class="decoration-shape decoration-shape-2"></div>
        <div class="decoration-shape decoration-shape-3"></div>
        <div class="decoration-text">
          <div class="decoration-line"></div>
          <span></span>
          <div class="decoration-line"></div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="creative-main">
      <!-- Summary with Creative Styling -->
      <div class="section creative-main-section" id="resume-summary">
        {{resume-summary}}
      </div>
      
      <!-- Experience with Timeline Design -->
      <div class="section creative-main-section" id="resume-experience">
        {{resume-experience}}
      </div>
      
      <!-- Projects with Portfolio Style -->
      <div class="section creative-main-section" id="resume-projects">
        {{resume-projects}}
      </div>
      
      <!-- Education with Modern Cards -->
      <div class="section creative-main-section" id="resume-education">
        {{resume-education}}
      </div>
      
      <!-- Awards with Achievement Style -->
      <div class="section creative-main-section" id="resume-awards">
        {{resume-awards}}
      </div>
      
      <!-- Publications with Modern List -->
      <div class="section creative-main-section" id="resume-publications">
        {{resume-publications}}
      </div>
      
      <!-- Volunteering with Heart Icons -->
      <div class="section creative-main-section" id="resume-volunteering">
        {{resume-volunteering}}
      </div>
      
      <!-- References with Contact Cards -->
      <div class="section creative-main-section" id="resume-references">
        {{resume-references}}
      </div>
      
      <!-- Additional Information -->
      <div class="section creative-main-section" id="resume-additional">
        {{resume-additional}}
      </div>
    </div>
  </div>
</div>
`;

/**
 * Type definition for section configuration
 * Simplified approach with just basic styling properties
 */
type CreativeSectionConfig = {
  icon: string;
  location: "main" | "sidebar";
  gradient: string;
  backgroundColor?: string; // Background color for the entire section
  borderColor?: string; // Border accent color
};

/**
 * Type definition for creative sections mapping
 * Maps section IDs to their configuration to ensure type safety
 */
type CreativeSectionsType = {
  "resume-summary": CreativeSectionConfig;
  "resume-experience": CreativeSectionConfig;
  "resume-projects": CreativeSectionConfig;
  "resume-education": CreativeSectionConfig;
  "resume-awards": CreativeSectionConfig;
  "resume-publications": CreativeSectionConfig;
  "resume-volunteering": CreativeSectionConfig;
  "resume-references": CreativeSectionConfig;
  "resume-additional": CreativeSectionConfig;
  "resume-skills": CreativeSectionConfig;
  "resume-languages": CreativeSectionConfig;
  "resume-certifications": CreativeSectionConfig;
  "resume-interests": CreativeSectionConfig;
};

/**
 * Section configuration for creative template with unique color schemes
 * Each section gets a distinct color palette for visual distinction
 * SIMPLIFIED: No more complex tag conversion, just section-level styling
 */
const creativeSections: CreativeSectionsType = {
  // Main content sections with creative icons and gradients
  "resume-summary": {
    icon: "person-hearts",
    location: "main",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  "resume-experience": {
    icon: "briefcase-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  "resume-projects": {
    icon: "palette-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  "resume-education": {
    icon: "mortarboard-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  },
  "resume-awards": {
    icon: "award-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  "resume-publications": {
    icon: "journal-bookmark-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  "resume-volunteering": {
    icon: "heart-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  },
  "resume-references": {
    icon: "people-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  },
  "resume-additional": {
    icon: "plus-circle-fill",
    location: "main",
    gradient: "linear-gradient(135deg, #a8caba 0%, #5d4e75 100%)",
  },

  // Sidebar sections with unique color schemes and background colors
  "resume-skills": {
    icon: "lightning-charge-fill",
    location: "sidebar",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    borderColor: "#667eea",
  },
  "resume-languages": {
    icon: "translate",
    location: "sidebar",
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    backgroundColor: "rgba(240, 147, 251, 0.05)",
    borderColor: "#f093fb",
  },
  "resume-certifications": {
    icon: "patch-check-fill",
    location: "sidebar",
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    backgroundColor: "rgba(67, 233, 123, 0.05)",
    borderColor: "#43e97b",
  },
  "resume-interests": {
    icon: "star-fill",
    location: "sidebar",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    backgroundColor: "rgba(255, 152, 0, 0.05)",
    borderColor: "#ff9800",
  },
};

/**
 * ENHANCED: Build conditional header HTML with creative styling
 * Only includes elements that have actual content with artistic presentation
 * Creates floating shapes and modern contact card layout
 *
 * @param headerInfo - Extracted header information from resume content
 * @returns Complete header HTML with only available elements and creative design
 */
function buildCreativeHeader(headerInfo: any): string {
  console.log("Building creative header with artistic elements", headerInfo);

  let headerHTML = "";

  // Background artistic elements - floating shapes for visual appeal
  headerHTML += `    <div class="creative-header-bg">\n`;
  headerHTML += `      <div class="creative-shape creative-shape-1"></div>\n`;
  headerHTML += `      <div class="creative-shape creative-shape-2"></div>\n`;
  headerHTML += `      <div class="creative-shape creative-shape-3"></div>\n`;
  headerHTML += `    </div>\n`;

  // Header content with creative layout
  headerHTML += `    <div class="creative-header-content">\n`;

  // Always include name (required) with artistic styling
  headerHTML += `      <h1 class="section-title name creative-name">${
    headerInfo.name || "Full Name"
  }</h1>\n`;

  // Conditionally include title with creative subtitle styling
  if (headerInfo.title && headerInfo.title.trim()) {
    headerHTML += `      <p class="title creative-title">${headerInfo.title}</p>\n`;
  }

  // Build contacts array for elements that exist with creative presentation
  const contactElements: string[] = [];

  // Add phone contact with icon if provided
  if (headerInfo.phone && headerInfo.phone.trim()) {
    contactElements.push(
      `<div class="creative-contact-item">
        <div class="creative-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/telephone-fill.svg" alt="Phone">
        </div>
        <span class="creative-contact-text">${headerInfo.phone}</span>
      </div>`
    );
  }

  // Add email contact with icon if provided
  if (headerInfo.email && headerInfo.email.trim()) {
    contactElements.push(
      `<div class="creative-contact-item">
        <div class="creative-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/envelope-fill.svg" alt="Email">
        </div>
        <span class="creative-contact-text">${headerInfo.email}</span>
      </div>`
    );
  }

  // Add LinkedIn contact with icon if provided
  if (headerInfo.linkedin && headerInfo.linkedin.trim()) {
    contactElements.push(
      `<div class="creative-contact-item">
        <div class="creative-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/linkedin.svg" alt="LinkedIn">
        </div>
        <span class="creative-contact-text">${headerInfo.linkedin}</span>
      </div>`
    );
  }

  // Add portfolio contact with icon if provided
  if (headerInfo.portfolio && headerInfo.portfolio.trim()) {
    contactElements.push(
      `<div class="creative-contact-item">
        <div class="creative-contact-icon">
          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/globe2.svg" alt="Portfolio">
        </div>
        <span class="creative-contact-text">${headerInfo.portfolio}</span>
      </div>`
    );
  }

  // Only add contacts section if we have at least one contact method
  if (contactElements.length > 0) {
    headerHTML += `      <div class="creative-contacts">\n`;
    headerHTML += `        ${contactElements.join("\n        ")}\n`;
    headerHTML += `      </div>\n`;
  }

  // Conditionally include address with creative styling and icon
  if (headerInfo.address && headerInfo.address.trim()) {
    const formattedAddress = headerInfo.address.replace(/\n/g, "<br>");
    headerHTML += `      <div class="creative-address">\n`;
    headerHTML += `        <div class="creative-contact-icon">\n`;
    headerHTML += `          <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/geo-alt-fill.svg" alt="Address">\n`;
    headerHTML += `        </div>\n`;
    headerHTML += `        <span class="creative-address-text">${formattedAddress}</span>\n`;
    headerHTML += `      </div>\n`;
  }

  headerHTML += `    </div>\n`; // Close creative-header-content

  console.log(
    `Creative header built with ${contactElements.length} contacts and artistic elements`
  );

  return headerHTML;
}

/**
 * SIMPLIFIED: Enhanced content processor for creative template
 * Adds artistic styling with section-level colors instead of individual tag conversion
 * This approach works with any content structure and avoids duplication issues
 *
 * @param content - Original section content from resume data
 * @param sectionId - ID of the section being processed
 * @param config - Section configuration (icon, location, gradient, colors)
 * @returns Enhanced HTML content with creative styling
 */
function enhanceCreativeContent(
  content: string,
  sectionId: string,
  config: CreativeSectionConfig
): string {
  // Return empty string if no content provided
  if (!content || !content.trim()) return "";

  try {
    // Parse HTML content safely using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    // ENHANCED: Check if content is actually empty after parsing
    const textContent = doc.body.textContent || "";
    const cleanTextContent = textContent.replace(/\s+/g, "").trim();

    // If there's no meaningful text content, don't display the section
    if (!cleanTextContent || cleanTextContent.length === 0) {
      console.log(`Creative: Section "${sectionId}" is empty, hiding it`);
      return "";
    }

    // Find existing h2 title and enhance with creative styling
    let titleElement = doc.querySelector("h2");

    if (titleElement) {
      // Keep the existing title text and language, add creative styling
      const existingTitle = titleElement.textContent?.trim() || "";

      // Add gradient background and icon with artistic presentation
      titleElement.innerHTML = `
        <div class="creative-section-title-wrapper" style="background: ${config.gradient};">
          <div class="creative-section-icon">
            <img src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${config.icon}.svg" alt="${existingTitle}">
          </div>
          <span class="creative-section-title-text">${existingTitle}</span>
          <div class="creative-section-decoration"></div>
        </div>
      `;

      // Update classes for creative styling
      titleElement.className = "section-title creative-section-title";

      console.log(
        `Creative: Enhanced section "${sectionId}" with gradient and artistic elements`
      );
    }

    // Apply location-specific creative enhancements
    if (config.location === "sidebar") {
      // SIMPLIFIED: Just add basic styling classes without complex tag conversion
      const lists = doc.querySelectorAll("ul");
      lists.forEach((list) => {
        list.className += " creative-sidebar-list";
      });

      const listItems = doc.querySelectorAll("li");
      listItems.forEach((item, index) => {
        item.className += " creative-sidebar-item";
        item.style.animationDelay = `${index * 0.1}s`;
      });

      // Apply section-specific background color to the entire content area
      const contentWrapper = doc.createElement("div");
      contentWrapper.className = "creative-section-content";

      // Move all content into the wrapper
      while (doc.body.firstChild) {
        contentWrapper.appendChild(doc.body.firstChild);
      }

      // ENHANCED: Final check - if wrapper has no meaningful content, return empty
      const wrapperTextContent = contentWrapper.textContent || "";
      const cleanWrapperContent = wrapperTextContent.replace(/\s+/g, "").trim();

      if (!cleanWrapperContent || cleanWrapperContent.length === 0) {
        console.log(
          `Creative: Sidebar section "${sectionId}" wrapper is empty after processing, hiding it`
        );
        return "";
      }

      doc.body.appendChild(contentWrapper);
    } else if (config.location === "main") {
      // Main content creative enhancements
      const paragraphs = doc.querySelectorAll("p");
      paragraphs.forEach((p) => {
        p.className += " creative-content-text";
      });

      // Special handling for experience section with timeline
      if (sectionId === "resume-experience") {
        const jobDivs = doc.querySelectorAll("div");
        jobDivs.forEach((div, index) => {
          if (div.querySelector("h3")) {
            div.className += " creative-experience-item";
            // Add timeline marker element for visual timeline effect
            const timelineElement = doc.createElement("div");
            timelineElement.className = "creative-timeline-marker";
            timelineElement.style.background = config.gradient;
            div.insertBefore(timelineElement, div.firstChild);
          }
        });
      }

      // Special handling for projects with portfolio cards
      if (sectionId === "resume-projects") {
        const projectDivs = doc.querySelectorAll("div");
        projectDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " creative-project-card";
          }
        });
      }

      // Special handling for education with modern cards
      if (sectionId === "resume-education") {
        const eduDivs = doc.querySelectorAll("div");
        eduDivs.forEach((div) => {
          if (div.querySelector("h3")) {
            div.className += " creative-education-card";
          }
        });
      }

      // ENHANCED: Final check for main content sections too
      const finalTextContent = doc.body.textContent || "";
      const cleanFinalContent = finalTextContent.replace(/\s+/g, "").trim();

      if (!cleanFinalContent || cleanFinalContent.length === 0) {
        console.log(
          `Creative: Main section "${sectionId}" is empty after processing, hiding it`
        );
        return "";
      }
    }

    // Return processed HTML content
    return doc.body.innerHTML;
  } catch (error) {
    console.error(`Error enhancing creative content for ${sectionId}:`, error);
    // Return original content if processing fails
    return content;
  }
}

/**
 * Type guard to check if a section ID is valid for creative sections
 * Helps TypeScript understand that the key exists in our sections configuration
 * Also ensures the sectionId is a string type from Object.entries
 *
 * @param sectionId - Section ID to check (can be string or number from Object.entries)
 * @returns True if the section ID is valid for creative sections
 */
function isValidCreativeSection(
  sectionId: string | number
): sectionId is keyof CreativeSectionsType {
  return typeof sectionId === "string" && sectionId in creativeSections;
}

/**
 * ENHANCED: Apply creative template to content sections
 * Builds header conditionally and applies artistic styling with section-level colors
 * SIMPLIFIED: No more complex tag conversion, works with any content structure
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with creative template applied
 */
function applyCreativeTemplate(sections: TemplateContentSections): string {
  console.log(
    "Applying Creative template with artistic elements and colored section backgrounds"
  );

  // Start with the creative template structure
  let result = creativeTemplateHTML;

  // Process header section with creative conditional elements
  if (sections["resume-header"]) {
    console.log("Processing creative header with artistic styling");

    // Extract structured header information from raw content
    const headerInfo = extractHeaderInfo(sections["resume-header"]);

    // Build creative header HTML with artistic elements
    const creativeHeaderHTML = buildCreativeHeader(headerInfo);

    // Replace the header placeholder with our creative content
    const headerPlaceholder =
      "    <!-- Content will be inserted here based on available data -->";
    result = result.replace(headerPlaceholder, creativeHeaderHTML);
  } else {
    // Default creative header with artistic styling if no header section provided
    console.log("No header section found, using default creative header");

    const defaultHeaderHTML = buildCreativeHeader({
      name: "Full Name",
      title: "Creative Professional",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: null, // Will be conditionally excluded
      portfolio: "portfolio.com",
      address: "City, Country",
    });

    const headerPlaceholder =
      "    <!-- Content will be inserted here based on available data -->";
    result = result.replace(headerPlaceholder, defaultHeaderHTML);
  }

  // FIXED: Simple approach - process sections and mark empty ones for removal
  const sectionsToRemove: string[] = [];

  // Process all other sections with creative enhancements
  Object.entries(sections).forEach(([sectionId, content]) => {
    // Skip header section (already processed) and only process valid creative sections
    if (sectionId !== "resume-header" && isValidCreativeSection(sectionId)) {
      const sectionConfig = creativeSections[sectionId];

      // Additional safety check to ensure sectionConfig exists
      if (!sectionConfig) {
        console.warn(`No configuration found for section: ${sectionId}`);
        return;
      }

      const placeholder = `{{${sectionId}}}`;

      // Only process if the placeholder exists in the template
      if (result.includes(placeholder)) {
        console.log(
          `Creative: Processing ${sectionId} for ${sectionConfig.location} with section-specific styling`
        );

        // Enhance content with creative styling
        const enhancedContent = enhanceCreativeContent(
          content,
          sectionId,
          sectionConfig
        );

        // FIXED: If enhanced content is empty, mark section for removal
        if (!enhancedContent || enhancedContent.trim() === "") {
          console.log(
            `Creative: Section ${sectionId} is empty, marking for removal`
          );
          sectionsToRemove.push(sectionId);
          // Replace with placeholder for now
          result = result.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            "EMPTY_SECTION_TO_REMOVE"
          );
        } else {
          // Replace placeholder with enhanced content
          result = result.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            enhancedContent
          );
        }
      }
    }
  });

  // FIXED: Remove empty sections after processing all content
  sectionsToRemove.forEach((sectionId) => {
    // Simple regex to remove the specific section div
    const sectionRegex = new RegExp(
      `<div[^>]*id="${sectionId}"[^>]*>\\s*EMPTY_SECTION_TO_REMOVE\\s*</div>`,
      "g"
    );
    result = result.replace(sectionRegex, "");
    console.log(`Creative: Removed empty section container for ${sectionId}`);
  });

  // Clean up any remaining placeholders
  const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
  if (remainingPlaceholders) {
    console.log(
      `Creative: Cleaning ${remainingPlaceholders.length} remaining placeholders`
    );
    remainingPlaceholders.forEach((placeholder) => {
      const sectionId = placeholder.replace(/[{}]/g, "");

      // Remove the div for remaining placeholders
      const sectionRegex = new RegExp(
        `<div[^>]*id="${sectionId}"[^>]*>\\s*\\{\\{${sectionId}\\}\\}\\s*</div>`,
        "g"
      );
      result = result.replace(sectionRegex, "");
      console.log(
        `Creative: Removed container for unprocessed section: ${sectionId}`
      );
    });
  }

  console.log(
    "Creative template processing completed with artistic elements and colored section backgrounds"
  );
  return result;
}

/**
 * Creative template configuration object
 * Exported for use in the template registry
 * This object defines all properties needed for the CareerBoost template system
 */
export const creativeTemplate: ResumeTemplateType = {
  id: "creative", // Unique identifier for this template
  name: "Creative", // Display name shown to users in CareerBoost
  isPro: true, // Requires Pro subscription for CareerBoost
  previewClass: "border-t-4 border-purple-500", // Tailwind classes for preview styling
  description:
    "Innovative artistic layout with vibrant section colors and modern design elements for creative professionals", // Updated description
  styles: creativeStyles, // CSS styles for this template
  template: creativeTemplateHTML, // HTML structure template
  applyTemplate: applyCreativeTemplate, // Function to apply content to template
};
