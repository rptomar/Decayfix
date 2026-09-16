import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ArrowDownRight, 
  Sparkles, 
  Lock, 
  ExternalLink, 
  RefreshCw, 
  Globe, 
  CheckCircle2, 
  TrendingDown,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface PageItem {
  id?: string;
  url: string;
  title: string;
  baselineClicks: number;
  baselineImpressions: number;
  recentClicks: number;
  recentImpressions: number;
  dropPercentClicks: number;
  dropPercentImpressions: number;
  severityScore: number;
  aiSuggestion: string | null;
  isFlagged: boolean;
  isLocked?: boolean;
}

interface SiteItem {
  id: string;
  siteUrl: string;
  lastSyncedAt?: string | null;
}

interface Props {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  initialSites: SiteItem[];
  initialActiveSiteUrl?: string;
  isUnlocked: boolean;
  razorpayKeyId: string;
}

export default function DashboardApp({
  user,
  initialSites,
  initialActiveSiteUrl,
  isUnlocked: initialIsUnlocked,
  razorpayKeyId,
}: Props) {
  const [sites, setSites] = useState<SiteItem[]>(initialSites);
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<string>(
    initialActiveSiteUrl || (initialSites[0]?.siteUrl ?? '')
  );
  const [customSiteInput, setCustomSiteInput] = useState('https://godamwala.com/');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<PageItem[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(initialIsUnlocked);
  const [lockedCount, setLockedCount] = useState(0);
  const [totalFlagged, setTotalFlagged] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);
  const [factIndex, setFactIndex] = useState(0);

  const SEO_FACTS = [
    { icon: '💡', title: 'Quick Win', text: 'Updating outdated statistics & dates on decaying URLs can recover 40–70% of lost search traffic in under 3 weeks.' },
    { icon: '🎯', title: 'CTR Boost', text: 'Refreshing your Meta Title and H1 with high-intent modifiers can improve organic CTR by up to 28% without any backlink changes.' },
    { icon: '⚡', title: 'Helpful Content', text: 'Adding an actionable FAQ section targeting "People Also Ask" queries directly defends your rankings against competitors.' },
    { icon: '📈', title: 'Internal Linking', text: 'Pointing 2-3 internal links from your highest-traffic pages to decaying posts passes immediate authority and signals freshness.' },
    { icon: '🔍', title: 'Intent Shift', text: 'A >50% drop in impressions usually indicates a shift in search intent—audit top 3 current ranking pages to see newly covered subtopics.' },
  ];

  // Rotate SEO facts & progress steps during analysis
  useEffect(() => {
    let factInterval: any;
    let stepInterval: any;

    if (analyzing) {
      setAnalysisStep(1);
      factInterval = setInterval(() => {
        setFactIndex((prev) => (prev + 1) % SEO_FACTS.length);
      }, 2600);

      stepInterval = setInterval(() => {
        setAnalysisStep((prev) => (prev < 4 ? prev + 1 : prev));
      }, 700);
    }

    return () => {
      if (factInterval) clearInterval(factInterval);
      if (stepInterval) clearInterval(stepInterval);
    };
  }, [analyzing]);

  // Load Razorpay Checkout script dynamically & fetch live GSC properties
  useEffect(() => {
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Auto-fetch verified Search Console sites
    const fetchGscProperties = async () => {
      try {
        const res = await fetch('/api/sites');
        if (res.ok) {
          const data = await res.json();
          if (data.sites && data.sites.length > 0) {
            setSites(data.sites);
            if (!selectedSiteUrl) {
              setSelectedSiteUrl(data.sites[0].siteUrl);
            }
          }
        }
      } catch (e) {
        console.warn('Could not auto-fetch GSC properties:', e);
      }
    };
    fetchGscProperties();
  }, []);

  const handleRunAnalysis = async (siteToAnalyze?: string) => {
    let url = siteToAnalyze || selectedSiteUrl || customSiteInput;
    if (!url || url.trim() === '') {
      setErrorMsg('Please enter a website URL (e.g. https://godamwala.com or godamwala.com).');
      return;
    }

    url = url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('sc-domain:')) {
      url = `https://${url}`;
    }

    console.log('[DecayFix] Running analysis on site:', url);
    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete analysis');
      }

      console.log('[DecayFix] Analysis results received:', data);
      setAnalysisResults(data.results || []);
      setTotalFlagged(data.totalFlaggedCount || 0);
      setLockedCount(data.lockedCount || 0);
      setIsUnlocked(data.isUnlocked || false);
      setHasRunAnalysis(true);
    } catch (err: any) {
      console.error('[DecayFix] Analysis error:', err);
      setErrorMsg(err.message || 'An error occurred during analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCheckout = async () => {
    setPaymentLoading(true);
    setErrorMsg(null);

    try {
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteUrl: selectedSiteUrl || customSiteInput }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Could not initiate checkout');
      }

      if (window.Razorpay && !orderData.isMock) {
        const options = {
          key: orderData.keyId || razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'DecayFix',
          description: 'Full Site Content Decay Report Unlock',
          order_id: orderData.orderId,
          prefill: {
            name: user.name || '',
            email: user.email || '',
          },
          theme: {
            color: '#4f46e5',
          },
          handler: async function (response: any) {
            const verifyRes = await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                siteUrl: selectedSiteUrl || customSiteInput,
              }),
            });

            if (verifyRes.ok) {
              setIsUnlocked(true);
              setPaymentSuccess(true);
              handleRunAnalysis();
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const verifyRes = await fetch('/api/billing/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: 'dev_mock_signature',
            siteUrl: selectedSiteUrl || customSiteInput,
          }),
        });

        if (verifyRes.ok) {
          setIsUnlocked(true);
          setPaymentSuccess(true);
          handleRunAnalysis();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment initiation failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Top Header & User Identity */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>Site Decay Dashboard</span>
            {isUnlocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" /> Full Report Unlocked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                Free Preview (Top 5)
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-400">
              Analyzing 16-month Search Console metrics with a 20%+ decay threshold.
            </p>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-400">by <a href="https://sprintlabs.ai" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline font-semibold">SprintLabs.ai</a></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/billing"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            Billing & Receipt
          </a>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Payment Success Alert */}
      {paymentSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">
              Payment confirmed! All decaying posts and Claude AI suggestions are permanently unlocked.
            </span>
          </div>
          <button
            onClick={() => setPaymentSuccess(false)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Site Selector & Analysis Action Island */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleRunAnalysis();
        }}
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1 space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-sky-400" />
              Connected Google Search Console Property
            </label>

            {sites.length > 0 ? (
              <select
                value={selectedSiteUrl}
                onChange={(e) => {
                  setSelectedSiteUrl(e.target.value);
                  setCustomSiteInput(e.target.value);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              >
                {sites.map((site) => (
                  <option key={site.siteUrl} value={site.siteUrl}>
                    {site.siteUrl.startsWith('sc-domain:')
                      ? `🌐 ${site.siteUrl.replace('sc-domain:', '')} (Domain Property)`
                      : `🔗 ${site.siteUrl}`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://yourblog.com"
                  value={customSiteInput}
                  onChange={(e) => setCustomSiteInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={analyzing}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Analyzing Search Data...' : 'Analyze My Site'}</span>
          </button>
        </div>
      </form>

      {/* Results Section */}
      {hasRunAnalysis && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="text-xs text-slate-400 font-medium">Pages Analyzed</div>
              <div className="text-2xl font-black text-white mt-1">{analysisResults.length}</div>
            </div>

            <div className="p-5 rounded-xl border border-rose-500/30 bg-rose-950/20">
              <div className="text-xs text-rose-300 font-medium flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Decaying Posts (≥20% Drop)
              </div>
              <div className="text-2xl font-black text-rose-400 mt-1">{totalFlagged}</div>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="text-xs text-slate-400 font-medium">Report Status</div>
              <div className="text-2xl font-black text-white mt-1">
                {isUnlocked ? (
                  <span className="text-emerald-400 text-lg font-bold">Full Unlock Active</span>
                ) : (
                  <span className="text-amber-400 text-lg font-bold">5 of {totalFlagged} Visible</span>
                )}
              </div>
            </div>
          </div>

          {/* Upsell Banner for Free Users */}
          {!isUnlocked && lockedCount > 0 && (
            <div className="rounded-2xl border-2 border-indigo-500/80 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                  <Lock className="w-3 h-3" /> One-Time Unlock
                </div>
                <h3 className="text-xl font-bold text-white">
                  Unlock all {lockedCount} remaining decaying posts & AI action plans
                </h3>
                <p className="text-sm text-slate-300 max-w-xl">
                  Get full traffic drop breakdowns and Claude AI content refresh recommendations for every post on your site.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={paymentLoading}
                className="shrink-0 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
              >
                {paymentLoading ? 'Processing...' : 'Unlock Full Report • ₹999'}
              </button>
            </div>
          )}

          {/* Table / List of Flagged Pages */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Flagged Decaying Posts (Ranked by Severity)
              </span>
              <span className="text-xs text-slate-400">
                Sorted by highest lost clicks & % drop
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {analysisResults.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-semibold text-white">Great news! No severe decay detected.</p>
                  <p className="text-xs mt-1">All pages are maintaining their 8-week baseline traffic.</p>
                </div>
              ) : (
                analysisResults.map((page, index) => {
                  const isLockedItem = page.isLocked;

                  return (
                    <div
                      key={page.url}
                      className={`p-6 transition-colors ${
                        isLockedItem
                          ? 'bg-slate-950/40 relative select-none'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                        {/* Page Info & AI Suggestion */}
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                              -{page.dropPercentClicks}% Clicks
                            </span>
                            {page.dropPercentImpressions > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-medium">
                                -{page.dropPercentImpressions}% Impressions
                              </span>
                            )}
                            <span className="text-xs text-slate-400 font-mono break-all">
                              {page.url}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-white">
                            {page.title}
                          </h3>

                          {/* Claude AI Suggestion Box */}
                          {isLockedItem ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="text-xs text-slate-400 font-medium filter blur-[3px]">
                                  Update key search intent, refresh the outdated 2024 comparisons, and rewrite the meta description with high-CTR power keywords.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={handleCheckout}
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 shrink-0 cursor-pointer"
                              >
                                Unlock →
                              </button>
                            </div>
                          ) : (
                            page.aiSuggestion && (
                              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 text-xs text-slate-200 space-y-1">
                                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold mb-1">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>AI Recommendation</span>
                                </div>
                                <p className="leading-relaxed">{page.aiSuggestion}</p>
                              </div>
                            )
                          )}
                        </div>

                        {/* Metrics Column & Detail Button */}
                        <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Baseline vs Recent Clicks</div>
                            <div className="text-sm font-bold">
                              <span className="text-slate-400">{page.baselineClicks}</span>
                              <span className="text-slate-600 mx-1.5">→</span>
                              <span className="text-rose-400">{page.recentClicks}</span>
                            </div>
                          </div>

                          {!isLockedItem ? (
                            <a
                              href={`/dashboard/page/${encodeURIComponent(page.url)}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                            >
                              <span>View Detail</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={handleCheckout}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-medium text-indigo-300 border border-indigo-500/30 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interactive Analyzing State */}
      {analyzing && (
        <div className="rounded-2xl border border-indigo-500/40 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-6">
          {/* Top Header & Pulse */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Running Live Google Search Console Audit</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Target Property: <span className="text-sky-400 font-mono font-medium">{selectedSiteUrl || customSiteInput}</span>
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-xs text-indigo-300 font-medium border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Fast Parallel AI Engine</span>
            </div>
          </div>

          {/* 4-Step Animated Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { num: 1, title: 'Auth & Handshake', desc: 'Google Search Console verified' },
              { num: 2, title: 'Fetch 16-Mo Metrics', desc: 'Baseline vs 8-week data' },
              { num: 3, title: 'Decay Detection', desc: 'Filtering ≥20% traffic drops' },
              { num: 4, title: 'AI Action Plans', desc: 'Generating recovery playbooks' },
            ].map((st) => {
              const isDone = analysisStep > st.num;
              const isCurrent = analysisStep === st.num;

              return (
                <div
                  key={st.num}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : isCurrent
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 scale-[1.02]'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 text-[10px] flex items-center justify-center shrink-0">
                        {st.num}
                      </div>
                    )}
                    <span className="text-xs font-bold">{st.title}</span>
                  </div>
                  <p className="text-[11px] opacity-75">{st.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Rotating SEO Pro-Tip Card */}
          <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-start gap-4 shadow-inner">
            <span className="text-2xl shrink-0">{SEO_FACTS[factIndex].icon}</span>
            <div className="space-y-1">
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                <span>SEO Pro-Tip</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-normal">{SEO_FACTS[factIndex].title}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {SEO_FACTS[factIndex].text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Initial Empty State before running analysis */}
      {!hasRunAnalysis && !analyzing && (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            ⚡
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Ready to run your content decay audit</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Click "Analyze My Site" above to compare your recent 8-week performance with your 16-month baseline across all 140+ URLs.
          </p>
          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            <span>{analyzing ? 'Analyzing...' : 'Analyze My Site Now'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
