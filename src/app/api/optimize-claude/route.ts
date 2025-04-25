import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "@/utils/processResume";
import fs from "fs";
import path from "path";

// Initialize Anthropic client with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * API route handler for resume optimization using Claude as second fallback
 * Processes resume files that both OpenAI and Gemini failed to handle
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

    console.log("[Claude Fallback] Fetching file from:", fileUrl);
    
    // Download and process the file
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error("Failed to fetch file from storage");

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
    
    const urlParts = fileUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const ext = path.extname(fileName) || ".pdf";
    tempFilePath = path.join(process.cwd(), "tmp", `claude-resume-${Date.now()}${ext}`);
    
    fs.writeFileSync(tempFilePath, buffer);
    
    // Extract text from file
    const text = await extractText(tempFilePath);
    console.log("[Claude Fallback] Extracted text length:", text.length);

    if (text.length < 50) {
      throw new Error("Extracted text is too short to process");
    }

    // Detect language
    const { franc } = await import("franc");
    const langs = await import("langs");
    const langCode = franc(text);
    const language = langs.where("3", langCode)?.name || "English";

    // Create the optimization prompt for Claude
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

    console.log("[Claude Fallback] Generating optimized resume...");
    
    // Make request to Claude
    const completion = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4096,
      temperature: 0.5,
      system: "You are a professional resume writer who optimizes resumes to be ATS-friendly.",
      messages: [
        { role: "user", content: prompt }
      ],
    });

    const optimizedText = completion.content[0].text;
    
    if (!optimizedText || optimizedText.length < 200) {
      throw new Error("Claude produced insufficient output");
    }

    console.log("[Claude Fallback] Successfully generated optimized resume");
    
    // Clean up temporary file
    if (tempFilePath) fs.unlinkSync(tempFilePath);
    
    return NextResponse.json({ optimizedText });
  } catch (error: any) {
    console.error("[Claude Fallback] Error:", error);
    
    // Clean up temporary file in case of error
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    
    return NextResponse.json(
      { error: `Claude fallback failed: ${error.message}` }, 
      { status: 500 }
    );
  }
}