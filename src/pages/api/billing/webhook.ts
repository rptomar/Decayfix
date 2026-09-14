import type { APIRoute } from 'astro';
import { verifyRazorpayWebhookSignature } from '@/lib/crypto';
import { db, purchases, users, sites } from '@/db';
import { eq, and } from 'drizzle-orm';
import { sendUnlockConfirmationEmail } from '@/lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = request.headers.get('x-razorpay-signature');

  const rawBody = await request.text();

  // Validate webhook signature
  if (webhookSecret && signature) {
    const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid Razorpay webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return new Response(JSON.stringify({ error: 'Webhook secret or signature missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const eventType = event.event;
  console.log(`Received Razorpay webhook event: ${eventType}`);

  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;

    const orderId = payment?.order_id || order?.id;
    const paymentId = payment?.id;
    const notes = payment?.notes || order?.notes || {};
    const userId = notes.userId;
    const siteId = notes.siteId !== 'all' ? notes.siteId : null;

    if (db && userId) {
      try {
        // Upsert purchase record
        const existingPurchase = orderId
          ? await db.select().from(purchases).where(eq(purchases.razorpayOrderId, orderId)).limit(1)
          : [];

        if (existingPurchase.length > 0) {
          await db
            .update(purchases)
            .set({
              razorpayPaymentId: paymentId,
              status: 'completed',
              unlockedAt: new Date(),
            })
            .where(eq(purchases.id, existingPurchase[0].id));
        } else {
          await db.insert(purchases).values({
            userId,
            siteId,
            razorpayPaymentId: paymentId,
            razorpayOrderId: orderId,
            amount: payment?.amount || 99900,
            currency: payment?.currency || 'INR',
            status: 'completed',
            unlockedAt: new Date(),
          });
        }

        // Fetch user info for email
        const userRec = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (userRec.length > 0 && userRec[0].email) {
          let siteUrlName = 'your website';
          if (siteId) {
            const siteRec = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1);
            if (siteRec.length > 0) siteUrlName = siteRec[0].siteUrl;
          }

          // Trigger Resend email
          await sendUnlockConfirmationEmail({
            toEmail: userRec[0].email,
            userName: userRec[0].name,
            siteUrl: siteUrlName,
            paymentId: paymentId,
          });
        }
      } catch (dbErr) {
        console.error('Error processing Razorpay webhook in DB:', dbErr);
      }
    }
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
