import { db, analyticsEvents, users, sites, pages, purchases, subscriptionRequests } from '@/db';
import { eq, desc, and, gte, count, sql as drizzleSql } from 'drizzle-orm';
import crypto from 'node:crypto';

export type EventType =
  | 'page_view'
  | 'user_login'
  | 'site_analyze'
  | 'api_hit'
  | 'ai_suggestion_copy'
  | 'unlock_button_click'
  | 'subscription_request';

export interface TrackEventParams {
  eventType: EventType;
  userId?: string | null;
  userEmail?: string | null;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
}

// In-memory fallback buffer (persists recent 1,000 events during server runtime)
const fallbackEventsBuffer: Array<{
  id: string;
  eventType: string;
  userId?: string | null;
  userEmail?: string | null;
  path?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  createdAt: Date;
}> = [];

/**
 * Anonymizes IP to a privacy-friendly hash
 */
export function hashIp(ip?: string | null): string {
  if (!ip || ip === '::1' || ip === '127.0.0.1') return 'localhost';
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);
}

/**
 * Universal Event Tracker (Writes to DB & memory buffer)
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  const { eventType, userId, userEmail, path, ip, userAgent, metadata } = params;
  const ipHash = hashIp(ip);
  const metadataStr = metadata ? JSON.stringify(metadata) : null;
  const createdAt = new Date();
  const id = crypto.randomUUID();

  // Push to in-memory fallback
  fallbackEventsBuffer.unshift({
    id,
    eventType,
    userId: userId || null,
    userEmail: userEmail || null,
    path: path || null,
    ipHash,
    userAgent: userAgent || null,
    metadata: metadataStr,
    createdAt,
  });

  if (fallbackEventsBuffer.length > 1000) {
    fallbackEventsBuffer.pop();
  }

  // Persist to Neon Postgres if available
  if (db) {
    try {
      await db.insert(analyticsEvents).values({
        id,
        eventType,
        userId: userId || null,
        userEmail: userEmail || null,
        path: path || null,
        ipHash,
        userAgent: userAgent || null,
        metadata: metadataStr,
        createdAt,
      });
    } catch (err) {
      // Non-blocking catch to ensure requests never fail due to telemetry
      console.warn('[Analytics] DB event insert warning:', err);
    }
  }
}

/**
 * Helper: Track Page View
 */
export async function trackPageView(req: Request, user?: { id?: string; email?: string } | null): Promise<void> {
  try {
    const url = new URL(req.url);
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Ignore static assets & API internal calls from page views
    if (url.pathname.startsWith('/_astro') || url.pathname.startsWith('/favicon') || url.pathname.includes('.')) {
      return;
    }

    await trackEvent({
      eventType: 'page_view',
      path: url.pathname,
      userId: user?.id,
      userEmail: user?.email,
      ip,
      userAgent,
      metadata: {
        search: url.search,
        referrer: req.headers.get('referer') || 'direct',
      },
    });
  } catch (e) {
    // Ignore tracking errors
  }
}

/**
 * Helper: Track API Endpoint Hit
 */
export async function trackApiHit(
  endpoint: string,
  meta: {
    status?: number;
    durationMs?: number;
    userId?: string | null;
    userEmail?: string | null;
    siteUrl?: string | null;
    extra?: Record<string, any>;
  }
): Promise<void> {
  await trackEvent({
    eventType: 'api_hit',
    path: endpoint,
    userId: meta.userId,
    userEmail: meta.userEmail,
    metadata: {
      endpoint,
      status: meta.status || 200,
      durationMs: meta.durationMs || 0,
      siteUrl: meta.siteUrl,
      ...meta.extra,
    },
  });
}

/**
 * Helper: Track Site Analysis Run (Add URL to analyze)
 */
export async function trackSiteAnalyze(data: {
  userId?: string | null;
  userEmail?: string | null;
  siteUrl: string;
  totalPages: number;
  flaggedPages: number;
  clicksLost: number;
  healthScore?: number;
  isUnlocked?: boolean;
}): Promise<void> {
  await trackEvent({
    eventType: 'site_analyze',
    userId: data.userId,
    userEmail: data.userEmail,
    path: '/api/analyze',
    metadata: data,
  });
}

/**
 * Helper: Track AI Suggestion Copied
 */
export async function trackAiSuggestionCopy(data: {
  userId?: string | null;
  userEmail?: string | null;
  url: string;
  title?: string;
  pageId?: string;
}): Promise<void> {
  await trackEvent({
    eventType: 'ai_suggestion_copy',
    userId: data.userId,
    userEmail: data.userEmail,
    path: '/dashboard',
    metadata: data,
  });
}

/**
 * Helper: Track Unlock / Upgrade Button Click
 */
export async function trackUnlockButtonClick(data: {
  userId?: string | null;
  userEmail?: string | null;
  source: string; // 'dashboard_banner' | 'locked_card' | 'page_detail' | 'billing_page' | 'pricing_page'
  siteUrl?: string;
}): Promise<void> {
  await trackEvent({
    eventType: 'unlock_button_click',
    userId: data.userId,
    userEmail: data.userEmail,
    path: '/unlock',
    metadata: data,
  });
}

/**
 * Compiles comprehensive analytics & KPIs for the Admin Dashboard
 */
export async function getAdminAnalyticsOverview(timeRange: 'today' | '7d' | '30d' | 'all' = 'all') {
  const now = new Date();
  let filterDate: Date | null = null;

  if (timeRange === 'today') {
    filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeRange === '7d') {
    filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeRange === '30d') {
    filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 1. Gather all events (from DB or fallback buffer)
  let allEvents: any[] = [];
  let allUsers: any[] = [];
  let allSites: any[] = [];
  let allPurchases: any[] = [];
  let allRequests: any[] = [];

  if (db) {
    try {
      allEvents = await db
        .select()
        .from(analyticsEvents)
        .orderBy(desc(analyticsEvents.createdAt))
        .limit(3000);

      allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      allSites = await db.select().from(sites).orderBy(desc(sites.connectedAt));
      allPurchases = await db.select().from(purchases).orderBy(desc(purchases.unlockedAt));
      allRequests = await db.select().from(subscriptionRequests).orderBy(desc(subscriptionRequests.createdAt));
    } catch (err) {
      console.warn('[Analytics] DB Query error, falling back to in-memory:', err);
    }
  }

  // Merge in-memory fallback events if DB returned empty
  if (allEvents.length === 0) {
    allEvents = [...fallbackEventsBuffer];
  }

  // Apply time range filter
  const filteredEvents = filterDate
    ? allEvents.filter((e) => new Date(e.createdAt) >= filterDate!)
    : allEvents;

  // Metric 1: Total Visits / Page Views
  const pageViews = filteredEvents.filter((e) => e.eventType === 'page_view');
  const uniqueVisitors = new Set(pageViews.map((e) => e.ipHash || e.userId || 'anon')).size;

  // Metric 2: User Sign-ins / Registered Users
  const loginEvents = filteredEvents.filter((e) => e.eventType === 'user_login');
  const totalUsersCount = allUsers.length > 0 ? allUsers.length : loginEvents.length;

  // Metric 3: Added URLs / Sites to Analyze
  const analyzeEvents = filteredEvents.filter((e) => e.eventType === 'site_analyze');
  const totalAnalyzedSitesCount = allSites.length > 0 ? allSites.length : analyzeEvents.length;

  // Metric 4: API Hits Count
  const apiHits = filteredEvents.filter((e) => e.eventType === 'api_hit');
  const apiHitsByEndpoint: Record<string, number> = {};
  apiHits.forEach((hit) => {
    let ep = hit.path || 'unknown';
    try {
      const meta = typeof hit.metadata === 'string' ? JSON.parse(hit.metadata) : hit.metadata;
      if (meta?.endpoint) ep = meta.endpoint;
    } catch {}
    apiHitsByEndpoint[ep] = (apiHitsByEndpoint[ep] || 0) + 1;
  });

  // Metric 5: AI Suggestions Copied
  const aiCopyEvents = filteredEvents.filter((e) => e.eventType === 'ai_suggestion_copy');

  // Metric 6: Clicks on Unlock / Upgrade Button
  const unlockClicks = filteredEvents.filter((e) => e.eventType === 'unlock_button_click');
  const unlockClicksBySource: Record<string, number> = {};
  unlockClicks.forEach((click) => {
    let src = 'general';
    try {
      const meta = typeof click.metadata === 'string' ? JSON.parse(click.metadata) : click.metadata;
      if (meta?.source) src = meta.source;
    } catch {}
    unlockClicksBySource[src] = (unlockClicksBySource[src] || 0) + 1;
  });

  // Metric 7: Free vs Paid Users
  const paidUserIds = new Set(
    allPurchases.filter((p) => p.status === 'completed').map((p) => p.userId)
  );
  const totalPaidUsers = paidUserIds.size;
  const totalFreeUsers = Math.max(0, totalUsersCount - totalPaidUsers);

  // Metric 8: Total Revenue Collected (INR)
  const totalRevenuePaise = allPurchases
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalRevenueInr = Math.round(totalRevenuePaise / 100);

  // Metric 9: Subscription Requests
  const pendingRequests = allRequests.filter((r) => r.status === 'pending');

  return {
    timeRange,
    summary: {
      pageViewsCount: pageViews.length,
      uniqueVisitorsCount: uniqueVisitors,
      totalUsersCount,
      totalFreeUsers,
      totalPaidUsers,
      analyzedSitesCount: totalAnalyzedSitesCount,
      totalAnalysisRuns: analyzeEvents.length,
      totalApiHits: apiHits.length,
      apiHitsBreakdown: apiHitsByEndpoint,
      aiSuggestionsCopiedCount: aiCopyEvents.length,
      unlockButtonClicksCount: unlockClicks.length,
      unlockClicksBySource,
      subscriptionRequestsCount: allRequests.length,
      pendingSubscriptionRequestsCount: pendingRequests.length,
      totalRevenueInr,
      totalPurchasesCount: allPurchases.length,
    },
    recentEvents: filteredEvents.slice(0, 100),
    allUsers,
    allSites,
    allPurchases,
    subscriptionRequests: allRequests,
  };
}
