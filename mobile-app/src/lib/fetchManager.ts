interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  staleAt: number;
}

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheTTL?: number;
  staleTTL?: number;
  forceRefresh?: boolean;
  backgroundRefresh?: boolean;
}

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_CACHE_TTL = 10 * 60 * 1000;
const DEFAULT_STALE_TTL = 60 * 1000;

type RefreshCallback = (data: any) => void;

class FetchManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private refreshCallbacks: Map<string, Set<RefreshCallback>> = new Map();
  private prefetchQueue: Set<string> = new Set();

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getFromCache<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    
    if (now > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return {
      data: entry.data,
      isStale: now > entry.staleAt,
    };
  }

  private setCache<T>(key: string, data: T, ttl: number, staleTTL: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      staleAt: now + staleTTL,
      expiresAt: now + ttl,
    };
    this.memoryCache.set(key, entry);

    if (this.memoryCache.size > 150) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, 30);
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  clearCache(keyPattern?: string): void {
    if (keyPattern) {
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((_, key) => {
        if (key.includes(keyPattern)) keysToDelete.push(key);
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    } else {
      this.memoryCache.clear();
    }
  }

  subscribe(cacheKey: string, callback: RefreshCallback): () => void {
    if (!this.refreshCallbacks.has(cacheKey)) {
      this.refreshCallbacks.set(cacheKey, new Set());
    }
    this.refreshCallbacks.get(cacheKey)!.add(callback);
    
    return () => {
      this.refreshCallbacks.get(cacheKey)?.delete(callback);
    };
  }

  private notifySubscribers(cacheKey: string, data: any): void {
    const callbacks = this.refreshCallbacks.get(cacheKey);
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.warn('[FetchManager] Callback error:', e);
        }
      });
    }
  }

  async fetch<T>(
    url: string,
    requestOptions: RequestInit = {},
    options: FetchOptions = {}
  ): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
      cacheKey,
      cacheTTL = DEFAULT_CACHE_TTL,
      staleTTL = DEFAULT_STALE_TTL,
      forceRefresh = false,
      backgroundRefresh = true,
    } = options;

    const method = requestOptions.method || 'GET';
    const effectiveCacheKey = cacheKey || `${method}_${url}`;

    if (!forceRefresh && method === 'GET') {
      const cached = this.getFromCache<T>(effectiveCacheKey);
      if (cached) {
        if (cached.isStale && backgroundRefresh) {
          this.refreshInBackground(url, requestOptions, {
            ...options,
            cacheKey: effectiveCacheKey,
          });
        }
        return cached.data;
      }
    }

    const existingRequest = this.pendingRequests.get(effectiveCacheKey);
    if (existingRequest && method === 'GET') {
      return existingRequest;
    }

    const executeRequest = async (): Promise<T> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const response = await this.fetchWithTimeout(url, requestOptions, timeout);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
            throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
          }

          if (response.status === 204) {
            return {} as T;
          }

          const data = await response.json();

          if (method === 'GET') {
            this.setCache(effectiveCacheKey, data, cacheTTL, staleTTL);
            this.notifySubscribers(effectiveCacheKey, data);
          }

          return data;
        } catch (error: any) {
          lastError = error;

          const isNetworkError = error.name === 'AbortError' || 
            error.message?.includes('Network') ||
            error.message?.includes('timeout') ||
            error.message?.includes('Failed to fetch');

          if (isNetworkError && attempt < retries) {
            const backoffDelay = retryDelay * Math.pow(2, attempt);
            await this.delay(backoffDelay);
            continue;
          }

          throw error;
        }
      }

      throw lastError || new Error('Request failed after retries');
    };

    const requestPromise = executeRequest().finally(() => {
      this.pendingRequests.delete(effectiveCacheKey);
    });

    if (method === 'GET') {
      this.pendingRequests.set(effectiveCacheKey, requestPromise);
    }

    return requestPromise;
  }

  private async refreshInBackground(
    url: string,
    requestOptions: RequestInit,
    options: FetchOptions
  ): Promise<void> {
    const cacheKey = options.cacheKey!;
    
    if (this.pendingRequests.has(cacheKey)) {
      return;
    }

    try {
      await this.fetch(url, requestOptions, {
        ...options,
        forceRefresh: true,
        backgroundRefresh: false,
      });
    } catch (e) {
      console.log('[FetchManager] Background refresh failed silently');
    }
  }

  prefetch(url: string, requestOptions: RequestInit = {}, options: FetchOptions = {}): void {
    const cacheKey = options.cacheKey || `${requestOptions.method || 'GET'}_${url}`;
    
    if (this.prefetchQueue.has(cacheKey)) return;
    if (this.memoryCache.has(cacheKey)) return;
    
    this.prefetchQueue.add(cacheKey);
    
    this.fetch(url, requestOptions, { ...options, cacheKey })
      .catch(() => {})
      .finally(() => {
        this.prefetchQueue.delete(cacheKey);
      });
  }

  prefetchMultiple(requests: Array<{ url: string; options?: RequestInit; fetchOptions?: FetchOptions }>): void {
    requests.forEach(({ url, options, fetchOptions }) => {
      this.prefetch(url, options, fetchOptions);
    });
  }

  warmCache(data: Record<string, any>, ttl = DEFAULT_CACHE_TTL, staleTTL = DEFAULT_STALE_TTL): void {
    Object.entries(data).forEach(([key, value]) => {
      this.setCache(key, value, ttl, staleTTL);
    });
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    };
  }
}

export const fetchManager = new FetchManager();
export default fetchManager;
