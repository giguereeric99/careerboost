/**
 * Template Registry - Central template management
 * Imports all templates and provides unified access
 */
import { ResumeTemplateType } from "../../types/resumeTemplateTypes";

// Import individual templates
import { basicTemplate } from "./basic/basicTemplate";
import { professionalTemplate } from "./professional/professionalTemplate";

// TODO: Import other templates when created
import { creativeTemplate } from "./creative/creativeTemplate";
import { executiveTemplate } from "./executive/executiveTemplate";
import { technicalTemplate } from "./technical/technicalTemplate";
import { compactTemplate } from "./compact/compactTemplate";

/**
 * All available resume templates
 * Each template is imported from its dedicated folder
 * Templates are ordered by availability (free first, then pro)
 */
export const resumeTemplates: ResumeTemplateType[] = [
	// Free template
	basicTemplate,

	// Pro templates
	professionalTemplate,

	// TODO: Add other templates as they are created
	creativeTemplate,
	executiveTemplate,
	technicalTemplate,
	compactTemplate,
];

/**
 * Get a template by ID
 * Returns the template object or the basic template if not found
 *
 * @param id - Template ID to retrieve
 * @returns The template object or the basic template if not found
 */
export function getTemplateById(id: string): ResumeTemplateType {
	const template = resumeTemplates.find((template) => template.id === id);

	if (!template) {
		console.warn(
			`Template with ID "${id}" not found, falling back to basic template`
		);
		return resumeTemplates[0]; // Return basic template as fallback
	}

	return template;
}

/**
 * Get all free templates
 * Returns templates that don't require a pro subscription
 *
 * @returns Array of free templates
 */
export function getFreeTemplates(): ResumeTemplateType[] {
	return resumeTemplates.filter((template) => !template.isPro);
}

/**
 * Get all pro templates
 * Returns templates that require a pro subscription
 *
 * @returns Array of pro templates
 */
export function getProTemplates(): ResumeTemplateType[] {
	return resumeTemplates.filter((template) => template.isPro);
}

/**
 * Get templates by category/type
 * Useful for filtering templates in the UI
 *
 * @param category - Category to filter by
 * @returns Array of templates matching the category
 */
export function getTemplatesByCategory(
	category: "free" | "pro" | "all" = "all"
): ResumeTemplateType[] {
	switch (category) {
		case "free":
			return getFreeTemplates();
		case "pro":
			return getProTemplates();
		case "all":
		default:
			return resumeTemplates;
	}
}

/**
 * Validate that all templates are properly configured
 * Useful for development and testing
 *
 * @returns Validation results
 */
export function validateTemplateRegistry(): {
	isValid: boolean;
	issues: string[];
	templateCount: number;
} {
	const issues: string[] = [];

	// Check if we have at least one template
	if (resumeTemplates.length === 0) {
		issues.push("No templates registered");
	}

	// Check if we have at least one free template
	const freeTemplates = getFreeTemplates();
	if (freeTemplates.length === 0) {
		issues.push("No free templates available");
	}

	// Validate each template
	resumeTemplates.forEach((template, index) => {
		if (!template.id) {
			issues.push(`Template at index ${index} missing ID`);
		}

		if (!template.name) {
			issues.push(`Template "${template.id}" missing name`);
		}

		if (!template.applyTemplate) {
			issues.push(`Template "${template.id}" missing applyTemplate function`);
		}

		if (!template.styles) {
			issues.push(`Template "${template.id}" missing styles`);
		}

		// Check for duplicate IDs
		const duplicates = resumeTemplates.filter((t) => t.id === template.id);
		if (duplicates.length > 1) {
			issues.push(`Duplicate template ID: "${template.id}"`);
		}
	});

	return {
		isValid: issues.length === 0,
		issues,
		templateCount: resumeTemplates.length,
	};
}
