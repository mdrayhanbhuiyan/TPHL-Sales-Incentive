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
  Building2
} from 'lucide-react';

interface DashboardProps {
  authToken: string;
}

export default function DashboardView({ authToken }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'sale' | 'milestone' | 'project'>('all');

  useEffect(() => {
    fetch('/api/dashboard/analytics', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    })
    .then(r => r.json())
    .then(res => {
      setData(res);
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [authToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500 font-mono">Compiling dashboard analytics...</p>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="text-xl font-bold text-rose-600 font-sans">Error Loading Dashboard Analytics</div>
        <p className="text-sm font-medium text-gray-500 font-mono">{data?.error || "Invalid response format"}</p>
        <p className="text-xs text-gray-400">Please verify your server connection or try logging out and logging in again.</p>
      </div>
    );
  }

  const { cards, tops, charts, execAchievements, execAchievementsPeriod } = data;

  // Let's find maximums to scale custom SVG charts proportionally safely
  const timelineData = charts?.timeline || [];
  const projectData = charts?.projects || [];
  const teamData = charts?.teams || [];
  const achievements = execAchievements || [];

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

      <div className="grid md:grid-cols-2 gap-6">
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
