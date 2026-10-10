/**
 * Safe API client for Cricket Auction 26.
 * Prevents "Unexpected token '<'" JSON parsing errors when receiving HTML responses.
 */

export const getBackendUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return '';
};

export const getSocketUrl = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return window.location.origin;
  }
  return 'http://localhost:3001';
};

export async function safeFetch<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getBackendUrl();
  const fullUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
  } catch (err: any) {
    throw new Error(`Network Error: Unable to reach server (${err.message || 'Server down'}).`);
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (isJson) {
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || `API Error (Status ${res.status})`);
    }
    return data as T;
  } else {
    // Response is HTML or text instead of JSON (e.g. 404 page, Vercel SPA index.html, Render cold start error)
    const text = await res.text();
    if (!res.ok) {
      const cleanSnippet = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      throw new Error(`Server returned HTML error (${res.status}): ${cleanSnippet || 'Endpoint unavailable'}`);
    }
    throw new Error(`Expected JSON response from ${endpoint}, but server returned HTML. Verify backend URL configuration.`);
  }
}
