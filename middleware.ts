import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

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

  let isLoggedIn = false;
  if (isProtectedPath) {
    try {
      const secret = process.env.NEXTAUTH_SECRET;
      const token =
        (await getToken({ req, secret, cookieName: '__Secure-authjs.session-token' })) ??
        (await getToken({ req, secret, cookieName: 'authjs.session-token' }));
      isLoggedIn = !!token;
    } catch (error) {
      console.error('[MIDDLEWARE] getToken() failed', error);
    }

    if (!isLoggedIn) {
    // Extract locale from pathname or use default
    const localeMatch = pathname.match(/^\/(en|fr)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;

    // Redirect to sign in if trying to access protected route
    const signInUrl = new URL(`/${locale}/auth/signin`, req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    const redirectResponse = NextResponse.redirect(signInUrl);
    redirectResponse.headers.set('x-brickly-auth', '0');
    redirectResponse.headers.set('x-brickly-path', pathname);
    redirectResponse.headers.set(
      'x-brickly-cookie',
      req.cookies.has('__Secure-authjs.session-token') || req.cookies.has('authjs.session-token')
        ? '1'
        : '0'
    );
    return addCookieCleanup(redirectResponse, req);
    }
  }

  const response = intlMiddleware(req);
  response.headers.set('x-brickly-auth', isLoggedIn ? '1' : '0');
  response.headers.set('x-brickly-path', pathname);
  response.headers.set(
    'x-brickly-cookie',
    req.cookies.has('__Secure-authjs.session-token') || req.cookies.has('authjs.session-token')
      ? '1'
      : '0'
  );
  return addCookieCleanup(response, req);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|brick.svg).*)'],
};
