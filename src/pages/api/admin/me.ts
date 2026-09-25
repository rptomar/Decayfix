import type { APIRoute } from 'astro';
import { getAdminSession } from '@/lib/adminAuth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const admin = await getAdminSession(request);
  if (!admin) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      admin,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
