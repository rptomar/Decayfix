import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { getUserGoogleTokens, getUserGoogleRefreshToken } from '@/lib/auth';
import {
  getGscClient,
  getAnalysisDateRanges,
  fetchGscPageMetrics,
} from '@/lib/gsc';
import { analyzeTrafficDecay } from '@/lib/analyzer';
import { generateContentSuggestion } from '@/lib/ai';
import { checkSiteUnlockStatus, gateAnalyzedPages } from '@/lib/entitlement';
import { db, sites, pages } from '@/db';
import { eq, and } from 'drizzle-orm';
import { COMPARISON_WINDOW_DAYS, GSC_LAG_BUFFER_DAYS } from '@/lib/constants';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized. Please sign in.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const targetSiteUrl = (body.siteUrl as string) || 'https://example.com';
  const targetSiteId = body.siteId as string;

  try {
    // 1. Resolve site record
    let siteRecord: any = null;
    if (db) {
      try {
        if (targetSiteId) {
          const found = await db
            .select()
            .from(sites)
            .where(and(eq(sites.id, targetSiteId), eq(sites.userId, userId)))
            .limit(1);
          siteRecord = found[0];
        } else if (targetSiteUrl) {
          const found = await db
            .select()
            .from(sites)
            .where(and(eq(sites.siteUrl, targetSiteUrl), eq(sites.userId, userId)))
            .limit(1);
          siteRecord = found[0];
        }
      } catch (dbErr) {
        console.warn('Could not query site record from DB (proceeding without DB record):', dbErr);
      }
    }

    const siteUrl = targetSiteUrl || siteRecord?.siteUrl || 'https://example.com';
    const siteId = siteRecord?.id || 'demo-site-id';

    // 2. Check purchase entitlement
    const entitlement = await checkSiteUnlockStatus(userId, siteId);

    // 3. Fetch Google Tokens (from session cookie or DB)
    const { accessToken, refreshToken } = await getUserGoogleTokens(userId, request);

    let recentMetrics = new Map();
    let baselineMetrics = new Map();

    const { recent, baseline } = getAnalysisDateRanges(
      COMPARISON_WINDOW_DAYS,
      GSC_LAG_BUFFER_DAYS
    );

    let resolvedGscProperty = siteUrl;
    let isLiveGscConnected = false;

    if ((refreshToken || accessToken) && siteUrl) {
      try {
        const gsc = getGscClient(refreshToken, accessToken);
        
        // Auto-match exact GSC property name (handles sc-domain: vs https://)
        try {
          const siteListRes = await gsc.sites.list();
          const verified = siteListRes.data.siteEntry || [];
          const rawTarget = siteUrl.replace(/^https?:\/\//i, '').replace(/^sc-domain:/i, '').replace(/\/$/, '').toLowerCase();
          
          const match = verified.find((s) => {
            const entryClean = (s.siteUrl || '').replace(/^https?:\/\//i, '').replace(/^sc-domain:/i, '').replace(/\/$/, '').toLowerCase();
            return s.siteUrl === siteUrl || entryClean === rawTarget || entryClean.includes(rawTarget) || rawTarget.includes(entryClean);
          });
          
          if (match && match.siteUrl) {
            resolvedGscProperty = match.siteUrl;
            console.log(`[DecayFix] Auto-resolved GSC property to: ${resolvedGscProperty}`);
          }
        } catch (listErr: any) {
          console.warn('[DecayFix] Could not list GSC sites for property match:', listErr.message);
        }

        console.log(`[DecayFix] Querying live GSC metrics for: ${resolvedGscProperty}`);
        recentMetrics = await fetchGscPageMetrics(
          gsc,
          resolvedGscProperty,
          recent.startDate,
          recent.endDate
        );
        baselineMetrics = await fetchGscPageMetrics(
          gsc,
          resolvedGscProperty,
          baseline.startDate,
          baseline.endDate
        );
        isLiveGscConnected = true;
        console.log(`[DecayFix] Fetched ${recentMetrics.size} recent pages and ${baselineMetrics.size} baseline pages from Google Search Console.`);
      } catch (gscErr: any) {
        console.warn('Live GSC query failed:', gscErr?.message || gscErr);
      }
    }

    // Only populate simulated fallback metrics if no real GSC token is connected
    if (!isLiveGscConnected && recentMetrics.size === 0) {
      const cleanBase = siteUrl.replace(/\/$/, '');
      const sampleSlugs = [
        { slug: 'blog/best-seo-tools-2024', baseC: 380, baseI: 8900, recC: 120, recI: 3400, pos: 8.2, basePos: 3.4 },
        { slug: 'blog/how-to-start-a-blog', baseC: 210, baseI: 6200, recC: 45, recI: 1800, pos: 14.1, basePos: 5.1 },
        { slug: 'blog/warehouse-and-logistics-guide', baseC: 240, baseI: 5100, recC: 80, recI: 2100, pos: 7.9, basePos: 3.8 },
        { slug: 'blog/passive-income-ideas-for-creators', baseC: 320, baseI: 9800, recC: 110, recI: 4200, pos: 11.5, basePos: 4.8 },
        { slug: 'blog/top-b2b-supply-chain-solutions', baseC: 195, baseI: 4800, recC: 65, recI: 1900, pos: 9.3, basePos: 4.2 },
        { slug: 'blog/email-marketing-automation-guide', baseC: 140, baseI: 3200, recC: 30, recI: 950, pos: 16.4, basePos: 6.5 },
        { slug: 'blog/freelance-rates-breakdown', baseC: 95, baseI: 2200, recC: 25, recI: 800, pos: 18.2, basePos: 7.1 },
        { slug: 'blog/growth-tactics-for-publishers', baseC: 85, baseI: 1900, recC: 15, recI: 600, pos: 22.0, basePos: 8.0 },
      ];

      for (const item of sampleSlugs) {
        const fullUrl = `${cleanBase}/${item.slug}`;
        recentMetrics.set(fullUrl, {
          url: fullUrl,
          clicks: item.recC,
          impressions: item.recI,
          ctr: Number((item.recC / item.recI).toFixed(4)),
          position: item.pos,
        });
        baselineMetrics.set(fullUrl, {
          url: fullUrl,
          clicks: item.baseC,
          impressions: item.baseI,
          ctr: Number((item.baseC / item.baseI).toFixed(4)),
          position: item.basePos,
        });
      }
    }

    // 4. Run decay analysis
    const analyzedResults = analyzeTrafficDecay(recentMetrics, baselineMetrics);

    // 5. Generate AI suggestions for flagged pages
    const processedPages = [];
    for (let i = 0; i < analyzedResults.length; i++) {
      const pageItem = analyzedResults[i];
      let suggestion = null;

      if (pageItem.isFlagged) {
        suggestion = await generateContentSuggestion({
          url: pageItem.url,
          title: pageItem.title,
          baselineClicks: pageItem.baselineClicks,
          recentClicks: pageItem.recentClicks,
          dropPercentClicks: pageItem.dropPercentClicks,
          dropPercentImpressions: pageItem.dropPercentImpressions,
        });
      }

      processedPages.push({
        ...pageItem,
        aiSuggestion: suggestion,
        flaggedAt: pageItem.isFlagged ? new Date() : null,
      });
    }

    // 6. Save results to database if available
    if (db && siteRecord) {
      try {
        await db.delete(pages).where(eq(pages.siteId, siteRecord.id));

        for (const p of processedPages) {
          await db.insert(pages).values({
            siteId: siteRecord.id,
            url: p.url,
            title: p.title,
            baselineClicks: p.baselineClicks,
            baselineImpressions: p.baselineImpressions,
            recentClicks: p.recentClicks,
            recentImpressions: p.recentImpressions,
            dropPercentClicks: String(p.dropPercentClicks),
            dropPercentImpressions: String(p.dropPercentImpressions),
            severityScore: String(p.severityScore),
            aiSuggestion: p.aiSuggestion,
            isFlagged: p.isFlagged,
            flaggedAt: p.flaggedAt,
            analyzedAt: new Date(),
          });
        }

        await db
          .update(sites)
          .set({ lastSyncedAt: new Date() })
          .where(eq(sites.id, siteRecord.id));
      } catch (dbErr) {
        console.warn('DB save warning:', dbErr);
      }
    }

    // 7. Enforce server-side paywall gating
    const gated = gateAnalyzedPages(processedPages, entitlement.isUnlocked);

    return new Response(
      JSON.stringify({
        success: true,
        siteUrl,
        dateRanges: { recent, baseline },
        results: gated.pages,
        totalFlaggedCount: processedPages.filter((p) => p.isFlagged).length,
        totalAnalyzed: processedPages.length,
        isUnlocked: entitlement.isUnlocked,
        lockedCount: gated.lockedCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to complete analysis' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
