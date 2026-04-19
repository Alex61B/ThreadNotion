/**
 * Base URL for the Express API, used from Next.js Route Handlers (server-side only).
 *
 * Precedence:
 * 1. BACKEND_HTTP_ORIGIN — preferred in production (not exposed to the browser)
 * 2. INTERNAL_API_URL — alternate name some hosts use
 * 3. NEXT_PUBLIC_API_URL — backward compatible with existing env
 * 4. http://127.0.0.1:3001 — local split-stack (Express default port)
 */

export type BackendHttpOriginSource =
  | 'BACKEND_HTTP_ORIGIN'
  | 'INTERNAL_API_URL'
  | 'NEXT_PUBLIC_API_URL'
  | 'default_local';

export type ResolvedBackendHttpOrigin = {
  /** Trimmed origin with no trailing slash */
  origin: string;
  /** Which env key supplied the value (or built-in default) */
  source: BackendHttpOriginSource;
};

function trimTrailingSlashes(raw: string): string {
  return raw.replace(/\/+$/, '');
}

/**
 * Resolves Express base URL and records which variable won (for ops / Render logs).
 */
export function resolveBackendHttpOrigin(): ResolvedBackendHttpOrigin {
  if (process.env.BACKEND_HTTP_ORIGIN) {
    return {
      origin: trimTrailingSlashes(process.env.BACKEND_HTTP_ORIGIN),
      source: 'BACKEND_HTTP_ORIGIN',
    };
  }
  if (process.env.INTERNAL_API_URL) {
    return {
      origin: trimTrailingSlashes(process.env.INTERNAL_API_URL),
      source: 'INTERNAL_API_URL',
    };
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return {
      origin: trimTrailingSlashes(process.env.NEXT_PUBLIC_API_URL),
      source: 'NEXT_PUBLIC_API_URL',
    };
  }
  return { origin: 'http://127.0.0.1:3001', source: 'default_local' };
}

export function backendHttpOrigin(): string {
  return resolveBackendHttpOrigin().origin;
}
