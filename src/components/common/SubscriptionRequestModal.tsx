import React, { useState } from 'react';
import { 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Clock, 
  X, 
  ShieldCheck, 
  ArrowRight,
  HelpCircle,
  Zap
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userName?: string | null;
  siteUrl?: string;
  source?: string;
  onSuccess?: () => void;
}

export default function SubscriptionRequestModal({
  isOpen,
  onClose,
  userEmail: initialEmail = '',
  userName = '',
  siteUrl = '',
  source = 'dashboard_banner',
  onSuccess,
}: Props) {
  const [email, setEmail] = useState(initialEmail || '');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState<{
    formattedDate?: string;
    message?: string;
    email?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/request-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: userName,
          siteUrl,
          source,
          plan: 'Pro Monthly Subscription (₹999/mo)',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setSubmitted(true);
      setSubmissionData(data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Subscribe to DecayFix Pro Monthly
                </h3>
                <p className="text-xs text-slate-400">
                  Monthly Pro access for {siteUrl ? <code className="text-sky-400">{siteUrl}</code> : 'your website'}
                </p>
              </div>
            </div>

            {/* Payment Gateway Maintenance Announcement Card */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Notice: Payment Gateway Under Maintenance</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Our direct card/UPI checkout gateway is currently undergoing a scheduled infrastructure upgrade. You can submit your instant activation request below, and our internal team will guide you through manual instant onboarding.
              </p>
            </div>

            {/* Plan inclusions */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2.5 text-xs text-slate-300">
              <div className="font-semibold text-white flex items-center justify-between">
                <span>What's included in Pro Monthly (₹999/mo):</span>
                <span className="text-indigo-400 font-bold">₹999 / month</span>
              </div>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>100% of all decaying posts unlocked (no 5-post cap)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Tailored AI suggestion action plans for every URL</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Full CSV report export & continuous weekly monitoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Cancel or pause subscription anytime</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Contact Email for Monthly Subscription Activation:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourdomain.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Request for Pro Monthly (₹999/mo)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6 py-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">
                Subscription Request Submitted!
              </h3>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-left text-xs text-slate-300 space-y-3 leading-relaxed">
                <p className="text-emerald-300 font-medium">
                  Thanks for submitting your request to buy a subscription!
                </p>
                <p>
                  Our payment gateway is currently under maintenance due to some technical issues. Our internal team will connect and revert to you via email shortly, and you can activate your subscription with guidance from our team member.
                </p>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
                  <div>• Registered Email: <span className="text-slate-200 font-mono font-semibold">{submissionData?.email || email}</span></div>
                  <div>• Requested Date & Time: <span className="text-slate-200 font-mono">{submissionData?.formattedDate || new Date().toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
