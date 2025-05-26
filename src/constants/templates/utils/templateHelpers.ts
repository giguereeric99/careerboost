/**
 * Template Helper Functions
 * Common utilities shared across all templates
 */
import { HeaderInfo } from "../../../types/resumeTemplateTypes";

/**
 * Create clean contact line without manual separators
 * CSS will handle separators via ::before pseudo-elements
 *
 * @param contacts - Array of contact objects with type and value
 * @returns HTML string with properly structured contact spans
 */
export function createContactLine(
  contacts: Array<{ type: string; value: string; className?: string }>
): string {
  if (!contacts || contacts.length === 0) return "";

  const contactSpans = contacts
    .filter((contact) => contact.value && contact.value.trim())
    .map((contact) => {
      const className = contact.className || `${contact.type}`;
      return `<span class="${className}">${contact.value}</span>`;
    });

  return contactSpans.length > 0
    ? `<p>\n      ${contactSpans.join("\n      ")}\n    </p>`
    : "";
}

/**
 * Clean and format address for display
 * Handles line breaks and formatting
 *
 * @param address - Raw address string
 * @returns Formatted address HTML
 */
export function formatAddress(address: string | null): string {
  if (!address || !address.trim()) return "";

  const formattedAddress = address.replace(/\n/g, "<br>");
  return `<p><span class="address">${formattedAddress}</span></p>`;
}

/**
 * Add professional icon to section title
 * Shared logic for adding Bootstrap icons to titles
 *
 * @param title - Section title text
 * @param icon - Bootstrap icon name
 * @param className - CSS class for the title element
 * @returns HTML string with icon and title
 */
export function addIconToTitle(
  title: string,
  icon: string,
  className: string = "section-title"
): string {
  return `<h2 class="${className}">
    <img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${icon}.svg" alt="${title}"> ${title}
  </h2>`;
}

/**
 * Process content with DOM parser safely
 * Handles parsing errors gracefully
 *
 * @param content - HTML content to process
 * @param processor - Function to process the parsed document
 * @returns Processed HTML content or original content if parsing fails
 */
export function processContentSafely(
  content: string,
  processor: (doc: Document) => void
): string {
  if (!content || !content.trim()) return "";

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    processor(doc);

    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error processing content:", error);
    return content; // Return original content if processing fails
  }
}

/**
 * Clean up template placeholders
 * Removes any remaining unreplaced placeholders
 *
 * @param html - HTML content with potential placeholders
 * @returns Clean HTML without placeholders
 */
export function cleanupPlaceholders(html: string): string {
  // Remove any remaining placeholders
  let result = html.replace(/\{\{[^}]+\}\}/g, "");

  // Remove empty spans that might cause separator issues
  result = result.replace(/<span class="[^"]*"><\/span>/g, "");

  // Clean up multiple consecutive separators
  result = result.replace(/\|\s*\|/g, "|");

  // Remove trailing separators before closing tags
  result = result.replace(/\s*\|\s*<\/(p|div)>/g, "</$1>");

  return result;
}

/**
 * Validate section content
 * Checks if section has meaningful content
 *
 * @param content - Section content to validate
 * @returns Boolean indicating if content is valid and not empty
 */
export function isValidSectionContent(content: string): boolean {
  if (!content || !content.trim()) return false;

  // Remove HTML tags and check if there's actual text content
  const textContent = content.replace(/<[^>]*>/g, "").trim();

  // Consider content valid if it has more than just whitespace
  return textContent.length > 0;
}

/**
 * Generate responsive image tag for icons
 * Creates optimized icon markup
 *
 * @param iconName - Bootstrap icon name
 * @param alt - Alt text for accessibility
 * @param className - CSS class for styling
 * @returns Optimized icon HTML
 */
export function generateIcon(
  iconName: string,
  alt: string,
  className: string = "icon"
): string {
  return `<img class="${className}" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${iconName}.svg" alt="${alt}" loading="lazy">`;
}

/**
 * Create default header structure
 * Fallback for when no header content is provided
 *
 * @param templateType - Type of template (basic, professional, etc.)
 * @returns Default header HTML structure
 */
export function createDefaultHeader(
  templateType: string = "basic"
): HeaderInfo {
  const defaults: Record<string, HeaderInfo> = {
    basic: {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: null,
      portfolio: null,
      address: "City, Country",
      title: null,
    },
    professional: {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: "linkedin.com/in/username",
      portfolio: null,
      address: "City, Country",
      title: "Professional Title",
    },
    creative: {
      name: "Full Name",
      phone: "(123) 456-7890",
      email: "example@email.com",
      linkedin: "linkedin.com/in/username",
      portfolio: "portfolio.com",
      address: "City, Country",
      title: "Creative Professional",
    },
  };

  return defaults[templateType] || defaults.basic;
}
