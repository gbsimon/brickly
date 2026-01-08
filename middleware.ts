import createMiddleware from 'next-intl/middleware';
import { auth } from '@/auth';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Allow access to auth pages and public assets
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    return intlMiddleware(req);
  }

  // Protect all other routes (library and set detail routes)
  const protectedPaths = ['/', '/sets'];
  
  // Remove locale prefix for path checking
  const pathWithoutLocale = pathname.replace(/^\/(en|fr)/, '') || '/';
  
  const isProtectedPath = protectedPaths.some(path => 
    pathWithoutLocale === path || pathWithoutLocale.startsWith(`${path}/`)
  );

  if (isProtectedPath && !isLoggedIn) {
    // Extract locale from pathname or use default
    const localeMatch = pathname.match(/^\/(en|fr)/);
    const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
    
    // Redirect to sign in if trying to access protected route
    const signInUrl = new URL(`/${locale}/auth/signin`, req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js|brick.svg).*)'],
};

