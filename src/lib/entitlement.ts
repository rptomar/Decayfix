import { db, purchases, pages, sites } from '@/db';
import { eq, and } from 'drizzle-orm';
import { FREE_TIER_PAGE_LIMIT } from './constants';

export interface EntitlementStatus {
  isUnlocked: boolean;
  unlockedAt: Date | null;
  purchaseId: string | null;
}

/**
 * Checks if a user has purchased the full report unlock for a given site
 */
export async function checkSiteUnlockStatus(
  userId: string,
  siteId?: string | null
): Promise<EntitlementStatus> {
  if (!db || !userId) {
    return { isUnlocked: false, unlockedAt: null, purchaseId: null };
  }

  try {
    const conditions = [eq(purchases.userId, userId), eq(purchases.status, 'completed')];
    if (siteId) {
      conditions.push(eq(purchases.siteId, siteId));
    }

    const result = await db
      .select()
      .from(purchases)
      .where(and(...conditions))
      .limit(1);

    if (result && result.length > 0) {
      return {
        isUnlocked: true,
        unlockedAt: result[0].unlockedAt,
        purchaseId: result[0].id,
      };
    }

    // Check if user has any completed global unlock
    const globalPurchase = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.status, 'completed')))
      .limit(1);

    if (globalPurchase && globalPurchase.length > 0) {
      return {
        isUnlocked: true,
        unlockedAt: globalPurchase[0].unlockedAt,
        purchaseId: globalPurchase[0].id,
      };
    }

    return { isUnlocked: false, unlockedAt: null, purchaseId: null };
  } catch (error) {
    console.error('Error checking site unlock status:', error);
    return { isUnlocked: false, unlockedAt: null, purchaseId: null };
  }
}

/**
 * Enforces server-side gating on a list of analyzed pages
 */
export function gateAnalyzedPages<T extends { aiSuggestion?: string | null; id?: string }>(
  allPages: T[],
  isUnlocked: boolean,
  limit = FREE_TIER_PAGE_LIMIT
): { pages: T[]; totalCount: number; lockedCount: number; isUnlocked: boolean } {
  const totalCount = allPages.length;
  const lockedCount = isUnlocked ? 0 : Math.max(0, totalCount - limit);

  if (isUnlocked) {
    return {
      pages: allPages,
      totalCount,
      lockedCount: 0,
      isUnlocked: true,
    };
  }

  // Redact content for pages beyond the limit
  const gatedPages = allPages.map((page, index) => {
    if (index < limit) {
      return page;
    }
    // Server-side redacted payload
    return {
      ...page,
      aiSuggestion: null,
      isLocked: true,
    };
  });

  return {
    pages: gatedPages,
    totalCount,
    lockedCount,
    isUnlocked: false,
  };
}
