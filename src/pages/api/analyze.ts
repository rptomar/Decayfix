import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { getUserGoogleTokens, getUserGoogleRefreshToken } from '@/lib/auth';
import {
  getGscClient,
  getAnalysisDateRanges,
  queryGscWithCandidates,
  queryGscPageQueries,
  fetchGscPageMetrics,
} from '@/lib/gsc';
import {
  analyzeTrafficDecay,
  fetchRealPageTitle,
  calculateSeverityWeightedHealthScore,
} from '@/lib/analyzer';
import { checkSiteUnlockStatus, gateAnalyzedPages } from '@/lib/entitlement';
import { db, sites, pages, analysisSnapshots } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import {
  COMPARISON_WINDOW_DAYS,
  GSC_LAG_BUFFER_DAYS,
  FREE_TIER_PAGE_LIMIT,
} from '@/lib/constants';

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
    // 1. Resolve site record in DB
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
        console.warn('Could not query site record from DB:', dbErr);
      }

      if (!siteRecord && targetSiteUrl) {
        try {
          const inserted = await db
            .insert(sites)
            .values({
              userId,
              siteUrl: targetSiteUrl,
              permissionLevel: 'siteOwner',
            })
            .returning();
          siteRecord = inserted[0];
        } catch (insertSiteErr) {
          console.warn('Could not auto-create site record in DB:', insertSiteErr);
        }
      }
    }

    const siteUrl = targetSiteUrl || siteRecord?.siteUrl || 'https://example.com';
    const siteId = siteRecord?.id || 'demo-site-id';

    // 2. Check purchase entitlement
    const entitlement = await checkSiteUnlockStatus(userId, siteId);

    // 3. Fetch Google Tokens
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
    let yearAgoMetrics = new Map();
    let pageQueriesMap = new Map();

    const { recent, baseline, yearAgo } = getAnalysisDateRanges(
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

      // Fetch Year-over-Year (YoY) metrics for seasonality detection
      try {
        const yearAgoResult = await queryGscWithCandidates(
          gsc,
          resolvedGscProperty,
          yearAgo.startDate,
          yearAgo.endDate
        );
        yearAgoMetrics = yearAgoResult.metrics;
      } catch (yoyErr) {
        console.warn('[DecayFix] YoY query notice (continuing without seasonality data):', yoyErr);
      }

      // Query page-query dimension for granular search intent drops
      try {
        pageQueriesMap = await queryGscPageQueries(
          gsc,
          resolvedGscProperty,
          recent.startDate,
          recent.endDate,
          baseline.startDate,
          baseline.endDate
        );
      } catch (queryDimErr) {
        console.warn('[DecayFix] Query dimensions notice:', queryDimErr);
      }

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

    // 4. Run decay analysis with volume floor, growth guards & absolute loss ranking
    const analyzedResults = analyzeTrafficDecay(
      recentMetrics,
      baselineMetrics,
      yearAgoMetrics,
      pageQueriesMap
    );

    // 5. Fetch real HTML page titles for top flagged pages asynchronously
    const flaggedPages = analyzedResults.filter((p) => p.isFlagged);
    await Promise.all(
      flaggedPages.slice(0, 15).map(async (p) => {
        try {
          const realTitle = await fetchRealPageTitle(p.url);
          if (realTitle && realTitle.trim().length > 2) {
            p.title = realTitle;
          }
        } catch {}
      })
    );

    // 6. Check previous analysis snapshot for recovery tracking
    const previousRecentClicksMap = new Map<string, number>();
    if (db && siteRecord) {
      try {
        const prevPages = await db
          .select({ url: pages.url, recentClicks: pages.recentClicks })
          .from(pages)
          .where(eq(pages.siteId, siteRecord.id));

        for (const pp of prevPages) {
          previousRecentClicksMap.set(pp.url, pp.recentClicks);
        }
      } catch (prevErr) {
        console.warn('Could not read previous page metrics:', prevErr);
      }
    }

    const processedPages = analyzedResults.map((pageItem) => {
      const prevRecent = previousRecentClicksMap.get(pageItem.url);
      const isRecovered =
        prevRecent !== undefined &&
        prevRecent < pageItem.baselineClicks * 0.8 &&
        pageItem.recentClicks >= pageItem.baselineClicks * 0.95;

      return {
        ...pageItem,
        previousRecentClicks: prevRecent ?? null,
        isRecovered,
        aiSuggestion: null,
        flaggedAt: pageItem.isFlagged ? new Date() : null,
      };
    });

    // 7. Calculate Single Source of Truth Metrics
    const totalFlaggedCount = processedPages.filter((p) => p.isFlagged).length;
    const totalAnalyzed = processedPages.length;
    const totalClicksLost = processedPages
      .filter((p) => p.isFlagged)
      .reduce((sum, p) => sum + p.clicksLost, 0);
    const recoveredCount = processedPages.filter((p) => p.isRecovered).length;

    const health = calculateSeverityWeightedHealthScore(processedPages);

    // Exact arithmetic derivation for paywall CTA: locked_count = total_flagged - free_visible
    const lockedCount = entitlement.isUnlocked
      ? 0
      : Math.max(0, totalFlaggedCount - FREE_TIER_PAGE_LIMIT);

    console.log(`[DecayFix Assertion] totalAnalyzed=${totalAnalyzed}, totalFlagged=${totalFlaggedCount}, lockedCount=${lockedCount}, totalClicksLost=${totalClicksLost}, health=${health.score}%`);

    // 8. Save results and snapshot to database
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
            clicksLost: p.clicksLost,
            dropPercentClicks: String(p.dropPercentClicks),
            dropPercentImpressions: String(p.dropPercentImpressions),
            severityScore: String(p.severityScore),
            aiSuggestion: p.aiSuggestion,
            topQueries: p.topQueries && p.topQueries.length > 0 ? JSON.stringify(p.topQueries) : null,
            isFlagged: p.isFlagged,
            isSeasonal: p.isSeasonal || false,
            isRecovered: p.isRecovered || false,
            previousRecentClicks: p.previousRecentClicks,
            flaggedAt: p.flaggedAt,
            analyzedAt: new Date(),
          });
        }

        // Insert historical snapshot record
        await db.insert(analysisSnapshots).values({
          siteId: siteRecord.id,
          totalAnalyzed,
          totalFlagged: totalFlaggedCount,
          totalClicksLost,
          healthScore: health.score,
          analyzedAt: new Date(),
        });

        await db
          .update(sites)
          .set({ lastSyncedAt: new Date() })
          .where(eq(sites.id, siteRecord.id));
      } catch (dbErr) {
        console.warn('DB save warning:', dbErr);
      }
    }

    // 9. Enforce server-side paywall gating
    const gated = gateAnalyzedPages(processedPages, entitlement.isUnlocked);

    return new Response(
      JSON.stringify({
        success: true,
        siteUrl,
        dateRanges: { recent, baseline, yearAgo },
        results: gated.pages,
        totalFlaggedCount,
        totalAnalyzed,
        totalClicksLost,
        recoveredCount,
        healthScore: health.score,
        healthGrade: health.grade,
        healthLabel: health.label,
        healthColor: health.color,
        isUnlocked: entitlement.isUnlocked,
        lockedCount,
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
