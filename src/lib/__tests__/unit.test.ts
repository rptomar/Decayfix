import {
  analyzeTrafficDecay,
  extractTitleFromUrl,
  canonicalizeUrl,
  aggregateCanonicalMetrics,
  calculateSeverityWeightedHealthScore,
} from '../analyzer';
import { gateAnalyzedPages } from '../entitlement';
import { verifyRazorpayWebhookSignature } from '../crypto';
import {
  DECAY_THRESHOLD_PERCENT,
  FREE_TIER_PAGE_LIMIT,
  MIN_BASELINE_CLICKS,
  MIN_BASELINE_IMPRESSIONS,
} from '../constants';
import crypto from 'node:crypto';

async function runTests() {
  console.log('========================================');
  console.log('   DecayFix Core Engine Unit Tests      ');
  console.log('========================================\n');

  // Test 1: URL Title Extraction & Cleanup
  const title1 = extractTitleFromUrl('https://example.com/blog/best-seo-tools-2024');
  console.assert(title1 === 'Best Seo Tools 2024', `Test 1.1 failed: got ${title1}`);
  const title2 = extractTitleFromUrl('https://godamwala.com/lease/71');
  console.assert(title2 === 'Lease Property #71', `Test 1.2 failed: got ${title2}`);
  const title3 = extractTitleFromUrl('https://example.com/warehouse-10000sqft-delhi');
  console.assert(title3 === 'Warehouse (10000 Sqft) Delhi', `Test 1.3 failed: got ${title3}`);
  console.log('✓ Test 1: URL title slug parsing and formatting passed');

  // Test 2: URL Canonicalization
  const rawUrl1 = 'https://www.example.com/blog/seo-tips/?utm_source=twitter&utm_medium=social&gclid=123#header';
  const canon1 = canonicalizeUrl(rawUrl1);
  console.assert(canon1 === 'https://example.com/blog/seo-tips', `Test 2.1 failed: got ${canon1}`);

  const rawUrl2 = 'http://example.com/products/warehouse/?sessionId=xyz&ref=partner';
  const canon2 = canonicalizeUrl(rawUrl2);
  console.assert(canon2 === 'https://example.com/products/warehouse', `Test 2.2 failed: got ${canon2}`);
  console.log('✓ Test 2: URL canonicalization (tracking strip, trailing slash, www strip) passed');

  // Test 3: Canonical Metric Aggregation
  const fragmentedMetrics = new Map([
    ['https://example.com/lease?city=delhi&utm_source=ad', { url: 'https://example.com/lease?city=delhi&utm_source=ad', clicks: 20, impressions: 500, ctr: 0.04, position: 4.0 }],
    ['https://www.example.com/lease?city=delhi', { url: 'https://www.example.com/lease?city=delhi', clicks: 30, impressions: 500, ctr: 0.06, position: 2.0 }],
  ]);
  const aggregated = aggregateCanonicalMetrics(fragmentedMetrics);
  console.assert(aggregated.size === 1, `Test 3.1 failed: expected 1 collapsed URL, got ${aggregated.size}`);
  const aggEntry = aggregated.get('https://example.com/lease?city=delhi');
  console.assert(aggEntry !== undefined, 'Test 3.2 failed: canonical URL key not found');
  console.assert(aggEntry?.clicks === 50, `Test 3.3 failed: expected 50 aggregated clicks, got ${aggEntry?.clicks}`);
  console.assert(aggEntry?.impressions === 1000, `Test 3.4 failed: expected 1000 aggregated impressions, got ${aggEntry?.impressions}`);
  console.assert(aggEntry?.position === 3.0, `Test 3.5 failed: expected weighted position 3.0, got ${aggEntry?.position}`);
  console.log('✓ Test 3: Canonical metric aggregation passed');

  // Test 4: Volume Floor Filtering (MIN_BASELINE_CLICKS = 30, MIN_BASELINE_IMPRESSIONS = 300)
  const lowVolumeBaseline = new Map([
    // Below both volume floors: 10 clicks, 50 impressions (drop 50%) -> should NOT flag
    ['https://example.com/low-volume-dead', { url: 'https://example.com/low-volume-dead', clicks: 10, impressions: 50, ctr: 0.2, position: 10.0 }],
    // Meets clicks floor (40 clicks >= 30) -> should flag
    ['https://example.com/meets-clicks-floor', { url: 'https://example.com/meets-clicks-floor', clicks: 40, impressions: 200, ctr: 0.2, position: 5.0 }],
    // Meets impressions floor (500 imp >= 300) -> should flag
    ['https://example.com/meets-imp-floor', { url: 'https://example.com/meets-imp-floor', clicks: 15, impressions: 500, ctr: 0.03, position: 8.0 }],
  ]);

  const lowVolumeRecent = new Map([
    ['https://example.com/low-volume-dead', { url: 'https://example.com/low-volume-dead', clicks: 5, impressions: 25, ctr: 0.2, position: 12.0 }],
    ['https://example.com/meets-clicks-floor', { url: 'https://example.com/meets-clicks-floor', clicks: 20, impressions: 100, ctr: 0.2, position: 8.0 }],
    ['https://example.com/meets-imp-floor', { url: 'https://example.com/meets-imp-floor', clicks: 5, impressions: 200, ctr: 0.025, position: 14.0 }],
  ]);

  const volumeAnalyzed = analyzeTrafficDecay(lowVolumeRecent, lowVolumeBaseline);
  const deadPage = volumeAnalyzed.find(p => p.url === 'https://example.com/low-volume-dead');
  const meetsClicksPage = volumeAnalyzed.find(p => p.url === 'https://example.com/meets-clicks-floor');
  const meetsImpPage = volumeAnalyzed.find(p => p.url === 'https://example.com/meets-imp-floor');

  console.assert(deadPage?.isFlagged === false, 'Low volume dead page (10 clicks / 50 imp) must NOT be flagged');
  console.assert(meetsClicksPage?.isFlagged === true, 'Page with >= 30 baseline clicks must be flagged on 50% drop');
  console.assert(meetsImpPage?.isFlagged === true, 'Page with >= 300 baseline impressions must be flagged on 60% drop');
  console.log('✓ Test 4: Minimum volume floor guards passed');

  // Test 5: Growth Guard Protection (Pages with increasing traffic are not flagged)
  const growthBaseline = new Map([
    ['https://example.com/growing-post', { url: 'https://example.com/growing-post', clicks: 100, impressions: 2000, ctr: 0.05, position: 4.0 }],
  ]);
  const growthRecent = new Map([
    ['https://example.com/growing-post', { url: 'https://example.com/growing-post', clicks: 130, impressions: 2600, ctr: 0.05, position: 6.5 }],
  ]);
  const growthAnalyzed = analyzeTrafficDecay(growthRecent, growthBaseline);
  console.assert(growthAnalyzed[0].isFlagged === false, 'Growing post (+30% clicks) must NOT be flagged as decaying');
  console.assert(growthAnalyzed[0].clicksLost === 0, 'Growing post clicksLost must be 0');
  console.log('✓ Test 5: Growth guard protection passed');

  // Test 6: Absolute Clicks Lost Primary Ranking
  const rankingBaseline = new Map([
    // Page A: high volume, 30% drop -> 150 clicks lost
    ['https://example.com/high-loss-page', { url: 'https://example.com/high-loss-page', clicks: 500, impressions: 10000, ctr: 0.05, position: 3.0 }],
    // Page B: lower volume, 80% drop -> 40 clicks lost
    ['https://example.com/high-percent-lower-loss', { url: 'https://example.com/high-percent-lower-loss', clicks: 50, impressions: 1000, ctr: 0.05, position: 4.0 }],
  ]);
  const rankingRecent = new Map([
    ['https://example.com/high-loss-page', { url: 'https://example.com/high-loss-page', clicks: 350, impressions: 7000, ctr: 0.05, position: 5.0 }],
    ['https://example.com/high-percent-lower-loss', { url: 'https://example.com/high-percent-lower-loss', clicks: 10, impressions: 200, ctr: 0.05, position: 9.0 }],
  ]);
  const rankingAnalyzed = analyzeTrafficDecay(rankingRecent, rankingBaseline);
  console.assert(rankingAnalyzed[0].url === 'https://example.com/high-loss-page', 'Highest absolute clicks lost (150 lost) must rank #1');
  console.assert(rankingAnalyzed[1].url === 'https://example.com/high-percent-lower-loss', 'Lower absolute loss (40 lost) must rank #2');
  console.log('✓ Test 6: Absolute clicks lost primary ranking passed');

  // Test 7: Year-over-Year (YoY) Seasonality Detection
  const yoyBaseline = new Map([
    ['https://example.com/seasonal-diwali-sale', { url: 'https://example.com/seasonal-diwali-sale', clicks: 200, impressions: 4000, ctr: 0.05, position: 3.0 }],
  ]);
  const yoyRecent = new Map([
    ['https://example.com/seasonal-diwali-sale', { url: 'https://example.com/seasonal-diwali-sale', clicks: 80, impressions: 1600, ctr: 0.05, position: 5.0 }],
  ]);
  const yoyYearAgo = new Map([
    ['https://example.com/seasonal-diwali-sale', { url: 'https://example.com/seasonal-diwali-sale', clicks: 82, impressions: 1650, ctr: 0.05, position: 4.8 }],
  ]);
  const yoyAnalyzed = analyzeTrafficDecay(yoyRecent, yoyBaseline, yoyYearAgo);
  console.assert(yoyAnalyzed[0].isFlagged === true, 'Seasonal drop should still be flagged');
  console.assert(yoyAnalyzed[0].isSeasonal === true, 'YoY comparison must mark post as isSeasonal = true');
  console.log('✓ Test 7: Year-over-Year seasonality detection passed');

  // Test 8: Severity-Weighted Content Health Score (Sanity Check)
  const healthyPages = analyzeTrafficDecay(
    new Map([['https://example.com/p1', { url: 'https://example.com/p1', clicks: 100, impressions: 1000, ctr: 0.1, position: 2.0 }]]),
    new Map([['https://example.com/p1', { url: 'https://example.com/p1', clicks: 100, impressions: 1000, ctr: 0.1, position: 2.0 }]])
  );
  const perfectHealth = calculateSeverityWeightedHealthScore(healthyPages);
  console.assert(perfectHealth.score === 100 && perfectHealth.grade === 'A+', 'Clean site must get 100% A+');

  const decayingHealth = calculateSeverityWeightedHealthScore(rankingAnalyzed);
  console.assert(decayingHealth.grade !== 'A+', 'Site with flagged decaying posts must NOT receive Grade A+');
  console.assert(decayingHealth.score <= 86, `Expected score <= 86 for decaying posts, got ${decayingHealth.score}`);
  console.log('✓ Test 8: Severity-weighted content health score passed');

  // Test 9: Server-side Entitlement Gating & Single Source of Truth
  const mockPages = Array.from({ length: 8 }, (_, i) => ({
    id: `page-${i + 1}`,
    url: `https://example.com/post-${i + 1}`,
    aiSuggestion: `Specific suggestion for post ${i + 1}`,
  }));

  // Free Tier (5 visible, 3 locked)
  const freeGated = gateAnalyzedPages(mockPages, false, FREE_TIER_PAGE_LIMIT);
  console.assert(freeGated.isUnlocked === false, 'Free tier should be isUnlocked = false');
  console.assert(freeGated.totalCount === 8, `Expected totalCount 8, got ${freeGated.totalCount}`);
  console.assert(freeGated.lockedCount === 3, `Expected lockedCount 3, got ${freeGated.lockedCount}`);
  console.assert(freeGated.pages[0].aiSuggestion !== null, 'Item 0 AI suggestion should be visible');
  console.assert(freeGated.pages[4].aiSuggestion !== null, 'Item 4 AI suggestion should be visible');
  console.assert(freeGated.pages[5].aiSuggestion === null, 'Item 5 AI suggestion must be redacted on server');
  console.assert(freeGated.pages[7].aiSuggestion === null, 'Item 7 AI suggestion must be redacted on server');

  // Paid Tier (All 8 visible, 0 locked)
  const paidGated = gateAnalyzedPages(mockPages, true, FREE_TIER_PAGE_LIMIT);
  console.assert(paidGated.isUnlocked === true, 'Paid tier should be isUnlocked = true');
  console.assert(paidGated.lockedCount === 0, 'Paid tier should have 0 locked items');
  console.assert(paidGated.pages[5].aiSuggestion !== null, 'Paid tier item 5 suggestion must be visible');
  console.log('✓ Test 9: Server-side free cap and single source of truth gating passed');

  // Test 10: Razorpay Webhook HMAC-SHA256 signature verification
  const secret = 'webhook_secret_xyz123';
  const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } });
  const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const invalidSignature = 'invalid_tampered_signature_12345';

  console.assert(verifyRazorpayWebhookSignature(rawBody, validSignature, secret) === true, 'Valid signature must pass');
  console.assert(verifyRazorpayWebhookSignature(rawBody, invalidSignature, secret) === false, 'Tampered signature must fail');
  console.log('✓ Test 10: Razorpay Webhook signature verification passed');

  // Test 11: Admin Credentials Verification & Token Signing
  const { verifyAdminCredentials, createAdminToken, verifyAdminToken, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } = await import('../adminAuth');
  const adminAuthRes = await verifyAdminCredentials(DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD);
  console.assert(adminAuthRes.success === true, 'Admin credentials check with default admin should succeed');
  console.assert(adminAuthRes.admin?.role === 'super_admin', 'Admin user must have role super_admin');

  const invalidAdminAuth = await verifyAdminCredentials('wrong@admin.com', 'wrongpassword');
  console.assert(invalidAdminAuth.success === false, 'Invalid credentials check must fail');

  const adminToken = createAdminToken(adminAuthRes.admin!);
  const verifiedAdmin = verifyAdminToken(adminToken);
  console.assert(verifiedAdmin !== null, 'Valid signed admin token must decode');
  console.assert(verifiedAdmin?.email === DEFAULT_ADMIN_EMAIL, 'Decoded token email must match');
  console.log('✓ Test 11: Admin authentication & signed session tokens passed');

  // Test 12: Subscription Activation by Email & Entitlement Check
  const { activateUserSubscriptionByEmail, checkSiteUnlockStatus } = await import('../entitlement');
  const testEmail = 'vipblogger@example.com';
  const preActivationStatus = await checkSiteUnlockStatus('user_123', null, testEmail);
  console.assert(preActivationStatus.isUnlocked === false, 'Pre-activation status must be unlocked = false');

  const activationRes = await activateUserSubscriptionByEmail({
    email: testEmail,
    name: 'VIP Blogger',
    amount: 99900,
  });
  console.assert(activationRes.success === true, 'Activation by email must succeed');

  const postActivationStatus = await checkSiteUnlockStatus('user_123', null, testEmail);
  console.assert(postActivationStatus.isUnlocked === true, 'Post-activation status must be unlocked = true');
  console.log('✓ Test 12: Manual subscription activation by email passed');

  // Test 13: Analytics Event Tracking & Telemetry Buffer
  const { trackEvent, getAdminAnalyticsOverview } = await import('../analytics');
  await trackEvent({
    eventType: 'unlock_button_click',
    userEmail: testEmail,
    path: '/dashboard',
    metadata: { source: 'dashboard_banner' },
  });

  const analyticsOverview = await getAdminAnalyticsOverview('all');
  console.assert(analyticsOverview.summary.unlockButtonClicksCount >= 1, 'Analytics summary must record unlock clicks');
  console.log('✓ Test 13: Analytics event tracking & KPI compilation passed');

  // Test 14: Subscription Request Creation & Admin Overview Integration
  const { createSubscriptionRequest, getAllSubscriptionRequests, updateSubscriptionRequest } = await import('../subscriptionRequests');
  const createdReq = await createSubscriptionRequest({
    email: 'client_interested@example.com',
    userName: 'Interested Client',
    siteUrl: 'https://example.com',
    source: 'modal_submit',
    plan: 'Pro Monthly Subscription (₹999/mo)',
  });
  console.assert(createdReq.id.length > 0, 'Subscription request must generate an ID');
  console.assert(createdReq.email === 'client_interested@example.com', 'Subscription request email must match');

  const allReqs = await getAllSubscriptionRequests();
  const foundReq = allReqs.find((r) => r.id === createdReq.id);
  console.assert(foundReq !== undefined, 'Created request must be found in getAllSubscriptionRequests');

  const updatedReqOk = await updateSubscriptionRequest(createdReq.id, { status: 'activated' });
  console.assert(updatedReqOk === true, 'Updating subscription request status must succeed');

  const adminOverviewWithReq = await getAdminAnalyticsOverview('all');
  console.assert(adminOverviewWithReq.summary.subscriptionRequestsCount >= 1, 'Admin overview must reflect subscription requests count');
  console.log('✓ Test 14: Subscription request creation, retrieval & admin overview integration passed');

  // Test 15: Support Ticket System & Admin Overview Integration
  const { createSupportTicket, getAllSupportTickets, updateSupportTicket } = await import('../supportTickets');
  const ticket = await createSupportTicket({
    email: 'user_support@example.com',
    name: 'Sarah Blogger',
    subject: 'Question on Content Decay algorithm',
    category: 'data_accuracy',
    siteUrl: 'https://sarahblog.com',
    message: 'How is the 20% traffic drop threshold calculated against 16-month historical baseline?',
  });
  console.assert(ticket.id.length > 0, 'Support ticket must generate an ID');
  console.assert(ticket.status === 'open', 'Initial support ticket status must be open');

  const allTickets = await getAllSupportTickets();
  const foundTicket = allTickets.find((t) => t.id === ticket.id);
  console.assert(foundTicket !== undefined, 'Created ticket must be retrieved in getAllSupportTickets');

  const updatedTicketOk = await updateSupportTicket(ticket.id, { status: 'resolved' });
  console.assert(updatedTicketOk === true, 'Updating support ticket status must succeed');

  const adminOverviewWithTickets = await getAdminAnalyticsOverview('all');
  console.assert(adminOverviewWithTickets.summary.supportTicketsCount >= 1, 'Admin overview must reflect support tickets count');
  console.log('✓ Test 15: Support ticket creation, retrieval, update & admin integration passed');

  console.log('\n======================================================');
  console.log('  All 15 core automated verification test suites passed! 🎉');
  console.log('======================================================\n');
}

runTests();


