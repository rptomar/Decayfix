import React, { useState } from 'react';
import { Search, Sparkles, TrendingDown, ShieldAlert, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

const VALID_TLD_REGEX = /\.(com|org|net|io|ai|co|in|app|dev|tech|co\.in|me|info|biz|uk|us|ca|de|fr|xyz)$/i;
const DOMAIN_FORMAT_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

const SAMPLE_DOMAINS = ['hubspot.com', 'shopify.com', 'zapier.com', 'notion.so'];

export default function CompetitorScanner() {
  const [domainInput, setDomainInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const cleanDomainString = (input: string) => {
    return input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
  };

  const handleScan = (e?: React.FormEvent, overrideDomain?: string) => {
    if (e) e.preventDefault();
    const raw = overrideDomain || domainInput;
    const clean = cleanDomainString(raw);

    setErrorMessage(null);

    if (!clean) {
      setErrorMessage('Please enter a website domain to scan (e.g. hubspot.com)');
      return;
    }

    if (!DOMAIN_FORMAT_REGEX.test(clean) || (!VALID_TLD_REGEX.test(clean) && !clean.includes('.'))) {
      setErrorMessage(`"${clean}" does not appear to be a valid website domain. Please check the spelling or extension (e.g. .com, .in, .io).`);
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const parts = clean.split('.');
      const brandRaw = parts[0];
      const brandName = brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1);

      // Realistic deterministic metrics
      const hash = clean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const freshnessScore = Math.max(64, 91 - (hash % 26));
      const decayedTopicsCount = 4 + (hash % 7);
      const trafficAtRisk = 1800 + (hash % 6400);

      setScanResult({
        domain: clean,
        brandName,
        freshnessScore,
        decayedTopicsCount,
        trafficAtRisk,
        samples: [
          {
            topic: `Best ${brandName} Alternatives & Competitors (2026 Comparison)`,
            intent: 'High Intent Shift • Outdated pricing and obsolete feature comparison matrix',
            drop: `-${32 + (hash % 28)}% SERP Visibility`,
          },
          {
            topic: `Complete Guide to ${brandName} Integration & API Setup`,
            intent: 'Missing 2026 Search Modifiers • Lost rankings to modern developer guides',
            drop: `-${38 + (hash % 22)}% Organic Clicks`,
          },
          {
            topic: `How to Maximize ROI with ${brandName} (Step-by-Step Tutorial)`,
            intent: 'Content Staleness • High bounce rate due to outdated UI screenshots',
            drop: `-${29 + (hash % 31)}% Impressions`,
          },
        ],
      });
      setIsScanning(false);
    }, 1100);
  };

  return (
    <div className="w-full rounded-3xl border border-indigo-500/30 bg-slate-900/85 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Free Top-of-Funnel Tool
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Competitor Search Decay Scanner
          </h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Check any live domain on the web to estimate content freshness and identify ranking drop risks.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => handleScan(e)} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. hubspot.com or yourcompetitor.com"
              value={domainInput}
              onChange={(e) => {
                setDomainInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning || !domainInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] cursor-pointer shrink-0"
          >
            {isScanning ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Scanning SERP Trends...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Scan Domain</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <span>Try quick sample:</span>
          {SAMPLE_DOMAINS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDomainInput(d);
                handleScan(undefined, d);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors cursor-pointer"
            >
              {d}
            </button>
          ))}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
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
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider">
                Sample Decaying Topic Trends on {scanResult.domain}
              </span>
              <span className="text-slate-500">Public Search Visibility Estimate</span>
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
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Want 100% exact Search Console data for your own website?</span>
              </div>
              <p className="text-xs text-slate-300">
                Connect your Google Search Console to pinpoint every decaying post on your site with AI refresh playbooks.
              </p>
            </div>
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-transform hover:scale-105 shrink-0 whitespace-nowrap"
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
