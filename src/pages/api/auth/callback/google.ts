import type { APIRoute } from 'astro';
import { db, users, accounts } from '@/db';
import { encryptToken } from '@/lib/crypto';
import { eq, and } from 'drizzle-orm';
import { Auth } from '@auth/core';
import { authConfig } from '@/lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Google OAuth error:', error);
    return redirect('/login?error=oauth_denied');
  }

  if (!code) {
    // Fallback to Auth.js handler
    try {
      return await Auth(request, authConfig);
    } catch {
      return redirect('/login?error=no_code');
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || (url.protocol.replace(':', '')) || 'https';
  const siteUrl = `${proto}://${host}`.replace(/\/$/, '');
  const redirectUri = `${siteUrl}/api/auth/callback/google`;

  if (!clientId || !clientSecret || clientId.startsWith('dummy_')) {
    // In dev demo mode, set demo session cookie and redirect
    cookies.set('decayfix_demo_session', 'true', { path: '/', httpOnly: true });
    return redirect('/dashboard');
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('Failed to exchange Google auth code:', tokenData);
      const detail = tokenData?.error_description || tokenData?.error || 'token_exchange_failed';
      return redirect(`/login?error=${encodeURIComponent(detail)}`);
    }

    const { access_token, refresh_token, expires_in, id_token, token_type, scope } = tokenData;

    // 2. Fetch user profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = await userRes.json();

    if (!profile.id || !profile.email) {
      console.error('Failed to fetch Google profile:', profile);
      const detail = profile?.error?.message || 'profile_fetch_failed';
      return redirect(`/login?error=${encodeURIComponent(detail)}`);
    }

    // 3. Save or update user and tokens in Neon DB (safely caught)
    let userId = profile.id;
    if (db) {
      try {
        // Find or create user
        const existingUsers = await db.select().from(users).where(eq(users.email, profile.email)).limit(1);
        if (existingUsers.length > 0) {
          userId = existingUsers[0].id;
          await db
            .update(users)
            .set({
              name: profile.name || existingUsers[0].name,
              image: profile.picture || existingUsers[0].image,
            })
            .where(eq(users.id, userId));
        } else {
          const created = await db
            .insert(users)
            .values({
              name: profile.name,
              email: profile.email,
              image: profile.picture,
            })
            .returning();
          if (created && created[0]) {
            userId = created[0].id;
          }
        }

        // Upsert account with encrypted refresh token
        const existingAccount = await db
          .select()
          .from(accounts)
          .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, profile.id)))
          .limit(1);

        const encryptedRefresh = refresh_token ? encryptToken(refresh_token) : undefined;
        const expiresAt = expires_in ? Math.floor(Date.now() / 1000) + Number(expires_in) : undefined;

        if (existingAccount.length > 0) {
          await db
            .update(accounts)
            .set({
              userId,
              access_token,
              ...(encryptedRefresh ? { refresh_token: encryptedRefresh } : {}),
              expires_at: expiresAt,
              id_token,
              scope,
              token_type,
            })
            .where(and(eq(accounts.provider, 'google'), eq(accounts.providerAccountId, profile.id)));
        } else {
          await db.insert(accounts).values({
            userId,
            provider: 'google',
            providerAccountId: profile.id,
            type: 'oauth',
            access_token,
            refresh_token: encryptedRefresh,
            expires_at: expiresAt,
            id_token,
            scope,
            token_type,
          });
        }
      } catch (dbError) {
        console.error('Database sync warning during Google OAuth (proceeding with session):', dbError);
      }
    }

    // Set secure user cookie
    const sessionPayload = JSON.stringify({
      id: userId,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
      refreshToken: encryptedRefresh,
    });

    cookies.set('decayfix_session', Buffer.from(sessionPayload).toString('base64'), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return redirect('/dashboard');
  } catch (err: any) {
    console.error('Google OAuth callback handler error:', err);
    return redirect(`/login?error=${encodeURIComponent(err?.message || 'callback_error')}`);
  }
};
