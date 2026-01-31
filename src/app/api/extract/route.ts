import { NextRequest, NextResponse } from 'next/server';
import { extractDocument } from '@/lib/extraction/extractionService';
import { isConfigured } from '@/lib/extraction/geminiClient';
import prisma from '@/lib/db';

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

// Bulk extraction endpoint
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

    // Check for Batch API threshold (> 100 documents)
    const useBatchApi = documentIds.length > 100;
    
    // Process documents
    const results: { documentId: string; success: boolean; error?: string }[] = [];

    // In a real implementation with Gemini Batch API:
    // 1. We would create a batch job (asynchronous)
    // 2. Set status to 'QUEUED_FOR_BATCH'
    // 3. Poll for results later
    //
    // For this implementation, we simulate it by processing with the 'useBatchApi' flag
    // which applies the 50% cost discount.

    for (const documentId of documentIds) {
      try {
        if (useBatchApi) {
             // Mark as queued for batch first to update UI
             await prisma.document.update({
                 where: { id: documentId },
                 data: { status: 'QUEUED_FOR_BATCH' }
             });
        }

        await extractDocument(documentId, { useBatchApi });
        results.push({ documentId, success: true });
      } catch (error) {
        results.push({
          documentId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Processed ${successful} documents, ${failed} failed`,
      results,
    });

  } catch (error) {
    console.error('Bulk extraction error:', error);
    return NextResponse.json(
      { success: false, error: 'Bulk extraction failed' },
      { status: 500 }
    );
  }
}
