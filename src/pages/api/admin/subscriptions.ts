import type { APIRoute } from 'astro';
import { getAdminSession } from '@/lib/adminAuth';
import { activateUserSubscriptionByEmail, deactivateUserSubscription } from '@/lib/entitlement';
import { db, purchases, users, sites } from '@/db';
import { desc, eq } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const admin = await getAdminSession(request);
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Admin login required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let allPurchases: any[] = [];
    let allUsers: any[] = [];
    if (db) {
      allPurchases = await db.select().from(purchases).orderBy(desc(purchases.unlockedAt));
      allUsers = await db.select().from(users);
    }

    const subscriptions = allPurchases.map((p) => {
      const user = allUsers.find((u) => u.id === p.userId);
      return {
        id: p.id,
        userId: p.userId,
        userEmail: user?.email || 'Unknown',
        userName: user?.name || 'Customer',
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        unlockedAt: p.unlockedAt,
        paymentId: p.razorpayPaymentId || p.id,
      };
    });

    return new Response(JSON.stringify({ subscriptions, total: subscriptions.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch subscriptions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const admin = await getAdminSession(request);
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Admin login required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { email, name, amount, notes, siteUrl } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required to activate subscription' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await activateUserSubscriptionByEmail({
      email,
      name,
      amount: amount ? Number(amount) * 100 : 99900,
      siteUrl,
      adminEmail: admin.email,
      notes,
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to activate subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const admin = await getAdminSession(request);
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Admin login required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const identifier = url.searchParams.get('id') || url.searchParams.get('email');

    if (!identifier) {
      return new Response(JSON.stringify({ error: 'User ID or Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await deactivateUserSubscription(identifier);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to deactivate subscription' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
