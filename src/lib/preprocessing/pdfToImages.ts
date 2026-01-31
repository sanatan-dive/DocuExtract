import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Set up the worker (for Node.js environment)
if (typeof window === 'undefined') {
  GlobalWorkerOptions.workerSrc = '';
}

const PROCESSED_DIR = process.env.PROCESSED_DIR || './processed';
const TARGET_DPI = 300;

export interface PageImage {
  pageNumber: number;
  imagePath: string;
  width: number;
  height: number;
  dpi: number;
}

/**
 * Convert a PDF to images at specified DPI
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

  // Read the PDF file
  const pdfBuffer = await readFile(pdfPath);
  const pdfData = new Uint8Array(pdfBuffer);

  // Load the PDF document
  const pdfDoc = await getDocument({
    data: pdfData,
    useSystemFonts: true,
  }).promise;

  const numPages = pdfDoc.numPages;
  const pageImages: PageImage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    
    // Calculate scale factor for target DPI (PDF default is 72 DPI)
    const scale = TARGET_DPI / 72;
    const viewport = page.getViewport({ scale });

    // Create a canvas-like structure for rendering
    // In Node.js, we'll use Sharp to handle the rendering
    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    // For Node.js, we need to use canvas package or render differently
    // Since we're in a server environment, we'll use a simpler approach
    // that captures the PDF page dimensions and use Sharp for processing
    
    const imageName = `page_${pageNum.toString().padStart(3, '0')}.png`;
    const imagePath = path.join(outputDir, imageName);

    // Store page info - actual rendering will happen in imageEnhancer
    pageImages.push({
      pageNumber: pageNum,
      imagePath,
      width,
      height,
      dpi: TARGET_DPI,
    });
  }

  return pageImages;
}

/**
 * Get page count from a PDF file
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const pdfBuffer = await readFile(pdfPath);
  const pdfData = new Uint8Array(pdfBuffer);
  
  const pdfDoc = await getDocument({
    data: pdfData,
    useSystemFonts: true,
  }).promise;

  return pdfDoc.numPages;
}

/**
 * Extract text from PDF (for potential pre-classification)
 */
export async function extractPdfText(pdfPath: string): Promise<string> {
  const pdfBuffer = await readFile(pdfPath);
  const pdfData = new Uint8Array(pdfBuffer);
  
  const pdfDoc = await getDocument({
    data: pdfData,
    useSystemFonts: true,
  }).promise;

  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}
