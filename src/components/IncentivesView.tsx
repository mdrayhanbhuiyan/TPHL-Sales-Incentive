/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Coins, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  FolderHeart, 
  Users, 
  Trophy, 
  ArrowUpRight,
  Filter
} from 'lucide-react';

interface IncentivesProps {
  authToken: string;
  userRole: string;
}

export default function IncentivesView({ authToken, userRole }: IncentivesProps) {
  const [incentives, setIncentives] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selProject, setSelProject] = useState('All');
  const [selMonth, setSelMonth] = useState('All');

  // Report Type Selection
  const [activeReport, setActiveReport] = useState<string>('mon-inc'); 
  // 'mon-sales' | 'mon-inc' | 'exec-perf' | 'team-perf' | 'proj-sales' | 'proj-inc' | 'top-seller' | 'top-earner'

  const fetchIncentivesAndTeams = async () => {
    setLoading(true);
    try {
      const incRes = await fetch('/api/incentives', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await incRes.json();
      setIncentives(Array.isArray(data) ? data : []);

      // Also get team directory with targets & leaders
      const teamRes = await fetch('/api/teams', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const teamData = await teamRes.json();
      setTeams(Array.isArray(teamData) ? teamData : []);
    } catch (err) {
      console.error("Error loaded report states:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncentivesAndTeams();
  }, [authToken]);

  // List unique values for filters
  const uniqueProjects = Array.from(new Set(incentives.map(inc => inc.project_name))).sort();
  const monthsName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Filter incentive rows based on filters
  const getFilteredIncentives = () => {
    return incentives.filter(inc => {
      const matchSearch = 
        String(inc.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(inc.executive_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(inc.unit_name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(inc.employee_id || '').toLowerCase().includes(search.toLowerCase());

      const matchProj = selProject === 'All' || inc.project_name === selProject;
      const matchMonth = selMonth === 'All' || String(inc.month) === selMonth;

      return matchSearch && matchProj && matchMonth;
    });
  };

  // 1. Report Generators:
  const getReportPayload = () => {
    const list = getFilteredIncentives();

    switch (activeReport) {
      case 'mon-sales':
        // Monthly Sales Report
        return {
          title: "Monthly Sales Journal Report",
          headers: ["Booking Date", "Project Development", "Unit Name", "Level", "Unit SFT", "Broker Officer", "Property Share value (BDT)"],
          rows: list.map(item => [
            item.sale_date,
            item.project_name,
            item.unit_name,
            `Level ${item.floor_number}`,
            String(item.unit_measure),
            `${item.executive_name} (${item.employee_id})`,
            Number(item.land_share_amount).toLocaleString()
          ]),
          sums: [
            "", "", "", "", "", "Total Volume Handled:", 
            list.reduce((sum, item) => sum + Number(item.land_share_amount), 0).toLocaleString() + " BDT"
          ]
        };

      case 'mon-inc':
        // Monthly Incentive Report
        return {
          title: "Monthly Sales Incentive Ledger Report",
          headers: ["Project Site", "Unit Info", "Sales Officer", "Base Inc (BDT)", "Floor Bonus (BDT)", "Target Bonus (BDT)", "Team Bonus (BDT)", "Total Payout (BDT)"],
          rows: list.map(item => [
            item.project_name,
            `${item.unit_name} (L${item.floor_number})`,
            item.executive_name,
            Number(item.base_incentive).toLocaleString(),
            Number(item.floor_bonus).toLocaleString(),
            Number(item.target_bonus).toLocaleString(),
            Number(item.team_bonus).toLocaleString(),
            Number(item.total_incentive).toLocaleString()
          ]),
          sums: [
            "", "", "Cumulative Sums:",
            list.reduce((sum, item) => sum + Number(item.base_incentive), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.floor_bonus), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.target_bonus), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.team_bonus), 0).toLocaleString(),
            list.reduce((sum, item) => sum + Number(item.total_incentive), 0).toLocaleString() + " BDT"
          ]
        };

      case 'exec-perf':
        // Executive Performance Report
        const execMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.executive_id;
          if (!execMap[key]) {
            execMap[key] = { name: item.executive_name, empId: item.employee_id, count: 0, val: 0, base: 0, bonuses: 0, net: 0 };
          }
          execMap[key].count += 1;
          execMap[key].val += Number(item.land_share_amount);
          execMap[key].base += Number(item.base_incentive);
          execMap[key].bonuses += Number(item.floor_bonus + item.target_bonus + item.team_bonus);
          execMap[key].net += Number(item.total_incentive);
        });
        const execRows = Object.values(execMap);
        return {
          title: "Executive Commission Performance Ledger",
          headers: ["Officer Name", "Employee IDprefix", "Registered Bookings", "Handled Volume (BDT)", "Cumulative Base (BDT)", "Allocated Bonuses (BDT)", "Total Net Payout (BDT)"],
          rows: execRows.map(o => [
            o.name, o.empId, o.count, o.val.toLocaleString(), o.base.toLocaleString(), o.bonuses.toLocaleString(), o.net.toLocaleString()
          ]),
          sums: [
            "Total Officers: " + execRows.length, "", 
            execRows.reduce((sum, o) => sum + o.count, 0),
            execRows.reduce((sum, o) => sum + o.val, 0).toLocaleString(),
            execRows.reduce((sum, o) => sum + o.base, 0).toLocaleString(),
            execRows.reduce((sum, o) => sum + o.bonuses, 0).toLocaleString(),
            execRows.reduce((sum, o) => sum + o.net, 0).toLocaleString() + " BDT"
          ]
        };

      case 'team-perf':
        // Team Performance Report
        // Align data dynamically with the real salesTeams list from the backend
        const directoryTeams = Array.isArray(teams) ? teams : [];
        const teamPerfMap: Record<string, any> = {};

        // 1. Seed report map with active registered teams to ensure 0-sale teams are also listed!
        directoryTeams.forEach(t => {
          teamPerfMap[t.team_name] = {
            team_name: t.team_name,
            team_leader: t.team_leader || 'N/A',
            sales_target: Number(t.sales_target || 0),
            count: 0,
            volume: 0,
            totalInc: 0
          };
        });

        // 2. Accumulate individual sales entries under respective teams (handles unassigned individuals as well)
        list.forEach(item => {
          const name = item.team_name || 'Unassigned / Independent';
          if (!teamPerfMap[name]) {
            teamPerfMap[name] = {
              team_name: name,
              team_leader: 'Independent Officers',
              sales_target: 0,
              count: 0,
              volume: 0,
              totalInc: 0
            };
          }
          teamPerfMap[name].count += 1;
          teamPerfMap[name].volume += Number(item.land_share_amount || 0);
          teamPerfMap[name].totalInc += Number(item.total_incentive || 0);
        });

        const teamPerfRows = Object.values(teamPerfMap);

        // 3. Map into complete audit rows
        const calculatedRows = teamPerfRows.map(t => {
          const compPercent = t.sales_target > 0 ? Math.round((t.count / t.sales_target) * 100) : 0;
          let verdict = "N/A - Off Cycle";
          if (t.sales_target > 0) {
            verdict = compPercent >= 100 ? "🎯 Fully Achieved" : compPercent >= 75 ? "📈 On Target Track" : "⚠️ Under Performing";
          }
          return [
            t.team_name,
            t.team_leader,
            t.sales_target > 0 ? `${t.sales_target} Units` : '-',
            `${t.count} Units`,
            t.sales_target > 0 ? `${compPercent}%` : '-',
            Number(t.volume).toLocaleString(),
            Number(t.totalInc).toLocaleString(),
            verdict
          ];
        });

        // 4. Over-all calculations
        const tTargets = teamPerfRows.reduce((s, t) => s + t.sales_target, 0);
        const tAchieved = teamPerfRows.reduce((s, t) => s + t.count, 0);
        const overallCompPercent = tTargets > 0 ? Math.round((tAchieved / tTargets) * 100) : 0;
        const totalVolume = teamPerfRows.reduce((s, t) => s + t.volume, 0);
        const totalPayouts = teamPerfRows.reduce((s, t) => s + t.totalInc, 0);

        const cumulativeSums = [
          "Sum Totals (" + teamPerfRows.length + " Divisions):",
          "",
          tTargets > 0 ? `${tTargets} Units` : "-",
          `${tAchieved} Units`,
          tTargets > 0 ? `${overallCompPercent}%` : "-",
          totalVolume.toLocaleString(),
          totalPayouts.toLocaleString() + " BDT",
          tTargets > 0 ? (overallCompPercent >= 100 ? "🎯 Target Exceeded" : "⚠️ Needs Improvement") : "N/A"
        ];

        return {
          title: "Sales Teams Performance & Targets Auditing Report",
          headers: ["Sales Team Division Name", "Team Leader", "Target Quota", "Achieved Sales", "Quota Completion %", "Accumulated Sales Volume (BDT)", "Total Distributed Commission (BDT)", "Performance Verdict"],
          rows: calculatedRows,
          sums: cumulativeSums
        };

      case 'proj-sales':
        // Project Wise Sales Report
        const projSalesMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.project_name;
          if (!projSalesMap[key]) {
            projSalesMap[key] = { project: item.project_name, count: 0, volume: 0 };
          }
          projSalesMap[key].count += 1;
          projSalesMap[key].volume += Number(item.land_share_amount);
        });
        const projSalesRows = Object.values(projSalesMap);
        return {
          title: "Project Wise Sales Volume Summary Report",
          headers: ["Project Site Name", "Units Booked", "Booking Pipeline Volume (BDT)"],
          rows: projSalesRows.map(p => [
            p.project, p.count, p.volume.toLocaleString()
          ]),
          sums: [
            "Total Projects: " + projSalesRows.length,
            projSalesRows.reduce((sum, p) => sum + p.count, 0),
            projSalesRows.reduce((sum, p) => sum + p.volume, 0).toLocaleString() + " BDT"
          ]
        };

      case 'proj-inc':
        // Project Wise Incentive Report
        const projIncMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.project_name;
          if (!projIncMap[key]) {
            projIncMap[key] = { project: item.project_name, count: 0, payouts: 0 };
          }
          projIncMap[key].count += 1;
          projIncMap[key].payouts += Number(item.total_incentive);
        });
        const projIncRows = Object.values(projIncMap);
        return {
          title: "Project Wise Commission Payout Summaries",
          headers: ["Project Site Name", "Claims Logs Saved", "Total Distributed Commission (BDT)"],
          rows: projIncRows.map(p => [
            p.project, p.count, p.payouts.toLocaleString()
          ]),
          sums: [
            "Total Sites: " + projIncRows.length,
            projIncRows.reduce((sum, p) => sum + p.count, 0),
            projIncRows.reduce((sum, p) => sum + p.payouts, 0).toLocaleString() + " BDT"
          ]
        };

      case 'top-seller':
        // Top Seller Report (sorted by volume handled descending)
        const topSMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.executive_id;
          if (!topSMap[key]) {
            topSMap[key] = { name: item.executive_name, empId: item.employee_id, team: item.team_name, count: 0, val: 0 };
          }
          topSMap[key].count += 1;
          topSMap[key].val += Number(item.land_share_amount);
        });
        const topSList = Object.values(topSMap).sort((a,b) => b.val - a.val).slice(0, 10);
        return {
          title: "Top 10 High-Value Seller Rankings",
          headers: ["Leaderboard Rank", "Officer Name", "Employee ID", "Sales Division", "Units Hooked", "Cumulative Sales Quota (BDT)"],
          rows: topSList.map((o, idx) => [
            `Rank #${idx + 1}`, o.name, o.empId, o.team, o.count, o.val.toLocaleString()
          ]),
          sums: [
            "", "", "", "Ranked Accumulation:", 
            topSList.reduce((sum, o) => sum + o.count, 0),
            topSList.reduce((sum, o) => sum + o.val, 0).toLocaleString() + " BDT"
          ]
        };

      case 'top-earner':
        // Top Incentive Earners Report (sorted by net payout descending)
        const topEMap: Record<string, any> = {};
        list.forEach(item => {
          const key = item.executive_id;
          if (!topEMap[key]) {
            topEMap[key] = { name: item.executive_name, empId: item.employee_id, team: item.team_name, count: 0, payouts: 0 };
          }
          topEMap[key].count += 1;
          topEMap[key].payouts += Number(item.total_incentive);
        });
        const topEList = Object.values(topEMap).sort((a,b) => b.payouts - a.payouts).slice(0, 10);
        return {
          title: "Top 10 High-Yield Incentive Earners",
          headers: ["Incentive Rank", "Sales Officer", "Employee ID", "Sales Division Team", "Claims Awarded", "Accumulated Commission Paid (BDT)"],
          rows: topEList.map((o, idx) => [
            `Rank #${idx + 1}`, o.name, o.empId, o.team, o.count, o.payouts.toLocaleString()
          ]),
          sums: [
            "", "", "", "Top Earners Cumulative Sum:", 
            topEList.reduce((sum, o) => sum + o.count, 0),
            topEList.reduce((sum, o) => sum + o.payouts, 0).toLocaleString() + " BDT"
          ]
        };

      default:
        return { title: "TPHL Report", headers: [], rows: [], sums: [] };
    }
  };

  const activeRepObj = getReportPayload();

  // --- ACTIONS EXPORTERS ---

  // EXPORT EXCEL (CSV formatting and triggers)
  const triggerExcelExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    // Title row
    csvContent += `"${activeRepObj.title}"\n`;
    csvContent += `Generated: ${new Date().toISOString()}\n\n`;
    
    // Headers
    csvContent += activeRepObj.headers.map(h => `"${h}"`).join(",") + "\n";
    
    // Rows
    activeRepObj.rows.forEach(r => {
      // Remove commas from inside numbers to prevent CSV breakage
      const sanitized = r.map((cell: any) => `"${String(cell).replace(/"/g, '""').replace(/,/g, '')}"`);
      csvContent += sanitized.join(",") + "\n";
    });

    // Sums
    csvContent += activeRepObj.sums.map(s => `"${String(s).replace(/"/g, '""').replace(/,/g, '')}"`).join(",") + "\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const safeFilename = activeRepObj.title.toLowerCase().replace(/\s+/g, "_") + ".csv";
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", safeFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT PDF (Structured HTML printable sheets template popup)
  const triggerPrintPDF = () => {
    // Generate an absolute styling print wrapper and trigger print!
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Incentive ledger &amp; Reports</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">Generate operational analyses, inspect commission allocations, and extract documentation sheets.</p>
        </div>
      </div>

      {/* Reports Directory tabs selectors */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs space-y-4">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Select Target Report Criteria</span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'mon-inc', label: "Monthly Incentive Report", icon: Coins, color: 'text-emerald-500 bg-emerald-50' },
            { id: 'mon-sales', label: "Monthly Sales Report", icon: Calendar, color: 'text-indigo-500 bg-indigo-50' },
            { id: 'exec-perf', label: "Executive Performance Report", icon: Trophy, color: 'text-amber-500 bg-amber-50' },
            { id: 'team-perf', label: "Team Performance Report", icon: Users, color: 'text-blue-500 bg-blue-50' },
            { id: 'proj-sales', label: "Project Wise Sales Report", icon: FolderHeart, color: 'text-indigo-500 bg-indigo-50' },
            { id: 'proj-inc', label: "Project Wise Incentive Report", icon: Coins, color: 'text-emerald-500 bg-emerald-50' },
            { id: 'top-seller', label: "Top Seller Report", icon: Trophy, color: 'text-rose-500 bg-rose-50' },
            { id: 'top-earner', label: "Top Earners Report", icon: ArrowUpRight, color: 'text-teal-500 bg-teal-50' },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition duration-200 cursor-pointer ${
                  isSelected 
                  ? 'bg-gray-900 border-gray-900 text-white shadow-sm' 
                  : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color} rounded p-0.5`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Filter bar line */}
      <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-2xs grid sm:grid-cols-4 gap-4 items-center">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords..."
            className="bg-transparent w-full focus:outline-none"
          />
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2 text-xs font-medium bg-gray-50 border border-gray-100 rounded-xl px-3 py-1 bg-none">
          <div className="text-gray-400 flex items-center justify-center shrink-0">🏠</div>
          <select
            value={selProject}
            onChange={(e) => setSelProject(e.target.value)}
            className="w-full bg-transparent focus:outline-none py-1 cursor-pointer font-semibold text-gray-700"
          >
            <option value="All">All Projects bindings</option>
            {uniqueProjects.map(pName => (
              <option key={pName} value={pName}>{pName}</option>
            ))}
          </select>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 text-xs font-medium bg-gray-50 border border-gray-100 rounded-xl px-3 py-1 bg-none">
          <div className="text-gray-400 flex items-center justify-center shrink-0">📅</div>
          <select
            value={selMonth}
            onChange={(e) => setSelMonth(e.target.value)}
            className="w-full bg-transparent focus:outline-none py-1 cursor-pointer font-semibold text-gray-700"
          >
            <option value="All">All Months list</option>
            {monthsName.map((mName, idx) => (
              <option key={idx} value={String(idx + 1)}>{mName} 2026</option>
            ))}
          </select>
        </div>

        {/* EXPORTERS SUITE */}
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            onClick={triggerPrintPDF}
            className="flex items-center gap-1 px-3 py-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 text-gray-600 font-semibold rounded-xl transition cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gray-400" /> Print / PDF
          </button>
          
          <button
            onClick={triggerExcelExport}
            className="flex items-center gap-1 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" /> Export Excel
          </button>
        </div>
      </div>

      {/* Ledger report presentation grid sheet - with visual printable CSS rules (screen/print layouts unified!) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-2">
          <div className="w-9 h-9 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs text-gray-400 font-mono">Running report compilation formulas...</p>
        </div>
      ) : (
        <div id="print-area" className="bg-white border border-gray-100 rounded-3xl p-6 shadow-2xs space-y-5 print:border-none print:shadow-none">
          {/* Print Letterhead block (visible under print only) */}
          <div className="hidden print:block border-b-2 border-gray-800 pb-5 mb-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">TPHL Real Estate Developers Ltd.</h1>
                <p className="text-xs text-gray-500 font-semibold font-mono">Central Financial Auditing Division</p>
                <p className="text-[10px] text-gray-400">Dhaka, Bangladesh | auditing@tphl-group.com</p>
              </div>
              <div className="text-right text-[10px] text-gray-400 font-mono">
                <div>Document ID: TPHL-REP-{Math.floor(1000 + Math.random()*9000)}</div>
                <div>Generated: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-50 pb-3">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">System Generated Spreadsheet</span>
              <h2 className="text-md font-bold text-gray-900 leading-tight">{activeRepObj.title}</h2>
            </div>
            <div className="text-right text-[10px] text-gray-400 font-mono">
              Filtered database records: <span className="font-bold text-indigo-600">{activeRepObj.rows.length} rows</span>
            </div>
          </div>

          {/* Table display */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100/50 border-b border-gray-100 font-bold text-gray-500 uppercase tracking-wider">
                  {activeRepObj.headers.map((h, i) => (
                    <th key={i} className={`p-3.5 ${i === activeRepObj.headers.length - 1 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700 font-medium font-sans">
                {activeRepObj.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/50 transition">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={`p-3.5 ${cIdx === row.length - 1 ? 'text-right font-bold text-gray-950 font-mono' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
                {activeRepObj.rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-400 text-xs italic">
                      No records exist matching selected filter bounds.
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Sums summary line */}
              {activeRepObj.rows.length > 0 && (
                <tfoot className="bg-gray-100/30 border-t-2 border-gray-100">
                  <tr className="font-bold text-gray-950 font-mono">
                    {activeRepObj.sums.map((sumCell, idx) => (
                      <td key={idx} className={`p-4 ${idx === activeRepObj.sums.length - 1 ? 'text-right text-emerald-800 text-sm font-black' : ''}`}>
                        {sumCell}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Print bottom sign-off seals block */}
          <div className="hidden print:block pt-20">
            <div className="grid grid-cols-3 gap-10 text-xs font-semibold text-center text-gray-400 font-mono">
              <div className="border-t border-gray-200 pt-2">Prepared By Auditor</div>
              <div className="border-t border-gray-200 pt-2">Division Manager Seal</div>
              <div className="border-t border-gray-200 pt-2">Managing Director Approved</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
