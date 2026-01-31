import { DocumentType } from '@/types';
import { generateWithBase64Images, MODELS, ModelType } from '@/lib/extraction/geminiClient';
import { CLASSIFICATION_PROMPT } from '@/lib/extraction/extractionPrompts';
import { ClassificationResult } from '@/types';

/**
 * Classify a document to determine optimal model routing
 */
export async function classifyDocument(
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<ClassificationResult> {
  try {
    const result = await generateWithBase64Images(
      CLASSIFICATION_PROMPT,
      [{ base64: imageBase64, mimeType }],
      MODELS.FLASH // Use Flash for classification (faster, cheaper)
    );

    // Parse the JSON response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in classification response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Map string type to enum
    const typeMap: Record<string, DocumentType> = {
      'HANDWRITTEN': 'HANDWRITTEN',
      'TYPED': 'TYPED',
      'MIXED': 'MIXED',
      'SCANNED': 'SCANNED',
    };

    const docType = typeMap[parsed.type?.toUpperCase()] || 'TYPED';
    const confidence = typeof parsed.confidence === 'number' 
      ? Math.min(1, Math.max(0, parsed.confidence)) 
      : 0.5;

    // Determine recommended model based on classification
    const recommendedModel = getRecommendedModel(docType);

    return {
      type: docType,
      confidence,
      recommendedModel,
    };

  } catch (error) {
    console.error('Classification error:', error);
    
    // Default to Pro model for safety on errors
    return {
      type: 'MIXED',
      confidence: 0.5,
      recommendedModel: MODELS.PRO,
    };
  }
}

/**
 * Get recommended model based on document type
 * 
 * Routing Logic:
 * - HANDWRITTEN: Use Pro (better at interpreting handwriting)
 * - MIXED: Use Pro (needs to handle both)
 * - SCANNED: Use Pro (may have quality issues)
 * - TYPED: Use Flash (faster, cheaper, sufficient quality)
 */
function getRecommendedModel(docType: DocumentType): ModelType {
  switch (docType) {
    case 'HANDWRITTEN':
    case 'MIXED':
    case 'SCANNED':
      return MODELS.PRO;
    case 'TYPED':
    default:
      return MODELS.FLASH;
  }
}

/**
 * Quick classification based on text content (if available)
 * Returns null if classification isn't possible from text alone
 */
export function quickClassifyFromText(text: string): DocumentType | null {
  if (!text || text.length < 50) {
    return null; // Not enough text to determine
  }

  // If we successfully extracted a lot of clean text, it's likely typed
  const wordCount = text.split(/\s+/).length;
  const avgWordLength = text.length / wordCount;

  // Typed documents typically have more consistent word lengths
  if (avgWordLength > 3 && avgWordLength < 12 && wordCount > 20) {
    return 'TYPED';
  }

  return null;
}

/**
 * Batch classify multiple documents
 */
export async function batchClassify(
  images: { id: string; base64: string; mimeType: string }[]
): Promise<Map<string, ClassificationResult>> {
  const results = new Map<string, ClassificationResult>();

  // Process in parallel with concurrency limit
  const CONCURRENCY_LIMIT = 5;
  
  for (let i = 0; i < images.length; i += CONCURRENCY_LIMIT) {
    const batch = images.slice(i, i + CONCURRENCY_LIMIT);
    
    const batchResults = await Promise.all(
      batch.map(async (img) => {
        const result = await classifyDocument(img.base64, img.mimeType);
        return { id: img.id, result };
      })
    );

    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });
  }

  return results;
}
