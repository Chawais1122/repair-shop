import { NextResponse, type NextRequest } from 'next/server';

/** Renew a little early so the token doesn't expire mid-render. */
const EXPIRY_SKEW_SECONDS = 30;

/** Reads the `exp` claim without verifying the signature — the API does the real verification. */
function tokenExpiresAt(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp: unknown = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
}

/**
 * The 15-minute access token is dropped by the browser when it expires, and the refresh
 * cookie is only sent to the API's refresh endpoint, so the Next server can't renew it.
 * Bounce through /refresh, which renews it from the browser and comes straight back.
 */
export function middleware(request: NextRequest): NextResponse {
  const token = request.cookies.get('accessToken')?.value;
  const exp = token ? tokenExpiresAt(token) : null;

  if (exp !== null && exp - EXPIRY_SKEW_SECONDS > Date.now() / 1000) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/refresh';
  url.search = new URLSearchParams({
    next: `${request.nextUrl.pathname}${request.nextUrl.search}`,
  }).toString();
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tickets/:path*',
    '/customers/:path*',
    '/inventory/:path*',
    '/invoices/:path*',
    '/pos/:path*',
    '/reports/:path*',
    '/schedule/:path*',
    '/team/:path*',
    '/chat/:path*',
  ],
};
