import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/db';
import { generateFileName, hashString } from '@/lib/utils';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const fileId = uuidv4();
    const fileName = generateFileName(file.name);
    const filePath = path.join(UPLOAD_DIR, `${fileName}.pdf`);

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Calculate hash for duplicate detection
    const fileHash = await hashString(buffer.toString('base64').slice(0, 10000));

    // Check for duplicates
    const existingDoc = await prisma.document.findFirst({
      where: { fileHash },
      select: { id: true, originalName: true },
    });

    if (existingDoc) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Duplicate document detected: "${existingDoc.originalName}"`,
          duplicateId: existingDoc.id 
        },
        { status: 409 }
      );
    }

    // Write file to disk
    await writeFile(filePath, buffer);

    // Create database record
    const document = await prisma.document.create({
      data: {
        fileName: `${fileName}.pdf`,
        originalName: file.name,
        fileSize: file.size,
        fileHash,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      fileName: document.fileName,
      message: 'File uploaded successfully',
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Get upload status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          extractedData: true,
          costMetrics: true,
        },
      });

      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        document,
      });
    }

    // Return recent uploads
    const documents = await prisma.document.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      documents,
    });

  } catch (error) {
    console.error('Get upload status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get upload status' },
      { status: 500 }
    );
  }
}
