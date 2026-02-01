import { NextRequest, NextResponse } from 'next/server';
import { extractDocument } from '@/lib/extraction/extractionService';
import { isConfigured } from '@/lib/extraction/geminiClient';
import prisma from '@/lib/db';
import { documentQueue } from '@/lib/queue/processingQueue';

export async function POST(request: NextRequest) {
  try {
    // Check if API is configured
    if (!isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Gemini API key not configured. Please set GEMINI_API_KEY in environment.' 
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { documentId, forceModel, skipClassification } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (document.status === 'COMPLETED') {
      const existingData = await prisma.extractedData.findUnique({
        where: { documentId },
      });

      return NextResponse.json({
        success: true,
        message: 'Document already processed',
        data: existingData,
      });
    }

    // Extract document
    const result = await extractDocument(documentId, {
      forceModel,
      skipClassification,
    });

    return NextResponse.json({
      success: true,
      message: 'Extraction completed',
      data: result,
    });

  } catch (error) {
    console.error('Extraction API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Extraction failed' 
      },
      { status: 500 }
    );
  }
}

// Register the queue processor (runs once on module load)
let processorRegistered = false;
function ensureProcessorRegistered() {
  if (processorRegistered) return;
  processorRegistered = true;

  documentQueue.process(async (job) => {
    const { documentId, options } = job.data;
    return await extractDocument(documentId, {
      forceModel: options?.forceModel as import('@/lib/extraction/geminiClient').ModelType | undefined,
      useBatchApi: options?.useBatchApi,
    });
  });
}

// Bulk extraction endpoint - uses parallel queue with batch tracking
export async function PUT(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { documentIds } = body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'documentIds array is required' },
        { status: 400 }
      );
    }

    // Ensure the processor is registered
    ensureProcessorRegistered();

    // Use batch processing for >100 documents
    const useBatchApi = documentIds.length > 100;

    // Create a BatchJob entry in the database for tracking
    const batchJob = await prisma.batchJob.create({
      data: {
        status: 'PROCESSING',
        documentCount: documentIds.length,
        submittedAt: new Date(),
      },
    });

    // Queue all documents for parallel processing
    for (const documentId of documentIds) {
      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: useBatchApi ? 'QUEUED_FOR_BATCH' : 'PENDING' },
      }).catch(() => {
        // Document may not exist, skip
      });

      // Add to processing queue
      documentQueue.add(documentId, {
        documentId,
        options: { useBatchApi },
      });
    }

    // For smaller batches, wait for completion
    // For larger batches, return immediately with job ID
    if (documentIds.length <= 10) {
      // Wait for all to complete (with timeout)
      const timeout = 60000; // 60 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const stats = documentQueue.getStats();
        if (stats.pending === 0 && stats.processing === 0) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Collect results
      const results = documentIds.map(docId => {
        const job = documentQueue.getJob(docId);
        return {
          documentId: docId,
          success: job?.status === 'completed',
          error: job?.error,
        };
      });

      // Update batch job status
      await prisma.batchJob.update({
        where: { id: batchJob.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return NextResponse.json({
        success: true,
        message: `Processed ${successful} documents, ${failed} failed`,
        batchJobId: batchJob.id,
        results,
      });
    }

    // For large batches, return 202 Accepted immediately
    return NextResponse.json(
      {
        success: true,
        message: `Queued ${documentIds.length} documents for processing`,
        batchJobId: batchJob.id,
        queueStats: documentQueue.getStats(),
      },
      { status: 202 }
    );

  } catch (error) {
    console.error('Bulk extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Bulk extraction failed' },
      { status: 500 }
    );
  }
}

