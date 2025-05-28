/**
 * Technical Template Definition - MODERN TECH PROFESSIONAL DESIGN
 * Clean, code-inspired layout perfect for developers, engineers, and IT professionals
 * Features terminal-like elements, syntax highlighting colors, and tech-focused styling
 * FIXED: Conditional display of header elements and TypeScript safety
 */
import {
	ResumeTemplateType,
	TemplateContentSections,
} from "../../../types/resumeTemplateTypes";
import {
	extractHeaderInfo,
	createHeaderPlaceholderObject,
} from "../../../utils/templateUtils";
import { technicalStyles } from "./technicalStyles";

/**
 * Technical template HTML structure
 * Modern tech-inspired layout with terminal elements and code styling
 * NOTE: Header elements will be conditionally added based on available content
 */
const technicalTemplateHTML = `
<div class="technical-resume-container">
  <!-- Technical Header Section with Terminal Elements -->
  <div id="resume-header" class="technical-header">
    <!-- Content will be inserted here based on available data -->
  </div>

  <!-- Main Content Wrapper -->
  <div class="technical-content-wrapper">
    
    <!-- Technical Sidebar -->
    <div class="technical-sidebar">
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
    <div class="technical-main">
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
 * Type definition for technical section configuration
 * Defines the structure of each section with tech-specific properties
 */
type TechnicalSectionConfig = {
	icon: string;
	location: "main" | "sidebar";
	techColor: string; // Color scheme for tech elements
};

/**
 * Type definition for technical sections mapping
 * Maps section IDs to their configuration to ensure type safety
 */
type TechnicalSectionsType = {
	"resume-summary": TechnicalSectionConfig;
	"resume-experience": TechnicalSectionConfig;
	"resume-projects": TechnicalSectionConfig;
	"resume-education": TechnicalSectionConfig;
	"resume-awards": TechnicalSectionConfig;
	"resume-publications": TechnicalSectionConfig;
	"resume-volunteering": TechnicalSectionConfig;
	"resume-references": TechnicalSectionConfig;
	"resume-additional": TechnicalSectionConfig;
	"resume-skills": TechnicalSectionConfig;
	"resume-languages": TechnicalSectionConfig;
	"resume-certifications": TechnicalSectionConfig;
	"resume-interests": TechnicalSectionConfig;
};

/**
 * Section configuration for technical template
 * Defines icons, layout location, and tech colors for each resume section
 * FIXED: Properly typed to avoid TypeScript indexing errors
 */
const technicalSections: TechnicalSectionsType = {
	// Main content sections - displayed in the main column with terminal styling
	"resume-summary": {
		icon: "person-badge-fill",
		location: "main",
		techColor: "#4299e1",
	},
	"resume-experience": {
		icon: "code-slash",
		location: "main",
		techColor: "#48bb78",
	},
	"resume-projects": {
		icon: "folder-fill",
		location: "main",
		techColor: "#38b2ac",
	},
	"resume-education": {
		icon: "mortarboard-fill",
		location: "main",
		techColor: "#4299e1",
	},
	"resume-awards": {
		icon: "award-fill",
		location: "main",
		techColor: "#ed8936",
	},
	"resume-publications": {
		icon: "journal-code",
		location: "main",
		techColor: "#9f7aea",
	},
	"resume-volunteering": {
		icon: "heart-fill",
		location: "main",
		techColor: "#f56565",
	},
	"resume-references": {
		icon: "people-fill",
		location: "main",
		techColor: "#718096",
	},
	"resume-additional": {
		icon: "plus-circle-fill",
		location: "main",
		techColor: "#718096",
	},

	// Sidebar sections - displayed in the sidebar with tech-inspired styling
	"resume-skills": {
		icon: "cpu-fill",
		location: "sidebar",
		techColor: "#4299e1",
	},
	"resume-languages": {
		icon: "translate",
		location: "sidebar",
		techColor: "#48bb78",
	},
	"resume-certifications": {
		icon: "shield-fill-check",
		location: "sidebar",
		techColor: "#38b2ac",
	},
	"resume-interests": {
		icon: "controller",
		location: "sidebar",
		techColor: "#ed8936",
	},
};

/**
 * ENHANCED: Build conditional header HTML with technical styling
 * Only includes elements that have actual content with terminal-like presentation
 * Creates tech-inspired contact layout with monospace fonts and terminal colors
 *
 * @param headerInfo - Extracted header information from resume content
 * @returns Complete header HTML with technical elements and only available data
 */
function buildTechnicalHeader(headerInfo: any): string {
	console.log(
		"Building technical header with terminal-inspired elements",
		headerInfo
	);

	let headerHTML = "";

	// Always include name (required field for any resume) with tech styling
	headerHTML += `    <h1 class="section-title name technical-name">${
		headerInfo.name || "Full Name"
	}</h1>\n`;

	// Conditionally include professional title with terminal-like styling
	if (headerInfo.title && headerInfo.title.trim()) {
		headerHTML += `    <p class="title technical-title">${headerInfo.title}</p>\n`;
	}

	// Build contacts array with tech-inspired icons and terminal styling
	const contactElements: string[] = [];

	// Add phone contact with tech icon if provided
	if (headerInfo.phone && headerInfo.phone.trim()) {
		contactElements.push(
			`<div class="technical-contact">
        <img class="technical-contact-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/telephone-fill.svg" alt="Phone">
        <span>${headerInfo.phone}</span>
      </div>`
		);
	}

	// Add email contact with tech icon if provided
	if (headerInfo.email && headerInfo.email.trim()) {
		contactElements.push(
			`<div class="technical-contact">
        <img class="technical-contact-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/envelope-at-fill.svg" alt="Email">
        <span>${headerInfo.email}</span>
      </div>`
		);
	}

	// Add LinkedIn contact with tech icon if provided
	if (headerInfo.linkedin && headerInfo.linkedin.trim()) {
		contactElements.push(
			`<div class="technical-contact">
        <img class="technical-contact-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/linkedin.svg" alt="LinkedIn">
        <span>${headerInfo.linkedin}</span>
      </div>`
		);
	}

	// Add portfolio/GitHub with tech icon if provided
	if (headerInfo.portfolio && headerInfo.portfolio.trim()) {
		contactElements.push(
			`<div class="technical-contact">
        <img class="technical-contact-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/globe2.svg" alt="Portfolio">
        <span>${headerInfo.portfolio}</span>
      </div>`
		);
	}

	// Only add contacts section if we have at least one contact method
	if (contactElements.length > 0) {
		headerHTML += `    <div class="technical-contacts">\n`;
		headerHTML += `      ${contactElements.join("\n      ")}\n`;
		headerHTML += `    </div>\n`;
	}

	// Conditionally include address with tech styling if provided
	if (headerInfo.address && headerInfo.address.trim()) {
		const formattedAddress = headerInfo.address.replace(/\n/g, "<br>");
		headerHTML += `    <div class="technical-address">${formattedAddress}</div>\n`;
	}

	console.log(
		`Technical header built with ${contactElements.length} contacts and terminal-inspired styling`
	);

	return headerHTML;
}

/**
 * Enhanced content processor with technical styling and terminal elements
 * Adds tech-focused styling while preserving existing titles and multilingual support
 * Implements terminal prompts and code-inspired visual elements
 *
 * @param content - Original section content from resume data
 * @param sectionId - ID of the section being processed
 * @param config - Section configuration (icon, location, tech color)
 * @returns Enhanced HTML content with technical styling
 */
function enhanceTechnicalContent(
	content: string,
	sectionId: string,
	config: TechnicalSectionConfig
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
			// Keep the existing title text and language, add technical styling with icon
			const existingTitle = titleElement.textContent?.trim() || "";

			// Add Bootstrap icon with terminal-like styling
			titleElement.innerHTML = `<img class="technical-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${config.icon}.svg" alt="${existingTitle}"> ${existingTitle}`;

			// Update classes for technical styling
			titleElement.className = "section-title technical-section-title";

			console.log(
				`Technical: Enhanced section "${sectionId}" with terminal-style icon, kept title: "${existingTitle}"`
			);
		} else {
			console.log(
				`Technical: No h2 title found in section "${sectionId}", content will be used as-is`
			);
		}

		// Apply location-specific technical enhancements
		if (config.location === "sidebar") {
			// Sidebar-specific enhancements with terminal-like styling
			const lists = doc.querySelectorAll("ul");
			lists.forEach((list) => {
				if (!list.className.includes("technical-sidebar-list")) {
					list.className += " technical-sidebar-list";
				}
			});

			const listItems = doc.querySelectorAll("li");
			listItems.forEach((item) => {
				if (!item.className.includes("technical-sidebar-item")) {
					item.className += " technical-sidebar-item";
				}
			});
		} else if (config.location === "main") {
			// Main content enhancements with terminal-inspired styling
			const paragraphs = doc.querySelectorAll("p");
			paragraphs.forEach((p) => {
				if (!p.className.includes("technical-content")) {
					p.className += " technical-content";
				}
			});

			// Special handling for experience section with tech job styling
			if (sectionId === "resume-experience") {
				const jobDivs = doc.querySelectorAll("div");
				jobDivs.forEach((div) => {
					if (div.querySelector("h3")) {
						div.className += " technical-job";
					}
				});
			}

			// Special handling for education section with tech education styling
			if (sectionId === "resume-education") {
				const eduDivs = doc.querySelectorAll("div");
				eduDivs.forEach((div) => {
					if (div.querySelector("h3")) {
						div.className += " technical-education";
					}
				});
			}

			// Special handling for projects section with tech project styling
			if (sectionId === "resume-projects") {
				const projectDivs = doc.querySelectorAll("div");
				projectDivs.forEach((div) => {
					if (div.querySelector("h3")) {
						div.className += " technical-project";
					}
				});
			}
		}

		// Return processed HTML content
		return doc.body.innerHTML;
	} catch (error) {
		console.error(`Error enhancing technical content for ${sectionId}:`, error);
		// Fallback: return original content without modifications if parsing fails
		return content;
	}
}

/**
 * Type guard to check if a section ID is valid for technical sections
 * Helps TypeScript understand that the key exists in our sections configuration
 * Also ensures the sectionId is a string type
 *
 * @param sectionId - Section ID to check (can be string or number from Object.entries)
 * @returns True if the section ID is valid for technical sections
 */
function isValidTechnicalSection(
	sectionId: string | number
): sectionId is keyof TechnicalSectionsType {
	return typeof sectionId === "string" && sectionId in technicalSections;
}

/**
 * ENHANCED: Apply technical template to content sections
 * Builds header conditionally and applies terminal-inspired styling
 * FIXED: TypeScript errors for section indexing with proper type guards
 * This is the main function that processes resume data and applies the technical template
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with technical template applied
 */
function applyTechnicalTemplate(sections: TemplateContentSections): string {
	console.log(
		"Applying Technical template with terminal-inspired elements and tech styling"
	);

	// Start with the technical template structure
	let result = technicalTemplateHTML;

	// Process header section with conditional technical elements
	if (sections["resume-header"]) {
		console.log("Processing technical header with terminal-like styling");

		// Extract structured header information from raw content
		const headerInfo = extractHeaderInfo(sections["resume-header"]);

		// Build conditional technical header HTML with terminal elements
		const technicalHeaderHTML = buildTechnicalHeader(headerInfo);

		// Replace the header placeholder with our technical content
		const headerPlaceholder =
			"    <!-- Content will be inserted here based on available data -->";
		result = result.replace(headerPlaceholder, technicalHeaderHTML);
	} else {
		// Default technical header with tech-focused info if no header section provided
		console.log("No header section found, using default technical header");

		const defaultHeaderHTML = buildTechnicalHeader({
			name: "Full Name",
			title: "Software Developer",
			phone: "(123) 456-7890",
			email: "developer@email.com",
			linkedin: null, // Will be conditionally excluded
			portfolio: "github.com/username",
			address: "City, Country",
		});

		const headerPlaceholder =
			"    <!-- Content will be inserted here based on available data -->";
		result = result.replace(headerPlaceholder, defaultHeaderHTML);
	}

	// Process all other sections with technical enhancements
	// FIXED: Using type guard to ensure TypeScript safety
	Object.entries(sections).forEach(([sectionId, content]) => {
		// Skip header section (already processed) and only process valid technical sections
		if (sectionId !== "resume-header" && isValidTechnicalSection(sectionId)) {
			const sectionConfig = technicalSections[sectionId];

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
					`Technical: Processing ${sectionId} for ${sectionConfig.location} - preserving existing title with tech styling`
				);

				// Enhance content with technical styling and terminal elements
				const enhancedContent = enhanceTechnicalContent(
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
			`Technical: Cleaning ${remainingPlaceholders.length} remaining placeholders`
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
		"Technical template processing completed with terminal-inspired elements and tech styling"
	);
	return result;
}

/**
 * Technical template configuration object
 * Exported for use in the template registry
 * This object defines all properties needed for the CareerBoost template system
 */
export const technicalTemplate: ResumeTemplateType = {
	id: "technical", // Unique identifier for this template
	name: "Technical", // Display name shown to users
	isPro: true, // Requires Pro subscription for CareerBoost
	previewClass: "border-t-4 border-blue-500", // Tailwind classes for preview styling
	description:
		"Modern tech-inspired layout with terminal elements and code styling perfect for developers and IT professionals", // User-facing description
	styles: technicalStyles, // CSS styles for this template
	template: technicalTemplateHTML, // HTML structure template
	applyTemplate: applyTechnicalTemplate, // Function to apply content to template
};
