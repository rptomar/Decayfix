import type { APIRoute } from 'astro';
import { getAdminSession } from '@/lib/adminAuth';
import { getAdminAnalyticsOverview } from '@/lib/analytics';

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
  const timeRange = (url.searchParams.get('timeRange') as any) || 'all';

  try {
    const data = await getAdminAnalyticsOverview(timeRange);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Admin stats error:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch admin stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
