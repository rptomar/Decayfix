import { db, sql, subscriptionRequests, users } from '@/db';
import { eq, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface SubscriptionRequestItem {
  id: string;
  userId?: string | null;
  email: string;
  userName?: string | null;
  siteUrl?: string | null;
  plan: string;
  amount: number;
  source: string;
  status: 'pending' | 'contacted' | 'activated' | 'cancelled';
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory persistent cache for subscription requests (preserves data during server lifecycle)
const memorySubscriptionRequests: Map<string, SubscriptionRequestItem> = new Map();

// Flag to ensure table creation attempt only runs once
let tableInitialized = false;

/**
 * Ensures the subscriptionRequests table exists in Postgres
 */
async function ensureTableExists() {
  if (tableInitialized || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "subscriptionRequests" (
        "id" text PRIMARY KEY,
        "userId" text,
        "email" text NOT NULL,
        "userName" text,
        "siteUrl" text,
        "plan" text DEFAULT 'Full Site Report Unlock (₹999)' NOT NULL,
        "amount" integer DEFAULT 99900 NOT NULL,
        "source" text DEFAULT 'dashboard_banner' NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "notes" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `;
    tableInitialized = true;
  } catch (err) {
    console.warn('[DecayFix] Auto-create table warning:', err);
  }
}

/**
 * Creates a new subscription request and stores in DB + memory fallback
 */
export async function createSubscriptionRequest(data: {
  id?: string;
  userId?: string | null;
  email: string;
  userName?: string | null;
  siteUrl?: string | null;
  plan?: string;
  amount?: number;
  source?: string;
  notes?: string;
}): Promise<SubscriptionRequestItem> {
  const cleanEmail = data.email.trim().toLowerCase();
  const id = data.id || crypto.randomUUID();
  const now = new Date();

  const item: SubscriptionRequestItem = {
    id,
    userId: data.userId || null,
    email: cleanEmail,
    userName: data.userName || null,
    siteUrl: data.siteUrl || null,
    plan: data.plan || 'Full Site Report Unlock (₹999)',
    amount: data.amount ?? 99900,
    source: data.source || 'dashboard_banner',
    status: 'pending',
    notes: data.notes || `Automated request via ${data.source || 'dashboard'} at ${now.toLocaleString()}`,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Always store in memory cache immediately
  memorySubscriptionRequests.set(id, item);

  // 2. Try inserting into Neon Postgres DB
  if (db) {
    try {
      await ensureTableExists();
      await db.insert(subscriptionRequests).values({
        id: item.id,
        userId: item.userId,
        email: item.email,
        userName: item.userName,
        siteUrl: item.siteUrl,
        plan: item.plan,
        amount: item.amount,
        source: item.source,
        status: item.status,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    } catch (dbErr) {
      console.warn('[DecayFix] DB insert error for subscription request, preserved in memory:', dbErr);
    }
  }

  return item;
}

/**
 * Retrieves all subscription requests merging DB records & memory cache
 */
export async function getAllSubscriptionRequests(): Promise<SubscriptionRequestItem[]> {
  const mergedMap = new Map<string, SubscriptionRequestItem>();

  // 1. Add all from memory cache
  for (const [id, req] of memorySubscriptionRequests.entries()) {
    mergedMap.set(id, req);
  }

  // 2. Query Neon Postgres DB if available
  if (db) {
    try {
      await ensureTableExists();
      const dbRecords = await db
        .select()
        .from(subscriptionRequests)
        .orderBy(desc(subscriptionRequests.createdAt));

      for (const rec of dbRecords) {
        mergedMap.set(rec.id, {
          id: rec.id,
          userId: rec.userId,
          email: rec.email,
          userName: rec.userName,
          siteUrl: rec.siteUrl,
          plan: rec.plan,
          amount: rec.amount,
          source: rec.source,
          status: rec.status as any,
          notes: rec.notes,
          createdAt: rec.createdAt,
          updatedAt: rec.updatedAt,
        });
      }
    } catch (err) {
      console.warn('[DecayFix] DB fetch error for subscription requests, using memory cache:', err);
    }
  }

  // Convert to sorted array by newest first
  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Updates a subscription request status or notes in DB + memory
 */
export async function updateSubscriptionRequest(
  id: string,
  updates: { status?: 'pending' | 'contacted' | 'activated' | 'cancelled'; notes?: string }
): Promise<boolean> {
  const now = new Date();

  // Update in memory
  if (memorySubscriptionRequests.has(id)) {
    const current = memorySubscriptionRequests.get(id)!;
    memorySubscriptionRequests.set(id, {
      ...current,
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
      updatedAt: now,
    });
  }

  // Update in DB
  if (db) {
    try {
      await ensureTableExists();
      await db
        .update(subscriptionRequests)
        .set({
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
          updatedAt: now,
        })
        .where(eq(subscriptionRequests.id, id));
      return true;
    } catch (err) {
      console.warn('[DecayFix] DB update error for subscription request:', err);
    }
  }

  return true;
}

/**
 * Deletes a subscription request in DB + memory
 */
export async function deleteSubscriptionRequestItem(id: string): Promise<boolean> {
  memorySubscriptionRequests.delete(id);

  if (db) {
    try {
      await ensureTableExists();
      await db.delete(subscriptionRequests).where(eq(subscriptionRequests.id, id));
    } catch (err) {
      console.warn('[DecayFix] DB delete error for subscription request:', err);
    }
  }

  return true;
}
