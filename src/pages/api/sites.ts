import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { getUserGoogleTokens, getUserGoogleRefreshToken } from '@/lib/auth';
import { fetchUserGscSites } from '@/lib/gsc';
import { db, sites } from '@/db';
import { eq } from 'drizzle-orm';
import { trackApiHit } from '@/lib/analytics';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;

  try {
    // 1. Get existing saved sites in database
    let savedSites: Array<{ id: string; siteUrl: string; lastSyncedAt: Date | null }> = [];
    if (db) {
      try {
        savedSites = await db
          .select({
            id: sites.id,
            siteUrl: sites.siteUrl,
            lastSyncedAt: sites.lastSyncedAt,
          })
          .from(sites)
          .where(eq(sites.userId, userId));
      } catch (dbErr) {
        console.warn('Could not read sites from DB:', dbErr);
      }
    }

    // 2. Fetch fresh sites from Google Search Console API using tokens
    const { accessToken, refreshToken } = await getUserGoogleTokens(userId, request);
    let gscSites: Array<{ siteUrl: string; permissionLevel: string }> = [];

    if (refreshToken || accessToken) {
      try {
        gscSites = await fetchUserGscSites(refreshToken, accessToken);
      } catch (err: any) {
        console.warn('Could not fetch remote GSC sites:', err.message);
      }
    }

    // 3. Upsert newly discovered GSC sites into database
    if (db && gscSites.length > 0) {
      try {
        for (const gscSite of gscSites) {
          const exists = savedSites.some((s) => s.siteUrl === gscSite.siteUrl);
          if (!exists) {
            const inserted = await db
              .insert(sites)
              .values({
                userId,
                siteUrl: gscSite.siteUrl,
                permissionLevel: gscSite.permissionLevel,
              })
              .returning();
            if (inserted && inserted[0]) {
              savedSites.push({
                id: inserted[0].id,
                siteUrl: inserted[0].siteUrl,
                lastSyncedAt: inserted[0].lastSyncedAt,
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn('Could not save GSC sites to DB:', dbErr);
      }
    }

    await trackApiHit('/api/sites', {
      status: 200,
      durationMs: Date.now() - startTime,
      userId,
      userEmail: session.user.email,
      extra: { count: savedSites.length },
    });

    return new Response(
      JSON.stringify({
        sites: savedSites,
        hasGoogleAuth: Boolean(refreshToken),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    await trackApiHit('/api/sites', {
      status: 500,
      durationMs: Date.now() - startTime,
      userId,
      userEmail: session?.user?.email,
      extra: { error: error?.message },
    });

    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to fetch sites' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
