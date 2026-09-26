import React, { useState } from 'react';
import { Laptop, ShoppingBag, Briefcase, Newspaper, CheckCircle2, ArrowRight } from 'lucide-react';

const AUDIENCES = [
  {
    id: 'saas',
    title: 'SaaS & Tech Companies',
    icon: Laptop,
    badge: 'High-Intent Revenue',
    subtitle: 'Protect bottom-of-funnel rankings that drive software trials & demos.',
    points: [
      'Stop competitors from outranking your "vs Competitor" & "Best Alternatives" pages.',
      'Detect when product feature updates make your documentation & guides look obsolete.',
      'Keep trial signup conversion rates high from high-intent Google searches.',
    ],
    metric: '92% of SaaS demo leads come from top 3 organic rankings.',
  },
  {
    id: 'ecom',
    title: 'eCommerce & D2C Stores',
    icon: ShoppingBag,
    badge: 'Direct Sales Defense',
    subtitle: 'Keep product roundups, gift guides, and buying guides ranking on Page 1.',
    points: [
      'Revive seasonal buying guides before peak shopping periods arrive.',
      'Identify decayed product comparison articles losing search impressions.',
      'Direct organic shoppers to active inventory with updated purchase links.',
    ],
    metric: 'Refreshing seasonal guides yields +40% higher Q4 conversion rates.',
  },
  {
    id: 'agency',
    title: 'SEO Agencies & Freelancers',
    icon: Briefcase,
    badge: 'Automated Client Upsells',
    subtitle: 'Deliver high-margin Content Refresh Retainers in 30 seconds.',
    points: [
      'Connect client Search Console accounts to generate instant decay audit roadmaps.',
      'Provide ready-made Claude AI refresh playbooks without hours of manual keyword research.',
      'Prove ROI to clients with verifiable ranking and traffic recovery reports.',
    ],
    metric: 'Agencies charge $1,500 - $3,500/mo for content refresh retainer packages.',
  },
  {
    id: 'publishers',
    title: 'Publishers & Media Sites',
    icon: Newspaper,
    badge: 'Scale & Traffic Defense',
    subtitle: 'Monitor thousands of articles effortlessly without messy spreadsheets.',
    points: [
      'Automated 16-month historical baseline scans identify drops across massive content archives.',
      'Receive Monday morning watchdog digests alerting your editorial team to decaying URLs.',
      'Maintain overall domain authority and protect high-RPM programmatic ad impressions.',
    ],
    metric: 'Automates 20+ hours/week of manual GSC data extraction.',
  },
];

export default function AudienceMatrix() {
  const [activeAudience, setActiveAudience] = useState(AUDIENCES[0]);

  return (
    <div className="w-full rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-xl">
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Engineered for Anyone Who Owns a Website & Wants More Organic Traffic
        </h3>
        <p className="text-sm text-slate-400">
          Content decay isn't just a blogger problem. It quietly destroys organic revenue for SaaS, eCommerce, Agencies, and Digital Brands alike.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {AUDIENCES.map((aud) => {
          const Icon = aud.icon;
          const isSelected = activeAudience.id === aud.id;
          return (
            <button
              key={aud.id}
              type="button"
              onClick={() => setActiveAudience(aud)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/10'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                )}
              </div>
              <div>
                <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {aud.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{aud.badge}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Audience Details Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-8 animate-fadeIn">
        <div className="space-y-4 max-w-xl">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              {activeAudience.badge}
            </span>
            <h4 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {activeAudience.subtitle}
            </h4>
          </div>

          <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
            {activeAudience.points.map((pt, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Highlight Metric Box */}
        <div className="p-6 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between gap-4 lg:w-80 shrink-0">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Industry Impact
            </div>
            <p className="text-sm font-semibold text-white leading-relaxed">
              "{activeAudience.metric}"
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all hover:scale-105 whitespace-nowrap"
          >
            <span>Scan {activeAudience.title} Site</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
