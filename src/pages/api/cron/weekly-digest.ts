import type { APIRoute } from 'astro';
import { db, users, sites, pages } from '@/db';
import { eq, and } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'decayfix_cron_dev_secret';

    if (authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV === 'production') {
      return new Response(JSON.stringify({ error: 'Unauthorized cron trigger' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!db) {
      return new Response(JSON.stringify({ success: true, message: 'DB not configured, skipped digest.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query active verified users and their decayed posts count
    const allUsers = await db.select().from(users);
    let digestsSent = 0;

    for (const user of allUsers) {
      if (!user.email) continue;

      const userSites = await db.select().from(sites).where(eq(sites.userId, user.id));
      for (const site of userSites) {
        const flaggedPages = await db
          .select()
          .from(pages)
          .where(and(eq(pages.siteId, site.id), eq(pages.isFlagged, true)));

        if (flaggedPages.length > 0) {
          // Send decay alert email digest
          await sendEmail({
            to: user.email,
            subject: `⚠️ DecayFix: ${flaggedPages.length} Decaying Posts Detected on ${site.siteUrl}`,
            html: `
              <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
                  <span style="font-size: 24px;">⚡</span>
                  <span style="font-size: 20px; font-weight: 800; color: #ffffff;">DecayFix Weekly Digest</span>
                </div>
                <h2 style="font-size: 18px; color: #ffffff; margin-bottom: 12px;">Your Weekly Content Decay Alert for ${site.siteUrl}</h2>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
                  We completed your automated Monday morning Search Console scan. <strong>${flaggedPages.length} posts</strong> have experienced a &ge;20% traffic drop.
                </p>
                <div style="margin: 24px 0;">
                  <a href="${process.env.PUBLIC_APP_URL || 'https://decayfix.com'}/dashboard" style="background: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">
                    View Decaying Posts & AI Playbooks ➔
                  </a>
                </div>
                <p style="color: #64748b; font-size: 12px; margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px;">
                  DecayFix by SprintLabs.ai • Continuous Search Traffic Optimization
                </p>
              </div>
            `,
          });
          digestsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        digestsSent,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[DecayFix] Weekly digest cron error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
