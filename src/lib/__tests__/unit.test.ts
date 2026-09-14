import { analyzeTrafficDecay, extractTitleFromUrl } from '../analyzer';
import { gateAnalyzedPages } from '../entitlement';
import { verifyRazorpayWebhookSignature } from '../crypto';
import { DECAY_THRESHOLD_PERCENT, FREE_TIER_PAGE_LIMIT } from '../constants';
import crypto from 'node:crypto';

function runTests() {
  console.log('--- Running DecayFix Unit Tests ---');

  // Test 1: Title extraction
  const title1 = extractTitleFromUrl('https://example.com/blog/best-seo-tools-2024');
  console.assert(title1 === 'Best Seo Tools 2024', `Test 1 failed: got ${title1}`);
  console.log('✓ Test 1: URL title extraction passed');

  // Test 2: Decay Analyzer with >= 20% drop threshold
  const baseline = new Map([
    ['https://example.com/decaying-post', { url: 'https://example.com/decaying-post', clicks: 100, impressions: 2000, ctr: 0.05, position: 5.0 }],
    ['https://example.com/healthy-post', { url: 'https://example.com/healthy-post', clicks: 100, impressions: 2000, ctr: 0.05, position: 5.0 }],
  ]);

  const recent = new Map([
    ['https://example.com/decaying-post', { url: 'https://example.com/decaying-post', clicks: 70, impressions: 1400, ctr: 0.05, position: 8.0 }], // 30% drop -> decaying
    ['https://example.com/healthy-post', { url: 'https://example.com/healthy-post', clicks: 95, impressions: 1950, ctr: 0.05, position: 5.2 }],  // 5% drop -> healthy
  ]);

  const analyzed = analyzeTrafficDecay(recent, baseline, DECAY_THRESHOLD_PERCENT);
  console.assert(analyzed.length === 2, `Expected 2 analyzed pages, got ${analyzed.length}`);
  const decaying = analyzed.find(p => p.url === 'https://example.com/decaying-post');
  const healthy = analyzed.find(p => p.url === 'https://example.com/healthy-post');

  console.assert(decaying?.isFlagged === true, 'Decaying post should be flagged (30% drop >= 20%)');
  console.assert(decaying?.dropPercentClicks === 30, `Expected 30% drop, got ${decaying?.dropPercentClicks}`);
  console.assert(healthy?.isFlagged === false, 'Healthy post should not be flagged (5% drop < 20%)');
  console.log('✓ Test 2: Traffic decay 20% threshold detection passed');

  // Test 3: Server-side Entitlement / Gating (Free vs Paid)
  const mockPages = Array.from({ length: 8 }, (_, i) => ({
    id: `page-${i + 1}`,
    url: `https://example.com/post-${i + 1}`,
    aiSuggestion: `Specific suggestion for post ${i + 1}`,
  }));

  // Free Tier
  const freeGated = gateAnalyzedPages(mockPages, false, FREE_TIER_PAGE_LIMIT);
  console.assert(freeGated.isUnlocked === false, 'Free tier should be isUnlocked = false');
  console.assert(freeGated.lockedCount === 3, `Expected 3 locked items, got ${freeGated.lockedCount}`);
  console.assert(freeGated.pages[0].aiSuggestion !== null, 'Item 0 AI suggestion should be visible');
  console.assert(freeGated.pages[4].aiSuggestion !== null, 'Item 4 AI suggestion should be visible');
  console.assert(freeGated.pages[5].aiSuggestion === null, 'Item 5 AI suggestion must be redacted on server');
  console.assert(freeGated.pages[7].aiSuggestion === null, 'Item 7 AI suggestion must be redacted on server');

  // Paid Tier
  const paidGated = gateAnalyzedPages(mockPages, true, FREE_TIER_PAGE_LIMIT);
  console.assert(paidGated.isUnlocked === true, 'Paid tier should be isUnlocked = true');
  console.assert(paidGated.lockedCount === 0, 'Paid tier should have 0 locked items');
  console.assert(paidGated.pages[5].aiSuggestion !== null, 'Paid tier item 5 suggestion must be visible');
  console.log('✓ Test 3: Server-side free cap and paid gating passed');

  // Test 4: Razorpay Webhook HMAC-SHA256 signature verification
  const secret = 'webhook_secret_xyz123';
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } });
  const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const invalidSignature = 'invalid_tampered_signature_12345';

  console.assert(verifyRazorpayWebhookSignature(rawBody, validSignature, secret) === true, 'Valid signature must pass');
  console.assert(verifyRazorpayWebhookSignature(rawBody, invalidSignature, secret) === false, 'Tampered signature must fail');
  console.log('✓ Test 4: Razorpay Webhook signature verification passed');

  console.log('\nAll 4 automated verification tests passed successfully! 🎉');
}

runTests();
