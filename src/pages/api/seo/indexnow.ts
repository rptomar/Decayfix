import type { APIRoute } from 'astro';
import { pingIndexNow } from '@/lib/indexnow';
import { getSession } from '@/lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];

    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No URLs array provided in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await pingIndexNow(urls);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to submit URLs to IndexNow' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  // Public all core marketing & blog URLs ping
  const defaultCoreUrls = [
    'https://decayfix.sprintlabsai.com/',
    'https://decayfix.sprintlabsai.com/pricing',
    'https://decayfix.sprintlabsai.com/blog',
    'https://decayfix.sprintlabsai.com/for/saas',
    'https://decayfix.sprintlabsai.com/for/ecommerce',
    'https://decayfix.sprintlabsai.com/for/agencies',
    'https://decayfix.sprintlabsai.com/for/publishers',
    'https://decayfix.sprintlabsai.com/blog/what-is-content-decay-and-why-does-it-happen',
    'https://decayfix.sprintlabsai.com/blog/why-is-my-blog-post-losing-google-traffic',
    'https://decayfix.sprintlabsai.com/blog/how-to-read-google-search-console-for-traffic-drops',
    'https://decayfix.sprintlabsai.com/blog/content-decay-vs-seasonal-traffic-drop',
    'https://decayfix.sprintlabsai.com/blog/how-often-should-you-update-old-blog-posts-for-seo',
    'https://decayfix.sprintlabsai.com/blog/best-content-decay-detection-tools-2026',
    'https://decayfix.sprintlabsai.com/blog/decayfix-vs-traditional-seo-rank-trackers',
    'https://decayfix.sprintlabsai.com/blog/free-tools-to-check-if-website-content-is-losing-rankings',
    'https://decayfix.sprintlabsai.com/blog/how-to-fix-a-page-losing-clicks-keeping-impressions',
    'https://decayfix.sprintlabsai.com/blog/content-refresh-checklist-for-old-blog-posts',
    'https://decayfix.sprintlabsai.com/blog/how-ai-overviews-and-zero-click-search-affect-blog-traffic-2026',
  ];

  const result = await pingIndexNow(defaultCoreUrls);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
