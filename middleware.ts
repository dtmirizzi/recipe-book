import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth/edge-config';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(['/', '/sign-in', '/verify']);
const PUBLIC_PREFIXES = [
  '/api/auth',
  '/_next',
  '/icons',
  '/videos',
  '/uploads',
  '/manifest.json',
  '/service-worker.js',
  '/favicon.ico',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();
  if (!req.auth) {
    const url = new URL('/sign-in', req.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|webmanifest)$).*)'],
};
