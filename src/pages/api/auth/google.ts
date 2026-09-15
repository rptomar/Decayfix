import type { APIRoute } from 'astro';
import { GOOGLE_OAUTH_SCOPES } from '@/lib/constants';

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  const proto = request.headers.get('x-forwarded-proto') || (new URL(request.url).protocol.replace(':', '')) || 'https';
  const siteUrl = `${proto}://${host}`.replace(/\/$/, '');
  const redirectUri = `${siteUrl}/api/auth/callback/google`;

  // If no Google Client ID configured or using placeholder, start instantaneous Demo session
  if (!clientId || clientId.startsWith('dummy_') || clientId.trim() === '') {
    const demoUser = {
      id: 'demo-user-101',
      name: 'Demo Blogger',
      email: 'demo@sprintlabs.ai',
      image: null,
    };

    const sessionPayload = Buffer.from(JSON.stringify(demoUser)).toString('base64');
    cookies.set('decayfix_session', sessionPayload, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return redirect('/dashboard');
  }

  // Real Google OAuth 2.0 Flow
  const state = Math.random().toString(36).substring(2);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return redirect(authUrl);
};

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  return GET({ request, redirect, cookies } as any);
};
