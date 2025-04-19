import { NextRequest, NextResponse } from "next/server";
import { processResume } from "@/utils/processResume";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileUrl = formData.get("fileUrl") as string | null;
    const rawText = formData.get("rawText") as string | null;

    let filePath: string | null = null;

    if (fileUrl) {
      const response = await fetch(fileUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const tempFilePath = path.join("/tmp", `resume-${Date.now()}`);
      fs.writeFileSync(tempFilePath, buffer);
      filePath = tempFilePath;
    }

    const result = await processResume(filePath, rawText || undefined);

    if (filePath) fs.unlinkSync(filePath); // Nettoyage

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erreur optimisation :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
