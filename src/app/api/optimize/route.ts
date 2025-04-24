import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/utils/processResume";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";
import { extname } from "path";
import { v4 as uuidv4 } from 'uuid'; // Added for UUID generation

// Initialize Supabase client with environment variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize OpenAI client with API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Map of MIME types to human-readable labels
 */
const mimeLabelMap: Record<string, string> = {
  "application/pdf": "PDF Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
  "text/plain": "Text File",
};

/**
 * API route handler for resume optimization
 * Accepts file uploads or raw text, processes with AI, and stores in database
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
      
      // Extract text from the file
      text = await extractText(tempFilePath);
      console.log("Extracted text (first 500 chars):", text.slice(0, 500));
      console.log("Extracted length:", text.length);

      // Set file label based on MIME type
      if (fileType && mimeLabelMap[fileType]) {
        fileLabel = mimeLabelMap[fileType];
      }
    }

    // Detect language of resume text
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

    // Process with OpenAI
    console.log("Analyzing with OpenAI...");
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      max_tokens: 2048,
      temperature: 0.7,
    });

    let optimizedText = completion.choices[0].message.content;
    console.log("OpenAI result:", optimizedText?.slice(0, 100));

    // Fallback to Gemini if OpenAI result is insufficient
    if ((!optimizedText || optimizedText.trim().length < 100) && fileUrl) {
      console.warn("OpenAI result too short or failed, falling back to Gemini...");

      const fallbackForm = new FormData();
      fallbackForm.append("fileUrl", fileUrl);

      const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/optimize-gemini`;
      console.log("Calling Gemini fallback:", fallbackUrl);

      const geminiRes = await fetch(fallbackUrl, {
        method: "POST",
        body: fallbackForm,
      });

      const fallbackText = await geminiRes.text();
      console.log("Gemini raw response:", fallbackText);

      if (!geminiRes.ok) {
        throw new Error("Gemini fallback failed");
      }

      const geminiResult = JSON.parse(fallbackText);
      optimizedText = geminiResult.optimizedText;
    }

    // Validate final result
    if (!optimizedText) {
      throw new Error("No optimization result received from either OpenAI or Gemini.");
    }

    // Save results to database if user is authenticated
    if (userId && optimizedText) {
      // Generate proper UUID for the resume record
      const resumeId = uuidv4();
      
      const insertRes = await supabase.from("resumes").insert({
        id: resumeId, // Use generated UUID for the primary key
        user_id: userId, // Store user ID as a separate field
        original_text: text,
        optimized_text: optimizedText,
        file_name: fileName,
        file_type: fileLabel,
        language,
      });

      if (insertRes.error) {
        console.error("Supabase insert error:", insertRes.error);
        throw new Error(`Failed to save resume to database. Supabase says: ${JSON.stringify(insertRes.error, null, 2)}`);
      }
    }

    // Clean up temporary file if it exists
    if (tempFilePath) fs.unlinkSync(tempFilePath);

    // Return successful response with optimized text
    return NextResponse.json({ 
      optimizedText, 
      language, 
      fileName, 
      fileType: fileLabel 
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