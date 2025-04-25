import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractText } from "@/utils/processResume";
import fs from "fs";
import path from "path";

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * API route handler for resume optimization using Gemini as fallback
 * Processes resume files that OpenAI failed to handle
 * 
 * @param req - NextRequest object containing form data
 * @returns JSON response with optimized text or error message
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fileUrl = formData.get("fileUrl") as string | null;
  let tempFilePath: string | null = null;

  try {
    if (!fileUrl) {
      return NextResponse.json({ error: "Missing file URL" }, { status: 400 });
    }

    console.log("[Gemini Fallback] Fetching file from:", fileUrl);
    
    // Download and process the file
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error("Failed to fetch file from storage");

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
    
    const urlParts = fileUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const ext = path.extname(fileName) || ".pdf";
    tempFilePath = path.join(process.cwd(), "tmp", `gemini-resume-${Date.now()}${ext}`);
    
    fs.writeFileSync(tempFilePath, buffer);
    
    // Extract text from file
    const text = await extractText(tempFilePath);
    console.log("[Gemini Fallback] Extracted text length:", text.length);

    if (text.length < 50) {
      throw new Error("Extracted text is too short to process");
    }

    // Detect language (optional, can be removed if Gemini handles this well)
    const { franc } = await import("franc");
    const langs = await import("langs");
    const langCode = franc(text);
    const language = langs.where("3", langCode)?.name || "English";

    // Create the optimization prompt for Gemini
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

    // Initialize Gemini model with more robust parameters
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      generationConfig: {
        temperature: 0.4,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    });

    console.log("[Gemini Fallback] Generating optimized resume...");
    
    // Make multiple attempts if needed
    let optimizedText = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        optimizedText = response.text();
        
        if (optimizedText && optimizedText.length > 200) {
          // We got a good response, break the retry loop
          break;
        } else {
          console.warn(`[Gemini Fallback] Attempt ${attempts}: Response too short (${optimizedText.length} chars)`);
        }
      } catch (genError) {
        console.error(`[Gemini Fallback] Attempt ${attempts} failed:`, genError);
        
        if (attempts >= maxAttempts) {
          throw new Error(`Gemini failed after ${maxAttempts} attempts: ${genError}`);
        }
        
        // Short delay before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!optimizedText || optimizedText.length < 200) {
      throw new Error("Gemini produced insufficient output even after retries");
    }

    console.log("[Gemini Fallback] Successfully generated optimized resume");
    
    // Clean up temporary file
    if (tempFilePath) fs.unlinkSync(tempFilePath);
    
    return NextResponse.json({ optimizedText });
  } catch (error: any) {
    console.error("[Gemini Fallback] Error:", error);
    
    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    return NextResponse.json(
      { error: `Gemini fallback failed: ${error.message}` }, 
      { status: 500 }
    );
  }
}