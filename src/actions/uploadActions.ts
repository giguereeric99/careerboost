'use server';

import { fetchAndExtractPdfText } from "@/lib/langchain";

export async function generatePdfSummary(
  uploadResponse: [
    {
      serverData: {
        userId: string;
        file: {
          url: string;
          name: string;
        }
      }
    }
  ]
) {
  if (!uploadResponse) {
    return {
      success: false,
      message: "File upload failed",
      data: null,
    }
  }

  const {
    serverData: { 
      userId, 
      file: { url: pdfUrl, name: fileName } 
    },

  } = uploadResponse[0];

  if(!pdfUrl || !fileName) {
    return {
      success: false,
      message: "File upload failed",
      data: null,
    }
  }

  try {
    const pdfText = await fetchAndExtractPdfText(pdfUrl);
    console.log("pdfText", pdfText);

    // try {
    //   const summary = await generatePdfSummaryFromOpenAI(pdfText);
    //   console.log("summary", summary);
    // } catch (error) {
    //   console.error("Error generating summary:", error);
    // }

    // if(!summary) {
    //   return {
    //     success: false,
    //     message: "Error generating PDF summary",
    //     data: null,
    //   }
    // }
  } catch (error) {
    console.error("Error generating PDF summary:", error);
    return {
      success: false,
      message: "Error generating PDF summary",
      data: null,
    }
  }
}
