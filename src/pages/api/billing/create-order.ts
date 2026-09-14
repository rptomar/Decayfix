import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { createRazorpayOrder } from '@/lib/razorpay';
import { db, purchases } from '@/db';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const siteId = body.siteId as string | undefined;

  try {
    const receiptId = `rcpt_${userId.slice(0, 8)}_${Date.now()}`;
    const order = await createRazorpayOrder({
      userId,
      siteId,
      receiptId,
    });

    // Optionally create a pending purchase record
    if (db) {
      await db.insert(purchases).values({
        userId,
        siteId: siteId || null,
        razorpayOrderId: order.id,
        amount: Number(order.amount),
        currency: order.currency || 'INR',
        status: 'pending',
      });
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Failed to create Razorpay order:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to initialize payment' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
