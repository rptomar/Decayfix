import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  cookies.delete('decayfix_session', { path: '/' });
  cookies.delete('decayfix_demo_session', { path: '/' });
  cookies.delete('authjs.session-token', { path: '/' });
  cookies.delete('__Secure-authjs.session-token', { path: '/' });
  return redirect('/login');
};

export const GET: APIRoute = async ({ cookies, redirect }) => {
  return POST({ cookies, redirect } as any);
};
