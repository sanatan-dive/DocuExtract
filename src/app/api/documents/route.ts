import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getCostSummary } from "@/lib/optimization/costTracker";

// Get all documents with their extracted data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const needsReview = searchParams.get("needsReview");
    const search = searchParams.get("search");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (needsReview === "true") {
      where.extractedData = { needsReview: true };
    }

    if (search) {
      where.OR = [
        { originalName: { contains: search, mode: "insensitive" } },
        { extractedData: { name: { contains: search, mode: "insensitive" } } },
        { extractedData: { city: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Get documents with pagination
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          extractedData: true,
          costMetrics: true,
          processedImages: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    // Get status counts
    const statusCounts = await prisma.document.groupBy({
      by: ["status"],
      _count: true,
    });

    // Get processing history (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start of that month

    const historyDocs = await prisma.document.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        status: true,
        createdAt: true,
      },
    });

    // Process history into monthly buckets
    const processingHistory = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const monthName = d.toLocaleString("default", { month: "short" });
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`; // For matching

      // Filter docs for this month
      const monthDocs = historyDocs.filter(
        (doc) =>
          doc.createdAt.getFullYear() === d.getFullYear() &&
          doc.createdAt.getMonth() === d.getMonth(),
      );

      processingHistory.push({
        month: monthName,
        completed: monthDocs.filter((d) => d.status === "COMPLETED").length,
        pending: monthDocs.filter((d) =>
          ["PENDING", "UPLOADING", "PROCESSING"].includes(d.status),
        ).length,
        failed: monthDocs.filter((d) => d.status === "FAILED").length,
      });
    }

    // Get cost summary
    const costSummary = await getCostSummary();

    return NextResponse.json({
      success: true,
      data: documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        statusCounts: Object.fromEntries(
          statusCounts.map((s: { status: string; _count: number }) => [
            s.status,
            s._count,
          ]),
        ),
        processingHistory,
        costSummary,
      },
    });
  } catch (error) {
    console.error("Get documents error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

// Delete a document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Document ID required" },
        { status: 400 },
      );
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      success: true,
      message: "Document deleted",
    });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete document" },
      { status: 500 },
    );
  }
}

// Update a document (for manual review)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");
    const body = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "Document ID required" },
        { status: 400 },
      );
    }

    // Update the extracted data
    await prisma.extractedData.update({
      where: { documentId },
      data: {
        ...body,
        needsReview: false, // Mark as reviewed
        reviewNotes: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Document updated successfully",
    });
  } catch (error) {
    console.error("Update document error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update document" },
      { status: 500 },
    );
  }
}
