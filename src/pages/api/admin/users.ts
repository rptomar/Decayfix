import type { APIRoute } from 'astro';
import { getAdminSession } from '@/lib/adminAuth';
import { db, users, sites, purchases, pages } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { activateUserSubscriptionByEmail, deactivateUserSubscription } from '@/lib/entitlement';

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
    let allUsers: any[] = [];
    let allSites: any[] = [];
    let allPurchases: any[] = [];

    if (db) {
      allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      allSites = await db.select().from(sites);
      allPurchases = await db.select().from(purchases);
    }

    const paidUserIds = new Set(
      allPurchases.filter((p) => p.status === 'completed').map((p) => p.userId)
    );

    const userDetails = allUsers.map((u) => {
      const userSites = allSites.filter((s) => s.userId === u.id);
      const isPaid = paidUserIds.has(u.id);
      const userPurchase = allPurchases.find((p) => p.userId === u.id && p.status === 'completed');

      return {
        id: u.id,
        name: u.name || 'Anonymous Blogger',
        email: u.email,
        image: u.image,
        createdAt: u.createdAt,
        isPaid,
        subscriptionPlan: isPaid ? 'Full Site Report Unlocked' : 'Free Preview Tier',
        unlockedAt: userPurchase ? userPurchase.unlockedAt : null,
        amountPaid: userPurchase ? userPurchase.amount : 0,
        sitesCount: userSites.length,
        sites: userSites.map((s) => ({ id: s.id, siteUrl: s.siteUrl, lastSyncedAt: s.lastSyncedAt })),
      };
    });

    return new Response(JSON.stringify({ users: userDetails, total: userDetails.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch users' }), {
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
    const { action, email, userId } = body;

    if (action === 'activate') {
      const result = await activateUserSubscriptionByEmail({
        email,
        adminEmail: admin.email,
      });
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'deactivate') {
      const result = await deactivateUserSubscription(userId || email);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Operation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
