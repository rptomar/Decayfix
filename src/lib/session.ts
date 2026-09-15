import type { Session } from '@auth/core';

export interface UserSession {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}

/**
 * Retrieves the current user session from Astro request cookies
 */
export async function getSession(req: Request): Promise<Session | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';

    // 1. Check direct decayfix_session cookie
    const match = cookieHeader.match(/decayfix_session=([^;]+)/);
    if (match && match[1]) {
      const decoded = Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf-8');
      const user = JSON.parse(decoded);
      if (user && user.id) {
        return {
          user: {
            id: user.id,
            name: user.name || 'Blogger',
            email: user.email || 'blogger@example.com',
            image: user.image || null,
            accessToken: user.accessToken || null,
            refreshToken: user.refreshToken || null,
          } as any,
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        } as Session;
      }
    }

    // 2. Check demo session cookie
    if (cookieHeader.includes('decayfix_demo_session=true')) {
      return {
        user: {
          id: 'demo-user-101',
          name: 'Demo Blogger',
          email: 'demo@sprintlabs.ai',
          image: null,
        },
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      } as Session;
    }

    return null;
  } catch (err) {
    return null;
  }
}
