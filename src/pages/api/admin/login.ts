import type { APIRoute } from 'astro';
import { verifyAdminCredentials, createAdminToken } from '@/lib/adminAuth';
import { trackEvent } from '@/lib/analytics';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { identifier, password } = body;

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ error: 'Please enter both Email/Username and Password' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authResult = await verifyAdminCredentials(identifier, password);
    if (!authResult.success || !authResult.admin) {
      return new Response(
        JSON.stringify({ error: authResult.error || 'Invalid admin credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = createAdminToken(authResult.admin);

    // Set secure admin session cookie (7 days duration)
    cookies.set('decayfix_admin_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
    });

    // Track admin login
    await trackEvent({
      eventType: 'api_hit',
      userEmail: authResult.admin.email,
      path: '/admin/login',
      metadata: { action: 'admin_login_success', adminId: authResult.admin.id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        admin: authResult.admin,
        message: 'Admin authentication successful',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Admin login error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Admin authentication failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
