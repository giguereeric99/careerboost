/**
 * Type definitions for resume templates
 * These types define the structure for resume templates in the application
 */

/**
 * Resume template type
 * Contains all information needed to display and apply a template to resume content
 */
export interface ResumeTemplateType {
  /** Unique identifier for the template */
  id: string;
  
  /** Display name shown in the template gallery */
  name: string;
  
  /** Whether this template requires a pro subscription */
  isPro: boolean;
  
  /** CSS class used for the template preview in the gallery */
  previewClass: string;
  
  /** Brief description of the template style and suitable use cases */
  description: string;
  
  /** Full HTML template structure with placeholders for content */
  template?: string;
  
  /** Complete CSS styling for the template */
  styles?: string;
  
  /** Function to apply the template to resume content */
  applyTemplate?: (content: Record<string, string>) => string;
}

/**
 * Template content sections interface
 * Used to represent the content divided into sections
 * Keys correspond to section IDs (e.g., resume-header, resume-experience)
 */
export interface TemplateContentSections {
  [sectionId: string]: string;
}

/**
 * Header information interface
 * Common structure for header information across all templates
 */
export interface HeaderInfo {
  name: string;
  phone: string | null;
  email: string | null;
  linkedin: string | null;
  portfolio: string | null;
  address: string | null;
  title?: string | null; // Professional title/role
}