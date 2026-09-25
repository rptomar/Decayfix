import { db, purchases, pages, sites, users, subscriptionRequests } from '@/db';
import { eq, and, or } from 'drizzle-orm';
import { FREE_TIER_PAGE_LIMIT } from './constants';
import { trackEvent } from './analytics';

export interface EntitlementStatus {
  isUnlocked: boolean;
  unlockedAt: Date | null;
  purchaseId: string | null;
}

// In-memory activated emails list for fallback / instant offline demo support
const inMemoryActivatedEmails = new Set<string>();

/**
 * Checks if a user has purchased the full report unlock for a given site or email
 */
export async function checkSiteUnlockStatus(
  userId: string,
  siteId?: string | null,
  userEmail?: string | null
): Promise<EntitlementStatus> {
  // Check in-memory activated emails first (for dev fallback)
  if (userEmail && inMemoryActivatedEmails.has(userEmail.toLowerCase().trim())) {
    return {
      isUnlocked: true,
      unlockedAt: new Date(),
      purchaseId: `mem_unlock_${userEmail}`,
    };
  }

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

    // Check if user's email was granted an unlock (in case account was created before/after activation)
    if (userEmail) {
      const emailUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail.toLowerCase().trim()));

      for (const u of emailUsers) {
        const uPurchases = await db
          .select()
          .from(purchases)
          .where(and(eq(purchases.userId, u.id), eq(purchases.status, 'completed')))
          .limit(1);

        if (uPurchases && uPurchases.length > 0) {
          return {
            isUnlocked: true,
            unlockedAt: uPurchases[0].unlockedAt,
            purchaseId: uPurchases[0].id,
          };
        }
      }
    }

    return { isUnlocked: false, unlockedAt: null, purchaseId: null };
  } catch (error) {
    console.error('Error checking site unlock status:', error);
    return { isUnlocked: false, unlockedAt: null, purchaseId: null };
  }
}

/**
 * Admin action: Make user subscription active by adding email
 */
export async function activateUserSubscriptionByEmail(params: {
  email: string;
  name?: string;
  amount?: number;
  siteUrl?: string;
  adminEmail?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; purchaseId?: string; userId?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Valid email address is required' };
  }

  // Register in memory fallback
  inMemoryActivatedEmails.add(cleanEmail);

  let targetUserId = `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  let purchaseId = `admin_act_${Date.now()}`;

  if (db) {
    try {
      // 1. Find existing user or create a placeholder user
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, cleanEmail))
        .limit(1);

      if (existing && existing.length > 0) {
        targetUserId = existing[0].id;
      } else {
        const created = await db
          .insert(users)
          .values({
            email: cleanEmail,
            name: params.name || cleanEmail.split('@')[0],
          })
          .returning();
        if (created && created[0]) {
          targetUserId = created[0].id;
        }
      }

      // 2. Insert or update completed purchase
      const existingPurchase = await db
        .select()
        .from(purchases)
        .where(and(eq(purchases.userId, targetUserId), eq(purchases.status, 'completed')))
        .limit(1);

      if (existingPurchase.length > 0) {
        purchaseId = existingPurchase[0].id;
      } else {
        const inserted = await db
          .insert(purchases)
          .values({
            userId: targetUserId,
            amount: params.amount ?? 99900,
            currency: 'INR',
            razorpayPaymentId: `admin_manual_${Date.now()}`,
            razorpayOrderId: `ord_admin_${Date.now()}`,
            status: 'completed',
            unlockedAt: new Date(),
          })
          .returning();
        if (inserted && inserted[0]) {
          purchaseId = inserted[0].id;
        }
      }

      // 3. Mark any pending subscription requests for this email as 'activated'
      await db
        .update(subscriptionRequests)
        .set({
          status: 'activated',
          notes: params.notes ? `Activated by Admin: ${params.notes}` : 'Activated by Admin',
          updatedAt: new Date(),
        })
        .where(eq(subscriptionRequests.email, cleanEmail));
    } catch (err: any) {
      console.error('[Entitlement] Error activating subscription in DB:', err);
    }
  }

  // Track event
  await trackEvent({
    eventType: 'api_hit',
    userEmail: cleanEmail,
    metadata: {
      action: 'admin_subscription_activated',
      targetEmail: cleanEmail,
      adminEmail: params.adminEmail || 'admin',
      purchaseId,
    },
  });

  return {
    success: true,
    message: `Subscription successfully activated for ${cleanEmail}! Full site report is now unlocked.`,
    purchaseId,
    userId: targetUserId,
  };
}

/**
 * Admin action: Deactivate user subscription
 */
export async function deactivateUserSubscription(userIdOrEmail: string): Promise<{ success: boolean; message: string }> {
  const clean = userIdOrEmail.trim().toLowerCase();
  inMemoryActivatedEmails.delete(clean);

  if (db) {
    try {
      // Find matching user by email or ID
      const matchingUsers = await db
        .select()
        .from(users)
        .where(or(eq(users.id, clean), eq(users.email, clean)));

      for (const u of matchingUsers) {
        await db
          .update(purchases)
          .set({ status: 'cancelled' })
          .where(eq(purchases.userId, u.id));
      }
    } catch (err: any) {
      console.error('[Entitlement] Error deactivating subscription:', err);
      return { success: false, message: err?.message || 'Failed to deactivate subscription' };
    }
  }

  return { success: true, message: `Subscription deactivated for ${clean}` };
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
