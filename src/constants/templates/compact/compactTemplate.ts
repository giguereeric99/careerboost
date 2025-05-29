/**
 * Compact Template Definition - 2 COLUMNS SPACE-OPTIMIZED
 * Ultra-compact template that maximizes space utilization for content-heavy resumes
 * Ideal for professionals with extensive experience who need everything on one page
 * Minimalist design with condensed sections and optimized typography - 2 COLUMN LAYOUT
 */
import {
	ResumeTemplateType,
	TemplateContentSections,
} from "../../../types/resumeTemplateTypes";
import {
	extractHeaderInfo,
	createHeaderPlaceholderObject,
} from "../../../utils/templateUtils";
import { compactStyles } from "./compactStyles";

/**
 * Compact template HTML structure - 2 COLUMN LAYOUT
 * Ultra-compact structure with minimalist header and 2-column layout on desktop
 * Mobile: automatically switches to single column for readability
 */
const compactTemplateHTML = `
<div class="compact-resume-container">
  <!-- Minimalist Header Section - Reduced height for space efficiency -->
  <div id="resume-header" class="compact-header">
    <!-- Content will be inserted conditionally based on available data -->
  </div>

  <!-- Main Content Wrapper with Compact 2-Column Layout -->
  <div class="compact-content-wrapper">
    
    <!-- Left Column - Skills and Supplementary Information -->
    <div class="compact-left-column">
      <!-- Skills with compact tag display -->
      <div class="section compact-section compact-skills-section" id="resume-skills">
        {{resume-skills}}
      </div>
      
      <!-- Languages with level indicators -->
      <div class="section compact-section compact-languages-section" id="resume-languages">
        {{resume-languages}}
      </div>
      
      <!-- Certifications with compact dates -->
      <div class="section compact-section compact-certifications-section" id="resume-certifications">
        {{resume-certifications}}
      </div>
      
      <!-- Interests with minimal display -->
      <div class="section compact-section compact-interests-section" id="resume-interests">
        {{resume-interests}}
      </div>

      <!-- Awards with compact styling -->
      <div class="section compact-section compact-awards-section" id="resume-awards">
        {{resume-awards}}
      </div>

      <!-- Volunteering with condensed entries - MOVED HERE -->
      <div class="section compact-section compact-volunteering-section" id="resume-volunteering">
        {{resume-volunteering}}
      </div>
    </div>

    <!-- Right Column - Primary Content -->
    <div class="compact-right-column">
      <!-- Summary with condensed format -->
      <div class="section compact-section compact-summary-section" id="resume-summary">
        {{resume-summary}}
      </div>
      
      <!-- Experience with timeline and compact job entries -->
      <div class="section compact-section compact-experience-section" id="resume-experience">
        {{resume-experience}}
      </div>

      <!-- Education with compact degree display - MOVED AFTER EXPERIENCE -->
      <div class="section compact-section compact-education-section" id="resume-education">
        {{resume-education}}
      </div>
      
      <!-- Projects with condensed display -->
      <div class="section compact-section compact-projects-section" id="resume-projects">
        {{resume-projects}}
      </div>

      <!-- Publications with abbreviated format -->
      <div class="section compact-section compact-publications-section" id="resume-publications">
        {{resume-publications}}
      </div>
      
      <!-- References with minimal contact info -->
      <div class="section compact-section compact-references-section" id="resume-references">
        {{resume-references}}
      </div>
      
      <!-- Additional information -->
      <div class="section compact-section compact-additional-section" id="resume-additional">
        {{resume-additional}}
      </div>
    </div>
  </div>
</div>
`;

/**
 * Type definition for compact section configuration
 * Simplified configuration focused on space efficiency - 2 COLUMN VERSION
 */
type CompactSectionConfig = {
	icon: string;
	location: "left" | "right"; // Only 2 columns now
	displayStyle: "tags" | "list" | "cards" | "timeline";
	priority: number; // Higher priority sections get more space
};

/**
 * Type definition for compact sections mapping
 * Maps section IDs to their configuration for type safety
 */
type CompactSectionsType = {
	"resume-summary": CompactSectionConfig;
	"resume-experience": CompactSectionConfig;
	"resume-projects": CompactSectionConfig;
	"resume-education": CompactSectionConfig;
	"resume-awards": CompactSectionConfig;
	"resume-publications": CompactSectionConfig;
	"resume-volunteering": CompactSectionConfig;
	"resume-references": CompactSectionConfig;
	"resume-additional": CompactSectionConfig;
	"resume-skills": CompactSectionConfig;
	"resume-languages": CompactSectionConfig;
	"resume-certifications": CompactSectionConfig;
	"resume-interests": CompactSectionConfig;
};

/**
 * Section configuration for compact template with space optimization - 2 COLUMN VERSION
 * Each section optimized for maximum content density while maintaining readability
 */
const compactSections: CompactSectionsType = {
	// Right column - Primary content with high priority
	"resume-summary": {
		icon: "person-lines-fill",
		location: "right",
		displayStyle: "cards",
		priority: 10,
	},
	"resume-experience": {
		icon: "briefcase-fill",
		location: "right",
		displayStyle: "timeline",
		priority: 9,
	},
	"resume-projects": {
		icon: "code-square",
		location: "right",
		displayStyle: "cards",
		priority: 7,
	},
	"resume-publications": {
		icon: "journal-text",
		location: "right",
		displayStyle: "list",
		priority: 5,
	},
	"resume-volunteering": {
		icon: "heart-fill",
		location: "right",
		displayStyle: "list",
		priority: 4,
	},
	"resume-references": {
		icon: "people-fill",
		location: "right",
		displayStyle: "cards",
		priority: 3,
	},
	"resume-additional": {
		icon: "plus-circle-fill",
		location: "right",
		displayStyle: "list",
		priority: 2,
	},

	// Left column - Skills and supplementary info with tag display
	"resume-skills": {
		icon: "tools",
		location: "left",
		displayStyle: "tags",
		priority: 8,
	},
	"resume-languages": {
		icon: "translate",
		location: "left",
		displayStyle: "tags",
		priority: 6,
	},
	"resume-certifications": {
		icon: "patch-check-fill",
		location: "left",
		displayStyle: "list",
		priority: 7,
	},
	"resume-interests": {
		icon: "star-fill",
		location: "left",
		displayStyle: "tags",
		priority: 3,
	},
	"resume-awards": {
		icon: "trophy-fill",
		location: "left",
		displayStyle: "list",
		priority: 5,
	},
	"resume-education": {
		icon: "mortarboard-fill",
		location: "left",
		displayStyle: "cards",
		priority: 8,
	},
};

/**
 * Build ultra-compact header with horizontal layout
 * Minimizes vertical space while including all essential contact information
 * Uses inline layout with clean separators for maximum efficiency
 *
 * @param headerInfo - Extracted header information from resume content
 * @returns Complete header HTML with space-optimized layout
 */
function buildCompactHeader(headerInfo: any): string {
	console.log("Building compact header with space optimization", headerInfo);

	let headerHTML = "";

	// Header content wrapper with horizontal layout
	headerHTML += `    <div class="compact-header-content">\n`;

	// Name and title in primary section
	headerHTML += `      <div class="compact-header-primary">\n`;
	headerHTML += `        <h1 class="section-title name compact-name">${
		headerInfo.name || "Full Name"
	}</h1>\n`;

	// Title inline if available to save vertical space
	if (headerInfo.title && headerInfo.title.trim()) {
		headerHTML += `        <span class="compact-title-separator">|</span>\n`;
		headerHTML += `        <p class="title compact-title">${headerInfo.title}</p>\n`;
	}

	headerHTML += `      </div>\n`; // Close primary section

	// Contacts in secondary section with horizontal inline layout
	const contactElements: string[] = [];

	// Build contact elements array for efficient inline display
	if (headerInfo.phone && headerInfo.phone.trim()) {
		contactElements.push(
			`<span class="compact-contact-item phone">${headerInfo.phone}</span>`
		);
	}

	if (headerInfo.email && headerInfo.email.trim()) {
		contactElements.push(
			`<span class="compact-contact-item email">${headerInfo.email}</span>`
		);
	}

	if (headerInfo.linkedin && headerInfo.linkedin.trim()) {
		contactElements.push(
			`<span class="compact-contact-item linkedin">${headerInfo.linkedin}</span>`
		);
	}

	if (headerInfo.portfolio && headerInfo.portfolio.trim()) {
		contactElements.push(
			`<span class="compact-contact-item portfolio">${headerInfo.portfolio}</span>`
		);
	}

	// Add address last if available
	if (headerInfo.address && headerInfo.address.trim()) {
		const formattedAddress = headerInfo.address.replace(/\n/g, ", ");
		contactElements.push(
			`<span class="compact-contact-item address">${formattedAddress}</span>`
		);
	}

	// Only add contacts section if we have contact information
	if (contactElements.length > 0) {
		headerHTML += `      <div class="compact-header-contacts">\n`;
		headerHTML += `        ${contactElements.join(
			`<span class="compact-contact-separator">•</span>`
		)}\n`;
		headerHTML += `      </div>\n`;
	}

	headerHTML += `    </div>\n`; // Close header content

	console.log(
		`Compact header built with ${contactElements.length} contacts in horizontal layout`
	);

	return headerHTML;
}

/**
 * Enhanced content processor for compact template
 * Applies space-efficient styling based on display style and location
 * Optimizes content density while maintaining readability
 *
 * @param content - Original section content from resume data
 * @param sectionId - ID of the section being processed
 * @param config - Section configuration (icon, location, display style, priority)
 * @returns Enhanced HTML content with compact styling
 */
function enhanceCompactContent(
	content: string,
	sectionId: string,
	config: CompactSectionConfig
): string {
	// Return empty string if no content provided
	if (!content || !content.trim()) return "";

	try {
		// Parse HTML content safely using DOMParser
		const parser = new DOMParser();
		const doc = parser.parseFromString(content, "text/html");

		// Check if content has meaningful text after parsing
		const textContent = doc.body.textContent || "";
		const cleanTextContent = textContent.replace(/\s+/g, "").trim();

		if (!cleanTextContent || cleanTextContent.length === 0) {
			console.log(`Compact: Section "${sectionId}" is empty, hiding it`);
			return "";
		}

		// Find existing h2 title and enhance with compact styling
		let titleElement = doc.querySelector("h2");

		if (titleElement) {
			const existingTitle = titleElement.textContent?.trim() || "";

			// Create compact title with icon and minimal styling
			titleElement.innerHTML = `
        <div class="compact-section-title-wrapper">
          <img class="compact-section-icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/${config.icon}.svg" alt="${existingTitle}">
          <span class="compact-section-title-text">${existingTitle}</span>
        </div>
      `;

			titleElement.className = "section-title compact-section-title";

			console.log(
				`Compact: Enhanced section "${sectionId}" with ${config.displayStyle} style for ${config.location} column`
			);
		}

		// Apply display style specific enhancements
		switch (config.displayStyle) {
			case "tags":
				// Convert list items to compact tags for skills, languages, interests
				const lists = doc.querySelectorAll("ul");
				lists.forEach((list) => {
					list.className += " compact-tags-list";

					const listItems = doc.querySelectorAll("li");
					listItems.forEach((item) => {
						item.className += " compact-tag-item";
					});
				});
				break;

			case "timeline":
				// Timeline style for experience section with space optimization
				const jobDivs = doc.querySelectorAll("div");
				jobDivs.forEach((div) => {
					if (div.querySelector("h3")) {
						div.className += " compact-timeline-item";
					}
				});
				break;

			case "cards":
				// Compact card style for education, projects, summary
				const cardDivs = doc.querySelectorAll("div");
				cardDivs.forEach((div) => {
					if (div.querySelector("h3") || div.querySelector("p")) {
						div.className += " compact-card-item";
					}
				});
				break;

			case "list":
				// Simple list style for publications, volunteering, references
				const simpleLists = doc.querySelectorAll("ul");
				simpleLists.forEach((list) => {
					list.className += " compact-simple-list";
				});

				const simpleItems = doc.querySelectorAll("li");
				simpleItems.forEach((item) => {
					item.className += " compact-simple-item";
				});
				break;
		}

		// Apply location-specific enhancements
		const contentWrapper = doc.createElement("div");
		contentWrapper.className = `compact-section-content compact-${config.location}-content`;

		// Move all content into the wrapper
		while (doc.body.firstChild) {
			contentWrapper.appendChild(doc.body.firstChild);
		}

		doc.body.appendChild(contentWrapper);

		return doc.body.innerHTML;
	} catch (error) {
		console.error(`Error enhancing compact content for ${sectionId}:`, error);
		return content; // Return original content if processing fails
	}
}

/**
 * Type guard to check if a section ID is valid for compact sections
 * Ensures TypeScript type safety for section configuration access
 *
 * @param sectionId - Section ID to check
 * @returns True if the section ID is valid for compact sections
 */
function isValidCompactSection(
	sectionId: string | number
): sectionId is keyof CompactSectionsType {
	return typeof sectionId === "string" && sectionId in compactSections;
}

/**
 * Apply compact template to content sections
 * Builds header conditionally and applies space-optimized styling
 * Organizes content into two columns based on priority and content type
 *
 * @param sections - Object containing content for each section by ID
 * @returns Formatted HTML content with compact template applied
 */
function applyCompactTemplate(sections: TemplateContentSections): string {
	console.log(
		"Applying Compact template with space optimization and 2-column layout"
	);

	// Start with the compact template structure
	let result = compactTemplateHTML;

	// Process header section with compact conditional elements
	if (sections["resume-header"]) {
		console.log("Processing compact header with horizontal layout");

		// Extract structured header information from raw content
		const headerInfo = extractHeaderInfo(sections["resume-header"]);

		// Build compact header HTML with space optimization
		const compactHeaderHTML = buildCompactHeader(headerInfo);

		// Replace the header placeholder with our compact content
		const headerPlaceholder =
			"    <!-- Content will be inserted conditionally based on available data -->";
		result = result.replace(headerPlaceholder, compactHeaderHTML);
	} else {
		// Default compact header if no header section provided
		console.log("No header section found, using default compact header");

		const defaultHeaderHTML = buildCompactHeader({
			name: "Full Name",
			title: "Professional Title",
			phone: "(123) 456-7890",
			email: "example@email.com",
			linkedin: null,
			portfolio: null,
			address: "City, Country",
		});

		const headerPlaceholder =
			"    <!-- Content will be inserted conditionally based on available data -->";
		result = result.replace(headerPlaceholder, defaultHeaderHTML);
	}

	// Track sections to remove if empty
	const sectionsToRemove: string[] = [];

	// Process all other sections with compact enhancements
	Object.entries(sections).forEach(([sectionId, content]) => {
		// Skip header section and only process valid compact sections
		if (sectionId !== "resume-header" && isValidCompactSection(sectionId)) {
			const sectionConfig = compactSections[sectionId];

			if (!sectionConfig) {
				console.warn(`No configuration found for section: ${sectionId}`);
				return;
			}

			const placeholder = `{{${sectionId}}}`;

			if (result.includes(placeholder)) {
				console.log(
					`Compact: Processing ${sectionId} for ${sectionConfig.location} column with ${sectionConfig.displayStyle} style`
				);

				// Enhance content with compact styling
				const enhancedContent = enhanceCompactContent(
					content,
					sectionId,
					sectionConfig
				);

				if (!enhancedContent || enhancedContent.trim() === "") {
					console.log(
						`Compact: Section ${sectionId} is empty, marking for removal`
					);
					sectionsToRemove.push(sectionId);
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

	// Remove empty sections after processing all content
	sectionsToRemove.forEach((sectionId) => {
		const sectionRegex = new RegExp(
			`<div[^>]*id="${sectionId}"[^>]*>\\s*EMPTY_SECTION_TO_REMOVE\\s*</div>`,
			"g"
		);
		result = result.replace(sectionRegex, "");
		console.log(`Compact: Removed empty section container for ${sectionId}`);
	});

	// Clean up any remaining placeholders
	const remainingPlaceholders = result.match(/\{\{[^}]+\}\}/g);
	if (remainingPlaceholders) {
		console.log(
			`Compact: Cleaning ${remainingPlaceholders.length} remaining placeholders`
		);
		remainingPlaceholders.forEach((placeholder) => {
			const sectionId = placeholder.replace(/[{}]/g, "");
			const sectionRegex = new RegExp(
				`<div[^>]*id="${sectionId}"[^>]*>\\s*\\{\\{${sectionId}\\}\\}\\s*</div>`,
				"g"
			);
			result = result.replace(sectionRegex, "");
			console.log(
				`Compact: Removed container for unprocessed section: ${sectionId}`
			);
		});
	}

	console.log(
		"Compact template processing completed with space optimization and 2-column layout"
	);
	return result;
}

/**
 * Compact template configuration object
 * Exported for use in the template registry
 */
export const compactTemplate: ResumeTemplateType = {
	id: "compact",
	name: "Compact",
	isPro: true, // Pro template for CareerBoost
	previewClass: "border-l-4 border-gray-600",
	description:
		"Space-optimized 2-column layout that maximizes content density while maintaining readability, perfect for extensive resumes",
	styles: compactStyles,
	template: compactTemplateHTML,
	applyTemplate: applyCompactTemplate,
};
