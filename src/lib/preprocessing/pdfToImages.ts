/**
 * PDF Utilities for Node.js
 * 
 * Note: We've removed pdfjs-dist dependency entirely because it requires
 * browser-specific APIs (DOMMatrix, Workers) that don't work in Node.js.
 * 
 * Instead, we:
 * 1. Send PDFs directly to Gemini API (which natively supports PDF files)
 * 2. Use simple PDF parsing for metadata extraction only
 */

import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const PROCESSED_DIR = process.env.PROCESSED_DIR || './processed';
const TARGET_DPI = 300;

export interface PageImage {
  pageNumber: number;
  imagePath: string;
  width: number;
  height: number;
  dpi: number;
}

export interface PdfMetadata {
  pageCount: number;
  pages: PageImage[];
  pdfPath: string;
}

/**
 * Get PDF metadata (simplified - just ensures directory exists)
 * Actual PDF processing is done by Gemini API directly
 */
export async function pdfToImages(
  pdfPath: string,
  documentId: string
): Promise<PageImage[]> {
  const outputDir = path.join(PROCESSED_DIR, documentId);
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  // We don't actually render images anymore - Gemini accepts PDFs directly
  // Just return a placeholder for the first page
  const pageImages: PageImage[] = [{
    pageNumber: 1,
    imagePath: path.join(outputDir, 'page_001.png'),
    width: 2480, // A4 at 300 DPI
    height: 3508,
    dpi: TARGET_DPI,
  }];

  return pageImages;
}

/**
 * Get page count from a PDF file using simple byte analysis
 * This is a lightweight approach that doesn't require pdfjs-dist
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const pdfBuffer = await readFile(pdfPath);
  const pdfText = pdfBuffer.toString('binary');
  
  // Count page objects in PDF - this is a simple heuristic
  // PDFs have "/Type /Page" entries for each page
  const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = pageMatches ? pageMatches.length : 1;
  
  return Math.max(1, pageCount);
}

/**
 * Extract text from PDF using simple regex
 * For complex PDFs, Gemini API handles extraction directly
 */
export async function extractPdfText(pdfPath: string): Promise<string> {
  const pdfBuffer = await readFile(pdfPath);
  const pdfBinary = pdfBuffer.toString('binary');
  
  // Extract text streams from PDF
  // This is a simplified approach - for complex PDFs, Gemini handles it
  let text = '';
  
  // Find text between BT (begin text) and ET (end text) markers
  const textMatches = pdfBinary.match(/BT[\s\S]*?ET/g);
  if (textMatches) {
    for (const match of textMatches) {
      // Extract text from Tj and TJ operators
      const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const textMatch = tj.match(/\(([^)]*)\)/);
          if (textMatch) {
            text += textMatch[1] + ' ';
          }
        }
      }
    }
  }
  
  // Clean up the text
  text = text
    .replace(/\\[nrt]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return text || 'PDF content to be analyzed by AI';
}

/**
 * Read PDF as base64 for Gemini API
 */
export async function getPdfBase64(pdfPath: string): Promise<string> {
  const pdfBuffer = await readFile(pdfPath);
  return pdfBuffer.toString('base64');
}
