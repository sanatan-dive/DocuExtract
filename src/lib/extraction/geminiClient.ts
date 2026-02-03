import {
  GoogleGenerativeAI,
  GenerativeModel,
  Part,
} from "@google/generative-ai";
import { readFile } from "fs/promises";
import path from "path";

const API_KEY = process.env.GEMINI_API_KEY || "";

if (!API_KEY) {
  console.warn("Warning: GEMINI_API_KEY not set");
}

// Initialize the Gemini client
const genAI = new GoogleGenerativeAI(API_KEY);

// Model configurations
export const MODELS = {
  PRO: "gemini-3-pro-preview",
  FLASH: "gemini-3-flash-preview",
} as const;

export type ModelType = (typeof MODELS)[keyof typeof MODELS];

// Create model instances
function getModel(modelName: ModelType): GenerativeModel {
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1, // Low temperature for consistent extraction
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });
}

/**
 * Create image part from file path
 */
async function createImagePart(imagePath: string): Promise<Part> {
  const imageBuffer = await readFile(imagePath);
  const base64 = imageBuffer.toString("base64");
  const mimeType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";

  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
}

/**
 * Create image part from base64 data
 */
export function createImagePartFromBase64(
  base64: string,
  mimeType: string = "image/png",
): Part {
  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
}

/**
 * Generate content with image input
 */
export async function generateWithImage(
  prompt: string,
  imagePath: string,
  model: ModelType = MODELS.FLASH,
): Promise<string> {
  const geminiModel = getModel(model);
  const imagePart = await createImagePart(imagePath);

  const result = await geminiModel.generateContent([prompt, imagePart]);
  const response = result.response;

  return response.text();
}

/**
 * Generate content with multiple images
 */
export async function generateWithImages(
  prompt: string,
  imagePaths: string[],
  model: ModelType = MODELS.FLASH,
): Promise<string> {
  const geminiModel = getModel(model);
  const imageParts = await Promise.all(imagePaths.map(createImagePart));

  const result = await geminiModel.generateContent([prompt, ...imageParts]);
  const response = result.response;

  return response.text();
}

/**
 * Generate content with base64 images
 */
export async function generateWithBase64Images(
  prompt: string,
  images: { base64: string; mimeType: string }[],
  model: ModelType = MODELS.FLASH,
): Promise<{
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
}> {
  const geminiModel = getModel(model);
  const imageParts = images.map((img) =>
    createImagePartFromBase64(img.base64, img.mimeType),
  );

  const result = await geminiModel.generateContent([prompt, ...imageParts]);
  const response = result.response;

  // Extract token usage if available
  const usage = result.response.usageMetadata;

  return {
    text: response.text(),
    usage: usage
      ? {
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0,
        }
      : undefined,
  };
}

/**
 * Simple text generation
 */
export async function generateText(
  prompt: string,
  model: ModelType = MODELS.FLASH,
): Promise<string> {
  const geminiModel = getModel(model);
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

/**
 * Check if API key is configured
 */
export function isConfigured(): boolean {
  return !!API_KEY && API_KEY !== "your-gemini-api-key-here";
}

export { genAI };

/**
 * Generate content with PDF file (Gemini accepts PDFs directly)
 */
export async function generateWithPdf(
  prompt: string,
  pdfPath: string,
  model: ModelType = MODELS.FLASH,
): Promise<{
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
}> {
  const geminiModel = getModel(model);

  const pdfBuffer = await readFile(pdfPath);
  const base64Pdf = pdfBuffer.toString("base64");

  const pdfPart: Part = {
    inlineData: {
      mimeType: "application/pdf",
      data: base64Pdf,
    },
  };

  const result = await geminiModel.generateContent([prompt, pdfPart]);
  const response = result.response;

  const usage = result.response.usageMetadata;

  return {
    text: response.text(),
    usage: usage
      ? {
          inputTokens: usage.promptTokenCount || 0,
          outputTokens: usage.candidatesTokenCount || 0,
        }
      : undefined,
  };
}
