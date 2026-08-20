import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<Response>,
  options: RetryOptions = DEFAULT_OPTIONS,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      const response = await fn();

      if (response.ok) {
        return (await response.json()) as T;
      }

      const body = await response.text();

      // Don't retry 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        // Check for 24h messaging window error
        if (body.includes('Cannot message users who are not following')) {
          logger.warn({ status: response.status, body }, '24h messaging window — user not following');
        }
        throw new Error(`Instagram API error ${response.status}: ${body}`);
      }

      // Retry on 5xx and 429
      lastError = new Error(`Instagram API error ${response.status}: ${body}`);
      logger.warn(
        { status: response.status, attempt, body },
        'Retryable error from Instagram API',
      );
    } catch (error) {
      if (attempt === options.maxRetries) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
      // Don't retry non-retryable errors
      if (lastError.message.includes('Instagram API error 4')) {
        throw lastError;
      }
    }

    if (attempt < options.maxRetries) {
      const delay = options.baseDelayMs * Math.pow(2, attempt);
      logger.info({ delay, attempt }, 'Retrying after delay');
      await sleep(delay);
    }
  }

  throw lastError ?? new Error('withRetry exhausted all retries');
}
