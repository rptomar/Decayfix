import { db, sql, supportTickets, users } from '@/db';
import { eq, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export interface SupportTicketItem {
  id: string;
  userId?: string | null;
  email: string;
  name?: string | null;
  subject: string;
  category: string;
  siteUrl?: string | null;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory store fallback for support tickets
const memorySupportTickets: Map<string, SupportTicketItem> = new Map();
let tableInitialized = false;

async function ensureTableExists() {
  if (tableInitialized || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "supportTickets" (
        "id" text PRIMARY KEY,
        "userId" text,
        "email" text NOT NULL,
        "name" text,
        "subject" text NOT NULL,
        "category" text DEFAULT 'general' NOT NULL,
        "siteUrl" text,
        "message" text NOT NULL,
        "status" text DEFAULT 'open' NOT NULL,
        "adminNotes" text,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `;
    tableInitialized = true;
  } catch (err) {
    console.warn('[SupportTickets] Auto-create table warning:', err);
  }
}

/**
 * Creates a new support ticket
 */
export async function createSupportTicket(data: {
  userId?: string | null;
  email: string;
  name?: string | null;
  subject: string;
  category?: string;
  siteUrl?: string | null;
  message: string;
}): Promise<SupportTicketItem> {
  const id = crypto.randomUUID();
  const now = new Date();
  const cleanEmail = data.email.trim().toLowerCase();

  const item: SupportTicketItem = {
    id,
    userId: data.userId || null,
    email: cleanEmail,
    name: data.name?.trim() || null,
    subject: data.subject.trim(),
    category: data.category || 'general',
    siteUrl: data.siteUrl?.trim() || null,
    message: data.message.trim(),
    status: 'open',
    adminNotes: null,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Store in memory cache
  memorySupportTickets.set(id, item);

  // 2. Store in DB
  if (db) {
    try {
      await ensureTableExists();
      await db.insert(supportTickets).values({
        id: item.id,
        userId: item.userId,
        email: item.email,
        name: item.name,
        subject: item.subject,
        category: item.category,
        siteUrl: item.siteUrl,
        message: item.message,
        status: item.status,
        adminNotes: item.adminNotes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    } catch (err) {
      console.warn('[SupportTickets] DB insert warning, preserved in memory:', err);
    }
  }

  return item;
}

/**
 * Retrieves all support tickets
 */
export async function getAllSupportTickets(): Promise<SupportTicketItem[]> {
  const mergedMap = new Map<string, SupportTicketItem>();

  // 1. Add memory cache
  for (const [id, ticket] of memorySupportTickets.entries()) {
    mergedMap.set(id, ticket);
  }

  // 2. Query Neon DB
  if (db) {
    try {
      await ensureTableExists();
      const dbTickets = await db
        .select()
        .from(supportTickets)
        .orderBy(desc(supportTickets.createdAt));

      for (const t of dbTickets) {
        mergedMap.set(t.id, {
          id: t.id,
          userId: t.userId,
          email: t.email,
          name: t.name,
          subject: t.subject,
          category: t.category,
          siteUrl: t.siteUrl,
          message: t.message,
          status: t.status as any,
          adminNotes: t.adminNotes,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        });
      }
    } catch (err) {
      console.warn('[SupportTickets] DB fetch warning:', err);
    }
  }

  return Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Updates support ticket status or admin notes
 */
export async function updateSupportTicket(
  id: string,
  updates: { status?: 'open' | 'in_progress' | 'resolved' | 'closed'; adminNotes?: string }
): Promise<boolean> {
  const now = new Date();

  if (memorySupportTickets.has(id)) {
    const current = memorySupportTickets.get(id)!;
    memorySupportTickets.set(id, {
      ...current,
      ...(updates.status ? { status: updates.status } : {}),
      ...(updates.adminNotes !== undefined ? { adminNotes: updates.adminNotes } : {}),
      updatedAt: now,
    });
  }

  if (db) {
    try {
      await ensureTableExists();
      await db
        .update(supportTickets)
        .set({
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.adminNotes !== undefined ? { adminNotes: updates.adminNotes } : {}),
          updatedAt: now,
        })
        .where(eq(supportTickets.id, id));
      return true;
    } catch (err) {
      console.warn('[SupportTickets] DB update warning:', err);
    }
  }

  return true;
}

/**
 * Deletes a support ticket
 */
export async function deleteSupportTicket(id: string): Promise<boolean> {
  memorySupportTickets.delete(id);

  if (db) {
    try {
      await ensureTableExists();
      await db.delete(supportTickets).where(eq(supportTickets.id, id));
    } catch (err) {
      console.warn('[SupportTickets] DB delete warning:', err);
    }
  }

  return true;
}
