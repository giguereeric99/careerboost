/**
 * API Route for Resume Optimization with Anthropic Claude
 * This route serves as the final fallback when both OpenAI and Gemini fail
 * It processes resume files, extracts text, and uses Claude AI to optimize the content
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "@/utils/processResume";
import getResumeOptimizationPrompt from "@/utils/prompts/resumeOptimizationPrompt";
import fs from "fs";
import path from "path";

// Initialize Anthropic client with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Claude model to use - prefer newer models when available
const CLAUDE_MODEL = "claude-3-sonnet-20240229";

/**
 * Detects the language of the given text using franc library
 * 
 * @param text - The text to analyze
 * @returns The detected language name or "English" as default
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
    console.log("[Claude] Detected language:", language);
    
    return language;
  } catch (error) {
    console.error("[Claude] Language detection failed:", error);
    return "English"; // Default fallback
  }
}

/**
 * Attempts to optimize a resume with Claude AI
 * 
 * @param resumeText - The resume text to optimize
 * @param language - The detected language of the resume
 * @returns The optimization result object or throws an error
 */
async function optimizeWithClaude(resumeText: string, language: string): Promise<any> {
  console.log("[Claude] Starting optimization process");
  
  try {
    // Check if API key is properly configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.trim() === '') {
      throw new Error("Anthropic API key not configured");
    }
    
    // Get standardized prompts for Claude
    const { systemPrompt, userPrompt } = getResumeOptimizationPrompt(
      resumeText,
      'claude',
      { language }
    );
    
    // Make request to Claude
    const completion = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0.5,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ],
    });

    // Extract the response text
    const responseText = completion.content[0].text;
    
    // Parse and validate the Claude response
    const result = parseClaudeResponse(responseText, resumeText);
    
    console.log("[Claude] Successfully generated optimized resume");
    return result;
  } catch (error) {
    console.error("[Claude] Optimization failed:", error);
    throw error;
  }
}

/**
 * Parses the response from Claude into a structured optimization result
 * Claude may return JSON directly or wrapped in a code block
 * 
 * @param responseText - The raw text response from Claude
 * @param originalText - The original resume text (used for fallback)
 * @returns A structured optimization result object
 */
function parseClaudeResponse(responseText: string, originalText: string): any {
  try {
    // Remove markdown code block formatting if present
    let jsonContent = responseText.trim();
    
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    // Try direct JSON parsing
    const parsedResult = JSON.parse(jsonContent);
    
    // Validate the response structure
    if (parsedResult && parsedResult.optimizedText) {
      // Ensure optimized text is substantial
      if (parsedResult.optimizedText.length < 200) {
        console.warn("[Claude] Optimized text is too short, using fallback");
        parsedResult.optimizedText = originalText;
      }
      
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
    console.error("[Claude] Failed to parse JSON response:", jsonError);
    
    // Try to extract JSON structure with regex if direct parsing fails
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedJson = jsonMatch[0];
        return parseClaudeResponse(extractedJson, originalText); // Recursively try to parse
      }
    } catch (extractError) {
      console.error("[Claude] Failed to extract JSON from response:", extractError);
    }
  }
  
  // If all parsing fails, use the response as the optimized text
  console.warn("[Claude] Returning raw text with generated suggestions");
  
  return {
    optimizedText: responseText.length > 200 ? responseText : originalText,
    suggestions: generateFallbackSuggestions(responseText),
    keywordSuggestions: extractKeywords(responseText),
    atsScore: calculateAtsScore(responseText)
  };
}

/**
 * POST handler for resume optimization using Claude
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
      console.log("[Claude] Fetching file from:", fileUrl);
      
      // Fetch the file from storage
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);
      
      // Save to temporary file
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
      
      const urlParts = fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const ext = path.extname(fileName) || ".pdf";
      tempFilePath = path.join(process.cwd(), "tmp", `claude-resume-${Date.now()}${ext}`);
      
      fs.writeFileSync(tempFilePath, buffer);
      
      // Extract text from file
      text = await extractText(tempFilePath);
      console.log("[Claude] Extracted text length:", text.length);
    } else if (rawText) {
      // Use provided raw text
      text = rawText;
      console.log("[Claude] Using provided raw text, length:", text.length);
    }

    // Validate text length
    if (text.length < 50) {
      throw new Error("Text is too short to process (minimum 50 characters required)");
    }

    // Detect language
    const language = await detectLanguage(text);
    
    // Optimize with Claude
    const optimizationResult = await optimizeWithClaude(text, language);
    
    // Clean up temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("[Claude] Cleaned up temporary file");
    }
    
    return NextResponse.json(optimizationResult);
  } catch (error: any) {
    console.error("[Claude] Error:", error);
    
    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log("[Claude] Cleaned up temporary file after error");
    }
    
    // Return a helpful error response
    return NextResponse.json(
      { error: `Claude optimization failed: ${error.message}` }, 
      { status: 500 }
    );
  }
}

/**
 * Generates fallback improvement suggestions when AI suggestions aren't available
 * Similar to the function in optimize-gemini to maintain consistency
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
 * Similar to the function in optimize-gemini to maintain consistency
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
 * Similar to the function in optimize-gemini to maintain consistency
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