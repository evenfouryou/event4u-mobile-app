import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSearchWorkerOptions {
  eventId: string | undefined;
  enabled?: boolean;
}

interface UseSearchWorkerReturn {
  search: (query: string) => void;
  results: any[];
  isSearching: boolean;
  clearResults: () => void;
}

export function useScannerSearchWorker({ 
  eventId, 
  enabled = true 
}: UseSearchWorkerOptions): UseSearchWorkerReturn {
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize worker
  useEffect(() => {
    if (!enabled) return;

    // Create worker using Vite's worker syntax
    const worker = new Worker(
      new URL('../workers/scanner-search.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const { type, requestId, data, error } = event.data;
      
      // Ignore stale responses
      if (requestId !== requestIdRef.current) return;

      if (type === 'results') {
        setResults(data || []);
      } else if (type === 'error') {
        console.error('[SearchWorker] Error:', error);
        setResults([]);
      }
      
      setIsSearching(false);
    };

    worker.onerror = (error) => {
      console.error('[SearchWorker] Worker error:', error);
      setIsSearching(false);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [enabled]);

  const search = useCallback((query: string) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if too short or is a QR code
    if (query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    if (query.startsWith('E4U-')) {
      setIsSearching(false);
      return;
    }

    if (!workerRef.current || !eventId) {
      return;
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      requestIdRef.current += 1;
      setIsSearching(true);

      workerRef.current?.postMessage({
        type: 'search',
        eventId,
        query: query.trim(),
        requestId: requestIdRef.current
      });
    }, 300);
  }, [eventId]);

  const clearResults = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    requestIdRef.current += 1; // Invalidate any pending responses
    setResults([]);
    setIsSearching(false);
  }, []);

  return { search, results, isSearching, clearResults };
}
