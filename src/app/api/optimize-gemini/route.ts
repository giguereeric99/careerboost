import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function extractText(filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  if (ext === "txt") {
    return fs.readFileSync(filePath, "utf8");
  }

  throw new Error("Unsupported file type.");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileUrl = formData.get("fileUrl") as string | null;
    const rawText = formData.get("rawText") as string | null;

    let text = rawText ?? "";
    if (fileUrl) {
      const res = await fetch(fileUrl);
      const buffer = Buffer.from(await res.arrayBuffer());
      const filePath = `/tmp/resume-${Date.now()}`;
      fs.writeFileSync(filePath, buffer);
      text = await extractText(filePath);
      fs.unlinkSync(filePath);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Optimize this resume content to be recruiter and ATS-friendly. Add keywords:\n\n${text}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return NextResponse.json({
      optimizedText: response.text(),
      language: "English", // Gemini ne détecte pas encore la langue automatiquement
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
