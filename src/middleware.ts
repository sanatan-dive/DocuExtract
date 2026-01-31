import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Paths that are always accessible (public)
  const isPublicPath = 
    pathname === '/login' || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/_next') || 
    pathname.includes('favicon.ico');

  // If user is accessing a protected path without a token
  if (!isPublicPath && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is accessing public path (login) with a token, redirect to dashboard
  if (pathname === '/login' && token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
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
