import type { APIRoute } from 'astro';
import { getAdminSession } from '@/lib/adminAuth';
import { activateUserSubscriptionByEmail } from '@/lib/entitlement';
import {
  getAllSubscriptionRequests,
  updateSubscriptionRequest,
  deleteSubscriptionRequestItem,
} from '@/lib/subscriptionRequests';

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
    const requests = await getAllSubscriptionRequests();
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

    const all = await getAllSubscriptionRequests();
    const reqData = all.find((r) => r.id === id);

    if (!reqData) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1-Click Approve & Activate Subscription
    if (action === 'activate') {
      const actResult = await activateUserSubscriptionByEmail({
        email: reqData.email,
        name: reqData.userName || undefined,
        siteUrl: reqData.siteUrl || undefined,
        adminEmail: admin.email,
        notes: notes || 'Activated directly from Subscription Requests tab',
      });

      await updateSubscriptionRequest(id, {
        status: 'activated',
        notes: notes || 'Activated by Admin',
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
    await updateSubscriptionRequest(id, {
      status: status || undefined,
      notes: notes !== undefined ? notes : undefined,
    });

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

    await deleteSubscriptionRequestItem(id);

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
