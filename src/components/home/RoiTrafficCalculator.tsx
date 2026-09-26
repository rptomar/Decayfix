import React, { useState } from 'react';
import { DollarSign, TrendingDown, Sparkles, ArrowRight, Zap, Calculator } from 'lucide-react';

const BUSINESS_MODELS = [
  { id: 'saas', name: 'SaaS / Tech (B2B)', valuePer1k: 120, label: '$120 / 1k visits' },
  { id: 'ecom', name: 'eCommerce & D2C', valuePer1k: 85, label: '$85 / 1k visits' },
  { id: 'leads', name: 'Agencies & Service', valuePer1k: 150, label: '$150 / 1k visits' },
  { id: 'media', name: 'Publishers & Blogs', valuePer1k: 35, label: '$35 / 1k visits' },
];

export default function RoiTrafficCalculator() {
  const [monthlyVisitors, setMonthlyVisitors] = useState(45000);
  const [selectedModel, setSelectedModel] = useState(BUSINESS_MODELS[0]);

  // Industry average: 22% of total site traffic suffers silent decay without automated monitoring
  const estimatedDecayPercent = 22;
  const monthlyClicksLost = Math.round((monthlyVisitors * estimatedDecayPercent) / 100);
  const annualClicksLost = monthlyClicksLost * 12;
  const annualRevenueLost = Math.round((annualClicksLost / 1000) * selectedModel.valuePer1k);
  const recoveredAnnualRevenue = Math.round(annualRevenueLost * 0.75); // 75% average recovery rate with AI refresh

  return (
    <div className="w-full rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-slate-900/90 via-slate-950/90 to-slate-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="relative z-10 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Calculator className="w-3.5 h-3.5" /> 2026 Interactive Traffic & ROI Calculator
          </div>
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            How Much Revenue is Your Website <span className="text-rose-400">Silently Losing</span> to Content Decay?
          </h3>
          <p className="text-sm text-slate-400">
            Content decay happens quietly. Google shifts rankings to competitors while outdated stats, missing subtopics, and broken search intent drain your organic traffic.
          </p>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          {/* Left Inputs */}
          <div className="lg:col-span-6 space-y-6 bg-slate-950/60 p-6 sm:p-7 rounded-2xl border border-slate-800">
            {/* Monthly Traffic Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-300">Monthly Organic Visitors</span>
                <span className="text-lg font-bold text-indigo-400">
                  {monthlyVisitors.toLocaleString()} <span className="text-xs text-slate-500 font-normal">clicks/mo</span>
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="300000"
                step="5000"
                value={monthlyVisitors}
                onChange={(e) => setMonthlyVisitors(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>5k visits</span>
                <span>100k</span>
                <span>200k</span>
                <span>300k+ visits</span>
              </div>
            </div>

            {/* Business Model Selector */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-300">
                Your Business Model / Website Type
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {BUSINESS_MODELS.map((model) => {
                  const isSelected = selectedModel.id === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model)}
                      className={`p-3 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-950/40 text-white font-bold shadow-md shadow-indigo-500/10'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-semibold">{model.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{model.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Live Results Card */}
          <div className="lg:col-span-6 space-y-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-6 sm:p-7 rounded-2xl border border-indigo-500/30 relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/20">
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  <span>Annual Traffic At Risk</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">
                  -{annualClicksLost.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  ~{monthlyClicksLost.toLocaleString()} lost / month
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/20">
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                  <span>Silent Revenue Lost</span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">
                  ${annualRevenueLost.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Per year in missed conversions
                </div>
              </div>
            </div>

            {/* Reclaim Box */}
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" /> Reclaimable with DecayFix
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-0.5">
                  +${recoveredAnnualRevenue.toLocaleString()} / year
                </div>
              </div>
              <div className="text-right text-xs text-slate-400 hidden sm:block">
                3x faster ROI than<br />writing new articles
              </div>
            </div>

            {/* CTA button */}
            <a
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <span>Scan Your Website Free (Top 5 Preview)</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
