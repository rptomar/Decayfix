import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { AdapterAccount } from '@auth/core/adapters';

/**
 * Auth.js standard users table
 */
export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * Auth.js OAuth accounts table (stores Google tokens)
 */
export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

/**
 * Auth.js sessions table
 */
export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

/**
 * Auth.js verification tokens table
 */
export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [
    primaryKey({
      columns: [vt.identifier, vt.token],
    }),
  ]
);

/**
 * Sites connected via Google Search Console
 */
export const sites = pgTable('sites', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  siteUrl: text('siteUrl').notNull(),
  permissionLevel: text('permissionLevel').default('siteOwner'),
  connectedAt: timestamp('connectedAt', { mode: 'date' }).defaultNow().notNull(),
  lastSyncedAt: timestamp('lastSyncedAt', { mode: 'date' }),
});

/**
 * Analyzed blog post URLs / pages
 */
export const pages = pgTable('pages', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  siteId: text('siteId')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  title: text('title'),
  baselineClicks: integer('baselineClicks').default(0).notNull(),
  baselineImpressions: integer('baselineImpressions').default(0).notNull(),
  recentClicks: integer('recentClicks').default(0).notNull(),
  recentImpressions: integer('recentImpressions').default(0).notNull(),
  dropPercentClicks: numeric('dropPercentClicks', { precision: 6, scale: 2 }).default('0'),
  dropPercentImpressions: numeric('dropPercentImpressions', { precision: 6, scale: 2 }).default('0'),
  severityScore: numeric('severityScore', { precision: 10, scale: 2 }).default('0'),
  aiSuggestion: text('aiSuggestion'),
  isFlagged: boolean('isFlagged').default(false).notNull(),
  flaggedAt: timestamp('flaggedAt', { mode: 'date' }),
  analyzedAt: timestamp('analyzedAt', { mode: 'date' }).defaultNow().notNull(),
});

/**
 * Purchases (One-time report unlocks via Razorpay)
 */
export const purchases = pgTable('purchases', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  siteId: text('siteId')
    .references(() => sites.id, { onDelete: 'set null' }),
  razorpayPaymentId: text('razorpayPaymentId'),
  razorpayOrderId: text('razorpayOrderId'),
  amount: integer('amount').notNull(), // amount in paise or INR
  currency: text('currency').default('INR').notNull(),
  status: text('status').default('completed').notNull(), // 'completed', 'pending'
  unlockedAt: timestamp('unlockedAt', { mode: 'date' }).defaultNow().notNull(),
});
