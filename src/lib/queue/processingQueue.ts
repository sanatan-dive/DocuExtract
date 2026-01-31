/**
 * Simple In-Memory Processing Queue
 * 
 * Provides parallel processing with concurrency control for document extraction.
 * In production, this would be replaced with Redis/BullMQ for persistence.
 */

export interface QueueJob<T = unknown> {
  id: string;
  data: T;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
}

export interface QueueOptions {
  concurrency: number;
  maxRetries: number;
  retryDelay: number;
}

type ProcessorFn<T> = (job: QueueJob<T>) => Promise<unknown>;

const DEFAULT_OPTIONS: QueueOptions = {
  concurrency: 5,
  maxRetries: 3,
  retryDelay: 1000,
};

class ProcessingQueue<T = unknown> {
  private jobs: Map<string, QueueJob<T>> = new Map();
  private pending: string[] = [];
  private processing: Set<string> = new Set();
  private processor: ProcessorFn<T> | null = null;
  private options: QueueOptions;
  private isRunning = false;
  private listeners: Map<string, (job: QueueJob<T>) => void> = new Map();

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Register a processor function for jobs
   */
  process(fn: ProcessorFn<T>): void {
    this.processor = fn;
    this.start();
  }

  /**
   * Add a job to the queue
   */
  add(id: string, data: T): QueueJob<T> {
    const job: QueueJob<T> = {
      id,
      data,
      status: 'pending',
      createdAt: new Date(),
      retries: 0,
      maxRetries: this.options.maxRetries,
    };

    this.jobs.set(id, job);
    this.pending.push(id);
    this.tick();

    return job;
  }

  /**
   * Get job status
   */
  getJob(id: string): QueueJob<T> | undefined {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): QueueJob<T>[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get queue stats
   */
  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const all = this.getAllJobs();
    return {
      pending: all.filter(j => j.status === 'pending').length,
      processing: all.filter(j => j.status === 'processing').length,
      completed: all.filter(j => j.status === 'completed').length,
      failed: all.filter(j => j.status === 'failed').length,
      total: all.length,
    };
  }

  /**
   * Subscribe to job completion
   */
  onComplete(jobId: string, callback: (job: QueueJob<T>) => void): void {
    this.listeners.set(jobId, callback);
  }

  /**
   * Start processing
   */
  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.tick();
  }

  /**
   * Process next jobs
   */
  private async tick(): Promise<void> {
    if (!this.processor) return;

    while (
      this.pending.length > 0 &&
      this.processing.size < this.options.concurrency
    ) {
      const jobId = this.pending.shift();
      if (!jobId) break;

      const job = this.jobs.get(jobId);
      if (!job) continue;

      this.processing.add(jobId);
      this.processJob(job);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: QueueJob<T>): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const result = await this.processor!(job);
      job.result = result;
      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.retries++;
      
      if (job.retries < job.maxRetries) {
        // Retry after delay
        job.status = 'pending';
        setTimeout(() => {
          this.pending.push(job.id);
          this.tick();
        }, this.options.retryDelay * job.retries);
      } else {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = new Date();
      }
    }

    this.processing.delete(job.id);

    // Notify listeners
    const listener = this.listeners.get(job.id);
    if (listener) {
      listener(job);
      this.listeners.delete(job.id);
    }

    // Continue processing
    this.tick();
  }

  /**
   * Clear completed/failed jobs
   */
  clear(): void {
    for (const [id, job] of this.jobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(id);
      }
    }
  }
}

// Singleton instance for document processing
interface DocumentJobData {
  documentId: string;
  options?: {
    forceModel?: string;
    templateId?: string;
    useBatchApi?: boolean;
  };
}

export const documentQueue = new ProcessingQueue<DocumentJobData>({
  concurrency: 5,
  maxRetries: 3,
  retryDelay: 2000,
});

// Export types and class
export { ProcessingQueue };
export type { DocumentJobData };
