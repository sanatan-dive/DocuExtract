import prisma from '@/lib/db';
import { calculateCost } from '@/lib/utils';
import { CostSummary } from '@/types';

/**
 * Get cost summary for all documents
 */
export async function getCostSummary(): Promise<CostSummary> {
  const metrics = await prisma.costMetrics.findMany({
    include: {
      document: {
        select: { status: true },
      },
    },
  });

  const totalDocuments = metrics.length;
  let totalCost = 0;
  const costByModel: Record<string, number> = {};
  let batchSavings = 0;

  for (const metric of metrics) {
    totalCost += metric.estimatedCost;

    // Track cost by model
    const model = metric.model || 'unknown';
    costByModel[model] = (costByModel[model] || 0) + metric.estimatedCost;

    // Calculate batch savings
    if (metric.usedBatchApi) {
      // Batch API is 50% cheaper, so we saved 50% of what we would have paid
      batchSavings += metric.estimatedCost; // We paid half, so savings = what we paid
    }
  }

  return {
    totalDocuments,
    totalCost,
    costByModel,
    batchSavings,
    averageCostPerDocument: totalDocuments > 0 ? totalCost / totalDocuments : 0,
  };
}

/**
 * Track cost for a document
 */
export async function trackCost(
  documentId: string,
  inputTokens: number,
  outputTokens: number,
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash',
  usedBatchApi: boolean = false
): Promise<void> {
  const estimatedCost = calculateCost(inputTokens, outputTokens, model, usedBatchApi);

  await prisma.costMetrics.upsert({
    where: { documentId },
    create: {
      documentId,
      inputTokens,
      outputTokens,
      model,
      estimatedCost,
      usedBatchApi,
    },
    update: {
      inputTokens,
      outputTokens,
      model,
      estimatedCost,
      usedBatchApi,
    },
  });
}

/**
 * Get cost metrics for a specific document
 */
export async function getDocumentCost(documentId: string) {
  return prisma.costMetrics.findUnique({
    where: { documentId },
  });
}

/**
 * Get cost breakdown by model
 */
export async function getCostByModel(): Promise<Record<string, { count: number; cost: number; tokens: number }>> {
  const metrics = await prisma.costMetrics.groupBy({
    by: ['model'],
    _count: true,
    _sum: {
      estimatedCost: true,
      inputTokens: true,
      outputTokens: true,
    },
  });

  const result: Record<string, { count: number; cost: number; tokens: number }> = {};

  for (const m of metrics) {
    result[m.model || 'unknown'] = {
      count: m._count,
      cost: m._sum.estimatedCost || 0,
      tokens: (m._sum.inputTokens || 0) + (m._sum.outputTokens || 0),
    };
  }

  return result;
}

/**
 * Get cost over time (last 7 days)
 */
export async function getCostOverTime(days: number = 7): Promise<{ date: string; cost: number; count: number }[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await prisma.costMetrics.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      createdAt: true,
      estimatedCost: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by date
  const byDate: Record<string, { cost: number; count: number }> = {};

  for (const m of metrics) {
    const date = m.createdAt.toISOString().split('T')[0];
    if (!byDate[date]) {
      byDate[date] = { cost: 0, count: 0 };
    }
    byDate[date].cost += m.estimatedCost;
    byDate[date].count++;
  }

  return Object.entries(byDate).map(([date, data]) => ({
    date,
    ...data,
  }));
}

/**
 * Estimate cost for a batch of documents
 */
export function estimateBatchCost(
  documentCount: number,
  avgTokensPerDoc: number = 5000,
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash' = 'gemini-2.5-flash',
  useBatchApi: boolean = true
): { standardCost: number; batchCost: number; savings: number } {
  const inputTokens = avgTokensPerDoc * 0.8; // Assume 80% input
  const outputTokens = avgTokensPerDoc * 0.2; // Assume 20% output

  const standardCost = calculateCost(inputTokens, outputTokens, model, false) * documentCount;
  const batchCost = calculateCost(inputTokens, outputTokens, model, useBatchApi) * documentCount;
  const savings = standardCost - batchCost;

  return { standardCost, batchCost, savings };
}
