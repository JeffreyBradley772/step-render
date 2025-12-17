// Client-side URL (browser -> host -> backend)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

/**
 * Helper to build the api urls,
 * Uses internal Docker URL for server-side fetches, public URL for client-side
 */
export function getApiUrl(path: string): string {
  const isServer = typeof window === 'undefined';
  // Read env at runtime for server, not build time
  const baseUrl = isServer 
    ? (process.env.API_BASE_URL_INTERNAL || API_BASE_URL)
    : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
}
