import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { getUserGoogleTokens, getUserGoogleRefreshToken } from '@/lib/auth';
import {
  getGscClient,
  getAnalysisDateRanges,
  queryGscWithCandidates,
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

    if (!refreshToken && !accessToken) {
      return new Response(
        JSON.stringify({
          error: 'Google Search Console authorization token missing or expired. Please sign out and sign in again with Google.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let recentMetrics = new Map();
    let baselineMetrics = new Map();

    const { recent, baseline } = getAnalysisDateRanges(
      COMPARISON_WINDOW_DAYS,
      GSC_LAG_BUFFER_DAYS
    );

    let resolvedGscProperty = siteUrl;

    try {
      const gsc = getGscClient(refreshToken, accessToken);
      
      console.log(`[DecayFix] Querying live GSC metrics for input URL: ${siteUrl}`);
      const recentResult = await queryGscWithCandidates(
        gsc,
        siteUrl,
        recent.startDate,
        recent.endDate
      );
      resolvedGscProperty = recentResult.propertyUsed;
      recentMetrics = recentResult.metrics;

      const baselineResult = await queryGscWithCandidates(
        gsc,
        resolvedGscProperty,
        baseline.startDate,
        baseline.endDate
      );
      baselineMetrics = baselineResult.metrics;

      console.log(`[DecayFix] Success! Fetched ${recentMetrics.size} recent pages and ${baselineMetrics.size} baseline pages from property: ${resolvedGscProperty}`);
    } catch (gscErr: any) {
      console.error('Live GSC query failed:', gscErr);
      const errMsg = gscErr?.message || 'Failed to query Google Search Console API';
      return new Response(
        JSON.stringify({
          error: `Google Search Console API Error: ${errMsg}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Run decay analysis on real Search Console data
    const analyzedResults = analyzeTrafficDecay(recentMetrics, baselineMetrics);

    // 5. Generate AI suggestions concurrently in parallel (Fast Sub-3s Analysis)
    const maxAiSuggestions = entitlement.isUnlocked ? analyzedResults.length : FREE_TIER_PAGE_LIMIT;

    const processedPages = await Promise.all(
      analyzedResults.map(async (pageItem, idx) => {
        let suggestion = null;

        // Generate AI suggestions for flagged pages within user's tier
        if (pageItem.isFlagged && idx < maxAiSuggestions) {
          try {
            suggestion = await generateContentSuggestion({
              url: pageItem.url,
              title: pageItem.title,
              baselineClicks: pageItem.baselineClicks,
              recentClicks: pageItem.recentClicks,
              dropPercentClicks: pageItem.dropPercentClicks,
              dropPercentImpressions: pageItem.dropPercentImpressions,
            });
          } catch (aiErr) {
            console.warn('AI suggestion error for', pageItem.url, aiErr);
          }
        }

        return {
          ...pageItem,
          aiSuggestion: suggestion,
          flaggedAt: pageItem.isFlagged ? new Date() : null,
        };
      })
    );

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
