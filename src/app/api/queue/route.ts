import { NextRequest, NextResponse } from 'next/server';
import { documentQueue } from '@/lib/queue/processingQueue';

// Get queue status
export async function GET() {
  try {
    const stats = documentQueue.getStats();
    const jobs = documentQueue.getAllJobs().slice(-50); // Last 50 jobs

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentJobs: jobs.map(j => ({
          id: j.id,
          status: j.status,
          createdAt: j.createdAt,
          startedAt: j.startedAt,
          completedAt: j.completedAt,
          retries: j.retries,
          error: j.error,
        })),
      },
    });
  } catch (error) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

// Clear completed jobs
export async function DELETE() {
  try {
    documentQueue.clear();
    return NextResponse.json({
      success: true,
      message: 'Queue cleared',
    });
  } catch (error) {
    console.error('Queue clear error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear queue' },
      { status: 500 }
    );
  }
}
