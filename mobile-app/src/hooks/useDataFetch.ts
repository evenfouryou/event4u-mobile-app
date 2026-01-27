import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchManager } from '@/lib/fetchManager';

interface UseDataFetchOptions<T> {
  initialData?: T;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  staleTime?: number;
  cacheTime?: number;
  prefetchOnMount?: boolean;
}

interface UseDataFetchResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  isFetched: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  mutate: (newData: T | ((prev: T | undefined) => T)) => void;
}

export function useDataFetch<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  options: UseDataFetchOptions<T> = {}
): UseDataFetchResult<T> {
  const {
    initialData,
    enabled = true,
    refetchInterval,
    onSuccess,
    onError,
    staleTime = 60000,
    cacheTime = 600000,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isFetched, setIsFetched] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const mountedRef = useRef(true);
  const fetchCountRef = useRef(0);

  const fetchData = useCallback(async (isRefetch = false, force = false) => {
    const currentFetchCount = ++fetchCountRef.current;
    
    try {
      if (isRefetch) {
        setIsRefetching(true);
      } else if (!data) {
        setIsLoading(true);
      }
      setError(null);

      const result = await fetchFn();

      if (!mountedRef.current || currentFetchCount !== fetchCountRef.current) {
        return;
      }

      setData(result);
      setIsFetched(true);
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current || currentFetchCount !== fetchCountRef.current) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      if (mountedRef.current && currentFetchCount === fetchCountRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [fetchFn, onSuccess, onError, data]);

  const refetch = useCallback(async (force = false) => {
    await fetchData(true, force);
  }, [fetchData]);

  const mutate = useCallback((newData: T | ((prev: T | undefined) => T)) => {
    if (typeof newData === 'function') {
      setData((prev) => (newData as (prev: T | undefined) => T)(prev));
    } else {
      setData(newData);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      fetchData(false);
    }

    const unsubscribe = fetchManager.subscribe(cacheKey, (newData: T) => {
      if (mountedRef.current) {
        setData(newData);
        setIsFetched(true);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [enabled, cacheKey]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      if (mountedRef.current) {
        fetchData(true);
      }
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchData]);

  return {
    data,
    isLoading,
    isRefetching,
    isFetched,
    error,
    refetch,
    mutate,
  };
}

export function useInstantFetch<T>(
  url: string,
  options: {
    enabled?: boolean;
    initialData?: T;
    staleTime?: number;
    onSuccess?: (data: T) => void;
  } = {}
): UseDataFetchResult<T> {
  const { enabled = true, initialData, staleTime = 60000, onSuccess } = options;
  
  const fetchFn = useCallback(async () => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fetch failed');
    return response.json();
  }, [url]);

  return useDataFetch<T>(fetchFn, url, {
    enabled,
    initialData,
    staleTime,
    onSuccess,
  });
}

export function usePrefetch() {
  const prefetch = useCallback((url: string, options?: RequestInit) => {
    fetchManager.prefetch(url, options);
  }, []);

  const prefetchMultiple = useCallback((urls: string[]) => {
    fetchManager.prefetchMultiple(urls.map(url => ({ url })));
  }, []);

  return { prefetch, prefetchMultiple };
}

export function useMultipleDataFetch<T extends Record<string, () => Promise<any>>>(
  fetchers: T,
  options: { enabled?: boolean } = {}
): {
  data: { [K in keyof T]: Awaited<ReturnType<T[K]>> | undefined };
  isLoading: boolean;
  isRefetching: boolean;
  errors: { [K in keyof T]: Error | null };
  refetch: () => Promise<void>;
} {
  const { enabled = true } = options;
  
  const [data, setData] = useState<{ [K in keyof T]: any }>({} as any);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefetching, setIsRefetching] = useState(false);
  const [errors, setErrors] = useState<{ [K in keyof T]: Error | null }>({} as any);
  
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async (isRefetch = false) => {
    try {
      if (isRefetch) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }

      const keys = Object.keys(fetchers) as (keyof T)[];
      const results = await Promise.allSettled(
        keys.map(key => fetchers[key]())
      );

      if (!mountedRef.current) return;

      const newData: any = {};
      const newErrors: any = {};

      results.forEach((result, index) => {
        const key = keys[index];
        if (result.status === 'fulfilled') {
          newData[key] = result.value;
          newErrors[key] = null;
        } else {
          newData[key] = data[key];
          newErrors[key] = result.reason instanceof Error 
            ? result.reason 
            : new Error('Unknown error');
        }
      });

      setData(newData);
      setErrors(newErrors);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [fetchers, data]);

  const refetch = useCallback(async () => {
    await fetchAll(true);
  }, [fetchAll]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      fetchAll(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [enabled]);

  return {
    data,
    isLoading,
    isRefetching,
    errors,
    refetch,
  };
}

export default useDataFetch;
