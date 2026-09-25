import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { db, subscriptionRequests, users } from '@/db';
import { trackEvent } from '@/lib/analytics';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const body = await request.json().catch(() => ({}));

    let userEmail = (body.email as string)?.trim().toLowerCase() || session?.user?.email?.trim().toLowerCase();
    let userName = (body.name as string)?.trim() || session?.user?.name || 'Customer';
    const siteUrl = (body.siteUrl as string)?.trim() || undefined;
    const source = (body.source as string)?.trim() || 'dashboard_banner';
    const plan = (body.plan as string)?.trim() || 'Full Site Report Unlock (₹999)';
    const userId = session?.user?.id || null;

    if (!userEmail || !userEmail.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'A valid email address is required to submit a subscription request.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const requestId = crypto.randomUUID();

    // 1. Save subscription request into DB
    if (db) {
      try {
        await db.insert(subscriptionRequests).values({
          id: requestId,
          userId: userId,
          email: userEmail,
          userName: userName,
          siteUrl: siteUrl || null,
          source: source,
          plan: plan,
          amount: 99900,
          status: 'pending',
          notes: `Automated request via ${source} at ${now.toLocaleString()}`,
          createdAt: now,
          updatedAt: now,
        });
      } catch (dbErr) {
        console.warn('[DecayFix] Error inserting subscription request to DB:', dbErr);
      }
    }

    // 2. Track analytics event
    await trackEvent({
      eventType: 'subscription_request',
      userId: userId,
      userEmail: userEmail,
      path: '/api/billing/request-subscription',
      metadata: {
        requestId,
        siteUrl,
        source,
        plan,
        submittedAt: now.toISOString(),
      },
    });

    const confirmationMessage =
      'Thanks for submitting your request to buy a subscription! Our payment gateway is currently under maintenance due to some technical issues. Our internal team will connect and revert to you via email shortly, and you will be able to activate your subscription with guidance from our team member.';

    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        email: userEmail,
        submittedAt: now.toISOString(),
        formattedDate: now.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        message: confirmationMessage,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[DecayFix] Subscription request handler error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to submit subscription request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
