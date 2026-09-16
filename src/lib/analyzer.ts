import { DECAY_THRESHOLD_PERCENT } from './constants';
import type { GscPageMetric } from './gsc';

export interface AnalyzedPageResult {
  url: string;
  title: string;
  baselineClicks: number;
  baselineImpressions: number;
  recentClicks: number;
  recentImpressions: number;
  dropPercentClicks: number;
  dropPercentImpressions: number;
  severityScore: number;
  isFlagged: boolean;
}

/**
 * Extracts a friendly, contextual title from a URL path
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

/**
 * Compares recent metrics against baseline metrics and identifies decaying pages
 */
export function analyzeTrafficDecay(
  recentMetrics: Map<string, GscPageMetric>,
  baselineMetrics: Map<string, GscPageMetric>,
  thresholdPercent: number = DECAY_THRESHOLD_PERCENT
): AnalyzedPageResult[] {
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

    // Calculate percentage changes
    // Include all pages that had activity in either period
    if (baseline.clicks === 0 && baseline.impressions === 0 && recent.clicks === 0 && recent.impressions === 0) {
      continue;
    }

    const clickDiff = baseline.clicks - recent.clicks;
    const clickDropPercent = baseline.clicks > 0
      ? Math.max(0, Number(((clickDiff / baseline.clicks) * 100).toFixed(1)))
      : 0;

    const impDiff = baseline.impressions - recent.impressions;
    const impDropPercent = baseline.impressions > 0
      ? Math.max(0, Number(((impDiff / baseline.impressions) * 100).toFixed(1)))
      : 0;

    // Flag if either clicks or impressions dropped by at least DECAY_THRESHOLD_PERCENT
    const isDecayingClicks = clickDropPercent >= thresholdPercent && clickDiff >= 1;
    const isDecayingImpressions = impDropPercent >= thresholdPercent && impDiff >= 5;
    const isFlagged = isDecayingClicks || isDecayingImpressions;

    // Severity score = lost clicks * (click drop % / 100) + (lost impressions / 50)
    const severityScore = Number(
      (
        Math.max(0, clickDiff) * (clickDropPercent / 100 + 1) +
        Math.max(0, impDiff) * 0.05
      ).toFixed(1)
    );

    results.push({
      url,
      title: extractTitleFromUrl(url),
      baselineClicks: baseline.clicks,
      baselineImpressions: baseline.impressions,
      recentClicks: recent.clicks,
      recentImpressions: recent.impressions,
      dropPercentClicks: clickDropPercent,
      dropPercentImpressions: impDropPercent,
      severityScore,
      isFlagged,
    });
  }

  // Sort: flagged pages first, ordered by severityScore descending
  return results.sort((a, b) => {
    if (a.isFlagged && !b.isFlagged) return -1;
    if (!a.isFlagged && b.isFlagged) return 1;
    return b.severityScore - a.severityScore;
  });
}
