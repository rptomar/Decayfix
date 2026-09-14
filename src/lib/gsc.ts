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
 * Calculates date range strings (YYYY-MM-DD) for baseline and recent comparison windows
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
  };
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
  const results = new Map<string, GscPageMetric>();

  try {
    const response = await gsc.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit,
      },
    });

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
  } catch (err: any) {
    console.error(`GSC Query error for ${siteUrl} [${startDate} to ${endDate}]:`, err?.message || err);
    throw err;
  }

  return results;
}
