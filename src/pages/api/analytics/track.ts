import type { APIRoute } from 'astro';
import { trackEvent } from '@/lib/analytics';
import { getSession } from '@/lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const body = await request.json().catch(() => ({}));
    const { eventType, metadata, path } = body;

    if (!eventType) {
      return new Response(JSON.stringify({ error: 'eventType is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    await trackEvent({
      eventType,
      userId: session?.user?.id || body.userId,
      userEmail: session?.user?.email || body.userEmail,
      path: path || '/dashboard',
      ip,
      userAgent,
      metadata,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Track failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
