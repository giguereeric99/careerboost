/**
 * Resume Header Utilities
 *
 * Utilities for parsing and generating resume header HTML content
 * Handles extraction of structured data from HTML and reconstruction
 * with proper formatting for the standardized header structure
 */

/**
 * Interface for resume header data
 */
export interface ResumeHeaderData {
  name: string;
  title: string;
  phone: string;
  email: string;
  linkedin: string;
  portfolio: string;
  address: string;
}

/**
 * Parse resume header HTML to extract structured data
 * Handles various HTML structures and extracts contact information
 *
 * @param html - HTML content of the resume header section
 * @returns Structured header data with all fields extracted
 */
export function parseResumeHeader(html: string): ResumeHeaderData {
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Initialize header data with empty strings
  const headerData: ResumeHeaderData = {
    name: "",
    title: "",
    phone: "",
    email: "",
    linkedin: "",
    portfolio: "",
    address: "",
  };

  // Extract name from h1 with class "name" or any h1 in the header
  const nameElement = doc.querySelector("h1.name, h1");
  if (nameElement) {
    headerData.name = nameElement.textContent?.trim() || "";
  }

  // Extract professional title from element with class "title" or second line
  const titleElement = doc.querySelector(".title, p.title");
  if (titleElement) {
    headerData.title = titleElement.textContent?.trim() || "";
  }

  // Extract phone number
  const phoneElement = doc.querySelector(".phone");
  if (phoneElement) {
    headerData.phone = phoneElement.textContent?.trim() || "";
  } else {
    // Fallback: try to find phone pattern in text
    const allText = doc.body.textContent || "";
    const phoneRegex = /[\+\(\)\-\s\d]{7,20}/;
    const phoneMatch = allText.match(phoneRegex);
    if (phoneMatch) {
      // Additional check to ensure it's likely a phone number
      const digits = phoneMatch[0].replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 20) {
        headerData.phone = phoneMatch[0].trim();
      }
    }
  }

  // Extract email
  const emailElement = doc.querySelector(".email");
  if (emailElement) {
    headerData.email = emailElement.textContent?.trim() || "";
  } else {
    // Fallback: try to find email pattern in text
    const allText = doc.body.textContent || "";
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = allText.match(emailRegex);
    if (emailMatch) {
      headerData.email = emailMatch[0].trim();
    }
  }

  // Extract LinkedIn
  const linkedinElement = doc.querySelector(".linkedin");
  if (linkedinElement) {
    headerData.linkedin = linkedinElement.textContent?.trim() || "";
  }

  // Extract portfolio
  const portfolioElement = doc.querySelector(".portfolio");
  if (portfolioElement) {
    headerData.portfolio = portfolioElement.textContent?.trim() || "";
  }

  // Extract address - handle potential <br> tags and multiple lines
  const addressElement = doc.querySelector(".address");
  if (addressElement) {
    // Get the inner HTML and convert <br> to newlines
    let addressHtml = addressElement.innerHTML;

    // Replace <br> tags with newlines
    addressHtml = addressHtml.replace(/<br\s*\/?>/gi, "\n");

    // Remove any other HTML tags
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = addressHtml;

    // Get text content with preserved line breaks
    headerData.address = tempDiv.textContent?.trim() || "";
  }

  return headerData;
}

/**
 * Generate resume header HTML from structured data
 * Creates HTML following the standardized header structure required by the system
 * Only includes elements that have actual content
 *
 * @param data - Structured header data
 * @returns HTML string for the resume header
 */
export function generateResumeHeaderHtml(data: ResumeHeaderData): string {
  // Escape HTML to prevent XSS while preserving spaces
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Start building the header HTML
  let html = '<section id="resume-header">\n';

  // Add name (required field)
  if (data.name) {
    html += `  <h1 class="section-title name">${escapeHtml(data.name)}</h1>\n`;
  }

  // Add professional title if it exists
  if (data.title) {
    html += `  <p class="title">${escapeHtml(data.title)}</p>\n`;
  }

  // Build contact information paragraph
  const contactParts: string[] = [];

  if (data.phone) {
    contactParts.push(`<span class="phone">${escapeHtml(data.phone)}</span>`);
  }

  if (data.email) {
    contactParts.push(`<span class="email">${escapeHtml(data.email)}</span>`);
  }

  if (data.linkedin) {
    contactParts.push(
      `<span class="linkedin">${escapeHtml(data.linkedin)}</span>`
    );
  }

  if (data.portfolio) {
    contactParts.push(
      `<span class="portfolio">${escapeHtml(data.portfolio)}</span>`
    );
  }

  // Add contact paragraph if there are any contact elements
  if (contactParts.length > 0) {
    html += "  <p>\n    ";
    html += contactParts.join(" |\n    ");
    html += "\n  </p>\n";
  }

  // Add address if it exists
  if (data.address) {
    // Convert newlines to <br> tags for HTML display
    const formattedAddress = escapeHtml(data.address).replace(/\n/g, "<br>");
    html += `  <p><span class="address">${formattedAddress}</span></p>\n`;
  }

  // Close the section
  html += "</section>";

  return html;
}

/**
 * Validate email format
 *
 * @param email - Email address to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (international)
 * Accepts various international formats with flexible validation
 *
 * @param phone - Phone number to validate
 * @returns True if valid phone format
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters for validation
  const digits = phone.replace(/\D/g, "");

  // Check if it has between 7 and 20 digits (international range)
  if (digits.length < 7 || digits.length > 20) {
    return false;
  }

  // Check if the original format is reasonable
  // Allow digits, spaces, hyphens, dots, parentheses, and + sign
  const formatRegex = /^[\d\s\-\.\(\)\+]+$/;
  return formatRegex.test(phone);
}

/**
 * Validate LinkedIn URL or profile name
 *
 * @param linkedin - LinkedIn profile URL or username
 * @returns True if valid format
 */
export function isValidLinkedIn(linkedin: string): boolean {
  // Check if it's a full URL
  if (linkedin.includes("linkedin.com")) {
    // Validate LinkedIn URL format
    return /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[\w\-]+\/?$/i.test(
      linkedin
    );
  }

  // Check if it starts with 'in/' (common LinkedIn path format)
  if (linkedin.startsWith("in/")) {
    // Validate the username part after 'in/'
    return /^in\/[\w\-]+$/.test(linkedin);
  }

  // Otherwise, validate as a simple username
  // Allow alphanumeric characters, hyphens, and underscores
  return /^[\w\-]+$/.test(linkedin);
}

/**
 * Format phone number for display
 * Attempts to format phone numbers in a consistent way while preserving international formats
 *
 * @param phone - Raw phone number
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
  // If empty, return as is
  if (!phone) return "";

  // Remove all non-digit characters except + at the beginning
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  // If no digits, return original
  if (!digits) return phone;

  // For US/Canada numbers (10 or 11 digits starting with 1)
  if (
    digits.length === 10 ||
    (digits.length === 11 && digits.startsWith("1"))
  ) {
    const match = digits.match(/^1?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      const [, area, first, last] = match;
      return hasPlus
        ? `+1 (${area}) ${first}-${last}`
        : `(${area}) ${first}-${last}`;
    }
  }

  // For other formats, return the original input
  // This preserves international formats that may have specific formatting requirements
  return phone;
}

/**
 * Clean and normalize contact information
 * Removes extra whitespace and normalizes format
 *
 * @param data - Resume header data to clean
 * @returns Cleaned header data
 */
export function cleanHeaderData(data: ResumeHeaderData): ResumeHeaderData {
  return {
    name: data.name.trim(),
    title: data.title.trim(),
    phone: data.phone.trim(),
    email: data.email.trim().toLowerCase(),
    linkedin: data.linkedin.trim(),
    portfolio: data.portfolio.trim(),
    address: data.address.trim(),
  };
}

/**
 * Check if header data is valid for saving
 * Ensures required fields are present and valid
 *
 * @param data - Header data to validate
 * @returns Object with validation result and error messages
 */
export function validateHeaderData(data: ResumeHeaderData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Name is required
  if (!data.name || data.name.trim().length === 0) {
    errors.push("Name is required");
  }

  // Validate email if provided
  if (data.email && !isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }

  // Validate phone if provided
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push("Invalid phone number format");
  }

  // Validate LinkedIn if provided
  if (data.linkedin && !isValidLinkedIn(data.linkedin)) {
    errors.push("Invalid LinkedIn format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract initials from name
 * Useful for avatar generation or compact displays
 *
 * @param name - Full name
 * @returns Initials (up to 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return "";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  // Return first letter of first name and last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Format address for single-line display
 * Converts multi-line address to single line with comma separation
 *
 * @param address - Multi-line address
 * @returns Single-line formatted address
 */
export function formatAddressInline(address: string): string {
  if (!address) return "";

  // Split by newlines and filter empty lines
  const lines = address.split("\n").filter((line) => line.trim());

  // Join with comma and space
  return lines.join(", ");
}

/**
 * Check if a header field has meaningful content
 * Used to determine if a field should be displayed
 *
 * @param value - Field value to check
 * @returns True if field has meaningful content
 */
export function hasContent(value: string | undefined | null): boolean {
  if (!value) return false;

  // Check if it's just whitespace
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // Check if it's a placeholder or generic value
  const placeholders = ["n/a", "na", "none", "null", "undefined", "-", "--"];
  if (placeholders.includes(trimmed.toLowerCase())) return false;

  return true;
}

/**
 * Merge header data with defaults
 * Useful for handling partial data updates
 *
 * @param partial - Partial header data
 * @param defaults - Default header data
 * @returns Merged header data
 */
export function mergeHeaderData(
  partial: Partial<ResumeHeaderData>,
  defaults: ResumeHeaderData
): ResumeHeaderData {
  return {
    name: partial.name ?? defaults.name,
    title: partial.title ?? defaults.title,
    phone: partial.phone ?? defaults.phone,
    email: partial.email ?? defaults.email,
    linkedin: partial.linkedin ?? defaults.linkedin,
    portfolio: partial.portfolio ?? defaults.portfolio,
    address: partial.address ?? defaults.address,
  };
}
