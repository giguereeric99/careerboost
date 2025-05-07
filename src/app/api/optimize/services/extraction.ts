/**
 * Resume Text Extraction Service
 * 
 * This service is responsible for extracting text content from resume files
 * in various formats (PDF, DOCX, TXT) and handling file downloads.
 * 
 * It provides a unified interface for text extraction regardless of the source
 * and ensures proper resource cleanup after processing.
 */

import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { ExtractionResult } from '../types';

/**
 * Extract text from a file URL
 * Downloads the file and extracts text based on file type
 * 
 * @param fileUrl - URL of the file to process
 * @returns Extraction result with text content or error
 */
export async function extractTextFromFile(fileUrl: string): Promise<ExtractionResult> {
  let tempFilePath: string | null = null;
  
  try {
    console.log("Downloading file from:", fileUrl);
    
    // Download file to temp location
    const { path: filePath, size, error } = await downloadFileFromUrl(fileUrl);
    
    if (error || !filePath) {
      return {
        text: '',
        tempFilePath: null,
        fileSize: null,
        error: error || new Error("Failed to download file")
      };
    }
    
    tempFilePath = filePath;
    
    // Extract text from file based on type
    const text = await extractText(filePath);
    console.log(`Extracted ${text.length} characters from file`);
    
    return {
      text,
      tempFilePath,
      fileSize: size,
      error: null
    };
  } catch (error: any) {
    console.error("Error in extractTextFromFile:", error);
    
    return {
      text: '',
      tempFilePath,
      fileSize: null,
      error
    };
  }
}

/**
 * Extract text content from a file
 * Supports PDF, DOCX, and TXT formats
 * 
 * @param filePath - Path to the file
 * @returns Extracted text content
 */
export async function extractText(filePath: string): Promise<string> {
  const ext = filePath.split(".").pop()?.toLowerCase();

  // Handle PDF files
  if (ext === "pdf") {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  // Handle DOCX files
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  // Handle TXT files
  if (ext === "txt") {
    return fs.readFileSync(filePath, "utf8");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

/**
 * Download a file from URL to temporary location
 * 
 * @param fileUrl - URL of the file to download
 * @returns Object containing the file path, size, and any error
 */
export async function downloadFileFromUrl(fileUrl: string): Promise<{
  path: string | null;
  size: number | null;
  error: Error | null;
}> {
  let tempFilePath: string | null = null;
  
  try {
    // Fetch the file from the URL
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    // Get file content as buffer
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    const fileSize = fileBuffer.length;
    
    // Create temp directory if it doesn't exist
    fs.mkdirSync(path.join(process.cwd(), "tmp"), { recursive: true });
    
    // Extract filename from URL and preserve extension
    const urlParts = fileUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];
    const ext = path.extname(fileName) || ".pdf";
    
    // Create a unique temp filename
    tempFilePath = path.join(process.cwd(), "tmp", `resume-${Date.now()}${ext}`);
    
    // Write file to temp location
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    console.log(`File downloaded to ${tempFilePath}, size: ${fileSize} bytes`);
    
    return {
      path: tempFilePath,
      size: fileSize,
      error: null
    };
  } catch (error: any) {
    console.error("Error downloading file:", error);
    return {
      path: null,
      size: null,
      error
    };
  }
}