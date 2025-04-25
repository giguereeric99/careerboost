import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/utils/processResume";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { extname } from "path";
import { v4 as uuidv4 } from 'uuid';
import Anthropic from "@anthropic-ai/sdk";

/**
 * Initialize Supabase client with environment variables
 * Uses service role key for full database access
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Initialize OpenAI client with API key
 */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Initialize Anthropic client with API key for Claude
 */
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Map of MIME types to human-readable labels for file types
 */
const mimeLabelMap: Record<string, string> = {
  "application/pdf": "PDF Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
  "text/plain": "Text File",
};

/**
 * Calculate a simple ATS score based on resume content
 * 
 * @param text - The optimized resume text
 * @returns A score between 0-100
 */
function calculateAtsScore(text: string): number {
  // Base score
  let score = 60;
  
  // Check for important sections
  if (text.match(/summary|profile|objective/i)) score += 5;
  if (text.match(/experience|work|employment/i)) score += 5;
  if (text.match(/education|degree|university/i)) score += 5;
  if (text.match(/skills|competencies|proficiencies/i)) score += 5;
  
  // Check for bullet points (indicates structured content)
  const bulletPoints = (text.match(/•|-|\*/g) || []).length;
  score += Math.min(10, bulletPoints / 2); // Max 10 points from bullet points
  
  // Check length (longer is usually more detailed)
  score += Math.min(5, text.length / 1000); // Max 5 points from length
  
  // Check for action verbs
  const actionVerbs = ['managed', 'developed', 'created', 'implemented', 'led', 'designed', 'built'];
  const actionVerbCount = actionVerbs.reduce((count, verb) => 
    count + (text.toLowerCase().match(new RegExp(`\\b${verb}\\b`, 'g')) || []).length, 0);
  score += Math.min(5, actionVerbCount); // Max 5 points from action verbs
  
  // Cap at 100
  return Math.min(100, Math.round(score));
}

/**
 * Checks if a string is a valid UUID
 * 
 * @param id - String to check
 * @returns Whether the string is a valid UUID
 */
function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Create a reference map between Clerk/Auth user IDs and UUID format
 * This helps track the relationship between external auth IDs and internal UUIDs
 * 
 * @param authUserId - The auth user ID (e.g., from Clerk)
 * @param internalUuid - The generated UUID for internal use
 */
async function createUserReference(authUserId: string, internalUuid: string): Promise<void> {
  try {
    // Check if a mapping already exists
    const { data: existingMapping } = await supabase
      .from('user_mapping')
      .select('*')
      .eq('clerk_id', authUserId)
      .limit(1);
      
    // If mapping exists, no need to create a new one
    if (existingMapping && existingMapping.length > 0) {
      console.log(`User mapping already exists for auth user ${authUserId}`);
      return;
    }
    
    // Create a new mapping
    const { error } = await supabase
      .from('user_mapping')
      .insert({
        clerk_id: authUserId,
        supabase_uuid: internalUuid
      });
      
    if (error) {
      console.error("Failed to create user reference mapping:", error);
    } else {
      console.log(`Successfully created user mapping: ${authUserId} -> ${internalUuid}`);
    }
  } catch (error) {
    console.error("Error creating user reference:", error);
  }
}

/**
 * Get or create a UUID for an auth user ID
 * 
 * @param authUserId - The auth user ID (e.g., from Clerk)
 * @returns A valid UUID for database use
 */
async function getOrCreateUserUuid(authUserId: string): Promise<string> {
  // If the ID is already a valid UUID, return it directly
  if (isValidUuid(authUserId)) {
    return authUserId;
  }
  
  try {
    // Check if we have a mapping for this user
    const { data, error } = await supabase
      .from('user_mapping')
      .select('supabase_uuid')
      .eq('clerk_id', authUserId)
      .limit(1);
      
    // If we found a mapping, use the existing UUID
    if (!error && data && data.length > 0) {
      console.log(`Found existing UUID for user ${authUserId}: ${data[0].supabase_uuid}`);
      return data[0].supabase_uuid;
    }
    
    // Otherwise, generate a new UUID
    const newUuid = uuidv4();
    console.log(`Generated new UUID for user ${authUserId}: ${newUuid}`);
    
    // Create the mapping asynchronously (don't wait for it)
    createUserReference(authUserId, newUuid).catch(err => 
      console.error("Failed to create user reference in background:", err)
    );
    
    return newUuid;
  } catch (error) {
    console.error("Error getting user UUID:", error);
    // If all else fails, return a new UUID
    return uuidv4();
  }
}

/**
 * API route handler for resume optimization
 * Accepts file uploads or raw text, processes with multiple AI providers in cascade,
 * and stores results in database
 * 
 * @param req - NextRequest object containing form data
 * @returns JSON response with optimized text or error message
 */
export async function POST(req: NextRequest) {
  // Extract data from form submission
  const formData = await req.formData();
  const fileUrl = formData.get("fileUrl") as string | null;
  const rawText = formData.get("rawText") as string | null;
  const userId = formData.get("userId") as string | null;
  const fileType = formData.get("fileType") as string | null;

  // Validate input - either fileUrl or rawText must be provided
  if (!fileUrl && !rawText) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }

  // Initialize variables
  let text = rawText ?? "";
  let tempFilePath: string | null = null;
  let fileName = rawText ? `pasted-resume-${Date.now()}.txt` : "resume.txt";
  let fileLabel = rawText ? "Text (pasted)" : "Uploaded Resume";
  let fileSize: number | null = null;
  let aiProvider = "openai"; // Track which AI provider was used for optimization
  let resumeId: string | null = null; // Will store the UUID of the created resume

  try {
    // Process file if a URL was provided
    if (fileUrl) {
      console.log("Fetching file from:", fileUrl);
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("Failed to fetch file");

      // Write file to temporary location
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
      const urlParts = fileUrl.split("/");
      fileName = urlParts[urlParts.length - 1];
      const ext = extname(fileName) || ".pdf";
      tempFilePath = path.join(process.cwd(), "tmp", `resume-${Date.now()}${ext}`);
      fs.writeFileSync(tempFilePath, buffer);
      
      // Calculate file size in bytes
      const stats = fs.statSync(tempFilePath);
      fileSize = stats.size;
      
      // Extract text from the file
      text = await extractText(tempFilePath);
      console.log("Extracted text (first 500 chars):", text.slice(0, 500));
      console.log("Extracted length:", text.length);

      // Set file label based on MIME type
      if (fileType && mimeLabelMap[fileType]) {
        fileLabel = mimeLabelMap[fileType];
      }
    }

    // Detect language of resume text using franc library
    const { franc } = await import("franc");
    const langs = await import("langs");
    const langCode = franc(text);
    const language = langs.where("3", langCode)?.name || "English";

    // Create prompt for AI optimization
    const prompt = `This resume is written in ${language}.
Please optimize it to be recruiter-friendly and ATS-compatible.
Use professional formatting and rewrite clearly.
Return a full resume with these sections if applicable:

1. Personal Info
2. Professional Summary
3. Experience (with roles, company, years, key tasks)
4. Education
5. Skills
6. Keywords

Use clear formatting. Keep the answer in ${language}.

Resume:

${text}`;

    // Step 1: Try optimization with OpenAI
    console.log("Analyzing with OpenAI...");
    let optimizedText: string | null = null;
    
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-3.5-turbo",
        max_tokens: 2048,
        temperature: 0.7,
      });

      optimizedText = completion.choices[0].message.content;
      console.log("OpenAI result:", optimizedText?.slice(0, 100));
      
      // Validate OpenAI result
      if (!optimizedText || optimizedText.trim().length < 100) {
        console.warn("OpenAI result too short or empty, will try fallback");
        optimizedText = null;
      }
    } catch (openaiError) {
      console.error("OpenAI optimization failed:", openaiError);
      optimizedText = null;
    }

    // Step 2: Try optimization with Gemini if OpenAI failed
    if (!optimizedText && fileUrl) {
      console.warn("OpenAI result failed, falling back to Gemini...");
      aiProvider = "gemini";

      try {
        const fallbackForm = new FormData();
        fallbackForm.append("fileUrl", fileUrl);

        const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/optimize-gemini`;
        console.log("Calling Gemini fallback:", fallbackUrl);

        const geminiRes = await fetch(fallbackUrl, {
          method: "POST",
          body: fallbackForm,
        });

        if (!geminiRes.ok) {
          throw new Error(`Gemini returned status ${geminiRes.status}`);
        }

        const fallbackText = await geminiRes.text();
        console.log("Gemini raw response:", fallbackText.slice(0, 100));

        const geminiResult = JSON.parse(fallbackText);
        optimizedText = geminiResult.optimizedText;
        
        // Validate Gemini result
        if (!optimizedText || optimizedText.trim().length < 100) {
          console.warn("Gemini result too short or empty, will try Claude");
          optimizedText = null;
        }
      } catch (geminiError) {
        console.error("Gemini optimization failed:", geminiError);
        optimizedText = null;
      }
    }

    // Step 3: Try optimization with Claude if both OpenAI and Gemini failed
    if (!optimizedText) {
      console.warn("Both OpenAI and Gemini failed, falling back to Claude...");
      aiProvider = "claude";
      
      try {
        // Try Claude directly instead of a separate API endpoint
        const claudeCompletion = await anthropic.messages.create({
          model: "claude-3-sonnet-20240229",
          max_tokens: 4096,
          temperature: 0.5,
          system: "You are a professional resume writer who optimizes resumes to be ATS-friendly.",
          messages: [
            { role: "user", content: prompt }
          ],
        });

        optimizedText = claudeCompletion.content[0].text;
        console.log("Claude result:", optimizedText?.slice(0, 100));
        
        // Validate Claude result
        if (!optimizedText || optimizedText.trim().length < 100) {
          throw new Error("Claude result too short or empty");
        }
      } catch (claudeError) {
        console.error("Claude optimization failed:", claudeError);
        throw new Error("All AI providers failed to optimize the resume");
      }
    }

    // Final validation - if we still don't have optimized text, throw error
    if (!optimizedText) {
      throw new Error("No optimization result received from any AI provider");
    }

    // Calculate ATS score for the optimized resume
    const atsScore = calculateAtsScore(optimizedText);
    console.log(`Calculated ATS score: ${atsScore}/100`);

    // Save results to database if user is authenticated
    if (userId && optimizedText) {
      try {
        // Generate a unique ID for this resume
        const dbResumeId = uuidv4();
        resumeId = dbResumeId;
        
        // Get or create a valid UUID for the user - this is the key fix
        const userUuid = await getOrCreateUserUuid(userId);
        
        // Ensure file URL is available (use the provided URL or empty string)
        const fileUrlToStore = fileUrl || '';
        
        // Log information about database insertion
        console.log(`Saving resume to database with ID ${dbResumeId} for user ${userId} (internal UUID: ${userUuid})`);
        
        // Insert the resume record with all fields populated and proper UUID formats
        const insertRes = await supabase.from("resumes").insert({
          id: dbResumeId, // Primary key
          user_id: userUuid, // Use a valid UUID for user_id
          auth_user_id: userId, // Keep original auth user ID as string
          supabase_user_id: userUuid, // Use the same valid UUID
          original_text: text,
          optimized_text: optimizedText,
          file_name: fileName,
          file_type: fileLabel,
          file_url: fileUrlToStore,
          language,
          file_size: fileSize || 0,
          ai_provider: aiProvider,
          ats_score: atsScore
        });
        
        // Check for database errors
        if (insertRes.error) {
          console.error("Supabase insert error:", insertRes.error);
          throw new Error(`Failed to save resume to database. Supabase says: ${JSON.stringify(insertRes.error, null, 2)}`);
        }
        
        console.log("Successfully saved resume to database with ID:", dbResumeId);
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        // Return success response to user even if DB save fails
        // This ensures they still get their optimized text
        console.log("Continuing despite database error to return optimized text to user");
      }
    }

    // Clean up temporary file if it exists
    if (tempFilePath) fs.unlinkSync(tempFilePath);

    // Return successful response with optimized text and metadata
    return NextResponse.json({ 
      resumeId, // Include the resume ID in the response
      optimizedText, 
      language, 
      fileName, 
      fileType: fileLabel,
      fileSize,
      aiProvider,
      atsScore
    });
  } catch (error: any) {
    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    // Log detailed error and return error response
    console.error("Full error object:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}