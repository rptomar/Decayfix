import {
  DECAY_THRESHOLD_PERCENT,
  MIN_BASELINE_CLICKS,
  MIN_BASELINE_IMPRESSIONS,
} from './constants';
import type { GscPageMetric, GscQueryMetric } from './gsc';

export interface AnalyzedPageResult {
  url: string;
  title: string;
  baselineClicks: number;
  baselineImpressions: number;
  recentClicks: number;
  recentImpressions: number;
  clicksLost: number;
  dropPercentClicks: number;
  dropPercentImpressions: number;
  severityScore: number;
  isFlagged: boolean;
  isSeasonal?: boolean;
  topQueries?: GscQueryMetric[];
}

/**
 * Normalizes and canonicalizes a URL to eliminate near-duplicate entries
 * - Normalizes protocol (https) & strips www.
 * - Strips tracking query parameters (utm_*, gclid, fbclid, ref, etc.)
 * - Strips URL fragments (#...)
 * - Normalizes trailing slashes consistently
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.protocol = 'https:';
    parsed.hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    // Strip common tracking and session parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'gclid', 'fbclid', 'ref', 'source', 'sessionId', 'session_id', 'click_id'
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }

    // Clean search string
    let search = parsed.search;
    if (search === '?') search = '';

    // Normalize pathname trailing slash (remove trailing slash except root)
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    return `https://${parsed.hostname}${pathname}${search}`;
  } catch {
    return rawUrl.trim().replace(/\/$/, '');
  }
}

/**
 * Aggregates Search Console metrics across URLs that collapse to the same canonical URL
 */
export function aggregateCanonicalMetrics(
  metricsMap: Map<string, GscPageMetric>
): Map<string, GscPageMetric> {
  const canonicalMap = new Map<string, GscPageMetric>();

  for (const [rawUrl, metric] of metricsMap.entries()) {
    const canonUrl = canonicalizeUrl(rawUrl);
    const existing = canonicalMap.get(canonUrl);

    if (!existing) {
      canonicalMap.set(canonUrl, {
        url: canonUrl,
        clicks: metric.clicks,
        impressions: metric.impressions,
        ctr: metric.ctr,
        position: metric.position,
      });
    } else {
      const totalClicks = existing.clicks + metric.clicks;
      const totalImpressions = existing.impressions + metric.impressions;
      const weightedPosition = totalImpressions > 0
        ? (existing.position * existing.impressions + metric.position * metric.impressions) / totalImpressions
        : existing.position;

      canonicalMap.set(canonUrl, {
        url: canonUrl,
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        position: Number(weightedPosition.toFixed(1)),
      });
    }
  }

  return canonicalMap;
}

/**
 * Extracts a friendly fallback title from a URL slug
 */
export function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, '');
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return `${parsed.hostname.replace(/^www\./i, '')} (Home Page)`;

    // Handle numeric IDs at end of path (e.g., /lease/71 -> Lease Property #71)
    if (segments.length >= 2 && /^\d+$/.test(segments[segments.length - 1])) {
      const parent = segments[segments.length - 2].replace(/[-_]/g, ' ');
      const parentCapitalized = parent.replace(/\b\w/g, (c) => c.toUpperCase());
      return `${parentCapitalized} Property #${segments[segments.length - 1]}`;
    }

    const lastSegment = segments[segments.length - 1];
    return decodeURIComponent(lastSegment)
      .replace(/[-_]/g, ' ')
      .replace(/\.html?$/i, '')
      .replace(/(\d+)\s*(sqft|sqm)/gi, '($1 $2)')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    return url;
  }
}

// In-memory cache for fetched HTML titles
const titleCache = new Map<string, string>();

/**
 * Fetches the real HTML <title> or <h1> tag server-side with timeout & fallback
 */
export async function fetchRealPageTitle(url: string): Promise<string> {
  const cached = titleCache.get(url);
  if (cached) return cached;

  const fallback = extractTitleFromUrl(url);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DecayFixBot/1.0; +https://decayfix.com)',
        'Accept': 'text/html',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      titleCache.set(url, fallback);
      return fallback;
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      let cleanTitle = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#x2F;/gi, '/')
        .replace(/&#47;/g, '/')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#x27;/g, "'")
        .trim();

      // Strip trailing brand boilerplate (e.g. " | Godamwala", " - MyBrand")
      cleanTitle = cleanTitle.replace(/\s*[-–—|]\s*[^-–—|]+$/, '').trim();

      if (cleanTitle.length >= 3) {
        titleCache.set(url, cleanTitle);
        return cleanTitle;
      }
    }

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && h1Match[1]) {
      const cleanH1 = h1Match[1].replace(/<[^>]+>/g, '').trim();
      if (cleanH1.length >= 3) {
        titleCache.set(url, cleanH1);
        return cleanH1;
      }
    }
  } catch {
    // Network/timeout error — use friendly slug fallback
  }

  titleCache.set(url, fallback);
  return fallback;
}

/**
 * Compares recent metrics against baseline metrics and identifies decaying pages
 * Enforces:
 * 1. Minimum baseline volume floors (MIN_BASELINE_CLICKS = 30 or MIN_BASELINE_IMPRESSIONS = 300)
 * 2. Growth guards (pages showing positive click & impression growth are never flagged)
 * 3. Primary ranking by absolute clicks lost (baselineClicks - recentClicks)
 * 4. Year-over-year seasonality check
 */
export function analyzeTrafficDecay(
  recentMetricsRaw: Map<string, GscPageMetric>,
  baselineMetricsRaw: Map<string, GscPageMetric>,
  yearAgoMetricsRaw?: Map<string, GscPageMetric>,
  pageQueriesMap?: Map<string, GscQueryMetric[]>,
  thresholdPercent: number = DECAY_THRESHOLD_PERCENT
): AnalyzedPageResult[] {
  // Aggregate canonicalized URLs first
  const recentMetrics = aggregateCanonicalMetrics(recentMetricsRaw);
  const baselineMetrics = aggregateCanonicalMetrics(baselineMetricsRaw);
  const yearAgoMetrics = yearAgoMetricsRaw ? aggregateCanonicalMetrics(yearAgoMetricsRaw) : undefined;

  const allUrls = new Set<string>([
    ...recentMetrics.keys(),
    ...baselineMetrics.keys(),
  ]);

  const results: AnalyzedPageResult[] = [];

  for (const url of allUrls) {
    const recent = recentMetrics.get(url) || {
      url,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    const baseline = baselineMetrics.get(url) || {
      url,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };

    const yearAgo = yearAgoMetrics?.get(url);

    // Exclude completely inactive URLs
    if (baseline.clicks === 0 && baseline.impressions === 0 && recent.clicks === 0 && recent.impressions === 0) {
      continue;
    }

    // 1. Check Minimum Volume Floor
    // Page must meet either baseline click threshold OR baseline impression threshold to be eligible for decay flagging
    const meetsVolumeFloor = baseline.clicks >= MIN_BASELINE_CLICKS || baseline.impressions >= MIN_BASELINE_IMPRESSIONS;

    const clickDiff = baseline.clicks - recent.clicks;
    const clicksLost = Math.max(0, clickDiff);
    const clickDropPercent = baseline.clicks > 0
      ? Math.max(0, Number(((clickDiff / baseline.clicks) * 100).toFixed(1)))
      : 0;

    const impDiff = baseline.impressions - recent.impressions;
    const impDropPercent = baseline.impressions > 0
      ? Math.max(0, Number(((impDiff / baseline.impressions) * 100).toFixed(1)))
      : 0;

    // 2. Growth Guard: If recent clicks increased or remained equal, click decay is strictly false
    const isClickGrowing = recent.clicks >= baseline.clicks;
    const isImpressionGrowing = recent.impressions >= baseline.impressions;

    // Flag criteria: Qualified volume + at least 20% drop + lost at least 5 clicks or 50 impressions
    let isDecayingClicks = false;
    let isDecayingImpressions = false;

    if (meetsVolumeFloor && !isClickGrowing) {
      isDecayingClicks = clickDropPercent >= thresholdPercent && clickDiff >= 5;
    }

    if (meetsVolumeFloor && !isImpressionGrowing) {
      isDecayingImpressions = impDropPercent >= thresholdPercent && impDiff >= 50;
    }

    let isFlagged = isDecayingClicks || isDecayingImpressions;

    // 3. Year-over-Year Seasonality Check
    // If recent traffic is down vs baseline, but flat or up vs same period last year (YoY), mark as seasonal dip
    let isSeasonal = false;
    if (isFlagged && yearAgo && yearAgo.clicks > 0) {
      if (recent.clicks >= yearAgo.clicks * 0.9) {
        isSeasonal = true;
      }
    }

    // 4. Severity Score driven primarily by absolute clicks lost, with % drop as secondary multiplier
    const severityScore = Number(
      (
        clicksLost * 10 +
        Math.max(0, impDiff) * 0.02 +
        clickDropPercent * 0.5
      ).toFixed(1)
    );

    const topQueries = pageQueriesMap?.get(url) || [];

    results.push({
      url,
      title: extractTitleFromUrl(url),
      baselineClicks: baseline.clicks,
      baselineImpressions: baseline.impressions,
      recentClicks: recent.clicks,
      recentImpressions: recent.impressions,
      clicksLost,
      dropPercentClicks: clickDropPercent,
      dropPercentImpressions: impDropPercent,
      severityScore,
      isFlagged,
      isSeasonal,
      topQueries,
    });
  }

  // Primary sort: Flagged pages first, sorted by absolute clicks lost descending, then % drop
  return results.sort((a, b) => {
    if (a.isFlagged && !b.isFlagged) return -1;
    if (!a.isFlagged && b.isFlagged) return 1;
    if (b.clicksLost !== a.clicksLost) {
      return b.clicksLost - a.clicksLost;
    }
    return b.dropPercentClicks - a.dropPercentClicks;
  });
}

/**
 * Calculates a severity-weighted Content Health Score based on actual clicks lost vs total baseline clicks
 */
export function calculateSeverityWeightedHealthScore(
  pagesList: AnalyzedPageResult[]
): { score: number; grade: string; color: string; label: string } {
  if (pagesList.length === 0) {
    return { score: 100, grade: 'A+', color: 'text-emerald-400', label: 'Exceptional Content Freshness' };
  }

  let totalBaselineClicks = 0;
  let totalClicksLost = 0;
  let flaggedCount = 0;

  for (const p of pagesList) {
    totalBaselineClicks += p.baselineClicks;
    if (p.isFlagged) {
      flaggedCount++;
      totalClicksLost += Math.max(0, p.baselineClicks - p.recentClicks);
    }
  }

  if (totalBaselineClicks === 0) {
    return { score: 100, grade: 'A', color: 'text-emerald-400', label: 'Healthy Baseline' };
  }

  const lossRatio = totalClicksLost / Math.max(totalBaselineClicks, 1);
  let score = Math.max(25, Math.min(100, Math.round((1 - lossRatio) * 100)));

  // Sanity rule: If there are flagged pages with real lost clicks, score must not be A+
  if (flaggedCount > 0 && score >= 90) {
    score = 86; // Clamp to Grade A- / B+
  }

  if (score >= 95 && flaggedCount === 0) {
    return { score, grade: 'A+', color: 'text-emerald-400', label: 'Exceptional Freshness' };
  }
  if (score >= 88 && flaggedCount <= 1) {
    return { score, grade: 'A', color: 'text-emerald-400', label: 'Healthy Content Base' };
  }
  if (score >= 75) {
    return { score, grade: 'B', color: 'text-amber-400', label: 'Moderate Content Decay' };
  }
  return { score, grade: 'C-', color: 'text-rose-400', label: 'Severe Traffic Decay' };
}
