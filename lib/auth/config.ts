import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db/client';
import { users, accounts, sessions, verificationTokens } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { env, flags } from '@/lib/env';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: '/sign-in',
    verifyRequest: '/verify',
    error: '/sign-in',
  },
  providers: [
    // Magic-link via Resend; only active when RESEND_API_KEY is set.
    // IMPORTANT: pass `apiKey` explicitly. Auth.js's Resend provider
    // looks for `AUTH_RESEND_KEY` by default — our env var is named
    // `RESEND_API_KEY`, so we must wire it through.
    ...(flags.hasResendKey
      ? [
          Resend({
            apiKey: env.RESEND_API_KEY,
            from: env.EMAIL_FROM ?? 'Recipe Box <hello@example.com>',
          }),
        ]
      : []),
    // Dev credentials provider — local-only, lets you sign in with any email.
    // Refuses to load in production.
    ...(flags.isDev
      ? [
          Credentials({
            id: 'dev',
            name: 'Dev sign-in',
            credentials: {
              email: { label: 'Email', type: 'email' },
            },
            async authorize(creds) {
              const email = String(creds?.email ?? '').toLowerCase().trim();
              if (!email || !email.includes('@')) return null;

              // Find or create the user — local convenience.
              const existing = await db.query.users.findFirst({
                where: eq(users.email, email),
              });
              if (existing) return existing;

              const [created] = await db
                .insert(users)
                .values({ email, name: email.split('@')[0] })
                .returning();
              return created;
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export type AppSession = Awaited<ReturnType<typeof auth>>;
