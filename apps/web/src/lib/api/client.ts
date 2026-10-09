import { redirect } from 'next/navigation';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export async function apiFetch<T>(
  path: string,
  cookieHeader?: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  // A forwarded staff session the API rejects can't be refreshed from the server (the refresh
  // cookie is scoped to the API's refresh path), so send the user to sign in again instead of
  // crashing the page. Expired tokens are refreshed earlier by the middleware.
  if (res.status === 401 && cookieHeader) {
    redirect('/login');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Request failed');
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges the refresh cookie for a new access token from the browser.
 * Concurrent callers share one request. Resolves false when the session can't be renewed.
 */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string>),
      },
    });

  let res = await send();
  // The access token expired while the page was open: renew it once and retry.
  if (res.status === 401 && !path.startsWith('/auth/') && (await refreshSession())) {
    res = await send();
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Request failed');
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}

/** Multipart upload from the browser; the browser sets the multipart boundary header. */
export async function clientUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? 'Upload failed');
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}
