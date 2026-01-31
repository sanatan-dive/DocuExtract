import { NextRequest, NextResponse } from 'next/server';
import { getCostSummary, getCostByModel, getCostOverTime } from '@/lib/optimization/costTracker';

// Get metrics and cost data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const [costSummary, costByModel, costOverTime] = await Promise.all([
      getCostSummary(),
      getCostByModel(),
      getCostOverTime(days),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: costSummary,
        byModel: costByModel,
        overTime: costOverTime,
      },
    });

  } catch (error) {
    console.error('Get metrics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
