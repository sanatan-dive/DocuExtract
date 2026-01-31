// Document status and type enums (mirroring Prisma schema)
export type DocumentStatus = 
  | 'PENDING'
  | 'UPLOADING'
  | 'PREPROCESSING'
  | 'CLASSIFYING'
  | 'EXTRACTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'QUEUED_FOR_BATCH';

export type DocumentType = 'HANDWRITTEN' | 'TYPED' | 'MIXED' | 'SCANNED';

// Document types
export interface DocumentWithRelations {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileHash: string | null;
  pageCount: number;
  status: DocumentStatus;
  classification: DocumentType | null;
  classificationConfidence: number | null;
  errorMessage: string | null;
  processingStartedAt: Date | null;
  processingCompletedAt: Date | null;
  modelUsed: string | null;
  createdAt: Date;
  updatedAt: Date;
  extractedData: ExtractedDataType | null;
  processedImages: ProcessedImageType[];
  costMetrics: CostMetricsType | null;
}

export interface ExtractedDataType {
  id: string;
  documentId: string;
  name: string | null;
  address: string | null;
  postalcode: string | null;
  city: string | null;
  birthday: string | null;
  date: string | null;
  time: string | null;
  handwritten: boolean | null;
  signed: boolean | null;
  stamp: string | null;
  rawJson: Record<string, unknown> | null;
  confidenceScores: ConfidenceScores | null;
  overallConfidence: number | null;
  needsReview: boolean;
  reviewNotes: string | null;
}

export interface ProcessedImageType {
  id: string;
  documentId: string;
  pageNumber: number;
  imagePath: string;
  width: number | null;
  height: number | null;
  dpi: number;
  rotated: boolean;
  deskewed: boolean;
  enhanced: boolean;
}

export interface CostMetricsType {
  id: string;
  documentId: string;
  inputTokens: number;
  outputTokens: number;
  model: string | null;
  estimatedCost: number;
  usedBatchApi: boolean;
  batchJobId: string | null;
}

export interface ConfidenceScores {
  name?: number;
  address?: number;
  postalcode?: number;
  city?: number;
  birthday?: number;
  date?: number;
  time?: number;
  signed?: number;
  stamp?: number;
  [key: string]: number | undefined;
}

// Upload types
export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  errorMessage?: string;
}

export interface UploadResponse {
  success: boolean;
  documentId?: string;
  error?: string;
}

// Extraction types
export interface ExtractionResult {
  name: string | null;
  address: string | null;
  postalcode: string | null;
  city: string | null;
  birthday: string | null;
  date: string | null;
  time: string | null;
  handwritten: boolean;
  signed: boolean;
  stamp: string | null;
  pdf_file_name: string;
  status: 'success' | 'partial' | 'failed';
  confidence_scores: ConfidenceScores;
}

// Classification types
export interface ClassificationResult {
  type: DocumentType;
  confidence: number;
  recommendedModel: string;  // Model ID from geminiClient
}

// Cost tracking types
export interface CostSummary {
  totalDocuments: number;
  totalCost: number;
  costByModel: {
    [model: string]: number;
  };
  batchSavings: number;
  averageCostPerDocument: number;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Table types
export interface TableFilters {
  status?: DocumentStatus[];
  classification?: DocumentType[];
  needsReview?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

// Export types
export type ExportFormat = 'csv' | 'json' | 'xlsx';

export interface ExportOptions {
  format: ExportFormat;
  includeConfidenceScores: boolean;
  includeMetadata: boolean;
  onlyFlagged?: boolean;
}
