import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { generateWithBase64Images, generateWithPdf, MODELS, ModelType } from './geminiClient';
import { getExtractionPrompt, getFileNamingPrompt } from './extractionPrompts';
import { classifyDocument } from '@/lib/classification/classifier';
import { ExtractionResult, ConfidenceScores } from '@/types';
import { calculateCost, isValidDateFormat, isValidPostalCode, isValidTimeFormat } from '@/lib/utils';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const PROCESSED_DIR = process.env.PROCESSED_DIR || './processed';

export interface ExtractDocumentOptions {
  forceModel?: ModelType;
  skipClassification?: boolean;
  useBatchApi?: boolean;
}

/**
 * Main extraction function - processes a document end-to-end
 * Uses PDF-direct approach with Gemini API (avoids Node.js canvas issues)
 */
export async function extractDocument(
  documentId: string,
  options: ExtractDocumentOptions = {}
): Promise<ExtractionResult> {
  // Get document from database
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  // Update status to processing
  await prisma.document.update({
    where: { id: documentId },
    data: {
      status: 'PREPROCESSING',
      processingStartedAt: new Date(),
    },
  });

  try {
    // Get the PDF file path
    const pdfPath = path.join(UPLOAD_DIR, document.fileName);
    
    // Check if file exists
    try {
      await access(pdfPath, constants.R_OK);
    } catch {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }

    // Get PDF metadata (page count, etc.) using legacy build
    const { getPdfPageCount, extractPdfText } = await import('../preprocessing/pdfToImages');
    const pageCount = await getPdfPageCount(pdfPath);

    // Update page count
    await prisma.document.update({
      where: { id: documentId },
      data: { pageCount },
    });

    // Update status to classifying
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'CLASSIFYING' },
    });

    // Classify the document using text extraction (avoids canvas rendering)
    let model: ModelType = options.forceModel || MODELS.FLASH;
    let classification = document.classification;

    if (!options.skipClassification && !options.forceModel) {
      try {
        // Use text-based classification to avoid canvas issues
        const pdfText = await extractPdfText(pdfPath);
        
        // Simple heuristic classification based on text content
        // DocumentType enum: HANDWRITTEN, TYPED, MIXED, SCANNED
        const textLower = pdfText.toLowerCase();
        const hasSignature = textLower.includes('signature') || textLower.includes('signed');
        const hasHandwrittenIndicators = textLower.includes('handwritten') || textLower.includes('please print');
        
        if (hasHandwrittenIndicators || hasSignature) {
          classification = 'MIXED'; // Likely has both typed and handwritten elements
          model = MODELS.PRO; // Use Pro for mixed/complex documents
        } else if (pdfText.length < 100) {
          classification = 'SCANNED'; // Minimal text extracted suggests scanned image
          model = MODELS.PRO;
        } else {
          classification = 'TYPED'; // Standard typed document
          model = MODELS.FLASH;
        }

        // Update classification in database
        await prisma.document.update({
          where: { id: documentId },
          data: {
            classification,
            classificationConfidence: 0.8, // Heuristic, so moderate confidence
          },
        });
      } catch (classError) {
        console.warn('Classification failed, using defaults:', classError);
        classification = 'TYPED'; // Fallback to TYPED
      }
    }

    // Update status to extracting
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'EXTRACTING',
        modelUsed: model,
      },
    });

    // Get appropriate prompt
    const isHandwritten = classification === 'HANDWRITTEN' || classification === 'MIXED';
    const prompt = getExtractionPrompt(isHandwritten, pageCount > 1);

    // Call Gemini directly with PDF (no canvas rendering needed!)
    const result = await generateWithPdf(prompt, pdfPath, model);

    // Parse the extraction result
    const extractedData = parseExtractionResult(result.text);

    // Generate file name
    const fileName = await generateFileName(extractedData);

    // Validate extracted data
    const validationIssues = validateExtractedData(extractedData);
    const needsReview = validationIssues.length > 0 || 
      (extractedData.confidence_scores && 
       Object.values(extractedData.confidence_scores as Record<string, number | null | undefined>).some(score => typeof score === 'number' && score < 0.7));

    // Calculate overall confidence
    const overallConfidence = calculateOverallConfidence(extractedData.confidence_scores);

    // Save extracted data to database
    await prisma.extractedData.create({
      data: {
        documentId,
        name: extractedData.name,
        address: extractedData.address,
        postalcode: extractedData.postalcode,
        city: extractedData.city,
        birthday: extractedData.birthday,
        date: extractedData.date,
        time: extractedData.time,
        handwritten: extractedData.handwritten,
        signed: extractedData.signed,
        stamp: extractedData.stamp,
        rawJson: JSON.parse(JSON.stringify(extractedData)),
        confidenceScores: JSON.parse(JSON.stringify(extractedData.confidence_scores)),
        overallConfidence,
        needsReview,
        reviewNotes: validationIssues.length > 0 ? validationIssues.join('; ') : null,
      },
    });

    // Save cost metrics
    if (result.usage) {
      const estimatedCost = calculateCost(
        result.usage.inputTokens,
        result.usage.outputTokens,
        model === MODELS.PRO ? MODELS.PRO : MODELS.FLASH,
        options.useBatchApi || false
      );

      await prisma.costMetrics.create({
        data: {
          documentId,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
          model,
          estimatedCost,
          usedBatchApi: options.useBatchApi || false,
        },
      });
    }

    // Update document status to completed (use COMPLETED - needsReview is tracked in ExtractedData)
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        processingCompletedAt: new Date(),
      },
    });

    // Return ExtractionResult matching the type definition
    return {
      name: extractedData.name || null,
      address: extractedData.address || null,
      postalcode: extractedData.postalcode || null,
      city: extractedData.city || null,
      birthday: extractedData.birthday || null,
      date: extractedData.date || null,
      time: extractedData.time || null,
      handwritten: extractedData.handwritten || false,
      signed: extractedData.signed || false,
      stamp: extractedData.stamp || null,
      pdf_file_name: fileName,
      status: needsReview ? 'partial' : 'success',
      confidence_scores: extractedData.confidence_scores || {},
    };

  } catch (error) {
    console.error('Extraction error:', error);
    
    // Update status to failed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        processingCompletedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Parse the extraction result from Gemini
 */
function parseExtractionResult(text: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try direct JSON parse
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }

    // If no JSON found, create a basic structure
    return {
      name: null,
      address: null,
      postalcode: null,
      city: null,
      birthday: null,
      date: null,
      time: null,
      handwritten: false,
      signed: false,
      stamp: false,
      confidence_scores: {},
      raw_text: text,
    };
  } catch (error) {
    console.error('Failed to parse extraction result:', error);
    return {
      name: null,
      address: null,
      postalcode: null,
      city: null,
      birthday: null,
      date: null,
      time: null,
      handwritten: false,
      signed: false,
      stamp: false,
      confidence_scores: {},
      raw_text: text,
      parse_error: true,
    };
  }
}

/**
 * Validate extracted data and return list of issues
 */
function validateExtractedData(data: any): string[] {
  const issues: string[] = [];

  // Check date formats
  if (data.birthday && !isValidDateFormat(data.birthday)) {
    issues.push(`Birthday format invalid: ${data.birthday}`);
  }
  if (data.date && !isValidDateFormat(data.date)) {
    issues.push(`Date format invalid: ${data.date}`);
  }

  // Check postal code
  if (data.postalcode && !isValidPostalCode(data.postalcode)) {
    issues.push(`Postal code format invalid: ${data.postalcode}`);
  }

  // Check time format
  if (data.time && !isValidTimeFormat(data.time)) {
    issues.push(`Time format invalid: ${data.time}`);
  }

  // Check for low confidence scores
  if (data.confidence_scores) {
    for (const [field, score] of Object.entries(data.confidence_scores)) {
      if (score !== null && (score as number) < 0.5) {
        issues.push(`Low confidence for ${field}: ${score}`);
      }
    }
  }

  return issues;
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(scores?: ConfidenceScores): number {
  if (!scores) return 0.5;
  
  const values = Object.values(scores).filter(v => v !== null && v !== undefined) as number[];
  if (values.length === 0) return 0.5;
  
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Generate a smart file name based on extracted data
 */
async function generateFileName(extractedData: any): Promise<string> {
  const parts: string[] = [];
  
  // Add date if available
  if (extractedData.date) {
    parts.push(extractedData.date.replace(/\//g, '-'));
  }
  
  // Add name if available
  if (extractedData.name) {
    // Clean the name
    const cleanName = extractedData.name
      .replace(/[^a-zA-Z\s]/g, '')
      .split(' ')
      .slice(0, 2)
      .join('_');
    parts.push(cleanName);
  }
  
  // Add type indicator
  if (extractedData.signed) {
    parts.push('signed');
  }
  
  if (parts.length === 0) {
    parts.push('document');
  }
  
  return parts.join('_') + '.pdf';
}

/**
 * Batch extraction for multiple documents
 */
export async function batchExtract(
  documentIds: string[],
  options: ExtractDocumentOptions = {}
): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  
  for (const docId of documentIds) {
    try {
      const result = await extractDocument(docId, {
        ...options,
        useBatchApi: documentIds.length > 100,
      });
      results.push(result);
    } catch (error) {
      // Return a failed ExtractionResult for this document
      results.push({
        name: null,
        address: null,
        postalcode: null,
        city: null,
        birthday: null,
        date: null,
        time: null,
        handwritten: false,
        signed: false,
        stamp: null,
        pdf_file_name: docId,
        status: 'failed',
        confidence_scores: {},
      });
    }
  }
  
  return results;
}
