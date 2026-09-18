import { google } from 'googleapis';

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GscPageMetric {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryMetric {
  query: string;
  baselineClicks: number;
  recentClicks: number;
  clicksLost: number;
  baselinePosition: number;
  recentPosition: number;
  positionDelta: number; // positive = dropped rank (e.g. 4.2 -> 11.6 = +7.4 worse)
  baselineImpressions: number;
  recentImpressions: number;
}

/**
 * Creates an authorized Google Search Console client using a refresh token or access token
 */
export function getGscClient(refreshToken?: string | null, accessToken?: string | null) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.SITE_URL || 'http://localhost:4321'}/api/auth/callback/google`
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken || undefined,
    access_token: accessToken || undefined,
  });

  return google.webmasters({
    version: 'v3',
    auth: oauth2Client,
  });
}

/**
 * Fetches all verified sites for the user
 */
export async function fetchUserGscSites(
  refreshToken?: string | null,
  accessToken?: string | null
): Promise<GscSite[]> {
  const gsc = getGscClient(refreshToken, accessToken);
  try {
    const res = await gsc.sites.list();
    const siteEntries = res.data.siteEntry || [];
    return siteEntries
      .filter((s) => s.siteUrl)
      .map((s) => ({
        siteUrl: s.siteUrl as string,
        permissionLevel: s.permissionLevel || 'siteOwner',
      }));
  } catch (error: any) {
    console.error('Failed to list GSC sites:', error?.message || error);
    throw new Error(
      error?.message?.includes('invalid_grant')
        ? 'Google session expired or authorization revoked. Please sign in again.'
        : `Google Search Console error: ${error?.message || 'Unable to fetch sites'}`
    );
  }
}

/**
 * Calculates date range strings (YYYY-MM-DD) for baseline, recent, and year-over-year comparison windows
 */
export function getAnalysisDateRanges(windowDays = 56, lagDays = 3) {
  const now = new Date();

  // Recent end date = today minus lagDays
  const recentEnd = new Date(now);
  recentEnd.setDate(recentEnd.getDate() - lagDays);

  // Recent start date = recentEnd minus windowDays
  const recentStart = new Date(recentEnd);
  recentStart.setDate(recentStart.getDate() - windowDays);

  // Baseline end date = recentStart minus 1 day
  const baselineEnd = new Date(recentStart);
  baselineEnd.setDate(baselineEnd.getDate() - 1);

  // Baseline start date = baselineEnd minus windowDays
  const baselineStart = new Date(baselineEnd);
  baselineStart.setDate(baselineStart.getDate() - windowDays);

  // Year-over-Year (YoY) comparison period = same window exactly 365 days prior
  const yearAgoRecentStart = new Date(recentStart);
  yearAgoRecentStart.setDate(yearAgoRecentStart.getDate() - 365);
  const yearAgoRecentEnd = new Date(recentEnd);
  yearAgoRecentEnd.setDate(yearAgoRecentEnd.getDate() - 365);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return {
    recent: {
      startDate: formatDate(recentStart),
      endDate: formatDate(recentEnd),
    },
    baseline: {
      startDate: formatDate(baselineStart),
      endDate: formatDate(baselineEnd),
    },
    yearAgo: {
      startDate: formatDate(yearAgoRecentStart),
      endDate: formatDate(yearAgoRecentEnd),
    },
  };
}

/**
 * Queries Search Console page-level analytics with candidate property matching
 */
export async function queryGscWithCandidates(
  gsc: ReturnType<typeof getGscClient>,
  rawInputUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 5000
): Promise<{ metrics: Map<string, GscPageMetric>; propertyUsed: string }> {
  const cleanDomain = rawInputUrl
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/^sc-domain:/i, '')
    .replace(/\/$/, '')
    .toLowerCase();

  let verifiedList: string[] = [];
  try {
    const listRes = await gsc.sites.list();
    verifiedList = (listRes.data.siteEntry || []).map((s) => s.siteUrl).filter(Boolean) as string[];
  } catch (e) {
    console.warn('Could not list GSC sites:', e);
  }

  const candidates: string[] = [];
  for (const v of verifiedList) {
    const vClean = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^sc-domain:/i, '').replace(/\/$/, '').toLowerCase();
    if (vClean === cleanDomain) candidates.push(v);
  }

  candidates.push(`sc-domain:${cleanDomain}`);
  candidates.push(rawInputUrl);
  candidates.push(`https://${cleanDomain}/`);
  candidates.push(`https://www.${cleanDomain}/`);
  candidates.push(`http://${cleanDomain}/`);
  candidates.push(`http://www.${cleanDomain}/`);

  for (const v of verifiedList) {
    if (!candidates.includes(v)) candidates.push(v);
  }

  const uniqueCandidates = Array.from(new Set(candidates.filter(Boolean)));

  for (const property of uniqueCandidates) {
    try {
      console.log(`[DecayFix] Querying GSC candidate property: "${property}"`);
      const response = await gsc.searchanalytics.query({
        siteUrl: property,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit,
        },
      });

      const results = new Map<string, GscPageMetric>();
      const rows = response.data.rows || [];
      for (const row of rows) {
        const pageUrl = row.keys?.[0];
        if (pageUrl) {
          results.set(pageUrl, {
            url: pageUrl,
            clicks: Math.round(row.clicks || 0),
            impressions: Math.round(row.impressions || 0),
            ctr: Number((row.ctr || 0).toFixed(4)),
            position: Number((row.position || 0).toFixed(1)),
          });
        }
      }

      return { metrics: results, propertyUsed: property };
    } catch (err: any) {
      console.warn(`[DecayFix] Candidate "${property}" failed: ${err?.message || err}. Trying next...`);
    }
  }

  const verifiedMsg = verifiedList.length > 0 
    ? `Verified properties found: ${verifiedList.join(', ')}` 
    : 'No verified properties found for this account.';

  throw new Error(
    `Google Account does not have permission for "${rawInputUrl}" in Google Search Console. ${verifiedMsg}.`
  );
}

/**
 * Queries detailed query-level data for pages (dimensions: ['page', 'query'])
 * Computes lost queries, click drops, and position movements per page
 */
export async function queryGscPageQueries(
  gsc: ReturnType<typeof getGscClient>,
  propertyUsed: string,
  recentStartDate: string,
  recentEndDate: string,
  baselineStartDate: string,
  baselineEndDate: string,
  rowLimit = 5000
): Promise<Map<string, GscQueryMetric[]>> {
  const pageQueriesMap = new Map<string, GscQueryMetric[]>();

  try {
    // 1. Fetch baseline page+query rows
    const baselineRes = await gsc.searchanalytics.query({
      siteUrl: propertyUsed,
      requestBody: {
        startDate: baselineStartDate,
        endDate: baselineEndDate,
        dimensions: ['page', 'query'],
        rowLimit,
      },
    });

    // 2. Fetch recent page+query rows
    const recentRes = await gsc.searchanalytics.query({
      siteUrl: propertyUsed,
      requestBody: {
        startDate: recentStartDate,
        endDate: recentEndDate,
        dimensions: ['page', 'query'],
        rowLimit,
      },
    });

    const recentQueryMap = new Map<string, { clicks: number; impressions: number; position: number }>();
    for (const row of recentRes.data.rows || []) {
      const page = row.keys?.[0];
      const query = row.keys?.[1];
      if (page && query) {
        const key = `${page}:::${query}`;
        recentQueryMap.set(key, {
          clicks: Math.round(row.clicks || 0),
          impressions: Math.round(row.impressions || 0),
          position: Number((row.position || 0).toFixed(1)),
        });
      }
    }

    const baselineGrouped = new Map<string, Array<{ query: string; clicks: number; impressions: number; position: number }>>();
    for (const row of baselineRes.data.rows || []) {
      const page = row.keys?.[0];
      const query = row.keys?.[1];
      if (page && query) {
        const list = baselineGrouped.get(page) || [];
        list.push({
          query,
          clicks: Math.round(row.clicks || 0),
          impressions: Math.round(row.impressions || 0),
          position: Number((row.position || 0).toFixed(1)),
        });
        baselineGrouped.set(page, list);
      }
    }

    for (const [page, bQueries] of baselineGrouped.entries()) {
      const queryMetrics: GscQueryMetric[] = [];

      for (const bq of bQueries) {
        const key = `${page}:::${bq.query}`;
        const rq = recentQueryMap.get(key) || { clicks: 0, impressions: 0, position: 50 };
        const clicksLost = Math.max(0, bq.clicks - rq.clicks);
        const positionDelta = Number((rq.position - bq.position).toFixed(1));

        // Include queries that had meaningful baseline activity or lost traffic
        if (bq.clicks >= 2 || clicksLost >= 2 || bq.impressions >= 50) {
          queryMetrics.push({
            query: bq.query,
            baselineClicks: bq.clicks,
            recentClicks: rq.clicks,
            clicksLost,
            baselinePosition: bq.position,
            recentPosition: rq.position,
            positionDelta,
            baselineImpressions: bq.impressions,
            recentImpressions: rq.impressions,
          });
        }
      }

      // Sort queries by highest lost clicks first, then by impressions
      queryMetrics.sort((a, b) => b.clicksLost - a.clicksLost || b.baselineImpressions - a.baselineImpressions);
      pageQueriesMap.set(page, queryMetrics.slice(0, 10));
    }
  } catch (err: any) {
    console.warn('[DecayFix] Query dimension fetch warning (proceeding with page-level metrics):', err?.message || err);
  }

  return pageQueriesMap;
}

/**
 * Queries Search Console page-level analytics for a specific date window
 */
export async function fetchGscPageMetrics(
  gsc: ReturnType<typeof getGscClient>,
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit = 5000
): Promise<Map<string, GscPageMetric>> {
  const result = await queryGscWithCandidates(gsc, siteUrl, startDate, endDate, rowLimit);
  return result.metrics;
}
