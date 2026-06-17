import { useState, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number, error: Error) => void;
}

export const useRetry = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { handleError } = useErrorHandler();

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T | null> => {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 'exponential',
      onRetry
    } = options;

    setIsRetrying(true);
    setRetryCount(0);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        setIsRetrying(false);
        setRetryCount(0);
        return result;
      } catch (error) {
        setRetryCount(attempt);
        
        if (attempt === maxAttempts) {
          setIsRetrying(false);
          handleError(error, `operation failed after ${maxAttempts} attempts`);
          return null;
        }

        const currentDelay = backoff === 'exponential' 
          ? delay * Math.pow(2, attempt - 1)
          : delay * attempt;

        if (onRetry) {
          onRetry(attempt, error as Error);
        }

        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }

    setIsRetrying(false);
    return null;
  }, [handleError]);

  return {
    retry,
    isRetrying,
    retryCount,
  };
};

// Hook for retrying failed network requests
export const useNetworkRetry = () => {
  const { retry } = useRetry();

  const retryNetworkRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    options?: Omit<RetryOptions, 'onRetry'>
  ) => {
    return retry(requestFn, {
      ...options,
      onRetry: (attempt, error) => {
        console.warn(`Network request failed (attempt ${attempt}):`, error.message);
      }
    });
  }, [retry]);

  return { retryNetworkRequest };
};