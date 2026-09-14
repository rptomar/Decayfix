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
 * Extracts a friendly title from a URL path if no title is present
 */
export function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, '');
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return parsed.hostname;
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .replace(/[-_]/g, ' ')
      .replace(/\.html?$/i, '')
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
    // Only analyze pages that had meaningful traffic in baseline (e.g. at least 5 clicks or 50 impressions)
    if (baseline.clicks < 5 && baseline.impressions < 50) {
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
    const isDecayingClicks = clickDropPercent >= thresholdPercent && clickDiff > 2;
    const isDecayingImpressions = impDropPercent >= thresholdPercent && impDiff > 20;
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
