import { z } from 'zod';

/**
 * Schema for an education entry
 */
export const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  field: z.string().optional(),
  startDate: z.string(), 
  endDate: z.string().optional(),
  gpa: z.string().optional(),
  achievements: z.array(z.string()).optional()
});

/**
 * Schema for a work experience entry
 */
export const experienceSchema = z.object({
  company: z.string().min(1, "Company name is required"),
  position: z.string().min(1, "Position is required"),
  startDate: z.string(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  description: z.array(z.string())
});

/**
 * Schema for the complete resume data
 */
export const resumeDataSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
  skills: z.array(z.string()),
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  certifications: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  projects: z.array(z.any()).optional()
});

/**
 * Schema for a suggestion
 */
export const suggestionSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  text: z.string().min(1, "Suggestion text is required"),
  impact: z.string(),
  isApplied: z.boolean().default(false)
});

/**
 * Schema for a keyword
 */
export const keywordSchema = z.object({
  text: z.string().min(1, "Keyword text is required"),
  applied: z.boolean().default(false)
});

/**
 * Schema for the database resume record
 */
export const resumeRecordSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  auth_user_id: z.string(), 
  original_text: z.string().min(1, "Original text is required"),
  optimized_text: z.string().min(1, "Optimized text is required"),
  language: z.string().default("English"),
  ats_score: z.number().min(0).max(100),
  file_url: z.string().url().optional().nullable(),
  file_name: z.string().optional().nullable(),
  file_type: z.string().optional().nullable(),
  selected_template: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

/**
 * Schema for API request to optimize resume
 */
export const optimizeRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  rawText: z.string().min(50, "Resume text must be at least 50 characters").optional(),
  fileUrl: z.string().url("Invalid file URL").optional(),
  fileName: z.string().optional(),
  fileType: z.string().optional()
}).refine(data => data.rawText || data.fileUrl, {
  message: "Either raw text or file URL must be provided",
  path: ["rawText"]
});

/**
 * UploadResult validation schema, pour valider les résultats renvoyés par UploadThing
 */
export const uploadResultSchema = z.object({
  url: z.string().url("URL de fichier invalide"),
  name: z.string().min(1, "Nom de fichier requis"),
  size: z.number().min(1, "Taille de fichier invalide"),
  type: z.string().min(1, "Type de fichier requis")
});

/**
 * Schema for API request to update keywords
 */
export const updateKeywordsRequestSchema = z.object({
  resumeId: z.string().uuid("Invalid resume ID"),
  keywords: z.array(keywordSchema)
});

/**
 * Schema for API request to update a suggestion
 */
export const updateSuggestionRequestSchema = z.object({
  resumeId: z.string().uuid("Invalid resume ID"),
  suggestionId: z.string(),
  applied: z.boolean()
});

/**
 * Schema for API request to regenerate a resume
 */
export const regenerateRequestSchema = z.object({
  resumeId: z.string().uuid("Invalid resume ID"),
  appliedKeywords: z.array(z.string()),
  appliedSuggestions: z.array(z.string())
});

// Export type definitions derived from Zod schemas for use in the application
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type Keyword = z.infer<typeof keywordSchema>;
export type ResumeRecord = z.infer<typeof resumeRecordSchema>;