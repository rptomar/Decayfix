import type { APIRoute } from 'astro';
import { getAdminSession } from '@/lib/adminAuth';
import { db, subscriptionRequests } from '@/db';
import { desc, eq } from 'drizzle-orm';
import { activateUserSubscriptionByEmail } from '@/lib/entitlement';

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
    let requests: any[] = [];
    if (db) {
      requests = await db
        .select()
        .from(subscriptionRequests)
        .orderBy(desc(subscriptionRequests.createdAt));
    }

    return new Response(JSON.stringify({ requests, total: requests.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch subscription requests' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const admin = await getAdminSession(request);
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Admin login required.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, action, status, notes } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Request ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!db) {
      return new Response(JSON.stringify({ success: true, message: 'Updated (mock)' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const currentReq = await db
      .select()
      .from(subscriptionRequests)
      .where(eq(subscriptionRequests.id, id))
      .limit(1);

    if (!currentReq || currentReq.length === 0) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reqData = currentReq[0];

    // 1-Click Approve & Activate Subscription
    if (action === 'activate') {
      const actResult = await activateUserSubscriptionByEmail({
        email: reqData.email,
        name: reqData.userName || undefined,
        siteUrl: reqData.siteUrl || undefined,
        adminEmail: admin.email,
        notes: notes || 'Activated directly from Subscription Requests tab',
      });

      return new Response(
        JSON.stringify({
          success: actResult.success,
          message: actResult.message,
          status: 'activated',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Status or Notes update
    await db
      .update(subscriptionRequests)
      .set({
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptionRequests.id, id));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription request updated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Update failed' }), {
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
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Request ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (db) {
      await db.delete(subscriptionRequests).where(eq(subscriptionRequests.id, id));
    }

    return new Response(JSON.stringify({ success: true, message: 'Request deleted' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Delete failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
