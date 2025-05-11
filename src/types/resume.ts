/**
 * Resume Type Definitions
 * 
 * This module contains all type definitions related to resume data structures,
 * used throughout the application for handling resume content, optimization,
 * and enhancements.
 */

/**
 * Education data structure
 * Represents a single educational entry in a resume
 */
export interface Education {
  institution: string;       // Name of school, college, or university
  degree: string;            // Type of degree obtained or certification
  field?: string;            // Field of study, major, or specialization
  startDate: string;         // When education began (YYYY-MM format recommended)
  endDate?: string;          // When education ended (or "Present" for ongoing)
  gpa?: string;              // Grade point average or equivalent academic metric
  achievements?: string[];   // Academic achievements, honors, or extracurricular activities
}

/**
 * Experience data structure
 * Represents a professional position or work experience entry
 */
export interface Experience {
  company: string;           // Company or organization name
  position: string;          // Job title or role within the company
  startDate: string;         // When the position began (YYYY-MM format recommended)
  endDate?: string;          // When the position ended (or "Present" for current positions)
  location?: string;         // Job location (city, state, country, or remote)
  description: string[];     // Bullet points describing responsibilities and achievements
}

/**
 * Core resume data structure
 * Contains all parsed information from a resume document
 */
export interface ResumeData {
  fullName?: string;         // Person's full name as it appears on the resume
  email?: string;            // Primary contact email address
  phone?: string;            // Formatted contact phone number
  location?: string;         // Geographic location/address of the candidate
  title?: string;            // Professional title, role, or headline
  summary?: string;          // Professional summary, objective, or profile statement
  skills: string[];          // List of technical and soft skills
  experience: Experience[];  // Work history and professional experience entries
  education: Education[];    // Educational background and qualifications
  certifications?: string[]; // Professional certifications and credentials
  languages?: string[];      // Languages spoken and proficiency levels
  projects?: any[];          // Professional or personal projects completed
}

/**
 * Resume section structure
 * Represents a distinct part of the resume document
 */
export interface Section {
  id: string;                // Unique identifier for the section
  title: string;             // Display title of the section
  content: string;           // HTML content of the section
  type: string;              // Type of section (e.g., "experience", "education")
  order: number;             // Display order of the section
  visible: boolean;          // Whether the section should be visible
  isEmpty: boolean;          // Whether the section has no meaningful content
}

/**
 * Basic section structure used during parsing
 * Minimal representation of a resume section
 */
export interface BasicSection {
  id: string;                // Unique identifier for the section
  title: string;             // Display title of the section
  content: string;           // HTML content of the section
}

/**
 * Suggestion structure
 * Represents an AI-generated improvement recommendation
 */
export interface Suggestion {
  id: string;                // Unique identifier for the suggestion
  text: string;              // The content of the suggestion or recommendation
  type: string;              // Category of the suggestion (e.g., "summary", "experience", "skills")
  impact: string;            // Description of how implementing this would improve the resume
  isApplied: boolean;        // Indicates if the suggestion has been applied to the resume
  pointImpact?: number;      // Numeric value representing the score impact when applied
}

/**
 * Keyword structure
 * Represents an industry or job-specific keyword that can enhance resume relevance
 */
export interface Keyword {
  id: string;                // Unique identifier for the keyword
  text: string;              // The keyword or key phrase text
  isApplied: boolean;        // Whether this keyword has been incorporated into the resume
  relevance?: number;        // Relevance score for this keyword (0-1)
  pointImpact?: number;      // Numeric value representing the score impact when applied
}

/**
 * Database mapping structure for suggestions
 * Used for converting between database and application formats
 */
export interface SuggestionRecord {
  id: string;                // Primary key
  resume_id: string;         // Foreign key to resume
  text: string;              // Suggestion content
  type: string;              // Suggestion category
  impact: string;            // Impact description
  is_applied: boolean;       // Applied status in database format
  point_impact?: number;     // Score impact value
  created_at?: string;       // Creation timestamp
}

/**
 * Database mapping structure for keywords
 * Used for converting between database and application formats
 */
export interface KeywordRecord {
  id: string;                // Primary key
  resume_id: string;         // Foreign key to resume
  text: string;              // Keyword text
  is_applied: boolean;       // Applied status in database format
  relevance?: number;        // Relevance score
  created_at?: string;       // Creation timestamp
}

/**
 * Resume database record structure
 * Represents the database schema for storing resume information
 */
export interface ResumeRecord {
  id: string;                // Primary key UUID of the resume record
  user_id: string;           // Reference to user table (for Supabase RLS)
  auth_user_id: string;      // External authentication provider user ID (e.g., Clerk)
  original_text: string;     // Original unmodified resume text content
  optimized_text: string;    // AI-enhanced and optimized resume content
  last_saved_text: string | null;  // User-edited and saved resume content
  last_saved_score_ats: number | null; // ATS score after user modifications
  language: string;          // ISO language code of the resume content
  ats_score: number;         // Initial Applicant Tracking System compatibility score (0-100)
  file_url?: string;         // Storage URL for the uploaded resume file
  file_name?: string;        // Original file name as uploaded by the user
  file_type?: string;        // MIME type or file extension of the uploaded resume
  file_size?: number;        // Size of the file in bytes
  selected_template?: string; // ID of the template selected for this resume
  created_at: string;        // Timestamp of initial creation (ISO format)
  updated_at: string;        // Timestamp of last modification (ISO format)
}

/**
 * Complete resume data with optimization information
 * Used throughout the resume optimization workflow
 */
export interface OptimizedResumeData {
  id: string;                // Resume identifier
  original_text: string;     // Original content
  optimized_text: string;    // AI-optimized content
  last_saved_text: string | null | undefined;  // User-edited content
  last_saved_score_ats: number | null | undefined; // Current score after edits
  language: string;          // Content language
  file_name: string;         // Original filename
  file_type: string;         // File format
  file_size?: number;        // File size in bytes
  ats_score: number;         // Original optimization score
  selected_template?: string; // Visual template selection
  keywords?: Keyword[];      // Recommended keywords
  suggestions?: Suggestion[]; // Improvement suggestions
}

/**
 * API response data structure 
 * Used when receiving data from resume services
 */
export interface ResumeApiData {
  id: string;                // Resume identifier
  original_text: string;     // Original content
  optimized_text: string;    // AI-optimized content
  last_saved_text: string | null; // User-edited content
  last_saved_score_ats: number | null; // Current score after edits
  language: string;          // Content language
  file_name: string;         // Original filename
  file_type: string;         // File format
  file_size?: number;        // File size in bytes
  ats_score: number;         // Original optimization score
  selected_template?: string; // Visual template selection
  keywords?: Array<{         // Keywords in API format
    id: string;
    text: string;
    keyword?: string;
    is_applied: boolean;
  }>;
  suggestions?: Array<{      // Suggestions in API format
    id: string;
    text: string;
    type: string;
    impact: string;
    is_applied: boolean;
  }>;
}

/**
 * TipTap Resume Editor Props
 * Properties for the TipTap-based resume editor component
 */
export interface TipTapResumeEditorProps {
  content: string;                      // HTML content to edit
  onChange: (html: string) => void;     // Callback when content changes
  appliedKeywords?: string[];           // Keywords that can be applied to the resume
  onApplyKeyword?: (keyword: string) => void; // Callback when keyword is applied
  suggestions?: Suggestion[];           // AI suggestions for improving the resume
  onApplySuggestion?: (suggestion: Suggestion) => void; // Callback when suggestion is applied
  readOnly?: boolean;                   // Whether the editor is in read-only mode
  placeholder?: string;                 // Placeholder text when empty
  language?: string;                    // Language of the resume content
  resumeId?: string;                    // ID of the resume being edited
  onApplyChanges?: () => Promise<boolean>; // Callback for Apply Changes button
  canApplyChanges?: boolean;            // Whether the user can apply changes
  sectionType?: string;                 // Type of section being edited
}

/**
 * Editor attributes for TipTap
 * Used for handling different attribute types in isActive
 */
export type EditorAttributes = string | Record<string, any>;

/**
 * IsActive function type for TipTap editor
 * Allows checking if a mark or node is active with various attribute formats
 */
export type IsActiveFunction = (attrs?: EditorAttributes) => boolean;

/**
 * Resume format options
 * Available output formats for resume display or export
 */
export enum ResumeFormat {
  HTML = 'html',
  PDF = 'pdf',
  DOCX = 'docx',
  TXT = 'txt',
  JSON = 'json'
}

/**
 * Resume section types
 * Standard sections found in most professional resumes
 */
export enum ResumeSection {
  HEADER = 'header',
  SUMMARY = 'summary',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  SKILLS = 'skills',
  PROJECTS = 'projects',
  CERTIFICATIONS = 'certifications',
  LANGUAGES = 'languages'
}

/**
 * Suggestion impact levels
 * Categorizes the potential impact of a suggestion on ATS score
 */
export enum SuggestionImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Helper function to create a Section object with all required properties
 * Simplifies section creation throughout the application
 * 
 * @param id - Section identifier
 * @param title - Section title
 * @param content - HTML content
 * @param options - Optional properties to override defaults
 * @returns Complete Section object
 */
export function createSection(
  id: string,
  title: string,
  content: string,
  options?: Partial<Omit<Section, 'id' | 'title' | 'content'>>
): Section {
  return {
    id,
    title,
    content,
    type: options?.type || guessTypeFromId(id),
    order: options?.order !== undefined ? options.order : 0,
    visible: options?.visible !== undefined ? options.visible : true,
    isEmpty: options?.isEmpty !== undefined ? options.isEmpty : content.trim().length === 0
  };
}

/**
 * Guess section type based on section ID
 * Utility function to determine the most likely section type
 * 
 * @param id - Section ID to analyze
 * @returns Best guess at section type
 */
function guessTypeFromId(id: string): string {
  if (id.includes('header') || id.includes('personal')) return 'header';
  if (id.includes('summary') || id.includes('profile')) return 'summary';
  if (id.includes('experience') || id.includes('work')) return 'experience';
  if (id.includes('education') || id.includes('study')) return 'education';
  if (id.includes('skill')) return 'skills';
  if (id.includes('project')) return 'projects';
  if (id.includes('certification')) return 'certifications';
  if (id.includes('language')) return 'languages';
  return 'generic';
}

/**
 * Data mapper functions for converting between database and application formats
 */
export const DataMappers = {
  /**
   * Maps a suggestion record from database format to application format
   * 
   * @param record - Database suggestion record
   * @returns Application suggestion object
   */
  mapSuggestionFromDB: (record: SuggestionRecord): Suggestion => ({
    id: record.id,
    text: record.text,
    type: record.type,
    impact: record.impact,
    isApplied: record.is_applied,
    pointImpact: record.point_impact
  }),

  /**
   * Maps a keyword record from database format to application format
   * 
   * @param record - Database keyword record
   * @returns Application keyword object
   */
  mapKeywordFromDB: (record: KeywordRecord): Keyword => ({
    id: record.id,
    text: record.text,
    isApplied: record.is_applied,
    relevance: record.relevance
  }),

  /**
   * Maps a suggestion from application format to database format
   * 
   * @param suggestion - Application suggestion object
   * @param resumeId - Resume ID to associate with
   * @returns Database suggestion record
   */
  mapSuggestionToDB: (suggestion: Suggestion, resumeId: string): SuggestionRecord => ({
    id: suggestion.id,
    resume_id: resumeId,
    text: suggestion.text,
    type: suggestion.type,
    impact: suggestion.impact,
    is_applied: suggestion.isApplied,
    point_impact: suggestion.pointImpact
  }),

  /**
   * Maps a keyword from application format to database format
   * 
   * @param keyword - Application keyword object
   * @param resumeId - Resume ID to associate with
   * @returns Database keyword record
   */
  mapKeywordToDB: (keyword: Keyword, resumeId: string): KeywordRecord => ({
    id: keyword.id,
    resume_id: resumeId,
    text: keyword.text,
    is_applied: keyword.isApplied,
    relevance: keyword.relevance
  }),

  /**
   * Maps API response data to OptimizedResumeData format
   * Converts from API format to application format
   * 
   * @param data - API response data
   * @returns Application OptimizedResumeData object
   */
  mapApiDataToOptimizedResume: (data: ResumeApiData): OptimizedResumeData => {
    // Convert keywords from API format to application format
    const formattedKeywords = Array.isArray(data.keywords) 
      ? data.keywords.map(k => ({
          id: k.id || String(Math.random()),
          text: k.keyword || k.text || '',
          isApplied: k.is_applied,
          relevance: 1,
          pointImpact: 1
        }))
      : [];
    
    // Convert suggestions from API format to application format
    const formattedSuggestions = Array.isArray(data.suggestions) 
      ? data.suggestions.map(s => ({
          id: s.id || String(Math.random()),
          text: s.text || '',
          type: s.type || 'general',
          impact: s.impact || '',
          isApplied: s.is_applied,
          pointImpact: 2
        }))
      : [];
    
    return {
      id: data.id,
      original_text: data.original_text,
      optimized_text: data.optimized_text,
      last_saved_text: data.last_saved_text,
      last_saved_score_ats: data.last_saved_score_ats,
      language: data.language,
      file_name: data.file_name,
      file_type: data.file_type,
      file_size: data.file_size,
      ats_score: data.ats_score,
      selected_template: data.selected_template,
      keywords: formattedKeywords,
      suggestions: formattedSuggestions
    };
  }
};