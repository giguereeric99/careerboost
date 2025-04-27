/**
 * Resume parsing module
 * Contains functions for analyzing and parsing resume text content
 * These functions run entirely client-side and don't require server access
 */

import { ResumeData } from "@/types/resume";

/**
 * Parses optimized text into structured resume sections
 * This function runs entirely client-side and doesn't need server access
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
 * This function runs entirely client-side and doesn't need server access
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
 * This function runs entirely client-side and doesn't need server access
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
 * This function provides fallback data when database retrieval fails
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