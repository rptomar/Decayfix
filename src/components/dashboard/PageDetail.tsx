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
  ExternalLink,
  Copy,
  Check,
  Search,
  Compass,
  FileText,
  AlertCircle
} from 'lucide-react';
import Sparkline from '@/components/common/Sparkline';
import SubscriptionRequestModal from '@/components/common/SubscriptionRequestModal';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface QueryItem {
  query: string;
  baselineClicks: number;
  recentClicks: number;
  clicksLost: number;
  baselinePosition: number;
  recentPosition: number;
  positionDelta: number;
  baselineImpressions: number;
  recentImpressions: number;
}

interface PageData {
  url: string;
  title: string;
  baselineClicks: number;
  baselineImpressions: number;
  recentClicks: number;
  recentImpressions: number;
  clicksLost?: number;
  dropPercentClicks: number;
  dropPercentImpressions: number;
  severityScore: number;
  aiSuggestion: string | null;
  topQueries?: QueryItem[];
  isFlagged: boolean;
  isLocked: boolean;
  isFreeDemo?: boolean;
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
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [suggestion, setSuggestion] = useState(pageData.aiSuggestion);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleUnlock = () => {
    setShowUnlockModal(true);
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'unlock_button_click',
        path: '/dashboard/page',
        metadata: { source: 'page_detail', url: pageData.url },
      }),
    }).catch(() => {});
  };

  const handleCopyPrompt = () => {
    const fullPrompt = `You are a top-tier SEO copywriter and technical content strategist.
I need to revamp a decaying URL on my site that has lost ${pageData.dropPercentClicks}% of its Google Search clicks (dropped from ${pageData.baselineClicks} to ${pageData.recentClicks} clicks over the recent 8-week window).

URL: ${pageData.url}
Title: ${pageData.title}
Decay Diagnosis: ${suggestion || 'Search intent divergence and outdated comparison data'}

Please generate a comprehensive, ready-to-publish content refresh:
1. High-CTR Meta Title (< 60 chars) & Compelling Meta Description (< 155 chars) with power action words.
2. An engaging revised Intro Hook (first 100 words) addressing current user pain points.
3. 3 New Headings (H2/H3) covering emerging topics competitors rank for.
4. 5 "People Also Ask" FAQ questions with concise, direct snippet answers.
5. Internal Linking suggestions with optimal anchor text.`;

    navigator.clipboard.writeText(fullPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2200);

    // Track AI prompt copy event
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'ai_suggestion_copy',
        path: '/dashboard/page',
        metadata: { url: pageData.url, title: pageData.title },
      }),
    }).catch(() => {});
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
            {paymentLoading ? 'Processing...' : 'Subscribe to Pro • ₹999/mo'}
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Free Demo Preview Badge */}
          {pageData.isFreeDemo && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base">🎁</span>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Free Live Demo: #1 Highest-Loss Decayed Page Fully Unlocked</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Explore full ranking drop metrics, query shifts, and the AI action playbook below.</p>
                </div>
              </div>
              <button
                onClick={handleUnlock}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 shadow-md cursor-pointer"
              >
                Subscribe to Pro • ₹999/mo
              </button>
            </div>
          )}

          {/* Traffic Metrics Grid with Sparkline Curve */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Clicks comparison */}
            <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <MousePointer className="w-3.5 h-3.5 text-rose-400" /> Search Clicks Trajectory
                </span>
                <span className="text-rose-400 font-bold">-{pageData.dropPercentClicks}%</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">8-Wk Baseline ➔ Recent</div>
                  <div className="text-2xl font-black text-white flex items-center gap-2">
                    <span className="text-slate-400">{pageData.baselineClicks}</span>
                    <span className="text-slate-600 text-sm">→</span>
                    <span className="text-rose-400">{pageData.recentClicks}</span>
                  </div>
                </div>
                <Sparkline
                  baselineClicks={pageData.baselineClicks}
                  recentClicks={pageData.recentClicks}
                  dropPercent={pageData.dropPercentClicks}
                  width={110}
                  height={34}
                />
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

          {/* AI Action Plan Card with 1-Click Prompt Exporter */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Action Plan for Content Refresh</span>
              </div>

              <button
                type="button"
                onClick={handleCopyPrompt}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-colors cursor-pointer self-start sm:self-auto"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Prompt Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt for Claude / ChatGPT</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-slate-200 leading-relaxed text-sm sm:text-base">
              {suggestion || 'Refresh outdated dates, verify search intent match against top 3 ranking competitors, and add FAQ structured points.'}
            </p>
          </div>

          {/* Top Declining Search Queries Table */}
          {pageData.topQueries && pageData.topQueries.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Search className="w-4 h-4 text-sky-400" />
                  <span>Top Declining Search Queries & Rank Shifts</span>
                </div>
                <span className="text-[11px] text-slate-400">Search Console Query Breakdown</span>
              </div>
              <div className="divide-y divide-slate-800">
                {pageData.topQueries.map((q) => (
                  <div key={q.query} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-white font-mono">{q.query}</span>
                      <div className="text-[11px] text-slate-400">
                        Avg Rank: <span className="text-slate-300 font-bold">{q.baselinePosition}</span> → <span className="text-rose-400 font-bold">{q.recentPosition}</span>
                        {q.positionDelta > 0 && <span className="text-rose-400 text-[10px] ml-1">({q.positionDelta} pos drop)</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-400">-{q.clicksLost} Clicks</span>
                      <div className="text-[10px] text-slate-500">{q.baselineClicks} → {q.recentClicks} clicks</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SERP Intent Shift Analyzer (Dynamic Query & Intent Insights) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Compass className="w-4 h-4 text-sky-400" />
                  <span>SERP Intent Shift Analyzer</span>
                </div>
                <p className="text-xs text-slate-400">
                  Search intent diagnosis and competitive ranking breakdown for this URL.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20 text-xs font-semibold self-start sm:self-auto">
                Live Analysis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Primary Query Movement */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>#1 Ranking Shift</span>
                </div>
                <div className="text-xs text-slate-200 font-semibold">
                  {pageData.topQueries && pageData.topQueries[0]
                    ? `Drop on "${pageData.topQueries[0].query}"`
                    : `Search Drop on "${pageData.title}"`}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {pageData.topQueries && pageData.topQueries[0]
                    ? `Average Google position shifted from rank ${pageData.topQueries[0].baselinePosition} to ${pageData.topQueries[0].recentPosition} (lost ${pageData.topQueries[0].clicksLost} search clicks to competing results).`
                    : `Page traffic dropped ${pageData.dropPercentClicks}% (${pageData.clicksLost || Math.max(0, pageData.baselineClicks - pageData.recentClicks)} lost clicks) compared to previous baseline window.`}
                </p>
              </div>

              {/* Card 2: Secondary Query or Intent Expansion */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>#2 Intent Opportunity</span>
                </div>
                <div className="text-xs text-slate-200 font-semibold">
                  {pageData.topQueries && pageData.topQueries[1]
                    ? `Target Query: "${pageData.topQueries[1].query}"`
                    : 'Targeted FAQ & PAA Schema'}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {pageData.topQueries && pageData.topQueries[1]
                    ? `Competitors are capturing clicks on "${pageData.topQueries[1].query}" (current position ${pageData.topQueries[1].recentPosition}). Add a dedicated H2 section addressing this exact search query.`
                    : `Inject structured FAQ markup answering "People Also Ask" questions related to ${pageData.title} to recapture lost impressions.`}
                </p>
              </div>

              {/* Card 3: Internal Authority Reinforcement */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>#3 Internal Authority</span>
                </div>
                <div className="text-xs text-slate-200 font-semibold">Inbound Internal Links</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Distribute page authority by routing 2–3 contextual in-content anchor links from your top-performing website pages directly to this URL.
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Refresh Checklist (Dynamic Actions) */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white">Recommended Refresh Checklist</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">
                    {pageData.topQueries && pageData.topQueries[0]
                      ? `Update Title & Meta for "${pageData.topQueries[0].query}"`
                      : `Update Title Tag & Meta Description`}
                  </strong>
                  <span className="text-xs text-slate-400">
                    Include high-CTR action words and current year modifiers to increase organic search click-through rate.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">
                    Add Competitor Subtopics & Comparison Tables
                  </strong>
                  <span className="text-xs text-slate-400">
                    Audit the top 3 ranking Google results for {pageData.title} to cover missing subheadings, pricing ranges, and case studies.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block font-medium">
                    Internal Linking Authority Boost
                  </strong>
                  <span className="text-xs text-slate-400">
                    Add 2–3 contextual links with descriptive anchor text from newly published or high-traffic pages pointing directly to this URL.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Maintenance Modal */}
      <SubscriptionRequestModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        userEmail={userEmail}
        userName={userName}
        siteUrl={pageData.url}
        source="page_detail"
      />
    </div>
  );
}
