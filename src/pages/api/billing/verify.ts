import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { db, purchases, users, sites } from '@/db';
import { eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { sendUnlockConfirmationEmail } from '@/lib/email';

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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, siteId } = body;

  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keySecret && !keySecret.startsWith('dummy_')) {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Update DB
  if (db) {
    try {
      const existing = await db
        .select()
        .from(purchases)
        .where(eq(purchases.razorpayOrderId, razorpay_order_id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(purchases)
          .set({
            razorpayPaymentId: razorpay_payment_id,
            status: 'completed',
            unlockedAt: new Date(),
          })
          .where(eq(purchases.id, existing[0].id));
      } else {
        await db.insert(purchases).values({
          userId,
          siteId: siteId || null,
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          amount: 99900,
          currency: 'INR',
          status: 'completed',
          unlockedAt: new Date(),
        });
      }

      // Send email
      const userRec = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRec.length > 0 && userRec[0].email) {
        await sendUnlockConfirmationEmail({
          toEmail: userRec[0].email,
          userName: userRec[0].name,
          paymentId: razorpay_payment_id,
        });
      }
    } catch (err) {
      console.error('Error verifying payment in DB:', err);
    }
  }

  return new Response(JSON.stringify({ success: true, message: 'Report unlocked' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
