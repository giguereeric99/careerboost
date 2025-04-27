/**
 * API Route for Resume Optimization with Google Gemini
 * This route serves as a fallback service when OpenAI optimization fails
 * It handles resume files, extracts text content, and uses Gemini Pro to optimize
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { extractText } from "@/utils/processResume";
import fs from "fs";
import path from "path";

// Initialize Google Generative AI with API key from environment variables
// We use a fallback empty string to avoid runtime errors, but API calls will fail without a proper key
const geminiApiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(geminiApiKey);

// Configuration for the Gemini model generation
const GEMINI_CONFIG = {
  // Lower temperature for more predictable outputs
  temperature: 0.4,
  // Higher topK for more diverse options
  topK: 40,
  // Higher topP for more probability mass coverage
  topP: 0.95,
  // Maximum output size to handle full resumes
  maxOutputTokens: 4096,
};

// Safety settings to ensure appropriate content generation
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Detects the language of the given text
 * Uses the franc library for language detection
 * 
 * @param text - The text to analyze
 * @returns The detected language name (defaults to English if detection fails)
 */
async function detectLanguage(text: string): Promise<string> {
  try {
    // Dynamically import franc and langs to reduce initial load time
    const { franc } = await import("franc");
    const langs = await import("langs");
    
    // Detect language using franc library
    const langCode = franc(text);
    
    // Convert language code to full language name
    const language = langs.where("3", langCode)?.name || "English";
    console.log("[Gemini] Detected language:", language);
    
    return language;
  } catch (error) {
    console.error("[Gemini] Language detection failed:", error);
    return "English"; // Default fallback
  }
}

/**
 * Creates an optimization prompt for Gemini based on resume text
 * 
 * @param text - The resume text to optimize
 * @param language - The detected language of the resume
 * @returns A formatted prompt for Gemini
 */
function createOptimizationPrompt(text: string, language: string): string {
  return `This resume is written in ${language}.
Please optimize it to be recruiter-friendly and ATS-compatible.
Use professional formatting and rewrite clearly.

Important guidelines:
- Make it scannable with clear sections and bullet points
- Use strong action verbs for accomplishments
- Quantify achievements where possible
- Include relevant keywords for ATS systems
- Maintain professional tone and formatting

Return a complete resume with these sections:
1. Personal Info (name, contact information)
2. Professional Summary (concise overview of qualifications)
3. Experience (roles, companies, dates, and key accomplishments)
4. Education (degrees, institutions, dates)
5. Skills (technical and soft skills relevant to the field)
6. Additional sections if applicable (certifications, projects, etc.)

Use clear, consistent formatting. Keep the content in ${language}.

Original resume:
${text}`;
}

/**
 * Attempts to optimize a resume with Gemini with multiple retries
 * 
 * @param prompt - The optimization prompt
 * @param maxAttempts - Maximum number of retry attempts
 * @returns The optimized text or throws an error if all attempts fail
 */
async function optimizeWithGemini(prompt: string, maxAttempts = 3): Promise<string> {
  // Initialize the Gemini model with configuration
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    generationConfig: GEMINI_CONFIG,
    safetySettings: SAFETY_SETTINGS,
  });

  console.log("[Gemini] Starting optimization with up to", maxAttempts, "attempts");
  
  let optimizedText = "";
  let attempts = 0;
  let lastError = null;

  // Retry loop with exponential backoff
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[Gemini] Attempt ${attempts}/${maxAttempts}`);
      
      // Generate content with Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      optimizedText = response.text();
      
      // Validate response quality
      if (optimizedText && optimizedText.length > 200) {
        console.log(`[Gemini] Success on attempt ${attempts} - generated ${optimizedText.length} chars`);
        return optimizedText;
      } else {
        console.warn(`[Gemini] Attempt ${attempts}: Response too short (${optimizedText.length} chars)`);
        lastError = new Error("Response too short");
      }
    } catch (genError) {
      console.error(`[Gemini] Attempt ${attempts} failed:`, genError);
      lastError = genError;
    }
    
    // If this wasn't the last attempt, wait before retrying
    if (attempts < maxAttempts) {
      // Exponential backoff: wait longer after each failure
      const delay = Math.pow(2, attempts) * 500; // 1s, 2s, 4s, etc.
      console.log(`[Gemini] Waiting ${delay}ms before next attempt`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error("Failed to optimize resume with Gemini");
}

/**
 * POST handler for resume optimization using Gemini
 * Processes the uploaded file and returns optimized content
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fileUrl = formData.get("fileUrl") as string | null;
  const rawText = formData.get("rawText") as string | null;
  let tempFilePath: string | null = null;
  
  try {
    // Validate input - need either file URL or raw text
    if (!fileUrl && !rawText) {
      return NextResponse.json({ error: "Missing file URL or raw text" }, { status: 400 });
    }
    
    let text = "";
    
    // Process file if URL is provided
    if (fileUrl) {
      console.log("[Gemini] Fetching file from:", fileUrl);
      
      // Fetch the file from storage
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
      
      // Save to temporary file
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
      
      const urlParts = fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const ext = path.extname(fileName) || ".pdf";
      tempFilePath = path.join(process.cwd(), "tmp", `gemini-resume-${Date.now()}${ext}`);
      
      fs.writeFileSync(tempFilePath, buffer);
      
      // Extract text from file
      text = await extractText(tempFilePath);
      console.log("[Gemini] Extracted text length:", text.length);
    } else if (rawText) {
      // Use provided raw text
      text = rawText;
      console.log("[Gemini] Using provided raw text, length:", text.length);
    }
    
    // Validate text length
    if (text.length < 50) {
      throw new Error("Text is too short to process (minimum 50 characters required)");
    }
    
    // Detect language
    const language = await detectLanguage(text);
    
    // Create optimization prompt
    const prompt = createOptimizationPrompt(text, language);
    
    // Optimize with Gemini (with retries)
    const optimizedText = await optimizeWithGemini(prompt);
    
    // Format response to match the expected structure from the main optimization API
    const response = {
      optimizedText,
      language,
      suggestions: generateSuggestions(text, optimizedText),
      keywordSuggestions: extractKeywords(optimizedText),
      atsScore: calculateAtsScore(optimizedText)
    };
    
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("[Gemini] Cleaned up temporary file");
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[Gemini] Error:", error);
    
    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("[Gemini] Cleaned up temporary file after error");
    }
    
    return NextResponse.json(
      { error: `Gemini optimization failed: ${error.message}` }, 
      { status: 500 }
    );
  }
}

/**
 * Generates basic improvement suggestions by comparing original and optimized text
 * This is a simple implementation - in production, you might want more sophisticated analysis
 * 
 * @param originalText - The original resume text
 * @param optimizedText - The optimized resume text
 * @returns An array of suggestion objects
 */
function generateSuggestions(originalText: string, optimizedText: string): any[] {
  // Simple suggestions based on common resume improvements
  const suggestions = [
    {
      type: "summary",
      text: "Add a stronger professional summary",
      impact: "Creates a better first impression and highlights your value proposition"
    },
    {
      type: "experience",
      text: "Use more action verbs and quantify achievements",
      impact: "Makes accomplishments more impactful and demonstrates measurable results"
    },
    {
      type: "skills",
      text: "List skills in a dedicated section",
      impact: "Improves ATS compatibility and makes skills easier to scan"
    }
  ];
  
  // Check for specific improvements
  if (originalText.split('\n').length < optimizedText.split('\n').length) {
    suggestions.push({
      type: "formatting",
      text: "Improve formatting with better section breaks",
      impact: "Enhances readability and makes content easier to scan"
    });
  }
  
  if (optimizedText.match(/[0-9]+%|increased|reduced|improved|managed|led|developed/gi)) {
    suggestions.push({
      type: "achievements",
      text: "Highlight quantifiable achievements",
      impact: "Shows concrete impact rather than just listing responsibilities"
    });
  }
  
  return suggestions;
}

/**
 * Extracts potential keywords from the optimized text
 * 
 * @param optimizedText - The optimized resume text
 * @returns An array of keyword strings
 */
function extractKeywords(optimizedText: string): string[] {
  // Common industry keywords to look for
  const commonKeywords = [
    // Tech/IT
    "JavaScript", "Python", "React", "Node.js", "AWS", "Cloud", "DevOps", "Docker",
    "Kubernetes", "Agile", "Scrum", "Machine Learning", "Data Analysis", "SQL",
    
    // Business/Management
    "Project Management", "Leadership", "Strategy", "Marketing", "Sales", "Finance",
    "Customer Service", "Operations", "HR", "Business Development",
    
    // Soft Skills
    "Communication", "Teamwork", "Problem-solving", "Critical Thinking",
    "Time Management", "Creativity", "Collaboration"
  ];
  
  // Find matches in the optimized text
  const matches = commonKeywords.filter(keyword => 
    optimizedText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Extract capitalized words as potential technical skills
  const capitalizedKeywords = (optimizedText.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [])
    .filter(word => 
      word.length > 2 && 
      !["I", "A", "The", "An", "And", "For", "With"].includes(word)
    );
  
  // Combine and deduplicate
  return [...new Set([...matches, ...capitalizedKeywords])].slice(0, 15);
}

/**
 * Calculates a simple ATS score based on resume content quality
 * 
 * @param text - The optimized resume text
 * @returns A score between 0-100
 */
function calculateAtsScore(text: string): number {
  let score = 65; // Base score
  
  // Check for important sections
  if (text.match(/experience|work history/i)) score += 5;
  if (text.match(/education|degree|university/i)) score += 5;
  if (text.match(/skills|competencies/i)) score += 5;
  if (text.match(/summary|profile|objective/i)) score += 5;
  
  // Check for contact details
  if (text.match(/email|@/i)) score += 2;
  if (text.match(/phone|mobile/i)) score += 2;
  if (text.match(/linkedin|github/i)) score += 1;
  
  // Check for formatting quality
  const bulletPoints = (text.match(/•|-|\*/g) || []).length;
  score += Math.min(5, bulletPoints / 3); // Max 5 points from bullets
  
  // Check for quantifiable achievements
  const metrics = (text.match(/\d+%|\$\d+|\d+ years/g) || []).length;
  score += Math.min(5, metrics); // Max 5 points from metrics
  
  // Cap at 100
  return Math.min(100, Math.round(score));
}