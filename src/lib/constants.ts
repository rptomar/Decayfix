/**
 * DecayFix Named Constants
 */

// Minimum traffic drop percentage to classify a page as decaying (e.g. 20%)
export const DECAY_THRESHOLD_PERCENT = 20;

// Minimum volume floors required for a page to qualify for decay detection
// (prevents statistical noise or 0 -> 0 dead pages from flagging)
export const MIN_BASELINE_CLICKS = 30;
export const MIN_BASELINE_IMPRESSIONS = 300;

// Free tier limit: maximum number of flagged pages visible with full AI suggestions
export const FREE_TIER_PAGE_LIMIT = 5;

// Free tier: number of full detail pages unlocked as a live demo (top #1 page)
export const FREE_PREVIEW_DETAIL_LIMIT = 1;

// Default Pro Monthly subscription price in INR (e.g., INR 999/month = ~$12 USD/month)
export const DEFAULT_PRICE_INR = 999;
export const DEFAULT_PLAN_NAME = 'Pro Monthly Subscription (₹999/mo)';

// Google Search Console data lag buffer in days (GSC data is typically delayed by 2-3 days)
export const GSC_LAG_BUFFER_DAYS = 3;

// Comparison period length in days (e.g., 56 days = 8 weeks)
export const COMPARISON_WINDOW_DAYS = 56;

// Google OAuth scopes
export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');

