import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import prisma from '@/lib/db';
import { generateWithBase64Images, MODELS, ModelType } from './geminiClient';
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

    // Convert PDF to images
    // Use the first page for extraction (most typical for forms)
    // In a full implementation, we would process all pages and concatenate text or use multi-modal input
    const pdfToImages = (await import('../preprocessing/pdfToImages')).pdfToImages;
    const enhanceImage = (await import('../preprocessing/imageEnhancer')).enhanceImage;
    const imageToBase64 = (await import('../preprocessing/imageEnhancer')).imageToBase64;

    // 1. Convert PDF to images (300 DPI)
    const pageImages = await pdfToImages(pdfPath, documentId);
    
    if (pageImages.length === 0) {
      throw new Error('No images extracted from PDF');
    }

    // 2. Enhance images (Denoise, Deskew, etc.)
    const processedImages = [];
    for (const page of pageImages) {
        const enhancedResult = await enhanceImage(
            page.imagePath, 
            page.imagePath.replace('.png', '_enhanced.png')
        );
        
        // Save processed image record to DB
        await prisma.processedImage.create({
            data: {
                documentId,
                pageNumber: page.pageNumber,
                imagePath: enhancedResult.outputPath,
                width: enhancedResult.width,
                height: enhancedResult.height,
                dpi: page.dpi,
                rotated: enhancedResult.rotated,
                deskewed: enhancedResult.deskewed,
                enhanced: enhancedResult.enhanced
            }
        });
        
        processedImages.push(enhancedResult);
    }
    
    // 3. Prepare for Gemini (use first page enhanced image for now to save tokens/costs)
    // For production with multi-page support, we'd loop through all
    const imagePath = processedImages[0].outputPath;
    const base64Image = await imageToBase64(imagePath);

    // Update status to classifying
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'CLASSIFYING' },
    });

    // Classify the document (unless skipped or forced model)
    let model: ModelType = options.forceModel || MODELS.FLASH;
    let classification = document.classification;

    if (!options.skipClassification && !options.forceModel) {
      const classResult = await classifyDocument(base64Image, 'image/png');
      classification = classResult.type;
      model = classResult.recommendedModel as ModelType;

      // Update classification in database
      await prisma.document.update({
        where: { id: documentId },
        data: {
          classification: classResult.type,
          classificationConfidence: classResult.confidence,
        },
      });
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
    const prompt = getExtractionPrompt(isHandwritten, document.pageCount > 1);

    // Call Gemini for extraction
    const result = await generateWithBase64Images(
      prompt,
      [{ base64: base64Image, mimeType: 'image/png' }],
      model
    );

    // Parse the extraction result
    const extractedData = parseExtractionResult(result.text);

    // Generate file name
    const fileName = await generateFileName(extractedData);

    // Validate extracted data
    const validationIssues = validateExtractedData(extractedData);
    const needsReview = validationIssues.length > 0 || 
      (extractedData.confidence_scores && 
       Object.values(extractedData.confidence_scores).some(score => score && score < 0.7));

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

    // Update document status to completed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        processingCompletedAt: new Date(),
      },
    });

    return {
      ...extractedData,
      pdf_file_name: fileName,
      status: needsReview ? 'partial' : 'success',
    };

  } catch (error) {
    console.error('Extraction error:', error);

    // Update document status to failed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        processingCompletedAt: new Date(),
      },
    });

    throw error;
  }
}

/**
 * Parse extraction result from JSON string
 */
function parseExtractionResult(text: string): ExtractionResult {
  try {
    // Find JSON in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in extraction response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      name: parsed.name || null,
      address: parsed.address || null,
      postalcode: parsed.postalcode || null,
      city: parsed.city || null,
      birthday: parsed.birthday || null,
      date: parsed.date || null,
      time: parsed.time || null,
      handwritten: !!parsed.handwritten,
      signed: !!parsed.signed,
      stamp: parsed.stamp || null,
      pdf_file_name: '',
      status: 'success',
      confidence_scores: parsed.confidence_scores || {},
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
      stamp: null,
      pdf_file_name: '',
      status: 'failed',
      confidence_scores: {},
    };
  }
}

/**
 * Validate extracted data and return issues
 */
function validateExtractedData(data: ExtractionResult): string[] {
  const issues: string[] = [];

  // Validate postal code
  if (data.postalcode && !isValidPostalCode(data.postalcode)) {
    issues.push(`Invalid postal code format: ${data.postalcode}`);
  }

  // Validate date format
  if (data.birthday && !isValidDateFormat(data.birthday)) {
    issues.push(`Invalid birthday format: ${data.birthday}`);
  }

  if (data.date && !isValidDateFormat(data.date)) {
    issues.push(`Invalid date format: ${data.date}`);
  }

  // Validate time format
  if (data.time && !isValidTimeFormat(data.time)) {
    issues.push(`Invalid time format: ${data.time}`);
  }

  // Validate stamp options
  const validStamps = ['BB', 'AB', 'FK', 'S'];
  if (data.stamp) {
    const stamps = data.stamp.split(',').map(s => s.trim());
    const invalidStamps = stamps.filter(s => !validStamps.includes(s));
    if (invalidStamps.length > 0) {
      issues.push(`Invalid stamp value(s): ${invalidStamps.join(', ')}`);
    }
  }

  return issues;
}

/**
 * Calculate overall confidence from individual scores
 */
function calculateOverallConfidence(scores: ConfidenceScores | undefined): number {
  if (!scores) return 0.5;

  const values = Object.values(scores).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return 0.5;

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Generate a file name based on extracted data
 */
async function generateFileName(data: ExtractionResult): Promise<string> {
  const date = data.date 
    ? data.date.split('.').reverse().join('-') 
    : 'undated';

  let name = 'unknown';
  if (data.name) {
    const parts = data.name.split(' ');
    if (parts.length >= 2) {
      const lastName = parts[parts.length - 1].toLowerCase();
      const firstName = parts[0].toLowerCase();
      name = `${lastName}_${firstName}`;
    } else {
      name = parts[0].toLowerCase();
    }
  }

  // Sanitize the name
  name = name
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9_]/g, '_');

  return `doc_${date}_${name}`;
}
