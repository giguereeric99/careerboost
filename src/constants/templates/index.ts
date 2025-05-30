/**
 * Templates Module Entry Point
 * Exports all template-related functionality from the organized structure
 */

// Main registry exports
export {
	resumeTemplates,
	getTemplateById,
	getFreeTemplates,
	getProTemplates,
	getTemplatesByCategory,
	validateTemplateRegistry,
} from "./templateRegistry";

// Individual templates (for direct access if needed)
export { basicTemplate } from "./basic/basicTemplate";
export { professionalTemplate } from "./professional/professionalTemplate";
export { creativeTemplate } from "./creative/creativeTemplate";
export { executiveTemplate } from "./executive/executiveTemplate";
export { technicalTemplate } from "./technical/technicalTemplate";
export { compactTemplate } from "./compact/compactTemplate";

// Utility functions
export * from "./utils/templateHelpers";
export * from "./utils/templateValidation";

// Type exports (re-exported for convenience)
export type {
	ResumeTemplateType,
	TemplateContentSections,
	HeaderInfo,
} from "../../types/resumeTemplateTypes";
