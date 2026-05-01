import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe NextAuth config: no DB adapter, no providers that touch the DB.
 * The middleware only needs to *verify* the JWT cookie — not authenticate.
 * The full config (with adapter and providers) lives in `./config.ts` and is
 * used by API routes and server components which run on the Node runtime.
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/sign-in', verifyRequest: '/verify', error: '/sign-in' },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
