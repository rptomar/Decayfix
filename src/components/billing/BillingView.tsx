import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Lock, 
  ExternalLink, 
  ArrowLeft 
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface PurchaseRecord {
  id: string;
  amount: number;
  currency: string;
  razorpayPaymentId?: string | null;
  status: string;
  unlockedAt: string;
  siteUrl?: string;
}

interface Props {
  isUnlocked: boolean;
  purchases: PurchaseRecord[];
  razorpayKeyId: string;
  userEmail?: string | null;
  userName?: string | null;
}

export default function BillingView({
  isUnlocked: initialIsUnlocked,
  purchases,
  razorpayKeyId,
  userEmail,
  userName,
}: Props) {
  const [isUnlocked, setIsUnlocked] = useState(initialIsUnlocked);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayNow = async () => {
    setPaymentLoading(true);
    try {
      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      if (window.Razorpay && !orderData.isMock) {
        const options = {
          key: orderData.keyId || razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'DecayFix',
          description: 'DecayFix Full Site Report Unlock',
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
            setSuccessNotice(true);
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
            razorpay_signature: 'mock_sig',
          }),
        });
        setIsUnlocked(true);
        setSuccessNotice(true);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </a>
      </div>

      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Billing & Access Status
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your one-time site unlock passes and view payment receipts.
        </p>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Payment successful! Your full content decay report is unlocked.</span>
        </div>
      )}

      {/* Access Plan Overview Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Status</div>
            <div className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              {isUnlocked ? (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">Full Site Report Unlocked</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-400">Free Preview Tier</span>
                </>
              )}
            </div>
          </div>

          {!isUnlocked && (
            <button
              onClick={handlePayNow}
              disabled={paymentLoading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>{paymentLoading ? 'Processing...' : 'Unlock Full Report (₹999)'}</span>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
          <p>• One-time payment. No recurring monthly or annual charges.</p>
          <p>• Unlocks 100% of decaying posts, full traffic history, and all Claude AI suggestions.</p>
        </div>
      </div>

      {/* Receipts / Transactions Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Payment History & Receipts
          </h2>
        </div>

        {purchases.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No completed purchases yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {purchases.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-white text-sm">
                    DecayFix Full Site Report Unlock
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Payment ID: <code className="text-slate-300 font-mono">{item.razorpayPaymentId || item.id}</code></span>
                    <span>•</span>
                    <span>{new Date(item.unlockedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-white">
                    ₹{(item.amount / 100).toFixed(0)} {item.currency}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                    Paid
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
