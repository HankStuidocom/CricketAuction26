/**
 * Safe API client for Cricket Auction 26.
 * Handles Render free-tier cold-starts (502 Bad Gateway), auto-retries,
 * and prevents HTML error snippets / Roobert font crash messages.
 */

export const PRODUCTION_BACKEND_URL = 'https://cricket-auction-backend-dtzw.onrender.com';

export const getBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '';
    }
    return PRODUCTION_BACKEND_URL;
  }
  return PRODUCTION_BACKEND_URL;
};

export const getSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return PRODUCTION_BACKEND_URL;
  }
  return PRODUCTION_BACKEND_URL;
};

export interface SafeFetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function safeFetch<T = any>(endpoint: string, options?: SafeFetchOptions): Promise<T> {
  const baseUrl = getBackendUrl();
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  // Default to 2 retries on 502/503/504 cold-starts
  const maxRetries = options?.retries !== undefined ? options.retries : 2;
  const initialDelay = options?.retryDelay || 2500;

  let lastError: Error | null = null;

  const token = typeof window !== 'undefined' ? localStorage.getItem('ca26_token') : null;
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(fullUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options?.headers
        }
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');

      if (isJson) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.message || `API Error (Status ${res.status})`);
        }
        return data as T;
      }

      // If not JSON, it could be HTML (e.g. 502 Bad Gateway while Render is waking up)
      const text = await res.text();

      const isColdStart = 
        res.status === 502 || 
        res.status === 503 || 
        res.status === 504 ||
        text.includes('Roobert') || 
        text.includes('Bad Gateway') ||
        text.includes('Render') ||
        text.includes('Gateway Time-out');

      if (isColdStart) {
        if (attempt < maxRetries) {
          // Wait and retry as Render finishes waking up
          await sleep(initialDelay * (attempt + 1));
          continue;
        }
        throw new Error(
          'Backend server is waking up from sleep mode (Render free-tier cold start). Please wait ~10 seconds and click Deploy again.'
        );
      }

      if (!res.ok) {
        const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
        throw new Error(`Server Error (${res.status}): ${cleanSnippet || 'Service temporarily unavailable'}`);
      }

      throw new Error(`Expected JSON response from ${endpoint}, but server returned HTML. Verify backend URL configuration.`);
    } catch (err: any) {
      lastError = err;

      // Check if it's a transient network abort/failure during cold start
      const isNetworkColdStart = 
        err.message?.includes('Failed to fetch') || 
        err.message?.includes('Network Error');

      if (isNetworkColdStart && attempt < maxRetries) {
        await sleep(initialDelay * (attempt + 1));
        continue;
      }

      // If it's already our friendly cold-start message or last attempt, stop and rethrow
      if (attempt === maxRetries || err.message?.includes('waking up')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Network Error: Unable to reach server.');
}

let isWarmingUp = false;
/**
 * Proactively wakes up the Render backend in the background so it is ready
 * before the user triggers room creation or joins.
 */
export async function warmupServer(): Promise<boolean> {
  if (isWarmingUp) return false;
  isWarmingUp = true;
  try {
    const baseUrl = getBackendUrl();
    const url = `${baseUrl}/api/health`;
    const res = await fetch(url, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  } finally {
    isWarmingUp = false;
  }
}

