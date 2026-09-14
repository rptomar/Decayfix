/**
 * DecayFix Named Constants
 */

// Minimum traffic drop percentage to classify a page as decaying (e.g. 20%)
export const DECAY_THRESHOLD_PERCENT = 20;

// Free tier limit: maximum number of flagged pages visible with full AI suggestions
export const FREE_TIER_PAGE_LIMIT = 5;

// Default one-time unlock price in INR (e.g., INR 999 = ~$12 USD)
export const DEFAULT_PRICE_INR = 999;

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
