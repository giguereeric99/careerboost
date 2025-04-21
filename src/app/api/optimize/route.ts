import { NextRequest, NextResponse } from "next/server";
import { processResume } from "@/utils/processResume";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const fileUrl = formData.get("fileUrl") as string | null;

  if (!fileUrl) {
    return NextResponse.json({ error: "Missing file URL" }, { status: 400 });
  }

  try {
    console.log("Fetching file from:", fileUrl);
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to fetch uploaded file");

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
    const tempFilePath = path.join(process.cwd(), "tmp", `resume-${Date.now()}.pdf`);

    fs.writeFileSync(tempFilePath, buffer);

    try {
      const result = await processResume(tempFilePath);
      fs.unlinkSync(tempFilePath);
      return NextResponse.json(result);
    } catch (openAIError) {
      console.warn("OpenAI failed, falling back to Gemini");

      const fallbackForm = new FormData();
      fallbackForm.append("fileUrl", fileUrl);

      const geminiRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/optimize-gemini`, {
        method: "POST",
        body: fallbackForm,
      });

      if (!geminiRes.ok) throw new Error("Gemini fallback failed");
      const errorText = await geminiRes.text();
      console.error("Gemini response error:", errorText);
      const geminiResult = await geminiRes.json();
      fs.unlinkSync(tempFilePath);

      return NextResponse.json({ ...geminiResult, fallbackUsed: true });
    }
  } catch (error: any) {
    console.error("Full error object:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
