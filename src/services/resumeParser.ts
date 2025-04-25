import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Resume data structure that represents the parsed information from a resume
 * Used throughout the application for handling resume content
 */
export type ResumeData = {
  fullName?: string;                // Person's full name
  email?: string;                   // Contact email address
  phone?: string;                   // Contact phone number
  location?: string;                // Geographic location/address
  title?: string;                   // Professional title or role
  summary?: string;                 // Professional summary or objective
  skills: string[];                 // List of professional skills
  experience: {                     // Professional experience entries
    company: string;                // Company or organization name
    position: string;               // Job title or position
    startDate: string;              // When the position began
    endDate?: string;               // When the position ended (optional if current)
    location?: string;              // Job location
    description: string[];          // Bullet points describing responsibilities/achievements
  }[];
  education: {                      // Educational background entries
    institution: string;            // Name of school, college, or university
    degree: string;                 // Type of degree obtained
    field?: string;                 // Field of study or major
    startDate: string;              // When education began
    endDate?: string;               // When education ended
    gpa?: string;                   // Grade point average
  }[];
  certifications?: string[];        // Professional certifications
};

/**
 * Optimization suggestion structure
 * Represents improvement suggestions provided by the AI
 */
export type Suggestion = {
  type: string;    // Category of suggestion (e.g., "summary", "experience", "skills")
  text: string;    // The actual suggestion content
  impact: string;  // Description of how this improves the resume
};

/**
 * AI optimization result structure
 * Complete result returned from the optimization process
 */
export type OptimizationResult = {
  optimizedData: ResumeData;              // Updated resume data
  optimizedText: string;                  // Raw optimized text
  suggestions: Suggestion[];              // List of improvement suggestions
  atsScore: number;                       // ATS compatibility score (0-100)
  keywordSuggestions: string[];           // Industry-specific keywords to consider adding
  detectedLanguage: string;               // Detected language of the resume
};

/**
 * Uploads a resume file to Supabase storage
 * 
 * @param file - The resume file to upload
 * @returns Object containing the file path and any error
 */
export async function uploadResume(file: File): Promise<{ path: string; error: Error | null }> {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop() || 'pdf';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `resumes/${fileName}`;

    // Show upload status toast
    const toastId = toast.loading("Uploading resume...");

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from('resume-files')
      .upload(filePath, file);

    if (error) {
      toast.dismiss(toastId);
      toast.error("Upload failed", { description: error.message });
      throw error;
    }

    toast.dismiss(toastId);
    toast.success("Resume uploaded successfully");

    return { path: filePath, error: null };
  } catch (error: any) {
    console.error("Error uploading resume:", error);
    return { path: '', error };
  }
}

/**
 * Gets the public URL for a file in Supabase storage
 * 
 * @param filePath - Path to the file in storage
 * @returns Public URL of the file
 */
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage
    .from('resume-files')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Parses a resume file to extract structured information
 * 
 * @param filePath - Path to the resume file in Supabase storage
 * @returns Object containing the parsed data and any error
 */
export async function parseResume(filePath: string): Promise<{ data: ResumeData | null; error: Error | null }> {
  try {
    // Show parsing status toast
    const toastId = toast.loading("Analyzing resume structure...");

    // Call Supabase Edge Function to parse resume
    const { data, error } = await supabase.functions.invoke('parse-resume', {
      body: { filePath },
    });

    if (error) {
      toast.dismiss(toastId);
      toast.error("Resume analysis failed", { description: error.message });
      throw error;
    }
    
    toast.dismiss(toastId);
    toast.success("Resume structure analyzed successfully");

    return { data, error: null };
  } catch (error: any) {
    console.error("Error parsing resume:", error);
    return { data: null, error };
  }
}

/**
 * Optimizes a resume using AI to improve content and ATS compatibility
 * 
 * @param resumeData - Structured resume data to optimize
 * @returns Optimized data, suggestions, and any error
 */
export async function optimizeResume(resumeData: ResumeData): Promise<{ 
  optimizedData: ResumeData | null; 
  optimizedText: string | null;
  suggestions: Suggestion[];
  keywordSuggestions: string[];
  atsScore: number;
  error: Error | null 
}> {
  try {
    // Show optimization status toast
    const toastId = toast.loading("Optimizing your resume with AI...");

    // Call Supabase Edge Function to optimize resume
    const { data, error } = await supabase.functions.invoke('optimize-resume', {
      body: { resumeData },
    });

    if (error) {
      toast.dismiss(toastId);
      toast.error("Optimization failed", { description: error.message });
      throw error;
    }
    
    toast.dismiss(toastId);
    toast.success("Resume optimized successfully", { 
      description: `ATS Score: ${data.atsScore}/100` 
    });
    
    return { 
      optimizedData: data.optimizedData, 
      optimizedText: data.optimizedText || null,
      suggestions: data.suggestions || [], 
      keywordSuggestions: data.keywordSuggestions || [],
      atsScore: data.atsScore || 60, // Default to 60 if not provided
      error: null 
    };
  } catch (error: any) {
    console.error("Error optimizing resume:", error);
    return { 
      optimizedData: null,
      optimizedText: null,
      suggestions: [], 
      keywordSuggestions: [],
      atsScore: 0,
      error 
    };
  }
}

/**
 * Retrieves the most recent optimized resume for a user
 * With enhanced diagnostics for troubleshooting database access issues
 * 
 * @param userId - The ID of the user
 * @returns The optimized resume data or null if not found
 */
export async function getLatestOptimizedResume(userId: string): Promise<{
  data: {
    id: string;
    original_text: string;
    optimized_text: string;
    language: string;
    file_name: string;
    file_type: string;
    file_size?: number;
  } | null;
  error: Error | null;
}> {
  try {
    console.log("Getting latest resume for user:", userId);
    
    // Diagnostic test: Check database connection with a simple query
    console.log("Running database connection test...");
    const { data: testData, error: testError } = await supabase
      .from('resumes')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error("Database connection test failed:", testError);
      
      // If the error is specifically about the table not existing
      if (testError.code === '42P01') {
        console.log("Table does not exist error detected");
        
        // Try creating a dummy record to see if we have insert permissions
        // This is just for diagnostic purposes
        const { error: createError } = await supabase
          .from('resumes')
          .insert({ 
            id: '00000000-0000-0000-0000-000000000000', 
            original_text: 'test', 
            optimized_text: 'test',
            user_id: '00000000-0000-0000-0000-000000000000',
            auth_user_id: 'test' 
          })
          .select();
          
        console.log("Attempt to create dummy record result:", createError ? "Failed" : "Success");
      }
      
      return { data: null, error: testError };
    }
    
    console.log("Database connection test succeeded");
    
    // Main query: Get the most recent resume for this user
    console.log(`Querying for resumes with auth_user_id = ${userId}`);
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('auth_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Log detailed query results for debugging
    if (error) {
      console.error("Resume query failed:", error);
      return { data: null, error };
    }
    
    console.log(`Found ${data?.length || 0} resumes for user ${userId}`);
    
    // If we found resumes, log the first one's ID for verification
    if (data && data.length > 0) {
      console.log("Most recent resume ID:", data[0].id);
      
      // Check if the resume has the required fields
      const requiredFields = ['original_text', 'optimized_text', 'language', 'file_name', 'file_type'];
      const missingFields = requiredFields.filter(field => !data[0][field]);
      
      if (missingFields.length > 0) {
        console.warn("Resume is missing required fields:", missingFields.join(', '));
      }
      
      return { data: data[0], error: null };
    } else {
      console.log("No resumes found for this user");
      
      // Run another test query to see if there are any resumes in the database at all
      const { data: allResumes, error: countError } = await supabase
        .from('resumes')
        .select('id')
        .limit(5);
        
      console.log(`Database has ${allResumes?.length || 0} total resumes (limit 5 check)`);
      
      return { data: null, error: null };
    }
  } catch (error: any) {
    console.error("Exception in getLatestOptimizedResume:", error);
    return { 
      data: null, 
      error: new Error(`Failed to get resume: ${error.message}`) 
    };
  }
}

/**
 * Direct test function to check if user data exists in the database
 * This is useful for diagnosing issues with specific users
 * 
 * @param userId - The user ID to check
 * @returns True if the user's data exists, false otherwise
 */
export async function testUserDataExists(userId: string): Promise<boolean> {
  try {
    // Check if there are any resumes for this user
    const { data, error } = await supabase
      .from('resumes')
      .select('id')
      .eq('auth_user_id', userId)
      .limit(1);
      
    if (error) {
      console.error("User data test failed:", error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error("User data test error:", error);
    return false;
  }
}

/**
 * Parses optimized text into structured resume sections
 * 
 * @param text - Optimized resume text
 * @returns Structured resume sections
 */
export function parseOptimizedText(text: string): ResumeData {
  try {
    // Initialize default sections
    const parsedData: ResumeData = {
      skills: [],
      experience: [],
      education: [],
    };
    
    // Return early if text is empty or too short
    if (!text || text.length < 50) {
      console.warn("Optimized text is too short to parse properly");
      return parsedData;
    }
    
    // Split text into lines for parsing
    const lines = text.split('\n').filter(line => line.trim());
    
    // Basic parsing logic - this would be more sophisticated in production
    // First line is usually the name
    if (lines.length > 0) {
      parsedData.fullName = lines[0].trim();
    }
    
    // Second line often contains title/position
    if (lines.length > 1) {
      parsedData.title = lines[1].trim();
    }
    
    // Look for contact information
    const contactRegex = /(\+\d[\d\s-]+|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b)/;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /(\+\d[\d\s-]+|\(\d{3}\)[\s-]?\d{3}[\s-]?\d{4}|\d{3}[\s.-]?\d{3}[\s.-]?\d{4})/;
    
    // Find contact info in the first 10 lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      
      // Check for email
      const emailMatch = line.match(emailRegex);
      if (emailMatch && !parsedData.email) {
        parsedData.email = emailMatch[0];
      }
      
      // Check for phone
      const phoneMatch = line.match(phoneRegex);
      if (phoneMatch && !parsedData.phone) {
        parsedData.phone = phoneMatch[0];
      }
      
      // Check for location (often with city/state format)
      const locationRegex = /[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}/;
      const locationMatch = line.match(locationRegex);
      if (locationMatch && !parsedData.location) {
        parsedData.location = locationMatch[0];
      }
    }
    
    // Look for summary/about section
    let summaryStartIndex = lines.findIndex(line => 
      /summary|profile|about/i.test(line)
    );
    
    if (summaryStartIndex !== -1) {
      let summaryText = "";
      let i = summaryStartIndex + 1;
      while (i < lines.length && !lines[i].match(/^(experience|education|skills)/i)) {
        summaryText += lines[i] + " ";
        i++;
      }
      parsedData.summary = summaryText.trim();
    }
    
    // Look for experience section
    let experienceStartIndex = lines.findIndex(line => 
      /experience|work|employment/i.test(line)
    );
    
    if (experienceStartIndex !== -1) {
      // Find education or skills to know where experience section ends
      const nextSectionIndex = lines.findIndex((line, index) => 
        index > experienceStartIndex && /^(education|skills)/i.test(line)
      );
      
      const experienceEndIndex = nextSectionIndex !== -1 ? nextSectionIndex : lines.length;
      const experienceSection = lines.slice(experienceStartIndex + 1, experienceEndIndex);
      
      // Process experience entries
      let currentExperience: any = null;
      
      for (const line of experienceSection) {
        if (!line.trim()) continue;
        
        // Check for new experience entry (usually has company name or title prominently)
        if (line.length < 100 && (
          /\b(19|20)\d{2}\b/.test(line) || 
          /present/i.test(line) || 
          line.includes("|") || 
          /^[A-Z]/.test(line.trim()) && line.trim().length < 50
        )) {
          // If we already have an experience entry, save it
          if (currentExperience && currentExperience.company && currentExperience.position) {
            parsedData.experience.push(currentExperience);
          }
          
          // Start new experience entry
          currentExperience = {
            company: "",
            position: "",
            startDate: "",
            endDate: "",
            location: "",
            description: []
          };
          
          // Extract company, position, dates
          const parts = line.split(/\s*[\|\-–]\s*/);
          if (parts.length >= 2) {
            currentExperience.position = parts[0].trim();
            currentExperience.company = parts[1].trim();
            
            if (parts.length >= 3) {
              currentExperience.location = parts[2].trim();
            }
          } else {
            // If only one part, treat as position for now
            currentExperience.position = line.trim();
          }
          
          // Extract dates if present
          const dateMatch = line.match(/\b(19|20)\d{2}\b\s*(-|–|to)\s*(present|\b(19|20)\d{2}\b)/i);
          if (dateMatch) {
            const dates = dateMatch[0].split(/\s*(-|–|to)\s*/i);
            currentExperience.startDate = dates[0].trim();
            currentExperience.endDate = dates[1].trim();
          }
        } 
        // Add to description if we have a current experience
        else if (currentExperience) {
          if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
            currentExperience.description.push(line.replace(/^[•\-*\d\.]\s*/, '').trim());
          } else if (currentExperience.description.length > 0) {
            // Continue previous bullet point
            currentExperience.description[currentExperience.description.length - 1] += " " + line.trim();
          } else {
            // If no bullet point yet, might be part of position/company/etc.
            if (!currentExperience.position || currentExperience.position === "") {
              currentExperience.position = line.trim();
            } else if (!currentExperience.company || currentExperience.company === "") {
              currentExperience.company = line.trim();
            }
          }
        }
      }
      
      // Add the last experience if we have one
      if (currentExperience && currentExperience.company && currentExperience.position) {
        parsedData.experience.push(currentExperience);
      }
    }
    
    // Look for education section
    let educationStartIndex = lines.findIndex(line => 
      /education|degree|university|college/i.test(line)
    );
    
    if (educationStartIndex !== -1) {
      // Find skills to know where education section ends
      const nextSectionIndex = lines.findIndex((line, index) => 
        index > educationStartIndex && /^(skills)/i.test(line)
      );
      
      const educationEndIndex = nextSectionIndex !== -1 ? nextSectionIndex : lines.length;
      const educationSection = lines.slice(educationStartIndex + 1, educationEndIndex);
      
      // Process education entries
      let currentEducation: any = null;
      
      for (const line of educationSection) {
        if (!line.trim()) continue;
        
        // Check for new education entry
        if (line.length < 100 && (
          /university|college|institute|school/i.test(line) || 
          /degree|diploma|bachelor|master|phd/i.test(line) || 
          /\b(19|20)\d{2}\b/.test(line)
        )) {
          // If we already have an education entry, save it
          if (currentEducation && currentEducation.institution && currentEducation.degree) {
            parsedData.education.push(currentEducation);
          }
          
          // Start new education entry
          currentEducation = {
            institution: "",
            degree: "",
            field: "",
            startDate: "",
            endDate: "",
            gpa: ""
          };
          
          // Try to extract institution and degree
          const uniMatch = line.match(/\b(University|College|Institute|School)\s+of\s+[A-Za-z\s]+|\b[A-Za-z\s]+\s+(University|College|Institute|School)\b/i);
          if (uniMatch) {
            currentEducation.institution = uniMatch[0].trim();
          }
          
          const degreeMatch = line.match(/\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|Associate'?s?|Bachelor'?s?|Master'?s?|Doctorate|Diploma)\b[^,]*?/i);
          if (degreeMatch) {
            currentEducation.degree = degreeMatch[0].trim();
          }
          
          // Extract dates if present
          const dateMatch = line.match(/\b(19|20)\d{2}\b\s*(-|–|to)\s*(present|\b(19|20)\d{2}\b)/i);
          if (dateMatch) {
            const dates = dateMatch[0].split(/\s*(-|–|to)\s*/i);
            currentEducation.startDate = dates[0].trim();
            currentEducation.endDate = dates[1].trim();
          } else {
            // Look for single year
            const yearMatch = line.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              currentEducation.endDate = yearMatch[0].trim();
            }
          }
        } 
        // Add details to current education
        else if (currentEducation) {
          // Check for GPA
          const gpaMatch = line.match(/GPA\s*:?\s*\d+\.?\d*/i);
          if (gpaMatch) {
            currentEducation.gpa = gpaMatch[0].replace(/GPA\s*:?\s*/i, '').trim();
          }
          
          // Check for field of study
          const fieldMatch = line.match(/in\s+([A-Za-z\s]+)/i);
          if (fieldMatch && !currentEducation.field) {
            currentEducation.field = fieldMatch[1].trim();
          }
          
          // If nothing matched, try to fill missing information
          if (!gpaMatch && !fieldMatch) {
            if (!currentEducation.institution || currentEducation.institution === "") {
              const uniMatch = line.match(/\b(University|College|Institute|School)\s+of\s+[A-Za-z\s]+|\b[A-Za-z\s]+\s+(University|College|Institute|School)\b/i);
              if (uniMatch) {
                currentEducation.institution = uniMatch[0].trim();
              }
            } else if (!currentEducation.degree || currentEducation.degree === "") {
              const degreeMatch = line.match(/\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|Associate'?s?|Bachelor'?s?|Master'?s?|Doctorate|Diploma)\b[^,]*?/i);
              if (degreeMatch) {
                currentEducation.degree = degreeMatch[0].trim();
              }
            }
          }
        }
      }
      
      // Add the last education if we have one
      if (currentEducation && (currentEducation.institution || currentEducation.degree)) {
        parsedData.education.push(currentEducation);
      }
      
      // Ensure at least one education entry exists
      if (parsedData.education.length === 0) {
        parsedData.education.push({
          institution: "University/School",
          degree: "Degree",
          startDate: ""
        });
      }
    }
    
    // Look for skills section
    let skillsStartIndex = lines.findIndex(line => 
      /skills|competencies|technologies/i.test(line)
    );
    
    if (skillsStartIndex !== -1) {
      // Combine skills lines
      let skillsText = "";
      for (let i = skillsStartIndex + 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          skillsText += lines[i] + " ";
        }
      }
      
      // Split by common separators and clean up
      parsedData.skills = skillsText
        .split(/[,•\-|\/\\*\n]+/)
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0 && !skill.match(/^\s*and\s*$/i));
    }
    
    // If skills were not found, try to extract them from the entire text
    if (parsedData.skills.length === 0) {
      // Look for technical terms, programming languages, etc.
      const techTerms = [
        "JavaScript", "TypeScript", "Python", "Java", "C#", "Ruby", "PHP", "HTML", "CSS",
        "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring", 
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "SQL", "MongoDB", "PostgreSQL",
        "MySQL", "Oracle", "Git", "Jira", "Agile", "Scrum", "DevOps", "CI/CD"
      ];
      
      for (const term of techTerms) {
        if (new RegExp(`\\b${term}\\b`, 'i').test(text)) {
          parsedData.skills.push(term);
        }
      }
    }
    
    return parsedData;
  } catch (error) {
    console.error("Error parsing optimized text:", error);
    
    // Return minimal valid structure on error
    return {
      skills: [],
      experience: [{
        company: "Error parsing experience",
        position: "Please review the full text",
        startDate: "",
        description: []
      }],
      education: [{
        institution: "Error parsing education",
        degree: "Please review the full text",
        startDate: ""
      }]
    };
  }
}

/**
 * Extracts potential keywords from optimized resume text
 * 
 * @param text - Optimized resume text
 * @returns Array of potential keywords
 */
export function extractKeywords(text: string): string[] {
  try {
    // Common industry and technical terms to look for
    const commonTerms = [
      "JavaScript", "TypeScript", "Python", "Java", "C#", "Ruby", "PHP", "HTML", "CSS",
      "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring", 
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "SQL", "MongoDB", "PostgreSQL",
      "MySQL", "Oracle", "Git", "Jira", "Agile", "Scrum", "DevOps", "CI/CD",
      "Project Management", "Team Leadership", "Communication", "Problem Solving",
      "Data Analysis", "Machine Learning", "AI", "Business Intelligence",
      "Marketing", "Sales", "Customer Service", "SEO", "SEM", "Content Marketing",
      "UX/UI", "Product Management", "Accounting", "Finance", "HR", "Recruiting"
    ];
    
    // Extract capitalized words as potential technical skills
    const capitalized = text.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [];
    
    // Filter out common non-skill capitalized words
    const nonSkillWords = ["I", "My", "The", "A", "An", "In", "On", "At", "For", "To", "From", "With"];
    const capitalizedSkills = capitalized.filter(word => !nonSkillWords.includes(word));
    
    // Combine with common terms found in the text
    const keywordSet = new Set([
      ...capitalizedSkills,
      ...commonTerms.filter(term => text.toLowerCase().includes(term.toLowerCase()))
    ]);
    
    return Array.from(keywordSet);
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return [];
  }
}

/**
 * Calculates an ATS score based on resume content
 * 
 * @param resumeData - Structured resume data
 * @returns Score between 0-100
 */
export function calculateAtsScore(resumeData: ResumeData): number {
  let score = 60; // Base score
  
  // Personal information section (10 points)
  if (resumeData.fullName) score += 1;
  if (resumeData.email) score += 2;
  if (resumeData.phone) score += 2;
  if (resumeData.location) score += 1;
  if (resumeData.title) score += 2;
  if (resumeData.summary && resumeData.summary.length > 50) score += 2;
  
  // Experience section (up to 15 points)
  if (resumeData.experience.length > 0) {
    score += Math.min(5, resumeData.experience.length); // Up to 5 points for number of experiences
    
    // Check completeness of each experience
    let expPoints = 0;
    resumeData.experience.forEach(exp => {
      if (exp.company) expPoints += 0.5;
      if (exp.position) expPoints += 0.5;
      if (exp.startDate) expPoints += 0.5;
      if (exp.description && exp.description.length > 0) {
        expPoints += Math.min(3, exp.description.length * 0.5); // Up to 3 points for detailed descriptions
      }
    });
    
    score += Math.min(10, expPoints); // Cap at 10 points
  }
  
  // Education section (up to 10 points)
  if (resumeData.education.length > 0) {
    const edu = resumeData.education[0]; // Consider at least first education entry
    if (edu.institution) score += 2;
    if (edu.degree) score += 2;
    if (edu.startDate || edu.endDate) score += 1;
    if (edu.field) score += 1;
    // Additional points for multiple education entries
    score += Math.min(4, (resumeData.education.length - 1) * 2); // Up to 4 more points
  }
  
  // Skills section (up to 10 points)
  if (resumeData.skills.length > 0) {
    score += Math.min(10, resumeData.skills.length * 0.5); // 0.5 points per skill, up to 10 points
  }
  
  // Certifications bonus (up to 5 points)
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    score += Math.min(5, resumeData.certifications.length * 1.5);
  }
  
  // Cap at 100
  return Math.min(100, Math.round(score));
}

/**
 * Creates a mock resume for preview when no actual data is available
 * This is useful for displaying a preview even when database retrieval fails
 * 
 * @returns A mock resume data object for display
 */
export function createFallbackResumeData(): {
  optimizedText: string;
  language: string;
  resumeSections: any;
} {
  // Create a dummy optimized text
  const optimizedText = `John Doe
Frontend Developer

Contact: johndoe@example.com | (123) 456-7890 | New York, NY

Professional Summary
Passionate frontend developer with 5+ years of experience building responsive web applications using React and TypeScript.

Experience
Senior Frontend Developer | TechCorp Inc. | Jan 2020 - Present
• Led the development of a customer portal that increased user engagement by 35%
• Implemented CI/CD pipeline that reduced deployment time by 40%
• Mentored junior developers and conducted code reviews

Frontend Developer | WebSolutions LLC | Jun 2017 - Dec 2019
• Developed responsive UI components using React and Redux
• Optimized application performance by reducing load time by 25%
• Collaborated with designers to implement UI/UX improvements

Education
BS in Computer Science | Boston University | 2017
GPA: 3.8/4.0

Skills
JavaScript, TypeScript, React, Redux, HTML, CSS, Node.js, Git, CI/CD, Agile, Jest, UI/UX, RESTful APIs`;

  // Define resume sections for preview component
  const resumeSections = {
    personalInfo: {
      name: "John Doe",
      title: "Frontend Developer",
      contact: "New York, NY | johndoe@example.com | (123) 456-7890",
      about: "Passionate frontend developer with 5+ years of experience building responsive web applications using React and TypeScript."
    },
    experience: [
      {
        title: "Senior Frontend Developer",
        company: "TechCorp Inc.",
        period: "Jan 2020 - Present",
        location: "New York, NY",
        achievements: [
          "Led the development of a customer portal that increased user engagement by 35%",
          "Implemented CI/CD pipeline that reduced deployment time by 40%",
          "Mentored junior developers and conducted code reviews"
        ]
      },
      {
        title: "Frontend Developer",
        company: "WebSolutions LLC",
        period: "Jun 2017 - Dec 2019",
        location: "Boston, MA",
        achievements: [
          "Developed responsive UI components using React and Redux",
          "Optimized application performance by reducing load time by 25%",
          "Collaborated with designers to implement UI/UX improvements"
        ]
      }
    ],
    education: {
      degree: "BS in Computer Science",
      school: "Boston University",
      year: "2017",
      gpa: "3.8/4.0"
    },
    skills: [
      "JavaScript", "TypeScript", "React", "Redux", "HTML", "CSS", "Node.js", 
      "Git", "CI/CD", "Agile", "Jest", "UI/UX", "RESTful APIs"
    ]
  };

  return {
    optimizedText,
    language: "English",
    resumeSections
  };
}

/**
 * Directly fetches a resume by ID from the database
 * Useful for loading a specific resume when you have its ID
 * 
 * @param resumeId - UUID of the resume to fetch
 * @returns Resume data and any error
 */
export async function getResumeById(resumeId: string): Promise<{
  data: any | null;
  error: Error | null;
}> {
  try {
    console.log(`Fetching resume with ID: ${resumeId}`);
    
    // Direct query using the resume ID
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();
      
    if (error) {
      console.error("Error fetching resume by ID:", error);
      return { data: null, error };
    }
    
    console.log("Resume fetch successful:", data ? "Data found" : "No data");
    return { data, error: null };
  } catch (error: any) {
    console.error("Exception in getResumeById:", error);
    return { data: null, error };
  }
}

/**
 * Gets keywords for a specific resume from the resume_keywords table
 * 
 * @param resumeId - UUID of the resume
 * @returns Array of keywords and any error
 */
export async function getKeywordsForResume(resumeId: string): Promise<{
  keywords: { text: string, applied: boolean }[];
  error: Error | null;
}> {
  try {
    console.log(`Fetching keywords for resume ID: ${resumeId}`);
    
    const { data, error } = await supabase
      .from('resume_keywords')
      .select('keyword, is_applied')
      .eq('resume_id', resumeId);
      
    if (error) {
      console.error("Error fetching keywords:", error);
      return { keywords: [], error };
    }
    
    // Map the results to the expected format
    const keywords = data.map(item => ({
      text: item.keyword,
      applied: item.is_applied
    }));
    
    console.log(`Found ${keywords.length} keywords for resume ${resumeId}`);
    return { keywords, error: null };
  } catch (error: any) {
    console.error("Exception in getKeywordsForResume:", error);
    return { keywords: [], error };
  }
}

/**
 * Gets suggestions for a specific resume from the resume_suggestions table
 * 
 * @param resumeId - UUID of the resume
 * @returns Array of suggestions and any error
 */
export async function getSuggestionsForResume(resumeId: string): Promise<{
  suggestions: Suggestion[];
  error: Error | null;
}> {
  try {
    console.log(`Fetching suggestions for resume ID: ${resumeId}`);
    
    const { data, error } = await supabase
      .from('resume_suggestions')
      .select('type, text, impact, is_applied')
      .eq('resume_id', resumeId);
      
    if (error) {
      console.error("Error fetching suggestions:", error);
      return { suggestions: [], error };
    }
    
    // Map the results to the expected format
    const suggestions = data.map(item => ({
      type: item.type,
      text: item.text,
      impact: item.impact,
      isApplied: item.is_applied
    }));
    
    console.log(`Found ${suggestions.length} suggestions for resume ${resumeId}`);
    return { suggestions, error: null };
  } catch (error: any) {
    console.error("Exception in getSuggestionsForResume:", error);
    return { suggestions: [], error };
  }
}

/**
 * Check database connection and table access
 * Useful for diagnosing database connection issues
 * 
 * @returns Object with test results
 */
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  tableAccess: Record<string, boolean>;
  error: Error | null;
}> {
  try {
    console.log("Running database connection check...");
    
    // Test basic database connection
    const { data, error } = await supabase.from('resumes').select('count()');
    
    if (error) {
      console.error("Database connection failed:", error);
      return { 
        connected: false, 
        tableAccess: {}, 
        error: new Error(`Database connection failed: ${error.message}`) 
      };
    }
    
    // Test access to individual tables
    const tableAccess: Record<string, boolean> = {};
    const tablesToCheck = ['resumes', 'resume_keywords', 'resume_suggestions'];
    
    for (const table of tablesToCheck) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count()')
        .limit(1);
        
      tableAccess[table] = !tableError;
      
      if (tableError) {
        console.error(`Access to ${table} failed:`, tableError);
      }
    }
    
    return {
      connected: true,
      tableAccess,
      error: null
    };
  } catch (error: any) {
    console.error("Database connection check error:", error);
    return {
      connected: false,
      tableAccess: {},
      error
    };
  }
}

/**
 * Builds a complete resume data package from the database and parsing functions
 * This is a comprehensive function that combines multiple data retrieval operations
 * 
 * @param userId - User ID to fetch resume for
 * @returns Complete resume data package or null if not found
 */
export async function getCompleteResumeData(userId: string): Promise<{
  resumeData: any | null;
  optimizedText: string;
  parsedData: ResumeData | null;
  keywords: { text: string, applied: boolean }[];
  suggestions: Suggestion[];
  atsScore: number;
  error: Error | null;
}> {
  try {
    // First try to get resume data from database
    console.log("Attempting to build complete resume data for user:", userId);
    
    // Get latest resume
    const { data: resumeData, error: resumeError } = await getLatestOptimizedResume(userId);
    
    // Handle case where database access fails or no resume exists
    if (resumeError || !resumeData) {
      console.log("Using fallback resume data due to:", resumeError?.message || "No resume found");
      const fallback = createFallbackResumeData();
      
      return {
        resumeData: null,
        optimizedText: fallback.optimizedText,
        parsedData: parseOptimizedText(fallback.optimizedText),
        keywords: extractKeywords(fallback.optimizedText).map(k => ({ text: k, applied: false })),
        suggestions: [],
        atsScore: 65, // Default score
        error: resumeError
      };
    }
    
    // Parse the optimized text
    const parsedData = parseOptimizedText(resumeData.optimized_text);
    const keywords: { text: string, applied: boolean }[] = [];
    let suggestions: Suggestion[] = [];
    
    // Try to get real keywords from database
    try {
      const { keywords: dbKeywords, error: keywordsError } = await getKeywordsForResume(resumeData.id);
      if (!keywordsError && dbKeywords.length > 0) {
        keywords.push(...dbKeywords);
      } else {
        // Fallback to extracted keywords
        const extractedKeywords = extractKeywords(resumeData.optimized_text);
        keywords.push(...extractedKeywords.map(k => ({ text: k, applied: false })));
      }
    } catch (keywordError) {
      console.error("Error getting keywords:", keywordError);
      // Still use extracted keywords as fallback
      const extractedKeywords = extractKeywords(resumeData.optimized_text);
      keywords.push(...extractedKeywords.map(k => ({ text: k, applied: false })));
    }
    
    // Try to get real suggestions from database
    try {
      const { suggestions: dbSuggestions, error: suggestionsError } = await getSuggestionsForResume(resumeData.id);
      if (!suggestionsError && dbSuggestions.length > 0) {
        suggestions = dbSuggestions;
      }
    } catch (suggestionError) {
      console.error("Error getting suggestions:", suggestionError);
    }
    
    // Calculate ATS score
    const atsScore = resumeData.ats_score || calculateAtsScore(parsedData);
    
    return {
      resumeData,
      optimizedText: resumeData.optimized_text,
      parsedData,
      keywords,
      suggestions,
      atsScore,
      error: null
    };
  } catch (error: any) {
    console.error("Error building complete resume data:", error);
    
    // Return fallback data
    const fallback = createFallbackResumeData();
    
    return {
      resumeData: null,
      optimizedText: fallback.optimizedText,
      parsedData: parseOptimizedText(fallback.optimizedText),
      keywords: extractKeywords(fallback.optimizedText).map(k => ({ text: k, applied: false })),
      suggestions: [],
      atsScore: 65,
      error
    };
  }
}