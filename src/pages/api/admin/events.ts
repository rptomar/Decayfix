import type { APIRoute } from 'astro';
import { getAdminSession } from '@/lib/adminAuth';
import { db, analyticsEvents } from '@/db';
import { desc, eq, like, or } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const admin = await getAdminSession(request);
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Admin login required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const eventType = url.searchParams.get('type');
  const search = url.searchParams.get('search')?.toLowerCase();
  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 1000);

  try {
    let events: any[] = [];
    if (db) {
      if (eventType && eventType !== 'all') {
        events = await db
          .select()
          .from(analyticsEvents)
          .where(eq(analyticsEvents.eventType, eventType))
          .orderBy(desc(analyticsEvents.createdAt))
          .limit(limit);
      } else {
        events = await db
          .select()
          .from(analyticsEvents)
          .orderBy(desc(analyticsEvents.createdAt))
          .limit(limit);
      }
    }

    if (search && events.length > 0) {
      events = events.filter((e) => {
        const str = `${e.eventType} ${e.userEmail || ''} ${e.path || ''} ${e.metadata || ''}`.toLowerCase();
        return str.includes(search);
      });
    }

    return new Response(JSON.stringify({ events, total: events.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
