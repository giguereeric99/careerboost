/**
 * API Route for Resume Optimization with Google Gemini
 * This route serves as a fallback service when OpenAI optimization fails
 * It handles resume files, extracts text content, and uses Gemini Pro to optimize
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { extractText } from "@/utils/processResume";
import getResumeOptimizationPrompt from "@/utils/prompts/resumeOptimizationPrompt";
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
 * Attempts to optimize a resume with Gemini with multiple retries
 * 
 * @param resumeText - The resume text to optimize
 * @param language - The detected language of the resume
 * @param maxAttempts - Maximum number of retry attempts
 * @returns The optimization result object or throws an error if all attempts fail
 */
async function optimizeWithGemini(resumeText: string, language: string, maxAttempts = 3): Promise<any> {
  // Initialize the Gemini model with configuration
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    generationConfig: GEMINI_CONFIG,
    safetySettings: SAFETY_SETTINGS,
  });

  console.log("[Gemini] Starting optimization with up to", maxAttempts, "attempts");
  
  // Get the standardized prompt for Gemini
  const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(resumeText, 'gemini', { language });
  
  // Combine system and user prompts for Gemini (as it doesn't have separate system/user inputs)
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  let optimizationResult = null;
  let attempts = 0;
  let lastError = null;

  // Retry loop with exponential backoff
  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[Gemini] Attempt ${attempts}/${maxAttempts}`);
      
      // Generate content with Gemini
      const result = await model.generateContent(combinedPrompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Parse and validate the JSON response
      optimizationResult = parseGeminiResponse(responseText);
      
      // Validate response quality
      if (optimizationResult && optimizationResult.optimizedText && optimizationResult.optimizedText.length > 200) {
        console.log(`[Gemini] Success on attempt ${attempts} - generated ${optimizationResult.optimizedText.length} chars`);
        return optimizationResult;
      } else {
        console.warn(`[Gemini] Attempt ${attempts}: Response too short or invalid`);
        lastError = new Error("Response too short or invalid JSON structure");
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
  
  // If we get here, all attempts failed - create a fallback response
  if (!optimizationResult) {
    console.warn("[Gemini] All optimization attempts failed, generating fallback response");
    return {
      optimizedText: resumeText, // Return original text as fallback
      suggestions: generateFallbackSuggestions(resumeText),
      keywordSuggestions: extractKeywords(resumeText),
      atsScore: 65 // Default score
    };
  }
  
  // Should never reach here, but just in case
  throw lastError || new Error("Failed to optimize resume with Gemini");
}

/**
 * Parses the response from Gemini into a structured optimization result
 * 
 * @param responseText - The raw text response from Gemini
 * @returns A structured optimization result object
 */
function parseGeminiResponse(responseText: string): any {
  try {
    // Try direct JSON parsing first
    let parsedResult = JSON.parse(responseText);
    
    // Return the parsed result if it has the expected structure
    if (parsedResult && parsedResult.optimizedText) {
      // Ensure suggestions is an array with 1-5 elements
      if (!parsedResult.suggestions || !Array.isArray(parsedResult.suggestions)) {
        parsedResult.suggestions = generateFallbackSuggestions(parsedResult.optimizedText);
      } else if (parsedResult.suggestions.length > 5) {
        parsedResult.suggestions = parsedResult.suggestions.slice(0, 5);
      }
      
      // Ensure keywordSuggestions is an array with 1-10 elements
      if (!parsedResult.keywordSuggestions || !Array.isArray(parsedResult.keywordSuggestions)) {
        parsedResult.keywordSuggestions = extractKeywords(parsedResult.optimizedText);
      } else if (parsedResult.keywordSuggestions.length > 10) {
        parsedResult.keywordSuggestions = parsedResult.keywordSuggestions.slice(0, 10);
      }
      
      // Ensure atsScore is a number between 0-100
      if (typeof parsedResult.atsScore !== 'number' || parsedResult.atsScore < 0 || parsedResult.atsScore > 100) {
        parsedResult.atsScore = calculateAtsScore(parsedResult.optimizedText);
      }
      
      return parsedResult;
    }
  } catch (jsonError) {
    console.error("[Gemini] Failed to parse JSON response:", jsonError);
    
    // Try to extract JSON by finding text between curly braces
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        return parseGeminiResponse(extractedJson); // Recursively try to parse the extracted JSON
      }
    } catch (extractError) {
      console.error("[Gemini] Failed to extract JSON from response:", extractError);
    }
  }
  
  // If we get here, we couldn't parse the JSON
  console.warn("[Gemini] Returning raw text as optimizedText with generated suggestions");
  
  // If all parsing fails, treat the entire response as the optimized text
  return {
    optimizedText: responseText,
    suggestions: generateFallbackSuggestions(responseText),
    keywordSuggestions: extractKeywords(responseText),
    atsScore: calculateAtsScore(responseText)
  };
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
    
    // Optimize with Gemini (with retries)
    const optimizationResult = await optimizeWithGemini(text, language);
    
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("[Gemini] Cleaned up temporary file");
    }
    
    return NextResponse.json(optimizationResult);
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
 * Generates fallback improvement suggestions when AI suggestions aren't available
 * 
 * @param resumeText - The resume text to analyze
 * @returns An array of suggestion objects
 */
function generateFallbackSuggestions(resumeText: string): any[] {
  // Basic suggestions that generally apply to most resumes
  const suggestions = [
    {
      type: "structure",
      text: "Improve the overall structure with clear section headings",
      impact: "Makes your resume easier to scan for busy recruiters"
    },
    {
      type: "content",
      text: "Use more action verbs and quantify achievements",
      impact: "Makes accomplishments more impactful and demonstrates measurable results"
    },
    {
      type: "skills",
      text: "Create a dedicated skills section with relevant keywords",
      impact: "Improves ATS compatibility and showcases your core competencies"
    }
  ];
  
  // Add additional contextual suggestions based on the resume content
  if (!resumeText.toLowerCase().includes("summary") && !resumeText.toLowerCase().includes("profile")) {
    suggestions.push({
      type: "content",
      text: "Add a professional summary at the top of your resume",
      impact: "Provides a quick overview of your qualifications and career goals"
    });
  }
  
  if ((resumeText.match(/[.!?]/g) || []).length < 10) {
    suggestions.push({
      type: "language",
      text: "Expand descriptions of your experiences with more details",
      impact: "Gives employers a better understanding of your capabilities and achievements"
    });
  }
  
  // Return 1-5 suggestions
  return suggestions.slice(0, 5);
}

/**
 * Extracts potential keywords from the optimized text
 * 
 * @param optimizedText - The optimized resume text
 * @returns An array of keyword strings (1-10 elements)
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
  
  // Combine, deduplicate, and limit to 10 keywords
  return [...new Set([...matches, ...capitalizedKeywords])].slice(0, 10);
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