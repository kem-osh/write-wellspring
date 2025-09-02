import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

interface AsyncOperation<T> {
  execute: () => Promise<T>;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  retryConfig?: Partial<RetryConfig>;
}

export function useErrorBoundary() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  const defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const executeWithRetry = useCallback(async <T>({
    execute,
    onSuccess,
    onError,
    retryConfig = {}
  }: AsyncOperation<T>): Promise<T | null> => {
    const config = { ...defaultRetryConfig, ...retryConfig };
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await execute();
        onSuccess?.(result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on the last attempt
        if (attempt === config.maxAttempts) break;
        
        // Check if we should retry this error
        if (!shouldRetry(lastError)) break;
        
        // Wait with exponential backoff
        const delay = config.backoffMs * Math.pow(config.backoffMultiplier, attempt - 1);
        await sleep(delay);
        
        toast({
          title: `Retry ${attempt}/${config.maxAttempts}`,
          description: `Retrying in ${delay}ms due to: ${lastError.message}`,
          duration: 2000,
        });
      }
    }
    
    // All attempts failed
    onError?.(lastError!);
    
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Changes will sync when connection is restored",
        variant: "destructive",
        duration: 5000,
      });
    } else {
      toast({
        title: "Operation failed",
        description: lastError?.message || "Unknown error occurred",
        variant: "destructive",
        duration: 5000,
      });
    }
    
    return null;
  }, [toast, isOnline]);

  const shouldRetry = (error: Error): boolean => {
    // Don't retry authentication errors
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return false;
    }
    
    // Don't retry validation errors
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return false;
    }
    
    // Retry network errors, timeouts, and server errors
    return true;
  };

  // Monitor online status
  useState(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection restored",
        description: "You're back online",
        duration: 3000,
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Connection lost",
        description: "You're now offline",
        variant: "destructive",
        duration: 5000,
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  return {
    executeWithRetry,
    isOnline,
    createOptimisticUpdate: <T>(
      optimisticUpdate: () => void,
      revertUpdate: () => void,
      operation: AsyncOperation<T>
    ) => {
      return async () => {
        // Apply optimistic update immediately
        optimisticUpdate();
        
        // Execute the actual operation
        const result = await executeWithRetry(operation);
        
        // Revert if operation failed
        if (result === null) {
          revertUpdate();
        }
        
        return result;
      };
    }
  };
}