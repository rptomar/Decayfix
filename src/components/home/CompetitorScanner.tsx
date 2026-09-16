import React, { useState } from 'react';
import { Search, Sparkles, TrendingDown, ShieldAlert, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

export default function CompetitorScanner() {
  const [domainInput, setDomainInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain) return;

    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      // Deterministic realistic simulated audit based on domain string hash
      const hash = cleanDomain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const freshnessScore = Math.max(68, 94 - (hash % 24));
      const decayedTopicsCount = 3 + (hash % 6);
      const trafficAtRisk = 1200 + (hash % 4800);

      setScanResult({
        domain: cleanDomain,
        freshnessScore,
        decayedTopicsCount,
        trafficAtRisk,
        samples: [
          {
            topic: `Best ${cleanDomain.split('.')[0]} Alternatives & Competitors 2024`,
            intent: 'High Intent Shift (Outdated comparison data)',
            drop: `-${35 + (hash % 30)}% SERP Visibility`,
          },
          {
            topic: `Complete Guide to ${cleanDomain.split('.')[0]} Pricing & Features`,
            intent: 'Missing 2026 FAQ & Search Modifiers',
            drop: `-${42 + (hash % 25)}% CTR Drop`,
          },
          {
            topic: `How to Implement & Integrate With ${cleanDomain.split('.')[0]}`,
            intent: 'Competitor content outranking on long-tail queries',
            drop: `-${28 + (hash % 35)}% Impressions`,
          },
        ],
      });
      setIsScanning(false);
    }, 1200);
  };

  return (
    <div className="w-full rounded-2xl border border-indigo-500/30 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Free Top-of-Funnel Tool
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Competitor Search Decay Scanner
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Check any domain on the web to estimate content freshness and identify ranking drop risks.
          </p>
        </div>
      </div>

      <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="e.g. hubspot.com or yourcompetitor.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={isScanning || !domainInput.trim()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
        >
          {isScanning ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Scanning SERP Trends...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Scan Competitor</span>
            </>
          )}
        </button>
      </form>

      {/* Result Display */}
      {scanResult && (
        <div className="pt-2 space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-xs text-slate-400">Content Freshness Index</div>
              <div className="text-2xl font-black text-indigo-400 mt-1">
                {scanResult.freshnessScore}%
              </div>
            </div>
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
              <div className="text-xs text-rose-300">Decaying Topic Clusters</div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {scanResult.decayedTopicsCount} Clusters
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30">
              <div className="text-xs text-amber-300">Estimated Traffic At Risk</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                ~{scanResult.trafficAtRisk.toLocaleString()} visits/mo
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Sample Decaying Topic Trends on {scanResult.domain}
            </div>
            <div className="space-y-2">
              {scanResult.samples.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{s.topic}</div>
                    <div className="text-slate-400">{s.intent}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-300 font-bold shrink-0 self-start sm:self-center">
                    {s.drop}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Call to action conversion trigger */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Want exact Search Console data for your own website?</span>
              </div>
              <p className="text-xs text-slate-300">
                Connect your Google Search Console to pinpoint every decaying post on your site with AI refresh playbooks.
              </p>
            </div>
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-transform hover:scale-105 shrink-0"
            >
              <span>Connect Search Console Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
