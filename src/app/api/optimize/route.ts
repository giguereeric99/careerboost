import { NextRequest, NextResponse } from "next/server";
import { extractText } from "@/utils/processResume";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fileUrl = formData.get("fileUrl") as string | null;
  const rawText = formData.get("rawText") as string | null;
  const userId = formData.get("userId") as string | null;

  if (!fileUrl && !rawText) {
    return NextResponse.json({ error: "Missing input" }, { status: 400 });
  }

  let text = rawText ?? "";
  let tempFilePath: string | null = null;
  let fileName = "resume.txt";

  try {
    if (fileUrl) {
      console.log("Fetching file from:", fileUrl);
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("Failed to fetch file");

      const buffer = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
      tempFilePath = path.join(process.cwd(), "tmp", `resume-${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, buffer);
      text = await extractText(tempFilePath);
      console.log("Extracted text (first 500 chars):", text.slice(0, 500));
      console.log("Extracted length:", text.length);

      const urlParts = fileUrl.split("/");
      fileName = urlParts[urlParts.length - 1];
    }

    // Detect language from text
    const { franc } = await import("franc");
    const langs = await import("langs");
    const langCode = franc(text);
    const language = langs.where("3", langCode)?.name || "English";

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

    console.log("Analyzing with OpenAI...");
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      max_tokens: 2048,
      temperature: 0.7,
    });

    let optimizedText = completion.choices[0].message.content;
    console.log("OpenAI result:", optimizedText?.slice(0, 100));

    // Fallback to Gemini if OpenAI failed or result too short
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

    if (!optimizedText) {
      throw new Error("No optimization result received from either OpenAI or Gemini.");
    }

    // Save to Supabase
    if (userId && optimizedText) {
      const insertRes = await supabase.from("resumes").insert({
        user_id: userId,
        original_text: text,
        optimized_text: optimizedText,
        file_name: fileName,
        language,
      });

      if (insertRes.error) {
        console.error("Supabase insert error:", insertRes.error);
        throw new Error("Failed to save resume to database");
      }
    }

    if (tempFilePath) fs.unlinkSync(tempFilePath);

    return NextResponse.json({ optimizedText, language });
  } catch (error: any) {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    console.error("Full error object:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
