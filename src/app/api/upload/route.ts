import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/db";
import { generateFileName, hashString } from "@/lib/utils";
import { analyzePdfStructure, splitPdf } from "@/lib/splitting/pdfSplitter";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE =
  parseInt(process.env.MAX_FILE_SIZE_MB || "50") * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "Only PDF files are allowed" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        },
        { status: 400 },
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename for the master file
    const fileId = uuidv4();
    const fileName = generateFileName(file.name);
    const filePath = path.join(UPLOAD_DIR, `${fileName}.pdf`);

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save master file initially
    await writeFile(filePath, buffer);

    // Attempt to split the PDF
    let createdDocuments = [];
    let isSplit = false;

    try {
      const ranges = await analyzePdfStructure(filePath);

      // If we have multiple documents detected
      if (ranges.length > 1) {
        console.log(
          `Detected ${ranges.length} documents in ${fileName}. Splitting...`,
        );

        const splitFiles = await splitPdf(
          filePath,
          UPLOAD_DIR,
          ranges,
          file.name,
        );

        for (const splitFile of splitFiles) {
          // Calculate hash for the new file
          const splitBuffer = await readFile(splitFile.filePath);
          const splitHash = await hashString(
            splitBuffer.toString("base64").slice(0, 10000),
          );

          // Check duplicate for split file (optional, but good practice)
          const existingDoc = await prisma.document.findFirst({
            where: { fileHash: splitHash },
            select: { id: true, originalName: true },
          });

          if (existingDoc) {
            console.log(
              `Duplicate found for split part ${splitFile.fileName}, using existing.`,
            );
            // If duplicate exists, we might still want to add it to the list of processed IDs
            // or maybe skip it. For this flow, let's create a new reference or return existing ID.
            // But existingDoc has an ID.
            createdDocuments.push(existingDoc);
            continue;
          }

          const doc = await prisma.document.create({
            data: {
              fileName: splitFile.fileName,
              originalName: splitFile.originalName,
              fileSize: splitBuffer.length,
              fileHash: splitHash,
              pageCount: splitFile.pageCount,
              status: "PENDING",
              modelUsed: "gemini-3-flash-preview", // We used this for splitting analysis implied
            },
          });
          createdDocuments.push(doc);
        }

        isSplit = true;

        // Clean up the master file since we split it
        // await unlink(filePath);
        // Keeping it might be useful for debugging, but typically "break it down" means replace.
        // Let's keep it for now but NOT create a Document record for it.
      }
    } catch (splitError) {
      console.error(
        "Splitting failed, falling back to single file processing:",
        splitError,
      );
      isSplit = false;
    }

    if (!isSplit) {
      // Normal single file processing
      const fileHash = await hashString(
        buffer.toString("base64").slice(0, 10000),
      );

      // Check for duplicates
      const existingDoc = await prisma.document.findFirst({
        where: { fileHash },
        select: { id: true, originalName: true, fileName: true },
      });

      if (existingDoc) {
        return NextResponse.json(
          {
            success: false,
            error: `Duplicate document detected: "${existingDoc.originalName}"`,
            duplicateId: existingDoc.id,
          },
          { status: 409 },
        );
      }

      const document = await prisma.document.create({
        data: {
          fileName: `${fileName}.pdf`,
          originalName: file.name,
          fileSize: file.size,
          fileHash,
          status: "PENDING",
        },
      });
      createdDocuments.push(document);
    }

    return NextResponse.json({
      success: true,
      documentId: createdDocuments[0].id, // Return first for backward compatibility
      documentIds: createdDocuments.map((d) => d.id), // New field
      documents: createdDocuments.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        originalName: d.originalName,
      })),
      fileName: createdDocuments[0].fileName,
      message: isSplit
        ? `Split into ${createdDocuments.length} documents`
        : "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload file" },
      { status: 500 },
    );
  }
}

// Get upload status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

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
          { success: false, error: "Document not found" },
          { status: 404 },
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
      orderBy: { createdAt: "desc" },
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
    console.error("Get upload status error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get upload status" },
      { status: 500 },
    );
  }
}
