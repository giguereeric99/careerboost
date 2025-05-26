/**
 * Template Utilities - Simplified Version
 * Functions for working with resume templates and content
 *
 * SIMPLIFICATION: Removed excessive contact validation
 * Data comes from the database, it's already validated and should be displayed
 *
 * Key Features:
 * - Standardized header structure with specific placeholders
 * - Smart separator handling (no trailing separators)
 * - Simple contact information processing (no excessive validation)
 * - Universal template compatibility
 * - Clean placeholder replacement system
 */

import {
  ResumeTemplateType,
  TemplateContentSections,
  HeaderInfo,
} from "../types/resumeTemplateTypes";
import {
  STANDARD_SECTIONS,
  ALTERNATIVE_SECTION_IDS,
} from "../constants/sections";
import { processAIResponse, applyDefaultStyling } from "./htmlProcessor";
import { ensureSectionTitleClasses } from "@/utils/resumeUtils";

/**
 * Simple function to check if a value is not empty
 * MUCH SIMPLER - no excessive validation
 *
 * @param value - The value to check
 * @returns Boolean indicating if the value is not empty
 */
function hasValue(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value.trim() !== "";
}

/**
 * Extract content from HTML by section ID
 * This function remains unchanged as it works well
 *
 * @param html - The HTML content containing resume sections
 * @returns Object with section IDs as keys and their HTML content as values
 */
export function extractSections(html: string): TemplateContentSections {
  if (!html) return {};

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const result: TemplateContentSections = {};

    // METHOD 1: Look for explicit sections first
    console.log("Extracting sections: Method 1 - Explicit sections");

    const explicitSections = doc.querySelectorAll(
      'section, div.section, div[id^="resume-"], div.section-creative'
    );

    if (explicitSections.length > 0) {
      console.log(`Found ${explicitSections.length} explicit sections`);

      explicitSections.forEach((section) => {
        if (section.id) {
          let sectionId = section.id;

          // Normalize section ID if needed
          if (!sectionId.startsWith("resume-")) {
            if (
              ALTERNATIVE_SECTION_IDS[
                sectionId as keyof typeof ALTERNATIVE_SECTION_IDS
              ]
            ) {
              sectionId =
                ALTERNATIVE_SECTION_IDS[
                  sectionId as keyof typeof ALTERNATIVE_SECTION_IDS
                ];
            } else {
              sectionId = `resume-${sectionId}`;
            }
          }

          result[sectionId] = section.innerHTML;
        }
      });
    }

    // METHOD 2: Look for section-title class elements
    if (Object.keys(result).length === 0) {
      console.log("Extracting sections: Method 2 - Section titles");

      const sectionTitles = doc.querySelectorAll(".section-title");

      sectionTitles.forEach((title, index) => {
        const sectionElement =
          title.closest("section") || title.closest('div[id^="resume-"]');

        if (sectionElement && sectionElement.id) {
          result[sectionElement.id] = sectionElement.innerHTML;
        } else {
          const titleText = title.textContent?.trim() || "";
          const sectionId =
            title.tagName === "H1" && index === 0
              ? "resume-header"
              : identifySectionType(titleText) || `resume-section-${index}`;

          let sectionContent = title.outerHTML;
          let currentNode = title.nextElementSibling;

          while (
            currentNode &&
            !currentNode.classList.contains("section-title")
          ) {
            sectionContent += currentNode.outerHTML;
            currentNode = currentNode.nextElementSibling;
          }

          result[sectionId] = sectionContent;
        }
      });
    }

    // METHOD 3: Fallback to headings
    if (Object.keys(result).length === 0) {
      console.log("Extracting sections: Method 3 - Headings fallback");

      const headings = doc.querySelectorAll("h1, h2, h3");

      headings.forEach((heading, index) => {
        const headingText = heading.textContent?.trim() || "";
        let sectionId = "";

        if (heading.tagName === "H1" && index === 0) {
          sectionId = "resume-header";

          let headerContent = heading.outerHTML;
          let currentNode = heading.nextElementSibling;

          while (
            currentNode &&
            !["H1", "H2", "H3"].includes(currentNode.tagName)
          ) {
            headerContent += currentNode.outerHTML;
            currentNode = currentNode.nextElementSibling;
          }

          result[sectionId] = headerContent;
        } else if (heading.tagName === "H2" || heading.tagName === "H3") {
          const identifiedSectionId = identifySectionType(headingText);
          sectionId =
            identifiedSectionId ||
            `resume-${headingText
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^\w\-]+/g, "")
              .substring(0, 20)}`;

          let sectionContent = heading.outerHTML;
          let currentNode = heading.nextElementSibling;

          while (
            currentNode &&
            !(
              ["H1", "H2"].includes(currentNode.tagName) ||
              (heading.tagName === "H3" && currentNode.tagName === "H3")
            )
          ) {
            sectionContent += currentNode.outerHTML;
            currentNode = currentNode.nextElementSibling;
          }

          result[sectionId] = sectionContent;
        }
      });
    }

    // Simple header cleanup without excessive validation
    if (result["resume-header"]) {
      result["resume-header"] = cleanHeaderSection(result["resume-header"]);
    }

    console.log(
      `Extracted ${Object.keys(result).length} sections:`,
      Object.keys(result)
    );
    return result;
  } catch (error) {
    console.error("Error extracting sections:", error);
    return {};
  }
}

/**
 * Identifies the section type based on the heading text
 * Enhanced with multilingual support (English/French)
 * This function remains unchanged
 *
 * @param headingText - The text of the heading to analyze
 * @returns The standard section ID or null if not identified
 */
function identifySectionType(headingText: string): string | null {
  if (!headingText) return null;

  const text = headingText.toLowerCase();

  // Map with common section keywords in English and French
  const sectionKeywords = {
    "resume-summary": [
      "summary",
      "profile",
      "about",
      "profil",
      "sommaire",
      "résumé",
      "aperçu",
      "à propos",
    ],
    "resume-experience": [
      "experience",
      "work",
      "employment",
      "expérience",
      "travail",
      "emploi",
      "parcours",
    ],
    "resume-education": [
      "education",
      "studies",
      "formation",
      "éducation",
      "études",
      "diplômes",
      "scolarité",
    ],
    "resume-skills": [
      "skill",
      "competence",
      "expertise",
      "compétence",
      "aptitude",
      "savoir-faire",
    ],
    "resume-languages": ["language", "langue", "idiomas", "linguistic"],
    "resume-certifications": [
      "certification",
      "credential",
      "licence",
      "accréditation",
    ],
    "resume-projects": [
      "project",
      "portfolio",
      "projet",
      "réalisation",
      "accomplissement",
    ],
    "resume-awards": [
      "award",
      "achievement",
      "honor",
      "prize",
      "recognition",
      "distinction",
      "prix",
      "récompense",
    ],
    "resume-volunteering": [
      "volunteer",
      "community",
      "bénévolat",
      "communauté",
      "associatif",
    ],
    "resume-publications": [
      "publication",
      "article",
      "paper",
      "livre",
      "ouvrage",
    ],
    "resume-interests": [
      "interest",
      "hobby",
      "activity",
      "pastime",
      "intérêt",
      "loisir",
      "activité",
      "passion",
    ],
    "resume-references": [
      "reference",
      "recommendation",
      "référence",
      "recommandation",
      "contact",
    ],
    "resume-additional": [
      "additional",
      "other",
      "more",
      "extra",
      "additionnel",
      "autre",
      "supplémentaire",
      "divers",
    ],
  };

  // Check each section type
  for (const [sectionId, keywords] of Object.entries(sectionKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return sectionId;
      }
    }
  }

  return null;
}

/**
 * Clean header section - SIMPLIFIED VERSION
 * Only removes truly empty entries, no excessive validation
 *
 * @param headerContent - HTML content of the header
 * @returns Cleaned HTML content
 */
function cleanHeaderSection(headerContent: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(headerContent, "text/html");

    // Only remove completely empty paragraphs
    const paragraphs = doc.querySelectorAll("p");

    paragraphs.forEach((paragraph) => {
      const text = paragraph.textContent?.trim() || "";

      // Only remove if completely empty or contains just spaces/separator characters
      if (
        text === "" ||
        text === "|" ||
        text === ":" ||
        text.match(/^[\s|:]+$/)
      ) {
        paragraph.remove();
        console.log("Removed empty paragraph:", text);
      }
    });

    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error cleaning header section:", error);
    return headerContent;
  }
}

/**
 * Extract structured information from the header content
 * SIMPLIFIED VERSION - no excessive validation, keep everything that has a value
 *
 * @param headerContent - HTML content of the header section
 * @returns Object with structured header information
 */
export function extractHeaderInfo(headerContent: string): HeaderInfo {
  try {
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerContent, "text/html");

    // Initialize result with default values
    const result: HeaderInfo = {
      name: "Full Name",
      phone: null,
      email: null,
      linkedin: null,
      portfolio: null,
      address: null,
      title: null,
    };

    // Extract name from h1
    const nameElement =
      headerDoc.querySelector("h1") ||
      headerDoc.querySelector("h2") ||
      headerDoc.querySelector("h3");
    if (nameElement && nameElement.textContent) {
      result.name = nameElement.textContent.trim();
    }

    // Extract professional title
    if (nameElement) {
      const nextElement = nameElement.nextElementSibling;
      if (
        nextElement &&
        nextElement.tagName === "P" &&
        nextElement.textContent
      ) {
        const titleCandidate = nextElement.textContent.trim();
        // Simple check - not email or phone
        if (
          titleCandidate.length > 0 &&
          !titleCandidate.includes("@") &&
          !titleCandidate.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/)
        ) {
          result.title = titleCandidate;
        }
      }
    }

    // If no title found, look for h2/h3 not marked as section-title
    if (!result.title) {
      const subHeading = headerDoc.querySelector(
        "h2:not(.section-title), h3:not(.section-title)"
      );
      if (subHeading && subHeading.textContent) {
        const titleCandidate = subHeading.textContent.trim();
        if (titleCandidate.length > 0) {
          result.title = titleCandidate;
        }
      }
    }

    // Extract contact information - SIMPLIFIED VERSION
    const allText = headerDoc.body.textContent || "";

    // Extract phone - VERY PERMISSIVE - Fixed null check
    const phoneElement = headerDoc.querySelector(".phone");
    if (
      phoneElement &&
      phoneElement.textContent &&
      hasValue(phoneElement.textContent)
    ) {
      result.phone = phoneElement.textContent.trim();
    } else {
      // Search for phone patterns in text - MORE PERMISSIVE
      const phonePatterns = [
        /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/, // North American format
        /(\+?\d{1,3}[-.\s]?)?\d{2}[-.\s]?\d{2}[-.\s]?\d{2}[-.\s]?\d{2}[-.\s]?\d{2}/, // French format
        /(\+?\d{1,4}[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/, // General international format
      ];

      for (const pattern of phonePatterns) {
        const phoneMatch = allText.match(pattern);
        if (phoneMatch && phoneMatch[0].length >= 6) {
          // At least 6 characters
          result.phone = phoneMatch[0].trim();
          break;
        }
      }
    }

    // Extract email - SIMPLE - Fixed null check
    const emailElement = headerDoc.querySelector(".email");
    if (
      emailElement &&
      emailElement.textContent &&
      hasValue(emailElement.textContent)
    ) {
      result.email = emailElement.textContent.trim();
    } else {
      const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        result.email = emailMatch[0].trim();
      }
    }

    // Extract LinkedIn - SIMPLE - Fixed null check
    const linkedinElement = headerDoc.querySelector(".linkedin, .social");
    if (
      linkedinElement &&
      linkedinElement.textContent &&
      hasValue(linkedinElement.textContent)
    ) {
      result.linkedin = linkedinElement.textContent.trim();
      console.log("LinkedIn found:", result.linkedin);
    } else {
      // Look for LinkedIn patterns in paragraphs
      const paragraphs = headerDoc.querySelectorAll("p");
      for (const p of paragraphs) {
        const text = p.textContent || "";
        if (text.toLowerCase().includes("linkedin") && text.length > 8) {
          // Take either LinkedIn URL or full text if it contains linkedin
          const linkedinMatch = text.match(
            /linkedin\.com\/in\/[\w-]+|linkedin\.com\/[\w-]+/i
          );
          if (linkedinMatch) {
            result.linkedin = linkedinMatch[0].trim();
          } else if (text.toLowerCase().includes("linkedin")) {
            result.linkedin = text.trim();
          }
          break;
        }
      }
    }

    // Extract portfolio - SIMPLE - Fixed null check
    const portfolioElement = headerDoc.querySelector(".link, .portfolio");
    if (
      portfolioElement &&
      portfolioElement.textContent &&
      hasValue(portfolioElement.textContent)
    ) {
      result.portfolio = portfolioElement.textContent.trim();
      console.log("Portfolio found:", result.portfolio);
    } else {
      // Look for portfolio patterns in paragraphs
      const paragraphs = headerDoc.querySelectorAll("p");
      for (const p of paragraphs) {
        const text = p.textContent || "";
        if (
          (text.toLowerCase().includes("portfolio") ||
            text.toLowerCase().includes("website")) &&
          text.length > 5
        ) {
          // Extract the part that follows "portfolio" or similar keywords
          const portfolioMatch = text.match(
            /(?:portfolio|website)(?:\s*[:;]\s*)([^|/\n]+)/i
          );
          if (portfolioMatch && portfolioMatch[1]) {
            result.portfolio = portfolioMatch[1].trim();
          } else {
            // Take the whole text if it contains portfolio/website
            result.portfolio = text.trim();
          }
          break;
        }
      }
    }

    // Extract address - SIMPLE
    const addressElement = headerDoc.querySelector(".address");
    if (addressElement) {
      let addressHtml = addressElement.innerHTML;
      // Convert <br> tags to newlines for proper storage
      addressHtml = addressHtml.replace(/<br\s*\/?>/gi, "\n");

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = addressHtml;
      const addressText = tempDiv.textContent || "";

      if (addressText.trim().length > 0) {
        result.address = addressText.trim();
        console.log("Address found:", addressText);
      }
    } else {
      // Fallback address detection from paragraphs
      const paragraphs = headerDoc.querySelectorAll("p");
      for (const p of paragraphs) {
        const text = p.textContent || "";
        // Look for typical address patterns
        if (
          (text.match(/\b[A-Z][0-9][A-Z]\s?[0-9][A-Z][0-9]\b/i) || // Canadian postal code
            text.includes("app.") ||
            text.match(/\bQuebec\b|\bQuébec\b|\bMontreal\b|\bMontréal\b/i) ||
            text.match(
              /\d+\s+\w+\s+(st|ave|rd|blvd|street|avenue|road|boulevard)/i
            )) && // Street address
          !text.includes("@") && // Not email
          !text.match(/\d{3}[-.\s]\d{3}[-.\s]\d{4}/) && // Not phone
          text.length > 5
        ) {
          result.address = text.trim();
          console.log("Address found in paragraph:", text);
          break;
        }
      }
    }

    console.log("Extracted header info:", result);
    return result;
  } catch (error) {
    console.error("Error extracting header info:", error);
    return {
      name: "Full Name",
      phone: null,
      email: null,
      linkedin: null,
      portfolio: null,
      address: null,
      title: null,
    };
  }
}

/**
 * Generate standardized header structure with smart separator handling
 * Creates the exact structure needed for template placeholder replacement
 * SIMPLIFIED: All contact info with values is included, no excessive validation
 *
 * @param headerInfo - Structured header information
 * @returns HTML string with standardized header structure and proper placeholders
 */
export function generateStandardizedHeader(headerInfo: HeaderInfo): string {
  console.log("Generating standardized header with simplified validation");

  // Collect valid contact elements for the contact line
  const contactElements: string[] = [];

  // Add contact elements if they have values - NO EXCESSIVE VALIDATION
  if (hasValue(headerInfo.phone)) {
    contactElements.push(`<span class="phone">${headerInfo.phone}</span>`);
  }

  if (hasValue(headerInfo.email)) {
    contactElements.push(`<span class="email">${headerInfo.email}</span>`);
  }

  if (hasValue(headerInfo.linkedin)) {
    contactElements.push(
      `<span class="linkedin">${headerInfo.linkedin}</span>`
    );
  }

  if (hasValue(headerInfo.portfolio)) {
    contactElements.push(
      `<span class="portfolio">${headerInfo.portfolio}</span>`
    );
  }

  // Build the header HTML
  let headerHtml = '<section id="resume-header">\n';

  // Add name (required)
  headerHtml += `  <h1 class="section-title name">${headerInfo.name}</h1>\n`;

  // Add professional title if it has value
  if (hasValue(headerInfo.title)) {
    headerHtml += `  <p class="title">${headerInfo.title}</p>\n`;
  }

  // Add contact line only if we have contact elements
  // Smart separator handling - no trailing separators
  if (contactElements.length > 0) {
    headerHtml += "  <p>\n";
    headerHtml += "    " + contactElements.join(" \n    ") + "\n";
    headerHtml += "  </p>\n";
  }

  // Add address in separate paragraph if it has value - Fixed null check
  if (hasValue(headerInfo.address) && headerInfo.address !== null) {
    const formattedAddress = headerInfo.address.replace(/\n/g, "<br>");
    headerHtml += `  <p><span class="address">${formattedAddress}</span></p>\n`;
  }

  headerHtml += "</section>";

  console.log("Standardized header generated successfully");
  return headerHtml;
}

/**
 * Create header object with placeholder values for template replacement
 * This generates the exact structure needed for the new template placeholder system
 * SIMPLIFIED: Include all fields that have values
 *
 * @param headerInfo - Structured header information
 * @returns Object with individual header fields for placeholder replacement
 */
export function createHeaderPlaceholderObject(
  headerInfo: HeaderInfo
): Record<string, string> {
  const headerObj: Record<string, string> = {};

  // Always include name
  headerObj.name = headerInfo.name || "Full Name";

  // Include other fields only if they have values - NO EXCESSIVE VALIDATION - Fixed type issues
  if (
    hasValue(headerInfo.title) &&
    headerInfo.title !== null &&
    headerInfo.title !== undefined
  ) {
    headerObj.title = headerInfo.title;
  }

  if (
    hasValue(headerInfo.phone) &&
    headerInfo.phone !== null &&
    headerInfo.phone !== undefined
  ) {
    headerObj.phone = headerInfo.phone;
  }

  if (
    hasValue(headerInfo.email) &&
    headerInfo.email !== null &&
    headerInfo.email !== undefined
  ) {
    headerObj.email = headerInfo.email;
  }

  if (
    hasValue(headerInfo.linkedin) &&
    headerInfo.linkedin !== null &&
    headerInfo.linkedin !== undefined
  ) {
    headerObj.linkedin = headerInfo.linkedin;
  }

  if (
    hasValue(headerInfo.portfolio) &&
    headerInfo.portfolio !== null &&
    headerInfo.portfolio !== undefined
  ) {
    headerObj.portfolio = headerInfo.portfolio;
  }

  if (
    hasValue(headerInfo.address) &&
    headerInfo.address !== null &&
    headerInfo.address !== undefined
  ) {
    headerObj.address = headerInfo.address.replace(/\n/g, "<br>");
  }

  console.log("Header placeholder object created:", headerObj);
  return headerObj;
}

/**
 * Apply template to resume content with new placeholder system
 * Enhanced to work with the new standardized header placeholders
 * Handles smart separator replacement and field validation
 *
 * @param template - The template to apply
 * @param sections - Object containing section content by ID
 * @returns Complete HTML with applied template and properly handled separators
 */
export function applyTemplateToContent(
  template: ResumeTemplateType,
  sections: TemplateContentSections
): string {
  console.log(
    `Applying template: ${template.id} with ${
      Object.keys(sections).length
    } sections`
  );

  // Use custom apply function if available
  if (template.applyTemplate) {
    console.log(`Using custom apply function for template: ${template.id}`);
    return template.applyTemplate(sections);
  }

  // Default implementation with enhanced header handling
  if (template.template) {
    console.log(
      `Using standard template replacement for template: ${template.id}`
    );
    let result = template.template;

    // Handle header section specially with new placeholder system
    if (sections["resume-header"]) {
      console.log("Processing header section with new placeholder system");

      // Extract header info
      const headerInfo = extractHeaderInfo(sections["resume-header"]);
      const headerPlaceholders = createHeaderPlaceholderObject(headerInfo);

      // Replace individual header placeholders
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

  // Fallback: concatenate sections if no template specified
  console.log("No template HTML found - using fallback concatenation method");

  let html = '<div class="resume-container">';

  if (sections["resume-header"]) {
    html += `<div id="resume-header">${sections["resume-header"]}</div>`;
  }

  STANDARD_SECTIONS.forEach((section) => {
    if (section.id !== "resume-header" && sections[section.id]) {
      html += `<div class="section" id="${section.id}">${
        sections[section.id]
      }</div>`;
    }
  });

  html += "</div>";
  return html;
}

/**
 * Creates a complete HTML document with template styling
 * Enhanced to work with the new standardized header structure and placeholder system
 *
 * @param template - The template to use
 * @param content - The HTML content to apply the template to
 * @param title - Optional title for the HTML document
 * @returns Complete HTML document as a string
 */
export function createCompleteHtml(
  template: ResumeTemplateType,
  content: string,
  title: string = "Resume"
): string {
  console.log(`Creating complete HTML with template: ${template.id}`);

  // Ensure all section titles have the proper class before processing
  const normalizedContent = ensureSectionTitleClasses(content);

  // Extract sections from content with enhanced validation
  const sections = extractSectionsWithValidation(normalizedContent);

  // Apply template to sections with new placeholder system
  const formattedContent = applyTemplateToContent(template, sections);

  // Create complete HTML document
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Professional resume created with CareerBoost">
  <title>${title}</title>
  <style>
    /* Reset and common styles */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    /* Template-specific styles */
    ${template.styles || ""}
    
    /* Print-specific styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      @page {
        margin: 1cm;
      }
    }
  </style>
</head>
<body>
  ${formattedContent}
</body>
</html>`;
}

/**
 * Enhanced section extraction with header validation and standardization
 * This is the main function to use for extracting sections with proper validation
 *
 * @param html - Complete HTML content
 * @returns Sections object with validated and standardized content
 */
export function extractSectionsWithValidation(
  html: string
): TemplateContentSections {
  // Extract sections normally
  const sections = extractSections(html);

  // Specially validate and standardize the header section
  if (sections["resume-header"]) {
    const headerInfo = extractHeaderInfo(sections["resume-header"]);
    sections["resume-header"] = generateStandardizedHeader(headerInfo);
    console.log("Header section validated and standardized");
  }

  return sections;
}

/**
 * Basic header generation using the standardized format
 * Alias for generateStandardizedHeader for backward compatibility
 *
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section
 */
export function generateBasicHeader(headerInfo: HeaderInfo): string {
  return generateStandardizedHeader(headerInfo);
}

/**
 * Professional header generation using the standardized format
 * Alias for generateStandardizedHeader for backward compatibility
 * Note: Professional styling is handled by template CSS, not structure
 *
 * @param headerInfo - Structured header information
 * @returns Formatted HTML for the header section
 */
export function generateProfessionalHeader(headerInfo: HeaderInfo): string {
  return generateStandardizedHeader(headerInfo);
}

/**
 * Utility function to validate contact information - SIMPLIFIED
 * Public interface for the internal validation function
 * Now only checks if value exists, no complex validation
 *
 * @param contactInfo - The contact information to validate
 * @param type - The type of contact information (for backward compatibility)
 * @returns Boolean indicating if the contact info has a value
 */
export function isValidContact(
  contactInfo: string | null | undefined,
  type: "linkedin" | "portfolio" | "phone" | "email" | "address" | "title"
): boolean {
  return hasValue(contactInfo);
}

/**
 * Debug function to analyze header processing step-by-step
 * Useful for troubleshooting contact information and separator issues
 *
 * @param headerContent - Header HTML content to debug
 * @returns Debug information object with all processing steps
 */
export function debugHeaderProcessing(headerContent: string): {
  originalContent: string;
  cleanedContent: string;
  extractedInfo: HeaderInfo;
  placeholderObject: Record<string, string>;
  standardizedHeader: string;
  validationResults: Record<string, boolean>;
} {
  console.log("Starting comprehensive header debug processing...");

  const cleanedContent = cleanHeaderSection(headerContent);
  const extractedInfo = extractHeaderInfo(cleanedContent);
  const placeholderObject = createHeaderPlaceholderObject(extractedInfo);
  const standardizedHeader = generateStandardizedHeader(extractedInfo);

  // Validate each field - simplified validation
  const validationResults = {
    name: !!extractedInfo.name && extractedInfo.name !== "Full Name",
    title: hasValue(extractedInfo.title),
    phone: hasValue(extractedInfo.phone),
    email: hasValue(extractedInfo.email),
    linkedin: hasValue(extractedInfo.linkedin),
    portfolio: hasValue(extractedInfo.portfolio),
    address: hasValue(extractedInfo.address),
  };

  const debugInfo = {
    originalContent: headerContent,
    cleanedContent,
    extractedInfo,
    placeholderObject,
    standardizedHeader,
    validationResults,
  };

  console.log("Comprehensive header debug info:", debugInfo);
  return debugInfo;
}

/**
 * Utility function to convert legacy header format to new standardized format
 * Useful for migrating existing resume data to the new template system
 *
 * @param legacyHeaderContent - Header content in old format
 * @returns Standardized header HTML compatible with new templates
 */
export function convertLegacyHeaderToStandardized(
  legacyHeaderContent: string
): string {
  console.log("Converting legacy header to standardized format");

  try {
    // Extract information from legacy format
    const headerInfo = extractHeaderInfo(legacyHeaderContent);

    // Generate new standardized format
    const standardizedHeader = generateStandardizedHeader(headerInfo);

    console.log("Legacy header successfully converted to standardized format");
    return standardizedHeader;
  } catch (error) {
    console.error("Error converting legacy header:", error);
    return legacyHeaderContent; // Return original if conversion fails
  }
}

/**
 * Validation function to check header structure compliance
 * Ensures header follows the new standardized format requirements
 *
 * @param headerContent - Header HTML content to validate
 * @returns Validation results with detailed feedback
 */
export function validateHeaderStructure(headerContent: string): {
  isValid: boolean;
  hasStandardizedStructure: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;
  let hasStandardizedStructure = true;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(headerContent, "text/html");

    // Check for required section structure
    const sectionElement = doc.querySelector("section#resume-header");
    if (!sectionElement) {
      issues.push("Missing section tag with id='resume-header'");
      recommendations.push(
        "Wrap header content in <section id='resume-header'>"
      );
      isValid = false;
      hasStandardizedStructure = false;
    }

    // Check for required h1 with proper classes
    const h1Element = doc.querySelector("h1.section-title.name");
    if (!h1Element) {
      issues.push("Missing h1 with classes 'section-title name'");
      recommendations.push(
        "Add <h1 class='section-title name'> for the person's name"
      );
      isValid = false;
      hasStandardizedStructure = false;
    }

    // Check for contact information structure
    const contactParagraphs = doc.querySelectorAll("p");
    let hasProperContactStructure = false;
    let hasTrailingSeparators = false;

    contactParagraphs.forEach((p) => {
      const text = p.textContent || "";
      const html = p.innerHTML;

      // Check for proper span structure
      const spans = p.querySelectorAll(
        "span.phone, span.email, span.linkedin, span.portfolio"
      );
      if (spans.length > 0) {
        hasProperContactStructure = true;
      }

      // Check for trailing separators (simple check)
      if (
        text.endsWith("|") ||
        text.endsWith(":") ||
        html.endsWith(" |") ||
        html.endsWith(" :")
      ) {
        hasTrailingSeparators = true;
      }
    });

    if (!hasProperContactStructure) {
      issues.push("Contact information lacks proper span structure");
      recommendations.push(
        "Wrap contact info in spans with classes: phone, email, linkedin, portfolio"
      );
      hasStandardizedStructure = false;
    }

    if (hasTrailingSeparators) {
      issues.push("Header contains trailing separators");
      recommendations.push(
        "Remove trailing separators and ensure proper separator placement"
      );
      isValid = false;
    }

    // Check for address structure
    const addressElement = doc.querySelector("span.address");
    if (addressElement) {
      const addressParagraph = addressElement.closest("p");
      if (!addressParagraph) {
        issues.push("Address span not properly wrapped in paragraph");
        recommendations.push("Place address span inside its own paragraph");
        hasStandardizedStructure = false;
      }
    }

    return {
      isValid,
      hasStandardizedStructure,
      issues,
      recommendations,
    };
  } catch (error) {
    console.error("Error validating header structure:", error);
    return {
      isValid: false,
      hasStandardizedStructure: false,
      issues: ["Error parsing header content"],
      recommendations: ["Check header HTML syntax"],
    };
  }
}

/**
 * Generate sample header for testing and documentation
 * Creates example standardized headers with various contact combinations
 *
 * @param variant - Type of sample to generate
 * @param language - Language for sample data
 * @returns Sample standardized header HTML
 */
export function generateSampleHeader(
  variant: "complete" | "minimal" | "no-social" | "french" = "complete",
  language: string = "English"
): string {
  const samples = {
    complete: {
      name: language === "French" ? "Jean Dupuis" : "John Doe",
      title: language === "French" ? "Développeur Senior" : "Senior Developer",
      phone: language === "French" ? "06 45 78 12 34" : "418-261-9999",
      email:
        language === "French" ? "jean.dupuis@email.fr" : "john.doe@email.com",
      linkedin:
        language === "French"
          ? "linkedin.com/in/jeandupuis"
          : "linkedin.com/in/johndoe",
      portfolio:
        language === "French"
          ? "portfolio.jeandupuis.fr"
          : "johndoe.portfolio.com",
      address:
        language === "French"
          ? "14 rue des Lilas\n75012 Paris, France"
          : "9999 ave Villa Saint-Vincent app.999\nQuébec, Québec G1H 4B6",
    },
    minimal: {
      name: language === "French" ? "Marie Martin" : "Jane Smith",
      title: null,
      phone: language === "French" ? "07 12 34 56 78" : "514-555-1234",
      email:
        language === "French"
          ? "marie.martin@email.fr"
          : "jane.smith@email.com",
      linkedin: null,
      portfolio: null,
      address: null,
    },
    "no-social": {
      name: language === "French" ? "Pierre Moreau" : "Bob Johnson",
      title: language === "French" ? "Gestionnaire" : "Manager",
      phone: language === "French" ? "01 23 45 67 89" : "613-555-7890",
      email:
        language === "French"
          ? "pierre.moreau@email.fr"
          : "bob.johnson@email.com",
      linkedin: null,
      portfolio: null,
      address:
        language === "French"
          ? "25 avenue de la République\n69003 Lyon, France"
          : "789 Pine Road\nToronto, ON M1B 2C3",
    },
    french: {
      name: "Sophie Dubois",
      title: "Architecte Logiciel",
      phone: "02 98 76 54 32",
      email: "sophie.dubois@email.fr",
      linkedin: "linkedin.com/in/sophiedubois",
      portfolio: "sophie-dubois.dev",
      address: "42 boulevard Saint-Germain\n75005 Paris, France",
    },
  };

  const sampleInfo = samples[variant] as HeaderInfo;
  return generateStandardizedHeader(sampleInfo);
}

/**
 * Utility function to preprocess header content before extraction
 * Adds missing spans for contact information that might be in plain text
 *
 * @param headerContent - HTML content of the header
 * @returns Processed HTML with proper span tags
 */
export function preprocessHeaderContent(headerContent: string): string {
  try {
    const parser = new DOMParser();
    const headerDoc = parser.parseFromString(headerContent, "text/html");

    // Process paragraphs in the header that contain contact information
    const paragraphs = headerDoc.querySelectorAll("p");

    paragraphs.forEach((paragraph) => {
      // Skip paragraphs that are already fully wrapped in spans
      if (
        paragraph.childNodes.length === 1 &&
        paragraph.firstChild?.nodeType === Node.ELEMENT_NODE
      ) {
        return;
      }

      // Process text nodes and elements in the paragraph
      let newInnerHTML = "";
      let lastNodeWasElement = false;

      paragraph.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim() || "";

          if (text) {
            // Identify the type of content by keywords - SIMPLIFIED
            if (
              text.includes("Portfolio") ||
              text.includes("Website") ||
              text.includes("Site")
            ) {
              newInnerHTML += ` <span class="link">${text}</span>`;
            } else if (text.includes("LinkedIn") || text.includes("Github")) {
              newInnerHTML += ` <span class="social">${text}</span>`;
            } else if (
              text.includes(":") ||
              text.includes("/") ||
              text.includes("|")
            ) {
              // This is likely a separator, keep it as is
              newInnerHTML += text;
            } else {
              // Generic content with no obvious type
              newInnerHTML += ` <span class="contact-info">${text}</span>`;
            }

            lastNodeWasElement = false;
          } else if (
            text === " " ||
            text === "/" ||
            text === "|" ||
            text === ":"
          ) {
            // Preserve separators
            newInnerHTML += text;
            lastNodeWasElement = false;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Preserve existing elements
          newInnerHTML +=
            (lastNodeWasElement ? " " : "") + (node as Element).outerHTML;
          lastNodeWasElement = true;
        }
      });

      // Update paragraph content if changes were made
      if (newInnerHTML.trim()) {
        paragraph.innerHTML = newInnerHTML.trim();
      }
    });

    return headerDoc.body.innerHTML;
  } catch (error) {
    console.error("Error preprocessing header content:", error);
    return headerContent;
  }
}
