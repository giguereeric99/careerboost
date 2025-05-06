/**
 * File Handler Service
 * 
 * This service provides utilities for temporary file management, including:
 * - Cleaning up temporary files after processing
 * - Creating and managing file paths
 * - Validating file types
 * 
 * It ensures that resources are properly released after use and
 * prevents file system leaks during the optimization process.
 */

import fs from 'fs';
import path from 'path';

/**
 * Supported file types for resume uploads
 */
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

/**
 * File extension to MIME type mapping
 */
export const FILE_EXTENSION_MAP: Record<string, string> = {
  'pdf': 'application/pdf',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'txt': 'text/plain'
};

/**
 * MIME type to file extension mapping
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt'
};

/**
 * Clean up a temporary file from the file system
 * 
 * @param filePath - Path to the temporary file
 * @returns Boolean indicating if cleanup was successful
 */
export function cleanupTempFile(filePath: string | null): boolean {
  if (!filePath) return false;
  
  try {
    // Check if file exists
    if (fs.existsSync(filePath)) {
      // Delete the file
      fs.unlinkSync(filePath);
      console.log("[File] Cleaned up temporary file:", filePath);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[File] Error cleaning up temporary file:", error);
    return false;
  }
}

/**
 * Create a temporary file path with appropriate extension
 * 
 * @param prefix - Prefix for the file name
 * @param extension - File extension (without dot)
 * @returns Path to the temporary file
 */
export function createTempFilePath(prefix: string = 'resume', extension: string = 'tmp'): string {
  // Ensure temp directory exists
  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Add dot to extension if not present
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  
  // Create unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const filename = `${prefix}-${timestamp}-${randomStr}${ext}`;
  
  return path.join(tempDir, filename);
}

/**
 * Check if a file type is supported
 * 
 * @param mimeType - MIME type of the file
 * @returns Boolean indicating if the file type is supported
 */
export function isSupportedFileType(mimeType: string): boolean {
  return SUPPORTED_FILE_TYPES.includes(mimeType);
}

/**
 * Get file extension from MIME type
 * 
 * @param mimeType - MIME type of the file
 * @returns File extension (with dot) or .tmp if unknown
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const extension = MIME_TYPE_MAP[mimeType];
  return extension ? `.${extension}` : '.tmp';
}

/**
 * Get MIME type from file extension
 * 
 * @param filename - File name or path
 * @returns MIME type or null if unknown
 */
export function getMimeTypeFromFilename(filename: string): string | null {
  const ext = path.extname(filename).toLowerCase().replace('.', '');
  
  return FILE_EXTENSION_MAP[ext] || null;
}