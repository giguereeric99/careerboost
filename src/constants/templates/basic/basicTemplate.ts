/**
 * Basic Template Definition
 * Simple and clean layout suitable for most job applications
 */
import {
  ResumeTemplateType,
  TemplateContentSections,
} from "../../../types/resumeTemplateTypes";
import {
  extractHeaderInfo,
  createHeaderPlaceholderObject,
} from "../../../utils/templateUtils";
import { basicStyles } from "./basicStyles";

/**
 * Basic template HTML structure
 * Simple single-column layout with clean sections
 */
const basicTemplateHTML = `
<div class="resume-container basic-template">
  <div id="resume-header">
    <h1 class="section-title name">{{resume-header.name}}</h1>
    <p class="title">{{resume-header.title}}</p>
    <p>
      <span class="phone">{{resume-header.phone}}</span>
      <span class="email">{{resume-header.email}}</span>
      <span class="linkedin">{{resume-header.linkedin}}</span>
      <span class="portfolio">{{resume-header.portfolio}}</span>
    </p>
    <p><span class="address">{{resume-header.address}}</span></p>
  </div>
  
  <div class="section" id="resume-summary">
    {{resume-summary}}
  </div>
  
  <div class="section" id="resume-experience">
    {{resume-experience}}
  </div>
  
  <div class="section" id="resume-education">
    {{resume-education}}
  </div>
  
  <div class="section" id="resume-skills">
    {{resume-skills}}
  </div>
  
  <div class="section" id="resume-languages">
    {{resume-languages}}
  </div>
  
  <div class="section" id="resume-certifications">
    {{resume-certifications}}
  </div>
  
  <div class="section" id="resume-projects">
    {{resume-projects}}
  </div>
  
  <div class="section" id="resume-awards">
    {{resume-awards}}
  </div>
  
  <div class="section" id="resume-volunteering">
    {{resume-volunteering}}
  </div>
  
  <div class="section" id="resume-publications">
    {{resume-publications}}
  </div>
  
  <div class="section" id="resume-interests">
    {{resume-interests}}
  </div>
  
  <div class="section" id="resume-references">
    {{resume-references}}
  </div>
  
  <div class="section" id="resume-additional">
    {{resume-additional}}
  </div>
</div>
`;

/**
 * Apply basic template to content sections
 * Uses standardized header structure with smart placeholder replacement
 * Handles separator management through CSS
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with basic template applied
 */
function applyBasicTemplate(sections: TemplateContentSections): string {
  console.log("Applying Basic template with clean structure");

  // Start with the basic template structure
  let result = basicTemplateHTML;

  // Handle header section with placeholder system
  if (sections["resume-header"]) {
    console.log("Processing basic header section");

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
        console.log(`Basic template: Replaced ${placeholder} with: ${value}`);
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
        console.log(
          `Basic template: Removed unused placeholder: ${placeholder}`
        );
      });
    }

    // Clean up empty spans that might cause separator issues
    result = result.replace(/<span class="[^"]*"><\/span>/g, "");
  } else {
    // Default header if none provided
    console.log("No header section found, using default basic header");
    const defaultPlaceholders = {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      address: "City, Country",
    };

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
        console.log(`Basic template: Replacing section ${sectionId}`);
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
      `Basic template: Cleaning ${remainingPlaceholders.length} remaining placeholders`
    );
    remainingPlaceholders.forEach((placeholder) => {
      result = result.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    });
  }

  console.log("Basic template processing completed successfully");
  return result;
}

/**
 * Basic template configuration object
 * Exported for use in the template registry
 */
export const basicTemplate: ResumeTemplateType = {
  id: "basic",
  name: "Basic",
  isPro: false,
  previewClass: "border-l-4 border-brand-600",
  description: "Simple and clean layout suitable for most job applications",
  styles: basicStyles,
  template: basicTemplateHTML,
  applyTemplate: applyBasicTemplate,
};
