import { delay } from '@/lib/utils';

interface RateLimitState {
  isLimited: boolean;
  retryAfter: number | null;
  requestsInWindow: number;
  windowStart: number;
  consecutiveErrors: number;
}

const MAX_REQUESTS_PER_MINUTE = 60; // Conservative limit
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60000;

// Global state for rate limiting
let state: RateLimitState = {
  isLimited: false,
  retryAfter: null,
  requestsInWindow: 0,
  windowStart: Date.now(),
  consecutiveErrors: 0,
};

// Callbacks for UI updates
type StatusCallback = (status: RateLimitStatus) => void;
const statusCallbacks: Set<StatusCallback> = new Set();

export interface RateLimitStatus {
  isLimited: boolean;
  retryAfterMs: number | null;
  requestsRemaining: number;
  message: string;
}

/**
 * Check if we can make a request
 */
export function canMakeRequest(): boolean {
  resetWindowIfNeeded();
  return !state.isLimited && state.requestsInWindow < MAX_REQUESTS_PER_MINUTE;
}

/**
 * Record a successful request
 */
export function recordRequest(): void {
  resetWindowIfNeeded();
  state.requestsInWindow++;
  state.consecutiveErrors = 0;
  notifyListeners();
}

/**
 * Handle a rate limit error
 */
export function handleRateLimitError(retryAfterSeconds?: number): void {
  state.isLimited = true;
  state.consecutiveErrors++;
  
  // Calculate backoff delay
  const backoffDelay = Math.min(
    BASE_DELAY_MS * Math.pow(2, state.consecutiveErrors - 1),
    MAX_DELAY_MS
  );
  
  state.retryAfter = retryAfterSeconds 
    ? retryAfterSeconds * 1000 
    : backoffDelay;

  notifyListeners();

  // Schedule reset
  setTimeout(() => {
    state.isLimited = false;
    state.retryAfter = null;
    notifyListeners();
  }, state.retryAfter);
}

/**
 * Reset the rate limit window if needed
 */
function resetWindowIfNeeded(): void {
  const now = Date.now();
  if (now - state.windowStart >= WINDOW_MS) {
    state.windowStart = now;
    state.requestsInWindow = 0;
  }
}

/**
 * Get current rate limit status
 */
export function getStatus(): RateLimitStatus {
  resetWindowIfNeeded();
  
  const remaining = Math.max(0, MAX_REQUESTS_PER_MINUTE - state.requestsInWindow);
  
  let message = `${remaining} requests remaining`;
  if (state.isLimited) {
    const seconds = Math.ceil((state.retryAfter || 0) / 1000);
    message = `Rate limited. Resuming in ${seconds} seconds...`;
  }

  return {
    isLimited: state.isLimited,
    retryAfterMs: state.retryAfter,
    requestsRemaining: remaining,
    message,
  };
}

/**
 * Subscribe to rate limit status updates
 */
export function subscribe(callback: StatusCallback): () => void {
  statusCallbacks.add(callback);
  return () => statusCallbacks.delete(callback);
}

/**
 * Notify all listeners of status change
 */
function notifyListeners(): void {
  const status = getStatus();
  statusCallbacks.forEach(cb => cb(status));
}

/**
 * Execute a function with rate limiting and retry
 */
export async function withRateLimit<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    onRetry?: (attempt: number, delayMs: number) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Wait if rate limited
    if (state.isLimited && state.retryAfter) {
      if (options.onRetry) {
        options.onRetry(attempt, state.retryAfter);
      }
      await delay(state.retryAfter);
    }

    // Check if we can make request
    while (!canMakeRequest()) {
      await delay(1000);
    }

    try {
      recordRequest();
      return await fn();
    } catch (error: unknown) {
      const err = error as Error & { status?: number; message?: string };
      
      // Check if it's a rate limit error (429)
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('rate limit')) {
        handleRateLimitError();

        if (attempt < maxRetries) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
          if (options.onRetry) {
            options.onRetry(attempt + 1, delayMs);
          }
          await delay(delayMs);
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Reset rate limiter state (for testing)
 */
export function reset(): void {
  state = {
    isLimited: false,
    retryAfter: null,
    requestsInWindow: 0,
    windowStart: Date.now(),
    consecutiveErrors: 0,
  };
}
