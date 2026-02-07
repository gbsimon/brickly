import createMiddleware from 'next-intl/middleware';
import { auth } from '@/auth';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

// Cookie names from the old custom config that need to be cleared
const STALE_COOKIE_PREFIXES = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
];

/**
 * Clear stale cookies from previous auth configurations.
 * Old custom cookie names (next-auth.*) conflict with NextAuth v5 defaults (authjs.*),
 * causing duplicate cookies that can overflow Railway's HTTP header limit.
 */
function addCookieCleanup(response: NextResponse, req: NextRequest): NextResponse {
  const cookieNames = Array.from(req.cookies.getAll().map(c => c.name));
  const staleCookies = cookieNames.filter(name =>
    STALE_COOKIE_PREFIXES.some(prefix => name === prefix || name.startsWith(`${prefix}.`))
  );

  for (const name of staleCookies) {
    response.cookies.set(name, '', {
      maxAge: 0,
      path: '/',
    });
  }

  return response;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Remove locale prefix for path checking (must happen before auth route check)
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)/, '') || '/';

  // Allow access to auth pages and public assets (handles both /auth/ and /en/auth/)
  if (pathWithoutLocale.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    return addCookieCleanup(intlMiddleware(req), req);
  }

  // Protect all other routes (library and set detail routes)
  const isProtectedPath =
    pathWithoutLocale === '/' ||
    pathWithoutLocale === '/sets' ||
    pathWithoutLocale.startsWith('/sets/');

  if (isProtectedPath) {
    let isLoggedIn = false;
    try {
      const session = await auth(req);
      isLoggedIn = !!session?.user;
    } catch (error) {
      console.error('[MIDDLEWARE] auth() failed', error);
    }

    if (!isLoggedIn) {
    // Extract locale from pathname or use default
    const localeMatch = pathname.match(/^\/(en|fr)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

    // Redirect to sign in if trying to access protected route
    const signInUrl = new URL(`/${locale}/auth/signin`, req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return addCookieCleanup(NextResponse.redirect(signInUrl), req);
    }
  }

  return addCookieCleanup(intlMiddleware(req), req);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|brick.svg).*)'],
};
