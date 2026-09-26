import React, { useState } from 'react';
import { ArrowUpRight, TrendingDown, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, BarChart2, ShieldCheck } from 'lucide-react';

export default function DecaySimulator() {
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');

  return (
    <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Interactive 2026 Case Study
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            See the Power of an AI-Driven Content Refresh
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Toggle between the decaying state and the revived state to see how DecayFix restores rankings.
          </p>
        </div>

        {/* State Toggle Buttons */}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('before')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'before'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>1. Decaying State (Before)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('after')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'after'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>2. Revived with DecayFix (After)</span>
          </button>
        </div>
      </div>

      {/* Simulator Body */}
      <div className="pt-8">
        {activeTab === 'before' ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs text-slate-500">Google SERP Rank</div>
                <div className="text-2xl font-black text-rose-400 mt-1 flex items-center gap-1">
                  <span>#14</span>
                  <span className="text-xs text-rose-500 font-bold">(Fell from #2)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs text-slate-500">Recent Monthly Traffic</div>
                <div className="text-2xl font-black text-rose-400 mt-1 flex items-center gap-1">
                  <span>140 clicks</span>
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs text-slate-500">Historical Peak Baseline</div>
                <div className="text-2xl font-black text-slate-300 mt-1">
                  820 clicks
                </div>
              </div>
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
                <div className="text-xs text-rose-300 font-semibold">Traffic Drop Rate</div>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  -82.9% Drop
                </div>
              </div>
            </div>

            {/* Diagnostic Card */}
            <div className="p-5 rounded-2xl bg-rose-950/10 border border-rose-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">Diagnosed Decay Issues</span>
                  <span className="text-xs font-mono text-slate-400">/guide/best-crm-software</span>
                </div>
                <span className="text-xs text-rose-400 font-semibold">Decaying since 4 months</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold mt-0.5">✕</span>
                  <span><strong>Outdated 2023 Pricing Tables:</strong> Competitor software has changed tiers; user bounce rate spiked to 74%.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold mt-0.5">✕</span>
                  <span><strong>Missing AI Workflow Entities:</strong> 2026 searchers query for "AI automation integration", completely absent from this article.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold mt-0.5">✕</span>
                  <span><strong>Lost Snippet:</strong> Google removed featured snippet due to lack of structured FAQ schema.</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            {/* Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="text-xs text-emerald-300 font-semibold">Google SERP Rank</div>
                <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1">
                  <span>#1</span>
                  <span className="text-xs text-emerald-400 font-bold">(+13 positions)</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs text-slate-500">Revived Monthly Traffic</div>
                <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1">
                  <span>940 clicks</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs text-slate-500">Recovery Turnaround</div>
                <div className="text-2xl font-black text-indigo-400 mt-1">
                  12 Days
                </div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                <div className="text-xs text-emerald-300 font-semibold">Traffic Surge</div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  +571% Lift
                </div>
              </div>
            </div>

            {/* AI Action Applied */}
            <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> DecayFix AI Playbook Executed
                  </span>
                  <span className="text-xs font-mono text-slate-400">/guide/best-crm-software</span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ranking Protected
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Updated Comparative Matrix:</strong> Integrated modern 2026 feature rubrics and verified live pricing tables.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Embedded 2026 Long-Tail Modifiers:</strong> Added missing sections covering AI automation, webhooks, and modern CRM stack setups.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Reclaimed Featured Snippet:</strong> Added structured FAQ answer blocks answering top intent queries.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
