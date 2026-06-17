/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Coins, 
  Users, 
  FolderHeart, 
  Crown, 
  Award, 
  TrendingDown, 
  Activity,
  ChevronRight,
  FlameKindling,
  Building2,
  Trophy,
  Sparkles,
  Star,
  Target,
  Medal
} from 'lucide-react';
import ExecutiveIncentiveChart from './ExecutiveIncentiveChart';

interface DashboardProps {
  authToken: string;
  userRole?: string;
  userProfile?: any;
}

export default function DashboardView({ authToken, userRole, userProfile }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'sale' | 'milestone' | 'project'>('all');
  const [heatmapMode, setHeatmapMode] = useState<'weekly' | 'kpis'>('weekly');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFetchError(null);

    fetch('/api/dashboard/analytics', {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    })
    .then(async response => {
      let responseText = "";
      try {
        responseText = await response.text();
      } catch (e: any) {
        throw new Error(`Failed to read response body: ${e.message || String(e)}`);
      }

      let parsedJson: any = null;
      try {
        parsedJson = responseText ? JSON.parse(responseText) : null;
      } catch {
        if (!response.ok) {
          throw new Error(responseText.substring(0, 500) || `Server returned status ${response.status}`);
        } else {
          throw new Error("Unable to parse a valid JSON payload from the server analytics engine.");
        }
      }

      if (!response.ok) {
        let errorMsg = `Server returned status ${response.status}`;
        if (parsedJson) {
          if (typeof parsedJson.error === 'string') {
            errorMsg = parsedJson.error;
          } else if (parsedJson.error && typeof parsedJson.error === 'object') {
            errorMsg = parsedJson.error.message || parsedJson.error.error || JSON.stringify(parsedJson.error);
          } else if (typeof parsedJson.message === 'string') {
            errorMsg = parsedJson.message;
          } else {
            errorMsg = JSON.stringify(parsedJson);
          }
        }
        throw new Error(errorMsg);
      }

      return parsedJson;
    })
    .then(res => {
      if (!active) return;
      if (!res || typeof res !== 'object') {
        throw new Error("Empty or malformed payload structure received from server.");
      }
      if (res.error) {
        let errorMsg = "";
        if (typeof res.error === 'string') {
          errorMsg = res.error;
        } else if (typeof res.error === 'object') {
          errorMsg = res.error.message || JSON.stringify(res.error);
        } else {
          errorMsg = String(res.error);
        }
        throw new Error(errorMsg);
      }
      setData(res);
      setLoading(false);
    })
    .catch(err => {
      if (!active) return;
      console.error("[Dashboard] Error fetching analytics:", err);
      let errMsg = "An unexpected error occurred.";
      if (err instanceof Error) {
        errMsg = err.message;
      } else if (typeof err === 'string') {
        errMsg = err;
      } else if (err && typeof err === 'object') {
        errMsg = (err as any).message || (err as any).error || JSON.stringify(err);
      } else {
        errMsg = String(err);
      }
      setFetchError(errMsg);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [authToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500 font-mono">Compiling dashboard analytics...</p>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4 max-w-xl mx-auto text-center hover:scale-101 transition duration-300">
        <div className="p-3 bg-rose-50/75 border border-rose-100 rounded-full text-rose-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="text-xl font-bold text-gray-800 font-sans">Error Loading Dashboard Analytics</div>
        <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-xs font-mono font-semibold text-rose-700 w-full break-all leading-relaxed text-left">
          <p className="font-bold border-b border-rose-100/50 pb-1 mb-2 text-rose-800">Diag Log Context:</p>
          <p className="whitespace-pre-wrap">{fetchError || "Empty or invalid response payload structure received."}</p>
        </div>
        <p className="text-xs text-gray-400 font-medium">Please verify your server connection, refresh user credentials, or log out and authenticate again.</p>
      </div>
    );
  }

  const cards = data.cards || {};
  const tops = data.tops || {};
  const charts = data.charts || {};
  const execAchievements = data.execAchievements || [];
  const execAchievementsPeriod = data.execAchievementsPeriod || "";

  // Let's find maximums to scale custom SVG charts proportionally safely
  const timelineData = Array.isArray(charts?.timeline) ? charts.timeline : [];
  const projectData = Array.isArray(charts?.projects) ? charts.projects : [];
  const teamData = Array.isArray(charts?.teams) ? charts.teams : [];
  const achievements = Array.isArray(execAchievements) ? execAchievements : [];

  const maxSales = Math.max(...timelineData.map((d: any) => d.sales || 0), 100000);
  const maxIncentive = Math.max(...timelineData.map((d: any) => d.incentive || 0), 10000);
  
  const maxProjSales = Math.max(...projectData.map((d: any) => d.sales || 0), 100000);
  const maxTeamIncentives = Math.max(...teamData.map((d: any) => d.incentive || 0), 10000);

  const totalProjSalesSum = projectData.reduce((sum: number, p: any) => sum + (p.sales || 0), 0);
  const totalTeamIncentivesSum = teamData.reduce((sum: number, t: any) => sum + (t.incentive || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Performance Summary</h1>
          <p className="mt-1 text-sm text-gray-500">Live operational overview of sales pipelines, team target fulfillment, and incentive distributions.</p>
        </div>
      </div>

      {/* Top Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs hover:shadow-xs transition duration-200 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Project Sales</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{(cards?.totalSales ?? 0)} Units</h3>
            <p className="text-[10px] text-gray-500 font-medium">Vol: {((cards?.totalSalesValue ?? 0) / 100000).toFixed(1)} Lakh BDT</p>
          </div>
          <div className="absolute top-2 right-2 w-48 h-48 bg-indigo-50 rounded-full -mr-20 -mt-20 opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none" />
        </div>

        {/* Card 2: Total Incentive */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs hover:shadow-xs transition duration-200 space-y-3 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Incentive Total</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-emerald-700">{(cards?.totalIncentivePaid ?? 0).toLocaleString()} BDT</h3>
            <p className="text-[10px] text-gray-500 font-medium">Base + Floor + Targets</p>
          </div>
          <div className="absolute top-2 right-2 w-48 h-48 bg-emerald-50 rounded-full -mr-20 -mt-20 opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none" />
        </div>

        {/* Card 3: Total Teams */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs hover:shadow-xs transition duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Teams Active</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{(cards?.totalTeamsCount ?? 0)} Teams</h3>
            <p className="text-[10px] text-gray-500 font-medium">Multi-project bindings</p>
          </div>
        </div>

        {/* Card 4: Total Executives */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs hover:shadow-xs transition duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Executives</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{(cards?.totalExecutivesCount ?? 0)} officers</h3>
            <p className="text-[10px] text-gray-500 font-medium">Registered Employee IDs</p>
          </div>
        </div>

        {/* Card 5: Active Projects */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs hover:shadow-xs transition duration-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Projects</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <FolderHeart className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{(cards?.activeProjectsCount ?? 0)} Units</h3>
            <p className="text-[10px] text-gray-500 font-semibold text-emerald-600">Active status</p>
          </div>
        </div>
      </div>

      {/* Dynamic Star Metrics Bento-Grid */}
      <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">Top Standings Summary</h2>
      <div className="grid md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-semibold text-gray-800">Incentive Champions</span>
          </div>
          <div className="space-y-3 font-sans">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Top Seller</p>
              <p className="text-sm font-semibold text-gray-900">{tops?.topSeller || "None"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Top Incentive Earner</p>
              <p className="text-sm font-semibold text-emerald-700">{tops?.topEarner || "None"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            <span className="text-sm font-semibold text-gray-800">Top-Value Pipelines</span>
          </div>
          <div className="space-y-3 font-sans">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Highest Incentive Project</p>
              <p className="text-sm font-semibold text-gray-900">{tops?.topProject || "None"}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Top Performance Team</p>
              <p className="text-sm font-semibold text-indigo-700">{tops?.topTeam || "None"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-semibold text-gray-800">Incentive Composition</span>
          </div>
          <div className="space-y-3 font-sans">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Cumulative Base Seq. Pay</p>
              <p className="text-sm font-semibold text-gray-800">{(cards?.totalBaseIncentive ?? 0).toLocaleString()} BDT</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Bonus Adjustments Payout</p>
              <p className="text-sm font-semibold text-emerald-600">{(cards?.totalBonuses ?? 0).toLocaleString()} BDT</p>
            </div>
          </div>
        </div>
      </div>

      {/* Default Project selection hook */}
      {(() => {
        if (projectData.length > 0 && !selectedProjectId) {
          setTimeout(() => setSelectedProjectId(projectData[0].id), 0);
        }
        return null;
      })()}

      {/* Executive Monthly Incentive Earnings Bar Chart Component */}
      <ExecutiveIncentiveChart 
        authToken={authToken} 
        userRole={userRole || ''} 
        userProfile={userProfile} 
      />

      {/* Handcrafted Responsive Full-Width Timeline wrapper */}
      <div className="space-y-6">
        {/* Timeline Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-white">Monthly Revenue &amp; Incentive Timeline</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">Comparison of sales volume (Lakh BDT) vs incentive payouts.</p>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-6 pt-6 border-b border-gray-100 dark:border-slate-800 relative">
            {timelineData.map((row: any) => {
              const salesHeight = `${((row.sales || 0) / maxSales) * 85}%`;
              const incentiveHeight = `${((row.incentive || 0) / maxIncentive) * 85}%`;
              return (
                <div key={row.monthName} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-3/4">
                    {/* Sales Column */}
                    <div 
                      style={{ height: salesHeight }} 
                      className="w-4 sm:w-6 bg-indigo-500 rounded-t-sm group-hover:bg-indigo-600 transition-all duration-300 relative"
                    >
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                        Sales: {((row.sales || 0) / 100000).toFixed(1)} Lakh
                      </div>
                    </div>
                    {/* Incentive Column */}
                    <div 
                      style={{ height: incentiveHeight }} 
                      className="w-4 sm:w-6 bg-emerald-500 rounded-t-sm group-hover:bg-emerald-600 transition-all duration-300 relative"
                    >
                      <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                        Inc: {(row.incentive || 0).toLocaleString()} BDT
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-semibold font-mono">{row.monthName}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-xs font-medium justify-center pb-2">
            <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400"><div className="w-3 h-3 bg-indigo-505 bg-indigo-505 bg-indigo-500 rounded-xs" /> Sales Vol</span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><div className="w-3 h-3 bg-emerald-500 rounded-xs" /> Incentives Paid</span>
          </div>
        </div>

        {/* Team Leader Subordinate Performance Heat Map Dashboard Sub-view */}
        {(userRole === 'Sales Team Leader' || userRole === 'Admin') && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800 p-6 space-y-6 shadow-sm">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-400 font-sans">
                    {userRole === 'Admin' ? 'Admin Super-Desk' : 'Team Captain Desk'}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-gray-400 font-mono font-bold tracking-wide">Real-time Performance Synchronizer</span>
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FlameKindling className="w-5 h-5 text-indigo-600" /> Subordinate Performance Heat Map
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-400">
                  Visual heat matrix detailing booking velocity frequencies, current targets, and financial achievements of your direct subordinates for the active period ({execAchievementsPeriod || "Current Month"}).
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 font-mono uppercase tracking-wide">Select Dimension:</span>
                <div className="inline-flex p-0.5 bg-gray-50 dark:bg-slate-850 border border-gray-100 dark:border-slate-800 rounded-xl space-x-0.5">
                  <button
                    type="button"
                    onClick={() => setHeatmapMode('weekly')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      heatmapMode === 'weekly'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
                    }`}
                  >
                    ⏱ Weekly Frequency
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapMode('kpis')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      heatmapMode === 'kpis'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
                    }`}
                  >
                    🎯 Core KPIs Intensity
                  </button>
                </div>
              </div>
            </div>

            {/* Subordinates List and Heat Map Matrix Container */}
            <div className="w-full overflow-x-auto border border-gray-100 dark:border-slate-800 rounded-2xl bg-gray-50/20 dark:bg-slate-900/40">
              {achievements && achievements.length > 0 ? (
                <table className="w-full min-w-[750px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50">
                      <th className="py-3 px-5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-white dark:bg-slate-900 w-[200px] sticky left-0 z-10 border-r border-gray-50 dark:border-slate-800/60 font-sans">
                        Executive Officer
                      </th>
                      {heatmapMode === 'weekly' ? (
                        <>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">W1 <span className="block font-mono text-[9px] text-gray-400 font-normal">Day 1-7</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">W2 <span className="block font-mono text-[9px] text-gray-400 font-normal font-sans">Day 8-14</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">W3 <span className="block font-mono text-[9px] text-gray-400 font-normal font-sans">Day 15-21</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">W4 <span className="block font-mono text-[9px] text-gray-400 font-normal font-sans">Day 22-28</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">W5 <span className="block font-mono text-[9px] text-gray-400 font-normal font-sans">Day 29-31</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider border-l border-gray-100 dark:border-slate-800 bg-gray-50/10 font-sans">Target</th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/10 font-sans">Realized</th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/10 font-sans">Goal Rate</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Targets <span className="block font-mono text-[9px] text-gray-400 font-normal">units</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Realized <span className="block font-mono text-[9px] text-gray-400 font-normal">units</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 tracking-wider text-center uppercase font-sans">Completion rate</th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider font-sans">Volume Value <span className="block font-mono text-[9px] text-gray-400 font-normal">BDT lakhs</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-emerald-600 uppercase tracking-wider font-sans">Commissions <span className="block font-mono text-[9px] text-emerald-500 font-normal">BDT aggregate</span></th>
                          <th className="py-3 px-4 text-center text-[10px] font-bold text-amber-600 uppercase tracking-wider font-sans">Milestone Bonuses <span className="block font-mono text-[9px] text-amber-500 font-normal">BDT earned</span></th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {achievements.map((ach: any) => {
                      const weeksCountArr = ach.weeksCount || [0, 0, 0, 0, 0];
                      const targetVal = ach.target || 0;
                      const achievedVal = ach.achieved || 0;
                      const percentageVal = ach.percentage || 0;
                      const totalVolumeBDTVal = ach.totalVolumeBDT || 0;
                      const totalIncentiveBDTVal = ach.totalIncentiveBDT || 0;
                      const milestoneBonusBDTVal = ach.milestoneBonusBDT || 0;

                      return (
                        <tr key={ach.id || ach.name} className="hover:bg-gray-50/40 dark:hover:bg-slate-850/25 transition">
                          {/* Subordinate info */}
                          <td className="py-3 px-5 bg-white dark:bg-slate-900 sticky left-0 z-10 border-r border-gray-100 dark:border-slate-800/60 shadow-3xs">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 text-[10px] font-black font-mono flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/40">
                                {ach.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                              <div className="truncate">
                                <p className="text-xs text-gray-800 dark:text-white font-semibold truncate max-w-[120px]">{ach.name}</p>
                                <p className="text-[9px] text-gray-400 font-mono tracking-wider">Subordinate</p>
                              </div>
                            </div>
                          </td>

                          {heatmapMode === 'weekly' ? (
                            <>
                              {/* Weeks Heatmap grids */}
                              {weeksCountArr.map((cnt: number, wIdx: number) => {
                                // Color scheme based on counts (Heat Map density levels)
                                let cellBg = "bg-gray-100/70 dark:bg-slate-800/40 text-gray-400 dark:text-slate-500 border border-gray-100/60 dark:border-slate-800/10";
                                
                                if (cnt === 1) {
                                  cellBg = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30 font-bold";
                                } else if (cnt === 2) {
                                  cellBg = "bg-emerald-250 text-emerald-900 dark:bg-emerald-800/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/40 font-bold";
                                } else if (cnt >= 3) {
                                  cellBg = "bg-gradient-to-br from-emerald-500 to-teal-500 text-white font-extrabold shadow-3xs animate-pulse";
                                }

                                return (
                                  <td key={wIdx} className="p-2 text-center">
                                    <div className={`mx-auto w-14 py-1.5 rounded-lg text-xs font-mono transition-all duration-300 hover:scale-105 ${cellBg}`}>
                                      {cnt > 0 ? cnt : '-'}
                                      <span className="block text-[7px] font-sans font-normal opacity-80 mt-0.5">{cnt > 0 ? 'sales' : 'none'}</span>
                                    </div>
                                  </td>
                                );
                              })}

                              {/* Aggregates columns right boundaries */}
                              <td className="p-2 text-center border-l border-gray-100 dark:border-slate-800 font-mono text-gray-500 font-semibold text-xs bg-gray-50/15">
                                {targetVal}
                              </td>
                              <td className="p-2 text-center font-mono text-gray-800 dark:text-white font-extrabold text-xs bg-gray-50/15">
                                {achievedVal}
                              </td>
                              <td className="p-2 text-center bg-gray-50/15">
                                <span className={`inline-block py-0.5 px-2 rounded-xs text-[10px] font-mono font-bold select-none ${
                                  percentageVal >= 100
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                                    : percentageVal >= 50
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30'
                                    : 'bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
                                }`}>
                                  {percentageVal.toFixed(0)}%
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              {/* KPI Modes Grids */}
                              {/* KPI 1: Targets */}
                              <td className="p-2 text-center">
                                <span className="font-mono text-xs text-gray-500 dark:text-slate-400 font-semibold">
                                  {targetVal} units
                                </span>
                              </td>

                              {/* KPI 2: Realized */}
                              <td className="p-2 text-center">
                                <span className="font-mono text-xs text-gray-800 dark:text-white font-extrabold bg-gray-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-gray-100 dark:border-slate-700/40">
                                  {achievedVal} units
                                </span>
                              </td>

                              {/* KPI 3: Target Fulfillment Heatmap Cell */}
                              {(() => {
                                // Intensity gradient based on percentage achievement
                                let intensityStyle = "bg-rose-50 border border-rose-100 text-rose-800 dark:bg-rose-950/10 dark:border-rose-900/20 dark:text-rose-400";
                                if (percentageVal >= 100) {
                                  intensityStyle = "bg-emerald-500 text-white border border-emerald-600 shadow-3xs font-extrabold animate-pulse";
                                } else if (percentageVal >= 80) {
                                  intensityStyle = "bg-emerald-50 border border-emerald-100 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400";
                                } else if (percentageVal >= 50) {
                                  intensityStyle = "bg-indigo-50 border border-indigo-100 text-indigo-950 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400";
                                } else if (percentageVal > 0) {
                                  intensityStyle = "bg-amber-50 border border-amber-100 text-amber-955 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400";
                                }

                                return (
                                  <td className="p-2 text-center">
                                    <div className={`mx-auto w-24 py-1.5 rounded-lg text-xs font-mono font-bold text-center ${intensityStyle}`}>
                                      {percentageVal.toFixed(0)}%
                                      <span className="block text-[7px] font-sans font-normal opacity-85">{percentageVal >= 100 ? "Goal Cleared! 🏆" : "Ongoing target"}</span>
                                    </div>
                                  </td>
                                );
                              })()}

                              {/* KPI 4: Project Value (BDT volume) Heatmap Cell */}
                              {(() => {
                                // Density color by sales size (BDT Lakh volume)
                                let volStyle = "bg-slate-50 text-gray-400 border border-slate-100 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/20";
                                let volText = "0.0 Lakh";
                                if (totalVolumeBDTVal > 0) {
                                  volText = `${(totalVolumeBDTVal / 100000).toFixed(1)} Lakh`;
                                  if (totalVolumeBDTVal >= 10000000) { // 1 Crore
                                    volStyle = "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-indigo-600 shadow-3xs font-bold";
                                  } else if (totalVolumeBDTVal >= 5000000) { // 50 Lakh
                                    volStyle = "bg-indigo-50 text-indigo-900 border border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/30 font-extrabold";
                                  } else {
                                    volStyle = "bg-indigo-50/50 text-indigo-700 border border-indigo-100/30 dark:bg-indigo-950/15 dark:text-indigo-400 dark:border-indigo-900/10";
                                  }
                                }

                                return (
                                  <td className="p-2 text-center">
                                    <div className={`mx-auto w-24 py-1.5 rounded-lg text-xs font-mono border text-center ${volStyle}`}>
                                      {volText}
                                      <span className="block text-[7px] font-sans font-normal opacity-80">sales vol value</span>
                                    </div>
                                  </td>
                                );
                              })()}

                              {/* KPI 5: Total Earned Commissions Heatmap Cell */}
                              {(() => {
                                let comStyle = "bg-slate-50 text-gray-400 border border-slate-100 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/20";
                                if (totalIncentiveBDTVal > 0) {
                                  if (totalIncentiveBDTVal >= 25000) {
                                    comStyle = "bg-gradient-to-br from-emerald-500 to-teal-500 text-white border border-emerald-600 shadow-3xs font-bold animate-pulse";
                                  } else if (totalIncentiveBDTVal >= 10000) {
                                    comStyle = "bg-emerald-50 text-emerald-950 border border-emerald-150 dark:bg-emerald-950/45 dark:text-emerald-300 dark:border-emerald-900/40 font-extrabold";
                                  } else {
                                    comStyle = "bg-emerald-50/50 text-emerald-700 border border-emerald-100/30 dark:bg-emerald-950/15 dark:text-emerald-400 dark:border-emerald-900/10";
                                  }
                                }

                                return (
                                  <td className="p-2 text-center">
                                    <div className={`mx-auto w-24 py-1.5 rounded-lg text-xs font-mono border text-center ${comStyle}`}>
                                      {totalIncentiveBDTVal > 0 ? `${totalIncentiveBDTVal.toLocaleString()} ৳` : '-'}
                                      <span className="block text-[7px] font-sans font-normal opacity-80">earned payout</span>
                                    </div>
                                  </td>
                                );
                              })()}

                              {/* KPI 6: Extra Milestone Bonuses Heatmap Cell */}
                              {(() => {
                                let bStyle = "bg-slate-50 text-gray-400 border border-slate-100 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800/20";
                                if (milestoneBonusBDTVal > 0) {
                                  if (milestoneBonusBDTVal >= 5000) {
                                    bStyle = "bg-gradient-to-br from-amber-500 to-orange-500 text-white border border-amber-600 shadow-3xs font-extrabold";
                                  } else {
                                    bStyle = "bg-amber-50 text-amber-900 border border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/30 font-bold";
                                  }
                                }

                                return (
                                  <td className="p-2 text-center">
                                    <div className={`mx-auto w-24 py-1.5 rounded-lg text-xs font-mono border text-center ${bStyle}`}>
                                      {milestoneBonusBDTVal > 0 ? `+${milestoneBonusBDTVal.toLocaleString()} ৳` : '-'}
                                      <span className="block text-[7px] font-sans font-normal opacity-80 font-sans">extra adjustments</span>
                                    </div>
                                  </td>
                                );
                              })()}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 border border-dashed border-gray-150 dark:border-slate-800 rounded-2xl">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">No active subordinates or sales data recorded under your division.</p>
                </div>
              )}
            </div>

            {/* Guide Legend footer inside Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-gray-100 dark:border-slate-800 pt-4 text-[10px] text-gray-400 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold uppercase shrink-0 text-gray-400">Color Intensity Legend:</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-xs bg-gray-100 dark:bg-slate-800 border border-gray-200" />
                  <span>Zero Sales / No target realization</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-xs bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100" />
                  <span>1 Unit Reservation / Low level KPI</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-xs bg-emerald-250 dark:bg-emerald-800/40 border border-emerald-300" />
                  <span>2 Units / Mid level KPI</span>
                </div>
                <div className="flex items-center gap-1 animate-pulse">
                  <div className="w-3.5 h-3.5 rounded-xs bg-gradient-to-br from-emerald-500 to-teal-500" />
                  <span>3+ Units / Goal Cleared! 🔥</span>
                </div>
              </div>
              <div className="font-medium font-mono text-indigo-600 dark:text-indigo-400">
                *Aggregates calculated based on active chronologically resolved target dates.
              </div>
            </div>
          </div>
        )}

        {/* Team Leader Subordinates Performance Leaderboard Section */}
        {(userRole === 'Sales Team Leader' || userRole === 'Admin') && (() => {
          const bonusRules = data?.bonusRules || {
            target_90_bonus: 2000,
            target_100_bonus: 3500,
            team_target_bonus: 5000
          };

          const rankedSubordinates = [...achievements].sort((a: any, b: any) => {
            if (b.percentage !== a.percentage) {
              return b.percentage - a.percentage;
            }
            return b.achieved - a.achieved;
          });

          const podium1 = rankedSubordinates[0] || null;
          const podium2 = rankedSubordinates[1] || null;
          const podium3 = rankedSubordinates[2] || null;

          return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-150 dark:border-slate-800 p-6 space-y-8 shadow-sm">
              {/* Leaderboard Header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-400 font-sans">
                    🏆 Performance Honor Roll
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-505 bg-amber-500 animate-pulse" />
                  <span className="text-[10px] text-gray-400 font-mono font-bold tracking-wide">Dynamic Rank Board</span>
                </div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" /> Top Performers Leaderboard
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-400">
                  Subordinates ranked by monthly unit allocation targets. Track milestone bonus progression levels of direct developers and executives.
                </p>
              </div>

              {rankedSubordinates.length > 0 ? (
                <div className="space-y-8">
                  {/* Visual Podium for top 3 */}
                  <div className="grid md:grid-cols-3 gap-6 pt-4 items-end max-w-4xl mx-auto">
                    
                    {/* 2nd Place Podium */}
                    <div className="order-2 md:order-1 flex flex-col items-center">
                      {podium2 ? (
                        <div className="w-full text-center space-y-3">
                          <div className="relative inline-block">
                            <div className="w-16 h-16 rounded-full bg-slate-150 bg-slate-100 dark:bg-slate-800 border-2 border-slate-350 flex items-center justify-center font-bold font-mono text-slate-700 dark:text-slate-300 text-xl shadow-xs">
                              {podium2.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-bold border border-white">
                              2
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 line-clamp-1">{podium2.name}</h4>
                            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-mono mt-0.5">
                              <Medal className="w-3.5 h-3.5 text-slate-450" />
                              <span>{podium2.achieved} / {podium2.target} Units ({podium2.percentage.toFixed(0)}%)</span>
                            </div>
                          </div>
                          {/* Slate pedestal */}
                          <div className="w-full h-16 bg-gradient-to-t from-slate-100/50 to-slate-150/40 dark:from-slate-800/40 dark:to-slate-850/20 rounded-t-xl border-t border-x border-gray-150 dark:border-slate-800 flex items-center justify-center">
                            <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-widest">Silver</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-24 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-gray-400">
                          Vacant Position
                        </div>
                      )}
                    </div>

                    {/* 1st Place Podium */}
                    <div className="order-1 md:order-2 flex flex-col items-center">
                      {podium1 ? (
                        <div className="w-full text-center space-y-3 relative -top-3">
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce">
                            <Crown className="w-7 h-7 text-amber-500" />
                          </div>
                          <div className="relative inline-block">
                            <div className="w-20 h-20 rounded-full bg-amber-50/50 dark:bg-amber-950/20 border-3 border-amber-400 flex items-center justify-center font-bold font-mono text-amber-700 dark:text-amber-450 text-2xl shadow-md">
                              {podium1.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black border-2 border-white animate-pulse">
                              1
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-indigo-950 dark:text-slate-100 line-clamp-1">{podium1.name}</h4>
                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-700 font-mono font-bold mt-0.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-400 text-amber-500" />
                              <span>{podium1.achieved} / {podium1.target} Units ({podium1.percentage.toFixed(0)}%)</span>
                            </div>
                          </div>
                          {/* Gold pedestal */}
                          <div className="w-full h-24 bg-gradient-to-t from-amber-100/40 to-amber-50/20 dark:from-amber-950/20 dark:to-amber-900/10 rounded-t-xl border-t border-x border-amber-200 dark:border-amber-900/40 flex flex-col items-center justify-center shadow-xs">
                            <span className="font-mono text-[11px] font-black text-amber-600 uppercase tracking-widest">Champion</span>
                            <span className="text-[9px] text-amber-500 font-sans tracking-wide">Top Rank Spot</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-24 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-gray-400">
                          Vacant Position
                        </div>
                      )}
                    </div>

                    {/* 3rd Place Podium */}
                    <div className="order-3 md:order-3 flex flex-col items-center">
                      {podium3 ? (
                        <div className="w-full text-center space-y-3">
                          <div className="relative inline-block">
                            <div className="w-16 h-16 rounded-full bg-amber-50/10 dark:bg-amber-950/10 border-2 border-amber-605 border-amber-600 flex items-center justify-center font-bold font-mono text-amber-800 dark:text-amber-450 text-xl shadow-xs">
                              {podium3.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold border border-white">
                              3
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200 line-clamp-1">{podium3.name}</h4>
                            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-mono mt-0.5">
                              <Medal className="w-3.5 h-3.5 text-amber-600" />
                              <span>{podium3.achieved} / {podium3.target} Units ({podium3.percentage.toFixed(0)}%)</span>
                            </div>
                          </div>
                          {/* Bronze pedestal */}
                          <div className="w-full h-12 bg-gradient-to-t from-amber-50/30 to-amber-100/10 dark:from-amber-955 dark:from-amber-950/10 dark:to-amber-950/5 rounded-t-xl border-t border-x border-amber-100 dark:border-amber-950 flex items-center justify-center">
                            <span className="font-mono text-xs font-bold text-amber-750 text-amber-800 uppercase tracking-widest">Bronze</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-24 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-gray-400">
                          Vacant Position
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Complete Rankings List & Approaching bonus tiers indicators */}
                  <div className="space-y-3.5 pt-4">
                    <h3 className="text-xs font-bold text-gray-400 font-mono tracking-wider uppercase">Active Subordinate Honors & Bonus Tiers</h3>
                    <div className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-gray-50/15 dark:bg-slate-900/40">
                      {rankedSubordinates.map((exec: any, index: number) => {
                        const target = exec.target || 1;
                        const achieved = exec.achieved || 0;
                        const percentage = exec.percentage || 0;

                        // Calculate custom visual badges & status description for bonus tiers
                        let bonusText = "";
                        let approachStatus = "";
                        let barColor = "bg-rose-500";
                        let badgeStyle = "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-955 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30";
                        let iconEl = <Target className="w-3.5 h-3.5 text-rose-500 shrink-0" />;

                        if (percentage >= 100) {
                          bonusText = `🏆 Max Target Bonus Unlocked!`;
                          approachStatus = `Earned +${bonusRules.target_100_bonus.toLocaleString()} ৳ milestone award!`;
                          barColor = "bg-gradient-to-r from-amber-500 to-emerald-500";
                          badgeStyle = "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30 font-extrabold animate-pulse";
                          iconEl = <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
                        } else if (percentage >= 90) {
                          const unitsToMax = Math.max(1, target - achieved);
                          bonusText = `⭐ 90% Target Bonus Unlocked!`;
                          approachStatus = `Earned +${bonusRules.target_90_bonus.toLocaleString()} ৳ milestone. Only ${unitsToMax} unit${unitsToMax > 1 ? 's' : ''} left for Max Bonus (+${bonusRules.target_100_bonus.toLocaleString()} ৳)!`;
                          barColor = "bg-emerald-500";
                          badgeStyle = "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30 font-bold";
                          iconEl = <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
                        } else if (percentage >= 80) {
                          const reqFlats = Math.max(1, Math.ceil(target * 0.9) - achieved);
                          bonusText = `⚡ Approaching Bonus Tier (80%+)`;
                          approachStatus = `Only ${reqFlats} flat reservation${reqFlats > 1 ? 's' : ''} to unlock the ${bonusRules.target_90_bonus.toLocaleString()} ৳ Bonus Tier!`;
                          barColor = "bg-indigo-500 animate-pulse";
                          badgeStyle = "bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30 font-semibold";
                          iconEl = <Star className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
                        } else if (percentage >= 50) {
                          const reqFlats = Math.max(1, Math.ceil(target * 0.9) - achieved);
                          bonusText = `📈 Moderate Progress`;
                          approachStatus = `Needs ${reqFlats} more units for 90% bonus qualification (Needs ${Math.ceil(target * 0.9)} units).`;
                          barColor = "bg-indigo-400";
                          badgeStyle = "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/30";
                        } else {
                          const reqFlats = Math.max(1, Math.ceil(target * 0.9) - achieved);
                          bonusText = `🎯 Base Building`;
                          approachStatus = `Accelerate bookings! Only ${reqFlats} more flats to hit first bonus threshold zone.`;
                          barColor = "bg-rose-400";
                          badgeStyle = "bg-rose-50/50 text-rose-600 border border-rose-100/40 dark:bg-rose-950/10 dark:text-rose-400 dark:border-rose-900/10";
                        }

                        return (
                          <div key={exec.id || exec.name} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white dark:hover:bg-slate-850/10 transition">
                            {/* Rank and identity profile */}
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-black text-gray-400 w-5 flex items-center justify-center shrink-0">
                                #{index + 1}
                              </span>
                              <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-800 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-slate-350 font-mono shrink-0">
                                {exec.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                  {exec.name}
                                  {index === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/25 shrink-0" />}
                                </h4>
                                <p className="text-[9px] text-gray-400 font-mono">Month Volume: {((exec.totalVolumeBDT || 0) / 100000).toFixed(1)}L BDT</p>
                              </div>
                            </div>

                            {/* Bar charts metrics */}
                            <div className="flex-1 max-w-sm space-y-1">
                              <div className="flex items-center justify-between text-[10px] font-mono font-medium">
                                <span className="text-gray-400">Target Progress</span>
                                <span className="text-gray-800 dark:text-slate-200 font-bold">{achieved} of {target} Units ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                              </div>
                              <span className="block text-[9px] text-indigo-650 dark:text-indigo-400 font-medium font-sans">
                                {approachStatus}
                              </span>
                            </div>

                            {/* Tier Indicator status */}
                            <div className="flex items-center">
                              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-medium text-[10px] select-none border shadow-3xs ${badgeStyle}`}>
                                {iconEl}
                                <span className="font-sans font-bold">{bonusText}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed border-gray-150 dark:border-slate-800 rounded-2xl">
                  <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">No subordinate data or sales structures configured under division.</p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Chronological Activity Timeline Component */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" /> Operational Activity Feed
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Audited stream of chronological sales reservations, performance achievements, and property listings.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-gray-50 dark:bg-slate-850 rounded-xl border border-gray-100 dark:border-slate-800 w-fit">
              <button
                type="button"
                onClick={() => setTimelineFilter('all')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  timelineFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-3xs'
                    : 'text-gray-500 hover:text-gray-900 dark:text-slate-400'
                }`}
              >
                All Events ({data.timelineActivities?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('sale')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  timelineFilter === 'sale'
                    ? 'bg-indigo-55 bg-indigo-600 text-white shadow-3xs'
                    : 'text-gray-500 hover:text-indigo-600 dark:text-indigo-400'
                }`}
              >
                Sales Bookings
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('milestone')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  timelineFilter === 'milestone'
                    ? 'bg-amber-500 text-white shadow-3xs'
                    : 'text-gray-500 hover:text-amber-500'
                }`}
              >
                Milestones
              </button>
              <button
                type="button"
                onClick={() => setTimelineFilter('project')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  timelineFilter === 'project'
                    ? 'bg-emerald-600 text-white shadow-3xs'
                    : 'text-gray-500 hover:text-emerald-500'
                }`}
              >
                Assets
              </button>
            </div>
          </div>

          {(() => {
            const unfilteredActivities = data.timelineActivities || [];
            const filteredActivities = unfilteredActivities.filter((act: any) => {
              if (timelineFilter === 'all') return true;
              return act.type === timelineFilter;
            });

            if (filteredActivities.length === 0) {
              return (
                <div className="text-center py-12 border border-dashed border-gray-150 dark:border-slate-800 rounded-2xl">
                  <Activity className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500">No activities match your chosen categories in this view.</p>
                </div>
              );
            }

            return (
              <div className="relative border-l border-indigo-100/60 dark:border-slate-800 ml-4 sm:ml-6 pl-6 sm:pl-8 space-y-6">
                {filteredActivities.map((act: any, idx: number) => {
                  // Style configurations
                  let iconElement = <TrendingUp className="w-4 h-4" />;
                  let badgeColor = "bg-indigo-50 border-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400";
                  let dotColor = "border-indigo-500 bg-white dark:bg-slate-900";

                  if (act.type === 'milestone') {
                    iconElement = <Crown className="w-4 h-4" />;
                    badgeColor = "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400";
                    dotColor = "border-amber-500 bg-white dark:bg-slate-900";
                  } else if (act.type === 'project') {
                    iconElement = <Building2 className="w-4 h-4" />;
                    badgeColor = "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-450";
                    dotColor = "border-emerald-500 bg-white dark:bg-slate-900";
                  }

                  return (
                    <div key={act.id} className="relative group animate-fade-in text-xs">
                      {/* Timeline Dot Indicator */}
                      <span className={`absolute -left-[31px] sm:-left-[39px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${dotColor} z-10 transition-transform duration-300 group-hover:scale-130`} />

                      {/* Card layout */}
                      <div className="bg-gray-50/30 hover:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-850/30 p-4 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-3xs hover:shadow-2xs transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase text-[8.5px] border tracking-wider flex items-center gap-1 shrink-0 ${badgeColor}`}>
                                {iconElement}
                                {act.type === 'sale' ? 'Sale booking' : act.type === 'milestone' ? 'Milestone' : 'Asset Registry'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono font-bold shrink-0">
                                📅 {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>

                            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 transition duration-200 mt-2">
                              {act.title}
                            </h4>
                            <p className="text-gray-550 dark:text-slate-400 leading-relaxed font-sans mt-1">
                              {act.description}
                            </p>
                          </div>

                          {/* Float right dynamic value badge if premium is logged */}
                          {act.metadata && (
                            <div className="shrink-0 text-right">
                              <span className="inline-block bg-indigo-50/50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-100/40 dark:border-slate-700 px-2.5 py-1 rounded-xl text-xs font-mono font-bold whitespace-nowrap shadow-3xs">
                                {act.metadata}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Project Wise Sales Distribution Section (Fully Redesigned Tabular Interactive Board) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              Project Wise Sales Distribution
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Interactive cockpit displaying target capacity, book rates, individual executive contributions, and actual project registers.
            </p>
          </div>

          {projectData.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs font-mono">
              No active projects found.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Project choosing tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projectData.map((proj: any) => {
                  const isSelected = (selectedProjectId || (projectData[0] && projectData[0].id)) === proj.id;
                  const progressPerc = proj.totalUnits > 0 ? (proj.soldUnits / proj.totalUnits) * 100 : 0;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className={`text-left p-4 rounded-2xl border text-xs space-y-3 transition duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500 ring-2 ring-indigo-500/20'
                          : 'bg-gray-50/40 dark:bg-slate-800/10 border-gray-100 dark:border-slate-800/75 hover:bg-gray-100/40 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 dark:text-white truncate text-xs w-[75%]">
                            {proj.name}
                          </h4>
                          {proj.registration === 'Yes' && (
                            <span className="text-[8px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-1 py-0.2 rounded-full scale-90">Inc Add</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 truncate">
                          {proj.location || 'Dhaka North'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-500 dark:text-slate-400 font-semibold">
                          {proj.soldUnits || 0} / {proj.totalUnits || 15} Sold
                        </span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {progressPerc.toFixed(0)}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${progressPerc}%` }}
                          className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Project Detailed Information Console */}
              {(() => {
                const activeProj = projectData.find((p: any) => p.id === selectedProjectId) || projectData[0];
                if (!activeProj) return null;
                return (
                  <div className="grid lg:grid-cols-12 gap-6 pt-2 animate-fade-in">
                    
                    {/* Capacity Units Grid */}
                    <div className="lg:col-span-4 space-y-4">
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        Booking Status
                      </h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-50/50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 p-3 rounded-2xl text-center space-y-1">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Capacity</span>
                          <span className="text-base font-black text-gray-900 dark:text-white block font-mono">{activeProj.totalUnits || 15}</span>
                          <span className="text-[9px] text-gray-400 dark:text-slate-500 font-semibold block">Total</span>
                        </div>
                        <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/40 p-3 rounded-2xl text-center space-y-1">
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-wider block">Booked</span>
                          <span className="text-base font-black text-emerald-700 dark:text-emerald-400 block font-mono">{activeProj.soldUnits || 0}</span>
                          <span className="text-[9px] text-emerald-500/80 dark:text-emerald-500 font-semibold block">Units Sold</span>
                        </div>
                        <div className="bg-amber-50/30 dark:bg-amber-955/10 border border-amber-100/40 dark:border-amber-900/40 p-3 rounded-2xl text-center space-y-1">
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-450 uppercase tracking-wider block">Left</span>
                          <span className="text-base font-black text-amber-700 dark:text-amber-400 block font-mono">{activeProj.remainingUnits || 15}</span>
                          <span className="text-[9px] text-amber-500/80 dark:text-amber-500 font-semibold block">Available</span>
                        </div>
                      </div>

                      {/* Cumulative Land Share value */}
                      <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-900/40 dark:to-indigo-950/20 p-5 rounded-2xl border border-transparent dark:border-indigo-950 text-white dark:text-indigo-100 space-y-3 relative overflow-hidden shadow-xs">
                        <div className="relative z-10 space-y-1">
                          <p className="text-[9px] text-indigo-100 dark:text-indigo-400 font-bold uppercase tracking-wider">Estimated Project Value</p>
                          <h4 className="text-xl font-black font-mono">
                            {activeProj.sales >= 10000000
                              ? `${(activeProj.sales / 10000000).toFixed(2)} Crore BDT`
                              : `${(activeProj.sales / 100000).toFixed(1)} Lakh BDT`}
                          </h4>
                          <p className="text-[10px] text-indigo-150/80 dark:text-indigo-450 leading-relaxed pt-1">
                            Sales incentive calculation support is <strong>{activeProj.registration === 'Yes' ? 'ENABLED' : 'DISABLED'}</strong> based on active project registry policies.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Executive Contributions */}
                    <div className="lg:col-span-4 space-y-3 flex flex-col">
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        Individual Executive Splits
                      </h4>
                      <div className="bg-gray-50/30 dark:bg-slate-800/20 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 flex-1 space-y-3.5 overflow-y-auto max-h-[220px]">
                        {(!activeProj.execContributions || activeProj.execContributions.length === 0) ? (
                          <div className="text-center py-10 text-gray-400 dark:text-slate-600 text-xs font-mono">
                            No executive sales logged yet.
                          </div>
                        ) : (
                          activeProj.execContributions.map((exec: any) => {
                            const contributionPerc = activeProj.soldUnits > 0 ? (exec.count / activeProj.soldUnits) * 100 : 0;
                            return (
                              <div key={exec.id} className="flex items-center justify-between border-b border-gray-100/50 dark:border-slate-800/50 pb-2.5 last:border-0 last:pb-0">
                                <div className="space-y-0.5">
                                  <p className="font-bold text-gray-800 dark:text-slate-200 text-xs">
                                    {exec.name}
                                  </p>
                                  <p className="text-[9px] text-gray-400 dark:text-slate-500 font-mono">
                                    Employee ID: {exec.employee_id}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-mono font-bold text-gray-900 dark:text-white text-xs">
                                    {exec.count} Flat(s)
                                  </p>
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-450 font-mono font-semibold">
                                    {contributionPerc.toFixed(0)}% contribution
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Ledger of logged apartments */}
                    <div className="lg:col-span-4 space-y-3 flex flex-col">
                      <h4 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                        Sold Units Ledger
                      </h4>
                      <div className="bg-gray-50/30 dark:bg-slate-800/10 border border-gray-100 dark:border-slate-800/80 rounded-2xl p-4 flex-1 space-y-3 overflow-y-auto max-h-[220px]">
                        {(!activeProj.soldUnitsList || activeProj.soldUnitsList.length === 0) ? (
                          <div className="text-center py-10 text-gray-400 dark:text-slate-600 text-xs font-mono">
                            No logged bookings.
                          </div>
                        ) : (
                          activeProj.soldUnitsList.map((unit: any) => (
                            <div key={unit.id} className="flex items-center justify-between border-b border-gray-100/40 dark:border-slate-800/40 pb-2.5 last:border-0 last:pb-0">
                              <div className="space-y-0.5">
                                <span className="font-mono text-[9px] font-bold text-gray-800 dark:text-slate-200 px-1.5 py-0.5 bg-gray-200/50 dark:bg-slate-800 rounded">
                                  {unit.unit_name}
                                </span>
                                <p className="text-[9px] text-gray-400 dark:text-slate-500 pt-0.5">
                                  Floor: {unit.floor_number}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-semibold text-gray-700 dark:text-slate-350">
                                  By {unit.executive_name}
                                </p>
                                <span className="text-[8px] text-gray-400 dark:text-slate-500 font-mono">
                                  {unit.sale_date}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team wise break up */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Sales Team Wise Incentives
            </h3>
            <p className="text-xs text-gray-500">Incentive payout aggregates grouped by project teams.</p>
          </div>

          <div className="min-h-[290px] max-h-[350px] overflow-y-auto pr-1 space-y-5 pt-2">
            {teamData.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-mono">
                No incentive distributions calculated yet.
              </div>
            ) : (
              teamData.map((tm: any) => {
                const widthPerc = `${Math.max(((tm.incentive || 0) / maxTeamIncentives) * 100, 4)}%`;
                const contributionPerc = totalTeamIncentivesSum > 0 ? ((tm.incentive || 0) / totalTeamIncentivesSum) * 100 : 0;

                return (
                  <div key={tm.id || tm.name} className="space-y-2 group animate-fade-in">
                    <div className="flex items-start justify-between text-xs">
                      <div className="space-y-0.5 max-w-[65%]">
                        <div className="font-semibold text-gray-800 group-hover:text-emerald-700 transition truncate">
                          {tm.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <span className="font-semibold px-1.5 py-0.5 bg-emerald-50/50 rounded text-emerald-700">
                            {contributionPerc.toFixed(1)}% payout share
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="font-bold font-mono text-emerald-800">
                          {(tm.incentive || 0).toLocaleString()} BDT
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">claims volume</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100/60 p-[1px]">
                      <div 
                        style={{ width: widthPerc }} 
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 transition-all duration-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top 5 Performers Widget */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500 animate-pulse" />
              Top Performers ({execAchievementsPeriod || "Latest Month"})
            </h3>
            <p className="text-xs text-gray-500">Leading agents ranked by total monthly incentive payouts.</p>
          </div>

          <div className="min-h-[290px] max-h-[350px] overflow-y-auto pr-1 space-y-3 pt-2">
            {achievements.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs font-mono">
                No active performance records.
              </div>
            ) : (
              [...achievements]
                .sort((a, b) => (b.totalIncentiveBDT || 0) - (a.totalIncentiveBDT || 0))
                .slice(0, 5)
                .map((ach: any, idx: number) => {
                  const rankColors = [
                    { bg: "bg-amber-50 border-amber-250 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/35", icon: <Trophy className="w-3.5 h-3.5" /> },
                    { bg: "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800/35 dark:border-slate-750", icon: <Medal className="w-3.5 h-3.5" /> },
                    { bg: "bg-orange-50 border-orange-200 text-orange-600 dark:bg-orange-950/20 dark:border-orange-900/35", icon: <Award className="w-3.5 h-3.5" /> },
                  ];

                  const rankStyle = rankColors[idx] || {
                    bg: "bg-gray-55/60 border-gray-150 text-gray-500",
                    icon: <span className="font-mono text-[10px] font-bold">{idx + 1}</span>
                  };

                  return (
                    <div key={ach.id || ach.name} className="flex items-center justify-between p-2.5 rounded-2xl border border-gray-50 hover:bg-gray-50/65 dark:hover:bg-slate-850 transition duration-200 group">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-6.5 h-6.5 rounded-lg border flex items-center justify-center shrink-0 ${rankStyle.bg}`}>
                          {rankStyle.icon}
                        </div>

                        {/* Executive Info */}
                        <div className="truncate">
                          <p className="font-bold text-gray-800 dark:text-gray-100 text-xs truncate group-hover:text-indigo-650 transition">
                            {ach.name}
                          </p>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {ach.achieved || 0} unit(s) sold
                          </span>
                        </div>
                      </div>

                      {/* Payoff Column */}
                      <div className="text-right shrink-0">
                        <p className="font-bold font-mono text-xs text-emerald-650 leading-none mb-0.5">
                          {(ach.totalIncentiveBDT || 0).toLocaleString()} ৳
                        </p>
                        <p className="text-[9px] text-gray-400 font-mono leading-none">
                          +{(ach.milestoneBonusBDT || 0).toLocaleString()} bonus
                        </p>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Executive Target Progress Tracker */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">Executive Targets Tracker ({execAchievementsPeriod || "Latest Month"})</h3>
              <p className="text-xs text-gray-500">Individual commission target achievement rates.</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
              <FlameKindling className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-4 h-64 overflow-y-auto pr-1">
            {achievements.map((ach: any) => {
              const cappedPerc = Math.min(ach.percentage || 0, 100);
              const progressWidth = `${cappedPerc}%`;
              let barColor = "bg-rose-500";
              if (ach.percentage >= 100) barColor = "bg-emerald-500";
              else if (ach.percentage >= 90) barColor = "bg-amber-500";
              else if (ach.percentage >= 50) barColor = "bg-indigo-500";

              return (
                <div key={ach.id || ach.name} className="space-y-1.5 border-b border-gray-0 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">{ach.name}</span>
                    <span className="font-semibold font-mono text-gray-600">
                      {(ach.achieved || 0).toLocaleString()} / {(ach.target || 0).toLocaleString()} Flat(s) ({(ach.percentage || 0).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      style={{ width: progressWidth }} 
                      className={`h-full ${barColor} transition-all duration-500`}
                    />
                  </div>
                  {(ach.percentage || 0) >= 90 && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                      <span>✓ Qualifying for:</span>
                      <span>
                        {(ach.percentage || 0) >= 100 ? "3,500 BDT Target Achievement Bonus" : "2,000 BDT Target Achievement Bonus" }
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            {achievements.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-xs font-mono">No executives targets data registered yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
