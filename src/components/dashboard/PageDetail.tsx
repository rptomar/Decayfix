import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Lock, 
  TrendingDown, 
  MousePointer, 
  Eye, 
  CheckCircle2, 
  ArrowUpRight,
  ExternalLink 
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface PageData {
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
  isLocked: boolean;
}

interface Props {
  pageData: PageData;
  isUnlocked: boolean;
  razorpayKeyId: string;
  userEmail?: string | null;
  userName?: string | null;
}

export default function PageDetail({
  pageData,
  isUnlocked: initialIsUnlocked,
  razorpayKeyId,
  userEmail,
  userName,
}: Props) {
  const [isUnlocked, setIsUnlocked] = useState(initialIsUnlocked);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(pageData.aiSuggestion);

  useEffect(() => {
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleUnlock = async () => {
    setPaymentLoading(true);
    try {
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to initialize order');

      if (window.Razorpay && !orderData.isMock) {
        const options = {
          key: orderData.keyId || razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'DecayFix',
          description: 'Full Report Unlock',
          order_id: orderData.orderId,
          prefill: { name: userName || '', email: userEmail || '' },
          theme: { color: '#4f46e5' },
          handler: async function (res: any) {
            await fetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(res),
            });
            setIsUnlocked(true);
            window.location.reload();
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        await fetch('/api/billing/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: 'dev_mock_sig',
          }),
        });
        setIsUnlocked(true);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const isLocked = pageData.isLocked && !isUnlocked;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Back Link */}
      <div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </a>
      </div>

      {/* Page Header */}
      <div className="space-y-3 pb-6 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
            -{pageData.dropPercentClicks}% Clicks
          </span>
          {pageData.dropPercentImpressions > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium">
              -{pageData.dropPercentImpressions}% Impressions
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {pageData.title}
        </h1>

        <a
          href={pageData.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-mono break-all"
        >
          <span>{pageData.url}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
      </div>

      {/* If server-side locked */}
      {isLocked ? (
        <div className="rounded-2xl border-2 border-indigo-500/80 bg-slate-900/90 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white">Full Report Required</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              This page is beyond your free preview (top 5). Unlock the full report to access detailed traffic loss metrics and Claude AI refresh suggestions.
            </p>
          </div>

          <button
            onClick={handleUnlock}
            disabled={paymentLoading}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            {paymentLoading ? 'Processing...' : 'Unlock Full Report • ₹999'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Traffic Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Clicks comparison */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5 text-rose-400" /> Search Clicks
                </span>
                <span className="text-rose-400 font-bold">-{pageData.dropPercentClicks}%</span>
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <div className="text-xs text-slate-500">8-Wk Baseline</div>
                  <div className="text-2xl font-black text-slate-200">{pageData.baselineClicks}</div>
                </div>
                <div className="text-slate-600 font-bold">→</div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Recent 8-Wk</div>
                  <div className="text-2xl font-black text-rose-400">{pageData.recentClicks}</div>
                </div>
              </div>
            </div>

            {/* Impressions comparison */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-amber-400" /> Impressions
                </span>
                <span className="text-amber-400 font-bold">-{pageData.dropPercentImpressions}%</span>
              </div>

              <div className="flex items-baseline justify-between pt-2">
                <div>
                  <div className="text-xs text-slate-500">8-Wk Baseline</div>
                  <div className="text-2xl font-black text-slate-200">{pageData.baselineImpressions}</div>
                </div>
                <div className="text-slate-600 font-bold">→</div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Recent 8-Wk</div>
                  <div className="text-2xl font-black text-amber-400">{pageData.recentImpressions}</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Suggestion Card */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <Sparkles className="w-4 h-4" />
              <span>Claude AI Action Plan for Content Refresh</span>
            </div>

            <p className="text-slate-200 leading-relaxed text-sm sm:text-base">
              {suggestion || 'Refresh outdated dates, verify search intent match against top 3 ranking competitors, and add FAQ structured points.'}
            </p>
          </div>

          {/* Refresh Checklist */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-4">
            <h3 className="text-base font-bold text-white">Recommended Refresh Checklist</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">Update Outdated References</strong>
                  <span className="text-xs text-slate-400">Replace expired tool versions, outdated statistics, and non-working links.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">Enhance Search Intent</strong>
                  <span className="text-xs text-slate-400">Review Google SERP for related queries and add missing subheadings.</span>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">Internal Linking Boost</strong>
                  <span className="text-xs text-slate-400">Add 2–3 contextual internal links from your newly published blog posts pointing back to this URL.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
