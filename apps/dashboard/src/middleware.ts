import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Routes that do not require authentication.
 */
const PUBLIC_PATHS = [
  '/login',
  '/privacy',
  '/terms',
  '/refund',
  '/cookies',
  '/data-deletion',
  '/icon.svg',
  '/favicon.ico',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow static Next.js assets, internal routes, and rewritten API calls
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/v1') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Check if current path is a public route
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // 3. Read session token from cookie
  const sessionToken = request.cookies.get('chainkit_session_token')?.value;

  // 4. If logged in and visiting /login, redirect to console home
  if (sessionToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 5. If unauthenticated and trying to access a protected route, redirect to /login
  if (!sessionToken && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    // Optionally preserve destination
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
