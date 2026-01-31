/**
 * Extraction prompts for document data extraction
 * These prompts are carefully engineered for accuracy and consistency
 */

export const CLASSIFICATION_PROMPT = `
You are a document classification expert. Analyze this document image and classify it.

Determine:
1. Document type: Is this document primarily HANDWRITTEN, TYPED (printed/computer-generated), MIXED (both handwritten and typed), or SCANNED (unclear quality)?
2. Your confidence level (0.0 to 1.0)

CLASSIFICATION CRITERIA:
- HANDWRITTEN: Majority of text is handwritten, includes signatures, handwritten notes
- TYPED: Majority is machine-printed text, forms with typed entries
- MIXED: Significant portions of both handwritten and typed text
- SCANNED: Poor quality scan that's difficult to read, regardless of original type

Respond ONLY with valid JSON in this exact format:
{
  "type": "HANDWRITTEN" | "TYPED" | "MIXED" | "SCANNED",
  "confidence": 0.85,
  "reasoning": "Brief explanation of classification"
}
`;

export const EXTRACTION_PROMPT = `
You are an expert document data extractor. Extract structured information from this document image with high precision.

EXTRACTION RULES:
1. Extract exactly these fields from the document
2. For missing fields, return null
3. Provide a confidence score (0.0 to 1.0) for each extracted field
4. Use German date format: DD.MM.YYYY
5. Use 24-hour time format: HH:MM
6. Postal codes must be exactly 5 digits (German format)
7. For "stamp" field, valid values are: BB, AB, FK, S (can be combined, e.g., "BB,AB")
8. Determine if the document is handwritten based on visual inspection
9. Check if there is a signature present

IMPORTANT:
- Be precise with names - preserve umlauts and special characters
- For addresses, include street name and house number
- If text is unclear, provide your best interpretation but lower the confidence
- Do not make up information - if something is missing, return null

Respond ONLY with valid JSON in this exact format:
{
  "name": "string or null",
  "address": "string or null",
  "postalcode": "string (5 digits) or null",
  "city": "string or null", 
  "birthday": "DD.MM.YYYY or null",
  "date": "DD.MM.YYYY or null",
  "time": "HH:MM or null",
  "handwritten": true/false,
  "signed": true/false,
  "stamp": "string (BB|AB|FK|S combinations) or null",
  "confidence_scores": {
    "name": 0.0-1.0,
    "address": 0.0-1.0,
    "postalcode": 0.0-1.0,
    "city": 0.0-1.0,
    "birthday": 0.0-1.0,
    "date": 0.0-1.0,
    "time": 0.0-1.0,
    "signed": 0.0-1.0,
    "stamp": 0.0-1.0
  }
}
`;

export const EXTRACTION_PROMPT_HANDWRITTEN = `
You are an expert at reading and extracting data from HANDWRITTEN documents. This document contains handwritten text that may be difficult to read.

SPECIAL INSTRUCTIONS FOR HANDWRITTEN DOCUMENTS:
1. Take extra care with handwritten text interpretation
2. Common handwriting challenges:
   - Numbers that look similar (1/7, 4/9, 5/6, 0/6)
   - Letters that look similar (a/o, u/n, r/n)
   - German umlauts (ä, ö, ü) may be written as ae, oe, ue
3. If multiple interpretations are possible, choose the most likely based on context
4. Lower confidence scores for unclear sections
5. For postal codes, verify they are plausible German postal codes (start with 0-9, 5 digits)

${EXTRACTION_PROMPT}
`;

export const MULTI_PAGE_PROMPT = `
You are an expert document data extractor. This document has multiple pages shown below.
Extract structured information from ALL pages, combining relevant information.

If the same field appears on multiple pages, use the most complete/legible version.
If pages contain different types of information, combine them appropriately.

${EXTRACTION_PROMPT}
`;

/**
 * Get appropriate extraction prompt based on document type
 */
export function getExtractionPrompt(isHandwritten: boolean, isMultiPage: boolean): string {
  if (isMultiPage) {
    return MULTI_PAGE_PROMPT;
  }
  return isHandwritten ? EXTRACTION_PROMPT_HANDWRITTEN : EXTRACTION_PROMPT;
}

/**
 * Build file naming prompt
 */
export function getFileNamingPrompt(extractedData: Record<string, unknown>): string {
  return `
Based on the following extracted data, generate a suitable file name.

Extracted Data:
${JSON.stringify(extractedData, null, 2)}

Naming Convention Rules:
1. Format: doc_[DATE]_[LASTNAME]_[FIRSTNAME]
2. Use underscores instead of spaces
3. Use lowercase
4. Remove special characters except underscores
5. If date is missing, use 'undated'
6. If name is missing, use 'unknown'

Example outputs:
- doc_2022-05-01_ruwanika_annah
- doc_undated_mueller_hans
- doc_2023-12-15_unknown

Respond with ONLY the filename (no extension, no quotes):
`;
}
