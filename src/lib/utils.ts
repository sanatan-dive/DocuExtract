import { type ClassValue, clsx } from 'clsx';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date to locale string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format time to locale string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate a unique file name with timestamp
 */
export function generateFileName(originalName: string, prefix?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = originalName.replace(/\.pdf$/i, '');
  const sanitized = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${prefix ? prefix + '_' : ''}${timestamp}_${sanitized}`;
}

/**
 * Calculate hash of a string (for duplicate detection)
 */
export async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get confidence color based on score
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-500';
  if (confidence >= 0.7) return 'text-yellow-500';
  if (confidence >= 0.5) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get confidence badge color
 */
export function getConfidenceBadgeColor(confidence: number): string {
  if (confidence >= 0.9) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (confidence >= 0.7) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (confidence >= 0.5) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delayTime = baseDelay * Math.pow(2, attempt);
        await delay(delayTime);
      }
    }
  }
  
  throw lastError;
}

/**
 * Validate German postal code (5 digits)
 */
export function isValidPostalCode(code: string): boolean {
  return /^\d{5}$/.test(code);
}

/**
 * Validate German date format (DD.MM.YYYY)
 */
export function isValidDateFormat(date: string): boolean {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(date);
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

/**
 * Calculate estimated cost based on tokens and model
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash',
  useBatchApi: boolean = false
): number {
  // Pricing per 1M tokens (in USD)
  const pricing = {
    'gemini-2.5-pro': { input: 1.25, output: 10.0 },
    'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  };
  
  const rates = pricing[model];
  let cost = (inputTokens / 1_000_000) * rates.input + 
             (outputTokens / 1_000_000) * rates.output;
  
  // 50% discount for batch API
  if (useBatchApi) {
    cost *= 0.5;
  }
  
  return cost;
}
