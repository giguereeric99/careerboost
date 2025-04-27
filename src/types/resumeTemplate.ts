/**
 * Template structure
 * Represents a resume template option
 */
export interface ResumeTemplate {
  id: string;                // Unique identifier for the template
  name: string;              // Display name of the template
  description: string;       // Short description of the template
  thumbnail: string;         // URL or path to template thumbnail
  isPro?: boolean;           // Whether this template requires a pro subscription
}