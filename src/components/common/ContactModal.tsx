import React, { useState } from 'react';
import { Mail, Copy, Check, Clock, Globe, X, Send, Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupport?: () => void;
}

export default function ContactModal({ isOpen, onClose, onOpenSupport }: Props) {
  const [copied, setCopied] = useState(false);
  const email = 'sprintlabsai@gmail.com';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Contact DecayFix Team</h3>
              <p className="text-xs text-slate-400">
                Direct communication with SprintLabs.ai engineering & support
              </p>
            </div>
          </div>

          {/* Official Email Card */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/30 p-5 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span>Official Support & Contact Email</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="font-mono text-sm sm:text-base font-bold text-white select-all">
                {email}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={`mailto:${email}?subject=DecayFix Inquiry`}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Mail</span>
                </a>
              </div>
            </div>
          </div>

          {/* Instructions for contacting */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-xs text-slate-300">
            <div className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Contact Instructions & Response Times:</span>
            </div>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Response Guarantee:</strong> Our core team typically responds within <strong>4–12 hours</strong> (max 24 hours on weekends).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Include Details:</strong> Mention your registered Google account email and site domain (e.g. <code>godamwala.com</code>) for fastest resolution.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Use Cases:</strong> Custom content audits, GSC permissions assistance, enterprise bulk licenses, payment queries, or partnership inquiries.</span>
              </li>
            </ul>
          </div>

          {/* Alternative action: Support ticket */}
          {onOpenSupport && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Need technical assistance or bug report?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSupport();
                }}
                className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 font-semibold transition-colors cursor-pointer shrink-0"
              >
                Open Support Form
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
