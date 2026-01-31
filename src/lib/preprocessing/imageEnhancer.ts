import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface EnhancementOptions {
  autoRotate?: boolean;
  deskew?: boolean;
  denoise?: boolean;
  enhanceContrast?: boolean;
  targetDpi?: number;
}

export interface EnhancementResult {
  outputPath: string;
  width: number;
  height: number;
  rotated: boolean;
  deskewed: boolean;
  enhanced: boolean;
}

const DEFAULT_OPTIONS: EnhancementOptions = {
  autoRotate: true,
  deskew: true,
  denoise: true,
  enhanceContrast: true,
  targetDpi: 300,
};

/**
 * Enhance an image with preprocessing operations
 */
export async function enhanceImage(
  inputPath: string,
  outputPath: string,
  options: EnhancementOptions = {}
): Promise<EnhancementResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  let pipeline = sharp(inputPath);
  let rotated = false;
  let deskewed = false;
  let enhanced = false;

  // Get image metadata
  const metadata = await pipeline.metadata();
  
  // Auto-rotate based on EXIF orientation
  if (opts.autoRotate) {
    pipeline = pipeline.rotate(); // Auto-rotate based on EXIF
    rotated = true;
  }

  // Deskewing is complex - we'll use a simplified approach
  // In production, you'd use a library like OpenCV or Tesseract for accurate deskew detection
  if (opts.deskew) {
    // For now, we normalize the image but don't apply rotation
    // Real deskewing would require edge detection algorithms
    deskewed = false; // Mark as not actually deskewed until we implement proper algorithm
  }

  // Denoise using median filter
  if (opts.denoise) {
    pipeline = pipeline.median(3); // 3x3 median filter for noise reduction
    enhanced = true;
  }

  // Enhance contrast using normalization
  if (opts.enhanceContrast) {
    pipeline = pipeline.normalize(); // Stretches the image levels to 0-255
    enhanced = true;
  }

  // Ensure grayscale for OCR (optional - comment out if color is needed)
  // pipeline = pipeline.grayscale();

  // Apply sharpening for better text recognition
  pipeline = pipeline.sharpen({
    sigma: 1,
    m1: 0.5,
    m2: 0.5,
  });

  // Set DPI in metadata
  pipeline = pipeline.withMetadata({
    density: opts.targetDpi,
  });

  // Process and save
  const result = await pipeline.toFile(outputPath);

  return {
    outputPath,
    width: result.width,
    height: result.height,
    rotated,
    deskewed,
    enhanced,
  };
}

/**
 * Convert PDF page rendered as raw data to enhanced image
 */
export async function processRawPageData(
  pageData: Buffer,
  width: number,
  height: number,
  outputPath: string,
  options: EnhancementOptions = {}
): Promise<EnhancementResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  let pipeline = sharp(pageData, {
    raw: {
      width,
      height,
      channels: 4, // RGBA
    },
  });

  let enhanced = false;

  // Apply preprocessing
  if (opts.denoise) {
    pipeline = pipeline.median(3);
    enhanced = true;
  }

  if (opts.enhanceContrast) {
    pipeline = pipeline.normalize();
    enhanced = true;
  }

  // Sharpen for OCR
  pipeline = pipeline.sharpen({
    sigma: 1,
    m1: 0.5,
    m2: 0.5,
  });

  // Set DPI
  pipeline = pipeline.withMetadata({
    density: opts.targetDpi,
  });

  // Convert to PNG
  pipeline = pipeline.png({
    compressionLevel: 6,
  });

  const result = await pipeline.toFile(outputPath);

  return {
    outputPath,
    width: result.width,
    height: result.height,
    rotated: false,
    deskewed: false,
    enhanced,
  };
}

/**
 * Convert image to base64 for API consumption
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  const imageBuffer = await readFile(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Get image dimensions and format
 */
export async function getImageInfo(imagePath: string): Promise<{
  width: number;
  height: number;
  format: string;
}> {
  const metadata = await sharp(imagePath).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
  };
}

/**
 * Resize image for API (Gemini has size limits)
 */
export async function resizeForApi(
  imagePath: string,
  maxWidth: number = 2048,
  maxHeight: number = 2048
): Promise<Buffer> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (
    (metadata.width && metadata.width > maxWidth) ||
    (metadata.height && metadata.height > maxHeight)
  ) {
    return image
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
  }

  return image.toBuffer();
}
