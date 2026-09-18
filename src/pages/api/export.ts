import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { checkSiteUnlockStatus } from '@/lib/entitlement';
import { db, pages, sites } from '@/db';
import { eq, and, desc } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response('Unauthorized. Please sign in.', { status: 401 });
  }

  const userId = session.user.id;
  const siteUrl = url.searchParams.get('siteUrl') || '';

  // 1. Enforce Server-Side Purchase Gating
  const entitlement = await checkSiteUnlockStatus(userId);
  if (!entitlement.isUnlocked) {
    return new Response('Access Denied. CSV Export is available exclusively for unlocked sites.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    let sitePages: any[] = [];
    if (db) {
      if (siteUrl) {
        const siteFound = await db
          .select()
          .from(sites)
          .where(and(eq(sites.siteUrl, siteUrl), eq(sites.userId, userId)))
          .limit(1);

        if (siteFound.length > 0) {
          sitePages = await db
            .select()
            .from(pages)
            .where(eq(pages.siteId, siteFound[0].id))
            .orderBy(desc(pages.severityScore));
        }
      } else {
        sitePages = await db
          .select()
          .from(pages)
          .orderBy(desc(pages.severityScore))
          .limit(500);
      }
    }

    // Generate CSV Header
    const csvHeaders = [
      'URL',
      'Title',
      'Status',
      'Baseline Clicks (8-Wk)',
      'Recent Clicks (8-Wk)',
      'Clicks Lost',
      'Click Drop %',
      'Baseline Impressions',
      'Recent Impressions',
      'Impression Drop %',
      'Severity Score',
      'Top Declining Search Queries',
      'AI Refresh Playbook',
      'Flagged At',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${clean}"`;
    };

    const csvRows = sitePages.map((p) => {
      let topQueriesFormatted = '';
      if (p.topQueries) {
        try {
          const parsed = JSON.parse(p.topQueries);
          topQueriesFormatted = parsed
            .map((q: any) => `${q.query} (-${q.clicksLost} clicks, rank ${q.baselinePosition} -> ${q.recentPosition})`)
            .join('; ');
        } catch {}
      }

      return [
        escapeCsv(p.url),
        escapeCsv(p.title),
        escapeCsv(p.isFlagged ? (p.isSeasonal ? 'Seasonal Dip' : 'Severe Decay') : 'Healthy Baseline'),
        p.baselineClicks,
        p.recentClicks,
        p.clicksLost || Math.max(0, p.baselineClicks - p.recentClicks),
        `${p.dropPercentClicks}%`,
        p.baselineImpressions,
        p.recentImpressions,
        `${p.dropPercentImpressions}%`,
        p.severityScore,
        escapeCsv(topQueriesFormatted),
        escapeCsv(p.aiSuggestion || ''),
        escapeCsv(p.flaggedAt ? new Date(p.flaggedAt).toISOString().split('T')[0] : ''),
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\r\n');
    const domainName = siteUrl.replace(/^https?:\/\//i, '').replace(/^sc-domain:/i, '').replace(/[^a-zA-Z0-9.-]/g, '_') || 'audit';

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="decayfix-audit-${domainName}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('CSV Export Error:', err);
    return new Response(`Failed to generate CSV export: ${err.message}`, { status: 500 });
  }
};
