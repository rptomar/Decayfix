import React, { useState, useEffect } from 'react';
import {
  Users,
  Eye,
  TrendingDown,
  Globe,
  Sparkles,
  Zap,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Download,
  Mail,
  ArrowUpRight,
  ExternalLink,
  Activity,
  Layers,
  FileText,
  DollarSign,
  Copy,
  Sliders,
  Check,
  X,
  UserPlus
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
}

interface Props {
  admin: AdminUser;
}

export default function AdminDashboard({ admin }: Props) {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'requests' | 'users' | 'subscriptions' | 'sites' | 'ai' | 'api' | 'visits'
  >('overview');
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Active Detail Modal State
  const [detailModal, setDetailModal] = useState<
    | null
    | 'visits'
    | 'users'
    | 'sites'
    | 'tiers'
    | 'api'
    | 'ai'
    | 'unlock_clicks'
    | 'requests'
    | 'revenue'
  >(null);

  // Manual Email Activation Form State
  const [activationEmail, setActivationEmail] = useState('');
  const [activationName, setActivationName] = useState('');
  const [activationAmount, setActivationAmount] = useState('999');
  const [activationNotes, setActivationNotes] = useState('');
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationFeedback, setActivationFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Fetch Admin Stats
  const fetchStats = async (range = timeRange) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/stats?timeRange=${range}`);
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error('Failed to load admin stats');
      }
      const statsData = await res.json();
      setData(statsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(timeRange);
  }, [timeRange]);

  // Handle Manual Subscription Activation
  const handleActivateByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationEmail || !activationEmail.includes('@')) {
      setActivationFeedback({ type: 'error', msg: 'Please enter a valid user email' });
      return;
    }

    setActivationLoading(true);
    setActivationFeedback(null);

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: activationEmail.trim(),
          name: activationName.trim() || undefined,
          amount: Number(activationAmount) || 999,
          notes: activationNotes.trim() || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Activation failed');

      setActivationFeedback({ type: 'success', msg: resData.message });
      setActivationEmail('');
      setActivationName('');
      setActivationNotes('');
      fetchStats();
    } catch (err: any) {
      setActivationFeedback({ type: 'error', msg: err.message || 'Failed to activate subscription' });
    } finally {
      setActivationLoading(false);
    }
  };

  // Handle 1-Click Request Approval & Activation
  const handleApproveRequest = async (requestId: string) => {
    try {
      const res = await fetch('/api/admin/subscription-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          action: 'activate',
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Approval failed');
      fetchStats();
    } catch (err: any) {
      alert(err.message || 'Failed to approve request');
    }
  };

  // Handle Request Status Change
  const handleUpdateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      await fetch('/api/admin/subscription-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: requestId,
          status: newStatus,
        }),
      });
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle User Subscription Toggle
  const handleToggleUserSubscription = async (email: string, currentIsPaid: boolean) => {
    if (!confirm(`Are you sure you want to ${currentIsPaid ? 'revoke' : 'activate'} subscription for ${email}?`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentIsPaid ? 'deactivate' : 'activate',
          email,
        }),
      });
      if (res.ok) fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  const summary = data?.summary || {};
  const recentEvents: any[] = data?.recentEvents || [];
  const allUsers: any[] = data?.allUsers || [];
  const allSites: any[] = data?.allSites || [];
  const allPurchases: any[] = data?.allPurchases || [];
  const subscriptionRequests: any[] = data?.subscriptionRequests || [];

  // Filter lists based on search
  const filteredRequests = subscriptionRequests.filter((r) =>
    `${r.email} ${r.userName || ''} ${r.siteUrl || ''} ${r.status} ${r.source}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredUsers = allUsers.filter((u) =>
    `${u.email} ${u.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvents = recentEvents.filter((e) =>
    `${e.eventType} ${e.userEmail || ''} ${e.path || ''} ${e.metadata || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const paidUserIds = new Set(allPurchases.filter((p) => p.status === 'completed').map((p) => p.userId));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  Decay<span className="text-sky-400">Fix</span> Admin
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold uppercase tracking-wider">
                  Live Control
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Business telemetry & subscription manager</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Filter */}
            <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs font-medium">
              {(['today', '7d', '30d', 'all'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    timeRange === r
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchStats()}
              disabled={refreshing}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {/* Admin identity badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-white">{admin.name || admin.email}</span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-800/60 text-xs font-semibold">
          {[
            { id: 'overview', label: '📊 Overview & KPIs' },
            { 
              id: 'requests', 
              label: '📥 Subscription Requests', 
              badge: summary.pendingSubscriptionRequestsCount > 0 ? summary.pendingSubscriptionRequestsCount : null,
              badgeColor: 'bg-amber-500 text-slate-950 font-bold'
            },
            { id: 'users', label: '👥 Users & Free/Paid Tiers' },
            { id: 'subscriptions', label: '⚡ Activate by Email' },
            { id: 'sites', label: '🌐 Analyzed Sites & URLs' },
            { id: 'ai', label: '🤖 AI Prompt Copies' },
            { id: 'api', label: '🔌 API Hits & Health' },
            { id: 'visits', label: '📈 Site Visits Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Action Notification Banner if Pending Requests */}
            {summary.pendingSubscriptionRequestsCount > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <span>{summary.pendingSubscriptionRequestsCount} Pending Subscription Purchase Requests</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase">
                        Action Required
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Users clicked "Unlock All Posts" while payment gateway is in maintenance. Reach out or activate their access.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('requests')}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-transform hover:scale-105 cursor-pointer whitespace-nowrap"
                >
                  Manage Requests Queue →
                </button>
              </div>
            )}

            {/* Top 9 Business KPI Metric Cards with Detail Buttons */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  <span>Executive Business Metrics</span>
                </h2>
                <span className="text-xs text-slate-400">Click "View Details" on any card for full drill-down</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. Site Visits */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                      <Eye className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('visits')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-lg border border-sky-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{summary.pageViewsCount || 0}</div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      Total Site Visits / Pageviews ({summary.uniqueVisitorsCount || 0} unique visitors)
                    </div>
                  </div>
                </div>

                {/* 2. Registered Users & Sign-ins */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('users')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{summary.totalUsersCount || 0}</div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      Total Registered User Accounts & Google Sign-ins
                    </div>
                  </div>
                </div>

                {/* 3. Analyzed Sites & URLs */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('sites')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{summary.analyzedSitesCount || 0}</div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      Added Sites ({summary.totalAnalysisRuns || 0} full audit runs performed)
                    </div>
                  </div>
                </div>

                {/* 4. Free vs Paid Users Breakdown */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('tiers')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-400">{summary.totalPaidUsers || 0} Paid</span>
                      <span className="text-base font-semibold text-slate-400">/ {summary.totalFreeUsers || 0} Free</span>
                    </div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      Active User Tiers & Conversion ratio
                    </div>
                  </div>
                </div>

                {/* 5. API Hits Count */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('api')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{summary.totalApiHits || 0}</div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      Total API Hits (Analyze, AI Prompts, GSC Fetch)
                    </div>
                  </div>
                </div>

                {/* 6. AI Suggestions Copied */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('ai')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 px-2.5 py-1 rounded-lg border border-pink-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{summary.aiSuggestionsCopiedCount || 0}</div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      AI Suggestions & ChatGPT Prompts Copied
                    </div>
                  </div>
                </div>

                {/* 7. Unlock / Upgrade Button Clicks */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                      <TrendingDown className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('unlock_clicks')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 px-2.5 py-1 rounded-lg border border-teal-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-white">{summary.unlockButtonClicksCount || 0}</div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      Clicks on "Unlock All Posts" / Upgrade CTAs
                    </div>
                  </div>
                </div>

                {/* 8. Total Subscription Buy Requests */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 hover:border-slate-700 transition-all shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => setDetailModal('requests')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-1 rounded-lg border border-orange-500/20 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-white">{summary.subscriptionRequestsCount || 0}</span>
                      {summary.pendingSubscriptionRequestsCount > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {summary.pendingSubscriptionRequestsCount} Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-slate-400 mt-1">
                      Submitted Subscription Requests (Payment Maintenance)
                    </div>
                  </div>
                </div>

                {/* 9. Total Collected Amount / Revenue */}
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 space-y-4 shadow-lg shadow-emerald-500/5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg">
                      ₹
                    </div>
                    <button
                      onClick={() => setDetailModal('revenue')}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-colors cursor-pointer"
                    >
                      <span>View Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                      ₹{summary.totalRevenueInr?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs font-medium text-emerald-300/80 mt-1">
                      Total Collected Revenue ({summary.totalPurchasesCount || 0} completed unlocks)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fast Quick Actions Hub */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Activate Form */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Quick Activate Subscription by Email</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Instantly unlock full site reports for any user by email address (works for existing or new users).
                </p>

                {activationFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      activationFeedback.type === 'success'
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {activationFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{activationFeedback.msg}</span>
                  </div>
                )}

                <form onSubmit={handleActivateByEmail} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      required
                      value={activationEmail}
                      onChange={(e) => setActivationEmail(e.target.value)}
                      placeholder="User email address (e.g. blogger@example.com)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={activationName}
                      onChange={(e) => setActivationName(e.target.value)}
                      placeholder="Customer Name (optional)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs outline-none"
                    />
                    <input
                      type="number"
                      value={activationAmount}
                      onChange={(e) => setActivationAmount(e.target.value)}
                      placeholder="Amount in ₹ (999)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={activationLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {activationLoading ? (
                      <span>Activating...</span>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Activate Subscription Now</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Recent Activity Mini-Feed */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-sky-400" />
                    <h3 className="font-bold text-white text-base">Live Activity Feed</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('visits')}
                    className="text-xs text-sky-400 hover:underline"
                  >
                    View All Logs
                  </button>
                </div>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 text-xs">
                  {recentEvents.length === 0 ? (
                    <div className="text-slate-500 text-center py-6">No recent events recorded.</div>
                  ) : (
                    recentEvents.slice(0, 6).map((evt) => (
                      <div
                        key={evt.id}
                        className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              evt.eventType === 'subscription_request'
                                ? 'bg-amber-400'
                                : evt.eventType === 'site_analyze'
                                ? 'bg-emerald-400'
                                : evt.eventType === 'ai_suggestion_copy'
                                ? 'bg-pink-400'
                                : evt.eventType === 'unlock_button_click'
                                ? 'bg-purple-400'
                                : 'bg-sky-400'
                            }`}
                          ></span>
                          <span className="font-medium text-slate-200 capitalize truncate">
                            {evt.eventType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate">
                            {evt.userEmail || evt.path || 'anon'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTION REQUESTS QUEUE (Payment Gateway Maintenance) */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-amber-400" />
                  <span>Subscription Purchase Requests Queue</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Requests automatically captured when users clicked "Unlock Full Report" during payment gateway maintenance.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search requests..."
                    className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No subscription purchase requests found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">User / Email</th>
                        <th className="py-3 px-4">Requested Date & Time</th>
                        <th className="py-3 px-4">Site / Source</th>
                        <th className="py-3 px-4">Plan & Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-white">
                            <div className="flex flex-col">
                              <span>{req.email}</span>
                              {req.userName && (
                                <span className="text-[11px] text-slate-400">{req.userName}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span>{new Date(req.createdAt).toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="flex flex-col">
                              <span className="font-mono text-[11px] text-sky-400">
                                {req.siteUrl || 'General Site'}
                              </span>
                              <span className="text-[10px] text-slate-500 capitalize">
                                Source: {req.source || 'dashboard'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            <span className="font-semibold text-white">₹999</span> (Lifetime Unlock)
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={req.status}
                              onChange={(e) => handleUpdateRequestStatus(req.id, e.target.value)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border outline-none cursor-pointer ${
                                req.status === 'activated'
                                  ? 'bg-emerald-950 border-emerald-500/40 text-emerald-400'
                                  : req.status === 'contacted'
                                  ? 'bg-sky-950 border-sky-500/40 text-sky-400'
                                  : req.status === 'cancelled'
                                  ? 'bg-slate-800 border-slate-700 text-slate-400'
                                  : 'bg-amber-950 border-amber-500/40 text-amber-400'
                              }`}
                            >
                              <option value="pending" className="bg-slate-900 text-white">Pending</option>
                              <option value="contacted" className="bg-slate-900 text-white">Contacted</option>
                              <option value="activated" className="bg-slate-900 text-white">Activated</option>
                              <option value="cancelled" className="bg-slate-900 text-white">Cancelled</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {req.status !== 'activated' && (
                              <button
                                onClick={() => handleApproveRequest(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" />
                                <span>Activate Access</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: USERS & FREE/PAID TIERS */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>User Directory & Subscription Tiers</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage registered users, monitor free vs paid status, and toggle full unlock entitlements.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search users by email..."
                    className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No users found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Connected Sites</th>
                        <th className="py-3 px-4">Join Date</th>
                        <th className="py-3 px-4">Subscription Status</th>
                        <th className="py-3 px-4 text-right">Subscription Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredUsers.map((u) => {
                        const isPaid = paidUserIds.has(u.id);
                        const userSites = allSites.filter((s) => s.userId === u.id);

                        return (
                          <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold uppercase text-xs">
                                {u.name ? u.name[0] : 'U'}
                              </div>
                              <span>{u.name || 'Blogger'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                            <td className="py-3.5 px-4 text-slate-300">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                {userSites.length} Site{userSites.length !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-semibold text-[11px]">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Full Unlocked
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-semibold text-[11px]">
                                  Free Preview Tier
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleToggleUserSubscription(u.email, isPaid)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  isPaid
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                {isPaid ? 'Revoke Access' : '⚡ Make Active'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACTIVATE SUBSCRIPTION BY EMAIL */}
        {activeTab === 'subscriptions' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <span>Activate User Subscription by Email</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter any user's email address to immediately grant them full report access. They will receive unlimited post decay diagnostics and full AI action plans.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-xl">
              {activationFeedback && (
                <div
                  className={`p-4 rounded-xl text-xs flex items-center gap-3 ${
                    activationFeedback.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                  }`}
                >
                  {activationFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span>{activationFeedback.msg}</span>
                </div>
              )}

              <form onSubmit={handleActivateByEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    User Email Address (Required)
                  </label>
                  <input
                    type="email"
                    required
                    value={activationEmail}
                    onChange={(e) => setActivationEmail(e.target.value)}
                    placeholder="e.g. founder@sprintlabs.ai or client@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={activationName}
                      onChange={(e) => setActivationName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Amount Paid in ₹ (Optional)
                    </label>
                    <input
                      type="number"
                      value={activationAmount}
                      onChange={(e) => setActivationAmount(e.target.value)}
                      placeholder="999"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Admin Notes / Interaction Reference (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={activationNotes}
                    onChange={(e) => setActivationNotes(e.target.value)}
                    placeholder="e.g. Offline payment collected via bank transfer on Sep 25"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white text-xs outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={activationLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {activationLoading ? (
                    <span>Activating Subscription...</span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Grant & Activate Subscription Now</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: ANALYZED SITES & URLS */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span>Connected Sites & URLs Under Analysis</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  List of websites connected via Google Search Console or manual analysis.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              {allSites.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">No connected sites yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Site URL</th>
                        <th className="py-3 px-4">User ID / Email</th>
                        <th className="py-3 px-4">Permission Level</th>
                        <th className="py-3 px-4">Connected Date</th>
                        <th className="py-3 px-4">Last Synced</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {allSites.map((s) => {
                        const owner = allUsers.find((u) => u.id === s.userId);
                        return (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium text-sky-400">{s.siteUrl}</td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                              {owner?.email || s.userId}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                {s.permissionLevel || 'siteOwner'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {new Date(s.connectedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : 'Pending'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: AI PROMPT COPIES */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  <span>AI Suggestions Copied & Generated</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Track user engagement with Claude / Gemini / Groq SEO recommendations and copy actions.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Article / Target URL</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentEvents
                      .filter((e) => e.eventType === 'ai_suggestion_copy' || e.eventType === 'site_analyze')
                      .map((e) => {
                        let meta: any = {};
                        try {
                          meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
                        } catch {}

                        return (
                          <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  e.eventType === 'ai_suggestion_copy'
                                    ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {e.eventType.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                              {e.userEmail || 'Anonymous'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] truncate max-w-xs">
                              {meta?.url || meta?.siteUrl || e.path}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {new Date(e.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: API HITS */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>API Performance & Diagnostic Logs</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Track how many times each internal & external API endpoint has been triggered.
                </p>
              </div>
            </div>

            {/* API Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(summary.apiHitsBreakdown || {}).map(([endpoint, count]: any) => (
                <div key={endpoint} className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-1">
                  <div className="text-[11px] text-slate-400 font-mono truncate">{endpoint}</div>
                  <div className="text-xl font-bold text-white">{count} calls</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Endpoint</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Latency & Status</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentEvents
                      .filter((e) => e.eventType === 'api_hit')
                      .map((e) => {
                        let meta: any = {};
                        try {
                          meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
                        } catch {}

                        return (
                          <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-amber-300 font-semibold">{e.path}</td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                              {e.userEmail || 'System'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {meta?.status ? <span className="text-emerald-400 font-bold">{meta.status} OK</span> : '200 OK'}
                              {meta?.durationMs ? ` • ${meta.durationMs}ms` : ''}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {new Date(e.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: SITE VISITS LOG */}
        {activeTab === 'visits' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-sky-400" />
                  <span>Traffic & Page View Telemetry</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time log of landing page visits, referrers, and authenticated sessions.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Page Path</th>
                      <th className="py-3 px-4">Visitor / IP Hash</th>
                      <th className="py-3 px-4">Referrer</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recentEvents
                      .filter((e) => e.eventType === 'page_view')
                      .map((e) => {
                        let meta: any = {};
                        try {
                          meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
                        } catch {}

                        return (
                          <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-sky-400 font-medium">{e.path}</td>
                            <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                              {e.userEmail ? (
                                <span className="text-emerald-300 font-semibold">{e.userEmail}</span>
                              ) : (
                                `anon_${e.ipHash || 'guest'}`
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">
                              {meta?.referrer || 'direct'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400">
                              {new Date(e.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* DETAIL MODAL OVERLAY (Triggered by [View Details] buttons on KPI cards) */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-4xl max-h-[85vh] rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                <span>Detailed Metric Drilldown: {detailModal.replace(/_/g, ' ')}</span>
              </h3>
              <button
                onClick={() => setDetailModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              {detailModal === 'visits' && (
                <div>
                  <p className="text-slate-400 mb-3">Total Pageviews: {summary.pageViewsCount}</p>
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Path</th>
                        <th className="p-2">User / IP</th>
                        <th className="p-2">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {recentEvents.filter((e) => e.eventType === 'page_view').map((e) => (
                        <tr key={e.id}>
                          <td className="p-2 font-mono text-sky-400">{e.path}</td>
                          <td className="p-2 text-slate-300">{e.userEmail || e.ipHash}</td>
                          <td className="p-2 text-slate-400">{new Date(e.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailModal === 'users' && (
                <div>
                  <p className="text-slate-400 mb-3">Total Users: {allUsers.length}</p>
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Tier</th>
                        <th className="p-2">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {allUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="p-2 font-medium text-white">{u.name || 'Blogger'}</td>
                          <td className="p-2 font-mono text-slate-300">{u.email}</td>
                          <td className="p-2">
                            {paidUserIds.has(u.id) ? (
                              <span className="text-emerald-400 font-bold">Paid</span>
                            ) : (
                              <span className="text-slate-400">Free</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailModal === 'tiers' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex-1">
                      <div className="text-xs text-emerald-400">Paid Subscribers</div>
                      <div className="text-xl font-bold text-white">{summary.totalPaidUsers}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700 flex-1">
                      <div className="text-xs text-slate-400">Free Tier Users</div>
                      <div className="text-xl font-bold text-white">{summary.totalFreeUsers}</div>
                    </div>
                  </div>
                </div>
              )}

              {detailModal === 'requests' && (
                <div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Email</th>
                        <th className="p-2">Site</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {subscriptionRequests.map((r) => (
                        <tr key={r.id}>
                          <td className="p-2 font-mono text-white">{r.email}</td>
                          <td className="p-2 font-mono text-sky-400">{r.siteUrl || 'N/A'}</td>
                          <td className="p-2 capitalize font-semibold">{r.status}</td>
                          <td className="p-2 text-slate-400">{new Date(r.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailModal === 'revenue' && (
                <div>
                  <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 mb-4">
                    <div className="text-xs text-emerald-300">Total Collected Amount</div>
                    <div className="text-2xl font-bold text-emerald-400">₹{summary.totalRevenueInr?.toLocaleString()}</div>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Payment ID</th>
                        <th className="p-2">Amount</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {allPurchases.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2 font-mono text-slate-300">{p.razorpayPaymentId || p.id}</td>
                          <td className="p-2 font-bold text-white">₹{(p.amount / 100).toFixed(0)}</td>
                          <td className="p-2 text-emerald-400 font-semibold">{p.status}</td>
                          <td className="p-2 text-slate-400">{new Date(p.unlockedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailModal === 'unlock_clicks' && (
                <div>
                  <p className="text-slate-400 mb-3">Total Unlock CTA Clicks: {summary.unlockButtonClicksCount}</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.entries(summary.unlockClicksBySource || {}).map(([src, count]: any) => (
                      <div key={src} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">{src}</div>
                        <div className="text-base font-bold text-white">{count} clicks</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailModal === 'ai' && (
                <div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">User</th>
                        <th className="p-2">Target Article</th>
                        <th className="p-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {recentEvents.filter((e) => e.eventType === 'ai_suggestion_copy').map((e) => (
                        <tr key={e.id}>
                          <td className="p-2 font-mono text-pink-300">{e.userEmail || 'Anonymous'}</td>
                          <td className="p-2 font-mono text-slate-300">{e.path}</td>
                          <td className="p-2 text-slate-400">{new Date(e.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detailModal === 'api' && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {Object.entries(summary.apiHitsBreakdown || {}).map(([endpoint, count]: any) => (
                      <div key={endpoint} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="text-[10px] font-mono text-slate-400 truncate">{endpoint}</div>
                        <div className="text-base font-bold text-amber-400">{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setDetailModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Close Drilldown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
