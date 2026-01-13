// Web Worker for scanner search - runs in separate thread
// This keeps the main thread free for camera operations

interface SearchMessage {
  type: 'search';
  eventId: string;
  query: string;
  requestId: number;
}

interface SearchResponse {
  type: 'results' | 'error';
  requestId: number;
  data?: any[];
  error?: string;
}

let currentRequestId = 0;

self.onmessage = async (event: MessageEvent<SearchMessage>) => {
  const { type, eventId, query, requestId } = event.data;
  
  if (type !== 'search') return;
  
  // Cancel previous request by tracking requestId
  currentRequestId = requestId;
  
  try {
    const response = await fetch(
      `/api/e4u/scanner/search/${eventId}?q=${encodeURIComponent(query)}`
    );
    
    // Check if this request is still current
    if (requestId !== currentRequestId) return;
    
    const data = await response.json();
    
    // Check again after JSON parsing
    if (requestId !== currentRequestId) return;
    
    const result: SearchResponse = {
      type: 'results',
      requestId,
      data
    };
    
    self.postMessage(result);
  } catch (error: any) {
    if (requestId !== currentRequestId) return;
    
    const result: SearchResponse = {
      type: 'error',
      requestId,
      error: error.message || 'Search failed'
    };
    
    self.postMessage(result);
  }
};
