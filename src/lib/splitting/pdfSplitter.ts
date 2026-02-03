import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { PDFDocument } from "pdf-lib";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

interface PageRange {
  start_page: number;
  end_page: number;
  description?: string;
  type?: string;
}

interface SplitResult {
  filePath: string;
  fileName: string;
  originalName: string;
  pageCount: number;
  startPage: number;
  endPage: number;
}

// Reuse the model configuration from geminiClient if possible, but hardcoding for independence here
// Using Flash for speed as requested for the splitting task
const MODEL_NAME = "gemini-3-flash-preview";

async function createPdfPart(filePath: string): Promise<Part> {
  const data = await readFile(filePath);
  return {
    inlineData: {
      mimeType: "application/pdf",
      data: data.toString("base64"),
    },
  };
}

/**
 * Analyzes a PDF to determine document boundaries
 */
export async function analyzePdfStructure(
  filePath: string,
): Promise<PageRange[]> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const pdfPart = await createPdfPart(filePath);

  const prompt = `
    Analyze this PDF file. It may contain multiple distinct documents concatenated together (e.g., multiple invoices, bills, receipts).
    Identify the page ranges for each distinct document.
    
    Return a JSON array of objects with this schema:
    [
      {
        "start_page": number, // 1-based start page index
        "end_page": number,   // 1-based end page index
        "description": string // Brief description of the document type/content
      }
    ]
    
    If the file appears to be a single document, return one range covering all pages.
    Ensure that all pages are accounted for and ranges do not overlap.
    Sort by start_page.
  `;

  try {
    const result = await model.generateContent([prompt, pdfPart]);
    const response = result.response;
    const text = response.text();

    // Parse JSON
    const ranges = JSON.parse(text) as PageRange[];

    // Basic validation
    if (!Array.isArray(ranges) || ranges.length === 0) {
      // Fallback: assume 1 document
      return [];
    }

    return ranges;
  } catch (error) {
    console.error("Error analyzing PDF structure:", error);
    return []; // Return empty to signal no split detected/possible
  }
}

/**
 * Splits a PDF into multiple files based on ranges
 */
export async function splitPdf(
  sourceFilePath: string,
  outputDir: string,
  ranges: PageRange[],
  baseOriginalName: string,
): Promise<SplitResult[]> {
  try {
    const sourcePdfBytes = await readFile(sourceFilePath);
    const sourcePdfDoc = await PDFDocument.load(sourcePdfBytes);
    const totalPages = sourcePdfDoc.getPageCount();

    const results: SplitResult[] = [];

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Validate ranges against total pages
    const validRanges = ranges.filter(
      (r) =>
        r.start_page >= 1 &&
        r.end_page <= totalPages &&
        r.start_page <= r.end_page,
    );

    // If no valid ranges or cover everything as one, handle appropriately
    // But this function assumes we DO want to split based on 'ranges'

    for (const range of validRanges) {
      // Create a new PDF
      const newPdfDoc = await PDFDocument.create();

      // Copy pages (indices are 0-based in pdf-lib)
      const pageIndices = [];
      for (let i = range.start_page; i <= range.end_page; i++) {
        pageIndices.push(i - 1);
      }

      const copiedPages = await newPdfDoc.copyPages(sourcePdfDoc, pageIndices);

      for (const page of copiedPages) {
        newPdfDoc.addPage(page);
      }

      // Generate filename
      // Format: original-name-start-end.pdf
      const cleanBaseName = path.parse(baseOriginalName).name;
      const newFileName = `${cleanBaseName}-${range.start_page}-${range.end_page}.pdf`;
      const newFilePath = path.join(outputDir, newFileName);

      const pdfBytes = await newPdfDoc.save();
      await writeFile(newFilePath, pdfBytes);

      results.push({
        filePath: newFilePath,
        fileName: newFileName,
        originalName: newFileName, // Using the new name as "original" for the system
        pageCount: range.end_page - range.start_page + 1,
        startPage: range.start_page,
        endPage: range.end_page,
      });
    }

    return results;
  } catch (error) {
    console.error("Error splitting PDF:", error);
    throw error;
  }
}
