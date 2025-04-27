/**
 * Types for resume data structures
 * These types are used throughout the application for handling resume content
 */

/**
 * Education data structure
 * Represents a single education entry in a resume
 */
export interface Education {
  institution: string;       // Name of school, college, or university
  degree: string;            // Type of degree obtained
  field?: string;            // Field of study or major
  startDate: string;         // When education began
  endDate?: string;          // When education ended
  gpa?: string;              // Grade point average
  achievements?: string[];   // Academic achievements or extracurricular activities
}

/**
 * Experience data structure
 * Represents a single job or professional experience in a resume
 */
export interface Experience {
  company: string;           // Company or organization name
  position: string;          // Job title or position
  startDate: string;         // When the position began
  endDate?: string;          // When the position ended (optional if current)
  location?: string;         // Job location
  description: string[];     // Bullet points describing responsibilities/achievements
}

/**
 * Core resume data structure
 * Represents the parsed information from a resume
 */
export interface ResumeData {
  fullName?: string;         // Person's full name
  email?: string;            // Contact email address
  phone?: string;            // Contact phone number
  location?: string;         // Geographic location/address
  title?: string;            // Professional title or role
  summary?: string;          // Professional summary or objective
  skills: string[];          // List of professional skills
  experience: Experience[];  // Professional experience entries
  education: Education[];    // Educational background entries
  certifications?: string[]; // Professional certifications
  languages?: string[];      // Languages spoken
  projects?: any[];          // Projects completed
}

/**
 * Suggestion structure
 * Represents an AI-generated improvement suggestion for a resume
 */
export interface Suggestion {
  id?: string;               // Unique identifier for the suggestion
  type: string;              // Category of suggestion (e.g., "summary", "experience", "skills")
  text: string;              // The actual suggestion content
  impact: string;            // Description of how this improves the resume
  isApplied?: boolean;       // Whether this suggestion has been applied to the resume
}

/**
 * Resume database record structure
 * Represents how resumes are stored in the database
 */
export interface ResumeRecord {
  id: string;                // UUID of the resume
  user_id: string;           // UUID of the user (for Supabase RLS)
  auth_user_id: string;      // User ID from auth provider (e.g., Clerk)
  original_text: string;     // Original resume text
  optimized_text: string;    // AI-optimized resume text
  language: string;          // Detected language of the resume
  ats_score: number;         // ATS compatibility score (0-100)
  file_url?: string;         // URL to the uploaded file
  file_name?: string;        // Original file name
  file_type?: string;        // File type/format
  selected_template?: string; // Selected template ID
  created_at: string;        // Creation timestamp
  updated_at: string;        // Last update timestamp
}

/**
 * Keyword structure
 * Represents a keyword that can be applied to a resume
 */
export interface Keyword {
  text: string;              // The keyword text
  applied: boolean;          // Whether this keyword is applied to the resume
}