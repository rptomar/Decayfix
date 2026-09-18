import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { generateContentSuggestion } from '@/lib/ai';
import { db, pages } from '@/db';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      url,
      title,
      baselineClicks = 0,
      recentClicks = 0,
      dropPercentClicks = 0,
      dropPercentImpressions = 0,
    } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate high quality AI recommendation
    const suggestion = await generateContentSuggestion({
      url,
      title: title || url,
      baselineClicks: Number(baselineClicks),
      recentClicks: Number(recentClicks),
      dropPercentClicks: Number(dropPercentClicks),
      dropPercentImpressions: Number(dropPercentImpressions),
    });

    // Update the database record asynchronously if available
    if (db) {
      try {
        await db
          .update(pages)
          .set({ aiSuggestion: suggestion })
          .where(eq(pages.url, url));
      } catch (dbErr) {
        console.warn('[DecayFix] Could not persist AI suggestion to DB for URL:', url, dbErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        url,
        aiSuggestion: suggestion,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[DecayFix] Error generating single AI suggestion:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to generate AI suggestion' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
