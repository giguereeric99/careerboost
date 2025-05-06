/**
 * Language Detection Service
 * 
 * This service is responsible for detecting the language of resume content.
 * It provides multiple detection strategies:
 * 1. Using the franc library for lightweight detection
 * 2. Using OpenAI as a fallback for more accurate detection
 * 3. Internal algorithm as final fallback if external services are unavailable
 * 
 * The service returns a standardized language name that can be used consistently
 * throughout the optimization process.
 */

import { OpenAI } from "openai";
import { getProviderConfig } from "../config/providers";

// Initialize OpenAI client with API key
let openaiClient: OpenAI | null = null;
try {
  const openaiConfig = getProviderConfig().openai;
  if (openaiConfig.enabled && openaiConfig.apiKey) {
    openaiClient = new OpenAI({
      apiKey: openaiConfig.apiKey
    });
  }
} catch (error) {
  console.warn("Failed to initialize OpenAI for language detection:", error);
  openaiClient = null;
}

/**
 * Detect the language of the given text
 * Tries multiple strategies for detection
 * 
 * @param text - The text to analyze
 * @returns The detected language name (defaults to English if detection fails)
 */
export async function detectLanguage(text: string): Promise<string> {
  // Start with franc detection (fastest)
  try {
    const francResult = await detectWithFranc(text);
    if (francResult && francResult !== "English") {
      console.log("[Language] Detected with franc:", francResult);
      return francResult;
    }
  } catch (error) {
    console.warn("Franc language detection failed:", error);
  }
  
  // Try OpenAI if franc detection failed or returned English (verify)
  if (openaiClient) {
    try {
      const openaiResult = await detectWithOpenAI(text);
      if (openaiResult) {
        console.log("[Language] Detected with OpenAI:", openaiResult);
        return openaiResult;
      }
    } catch (error) {
      console.warn("OpenAI language detection failed:", error);
    }
  }
  
  // Fall back to our simple detection algorithm
  try {
    const basicResult = await detectWithBasicAlgorithm(text);
    console.log("[Language] Detected with basic algorithm:", basicResult);
    return basicResult;
  } catch (error) {
    console.error("All language detection methods failed:", error);
    return "English"; // Default to English as final fallback
  }
}

/**
 * Detect language using the franc library
 * 
 * @param text - The text to analyze
 * @returns The detected language name
 */
async function detectWithFranc(text: string): Promise<string> {
  // Dynamically import franc and langs to reduce initial load time
  const { franc } = await import("franc");
  const langs = await import("langs");
  
  // Sample only the first 1000 characters for faster analysis
  const sample = text.substring(0, 1000);
  
  // Detect language using franc library
  const langCode = franc(sample);
  
  // Convert language code to full language name
  const language = langs.where("3", langCode)?.name || "English";
  
  return language;
}

/**
 * Detect language using OpenAI for high accuracy
 * 
 * @param text - The text to analyze
 * @returns The detected language name
 */
async function detectWithOpenAI(text: string): Promise<string> {
  if (!openaiClient) {
    throw new Error("OpenAI client not initialized");
  }
  
  // Use only the first 500 characters for efficiency and cost saving
  const sample = text.substring(0, 500);
  
  // Create a simple prompt for language detection
  const completion = await openaiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "You are a language detection service. Detect the language of the following text and respond only with the language name (e.g., 'English', 'French', 'Spanish'). No explanation or additional text."
      },
      {
        role: "user",
        content: sample
      }
    ],
    max_tokens: 10,
    temperature: 0.1
  });
  
  // Extract the language name from the response
  const language = completion.choices[0].message.content?.trim() || "English";
  
  return language;
}

/**
 * Detect language using a basic algorithm based on common words
 * This is used as a final fallback if other methods fail
 * 
 * @param text - The text to analyze
 * @returns The detected language name
 */
async function detectWithBasicAlgorithm(text: string): Promise<string> {
  // Lowercase and clean the text
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');
  const words = cleanText.split(/\s+/);
  
  // Define lists of common words in different languages
  const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'je', 'tu', 'il', 'elle', 
                       'nous', 'vous', 'ils', 'elles', 'pour', 'dans', 'avec', 'sur',
                       'expérience', 'compétences', 'formation', 'diplôme'];
  
  const spanishWords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'yo', 'tú', 
                        'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas', 'para', 'en', 
                        'con', 'sobre', 'experiencia', 'habilidades', 'educación'];
  
  const germanWords = ['der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'ich', 'du', 'er', 'sie', 
                      'wir', 'ihr', 'für', 'in', 'mit', 'auf', 'erfahrung', 'kenntnisse', 'bildung'];
  
  // Count matches for each language
  let frenchCount = 0;
  let spanishCount = 0;
  let germanCount = 0;
  
  for (const word of words) {
    if (frenchWords.includes(word)) frenchCount++;
    if (spanishWords.includes(word)) spanishCount++;
    if (germanWords.includes(word)) germanCount++;
  }
  
  // Calculate percentages (adjusted for word list size differences)
  const frenchPercent = frenchCount / words.length * (25 / frenchWords.length);
  const spanishPercent = spanishCount / words.length * (25 / spanishWords.length);
  const germanPercent = germanCount / words.length * (25 / germanWords.length);
  
  // Determine language based on highest percentage
  if (frenchPercent > 0.03 && frenchPercent > spanishPercent && frenchPercent > germanPercent) {
    return 'French';
  }
  
  if (spanishPercent > 0.03 && spanishPercent > frenchPercent && spanishPercent > germanPercent) {
    return 'Spanish';
  }
  
  if (germanPercent > 0.03 && germanPercent > frenchPercent && germanPercent > spanishPercent) {
    return 'German';
  }
  
  // Default to English if no clear match
  return 'English';
}