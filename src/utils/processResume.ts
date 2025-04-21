import fs from "fs";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { franc } from "franc";
import langs from "langs";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function extractText(filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
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

export async function processResume(filePath: string | null, rawText?: string) {
  const text = filePath ? await extractText(filePath) : rawText ?? "";
  if (!text) throw new Error("No resume content provided.");

  const langCode = franc(text);
  const language = langs.where("3", langCode)?.name || "English";

  const prompt = `This resume is written in ${language}. Optimize its content for recruiters and make it ATS-friendly in the same language. Suggest relevant keywords and improvements:\n\n${text}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4",
    });

    return {
      optimizedText: completion.choices[0].message.content,
      language,
    };
  } catch (err: any) {
    console.error("OpenAI API error:", err?.response?.data || err.message || err);
    return {
      optimizedText: null,
      language,
    };
  }
}

export { extractText };