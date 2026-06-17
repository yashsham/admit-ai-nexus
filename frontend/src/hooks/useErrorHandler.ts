import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface ErrorWithMessage {
  message: string;
  code?: string;
  statusCode?: number;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, context?: string) => {
    console.error(context ? `Error in ${context}:` : 'Error:', error);

    let message = 'An unexpected error occurred';
    
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      message = (error as ErrorWithMessage).message;
    }

    // Show user-friendly error message
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });

    // In production, you might want to log this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { tags: { context } });
    }
  }, [toast]);

  const handleAsyncError = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error, context);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
  };
};

// Custom hook for form error handling
export const useFormErrorHandler = () => {
  const { handleError } = useErrorHandler();

  const handleFormError = useCallback((error: unknown, fieldName?: string) => {
    const context = fieldName ? `form field: ${fieldName}` : 'form submission';
    handleError(error, context);
  }, [handleError]);

  return { handleFormError };
};

// Custom hook for API error handling
export const useApiErrorHandler = () => {
  const { handleError } = useErrorHandler();

  const handleApiError = useCallback((error: unknown, endpoint?: string) => {
    const context = endpoint ? `API call to ${endpoint}` : 'API call';
    
    // Handle specific API error formats
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response: { data?: { message?: string } } };
      const message = apiError.response?.data?.message || 'API request failed';
      handleError(new Error(message), context);
    } else {
      handleError(error, context);
    }
  }, [handleError]);

  return { handleApiError };
};