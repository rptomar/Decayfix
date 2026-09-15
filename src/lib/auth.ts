import type { AuthConfig } from '@auth/core';
import Google from '@auth/core/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db, users, accounts, sessions, verificationTokens } from '@/db';
import { GOOGLE_OAUTH_SCOPES } from './constants';
import { encryptToken, decryptToken } from './crypto';
import { eq, and } from 'drizzle-orm';

export const authConfig: AuthConfig = {
  basePath: '/api/auth',
  adapter: db ? (DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as any) : undefined,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: GOOGLE_OAUTH_SCOPES,
          access_type: 'offline',
          prompt: 'consent',
          response_type: 'code',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }
      }
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = (user?.id || (token?.userId as string) || (token?.sub as string));
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
};

/**
 * Retrieves the Google Refresh Token for a given user from session cookie or the accounts table.
 */
export async function getUserGoogleRefreshToken(userId: string, req?: Request): Promise<string | null> {
  // 1. Check request session cookie if available
  if (req) {
    try {
      const { getSession } = await import('./session');
      const session = await getSession(req);
      const encryptedSessionToken = (session?.user as any)?.refreshToken;
      if (encryptedSessionToken) {
        const decrypted = decryptToken(encryptedSessionToken);
        if (decrypted) return decrypted;
      }
    } catch (e) {
      console.warn('Could not read refresh token from request session:', e);
    }
  }

  // 2. Check accounts table in database
  if (db) {
    try {
      const result = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')))
        .limit(1);

      if (result && result.length > 0 && result[0].refresh_token) {
        return decryptToken(result[0].refresh_token);
      }
    } catch (error) {
      console.error('Error fetching Google refresh token from DB:', error);
    }
  }

  return null;
}

/**
 * Updates or stores the encrypted refresh token for a user account
 */
export async function saveUserGoogleTokens(
  userId: string,
  accessToken?: string,
  refreshToken?: string
): Promise<void> {
  if (!db) return;
  try {
    const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : undefined;
    await db
      .update(accounts)
      .set({
        access_token: accessToken,
        ...(encryptedRefresh ? { refresh_token: encryptedRefresh } : {}),
      })
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, 'google')));
  } catch (error) {
    console.error('Error saving Google tokens:', error);
  }
}
