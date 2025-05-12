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
 * @param fileType - MIME type of the file (optional)
 * @returns Extraction result with text content or error
 */
export async function extractTextFromFile(fileUrl: string, fileType?: string): Promise<ExtractionResult> {
  let tempFilePath: string | null = null;
  
  try {
    console.log("Downloading file from:", fileUrl);
    console.log("File type provided:", fileType || "None");
    
    // Download file to temp location with proper file type detection
    const { path: filePath, size, error } = await downloadFileFromUrl(fileUrl, fileType);
    
    if (error || !filePath) {
      return {
        text: '',
        tempFilePath: null,
        fileSize: null,
        error: error || new Error("Failed to download file")
      };
    }
    
    tempFilePath = filePath;
    
    try {
      // Extract text from file based on extension and real content type
      const text = await extractText(filePath, fileType);
      console.log(`Extracted ${text.length} characters from file`);
      
      return {
        text,
        tempFilePath,
        fileSize: size,
        error: null
      };
    } catch (extractError: any) {
      // Improved error handling for extraction errors
      console.error(`Error extracting text from file (${path.extname(filePath)}):`, extractError);
      
      // Include file type in error message to help diagnostics
      const errorMessage = fileType 
        ? `Failed to extract text from ${fileType} file: ${extractError.message}`
        : `Failed to extract text: ${extractError.message}`;
        
      return {
        text: '',
        tempFilePath,
        fileSize: size,
        error: new Error(errorMessage)
      };
    }
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
 * @param originalMimeType - Original MIME type of the file (optional)
 * @returns Extracted text content
 */
export async function extractText(filePath: string, originalMimeType?: string): Promise<string> {
  // Get file extension
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  
  // Log what we're processing
  console.log(`Processing file with extension: ${ext}, original MIME type: ${originalMimeType || 'unknown'}`);
  
  // Determine file type from MIME type if provided or fall back to extension
  const isDocx = originalMimeType?.includes('openxmlformats') || 
                 originalMimeType?.includes('docx') || 
                 ext === 'docx';
                 
  const isPdf = originalMimeType?.includes('pdf') || ext === 'pdf';
  const isTxt = originalMimeType?.includes('text/plain') || ext === 'txt';
  
  console.log(`File type detection: PDF=${isPdf}, DOCX=${isDocx}, TXT=${isTxt}`);

  try {
    // Handle DOCX files
    if (isDocx) {
      console.log("Extracting text from DOCX file");
      const result = await mammoth.extractRawText({ path: filePath });
      
      if (!result.value) {
        throw new Error("No text content extracted from DOCX file");
      }
      
      return result.value;
    }
    
    // Handle PDF files
    if (isPdf) {
      console.log("Extracting text from PDF file");
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }
    
    // Handle TXT files
    if (isTxt) {
      console.log("Extracting text from TXT file");
      return fs.readFileSync(filePath, "utf8");
    }

    throw new Error(`Unsupported file type: ${ext}`);
  } catch (error: any) {
    console.error(`Error during text extraction (${ext}):`, error);
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Download a file from URL to temporary location
 * 
 * @param fileUrl - URL of the file to download
 * @param fileType - MIME type of the file (optional)
 * @returns Object containing the file path, size, and any error
 */
export async function downloadFileFromUrl(fileUrl: string, fileType?: string): Promise<{
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
    
    // Determine the correct file extension based on MIME type or URL
    let ext = '.tmp'; // Default extension if we can't determine it
    
    // First try to determine from MIME type
    if (fileType) {
      if (fileType.includes('pdf')) ext = '.pdf';
      else if (fileType.includes('openxmlformats') || fileType.includes('docx')) ext = '.docx';
      else if (fileType.includes('text/plain')) ext = '.txt';
    }
    
    // If no extension determined from MIME type, try to get from URL
    if (ext === '.tmp') {
      const urlParts = fileUrl.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const urlExt = path.extname(fileName);
      if (urlExt) ext = urlExt;
    }
    
    // Create a unique temp filename with the correct extension
    tempFilePath = path.join(process.cwd(), "tmp", `resume-${Date.now()}${ext}`);
    
    // Write file to temp location
    fs.writeFileSync(tempFilePath, fileBuffer);
    
    console.log(`File downloaded to ${tempFilePath}, size: ${fileSize} bytes, determined extension: ${ext}`);
    
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